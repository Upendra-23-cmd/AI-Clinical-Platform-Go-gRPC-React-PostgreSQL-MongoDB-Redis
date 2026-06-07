package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	GRPCPort    string
	HTTPPort    string
	ServiceName string
	AppEnv      string

	// PostgreSQL
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	PostgresSSLMode  string

	// MongoDB
	MongoURI  string
	MongoDB   string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret     string
	JWTExpiration string

	// AI Service (Anthropic / OpenAI compatible)
	AIProviderURL string
	AIAPIKey      string
	AIModel       string

	// Inter-service URLs
	PatientServiceAddr      string
	AppointmentServiceAddr  string
	DiagnosticServiceAddr   string
	NotificationServiceAddr string
	AnalyticsServiceAddr    string
}

func Load(envFile ...string) (*Config, error) {
	file := ".env"
	if len(envFile) > 0 {
		file = envFile[0]
	}

	// Load .env file if it exists (dev only)
	if _, err := os.Stat(file); err == nil {
		if err := godotenv.Load(file); err != nil {
			return nil, fmt.Errorf("error loading %s: %w", file, err)
		}
	}

	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	return &Config{
		GRPCPort:    getEnv("GRPC_PORT", "50051"),
		HTTPPort:    getEnv("HTTP_PORT", "8080"),
		ServiceName: getEnv("SERVICE_NAME", "healthos-service"),
		AppEnv:      getEnv("APP_ENV", "development"),

		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnv("POSTGRES_PORT", "5432"),
		PostgresUser:     getEnv("POSTGRES_USER", "healthos"),
		PostgresPassword: getEnv("POSTGRES_PASSWORD", "healthos_secret"),
		PostgresDB:       getEnv("POSTGRES_DB", "healthos"),
		PostgresSSLMode:  getEnv("POSTGRES_SSLMODE", "disable"),

		MongoURI: getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:  getEnv("MONGO_DB", "healthos"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       redisDB,

		JWTSecret:     getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		JWTExpiration: getEnv("JWT_EXPIRATION", "24h"),

		AIProviderURL: getEnv("AI_PROVIDER_URL", "https://api.anthropic.com"),
		AIAPIKey:      getEnv("AI_API_KEY", ""),
		AIModel:       getEnv("AI_MODEL", "claude-sonnet-4-20250514"),

		PatientServiceAddr:      getEnv("PATIENT_SERVICE_ADDR", "localhost:50051"),
		AppointmentServiceAddr:  getEnv("APPOINTMENT_SERVICE_ADDR", "localhost:50052"),
		DiagnosticServiceAddr:   getEnv("DIAGNOSTIC_SERVICE_ADDR", "localhost:50053"),
		NotificationServiceAddr: getEnv("NOTIFICATION_SERVICE_ADDR", "localhost:50054"),
		AnalyticsServiceAddr:    getEnv("ANALYTICS_SERVICE_ADDR", "localhost:50055"),
	}, nil
}

func (c *Config) PostgresDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.PostgresHost, c.PostgresPort, c.PostgresUser,
		c.PostgresPassword, c.PostgresDB, c.PostgresSSLMode,
	)
}

func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
