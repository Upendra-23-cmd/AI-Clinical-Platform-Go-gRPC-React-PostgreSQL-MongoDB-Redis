package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/healthos/shared/config"
	"github.com/healthos/shared/logger"
)

// Notification is the in-memory notification model.
type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Type      string    `json:"type"`
	Priority  string    `json:"priority"`
	Read      bool      `json:"read"`
	ActionURL string    `json:"action_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// In-memory store (production would use PostgreSQL + Redis streams).
var (
	notifications = make(map[string][]*Notification) // user_id -> notifications
	notifMu       sync.RWMutex
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	log := logger.New("notification-service")
	defer log.Sync()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal("redis ping failed", zap.Error(err))
	}
	log.Info("connected to redis")

	// Subscribe to notification events from other services
	go subscribeToEvents(context.Background(), rdb, log)

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor(log)))
	grpc_health_v1.RegisterHealthServer(grpcServer, &healthServer{})
	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatal("listen failed", zap.Error(err))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"notification-service"}`))
	})

	// REST API for notification CRUD
	mux.HandleFunc("/api/v1/notifications/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", 405)
			return
		}
		var n Notification
		json.NewDecoder(r.Body).Decode(&n)
		n.ID = uuid.New().String()
		n.CreatedAt = time.Now().UTC()

		notifMu.Lock()
		notifications[n.UserID] = append(notifications[n.UserID], &n)
		notifMu.Unlock()

		// Publish to Redis for real-time delivery
		data, _ := json.Marshal(n)
		rdb.Publish(r.Context(), "notifications:"+n.UserID, data)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "id": n.ID})
	})

	mux.HandleFunc("/api/v1/notifications/", func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		if userID == "" {
			http.Error(w, "user_id required", 400)
			return
		}

		notifMu.RLock()
		userNotifs := notifications[userID]
		notifMu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"notifications": userNotifs,
			"total":         len(userNotifs),
		})
	})

	// SSE endpoint for real-time notifications
	mux.HandleFunc("/api/v1/notifications/stream", func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		if userID == "" {
			http.Error(w, "user_id required", 400)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		sub := rdb.Subscribe(r.Context(), "notifications:"+userID)
		defer sub.Close()

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", 500)
			return
		}

		for {
			select {
			case <-r.Context().Done():
				return
			case msg := <-sub.Channel():
				fmt.Fprintf(w, "data: %s\n\n", msg.Payload)
				flusher.Flush()
			}
		}
	})

	httpServer := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: corsMiddleware(mux)}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("notification-service gRPC listening", zap.String("port", cfg.GRPCPort))
		grpcServer.Serve(lis)
	}()
	go func() {
		log.Info("notification-service HTTP listening", zap.String("port", cfg.HTTPPort))
		httpServer.ListenAndServe()
	}()

	<-quit
	log.Info("shutting down notification-service…")
	grpcServer.GracefulStop()
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	httpServer.Shutdown(shutCtx)
}

func subscribeToEvents(ctx context.Context, rdb *redis.Client, log *zap.Logger) {
	sub := rdb.Subscribe(ctx, "healthos:events")
	defer sub.Close()

	log.Info("subscribed to healthos:events channel")
	for msg := range sub.Channel() {
		var event map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
			continue
		}

		eventType, _ := event["type"].(string)
		userID, _ := event["user_id"].(string)

		if userID == "" || eventType == "" {
			continue
		}

		var n *Notification
		switch eventType {
		case "appointment_reminder":
			n = &Notification{
				ID:        uuid.New().String(),
				UserID:    userID,
				Title:     "Appointment Reminder",
				Body:      fmt.Sprintf("You have an appointment in 1 hour"),
				Type:      "reminder",
				Priority:  "high",
				CreatedAt: time.Now().UTC(),
			}
		case "appointment_confirmed":
			n = &Notification{
				ID:        uuid.New().String(),
				UserID:    userID,
				Title:     "Appointment Confirmed",
				Body:      "Your appointment has been confirmed.",
				Type:      "confirmation",
				Priority:  "normal",
				CreatedAt: time.Now().UTC(),
			}
		}

		if n != nil {
			notifMu.Lock()
			notifications[userID] = append(notifications[userID], n)
			notifMu.Unlock()
			data, _ := json.Marshal(n)
			rdb.Publish(ctx, "notifications:"+userID, data)
		}
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loggingInterceptor(log *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		log.Info("grpc", zap.String("method", info.FullMethod), zap.Duration("dur", time.Since(start)), zap.Error(err))
		return resp, err
	}
}

type healthServer struct{}

func (h *healthServer) Check(_ context.Context, _ *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
	return &grpc_health_v1.HealthCheckResponse{Status: grpc_health_v1.HealthCheckResponse_SERVING}, nil
}
func (h *healthServer) Watch(_ *grpc_health_v1.HealthCheckRequest, _ grpc_health_v1.Health_WatchServer) error {
	return nil
}
