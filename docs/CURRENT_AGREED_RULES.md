# Current Agreed Business Rules — NFL Pulse ERP

This document captures the current confirmed design rules so future implementation does not drift back to generic garment-ERP assumptions.

## General
- Use actual factory fields/reports first; standard best practice should simplify and connect them, not invent unnecessary entry.
- One-time entry should flow downstream automatically.
- Same-type values should use searchable dropdown/master values instead of repeated free text where practical.
- Each functional area has Overview, My Pending Tasks, Entry/Follow-up and Reports as needed; do not add screens just for decoration.
- Green = OK/Done, amber = attention/pending, red = critical/overdue, grey = not started/N/A, blue = planned/informational.
- Every user sees a role-relevant interface. Edit rights also consider section/floor/job ownership.

## Merchandising
- Merchandiser Type: Sample, Bulk, Sample + Bulk.
- Bulk work begins with confirmed PO/Order Entry.
- Sample side owns Costing, Lab Dip, Sample Follow-up and sample approvals.
- Buyer and Brand are one master/field.
- No production Factory field in confirmed Order Entry.
- New and Repeat Job supported; live Job numbers use the factory's continuous numeric sequence. Repeat display example: `48515 1st`.
- Manual Order Entry uses style-level Color × Size. PO-level manual entry only needs PO No, PO Qty and CCD.
- Item Picture is uploaded by Merchandising. FOB is stored with the order/style data.
- Merchandising Follow-up is one sheet, combining checkpoints, approved planning dates and production quantity/status.
- Main ordering starts Buyer, Job, Style, Item Picture.
- File Handover Date, Trims In-house Date and Sewing Start Date come from approved Central Planning T&A.
- Merchandising checkpoints include Fabric Order Sheet, Lab Dip, Print Strike-off, Trims Ordering, File Handover and Work Order when outside processing requires it.
- Production columns include Fabric Required, Knitting Qty/Balance, Dyeing Qty/Balance, Cutting Qty/Balance, Print Qty/Balance, Embroidery Qty/Balance, Input Qty/Balance and Sewing Qty/Balance. Do not add Ready for Input to the Merchandising main sheet.
- Order Qty revision must preserve history and trigger CAD re-check rather than silently leaving downstream requirements stale.

## CAD / Sample / Technical
- CAD/Pattern/Technical belongs with the Sample/CAD/Technical family, not under IE or Central Planning.
- Confirmed Order creates a CAD consumption pending task.
- CAD sees order/style/item picture/color-size/qty/CCD, creates consumption and derives Fabric Requirement.
- Fabric Order Sheet is based on CAD consumption and color-wise order qty.
- Exact company print format will come from the factory Excel template.

## Industrial Production Engineering
- Industrial Production Engineering is a separate main category.
- Relevant sub-areas include IE Overview, IE/Operation Bulletin, Daily Target, NPT, Skill Matrix, Production Checkpoints (1st hour, 4th hour, 8th hour, OT) and IE Reports.
- Confirmed order creates Style-wise IE/Operation Bulletin pending work.
- IE sees Merchandising item picture; if necessary, physical sample collection can be recorded.

## Central Planning
- Main category name is Central Planning; do not nest another duplicate Central Planning item underneath it.
- Bulk and Sample T&A are issued by Central Planning.
- Pending Jobs can be bulk auto-generated into T&A drafts; Planning reviews and manually edits suggested dates before final approval.
- T&A is calculated backward from the fixed Buyer CCD. Use job-specific lead time and applicable process steps; if a job has 60 days available rather than a 120-day standard, generate a compressed 60-day plan instead of blindly keeping 120 days.
- No newly generated process start date may be earlier than the T&A generation date. If the fixed CCD and minimum practical durations cannot both be met, retain the CCD, flag the schedule as infeasible / Planning Review Required, and do not silently show past process dates as a valid plan.
- Slack/float is calculated from process dependencies and the critical path; do not add the same fixed buffer to every activity.
- Auto-generated T&A must be reviewed against capacity heatmaps before approval/release. Planning can manually edit dates and durations; the approved plan is the official baseline.
- The physical T&A Plan and Fabric Order Sheet are printed and signed outside the ERP. Record that the signed physical copy was received before final approval; an ERP approval click alone is not a substitute for the physical signature.
- Final approval releases the approved fabric requirement by colour, composition and construction to Knitting, Dyeing, Grey Fabric Store and Finished Fabric Store. These are requirement/expected-receipt records, not actual stock; actual stock changes only after physical receive/issue transactions.
- Approved T&A releases relevant dates to Merchandising and auto-loads a Sewing Gantt draft.
- Sewing Gantt is then independently reviewed/adjusted and approved by Central Planning as the official future plan.
- Line suggestions should rank prior same-item/style experience, compatible machine/operation capability, current line loading/capacity, required manpower and CCD risk. Suggestions are advisory; Planning selects the final line and approves the official Gantt.
- Gantt supports Job, Item, Present Status, Buyer, Style, Risk and Plan vs Actual views. Item view can show image. Status/risk colors should not be replaced with arbitrary Buyer/Job colors.

## Capacity
- Capacity policies must be editable/configurable; changes should not require source-code changes.
- Bulk Knitting: 23 hours/day; 2 shifts normally; Sunday one shift. Actual planning should consider machine dia, fabric category, yarn count and calendar.
- Sample Knitting practical capacity: around 300–350 kg/day and 30–40 colors/day; effective load uses the more constraining KG or color load.
- Sample Dyeing capacity is Batch/Color-based, not total KG. Current practical slot basis: All Sample 185 batches/slot, PP+Development 80, SMS 105.
- Sample Printing practical basis: about 50–60 style/sample per day and 700–800 pcs/day; effective load uses the more constraining measure.
- Sample Making practical 100% capacity: 800 styles/month.

## Yarn
- Keep the UI simple but connect Forecasting, Pipeline, Store and Yarn Dyeing.
- Physical/base target around 800T and base/safety pipeline target around 700T are separately visible.
- Safety/Base Replenishment and Merch Forecast Requisition are separate mandatory purchase-demand streams and should not be incorrectly netted into one another.
- Pipeline means ordered but not received; partial receive moves only the received quantity from pipeline to physical.
- Standard slots: 1–10, 11–20, 21–month-end.
- Physical, Reserved and Free stock are distinct.
- Yarn Planning and Knitting Production Planning have separate Pending Tasks.

## Quality
- Testing Lab reports are the regular structured quality source.
- Optional Job Quality History aggregates available test history plus section/floor root-level quality remarks.
- If work has been released to the next section, the previous stage can show released/pass automatically; responsible users mainly record exceptions, holds, rework and remarks rather than repeatedly typing Pass.
- Section/floor remark access is permission controlled.
- Planning only needs quality impact/release/delay; full defect detail belongs in Quality History.

## Management
- Management Dashboard uses the chart/visual best suited to each metric: line for trends, bar for comparison, heatmap for capacity, Pareto for defects, Gantt for planning, etc.
- Job 360 is a key drill-down with order, production, test, quality, lead-time and pending-task context.
- Management is primarily a view/drilldown/escalation workspace, not a duplicate data-entry department.

## Demo data
- Demo jobs use 990001–990050 and are tagged as demo data.
- Admin can load/reset or delete all demo jobs without targeting real orders.
