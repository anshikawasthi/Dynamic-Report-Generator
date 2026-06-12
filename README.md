# Dynamic Report Generator

A metadata-driven report generator with Flask backend and React frontend.

## Delivered Scope

- Backend data providers for SMS, NEX, SAP with unified schema mapping.
- KPI catalog search and dynamic filtering (date range, preset, region, site, contract, language).
- Universal API response format:
  - meta
  - presentation
  - schema
  - data
- Login and role-based access for Customer Success, Field Service, Site Director.
- Report template save/list, summary vs detailed generation mode.
- Export endpoints for PDF, Word, Excel, CSV.
- Shareable permalink generation for report payloads.
- Scheduled email delivery foundation using APScheduler.
- Query caching via Flask-Caching (Redis-ready).
- Query timeout guardrail.
- Row-level security by tenant filtering.
- Feature flags for advanced charting and exports.
- GraphQL endpoint for catalog and unified data query.
- React dashboard with interactive chart workspace and mobile-responsive layout.

## Architecture

- backend
  - app/api: REST + GraphQL interfaces.
  - app/data_providers: SMS/NEX/SAP adapters.
  - app/services: metadata registry, KPI filtering, report/export/scheduler services.
  - app/metadata/kpi_registry.json: KPI catalog and entity definitions.
- frontend
  - React + Vite dashboard for login, filters, KPI catalog, charting, templates, sharing, exports.

## Run Locally

### Backend

1. Create and activate a Python virtual environment.
2. Install dependencies:

   pip install -r backend/requirements.txt

3. Start backend:

   python backend/run.py

Backend runs on http://localhost:8000.

### Frontend

1. Install dependencies:

   cd frontend
   npm install

2. Start frontend:

   npm run dev

Frontend runs on http://localhost:5173.

## Test Login Users

- cs_user
- fs_user
- director_user
- tenant2_user

## REST Endpoints

- POST /api/auth/login
- GET /api/kpis/catalog
- GET /api/metadata/registry
- GET /api/data/unified
- POST /api/reports/templates
- GET /api/reports/templates
- POST /api/reports/generate
- POST /api/reports/share
- GET /api/reports/shared/<permalink>
- POST /api/reports/schedules
- POST /api/reports/export/<fmt>
- GET /api/phase2/ai-context

## GraphQL Endpoint

- POST /graphql

Example query:

query {
  kpiCatalog(query: "uptime") {
    code
    name
    unit
  }
}

## Phase 2 AI Contextualization Plan

- Risk profiling service.
- Bad actor detection over maintenance/service patterns.
- Obsolescence alerts from lifecycle metadata.
- Human-in-the-loop checkpoints for recommendation approval.
- Executive summary generator with audience-aware messaging.

## Agile Delivery Plan (4 x 2 Weeks)

- Sprint 1 (Increment 1)
  - Authentication, RBAC, tenant controls.
  - Metadata schema and KPI catalog.
  - Base report generation and template persistence.
  - Core charts and filtering UX.
- Sprint 2
  - Advanced exports and permalink sharing hardening.
  - Scheduling workflows and notification integration.
  - Performance tuning and Redis rollout.
- Sprint 3
  - AI contextualization MVP (risk and anomaly indicators).
  - HITL checkpoints and recommendation review dashboard.
- Sprint 4
  - Executive summary generation.
  - AI explainability, audit logging, and production hardening.
