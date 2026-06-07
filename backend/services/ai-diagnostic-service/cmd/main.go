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

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/healthos/services/ai-diagnostic-service/internal/handler"
	"github.com/healthos/services/ai-diagnostic-service/internal/pipeline"
	"github.com/healthos/shared/config"
	"github.com/healthos/shared/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	log := logger.New("ai-diagnostic-service")
	defer log.Sync()

	if cfg.AIAPIKey == "" {
		log.Warn("AI_API_KEY not set — AI features will return errors")
	}

	aiClient := pipeline.NewAIClient(cfg.AIAPIKey, cfg.AIModel, cfg.AIProviderURL, log)
	svc := handler.NewDiagnosticServiceServer(aiClient, log)
	_ = svc

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor(log)))
	grpc_health_v1.RegisterHealthServer(grpcServer, &healthServer{})
	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"ai-diagnostic-service"}`))
	})
	httpServer := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: mux}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("ai-diagnostic-service gRPC listening", zap.String("port", cfg.GRPCPort))
		if err := grpcServer.Serve(lis); err != nil {
			log.Error("gRPC serve error", zap.Error(err))
		}
	}()

	go func() {
		log.Info("ai-diagnostic-service HTTP listening", zap.String("port", cfg.HTTPPort))
		httpServer.ListenAndServe()
	}()

	<-quit
	log.Info("shutting down ai-diagnostic-service…")
	grpcServer.GracefulStop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	httpServer.Shutdown(ctx)
}

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

type healthServer struct{}

func (h *healthServer) Check(_ context.Context, _ *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
	return &grpc_health_v1.HealthCheckResponse{Status: grpc_health_v1.HealthCheckResponse_SERVING}, nil
}
func (h *healthServer) Watch(_ *grpc_health_v1.HealthCheckRequest, _ grpc_health_v1.Health_WatchServer) error {
	return nil
}
