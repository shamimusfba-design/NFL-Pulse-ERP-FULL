# NFL Pulse ERP v0.4.11 — Planner Intelligence Gantt cumulative

Base: v0.4.10 real drag/live date hotfix.

This build keeps all prior cumulative corrections and adds the Planner Intelligence / Control Tower scope.

## Added in v0.4.11
- Live pointer drag/drop retained; locked plans cannot be dragged.
- Smart editable popup with Pre-Start, Start, End, SMV, Manpower, Efficiency, Learning Efficiency, Achievement, Working Hours, OT Hours, Machine Need, Changeover, Actual Qty, Calendar and status.
- Auto target / remaining qty / required days / completion forecast.
- Sunday-aware working calendar.
- Readiness % from fabric/cutting/print/embroidery/trims/IE dependencies.
- Bottleneck reason chips.
- Smart line recommendations using available line machine capacity and conflict days.
- Live what-if simulation.
- Auto re-plan suggestion to best-fit line.
- Floor capacity heatmap and 30/60/90-day overview strip.
- Baseline vs revised plan overlay.
- Plan freeze / unlock control.
- Audit history panel and Undo Last Saved Change API.
- Split / multi-line allocation persisted in ganttPlan and rendered on secondary line.
- Plan / Actual progress based on actual quantity.
- IE pending status.
- Overtime / style changeover / learning-efficiency calculation.
- CSV export and print/snapshot action.
- Expanded KPIs: overload, IE pending, average readiness, actual completion.
- Existing search jump, month jump, sticky header, horizontal scroll, editable line machines, approval flow retained.

## Database
No Prisma schema migration is required. Extended Gantt attributes continue to live in Style.sourceMetadata.ganttPlan JSON.

## Existing Sept–Nov data
The prior `npm run prisma:gantt-seed` mechanism remains included.
