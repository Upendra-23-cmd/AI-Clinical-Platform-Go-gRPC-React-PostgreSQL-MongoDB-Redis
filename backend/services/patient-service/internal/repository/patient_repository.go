package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"go.uber.org/zap"

	"github.com/healthos/services/patient-service/internal/model"
	apperrors "github.com/healthos/shared/errors"
)

type PatientRepository interface {
	Create(ctx context.Context, input model.CreatePatientInput) (*model.Patient, error)
	GetByID(ctx context.Context, id string) (*model.Patient, error)
	Update(ctx context.Context, input model.UpdatePatientInput) (*model.Patient, error)
	List(ctx context.Context, filter model.ListPatientsFilter) ([]*model.Patient, int, error)
	Search(ctx context.Context, filter model.SearchPatientsFilter) ([]*model.Patient, int, error)
	GetMedicalHistory(ctx context.Context, patientID string) ([]*model.MedicalRecord, error)
	AddMedicalRecord(ctx context.Context, record *model.MedicalRecord) (*model.MedicalRecord, error)
	UpdateRiskScore(ctx context.Context, patientID string, score float32) error
}

type postgresPatientRepo struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewPatientRepository(db *sql.DB, logger *zap.Logger) PatientRepository {
	return &postgresPatientRepo{db: db, logger: logger}
}

func (r *postgresPatientRepo) Create(ctx context.Context, input model.CreatePatientInput) (*model.Patient, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	query := `
		INSERT INTO patients (
			id, first_name, last_name, email, phone, date_of_birth,
			gender, blood_type, address, emergency_contact,
			allergies, chronic_conditions, status, risk_score, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', 0.0, $13, $14
		) RETURNING *`

	p := &model.Patient{}
	err := r.db.QueryRowContext(ctx, query,
		id, input.FirstName, input.LastName, input.Email, input.Phone,
		input.DateOfBirth, input.Gender, input.BloodType, input.Address,
		input.EmergencyContact, input.Allergies, input.ChronicConditions,
		now, now,
	).Scan(
		&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone, &p.DateOfBirth,
		&p.Gender, &p.BloodType, &p.Address, &p.EmergencyContact,
		&p.Allergies, &p.ChronicConditions, &p.Status, &p.RiskScore,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		r.logger.Error("failed to create patient", zap.Error(err))
		return nil, apperrors.Internal("failed to create patient: " + err.Error())
	}
	return p, nil
}

func (r *postgresPatientRepo) GetByID(ctx context.Context, id string) (*model.Patient, error) {
	query := `SELECT * FROM patients WHERE id = $1 AND deleted_at IS NULL`
	p := &model.Patient{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone, &p.DateOfBirth,
		&p.Gender, &p.BloodType, &p.Address, &p.EmergencyContact,
		&p.Allergies, &p.ChronicConditions, &p.Status, &p.RiskScore,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, apperrors.NotFound("patient", id)
	}
	if err != nil {
		r.logger.Error("failed to get patient", zap.Error(err), zap.String("id", id))
		return nil, apperrors.Internal("database error")
	}
	return p, nil
}

func (r *postgresPatientRepo) Update(ctx context.Context, input model.UpdatePatientInput) (*model.Patient, error) {
	query := `
		UPDATE patients SET
			first_name = COALESCE(NULLIF($2, ''), first_name),
			last_name = COALESCE(NULLIF($3, ''), last_name),
			email = COALESCE(NULLIF($4, ''), email),
			phone = COALESCE(NULLIF($5, ''), phone),
			address = COALESCE(NULLIF($6, ''), address),
			emergency_contact = COALESCE(NULLIF($7, ''), emergency_contact),
			allergies = CASE WHEN cardinality($8::text[]) > 0 THEN $8 ELSE allergies END,
			chronic_conditions = CASE WHEN cardinality($9::text[]) > 0 THEN $9 ELSE chronic_conditions END,
			updated_at = $10
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING *`

	p := &model.Patient{}
	err := r.db.QueryRowContext(ctx, query,
		input.ID, input.FirstName, input.LastName, input.Email, input.Phone,
		input.Address, input.EmergencyContact, input.Allergies, input.ChronicConditions,
		time.Now().UTC(),
	).Scan(
		&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone, &p.DateOfBirth,
		&p.Gender, &p.BloodType, &p.Address, &p.EmergencyContact,
		&p.Allergies, &p.ChronicConditions, &p.Status, &p.RiskScore,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, apperrors.NotFound("patient", input.ID)
	}
	if err != nil {
		return nil, apperrors.Internal("failed to update patient: " + err.Error())
	}
	return p, nil
}

