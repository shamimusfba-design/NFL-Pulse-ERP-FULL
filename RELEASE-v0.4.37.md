# NFL Pulse ERP v0.4.37 — Cumulative Material Flow

This cumulative build adds Yarn Store, Knitting, Greige Store and Dyeing on top of the current ERP source.

Key controls:
- immutable material ledger plus derived stock balance
- idempotent material movements and no-negative-stock validation
- job / style / lot / roll / dye-batch traceability
- knitting output auto-creates greige rolls and stock
- selected greige rolls are reserved once for dyeing, preventing double issue
- dye completion creates finished-fabric handoff and process-loss history
- reprocess creates a linked child batch; original batch history is retained
- IE target model separates regular hours, OT hours, regular target and OT target
- NFL general lines use 8 regular hours; shifting lines use 16 regular hours; OT remains separate
- Gantt planning now allows OT on shifting lines
- dashboard uses a lightweight aggregate order summary instead of loading every nested order breakdown
- Yarn Store / Knitting / Greige Store / Dyeing are marked Working
- responsive operational UI added for all four workspaces

Database migration is additive and does not delete existing NFL/NCL business data.

Branch: release/v0.4.37-cumulative-material-flow
