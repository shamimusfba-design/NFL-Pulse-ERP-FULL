NFL Pulse ERP v0.4.35 — PLANNING SCALE & LINE CLEANUP CUMULATIVE

UPGRADE
- This package is cumulative. If your installed working version is v0.4.28, you can replace with this v0.4.35 package directly.
- You do NOT need to install v0.4.29, v0.4.30, v0.4.31 or v0.4.32 separately.
- Keep your existing apps/api/.env and database. START-NFL-PULSE.bat runs Prisma db push and keeps existing data.


GLOBAL DESIGN SYSTEM v1
- Inter/system sans-serif; body 14px, table 13–14px, labels 13px, section headings 16–18px, page titles 22–24px.
- Primary #2563EB; Success #16A34A; Warning #D97706; Danger #DC2626; Info #0284C7; Draft neutral gray.
- Text #111827 / #4B5563 / #6B7280; page #F8FAFC; card #FFFFFF; border #D1D5DB.
- Standard buttons, tables, forms, status colors, focus/validation, spacing and responsive behavior across modules.
- Desktop full-density, laptop compact, phone touch-friendly; wide data scrolls instead of shrinking fonts.
- Same action uses the same professional wording and semantic color.

PLANNING SCALE / CAPACITY FIXES
- No fixed business Job cap in Capacity Heatmap, T&A queue/generation, Sewing Gantt, Maintenance requirement or IE planning feeds.
- Capacity Heatmap reads every relevant planned Job/Style for the selected month.
- Demand is spread across the actual process start/end date overlap, so simultaneous Jobs are accumulated correctly by slot.
- NFL/NCL physical sewing lines are canonicalized; legacy duplicate zero-machine lines are merged/deactivated at startup while the highest known machine count is preserved.
- The planner line API and capacity validation use the same canonical physical-line set.

BRANDING
- Official Northern Fashions Limited logo is included in Login, Sidebar and print headers.
- Company name is corrected to Northern Fashions Limited.

KEY MODULES / CHANGES
- Central IE Bulletin bulk import + follow-up tracker.
- Maintenance machine master, daily utilization, Gantt-linked requirement, idle/shortage and changeover add/remove.
- IE Weekly Machine Requirement Plan: next 7 days, machine type-wise requirement/available/breakdown/shortage with affected line/job.
- IE Target Giving: Floor/Sewing filter, 2 default job rows per line, Add Job, Gantt or existing Job search, WIP-based target, Short/Balance job, <200 pcs => 2x effective SMV rule, target summary.
- Daily Actual Present/Assign Excel import: Actual Present/Assigned MP/Actual Target are read-only actual inputs beside IE target.
- NPT: reason pareto, line-wise NPT, daily trend, NPT vs efficiency, machine breakdown waiting/repair.
- QCO: configurable SMV standard table + actual start/end, failure reason, responsible, remarks.
- Daily MIS Import: stores line/job historical SMV, production, efficiency, manpower, OT, productivity and cost-summary metrics. Quality is NOT sourced from MIS.
- Line-wise Performance: floor/line/month/custom-date filter; 3 line charts per desktop row; SMV vs efficiency with NPT/QCO/OT hover details.
- Skill Matrix and Production Checkpoints.
- KPI Board: AUTO/MANUAL source handling, monthly board values, yearly line-wise performance, print. Quality KPIs wait for Daily Quality Report.
- Kaizen: submit, implement, sustain/spread and saving history feeding KPI.
- Responsible Person Master with effective dates and customizable floor/area/line roles.
- Current corrections seeded: Sewing-2 J/K/L = Nazrul; O/P/Q = Mokhles; Titon not current; Sewing-3 S/T/U = Mizanur + Islam.
- Demo "Import/Load 50 Data" option removed from user UI.

START
1. Extract the ZIP over/copy your project folder after taking a backup.
2. Keep apps/api/.env from your working installation.
3. Run START-NFL-PULSE.bat.
4. The launcher installs dependencies, generates Prisma, runs db push, seeds masters/responsibility history, builds API, and starts Web/API.

IMPORTANT DATA SOURCE RULES
- Official Target owner = IE. MIS/Production owns actual output.
- Quality KPI data must come from Daily Quality Report, never from MIS.
- Machine actual inventory/utilization owner = Maintenance; IE uses it for forecast.
- MIS Excel remains manually prepared for now; ERP imports the useful historical data.
