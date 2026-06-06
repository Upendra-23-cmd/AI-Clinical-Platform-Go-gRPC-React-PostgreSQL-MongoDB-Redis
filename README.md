# HealthOS · AI-Powered Clinical Management Platform

<div align="center">

![HealthOS Banner](https://img.shields.io/badge/HealthOS-Clinical%20Platform-4f8ef7?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMjIgMTJoLTRsLTMgOUw5IDNoLTMtOWgtNCI+PC9wYXRoPjwvc3ZnPg==)

[![Go Version](https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![gRPC](https://img.shields.io/badge/gRPC-Protocol-244c5a?style=flat-square)](https://grpc.io)
[![Claude AI](https://img.shields.io/badge/Claude-AI%20Powered-7c4dff?style=flat-square)](https://anthropic.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A production-grade, AI-powered hospital management system** built with 5 Go microservices communicating over gRPC, a React/TypeScript frontend, Redis cache, PostgreSQL, and MongoDB — with Claude as the embedded agentic clinical AI.

[Architecture](#architecture) · [Quick Start](#quick-start) · [Services](#services) · [API Reference](#api-reference) · [Frontend](#frontend) · [AI Features](#ai-features)

</div>

---

## The Problem HealthOS Solves

Modern hospitals run on fragmented software: separate systems for scheduling, records, diagnostics, and communications. Clinicians waste 35–40% of their time navigating disconnected tools, and diagnostic errors affect 12 million patients annually in the US alone.

**HealthOS** unifies these workflows into a single, real-time platform with an embedded AI layer (Claude) that:

- Assists clinicians with **differential diagnosis** at the point of care
- Flags dangerous **drug interactions** before prescriptions are written  
- Generates **patient risk scores** from longitudinal medical history
- Provides an always-available **AI medical assistant** for both staff and patients
- Surfaces **operational analytics** so administrators can act, not just observe

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React / TypeScript Frontend                   │
│              (Vite · Zustand · React Query · Recharts)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST / JSON
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (Go)                            │
│           JWT Auth · Rate Limiting · Reverse Proxy               │
└──────┬──────────┬──────────┬──────────┬──────────┬─────────────┘
       │ gRPC     │ gRPC     │ gRPC     │ gRPC     │ gRPC
       ▼          ▼          ▼          ▼          ▼
  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
  │ Patient │ │Appointment│ │  AI    │ │Notif.  │ │Analytics │
  │ Service │ │ Service  │ │Diag.   │ │Service │ │ Service  │
  │  :50051 │ │  :50052  │ │Service │ │ :50054 │ │  :50055  │
  └────┬────┘ └────┬─────┘ │ :50053 │ └───┬────┘ └────┬─────┘
       │           │        └───┬────┘     │           │
       │           │            │           │           │
  ┌────▼────┐ ┌────▼─────┐ ┌───▼────┐ ┌───▼──────┐ ┌─▼────────┐
  │PostgreSQL│ │ MongoDB  │ │Anthropic│ │  Redis   │ │ MongoDB  │
  │(patients │ │(appoint- │ │  API   │ │(pub/sub) │ │(analytics│
  │ records) │ │  ments)  │ │(Claude)│ │(notifs)  │ │  events) │
  └─────────┘ └──────────┘ └────────┘ └──────────┘ └──────────┘
                                │
                          ┌─────▼──────┐
                          │   Redis    │
                          │  (cache)   │
                          └────────────┘
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Single Responsibility** | Each service owns one bounded context |
| **Fail Open Caching** | Redis cache misses fall through to DB, never error |
| **Structured Concurrency** | All goroutines with context cancellation & graceful shutdown |
| **Idempotent Migrations** | DDL wrapped in `IF NOT EXISTS` — safe to re-run |
| **Defense in Depth** | JWT at gateway + per-service validation |
| **Observable by Default** | Structured zap logs + `/healthz` on every service |

---

## Tech Stack

### Backend (Go 1.22)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **RPC** | gRPC + Protocol Buffers | Type-safe inter-service communication |
| **HTTP** | `net/http` + `grpc-gateway` | REST exposure via gateway |
| **Relational DB** | PostgreSQL 16 | Patient records, medical history |
| **Document DB** | MongoDB 7 | Appointments, analytics events (flexible schema) |
| **Cache / Pub-Sub** | Redis 7 | 15-min patient cache, real-time notifications via pub/sub |
| **AI** | Anthropic Claude API | Symptom analysis, drug checks, chat, summaries |
| **Auth** | JWT (HS256) via `golang-jwt` | Stateless authentication at gateway |
| **Logging** | `go.uber.org/zap` | Structured, levelled, performant |

### Frontend (TypeScript + React 18)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Build** | Vite 5 | Sub-second HMR, optimised bundles |
| **UI** | React 18 + custom CSS | Component-based, no UI framework lock-in |
| **State** | Zustand | Lightweight global state (auth, preferences) |
| **Server State** | TanStack Query v5 | Cache, refetch, optimistic updates |
| **Charts** | Recharts | Area, Bar, Radar, Pie charts |
| **Routing** | React Router v6 | Nested routes, protected routes |
| **HTTP** | Axios | Interceptors for auth + error handling |
| **Animations** | Framer Motion | Page transitions |
| **Toasts** | react-hot-toast | Non-intrusive notifications |

---

## Microservices

### 1. Patient Service (`services/patient-service`)

**Responsibility:** Full CRUD lifecycle for patients and their medical records.

**Stack:** Go · gRPC · PostgreSQL · Redis cache

**Key features:**
- Create/Read/Update patients with full-text search
- Medical history with linked diagnoses, treatments, and medications
- 15-minute Redis cache for GET operations (write-through invalidation)
- Automatic DB migration on startup (idempotent DDL)
- Risk score updated asynchronously by the AI Diagnostic service

**gRPC methods:**
```
CreatePatient · GetPatient · UpdatePatient · ListPatients
SearchPatients · GetPatientMedicalHistory · AddMedicalRecord
```

**PostgreSQL schema:**
```sql
patients        (id, first_name, last_name, email, phone, date_of_birth,
                 gender, blood_type, address, emergency_contact,
                 allergies[], chronic_conditions[], status, risk_score,
                 created_at, updated_at, deleted_at)

medical_records (id, patient_id→patients, diagnosis, treatment, doctor_id,
                 notes, medications[], visit_date, record_type,
                 lab_results[], created_at)
```

---

### 2. Appointment Service (`services/appointment-service`)

**Responsibility:** Scheduling, room management, telemedicine links, and real-time wait times.

**Stack:** Go · gRPC · MongoDB

**Key features:**
- Conflict detection — prevents double-booking a doctor
- Flexible document schema (telemedicine URL, room, wait time)
- Compound indexes on `(doctor_id, scheduled_at)` for fast schedule lookups
- Status machine: `scheduled → confirmed → checked_in → completed / cancelled`
- 90-day TTL on analytics events via MongoDB index

**gRPC methods:**
```
CreateAppointment · GetAppointment · UpdateAppointment
CancelAppointment · ListAppointments · GetDoctorSchedule
GetAvailableSlots · CheckInPatient
```

**MongoDB collection:** `appointments`
```json
{
  "_id": "uuid",
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "doctor_name": "Dr. Sarah Chen",
  "department": "Cardiology",
  "scheduled_at": "ISODate",
  "duration_minutes": 30,
  "status": "confirmed",
  "is_telemedicine": false,
  "room": "3B-12"
}
```

---

### 3. AI Diagnostic Service (`services/ai-diagnostic-service`)

**Responsibility:** All AI/ML features powered by Claude (Anthropic).

**Stack:** Go · gRPC · Anthropic Claude API

**This is the crown jewel of the system.** Every AI call returns structured JSON (enforced via system prompts), which is then validated, type-asserted, and forwarded to the frontend.

**Capabilities:**

| Feature | Claude Prompt Strategy | Output |
|---------|----------------------|--------|
| **Symptom Analysis** | Structured JSON prompt with patient context | Differential diagnoses with confidence scores + ICD-10 codes |
| **Risk Assessment** | Patient history + lifestyle → risk scoring | 0–100 risk score, risk factors, preventive measures |
| **Treatment Recommendations** | Diagnosis + allergies + current meds | Evidence-based treatment options with effectiveness ratings |
| **Drug Interaction Check** | Multi-drug list | Severity classification (minor/moderate/major/contraindicated) |
| **AI Medical Chat** | Conversational with patient context | Real-time Q&A with escalation detection |
| **Patient Summary** | Longitudinal record aggregation | Clinical narrative + key concerns + next steps |

**AI prompt engineering pattern:**
```go
systemPrompt := `You are an expert medical AI assistant. 
Return ONLY a valid JSON object with this exact structure: {...}
Never include markdown, explanations, or preamble.`
```

**gRPC methods:**
```
AnalyzeSymptoms · GetRiskAssessment · GetTreatmentRecommendation
AnalyzeMedicalImage · GetDrugInteractions · GeneratePatientSummary · ChatWithAI
```

---

### 4. Notification Service (`services/notification-service`)

**Responsibility:** Real-time notifications via Redis pub/sub and Server-Sent Events.

**Stack:** Go · gRPC · Redis pub/sub · SSE

**Key features:**
- **Redis pub/sub** channels per user (`notifications:{user_id}`)
- **SSE endpoint** (`/api/v1/notifications/stream?user_id=X`) for browser real-time push
- Event-driven: subscribes to `healthos:events` Redis channel
- Automatically generates reminders for upcoming appointments
- Priority levels: `low | normal | high | urgent`

**gRPC methods:**
```
SendNotification · SendBulkNotification · GetNotifications
MarkAsRead · GetUnreadCount · ScheduleReminder
```

**Real-time flow:**
```
Service → Redis PUBLISH healthos:events → Notification Service → Redis PUBLISH notifications:{uid} → SSE → Browser
```

---

### 5. Analytics Service (`services/analytics-service`)

**Responsibility:** Hospital operations metrics, department stats, revenue analytics.

**Stack:** Go · MongoDB (timeseries events) · HTTP REST

**Key features:**
- Ingests `analytics_events` from all services
- 90-day TTL index on events (automatic purge)
- Real-time dashboard endpoint aggregating live counts
- Department-level breakdown (patients, wait times, satisfaction, beds)
- Revenue tracking with monthly rollup
- Bed occupancy rate calculation

**HTTP endpoints** (also exposed over gRPC):
```
GET  /api/v1/analytics/dashboard   → DashboardMetrics
POST /api/v1/analytics/events      → record event
GET  /api/v1/analytics/trends      → time-series data
```

---

### 6. API Gateway (`gateway`)

**Responsibility:** Single entry point — auth, rate limiting, routing.

**Stack:** Go · `net/http` · JWT

**Features:**
- **JWT verification** on every protected request
- **Token-bucket rate limiter** — 100 req/s per IP, auto-cleaned every 5 minutes
- **Reverse proxy** to all upstream services via `httputil.ReverseProxy`
- **CORS** for browser clients
- **Request logging** with method, path, status, and duration
- **Graceful shutdown** with 10-second drain timeout
- `/api/v1/auth/login` and `/api/v1/auth/refresh` — no auth required

**Routing table:**
```
/api/v1/patients/*      → patient-service   :8081
/api/v1/appointments/*  → appointment-service :8082
/api/v1/diagnostics/*   → ai-diagnostic-service :8083
/api/v1/notifications/* → notification-service :8084
/api/v1/analytics/*     → analytics-service :8085
```

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Go | 1.22+ | https://go.dev/dl |
| Node.js | 20+ | https://nodejs.org |
| PostgreSQL | 16+ | https://postgresql.org |
| MongoDB | 7+ | https://mongodb.com |
| Redis | 7+ | https://redis.io |
| `protoc` | 25+ | https://grpc.io/docs/protoc-installation |
| `make` | any | pre-installed on macOS/Linux |

> **macOS shortcut:** `brew install go node postgresql@16 mongodb-community redis protobuf`

### 1. Clone and configure

```bash
git clone https://github.com/your-org/healthos.git
cd healthos

# Copy and edit environment variables
cp .env.example .env
```

Open `.env` and set **at minimum**:
```dotenv
POSTGRES_PASSWORD=your_password
JWT_SECRET=your-32-char-random-secret
AI_API_KEY=sk-ant-YOUR_ANTHROPIC_KEY   # get at console.anthropic.com
```

### 2. Start infrastructure

```bash
# PostgreSQL
createdb healthos    # or: createuser -s healthos && createdb -O healthos healthos

# MongoDB (runs as a service after brew install)
brew services start mongodb-community

# Redis
redis-server --daemonize yes
```

### 3. Install dependencies

```bash
make setup    # installs Go proto tools + npm deps
make deps     # go mod download + tidy
```

### 4. Generate gRPC stubs

```bash
make proto    # compiles proto/health/*.proto → gen/proto/
```

### 5. Seed the database

```bash
make seed     # inserts demo patients, appointments, analytics events
```

### 6. Start all services

**Option A — tmux (recommended):**
```bash
make run-all   # opens tmux with 7 panes, one per service
```

**Option B — separate terminals:**
```bash
# Terminal 1: Gateway
make run-gateway

# Terminal 2: Patient Service
make run-patient

# Terminal 3: Appointment Service
make run-appointment

# Terminal 4: AI Diagnostic Service
make run-diagnostic

# Terminal 5: Notification Service
make run-notification

# Terminal 6: Analytics Service
make run-analytics

# Terminal 7: Frontend
make run-frontend
```

### 7. Open the app

```
Frontend:  http://localhost:3000
Gateway:   http://localhost:8080

Demo login: any email / any password
           (admin@healthos.io / demo1234 for admin role)
```

### 8. Verify health

```bash
make health   # curl all /healthz endpoints
```

---

## Project Structure

```
healthos/
├── proto/
│   └── health/
│       ├── patient.proto          # Patient + MedicalRecord RPC definitions
│       ├── appointment.proto      # Appointment scheduling RPCs
│       ├── diagnostic.proto       # AI diagnostic RPCs
│       ├── notification.proto     # Notification RPCs
│       └── analytics.proto        # Analytics RPCs
│
├── services/
│   ├── patient-service/
│   │   ├── cmd/main.go            # Entry point, wiring, migrations
│   │   └── internal/
│   │       ├── handler/           # gRPC handler (business logic)
│   │       ├── repository/        # PostgreSQL data access
│   │       ├── cache/             # Redis cache layer
│   │       └── model/             # Domain models
│   │
│   ├── appointment-service/
│   │   ├── cmd/main.go
│   │   └── internal/
│   │       ├── repository/        # MongoDB repository
│   │       └── model/
│   │
│   ├── ai-diagnostic-service/
│   │   ├── cmd/main.go
│   │   └── internal/
│   │       ├── handler/           # gRPC handler
│   │       └── pipeline/          # Anthropic API client + prompt engineering
│   │
│   ├── notification-service/
│   │   └── cmd/main.go            # Redis pub/sub + SSE server
│   │
│   └── analytics-service/
│       └── cmd/main.go            # MongoDB aggregation + HTTP REST
│
├── gateway/
│   └── cmd/main.go                # JWT auth, rate limiting, reverse proxy
│
├── shared/
│   ├── config/config.go           # Unified env config loader
│   ├── logger/logger.go           # Zap logger singleton
│   └── errors/errors.go           # Domain errors → gRPC status codes
│
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Route-level page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   ├── AppointmentsPage.tsx
│   │   │   ├── DiagnosticsPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   └── AIChatPage.tsx
│   │   ├── components/
│   │   │   └── common/Layout.tsx  # Sidebar, topbar, routing shell
│   │   ├── services/api.ts        # Typed Axios client for all services
│   │   ├── store/auth.ts          # Zustand auth store (persisted)
│   │   ├── types/index.ts         # All TypeScript interfaces
│   │   ├── App.tsx                # Router + QueryClient setup
│   │   ├── main.tsx               # React entry point
│   │   └── index.css              # Design system (CSS variables)
│   ├── public/favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── scripts/
│   └── seed.sh                    # PostgreSQL + MongoDB demo data seeder
│
├── docs/                          # Additional documentation
├── .env.example                   # All environment variables documented
├── .gitignore
├── go.mod
├── Makefile                       # All developer commands
└── README.md
```

---

## API Reference

### Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "doctor@hospital.com", "password": "secret" }

→ { "token": "eyJ...", "user_id": "...", "role": "doctor", "expires_in": 86400 }
```

All subsequent requests require:
```http
Authorization: Bearer eyJ...
```

### Patient Service

```http
GET    /api/v1/patients?page=1&page_size=20
POST   /api/v1/patients
GET    /api/v1/patients/:id
PUT    /api/v1/patients/:id
GET    /api/v1/patients/search?query=okafor
GET    /api/v1/patients/:id/medical-history
POST   /api/v1/patients/:id/medical-records
```

### Appointment Service

```http
GET    /api/v1/appointments?patient_id=&doctor_id=&status=&date_from=&date_to=
POST   /api/v1/appointments
GET    /api/v1/appointments/:id
PUT    /api/v1/appointments/:id
POST   /api/v1/appointments/:id/cancel
POST   /api/v1/appointments/:id/check-in
GET    /api/v1/appointments/slots?doctor_id=&date=2025-06-10
```

### AI Diagnostic Service

```http
POST   /api/v1/diagnostics/analyze
{
  "patient_id": "p-001",
  "symptoms": ["chest pain", "shortness of breath"],
  "age": "58",
  "gender": "Male",
  "existing_conditions": ["Hypertension"],
  "current_medications": ["Lisinopril"]
}

POST   /api/v1/diagnostics/risk-assessment
POST   /api/v1/diagnostics/drug-interactions
POST   /api/v1/diagnostics/chat
POST   /api/v1/diagnostics/summary
```

### Analytics Service

```http
GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/trends?period=7d&metric=admissions
POST   /api/v1/analytics/events
```

### Notification Service

```http
POST   /api/v1/notifications/send
GET    /api/v1/notifications/?user_id=U001
GET    /api/v1/notifications/stream?user_id=U001  ← SSE
```

---

## Frontend

The UI is built on a **dark "clinical deep space" design system** — purpose-built for low-light clinical environments where readability and information density matter.

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Animated split-panel login with feature showcase |
| `/dashboard` | Dashboard | Live KPIs, admission trend, department load, occupancy |
| `/patients` | Patients | Searchable list with risk scores, status badges |
| `/patients/:id` | Patient Detail | Full profile, medical history, risk breakdown |
| `/appointments` | Appointments | Grouped timeline with status, telemedicine flags |
| `/diagnostics` | Diagnostics | AI symptom analyzer + drug interaction checker |
| `/analytics` | Analytics | Revenue charts, radar chart, department scorecard |
| `/ai-chat` | AI Assistant | Real-time AI medical chat with escalation detection |

### Design System

Located in `frontend/src/index.css`:

```css
--bg-void:    #070a0f   /* Page background — deepest dark         */
--bg-base:    #0c111c   /* Sidebar, header                        */
--bg-card:    #1e2940   /* Cards, panels                          */
--accent-primary:  #4f8ef7  /* Blue — primary actions, highlights */
--accent-teal:     #06d6a0  /* Success, positive metrics          */
--accent-amber:    #f59e0b  /* Warnings                           */
--accent-rose:     #f43f5e  /* Danger, alerts                     */
--font-display: 'Syne'      /* Headings — geometric bold          */
--font-body:    'DM Sans'   /* Body — clean, medical-grade        */
```

### State Management

```
┌──────────────────────────────────────┐
│         Zustand (auth store)         │  ← persisted in localStorage
│  { user, isAuthenticated, login,     │
│    logout }                          │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│       TanStack Query (server state)  │  ← auto-refetch, cache, invalidate
│  useQuery(['patients'], patientApi)  │
│  useMutation(patientApi.create)      │
└──────────────────────────────────────┘
```

---

## AI Features

### How Claude Integration Works

The `ai-diagnostic-service` wraps the Anthropic Messages API with a strict **structured output** pattern:

1. Every prompt instructs Claude to return **only valid JSON** with a defined schema
2. The Go service unmarshals the JSON into typed structs
3. If parsing fails, the error is logged and a safe fallback is returned
4. The gRPC response carries the structured data to the gateway → frontend

```go
// Example: Symptom Analysis Prompt
systemPrompt := `You are an expert medical AI assistant.
Return ONLY a valid JSON object (no markdown) with this exact structure:
{
  "possible_diagnoses": [
    {"condition": "string", "confidence": 0.0-1.0, "icd_code": "string", ...}
  ],
  "urgency_level": "low|medium|high|critical",
  "emergency_referral": false
}`
```

### AI Chat (Agentic Mode)

The chat endpoint maintains **full conversation history** across turns, enabling multi-step reasoning:

```
User: "Patient has chest pain and shortness of breath"
AI:   "Those symptoms could indicate... [3 differentials]. Any radiation to the jaw?"
User: "Yes, and sweating"
AI:   "EMERGENCY: These symptoms together strongly suggest ACS. Call 911 immediately."
      → escalate_to_doctor: true, urgency: "critical"
```

The frontend detects `escalate_to_doctor: true` and renders a red emergency banner.

### Configuring AI

```dotenv
AI_API_KEY=sk-ant-YOUR_KEY    # from console.anthropic.com
AI_MODEL=claude-sonnet-4-20250514
AI_PROVIDER_URL=https://api.anthropic.com
```

If `AI_API_KEY` is not set, all AI endpoints return structured demo responses so the rest of the system still works.

---

## Caching Strategy

```
┌─────────────┬──────────────────────────────────────────────────────┐
│ Layer       │ Strategy                                              │
├─────────────┼──────────────────────────────────────────────────────┤
│ Patient GET │ Cache-aside, 15-min TTL, invalidated on write        │
│ Patient LIST│ Cache-aside, 5-min TTL, bulk-invalidated on write    │
│ Notif. Push │ Redis pub/sub per user channel                        │
│ Event bus   │ Redis pub/sub `healthos:events` topic                │
│ Analytics   │ MongoDB 90-day TTL index (auto-eviction)             │
└─────────────┴──────────────────────────────────────────────────────┘
```

**Fail-open:** All Redis reads catch errors and return `nil`, falling through to the database. A Redis outage degrades performance, never availability.

---

## Error Handling

### Backend (gRPC status codes)

Domain errors are mapped to gRPC status codes in `shared/errors/errors.go`:

```go
ErrNotFound      → codes.NotFound        (404)
ErrAlreadyExists → codes.AlreadyExists   (409)
ErrInvalidInput  → codes.InvalidArgument (400)
ErrUnauthorized  → codes.Unauthenticated (401)
ErrForbidden     → codes.PermissionDenied(403)
ErrInternalError → codes.Internal        (500)
```

### Frontend (Axios interceptors)

```typescript
// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('healthos-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

---

## Testing

```bash
# Run all Go tests
make test

# With coverage report
make test-coverage
# → opens coverage.html in browser

# Lint
make lint      # requires golangci-lint

# Type-check frontend
cd frontend && npm run type-check
```

### Writing Tests

Each service's `internal/` packages are fully testable in isolation. Use standard Go testing:

```go
// services/patient-service/internal/repository/patient_repository_test.go
func TestCreatePatient(t *testing.T) {
    db := setupTestDB(t)           // uses testcontainers or SQLite
    repo := NewPatientRepository(db, zap.NewNop())
    patient, err := repo.Create(context.Background(), model.CreatePatientInput{...})
    require.NoError(t, err)
    assert.Equal(t, "John", patient.FirstName)
}
```

---

## Configuration Reference

All configuration is loaded from environment variables (via `shared/config/config.go`). No config files are used — only `.env` for local development.

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `APP_ENV` | `development` | No | `development` or `production` |
| `GRPC_PORT` | `50051` | No | gRPC listen port (set per service) |
| `HTTP_PORT` | `8080` | No | HTTP/health listen port |
| `POSTGRES_HOST` | `localhost` | Yes | PostgreSQL hostname |
| `POSTGRES_USER` | `healthos` | Yes | PostgreSQL user |
| `POSTGRES_PASSWORD` | — | **Yes** | PostgreSQL password |
| `POSTGRES_DB` | `healthos` | Yes | Database name |
| `MONGO_URI` | `mongodb://localhost:27017` | Yes | MongoDB connection URI |
| `REDIS_HOST` | `localhost` | Yes | Redis hostname |
| `REDIS_PASSWORD` | — | No | Redis password (if auth enabled) |
| `JWT_SECRET` | — | **Yes** | HS256 signing key (32+ chars) |
| `AI_API_KEY` | — | For AI features | Anthropic API key |
| `AI_MODEL` | `claude-sonnet-4-20250514` | No | Claude model to use |

---

## Why This Is Resume-Grade

This project demonstrates the full stack of skills expected at a senior level in a top-tier engineering organisation:

| Skill | Evidence in This Project |
|-------|------------------------|
| **Microservices Architecture** | 5 bounded-context services with clear separation of concerns |
| **gRPC + Protocol Buffers** | All inter-service comms; `.proto` files define the contract |
| **Polyglot Persistence** | PostgreSQL (relational), MongoDB (document), Redis (cache/pub-sub) |
| **Caching Strategy** | Cache-aside with TTL, write-through invalidation, fail-open |
| **AI/ML Integration** | Anthropic API with structured output prompting, agentic chat |
| **API Gateway Pattern** | Single ingress with auth, rate-limiting, routing |
| **Real-time Systems** | Redis pub/sub + SSE for live notifications |
| **TypeScript Frontend** | Typed API layer, custom hooks, Zustand + React Query |
| **Production Observability** | Structured zap logs, `/healthz` endpoints, interceptors |
| **Developer Experience** | Single `make setup && make run-all` to get running |
| **Clean Code** | Interfaces over concretions, dependency injection, error wrapping |
| **Domain Modeling** | Separate model/repository/handler layers per service |

---

## Extending HealthOS

### Adding a new microservice

1. Define the `.proto` file in `proto/health/`
2. Run `make proto` to generate Go stubs
3. Create `services/my-service/` following the same `cmd/` + `internal/` structure
4. Wire it into the gateway's `buildRoutes()` function
5. Add a `run-my-service` target to the `Makefile`
6. Add environment variables to `.env.example`

### Adding a new frontend page

1. Create `frontend/src/pages/MyPage.tsx`
2. Add a route in `frontend/src/App.tsx`
3. Add a `navItems` entry in `frontend/src/components/common/Layout.tsx`
4. Add typed API methods in `frontend/src/services/api.ts`

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built with precision by a team that believes software can genuinely improve patient outcomes.

**HealthOS** — where clinical excellence meets engineering craft.

</div>
