package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/healthos/shared/config"
	"github.com/healthos/shared/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	log := logger.New("appointment-service")
	defer log.Sync()

	// ── MongoDB (appointment scheduling data) ───────────────────────────────
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(cfg.MongoURI).
		SetMaxPoolSize(20).
		SetMinPoolSize(5).
		SetConnectTimeout(10 * time.Second)

	mongoClient, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatal("mongo connect failed", zap.Error(err))
	}
	defer mongoClient.Disconnect(context.Background())

	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatal("mongo ping failed", zap.Error(err))
	}
	log.Info("connected to mongodb")

	db := mongoClient.Database(cfg.MongoDB)
	_ = db // passed to repository

	// ── gRPC ────────────────────────────────────────────────────────────────
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
		w.Write([]byte(`{"status":"ok","service":"appointment-service"}`))
	})
	httpServer := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: mux}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("appointment-service gRPC listening", zap.String("port", cfg.GRPCPort))
		grpcServer.Serve(lis)
	}()
	go func() {
		log.Info("appointment-service HTTP listening", zap.String("port", cfg.HTTPPort))
		httpServer.ListenAndServe()
	}()

	<-quit
	log.Info("shutting down appointment-service…")
	grpcServer.GracefulStop()
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	httpServer.Shutdown(shutCtx)
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
