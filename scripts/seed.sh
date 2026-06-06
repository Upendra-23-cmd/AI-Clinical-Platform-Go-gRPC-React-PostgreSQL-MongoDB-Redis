#!/usr/bin/env bash
# =============================================================
#  HealthOS — Database Seeder
#  Seeds PostgreSQL + MongoDB with realistic demo data.
#  Usage: bash scripts/seed.sh
# =============================================================

set -euo pipefail

# Load .env if present
if [[ -f .env ]]; then
  export $(grep -v '^#' .env | xargs)
fi

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-healthos}"
PGPASSWORD="${POSTGRES_PASSWORD:-healthos_dev_secret}"
PGDB="${POSTGRES_DB:-healthos}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-healthos}"

export PGPASSWORD

echo "🌱 Seeding PostgreSQL: $PGDB on $PGHOST:$PGPORT"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" <<'SQL'

-- ── Patients ─────────────────────────────────────────────────
INSERT INTO patients
  (id, first_name, last_name, email, phone, date_of_birth, gender, blood_type,
   address, emergency_contact, allergies, chronic_conditions, status, risk_score)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Amara',   'Okafor',      'amara.o@mail.com',        '+1-555-0142', '1985-03-14', 'Female', 'O+',
   '42 Oak Lane, Boston MA',    'Kwame Okafor +1-555-0143', ARRAY['Penicillin'],          ARRAY['Type 2 Diabetes','Hypertension'], 'active',   72.0),

  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'James',   'Harrington',  'j.harrington@corp.com',   '+1-555-0219', '1972-11-28', 'Male',   'A-',
   '88 Elm St, Chicago IL',     'Linda Harrington +1-555-0220', ARRAY['Sulfa','Aspirin'], ARRAY['Coronary Artery Disease'],        'critical', 91.0),

  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Sofia',   'Reyes',       'sofia.r@gmail.com',       '+1-555-0387', '1995-07-05', 'Female', 'B+',
   '15 Maple Ave, Austin TX',   'Marco Reyes +1-555-0388',      ARRAY[]::text[],          ARRAY['Asthma'],                        'active',   28.0),

  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'David',   'Chen',        'd.chen@techcorp.io',       '+1-555-0461', '1968-09-17', 'Male',   'AB+',
   '303 Pine Rd, Seattle WA',   'Wei Chen +1-555-0462',         ARRAY['Codeine'],         ARRAY['COPD','Depression'],             'active',   64.0),

  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Priya',   'Sharma',      'priya.s@hospital.net',    '+1-555-0534', '1990-01-22', 'Female', 'O-',
   '9 Birch Ct, San Jose CA',   'Raj Sharma +1-555-0535',       ARRAY['Latex'],           ARRAY[]::text[],                        'active',   15.0),

  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Michael', 'Thompson',    'm.thompson@mail.com',      '+1-555-0612', '1955-06-30', 'Male',   'A+',
   '71 Walnut Dr, Phoenix AZ',  'Carol Thompson +1-555-0613',   ARRAY['NSAIDs','Shellfish'], ARRAY['Heart Failure','CKD Stage 3'], 'critical', 95.0)
ON CONFLICT (id) DO NOTHING;

-- ── Medical Records ──────────────────────────────────────────
INSERT INTO medical_records
  (id, patient_id, diagnosis, treatment, doctor_id, notes, medications, visit_date, record_type)
VALUES
  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Type 2 Diabetes — Routine Follow-up', 'Metformin dosage adjustment',
   'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
   'HbA1c improved to 7.2. Continue current regimen with dietary modifications.',
   ARRAY['Metformin 1000mg','Lisinopril 10mg'], NOW() - INTERVAL '20 days', 'follow-up'),

  (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Hypertension Management', 'ACE Inhibitor therapy continuation',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
   'BP stable at 128/82. No adverse effects noted.',
   ARRAY['Lisinopril 10mg'], NOW() - INTERVAL '75 days', 'follow-up'),

  (gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
   'Coronary Artery Disease — Acute Episode', 'Emergency stent placement',
   'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
   'Successful PCI of LAD. Patient stable post-procedure. Start dual antiplatelet therapy.',
   ARRAY['Aspirin 81mg','Clopidogrel 75mg','Atorvastatin 80mg'], NOW() - INTERVAL '10 days', 'emergency'),

  (gen_random_uuid(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
   'Heart Failure with Reduced EF', 'Guideline-directed medical therapy optimisation',
   'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
   'EF 30%. Started sacubitril/valsartan. CKD limits diuretic use. Close monitoring required.',
   ARRAY['Sacubitril/Valsartan 50mg','Carvedilol 12.5mg','Furosemide 40mg'], NOW() - INTERVAL '5 days', 'specialist')
ON CONFLICT DO NOTHING;

SQL

echo "✅ PostgreSQL seeded"

# ── MongoDB seed via mongosh ────────────────────────────────
echo "🌱 Seeding MongoDB: $MONGO_DB"

mongosh "$MONGO_URI/$MONGO_DB" --quiet <<'JS'

// Appointments
db.appointments.insertMany([
  {
    _id: "appt-001",
    patient_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    doctor_id: "doc-chen",
    doctor_name: "Dr. Sarah Chen",
    department: "Cardiology",
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
    duration_minutes: 30,
    status: "confirmed",
    appointment_type: "Follow-up",
    notes: "Quarterly cardiac review",
    room: "3B-12",
    is_telemedicine: false,
    wait_time_minutes: 0,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: "appt-002",
    patient_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    doctor_id: "doc-patel",
    doctor_name: "Dr. Marcus Patel",
    department: "Pulmonology",
    scheduled_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
    duration_minutes: 45,
    status: "checked_in",
    appointment_type: "Specialist",
    notes: "Asthma management review",
    room: "2A-05",
    is_telemedicine: false,
    wait_time_minutes: 12,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: "appt-003",
    patient_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
    doctor_id: "doc-williams",
    doctor_name: "Dr. Anika Williams",
    department: "General",
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    duration_minutes: 20,
    status: "scheduled",
    appointment_type: "Check-up",
    notes: "Annual wellness visit",
    room: "",
    is_telemedicine: true,
    meeting_url: "https://meet.healthos.io/room-123",
    wait_time_minutes: 0,
    created_at: new Date(),
    updated_at: new Date()
  }
], { ordered: false }).catch(() => {});

// Analytics events
db.analytics_events.insertMany([
  { event_type: "patient_admitted",    entity_id: "a0eebc99", entity_type: "patient",     metadata: "{}", user_id: "doc-chen",    timestamp: new Date() },
  { event_type: "appointment_created", entity_id: "appt-001", entity_type: "appointment", metadata: "{}", user_id: "doc-chen",    timestamp: new Date() },
  { event_type: "patient_discharged",  entity_id: "b0eebc99", entity_type: "patient",     metadata: "{}", user_id: "doc-patel",   timestamp: new Date() },
  { event_type: "ai_diagnosis_run",    entity_id: "sess-001", entity_type: "session",     metadata: "{}", user_id: "doc-williams",timestamp: new Date() }
], { ordered: false }).catch(() => {});

print("MongoDB seeded ✅");
JS

echo ""
echo "🎉 All databases seeded successfully!"
echo "   Run 'make dev' to start all services."