func (r *postgresPatientRepo) List(ctx context.Context, filter model.ListPatientsFilter) ([]*model.Patient, int, error) {
	if filter.SortBy == "" {
		filter.SortBy = "created_at"
	}
	if filter.SortOrder == "" {
		filter.SortOrder = "DESC"
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	offset := (filter.Page - 1) * filter.PageSize
	query := fmt.Sprintf(`
		SELECT * FROM patients WHERE deleted_at IS NULL
		ORDER BY %s %s
		LIMIT $1 OFFSET $2`, filter.SortBy, filter.SortOrder)

	rows, err := r.db.QueryContext(ctx, query, filter.PageSize, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("database error")
	}
	defer rows.Close()

	var patients []*model.Patient
	for rows.Next() {
		p := &model.Patient{}
		if err := rows.Scan(
			&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone, &p.DateOfBirth,
			&p.Gender, &p.BloodType, &p.Address, &p.EmergencyContact,
			&p.Allergies, &p.ChronicConditions, &p.Status, &p.RiskScore,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			continue
		}
		patients = append(patients, p)
	}

	var total int
	_ = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL`).Scan(&total)

	return patients, total, nil
}

func (r *postgresPatientRepo) Search(ctx context.Context, filter model.SearchPatientsFilter) ([]*model.Patient, int, error) {
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	offset := (filter.Page - 1) * filter.PageSize
	searchQuery := "%" + filter.Query + "%"

	query := `
		SELECT * FROM patients
		WHERE deleted_at IS NULL AND (
			first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
			OR phone ILIKE $1 OR id::text ILIKE $1
		)
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, searchQuery, filter.PageSize, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("database error")
	}
	defer rows.Close()

	var patients []*model.Patient
	for rows.Next() {
		p := &model.Patient{}
		if err := rows.Scan(
			&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone, &p.DateOfBirth,
			&p.Gender, &p.BloodType, &p.Address, &p.EmergencyContact,
			&p.Allergies, &p.ChronicConditions, &p.Status, &p.RiskScore,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			continue
		}
		patients = append(patients, p)
	}

	var total int
	_ = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL AND (
			first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
		)`, searchQuery).Scan(&total)

	return patients, total, nil
}

func (r *postgresPatientRepo) GetMedicalHistory(ctx context.Context, patientID string) ([]*model.MedicalRecord, error) {
	query := `
		SELECT id, patient_id, diagnosis, treatment, doctor_id, notes,
		       medications, visit_date, record_type, lab_results, created_at
		FROM medical_records
		WHERE patient_id = $1
		ORDER BY visit_date DESC`

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, apperrors.Internal("database error")
	}
	defer rows.Close()

	var records []*model.MedicalRecord
	for rows.Next() {
		rec := &model.MedicalRecord{}
		if err := rows.Scan(
			&rec.ID, &rec.PatientID, &rec.Diagnosis, &rec.Treatment,
			&rec.DoctorID, &rec.Notes, &rec.Medications, &rec.VisitDate,
			&rec.RecordType, &rec.LabResults, &rec.CreatedAt,
		); err != nil {
			continue
		}
		records = append(records, rec)
	}
	return records, nil
}

func (r *postgresPatientRepo) AddMedicalRecord(ctx context.Context, record *model.MedicalRecord) (*model.MedicalRecord, error) {
	record.ID = uuid.New().String()
	record.CreatedAt = time.Now().UTC()

	query := `
		INSERT INTO medical_records (
			id, patient_id, diagnosis, treatment, doctor_id, notes,
			medications, visit_date, record_type, lab_results, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING *`

	rec := &model.MedicalRecord{}
	err := r.db.QueryRowContext(ctx, query,
		record.ID, record.PatientID, record.Diagnosis, record.Treatment,
		record.DoctorID, record.Notes, record.Medications, record.VisitDate,
		record.RecordType, record.LabResults, record.CreatedAt,
	).Scan(
		&rec.ID, &rec.PatientID, &rec.Diagnosis, &rec.Treatment,
		&rec.DoctorID, &rec.Notes, &rec.Medications, &rec.VisitDate,
		&rec.RecordType, &rec.LabResults, &rec.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to add medical record: " + err.Error())
	}
	return rec, nil
}

func (r *postgresPatientRepo) UpdateRiskScore(ctx context.Context, patientID string, score float32) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE patients SET risk_score = $1, updated_at = $2 WHERE id = $3`,
		score, time.Now().UTC(), patientID,
	)
	return err
}
