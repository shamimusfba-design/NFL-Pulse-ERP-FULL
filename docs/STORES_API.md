# Greige Fabric Store and Finished Fabric Store

Two separate desks (no link between them). Pages: `/greige-store/index.html`, `/finished-fabric/index.html` (old `/modules/...` links redirect).
API: NestJS `/api/stores/:desk` with `desk` = `greige` | `finished` (login required); the web app forwards `stores/*` and `reuse/*` to Nest.

## Flow
**Greige** — Knitting posts a delivery challan → *Receive from Knitting* pending → Greige Store checks the challan, weighs, accepts (own NFL knitting → stock; subcontract → QC hold) → Knit Quality 4-point inspection (Pass → available, Fail → rejected) → Dyeing Planner sends a **delivery request** (in-house batch card: full batch kg; subcontract work order: partial deliveries until the balance is done or closed) → store delivers against it → greige left after the job's dyeing → *Reuse Stock* (Knitting alerts show pending knitting that the reuse stock can replace).
**Finished** — Dyeing posts a delivery challan → *Receive from Dyeing* pending → store weighs body / L rib / S.jersey and accepts → issue to cutting (lot no) / returns from cutting → Cutting marks the job "cutting OK" → after the shipment date the store sends what is left to *Reuse Fabric*.
Fabric sent to reuse on either page is written to `ReuseStock`, so fabric order sheet suggestions (FABRIC_REUSE_API.md) see it.

## Roles ("Logged in as" lists only the user's own desk roles; ADMIN sees all)
| Greige desk | ERP role | Finished desk | ERP role |
|---|---|---|---|
| Greige Store | GREIGE_STORE | Finished Fabric Store | FINISHED_FABRIC_STORE |
| Knitting | KNITTING, KNIT_PLANNER, KNIT_REPORTER, KNIT_INCHARGE | Dyeing Production | DYEING |
| Knit Quality | KNIT_QUALITY | Cutting | CUTTING |
| Dyeing Planner | DYEING_PLANNER | Planning & Control | PLANNING |
| Planning & Control | PLANNING | Merchandiser | MERCH_* |
| Merchandiser / Management | MERCH_* / MANAGEMENT | Management | MANAGEMENT |

## Endpoints
| Method | Path | What |
|---|---|---|
| GET | `/:desk/bootstrap` | user + desk roles, report lines (greige: G, A; finished: F, R), slices with versions |
| GET | `/:desk/state` | slices only |
| PUT | `/:desk/state` | save changed slices — checked by `stores.rules.ts`, compare-and-set on version (409) |
| POST | `/:desk/demo` | store role loads the labelled demo records once (every record must be `demo: true`); "Clear demo" removes them |
| GET | `/:desk/changes` | change log |

Rules enforced on the server: challans posted only by the delivering section and start Pending; only the store accepts / rejects (weighed kg, reason for reject); subcontract greige cannot skip QC and own NFL greige needs none; only Knit Quality records the inspection (defects needed for a fail); deliveries only against a request and never more than the greige available (QC-passed, not in reuse) or the request; cutting issue never more than stock; reuse send needs cutting OK and the shipment date passed; reservations never more than the reuse stock; delivered records cannot be edited or deleted (demo records excepted). JSON is compared key-order-free (PostgreSQL JSONB reorders keys).

## Data
- `StoreLine`, `StoreSlice`, `StoreChange`, `ReuseStock.ref` (migration `20261102090000_store_desks`).
- `npm run prisma:stores-seed -w @nfl/api` — greige 8,682 lines + 276 advance/excess rows (28.09.26 report); finished 5,190 lines (29.09.26 dyeing report) + 688 inventory Jan-26 leftovers. Lines keep their report position (`sourceRow`), which the pages use as the line key.

## Filters (all pages)
Every filter is an empty type-ahead box: typing suggests matching values, those starting with the text first ("b" → buyers starting with b, "bl" → Black). Table headers have an Excel-style ▾ filter (search + tick values) instead of a blank filter row. The dyeing desk uses the same two filters.

## Tests
`npm run test:stores -w @nfl/api` (4) · `npm run test:stores:db -w @nfl/api` with DATABASE_URL (2: full greige and finished flows, demo once, reuse → ReuseStock).
