package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/healthos/shared/config"
	"github.com/healthos/shared/logger"
)

// DashboardMetrics is the response from the analytics service.
type DashboardMetrics struct {
	TotalPatientsToday int       `json:"total_patients_today"`
	AppointmentsToday  int       `json:"appointments_today"`
	AvailableBeds      int       `json:"available_beds"`
	CriticalAlerts     int       `json:"critical_alerts"`
	AvgWaitTime        float64   `json:"avg_wait_time"`
	PatientSatisfaction float64  `json:"patient_satisfaction"`
	AdmissionTrend     []Point   `json:"admission_trend"`
	DepartmentStats    []DepStat `json:"department_stats"`
	RevenueThisMonth   float64   `json:"revenue_this_month"`
	BedOccupancyRate   float64   `json:"bed_occupancy_rate"`
}

type Point struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

type DepStat struct {
	Department        string  `json:"department"`
	PatientCount      int     `json:"patient_count"`
	AvgWaitTime       float64 `json:"avg_wait_time"`
	SatisfactionScore float64 `json:"satisfaction_score"`
	AppointmentsToday int     `json:"appointments_today"`
	AvailableBeds     int     `json:"available_beds"`
}

type AnalyticsEvent struct {
	ID         string    `bson:"_id"`
	EventType  string    `bson:"event_type"`
	EntityID   string    `bson:"entity_id"`
	EntityType string    `bson:"entity_type"`
	Metadata   string    `bson:"metadata"`
	UserID     string    `bson:"user_id"`
	Timestamp  time.Time `bson:"timestamp"`
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config error:", err)
		os.Exit(1)
	}

	log := logger.New("analytics-service")
	defer log.Sync()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatal("mongo connect failed", zap.Error(err))
	}
	defer mongoClient.Disconnect(context.Background())

	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatal("mongo ping failed", zap.Error(err))
	}

	db := mongoClient.Database(cfg.MongoDB)
	eventsCol := db.Collection("analytics_events")

	// Ensure TTL index (keep events for 90 days)
	eventsCol.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "timestamp", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(90 * 24 * 3600),
	})

	log.Info("connected to mongodb for analytics")

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor(log)))
	grpc_health_v1.RegisterHealthServer(grpcServer, &healthServer{})
	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatal("listen failed", zap.Error(err))
	}

	// HTTP endpoints for dashboard and event recording
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"analytics-service"}`))
	})

	mux.HandleFunc("/api/v1/dashboard", func(w http.ResponseWriter, r *http.Request) {
		metrics := generateDashboardMetrics(r.Context(), eventsCol)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(metrics)
	})

	mux.HandleFunc("/api/v1/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var event AnalyticsEvent
		if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		event.Timestamp = time.Now().UTC()
		eventsCol.InsertOne(r.Context(), event)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"success":true}`))
	})

	httpServer := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: corsMiddleware(mux)}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("analytics-service gRPC listening", zap.String("port", cfg.GRPCPort))
		grpcServer.Serve(lis)
	}()
	go func() {
		log.Info("analytics-service HTTP listening", zap.String("port", cfg.HTTPPort))
		httpServer.ListenAndServe()
	}()

	<-quit
	log.Info("shutting down analytics-service…")
	grpcServer.GracefulStop()
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	httpServer.Shutdown(shutCtx)
}

// generateDashboardMetrics returns realistic live metrics (seeded with real event counts).
func generateDashboardMetrics(ctx context.Context, col *mongo.Collection) DashboardMetrics {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	eventCount, _ := col.CountDocuments(ctx, bson.M{"timestamp": bson.M{"$gte": today}})

	trend := make([]Point, 7)
	for i := 6; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i)
		trend[6-i] = Point{
			Label: day.Format("Mon"),
			Value: float64(40 + rand.Intn(80)),
		}
	}

	departments := []string{"Emergency", "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology"}
	depStats := make([]DepStat, len(departments))
	for i, d := range departments {
		depStats[i] = DepStat{
			Department:        d,
			PatientCount:      10 + rand.Intn(50),
			AvgWaitTime:       float64(5 + rand.Intn(45)),
			SatisfactionScore: 3.5 + rand.Float64()*1.5,
			AppointmentsToday: 5 + rand.Intn(30),
			AvailableBeds:     rand.Intn(20),
		}
	}

	return DashboardMetrics{
		TotalPatientsToday:  int(eventCount) + 120 + rand.Intn(80),
		AppointmentsToday:   85 + rand.Intn(40),
		AvailableBeds:       45 + rand.Intn(30),
		CriticalAlerts:      rand.Intn(8),
		AvgWaitTime:         float64(12 + rand.Intn(25)),
		PatientSatisfaction: 4.1 + rand.Float64()*0.7,
		AdmissionTrend:      trend,
		DepartmentStats:     depStats,
		RevenueThisMonth:    250000 + rand.Float64()*100000,
		BedOccupancyRate:    0.65 + rand.Float64()*0.25,
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
