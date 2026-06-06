# ============================================================
#  HealthOS — Developer Makefile
#  All commands a developer needs to build, run, and test.
# ============================================================

.PHONY: help setup deps proto build run-all stop \
        run-patient run-appointment run-diagnostic \
        run-notification run-analytics run-gateway \
        run-frontend seed lint test fmt

SERVICES := patient-service appointment-service ai-diagnostic-service notification-service analytics-service
GO       := go
GOFLAGS  := -race
MODULE   := github.com/healthos

# ─── Default ────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-26s\033[0m %s\n", $$1, $$2}'

# ─── Setup ──────────────────────────────────────────────────
setup: ## Full first-time developer setup
	@echo "→ Installing Go tools…"
	$(GO) install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	$(GO) install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	$(GO) install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@latest
	@echo "→ Installing frontend deps…"
	cd frontend && npm install
	@echo "→ Copying .env.example → .env (if not present)…"
	cp -n .env.example .env || true
	@echo "✅ Setup complete. Edit .env and run 'make seed && make run-all'"

deps: ## Download all Go modules
	$(GO) mod download
	$(GO) mod tidy

# ─── Proto generation ───────────────────────────────────────
proto: ## Compile all .proto files to Go stubs
	@mkdir -p gen/proto
	for f in proto/health/*.proto; do \
	  protoc \
	    --proto_path=proto \
	    --go_out=gen/proto --go_opt=paths=source_relative \
	    --go-grpc_out=gen/proto --go-grpc_opt=paths=source_relative \
	    $$f ; \
	done
	@echo "✅ Proto files compiled → gen/proto/"

# ─── Build ──────────────────────────────────────────────────
build: deps ## Build all service binaries to ./bin/
	@mkdir -p bin
	@for svc in $(SERVICES); do \
	  echo "  building $$svc…"; \
	  $(GO) build $(GOFLAGS) -o bin/$$svc ./services/$$svc/cmd/; \
	done
	$(GO) build $(GOFLAGS) -o bin/gateway ./gateway/cmd/
	@echo "✅ All binaries in ./bin/"

build-frontend: ## Build production frontend bundle
	cd frontend && npm run build
	@echo "✅ Frontend built → frontend/dist/"

# ─── Run individual services ─────────────────────────────────
run-patient: ## Start patient-service (gRPC :50051, HTTP :8081)
	GRPC_PORT=50051 HTTP_PORT=8081 SERVICE_NAME=patient-service \
	  $(GO) run $(GOFLAGS) ./services/patient-service/cmd/

run-appointment: ## Start appointment-service (gRPC :50052, HTTP :8082)
	GRPC_PORT=50052 HTTP_PORT=8082 SERVICE_NAME=appointment-service \
	  $(GO) run $(GOFLAGS) ./services/appointment-service/cmd/

run-diagnostic: ## Start ai-diagnostic-service (gRPC :50053, HTTP :8083)
	GRPC_PORT=50053 HTTP_PORT=8083 SERVICE_NAME=ai-diagnostic-service \
	  $(GO) run $(GOFLAGS) ./services/ai-diagnostic-service/cmd/

run-notification: ## Start notification-service (gRPC :50054, HTTP :8084)
	GRPC_PORT=50054 HTTP_PORT=8084 SERVICE_NAME=notification-service \
	  $(GO) run $(GOFLAGS) ./services/notification-service/cmd/

run-analytics: ## Start analytics-service (gRPC :50055, HTTP :8085)
	GRPC_PORT=50055 HTTP_PORT=8085 SERVICE_NAME=analytics-service \
	  $(GO) run $(GOFLAGS) ./services/analytics-service/cmd/

run-gateway: ## Start API gateway (HTTP :8080)
	HTTP_PORT=8080 SERVICE_NAME=gateway \
	  $(GO) run $(GOFLAGS) ./gateway/cmd/

run-frontend: ## Start Vite dev server (http://localhost:3000)
	cd frontend && npm run dev

# ─── Run all (tmux) ─────────────────────────────────────────
run-all: ## Launch all services in parallel tmux panes (requires tmux)
	@command -v tmux >/dev/null || { echo "tmux not found — run each 'make run-*' in a separate terminal"; exit 1; }
	tmux new-session -d -s healthos -n gateway    'make run-gateway'
	tmux new-window  -t healthos -n patient        'make run-patient'
	tmux new-window  -t healthos -n appointment    'make run-appointment'
	tmux new-window  -t healthos -n diagnostic     'make run-diagnostic'
	tmux new-window  -t healthos -n notification   'make run-notification'
	tmux new-window  -t healthos -n analytics      'make run-analytics'
	tmux new-window  -t healthos -n frontend       'make run-frontend'
	tmux attach -t healthos
	@echo "✅ All services running. Ctrl-B + D to detach."

stop: ## Kill the healthos tmux session
	tmux kill-session -t healthos 2>/dev/null || true

# ─── Database ────────────────────────────────────────────────
seed: ## Seed PostgreSQL + MongoDB with demo data
	bash scripts/seed.sh

# ─── Code quality ────────────────────────────────────────────
fmt: ## Format all Go code
	$(GO) fmt ./...

lint: ## Run golangci-lint (install: https://golangci-lint.run)
	golangci-lint run ./...

test: ## Run all Go tests
	$(GO) test $(GOFLAGS) ./... -count=1 -timeout 60s

test-coverage: ## Run tests with HTML coverage report
	$(GO) test $(GOFLAGS) ./... -coverprofile=coverage.out -covermode=atomic
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report: coverage.html"

# ─── Health checks ───────────────────────────────────────────
health: ## Check health of all running services
	@echo "Gateway     :" && curl -sf http://localhost:8080/healthz | python3 -m json.tool || echo "DOWN"
	@echo "Patient     :" && curl -sf http://localhost:8081/healthz | python3 -m json.tool || echo "DOWN"
	@echo "Appointment :" && curl -sf http://localhost:8082/healthz | python3 -m json.tool || echo "DOWN"
	@echo "Diagnostic  :" && curl -sf http://localhost:8083/healthz | python3 -m json.tool || echo "DOWN"
	@echo "Notification:" && curl -sf http://localhost:8084/healthz | python3 -m json.tool || echo "DOWN"
	@echo "Analytics   :" && curl -sf http://localhost:8085/healthz | python3 -m json.tool || echo "DOWN"

# ─── Clean ───────────────────────────────────────────────────
clean: ## Remove build artefacts
	rm -rf bin/ coverage.out coverage.html gen/

.DEFAULT_GOAL := help
