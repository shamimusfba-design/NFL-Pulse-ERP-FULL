# NFL Pulse ERP v0.4.9 — Interactive Gantt cumulative correction

This package is based on **v0.4.8 cumulative** and keeps the earlier v0.4.x corrections.

## What changed
- True Gantt drag/drop: drop position changes both line and planned date while preserving duration.
- Floating editable job editor stays above the chart; clicking chart blank space closes it.
- Sticky timeline + stable horizontal scrollbar retained.
- Search: type Job/Style/Item and press Enter to jump to the job and open editor.
- Month jump for Sep / Oct / Nov 2026 plus 30/60/90 day timeline.
- Editable line machine count from the Gantt left column, persisted through Masters API.
- Planner-editable SMV, manpower, efficiency %, achievement %, job machine requirement and working hours.
- Daily target, required days and finish date recalculate automatically from SMV × manpower × efficiency × working hours.
- IE values remain the preferred source; Planner can fill/override missing values without blocking planning.
- Floor overload detection paints job bars red with warning.
- Plan / Actual / Plan & Actual selector. Actual production fills the planned job bar proportionally in green.
- Dense Sep–Nov 2026 reference dataset included: **1,251 rows** from the provided T&A file. Missing IE/capacity values are marked as reference-derived.

## Load the Sep–Nov Gantt reference dataset
From `apps/api` after the normal database seed/migration:

`npm run prisma:gantt-seed`

The loader is non-destructive: it does not clear existing orders. Existing matching jobs/styles are enriched; missing jobs/styles are created and tagged with batch `GANTT-SEP-OCT-NOV-2026-V1`.

## Data counts in the included reference file
- September: 375 primary-month rows
- October: 331 primary-month rows
- November: 545 primary-month rows
- Total: 1,251 rows

The provided real Buyer / Job / Style / Qty / dates / line fields are preserved where available. Missing SMV, manpower, efficiency, machine and some actual values are derived only to make the Gantt fully populated for planning review, and are marked accordingly for later IE confirmation.
