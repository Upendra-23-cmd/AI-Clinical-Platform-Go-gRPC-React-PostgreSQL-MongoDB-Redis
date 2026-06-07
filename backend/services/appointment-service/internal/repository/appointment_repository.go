package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"

	"github.com/healthos/services/appointment-service/internal/model"
	apperrors "github.com/healthos/shared/errors"
)

type AppointmentRepository interface {
	Create(ctx context.Context, apt *model.Appointment) (*model.Appointment, error)
	GetByID(ctx context.Context, id string) (*model.Appointment, error)
	Update(ctx context.Context, id string, updates bson.M) (*model.Appointment, error)
	List(ctx context.Context, filter model.ListFilter) ([]*model.Appointment, int64, error)
	GetDoctorAppointments(ctx context.Context, doctorID, date string) ([]*model.Appointment, error)
	CheckConflict(ctx context.Context, doctorID string, start, end time.Time) (bool, error)
}

type mongoAppointmentRepo struct {
	col    *mongo.Collection
	logger *zap.Logger
}

func NewAppointmentRepository(db *mongo.Database, logger *zap.Logger) AppointmentRepository {
	col := db.Collection("appointments")

	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "patient_id", Value: 1}}},
		{Keys: bson.D{{Key: "doctor_id", Value: 1}}},
		{Keys: bson.D{{Key: "scheduled_at", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "doctor_id", Value: 1}, {Key: "scheduled_at", Value: 1}}},
	}
	col.Indexes().CreateMany(context.Background(), indexes)

	return &mongoAppointmentRepo{col: col, logger: logger}
}

func (r *mongoAppointmentRepo) Create(ctx context.Context, apt *model.Appointment) (*model.Appointment, error) {
	apt.ID = uuid.New().String()
	apt.CreatedAt = time.Now().UTC()
	apt.UpdatedAt = time.Now().UTC()
	if apt.Status == "" {
		apt.Status = "scheduled"
	}

	_, err := r.col.InsertOne(ctx, apt)
	if err != nil {
		r.logger.Error("mongo insert appointment failed", zap.Error(err))
		return nil, apperrors.Internal("failed to create appointment")
	}
	return apt, nil
}

func (r *mongoAppointmentRepo) GetByID(ctx context.Context, id string) (*model.Appointment, error) {
	var apt model.Appointment
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&apt)
	if err == mongo.ErrNoDocuments {
		return nil, apperrors.NotFound("appointment", id)
	}
	if err != nil {
		return nil, apperrors.Internal("database error")
	}
	return &apt, nil
}

func (r *mongoAppointmentRepo) Update(ctx context.Context, id string, updates bson.M) (*model.Appointment, error) {
	updates["updated_at"] = time.Now().UTC()
	after := options.After
	result := r.col.FindOneAndUpdate(ctx,
		bson.M{"_id": id},
		bson.M{"$set": updates},
		&options.FindOneAndUpdateOptions{ReturnDocument: &after},
	)

	var apt model.Appointment
	if err := result.Decode(&apt); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("appointment", id)
		}
		return nil, apperrors.Internal("update failed")
	}
	return &apt, nil
}

func (r *mongoAppointmentRepo) List(ctx context.Context, f model.ListFilter) ([]*model.Appointment, int64, error) {
	filter := bson.M{}
	if f.PatientID != "" {
		filter["patient_id"] = f.PatientID
	}
	if f.DoctorID != "" {
		filter["doctor_id"] = f.DoctorID
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.DateFrom != "" || f.DateTo != "" {
		dateFilter := bson.M{}
		if f.DateFrom != "" {
			t, _ := time.Parse("2006-01-02", f.DateFrom)
			dateFilter["$gte"] = t
		}
		if f.DateTo != "" {
			t, _ := time.Parse("2006-01-02", f.DateTo)
			dateFilter["$lte"] = t.Add(24 * time.Hour)
		}
		filter["scheduled_at"] = dateFilter
	}

	pageSize := int64(20)
	if f.PageSize > 0 {
		pageSize = int64(f.PageSize)
	}
	page := int64(1)
	if f.Page > 0 {
		page = int64(f.Page)
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "scheduled_at", Value: 1}}).
		SetLimit(pageSize).
		SetSkip((page - 1) * pageSize)

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, apperrors.Internal("database error")
	}
	defer cursor.Close(ctx)

	var appointments []*model.Appointment
	if err := cursor.All(ctx, &appointments); err != nil {
		return nil, 0, apperrors.Internal("cursor error")
	}

	total, _ := r.col.CountDocuments(ctx, filter)
	return appointments, total, nil
}

func (r *mongoAppointmentRepo) GetDoctorAppointments(ctx context.Context, doctorID, date string) ([]*model.Appointment, error) {
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, apperrors.InvalidInput("invalid date format, use YYYY-MM-DD")
	}

	filter := bson.M{
		"doctor_id": doctorID,
		"scheduled_at": bson.M{
			"$gte": t,
			"$lt":  t.Add(24 * time.Hour),
		},
		"status": bson.M{"$ne": "cancelled"},
	}

	cursor, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "scheduled_at", Value: 1}}))
	if err != nil {
		return nil, apperrors.Internal("database error")
	}
	defer cursor.Close(ctx)

	var apts []*model.Appointment
	cursor.All(ctx, &apts)
	return apts, nil
}

func (r *mongoAppointmentRepo) CheckConflict(ctx context.Context, doctorID string, start, end time.Time) (bool, error) {
	count, err := r.col.CountDocuments(ctx, bson.M{
		"doctor_id": doctorID,
		"status":    bson.M{"$nin": []string{"cancelled", "completed"}},
		"$or": []bson.M{
			{"scheduled_at": bson.M{"$gte": start, "$lt": end}},
			{"$expr": bson.M{"$and": []bson.M{
				{"$lte": []interface{}{"$scheduled_at", start}},
				{"$gt": []interface{}{bson.M{"$add": []interface{}{"$scheduled_at", bson.M{"$multiply": []interface{}{"$duration_minutes", 60000}}}}, start}},
			}}},
		},
	})
	return count > 0, err
}
