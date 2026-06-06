# Architecture Decision Records (ADRs)

This document captures key architectural decisions made during HealthOS development,
their rationale, and the trade-offs considered.

---

## ADR-001: gRPC for Inter-Service Communication

**Status:** Accepted  
**Date:** 2025-01

### Context
Services need to communicate reliably with strong typing. Options: REST/JSON, GraphQL, gRPC, message queue.

### Decision
Use gRPC with Protocol Buffers for all inter-service communication.

### Rationale
- **Strong typing**: `.proto` contracts catch breaking changes at compile time
- **Performance**: binary serialisation is 3–10× faster than JSON for internal traffic
- **Code generation**: stubs auto-generated for Go; adding a Python ML service later requires only `protoc`
- **Streaming**: gRPC supports server streaming for future real-time vitals feeds

### Trade-offs
- Steeper learning curve than REST
- Harder to inspect traffic without `grpcurl` or Wireshark

---

## ADR-002: Polyglot Persistence

**Status:** Accepted  
**Date:** 2025-01

### Context
Patient records, appointments, and analytics events have fundamentally different access patterns and schemas.

### Decision
- **PostgreSQL** for patients and medical records (strict ACID, relational integrity, foreign keys)
- **MongoDB** for appointments and analytics events (flexible schema, TTL indexes, horizontal scale)
- **Redis** for caching and pub/sub (microsecond reads, native pub/sub primitives)

### Rationale
Forcing all data into a single database would mean:
- Either using PostgreSQL `JSONB` for appointments (losing MongoDB's native indexing)
- Or abandoning ACID for patient records (unacceptable for medical data)

### Trade-offs
- Operators must run three database systems
- No cross-service transactions (handled at application layer with eventual consistency)

---

## ADR-003: Cache-Aside with Fail-Open

**Status:** Accepted  
**Date:** 2025-01

### Context
Patient GET requests are read-heavy (clinical dashboards refresh every 30s). Each DB read under load could become a bottleneck.

### Decision
Implement cache-aside (lazy population) with 15-minute TTL. All Redis errors return `nil` (fail-open) rather than propagating.

### Rationale
- **Fail-open is critical**: a Redis outage should degrade performance, never cause outages or error responses
- Cache-aside avoids cache poisoning on writes (we invalidate explicitly on mutation)
- 15-minute TTL balances freshness vs. DB load

### Trade-offs
- Cold start has no cache benefit (first request always hits DB)
- Stale reads possible within the 15-minute window if a write invalidation fails

---

## ADR-004: Claude as the AI Backend

**Status:** Accepted  
**Date:** 2025-01

### Context
Differential diagnosis, risk scoring, drug interaction checking, and medical chat require a language model with medical knowledge.

### Decision
Use the Anthropic Claude API (`claude-sonnet-4-20250514`) via direct HTTP calls from the AI Diagnostic service.

### Rationale
- Claude's medical knowledge is extensive and regularly updated
- Structured output prompting ("return only valid JSON") is reliable with Claude Sonnet
- The Anthropic API is the same endpoint used in this application's host (no additional vendor)
- Fallback to demo responses when `AI_API_KEY` is unset keeps development friction low

### Trade-offs
- Latency: AI calls take 2–8s (mitigated with loading states + streaming in future)
- Cost: each call consumes tokens (mitigated by prompt efficiency — system prompts are terse)
- Privacy: patient data is sent to Anthropic (mitigated by data minimisation — only necessary fields)

---

## ADR-005: API Gateway over Service Mesh

**Status:** Accepted  
**Date:** 2025-01

### Context
Cross-cutting concerns (auth, rate limiting, CORS, routing) must be handled somewhere.

### Decision
A lightweight custom API gateway in Go rather than a service mesh (Istio, Linkerd) or third-party gateway (Kong, Nginx).

### Rationale
- No DevOps tooling in scope — a service mesh requires sidecar injection and k8s
- The custom gateway is ~200 lines of idiomatic Go, fully readable and debuggable
- JWT validation, rate limiting, and reverse proxying cover 95% of needs without external deps

### Trade-offs
- No mTLS between services (acceptable for a trusted private network)
- No distributed tracing out-of-the-box (add OpenTelemetry as the next step)

---

## ADR-006: Vite + React over Next.js

**Status:** Accepted  
**Date:** 2025-01

### Context
Frontend stack selection for an internal clinical dashboard.

### Decision
Vite 5 + React 18 + React Router v6 (SPA) instead of Next.js (SSR/SSG).

### Rationale
- Clinical dashboards are authenticated SPAs — SSR provides no SEO benefit
- Vite's HMR is sub-100ms vs. Next.js's slower dev cycle for complex apps
- No server component complexity for a team focused on Go microservices
- React Router v6 nested routes map cleanly to the sidebar navigation

### Trade-offs
- No built-in SSR/SSG (not needed for this use case)
- Initial bundle load slightly slower than Next.js (mitigated by code splitting)

---

## ADR-007: Zustand over Redux

**Status:** Accepted  
**Date:** 2025-01

### Context
Global client state (auth, preferences) needs a home outside React Query's server-state cache.

### Decision
Zustand for global client state. TanStack Query for all server state.

### Rationale
- Zustand is 1.5KB vs Redux Toolkit's 40KB+
- No boilerplate: `create()` gives a store in 10 lines
- `persist` middleware handles localStorage serialisation automatically
- Server state belongs in React Query — keeping the stores separate is idiomatic

### Trade-offs
- Less ecosystem tooling than Redux DevTools (Zustand DevTools exist but are basic)
