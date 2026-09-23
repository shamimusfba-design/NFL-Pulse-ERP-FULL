# NFL Pulse ERP — Full Consolidated Pilot

One connected garment-factory ERP codebase for Northern Fashion Limited / Northern Clothing Limited. This build consolidates the requirements and working features discussed so far, including role-based workspaces, confirmed Order Entry, Merchandising Follow-up, CAD consumption, Industrial Production Engineering, Central Planning T&A, capacity heatmaps, Sewing Gantt review/approval, removable 50-job demo data, Job 360, quality/test history and lead-time history.

## Stack
- Next.js + React + TypeScript
- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis / Docker foundation
- JWT auth + role/permission foundation

## Core working flow in this build

**Confirmed Order → CAD + IE + T&A pending tasks → CAD consumption / IE bulletin → Central Planning generates T&A draft → capacity heatmap review → T&A approve/release → approved dates flow to Merchandising → Sewing Gantt draft auto-loads → Central Planning reviews/adjusts → official Gantt approval.**

The system also includes role-aware module navigation, own-job Merchandising edit restrictions, numeric running Job No / repeat-lot handling, Color × Size manual entry, buyer-specific PO import foundation, Order Qty revision history with CAD re-check, compact Merchandising action checkpoints, and connected demo section data from Yarn through Shipment.

## Windows start

Docker Desktop must show **Engine running**. In the project folder:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

If installing the project for the first time, see `START_HERE.md`. If replacing the earlier patched project, see `APPLY_FULL_CONSOLIDATED.md`.

## Main development logins

Password for all development users: `ChangeMe123!`

- Admin: `admin@nfl.local`
- Central Planning: `planning@nfl.local`
- IE: `ie@nfl.local`
- CAD: `cad@nfl.local`
- Quality: `quality@nfl.local`
- Bulk Merchandising: `merch@nfl.local`

Additional section users are seeded; see `APPLY_FULL_CONSOLIDATED.md`.

## Demo data

Admin can load/reset 50 connected demo jobs and delete them later without targeting real jobs. Demo jobs use `990001`–`990050` so they do not consume the live running Job sequence.

## Current implementation boundary

This is the consolidated **pilot/development build for the scope agreed so far**, not a claim that every factory transaction screen is production-certified. The planning/T&A/Gantt workflow requested in the current implementation round is coded. Many downstream section screens currently use the connected demo/read model and are ready to be replaced progressively with the exact factory entry forms and reports. Exact company print layouts for Fabric Order Sheet, T&A and Work Order will be finalized from the Excel templates supplied by the factory.
