package model

import (
	"time"

	"github.com/lib/pq"
)

type Patient struct {
	ID                 string         `db:"id" json:"id"`
	FirstName          string         `db:"first_name" json:"first_name"`
	LastName           string         `db:"last_name" json:"last_name"`
	Email              string         `db:"email" json:"email"`
	Phone              string         `db:"phone" json:"phone"`
	DateOfBirth        string         `db:"date_of_birth" json:"date_of_birth"`
	Gender             string         `db:"gender" json:"gender"`
	BloodType          string         `db:"blood_type" json:"blood_type"`
	Address            string         `db:"address" json:"address"`
	EmergencyContact   string         `db:"emergency_contact" json:"emergency_contact"`
	Allergies          pq.StringArray `db:"allergies" json:"allergies"`
	ChronicConditions  pq.StringArray `db:"chronic_conditions" json:"chronic_conditions"`
	Status             string         `db:"status" json:"status"`
	RiskScore          float32        `db:"risk_score" json:"risk_score"`
	CreatedAt          time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time      `db:"updated_at" json:"updated_at"`
}

type MedicalRecord struct {
	ID          string         `db:"id" json:"id"`
	PatientID   string         `db:"patient_id" json:"patient_id"`
	Diagnosis   string         `db:"diagnosis" json:"diagnosis"`
	Treatment   string         `db:"treatment" json:"treatment"`
	DoctorID    string         `db:"doctor_id" json:"doctor_id"`
	Notes       string         `db:"notes" json:"notes"`
	Medications pq.StringArray `db:"medications" json:"medications"`
	VisitDate   time.Time      `db:"visit_date" json:"visit_date"`
	RecordType  string         `db:"record_type" json:"record_type"`
	LabResults  pq.StringArray `db:"lab_results" json:"lab_results"`
	CreatedAt   time.Time      `db:"created_at" json:"created_at"`
}

type CreatePatientInput struct {
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

type UpdatePatientInput struct {
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

type ListPatientsFilter struct {
	Page      int
	PageSize  int
	SortBy    string
	SortOrder string
}

type SearchPatientsFilter struct {
	Query    string
	Page     int
	PageSize int
}
