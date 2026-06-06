package handler

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/healthos/services/patient-service/internal/cache"
	"github.com/healthos/services/patient-service/internal/model"
	"github.com/healthos/services/patient-service/internal/repository"
	apperrors "github.com/healthos/shared/errors"
)

// PatientServiceServer implements the gRPC PatientService interface.
// In a real project this would import the generated proto stubs; here we define
// the equivalent structs/interfaces inline for clarity.

type PatientServiceServer struct {
	repo   repository.PatientRepository
	cache  cache.PatientCache
	logger *zap.Logger
}

func NewPatientServiceServer(
	repo repository.PatientRepository,
	cache cache.PatientCache,
	logger *zap.Logger,
) *PatientServiceServer {
	return &PatientServiceServer{repo: repo, cache: cache, logger: logger}
}

// ---- Request / Response types (mirrors generated proto structs) ----

type CreatePatientRequest struct {
	FirstName         string
	LastName          string
	Email             string
	Phone             string
	DateOfBirth       string
	Gender            string
	BloodType         string
	Address           string
	EmergencyContact  string
	Allergies         []string
	ChronicConditions []string
}

type GetPatientRequest struct{ ID string }

type UpdatePatientRequest struct {
	ID                string
	FirstName         string
	LastName          string
	Email             string
	Phone             string
	Address           string
	EmergencyContact  string
	Allergies         []string
	ChronicConditions []string
}

type ListPatientsRequest struct {
	Page      int32
	PageSize  int32
	SortBy    string
	SortOrder string
}

type SearchPatientsRequest struct {
	Query    string
	Page     int32
	PageSize int32
}

type AddMedicalRecordRequest struct {
	PatientID   string
	Diagnosis   string
	Treatment   string
	DoctorID    string
	Notes       string
	Medications []string
	RecordType  string
}

type PatientResponse struct {
	Patient *model.Patient
	Message string
}

type ListPatientsResponse struct {
	Patients []*model.Patient
	Total    int32
	Page     int32
	PageSize int32
}

type MedicalHistoryResponse struct {
	PatientID string
	Records   []*model.MedicalRecord
	Total     int32
}

type MedicalRecordResponse struct {
	Record  *model.MedicalRecord
	Message string
}

// ---- Handlers ----

func (s *PatientServiceServer) CreatePatient(ctx context.Context, req *CreatePatientRequest) (*PatientResponse, error) {
	if req.FirstName == "" || req.LastName == "" || req.Email == "" {
		return nil, apperrors.InvalidInput("first_name, last_name and email are required").ToGRPCStatus()
	}

	patient, err := s.repo.Create(ctx, model.CreatePatientInput{
		FirstName:         req.FirstName,
		LastName:          req.LastName,
		Email:             req.Email,
		Phone:             req.Phone,
		DateOfBirth:       req.DateOfBirth,
		Gender:            req.Gender,
		BloodType:         req.BloodType,
		Address:           req.Address,
		EmergencyContact:  req.EmergencyContact,
		Allergies:         req.Allergies,
		ChronicConditions: req.ChronicConditions,
	})
	if err != nil {
		s.logger.Error("create patient failed", zap.Error(err))
		if appErr, ok := err.(*apperrors.AppError); ok {
			return nil, appErr.ToGRPCStatus()
		}
		return nil, apperrors.Internal("create patient failed").ToGRPCStatus()
	}

	// Warm the cache
	_ = s.cache.SetPatient(ctx, patient)
	// Invalidate list caches
	_ = s.cache.InvalidatePatientLists(ctx)

	s.logger.Info("patient created", zap.String("id", patient.ID))
	return &PatientResponse{Patient: patient, Message: "patient created successfully"}, nil
}

func (s *PatientServiceServer) GetPatient(ctx context.Context, req *GetPatientRequest) (*PatientResponse, error) {
	if req.ID == "" {
		return nil, apperrors.InvalidInput("id is required").ToGRPCStatus()
	}

	// Try cache first
	if cached, _ := s.cache.GetPatient(ctx, req.ID); cached != nil {
		s.logger.Debug("patient cache hit", zap.String("id", req.ID))
		return &PatientResponse{Patient: cached}, nil
	}

	patient, err := s.repo.GetByID(ctx, req.ID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			return nil, appErr.ToGRPCStatus()
		}
		return nil, apperrors.Internal("get patient failed").ToGRPCStatus()
	}

	_ = s.cache.SetPatient(ctx, patient)
	return &PatientResponse{Patient: patient}, nil
}

