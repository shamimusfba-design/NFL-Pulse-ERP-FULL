# Dyeing & Finishing desk (Finish Fabric Plan & Execution)

Page: `/dyeing/index.html` (old links `/modules/dyeing` and `/dyeing` redirect here).
API: NestJS `/api/dyeing` (login required). The web app forwards `/api/dyeing/*` to Nest (`NEST_API_URL`, default `http://127.0.0.1:4000/api`) — see `NEST_PREFIXES` in `apps/web/app/api/[...path]/route.ts`.

## Sections of the page
| Section | Who works here |
|---|---|
| Finish Fabric Plan & Execution | everyone: cards, charts, filters, colour-wise / job-wise table (job separator line), daily entries |
| Dyeing Planning | Dyeing Planner plans each colour in-house (NFL → machine loading) or subcontract (work order → Planning & Control approves) |
| Machine Loading Plan | Dyeing Planner: suggested batches (same colour combined, safe load %, shade order White → Black), approve, today's plan + batch cards |
| Quality | Dyeing Lab (lab dip / shade, bulk RFT), Testing Lab, Finishing QC (final inspection), Merchandiser / Management (conditional release) |

## Roles ("Logged in as" shows only the user's own desk roles; ADMIN sees all)
| Desk role | ERP role code |
|---|---|
| Dyeing Planner | `DYEING_PLANNER` (new) |
| Greige Store | `GREIGE_STORE` |
| Dyeing Production | `DYEING` |
| Planning & Control | `PLANNING` |
| Dyeing Lab | `DYEING_LAB` (new) |
| Testing Lab | `LAB` |
| Finishing QC | `FABRIC_FINISHING` |
| Merchandiser | `MERCH_SAMPLE`, `MERCH_BULK`, `MERCH_BOTH`, `MERCH_HEAD` |
| Management | `MANAGEMENT` (view; may write conditional release) |

Seed users (password `ChangeMe123!`): `dyeplan@`, `dyelab@`, `greige@`, `fabricqc@`, `management@` (new), plus existing `dyeing@`, `lab@`, `planning@`, `merch@` — all `@nfl.local`.

## Endpoints
| Method | Path | What it does |
|---|---|---|
| GET | `/dyeing/bootstrap` | user + desk roles, report date, machines, every Finish Fabric line, every working slice with its version, lab dips approved at SMS stage (`job|colour → Approved`) |
| GET | `/dyeing/state` | working slices only |
| PUT | `/dyeing/state` | `{ slices: { name: { version, data } } }` — only changed slices. Checked by `dyeing.rules.ts`; saved with compare-and-set on the version (409 if someone saved first) and written to `DyeingChange` |
| GET | `/dyeing/changes?limit=` | change log (who changed which slice, when) |

Slices: `ent` (daily entries per line), `hold`, `plan`, `edit`, `wos`, `woSeq`, `rowWo`, `labdip`, `tests`, `fqc`, `cond`, `rft`, `batches`, `bcSeq`, `shadeOv`, `set`. Line-keyed slices use `DyeingLine.id`.

## Rules enforced on the server (`apps/api/src/dyeing/dyeing.rules.ts`)
- Entries belong to their section: greige receive / issue / subcontract / heat set → Greige Store; dyeing, subcontract receive, process send / receive, offer for QC, delivery → Dyeing Production (Dyeing Planner may enter any). Qty > 0, date required, factory for sends.
- **Loading gate:** a batch may hold a colour only when its lab dip is approved (dyeing lab, or SMS-stage approval from merchandising).
- **Delivery gate:** delivery to the finished fabric store needs testing lab Pass **and** final inspection Pass, or a written conditional release.
- Batch kg ≤ machine capacity × safe load % (default 85). Issued batch cards cannot be changed or removed.
- Work orders: Dyeing Planner creates; Planning & Control (or Dyeing Planner) approves; approved work orders cannot be changed or cancelled. In-house = NFL; subcontract needs a factory.
- Tests / final inspection: not-Pass results need findings. Bulk RFT checks can only be added.

## Data
- `DyeingLine`: one row per job-colour line. `data` keeps the report columns (compact keys: `b` buyer, `j` job, `st` style, `c` colour, `f` fabric, `rb/rl/rs/rt` required body / L rib / S.jersey / total, `gb/gl/gs` greige received, `df` dyeing factory, `bn` batch, `dd` dyeing date, `sd/sq/rd` subcontract send date / kg / receive date, `db/dl/ds/dt` dyed, `aop/peach/brush/shear/singe/fin` = [factory, send date, raw, send kg, receive date, raw, receive kg, balance], `tps/tpe` T&A dyeing delivery, `as/ae` actual delivery, `vb/vl/vs/vt` delivered, `br` brand, `mr` merchandiser, `rm` remarks, `sl` slot, `m` month; items in yds/pcs: `it/iq/iu`).
- Loaded from the 29.09.26 report: `npm run prisma:dyeing-seed -w @nfl/api` (5,581 lines; safe to run again).
- `DyeingStateSlice`, `DyeingChange`: working records and change log.

## Setup on the VPS
1. `npx prisma migrate deploy` (adds migration `20261031090000_dyeing_workspace`)
2. `npm run prisma:seed -w @nfl/api` (adds the new roles and users)
3. `npm run prisma:dyeing-seed -w @nfl/api`
4. Web: set `NEST_API_URL` if the API is not on `127.0.0.1:4000`.

## Tests
- `npm run test:dyeing -w @nfl/api` — 6 rule tests.
- `npm run test:dyeing:db -w @nfl/api` with `DATABASE_URL` — 2 end-to-end tests on PostgreSQL (seed 5,581 lines; work order → approval → conflict → lab dip gate → safe load → issued card lock → delivery gate).
- Verified 29 Oct 2026 in a browser against the compiled API on PostgreSQL 16 with real logins: planner plan, dyeing lab approvals, batch suggestion + approval + batch cards saved; wrong-role change refused (400); stale version refused (409).

## Not done yet
- Machine list is fixed in code (from DYEING PROFILE.xlsx); move it to the `DyeingMachine` table with an edit screen.
- A new Finish Fabric Excel report is loaded with the seed script only; an upload screen is next.
- Slices are stored as JSON documents with server checks; moving entries / work orders / batches into their own tables is the next step when reporting needs SQL queries.
- Shipment week filter waits for PO shipment dates to be linked to the lines.
