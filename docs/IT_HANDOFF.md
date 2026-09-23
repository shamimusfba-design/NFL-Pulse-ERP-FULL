# NFL Pulse ERP — IT Handoff Guide

## Purpose
This repository is the canonical technical baseline for the NFL Pulse ERP project. It combines the currently runnable foundation with the synchronized full factory scope and implementation contracts agreed during design discussions.

## Important honesty about status
This is **not yet a production-complete ERP**. The runnable foundation currently covers authentication, dynamic factory/floor/line masters, buyer master, manual order entry, internal Job generation, task engine foundation, and audit logging. The remaining factory modules are fully enumerated in the canonical scope and represented in the module registry / database blueprint so implementation can proceed without losing requirements.

## Recommended IT review order
1. `PROJECT_SCOPE.md`
2. `docs/CANONICAL_REQUIREMENTS.md`
3. `docs/MODULE_MATRIX.md`
4. `docs/WORKFLOW_MAP.md`
5. `docs/REPORT_SOURCE_MAP.md`
6. `docs/DATABASE_BLUEPRINT.prisma`
7. `apps/api/prisma/schema.prisma` (currently runnable foundation schema)
8. `apps/api/src/domain/domain-registry.ts`
9. `docs/IMPLEMENTATION_ROADMAP.md`
10. `README.md`

## Architecture
- Frontend: Next.js + React + TypeScript
- UI: Tailwind + shadcn/ui planned; current foundation uses light custom CSS
- Tables: TanStack Table planned
- Gantt / drag-drop: dnd-kit planned
- Charts: ECharts/Recharts planned
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Cache: Redis
- Queue: BullMQ planned
- Realtime: Socket.IO/WebSockets planned
- Floor/mobile: PWA first
- Files: S3-compatible later
- Auth: JWT + refresh token
- Deployment: Docker + Nginx + private GitHub

## Core architecture rules
- One connected codebase.
- One central Job/Style source of truth.
- One-time entry; downstream modules reuse data.
- T&A is the master timeline.
- Planned vs Actual must remain separate.
- All line/floor/factory structures are dynamic, never hard-coded.
- Latest user correction overrides older reports/assumptions.
- Existing factory reports are input/output contracts, not discarded historical files.
- Every workflow task has owner, due date, status, aging and audit history.
