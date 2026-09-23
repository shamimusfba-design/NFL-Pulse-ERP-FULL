# Canonical Requirements (latest corrections win)

## Global UX
- Role-based home pages.
- `My Pending Tasks` is central.
- One-time entry reused downstream.
- Dependency-aware workflow.
- Exception-based management.
- Common actions should be 2–3 clicks when practical.
- Inline editing, smart defaults, global search, Job Timeline.
- Restrained status colors: green done/ready, amber pending/risk, red critical/overdue, grey not started.
- Only useful notifications: assignment, overdue, dependency block, critical exception.
- Escalation: responsible person → section head → management.
- Floor forms mobile/PWA friendly, offline tolerant, draft autosave target.
- Every critical change audited.
- Approval only where business-critical.
- Planning supports scenario mode.
- Tables use server-side filters, virtual scrolling, saved views.
- KPI/chart drill-down.

## Factory / line structure
Factory → Section/Floor → Master Line → Split/Sub-line → Shift → Machine Pool.
No hard-coded lines. J–R was an old floor example only and must never become factory-wide logic.
Line capability can include preferred product/style family, machine count range, machine types, skills/capabilities and configurable constraints.
Machine count is feasibility, not the sole capacity formula.

## Order Entry
- Buyer PO does not contain internal Job number.
- One internal Job/Order may contain multiple Styles.
- One Style may contain one or multiple POs.
- Manual Style entry: color-wise + size-wise quantity and Style Total.
- Manual PO entry: PO Number + PO Total Qty + CCD only.
- Do not force manual PO-to-color/size allocation.
- Imported PO sheet may retain richer detail separately.
- Both Manual and Auto Import feed the same model.
- Buyer-specific import mappings are versioned and previewed before confirm.
- Duplicate prevention/update-merge required.
- Job/Order ID is internal/system generated.

## IE / T&A
- Confirmed Job creates IE data-entry task.
- Planning sees IE Pending / Not Planning Ready until required IE data is complete.
- Use actual IE Bulletin basis; do not derive sewing capacity from machine count alone.
- T&A auto-generates from configurable template/rules.
- Authorized Planning can edit dates/lead times/dependencies/owners with audit.

## Planning / Gantt
- Working hours: 8H/10H/11H/13H/Custom, default plan 8H.
- If shipment cannot be met, optimize within 8H first, then simulate minimum additional hours.
- Never silently apply extra hours.
- Full-screen Gantt; rows are lines; jobs are draggable bars.
- Product type shown by icon/tag, not status color.
- Floor Planner change does not silently overwrite Central Gantt.
- Floor move/sequence change becomes Change Request with Before/After.
- Central Planner accepts/rejects; accepted request creates revised plan version and recalculates downstream.
- If shipment risk appears, affected plan becomes red and shows required additional hours.
- Resolution: working hours, split quantity, move whole job, resequence.
- Preserve Baseline → Floor Request → Revised V2/V3 → Actual.

## Capacity Balancing
Monthly slots are exactly: 1–10, 11–20, 21–month end.
Weekly view is only exception/recovery drill-down.
Track available, required, booked %, in-house, overload, outsource, actual, released excess, remaining balance, load %.

## Cutting / Input
- Detailed Cutting Production Report is color-wise.
- Main Cutting Follow-up is Job-level total.
- Only Present Status is manually maintained in the Job-level follow-up; other fields auto-populate/aggregate.
- Job click opens color-wise details.
- `Cuttable` answers what CAN be cut now.
- Input Management answers what SHOULD be cut first among cuttable jobs.
- Readiness gate uses actual confirmed fields such as fabric, file/readiness, PP/PPM, etc.
- Prioritization uses line input shortage, sewing start/due, Ready-for-Input need, CCD/shipment urgency.
- Input Coverage Days = Ready for Input Qty / Line Daily Input Requirement.
- Configurable statuses: No Input=0, Critical<1, Low=1–2, Safe=2–4, Excess WIP>4.

## Sewing line follow-up
Preserve all actual report fields. This is line-wise input + shipment control, not merely a cutting report.
PP Sample Status auto-flows from Sample.
Trims Status auto-flows from Trims Store and shows due item names or `OK` when all in-house.
Print/Embroidery status must not overwrite main Present Status.

## Quality
Use the actual quality report set as source of truth.
Main Quality Dashboard is ONE PAGE and prioritizes live floor/line quality.
DHU is numeric (example 7.6), not written with a `%` sign.
OQL is shown as `%`.
Primary KPI candidates include Overall DHU, OQL %, Internal Final Pass Rate, Buyer Final Pass Rate, Checked Qty, Total Defects, Defective Pieces, Highest DHU Line, Top Defect.
Charts include line-wise DHU, hourly DHU trend, OQL trend, floor comparison, defect Pareto/top defects, and agreed supporting charts.
Job-wise quality data is still entered/stored/searchable but does not clutter the main live dashboard.
QMS Officer owns inspection data entry according to inspection schedule.
Internal Final and Buyer Final are separate; internal/buyer OQL and pass rates must not be mixed.

## Floor / TV Display
Separate display-only live dashboard for Production + Quality.
Authorized user selects widgets/charts and assigns saved display views to a specific floor/TV.
Full-screen, auto-refresh and optional rotation/slideshow.
Candidate widgets: hourly production vs target, achievement %, efficiency, line-wise DHU, top defects, Pareto, OQL/quality indicators, critical line alerts.

## Buyer PO Import — locked requirement
- Buyer and Brand are one field/entity in Order Entry (e.g. ONLY, NAME IT, ONLY & SONS, OVS, UTG).
- Factory is not shown in Order Entry because all customer orders are received in NFL's name. Any later NFL/NCL production allocation belongs to Planning/Production Allocation.
- Supported buyer PDF upload must auto-populate Style, PO/order reference, PO qty, CCD or buyer-native shipment date, Color x Size and Style total.
- Need Review may flag uncertainty, but parsed data stays populated; do not force duplicate manual entry.
- Manual Order Entry remains simple and does not require manual PO-to-color/size allocation.
- Rich buyer data parsed from the source PDF is retained in metadata/details for downstream use.
- Parsers are buyer-specific and versioned. Current families: BESTSELLER (ONLY/NAME IT/ONLY & SONS), OVS, UTG draft. More buyers will be added from actual source sheets.
