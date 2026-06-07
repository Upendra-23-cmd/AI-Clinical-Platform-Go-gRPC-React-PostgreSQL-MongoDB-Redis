package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"

	"github.com/healthos/shared/config"
	"github.com/healthos/shared/logger"
)

// ServiceRoute maps a path prefix to an upstream service.
type ServiceRoute struct {
	Prefix  string
	Target  string
	Proxy   *httputil.ReverseProxy
}

// RateLimiter is a simple token-bucket per IP.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*tokenBucket
}

type tokenBucket struct {
	tokens   int
	lastSeen time.Time
}

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{buckets: make(map[string]*tokenBucket)}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	b, ok := rl.buckets[ip]
	if !ok {
		rl.buckets[ip] = &tokenBucket{tokens: 99, lastSeen: time.Now()}
		return true
	}
	elapsed := time.Since(b.lastSeen).Seconds()
	b.tokens += int(elapsed * 10) // 10 req/s refill
	if b.tokens > 100 {
		b.tokens = 100
	}
	b.lastSeen = time.Now()
	if b.tokens <= 0 {
		return false
	}
	b.tokens--
	return true
}

func (rl *RateLimiter) cleanup() {
	for range time.Tick(5 * time.Minute) {
		rl.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for ip, b := range rl.buckets {
			if b.lastSeen.Before(cutoff) {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

var jwtSecret []byte

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	jwtSecret = []byte(cfg.JWTSecret)
	log := logger.New("gateway")
	defer log.Sync()

	rateLimiter := NewRateLimiter()

	routes := buildRoutes(cfg)

	mux := http.NewServeMux()

	// Auth endpoints (no JWT required)
	mux.HandleFunc("/api/v1/auth/login", handleLogin(cfg, log))
	mux.HandleFunc("/api/v1/auth/refresh", handleRefresh(cfg, log))

	// Health
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ok",
			"service": "gateway",
			"routes":  len(routes),
		})
	})

	// Proxy all /api/v1/* routes to appropriate services
	mux.HandleFunc("/api/v1/", func(w http.ResponseWriter, r *http.Request) {
		// Rate limiting
		ip := r.RemoteAddr
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			ip = strings.Split(xff, ",")[0]
		}
		if !rateLimiter.Allow(ip) {
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		// JWT auth (skip for login/refresh)
		path := r.URL.Path
		if !strings.HasPrefix(path, "/api/v1/auth/") {
			claims, err := validateJWT(r)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			r.Header.Set("X-User-ID", claims.UserID)
			r.Header.Set("X-User-Role", claims.Role)
		}

		// Route to service
		for _, route := range routes {
			if strings.HasPrefix(path, route.Prefix) {
				log.Debug("proxying request",
					zap.String("path", path),
					zap.String("target", route.Target),
				)
				route.Proxy.ServeHTTP(w, r)
				return
			}
		}

		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	})

	handler := requestLogger(corsMiddleware(mux), log)
	server := &http.Server{
		Addr:         ":" + cfg.HTTPPort,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("gateway listening", zap.String("port", cfg.HTTPPort))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("gateway serve error", zap.Error(err))
		}
	}()

	<-quit
	log.Info("shutting down gateway…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	server.Shutdown(ctx)
}

func buildRoutes(cfg *config.Config) []ServiceRoute {
	targets := map[string]string{
		"/api/v1/patients":      "http://" + cfg.PatientServiceAddr,
		"/api/v1/appointments":  "http://" + cfg.AppointmentServiceAddr,
		"/api/v1/diagnostics":   "http://" + cfg.DiagnosticServiceAddr,
		"/api/v1/notifications": "http://" + cfg.NotificationServiceAddr,
		"/api/v1/analytics":     "http://" + cfg.AnalyticsServiceAddr,
	}

	var routes []ServiceRoute
	for prefix, target := range targets {
		targetURL, _ := url.Parse(target)
		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(map[string]string{"error": "service unavailable"})
		}
		routes = append(routes, ServiceRoute{Prefix: prefix, Target: target, Proxy: proxy})
	}
	return routes
}

func validateJWT(r *http.Request) (*Claims, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("missing authorization header")
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, fmt.Errorf("invalid authorization header")
	}

	token, err := jwt.ParseWithClaims(parts[1], &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	return claims, nil
}

func handleLogin(cfg *config.Config, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", 405)
			return
		}
		var body struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		io.ReadAll(r.Body)
		json.NewDecoder(r.Body).Decode(&body)

		// In production: verify against user store with bcrypt
		// For scaffold: accept demo credentials
		role := "doctor"
		if strings.Contains(body.Email, "admin") {
			role = "admin"
		} else if strings.Contains(body.Email, "patient") {
			role = "patient"
		}

		userID := "demo-user-" + role
		claims := &Claims{
			UserID: userID,
			Role:   role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "healthos-gateway",
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, err := token.SignedString([]byte(cfg.JWTSecret))
		if err != nil {
			http.Error(w, "token generation failed", 500)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"token":      tokenStr,
			"user_id":    userID,
			"role":       role,
			"expires_in": 86400,
		})
		log.Info("user logged in", zap.String("user_id", userID), zap.String("role", role))
	}
}

func handleRefresh(cfg *config.Config, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := validateJWT(r)
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		newClaims := &Claims{
			UserID: claims.UserID,
			Role:   claims.Role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "healthos-gateway",
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
		tokenStr, _ := token.SignedString([]byte(cfg.JWTSecret))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"token":      tokenStr,
			"expires_in": 86400,
		})
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func requestLogger(next http.Handler, log *zap.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, code: http.StatusOK}
		next.ServeHTTP(rw, r)
		log.Info("request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", rw.code),
			zap.Duration("duration", time.Since(start)),
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	code int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.code = code
	rw.ResponseWriter.WriteHeader(code)
}
