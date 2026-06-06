package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/healthos/services/patient-service/internal/model"
)

const (
	patientKeyPrefix  = "patient:"
	patientListPrefix = "patient:list:"
	defaultTTL        = 15 * time.Minute
	listTTL           = 5 * time.Minute
)

type PatientCache interface {
	GetPatient(ctx context.Context, id string) (*model.Patient, error)
	SetPatient(ctx context.Context, patient *model.Patient) error
	InvalidatePatient(ctx context.Context, id string) error
	GetPatientList(ctx context.Context, key string) ([]*model.Patient, error)
	SetPatientList(ctx context.Context, key string, patients []*model.Patient) error
	InvalidatePatientLists(ctx context.Context) error
}

type redisPatientCache struct {
	client *redis.Client
	logger *zap.Logger
}

func NewPatientCache(client *redis.Client, logger *zap.Logger) PatientCache {
	return &redisPatientCache{client: client, logger: logger}
}

func (c *redisPatientCache) GetPatient(ctx context.Context, id string) (*model.Patient, error) {
	key := fmt.Sprintf("%s%s", patientKeyPrefix, id)
	data, err := c.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil // cache miss
	}
	if err != nil {
		c.logger.Warn("redis get error", zap.Error(err), zap.String("key", key))
		return nil, nil // fail open
	}

	var patient model.Patient
	if err := json.Unmarshal(data, &patient); err != nil {
		return nil, nil
	}
	return &patient, nil
}

func (c *redisPatientCache) SetPatient(ctx context.Context, patient *model.Patient) error {
	key := fmt.Sprintf("%s%s", patientKeyPrefix, patient.ID)
	data, err := json.Marshal(patient)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, data, defaultTTL).Err()
}

func (c *redisPatientCache) InvalidatePatient(ctx context.Context, id string) error {
	key := fmt.Sprintf("%s%s", patientKeyPrefix, id)
	return c.client.Del(ctx, key).Err()
}

func (c *redisPatientCache) GetPatientList(ctx context.Context, key string) ([]*model.Patient, error) {
	fullKey := fmt.Sprintf("%s%s", patientListPrefix, key)
	data, err := c.client.Get(ctx, fullKey).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, nil
	}

	var patients []*model.Patient
	if err := json.Unmarshal(data, &patients); err != nil {
		return nil, nil
	}
	return patients, nil
}

func (c *redisPatientCache) SetPatientList(ctx context.Context, key string, patients []*model.Patient) error {
	fullKey := fmt.Sprintf("%s%s", patientListPrefix, key)
	data, err := json.Marshal(patients)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, fullKey, data, listTTL).Err()
}

func (c *redisPatientCache) InvalidatePatientLists(ctx context.Context) error {
	pattern := fmt.Sprintf("%s*", patientListPrefix)
	keys, err := c.client.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}
	if len(keys) > 0 {
		return c.client.Del(ctx, keys...).Err()
	}
	return nil
}