func (s *PatientServiceServer) UpdatePatient(ctx context.Context, req *UpdatePatientRequest) (*PatientResponse, error) {
	if req.ID == "" {
		return nil, apperrors.InvalidInput("id is required").ToGRPCStatus()
	}

	patient, err := s.repo.Update(ctx, model.UpdatePatientInput{
		ID:                req.ID,
		FirstName:         req.FirstName,
		LastName:          req.LastName,
		Email:             req.Email,
		Phone:             req.Phone,
		Address:           req.Address,
		EmergencyContact:  req.EmergencyContact,
		Allergies:         req.Allergies,
		ChronicConditions: req.ChronicConditions,
	})
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			return nil, appErr.ToGRPCStatus()
		}
		return nil, apperrors.Internal("update patient failed").ToGRPCStatus()
	}

	_ = s.cache.InvalidatePatient(ctx, req.ID)
	_ = s.cache.InvalidatePatientLists(ctx)

	return &PatientResponse{Patient: patient, Message: "patient updated successfully"}, nil
}

func (s *PatientServiceServer) ListPatients(ctx context.Context, req *ListPatientsRequest) (*ListPatientsResponse, error) {
	cacheKey := fmt.Sprintf("list:%d:%d:%s:%s", req.Page, req.PageSize, req.SortBy, req.SortOrder)
	if cached, _ := s.cache.GetPatientList(ctx, cacheKey); cached != nil {
		return &ListPatientsResponse{Patients: cached, Page: req.Page, PageSize: req.PageSize}, nil
	}

	patients, total, err := s.repo.List(ctx, model.ListPatientsFilter{
		Page:      int(req.Page),
		PageSize:  int(req.PageSize),
		SortBy:    req.SortBy,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		return nil, apperrors.Internal("list patients failed").ToGRPCStatus()
	}

	_ = s.cache.SetPatientList(ctx, cacheKey, patients)

	return &ListPatientsResponse{
		Patients: patients,
		Total:    int32(total),
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *PatientServiceServer) SearchPatients(ctx context.Context, req *SearchPatientsRequest) (*ListPatientsResponse, error) {
	if req.Query == "" {
		return nil, apperrors.InvalidInput("query is required").ToGRPCStatus()
	}

	patients, total, err := s.repo.Search(ctx, model.SearchPatientsFilter{
		Query:    req.Query,
		Page:     int(req.Page),
		PageSize: int(req.PageSize),
	})
	if err != nil {
		return nil, apperrors.Internal("search patients failed").ToGRPCStatus()
	}

	return &ListPatientsResponse{
		Patients: patients,
		Total:    int32(total),
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *PatientServiceServer) GetPatientMedicalHistory(ctx context.Context, req *GetPatientRequest) (*MedicalHistoryResponse, error) {
	if req.ID == "" {
		return nil, apperrors.InvalidInput("id is required").ToGRPCStatus()
	}

	records, err := s.repo.GetMedicalHistory(ctx, req.ID)
	if err != nil {
		return nil, apperrors.Internal("get medical history failed").ToGRPCStatus()
	}

	return &MedicalHistoryResponse{
		PatientID: req.ID,
		Records:   records,
		Total:     int32(len(records)),
	}, nil
}

func (s *PatientServiceServer) AddMedicalRecord(ctx context.Context, req *AddMedicalRecordRequest) (*MedicalRecordResponse, error) {
	if req.PatientID == "" || req.Diagnosis == "" {
		return nil, apperrors.InvalidInput("patient_id and diagnosis are required").ToGRPCStatus()
	}

	record := &model.MedicalRecord{
		PatientID:   req.PatientID,
		Diagnosis:   req.Diagnosis,
		Treatment:   req.Treatment,
		DoctorID:    req.DoctorID,
		Notes:       req.Notes,
		Medications: req.Medications,
		VisitDate:   time.Now().UTC(),
		RecordType:  req.RecordType,
	}

	created, err := s.repo.AddMedicalRecord(ctx, record)
	if err != nil {
		return nil, apperrors.Internal("add medical record failed").ToGRPCStatus()
	}

	// Invalidate patient cache since risk score might change
	_ = s.cache.InvalidatePatient(ctx, req.PatientID)

	return &MedicalRecordResponse{Record: created, Message: "medical record added"}, nil
}

// toTimestamp is a helper for proto timestamp conversion.
func toTimestamp(t time.Time) *timestamppb.Timestamp {
	return timestamppb.New(t)
}
