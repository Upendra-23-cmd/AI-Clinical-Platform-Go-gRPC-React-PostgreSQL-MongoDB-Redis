package model

import "time"

type Appointment struct {
	ID               string    `bson:"_id" json:"id"`
	PatientID        string    `bson:"patient_id" json:"patient_id"`
	DoctorID         string    `bson:"doctor_id" json:"doctor_id"`
	DoctorName       string    `bson:"doctor_name" json:"doctor_name"`
	Department       string    `bson:"department" json:"department"`
	ScheduledAt      time.Time `bson:"scheduled_at" json:"scheduled_at"`
	DurationMinutes  int       `bson:"duration_minutes" json:"duration_minutes"`
	Status           string    `bson:"status" json:"status"` // scheduled|confirmed|checked_in|completed|cancelled|no_show
	AppointmentType  string    `bson:"appointment_type" json:"appointment_type"`
	Notes            string    `bson:"notes" json:"notes"`
	Room             string    `bson:"room" json:"room"`
	IsTelemedicine   bool      `bson:"is_telemedicine" json:"is_telemedicine"`
	MeetingURL       string    `bson:"meeting_url" json:"meeting_url"`
	WaitTimeMinutes  int       `bson:"wait_time_minutes" json:"wait_time_minutes"`
	CancellationReason string  `bson:"cancellation_reason,omitempty" json:"cancellation_reason,omitempty"`
	CreatedAt        time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt        time.Time `bson:"updated_at" json:"updated_at"`
}

type ListFilter struct {
	PatientID string
	DoctorID  string
	Status    string
	DateFrom  string
	DateTo    string
	Page      int
	PageSize  int
}
