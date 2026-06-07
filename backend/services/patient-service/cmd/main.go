package main

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/healthos/services/patient-service/internal/cache"
	"github.com/healthos/services/patient-service/internal/handler"
	"github.com/healthos/services/patient-service/internal/repository"
	"github.com/healthos/shared/config"
	"github.com/healthos/shared/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to load config:", err)
		os.Exit(1)
	}

	log := logger.New("patient-service")
	defer log.Sync()

	// ── PostgreSQL ──────────────────────────────────────────────────────────
	db, err := sql.Open("postgres", cfg.PostgresDSN())
	if err != nil {
		log.Fatal("failed to open postgres", zap.Error(err))
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatal("postgres ping failed", zap.Error(err))
	}
	log.Info("connected to postgres")

	if err := runMigrations(db, log); err != nil {
		log.Fatal("migration failed", zap.Error(err))
	}

	// ── Redis ───────────────────────────────────────────────────────────────
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal("redis ping failed", zap.Error(err))
	}
	log.Info("connected to redis")

	// ── Wire dependencies ───────────────────────────────────────────────────
	repo := repository.NewPatientRepository(db, log)
	patientCache := cache.NewPatientCache(rdb, log)
	svc := handler.NewPatientServiceServer(repo, patientCache, log)

	// ── gRPC server ─────────────────────────────────────────────────────────
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(loggingInterceptor(log)),
	)

	// Register health check
	grpc_health_v1.RegisterHealthServer(grpcServer, &healthServer{})
	reflection.Register(grpcServer)

	// NOTE: In a real project you would register the generated proto server here:
	// pb.RegisterPatientServiceServer(grpcServer, svc)
	// For this scaffold, svc is ready and the registration line above is the only
	// change needed once protoc is run.
	_ = svc

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	// ── HTTP health / metrics ───────────────────────────────────────────────
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"patient-service"}`))
	})
	httpServer := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: mux}

	// ── Graceful shutdown ───────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("patient-service gRPC listening", zap.String("port", cfg.GRPCPort))
		if err := grpcServer.Serve(lis); err != nil {
			log.Error("gRPC serve error", zap.Error(err))
		}
	}()

	go func() {
		log.Info("patient-service HTTP listening", zap.String("port", cfg.HTTPPort))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("HTTP serve error", zap.Error(err))
		}
	}()

	<-quit
	log.Info("shutting down patient-service…")

	grpcServer.GracefulStop()

	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	httpServer.Shutdown(shutCtx)

	log.Info("patient-service stopped")
}

// runMigrations applies DDL idempotently.
func runMigrations(db *sql.DB, log *zap.Logger) error {
	log.Info("running migrations")
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS patients (
			id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			first_name         TEXT NOT NULL,
			last_name          TEXT NOT NULL,
			email              TEXT UNIQUE NOT NULL,
			phone              TEXT,
			date_of_birth      TEXT,
			gender             TEXT,
			blood_type         TEXT,
			address            TEXT,
			emergency_contact  TEXT,
			allergies          TEXT[] DEFAULT '{}',
			chronic_conditions TEXT[] DEFAULT '{}',
			status             TEXT NOT NULL DEFAULT 'active',
			risk_score         FLOAT NOT NULL DEFAULT 0.0,
			created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			deleted_at         TIMESTAMPTZ
		);`,
		`CREATE INDEX IF NOT EXISTS idx_patients_email   ON patients(email);`,
		`CREATE INDEX IF NOT EXISTS idx_patients_status  ON patients(status);`,
		`CREATE INDEX IF NOT EXISTS idx_patients_deleted ON patients(deleted_at);`,
		`CREATE TABLE IF NOT EXISTS medical_records (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			diagnosis   TEXT NOT NULL,
			treatment   TEXT,
			doctor_id   UUID,
			notes       TEXT,
			medications TEXT[] DEFAULT '{}',
			visit_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			record_type TEXT NOT NULL DEFAULT 'general',
			lab_results TEXT[] DEFAULT '{}',
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);`,
		`CREATE INDEX IF NOT EXISTS idx_medical_records_date    ON medical_records(visit_date DESC);`,
	}

	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration error: %w", err)
		}
	}
	log.Info("migrations complete")
	return nil
}

// loggingInterceptor logs every unary gRPC call.
func loggingInterceptor(log *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		log.Info("grpc call",
			zap.String("method", info.FullMethod),
			zap.Duration("duration", time.Since(start)),
			zap.Error(err),
		)
		return resp, err
	}
}

// healthServer implements grpc_health_v1.HealthServer.
type healthServer struct{}

func (h *healthServer) Check(_ context.Context, _ *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
	return &grpc_health_v1.HealthCheckResponse{Status: grpc_health_v1.HealthCheckResponse_SERVING}, nil
}

func (h *healthServer) Watch(_ *grpc_health_v1.HealthCheckRequest, _ grpc_health_v1.Health_WatchServer) error {
	return nil
}
