# Merchandising API (Bulk + Sample)

Backend for the Bulk and Sample merchandising pages. NestJS + Prisma, same auth as the rest of the API (`Authorization: Bearer <token>`, global prefix `/api`).

## Status
| Part | State |
|---|---|
| Business rules (`src/merch/merch.rules.ts`) | Tested: `npm run test:merch` (cost sheet = company sheet, FOB 3.43; workflow order; TNA bands; checklist; quota) |
| Bulk workflow controller | Tested against an in-memory stand-in (full CAD → PP meeting flow, roles, tasks). **Not yet run on PostgreSQL.** |
| Sample, cost controllers | Type-checked only. **Not yet run.** |
| Migration `20261029090000_merch_api` | Schema validated with Prisma's validator. **Not yet applied to a database.** |
| Frontend pages (`apps/web/public/merchandising`) | Still use browser storage. Wiring them to this API is the next step. |

## Bulk merchandising — `/api/merch/bulk`
Workflow steps (stored in `MerchStep`): ORDER → CAD + IE → THREAD → FABRIC_SHEET + TNA → FILE_HANDOVER → PRE_PRODUCTION → SIZE_SET → PP_MEETING. Each step change writes `AuditLog`, opens the next steps, creates `Task`s for the owner role and completes the finished step's task.

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/jobs?q&buyer&stage&month&page` | any | Merchandisers see own jobs; head / admin / other departments see all |
| GET | `/jobs/:styleId` | any | Opens the workflow on first view by a merchandiser |
| POST | `/jobs/:styleId/cad` | CAD | `{parts:[{part,fabric,gsm,comp,consKgDz}]}` → finish fabric kg |
| POST | `/jobs/:styleId/ie` | IE | `{smv,operations,machines}` |
| POST | `/jobs/:styleId/thread` | IE | `{lines:[{name,metersPerPc}]}` |
| POST | `/jobs/:styleId/fabric-sheet` | job merchandiser | `{colorCodes:{colour:code},lossPct,instructions}` → grey kg |
| POST | `/jobs/:styleId/fabric-sheet/approve` | PLANNING | approved on its own, before the TNA if needed |
| POST | `/jobs/:styleId/tna/send` | job merchandiser | |
| POST | `/jobs/:styleId/tna/generate` | PLANNING | company standard bands |
| PUT | `/jobs/:styleId/tna` | PLANNING | `{rows}` edit dates |
| POST | `/jobs/:styleId/tna/approve` | PLANNING | |
| PUT | `/jobs/:styleId/descriptions` | PLANNING | item and print/emb description |
| POST | `/jobs/:styleId/file-handover` | job merchandiser | `{departments}` |
| POST | `/jobs/:styleId/pre-production` | PLANNING | `{done:{dept:true}}`, done when all handed-over areas finish |
| POST | `/jobs/:styleId/size-set` | SAMPLE (technical) | makes the PP meeting due |
| POST | `/jobs/:styleId/pp-meeting` | job merchandiser | `{date,time,note}` |
| PATCH | `/jobs/:styleId/fields` | job merchandiser | printEmbType, fob, packingListStatus, imageUrl |
| PATCH | `/jobs/:styleId/lab-dips/:color` | job merchandiser | rounds count up on each SUBMITTED |
| PUT | `/jobs/:styleId/checklist` | job merchandiser | trims & accessories checklist lines; required qty calculated |
| POST | `/jobs/:styleId/checklist/ready` | job merchandiser | |
| POST | `/jobs/:styleId/checklist/order-all` | job merchandiser | |
| PATCH | `/checklist-lines/:lineId/order` | job merchandiser | ORDERED / NOT_ORDERED |
| PATCH | `/checklist-lines/:lineId/receive` | TRIMS_STORE | received qty → in-house status |
| GET | `/order-value?month&buyer&merchandiserId` | any | totals, by month / merchandiser / buyer |

## Sample merchandising — `/api/merch/sample`
| Method | Path | Role |
|---|---|---|
| GET | `/sheets?status&buyer&q` | any (merchandisers see own) |
| POST | `/sheets` | MERCH_SAMPLE / BOTH / HEAD — quota check, `overQuota:true` to send anyway; tasks: Sample TNA (SAMPLE), lab dip, trims, and costing + yarn for SMS |
| PUT | `/sheets/:id` | owner — edit and resend a RETURNED sheet |
| POST | `/sheets/:id/tna` | SAMPLE — `{activities:{Knitting,Dyeing,AOP,Cutting,Print,Sewing:{s,e}},plannedDelivery}` |
| POST | `/sheets/:id/return` | SAMPLE — `{reason}` |
| PATCH | `/sheets/:id/follow` | owner — merchStatus, labDipStatus, trimsStatus |
| GET / PUT | `/quota` | read: any · write: MERCH_HEAD |
| POST / GET | `/yarn-requisitions` | create: sample merchandisers → task for PROCUREMENT |
| PATCH | `/yarn-requisitions/:id/status` | PROCUREMENT |

## Cost sheet — `/api/merch/cost`
| Method | Path | Role |
|---|---|---|
| GET / PUT | `/rates` | read: any · write: ADMIN (starts with the NMFLANA sheet rates) |
| GET / PUT | `/sheets/:entityType/:entityId` | entityType `STYLE` or `SAMPLE_SHEET`; FOB is always calculated on the server; `submit:true` marks DONE |

## Assumptions to confirm
1. Size set is marked by the `SAMPLE` role (no TECHNICAL role exists yet).
2. Sample quota line = sub-brand (or buyer when no sub-brand).
3. Sample planning = `SAMPLE` role (Central Sample Department).
4. Offer / Development / Proto count against the O/D quota; SMS against the SMS quota.

## How to run
```bash
cd apps/api
npx prisma migrate deploy        # applies 20261029090000_merch_api
npm run test:merch               # rule + workflow tests
npm run start:dev
```
