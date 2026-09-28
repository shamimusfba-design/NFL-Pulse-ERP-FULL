# NFL Pulse ERP v0.4.39 — Factory-Standardized Cumulative Flow

This release is cumulative from v0.4.38 and keeps existing NFL/NCL data intact.

## Corrections retained
- Dashboard uses lightweight order summary instead of loading every nested order record.
- IE Target Giving keeps General Line regular hours at 8 and NFL shifting lines at 16; overtime remains separate and is included in total working hours.
- Today-active Gantt jobs use normalized line codes.
- Yarn Store / Knitting / Greige Store / Fabric Dyeing retain the v0.4.37 ledger, roll, batch and reprocess traceability controls.
- Yarn Dyeing and Fabric Dyeing remain separate.
- Testing Lab remains separate from Dyeing.

## v0.4.39 additions
- Yarn/Fabric operational screens now keep the existing connected factory/demo running position visible instead of appearing empty when normalized transaction tables have not yet been populated.
- Yarn/Fabric list APIs are paginated; CAD requirement sync processes orders in batches rather than using a fixed business-record cap.
- Yarn Procurement supports partial receipt. Only received quantity moves into in-house quantity; the unreceived balance remains pipeline.
- Fabric Finishing is operational from Dyeing finished-fabric handoff.
- Finishing completion creates finished-fabric stock through the immutable material ledger.
- Finished Fabric Store is operational with ledger-controlled stock.
- Cutting can issue finished fabric from stock with server-side no-negative-stock protection and a cutting issue register.
- Additive Prisma migration only; existing business tables are not dropped.

## Important scope note
The exact company Fabric Order Sheet / T&A / Work Order Excel print-cell mapping is still not claimed as complete unless the original factory Excel templates are present in the repository or re-supplied. The release uses the agreed factory process and existing source fields and does not invent a replacement workflow.

## Data scale
Job/order quantities are not capped at 500. Pagination limits are view/query page sizes only and do not limit business quantity or total record count.
