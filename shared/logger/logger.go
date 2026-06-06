package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	instance *zap.Logger
	once     sync.Once
)

func New(serviceName string) *zap.Logger {
	once.Do(func() {
		env := os.Getenv("APP_ENV")
		var config zap.Config

		if env == "production" {
			config = zap.NewProductionConfig()
		} else {
			config = zap.NewDevelopmentConfig()
			config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		}

		config.InitialFields = map[string]interface{}{
			"service": serviceName,
		}

		var err error
		instance, err = config.Build()
		if err != nil {
			panic("failed to initialize logger: " + err.Error())
		}
	})
	return instance
}

func Get() *zap.Logger {
	if instance == nil {
		return New("unknown")
	}
	return instance
}
