# Yarn Store, Knitting and Knitting Quality API

NestJS + Prisma, same auth as the rest of the API (`/api`, Bearer token). Every change writes `AuditLog`; hand-overs create `Task`s for the next role.

## Status
| Part | State |
|---|---|
| Business rules `src/yarn-knit/yk.rules.ts` | `npm run test:yk` — 7 tests pass |
| Controllers (yarn, knitting, quality) | Type-checked. **Run against PostgreSQL 16** with all 4 migrations: `npm run test:yk:db` — 2 end-to-end tests pass |
| Migration `20261030090000_yarn_knitting` | Applied on PostgreSQL 16 together with the 3 earlier migrations |
| Real data | Yarn Stock Summary (80 MOQ counts, 1,076 lots → 990 with stock) and Machine-wise Knitting Program (36 machines, 268 open lines) imported through the API |
| Frontend page | Still uses browser storage; switching it to this API is the next step |

## Roles (added to the seed)
`KNIT_PLANNER`, `KNIT_REPORTER`, `KNIT_INCHARGE`, `KNIT_QUALITY` (+ users knitplan@, knitreport@, knitincharge@, knitqc@nfl.local). Existing: `YARN_STORE`, `PROCUREMENT`, `PLANNING` (Central Planning), merchandising roles, `KNITTING` (acts as reporter), `QUALITY`.

## Yarn — `/api/yarn`
| Method | Path | Who | Rule |
|---|---|---|---|
| GET | `/counts` | any | MOQ vs stock: stock, MOQ, pipeline, overdue pipeline, open knitting need, urgent need, status (PIPELINE_LOW / BELOW_MOQ_COVERED / OK) |
| GET | `/lots?withStock=1` | any | Lot balance from the ledger, days without issue, dead-stock class |
| PUT | `/lots/:id/dead-action` · PATCH `/lots/:id/qc` | store | |
| GET / POST | `/requisitions` | merchandiser (style required → PENDING_STORE) or store (MOQ → WITH_PURCHASE) | |
| PUT · POST `…/approve` · POST `…/return` | `/requisitions/:id` | store | only while PENDING_STORE |
| POST | `/purchase-orders` | purchase | from an approved requisition, or MOQ order without requisition |
| GET · PATCH | `/pipeline` · `/pipeline/:id` | any · purchase | status, ETA; a partly received line cannot be cancelled |
| POST | `/receipts` (GRN) | store | against a purchase line, max 5% over balance; lot + ledger + pipeline in one transaction; `clientRef` stops double posting |
| POST | `/issues` | store | lot balance and QC checked inside a **serializable** transaction (two people cannot issue the same kg) |
| POST | `/returns` | store | party cannot return more than it was issued from that lot |
| POST | `/import` | admin | opening stock and MOQ from the Excel files |

## Knitting — `/api/knitting`
| Method | Path | Who |
|---|---|---|
| GET · PUT | `/machines` · `/loss-rules` | any · admin / incharge |
| POST · GET | `/jobs` | Central Planning (approved fabric order sheet) · any |
| POST | `/jobs/:id/plan` | planner: in-house (machine, not-before date) or outsource per line; knitting kg = finish ÷ (1 − loss %) |
| GET | `/plan` | machine queues with start / finish / position / late vs T&A (Gantt and list plan) |
| POST | `/plan/move` | planner: `{lineId, machineId, date \| position}` — drag & drop; the whole machine queue is rewritten in one transaction |
| POST | `/lines/:id/hold` · `/release` | planner |
| PUT · POST | `/lines/:id/report` · `/jobs/:id/report-complete` | reporter (count, brand, lot required) |
| POST · PUT | `/jobs/:id/approve-qty` · `/lines/:id/outside` · `/factory-bookings` | production incharge (final kg ≥ finish, ≤ 150%) |
| POST | `/production` | reporter: max 10% over balance; delivered ≤ knitted |
| POST | `/lines/:id/remarks` | any department |
| GET | `/lines` · `/day-plan?date` · `/capacity?date` | execution report, day plan from the queues, booked vs loaded |
| POST | `/import` | admin: machine-wise knitting program |

## Knitting quality — `/api/knitting/quality`
GET `/inspections`, GET `/summary` (filters: buyer, factory, fabricType, defect, decision, from, to), GET `/pending`, POST `/inspections` (KNIT_QUALITY; HOLD / REJECT also adds a remark to the line).

## Loading your Excel data
```bash
python scripts/yarn-knitting/build_import.py --yarn "Yarn Stock Summary.xlsx" --program "Machine wise Knitting Program -2026.xlsx" --as-of 2026-09-28
# then, as admin:  POST /api/yarn/import  (yarn-import.json)   POST /api/knitting/import  (knitting-import.json)
```
Machines used in the program but missing from the Summary sheet (M-35, M-36 today) are added with the average capacity of the same dia & gauge; the script prints them so you can correct the capacity.

## Running the tests on your PC
```bash
cd apps/api
npx prisma migrate deploy            # on a TEST database
npm run test:yk
DATABASE_URL=postgresql://…/nos_test npm run test:yk:db
```
