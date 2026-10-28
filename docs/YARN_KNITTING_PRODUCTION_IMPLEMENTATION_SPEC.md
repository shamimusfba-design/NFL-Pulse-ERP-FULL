# Yarn, Yarn Store, and Knitting Production — Operational Implementation Contract

Branch: `feat/yarn-knitting-operational-erp`

## Why this work exists

The current repository is a pilot, not a production-certified downstream transaction system. The Yarn page contains hard-coded `INITIAL_STOCK`, `REQUISITIONS_DATA`, and literal KPI values; the Knitting page reads a read-model endpoint and contains display fallbacks. These must not be treated as live inventory or actual execution. Replace demo/read-model assumptions with audited transactional flows, while preserving the existing Next.js/NestJS/Prisma/PostgreSQL architecture and role-based navigation.

## Non-negotiable operating rules

1. Use factory source sheets and existing company fields first. Do not invent replacement formats where an existing report exists.
2. A submitted request is not stock; a purchase order is not a receipt; a planned knitting quantity is not production; a delivery challan is not a confirmed receipt at the destination.
3. Physical, reserved, available/free, ordered pipeline, in-transit, received, issued, consumed, returned, rejected, and deadstock quantities are separate measures.
4. Partial receipts/dispatches update only the quantity actually received/dispatched. Never move the whole PO into physical stock after a partial GRN.
5. Every stock-changing transaction must be traceable to factory, godown/location, item specification, colour, lot, source document, actor, timestamp, and reversal/correction history.
6. No negative free stock or over-issue unless an explicitly permissioned, audited override policy is approved.
7. Never silently overwrite a transaction. Corrections use reversal/adjustment records with reason and approval.
8. Do not use sample/demo numbers as live values. Demo records must be visibly tagged and excluded from live totals unless the user explicitly enables a demo view.
9. Do not infer yarn equivalence from colour name alone. Matching must include count, composition, yarn type, shade/dye status, lot/quality restrictions, and applicable buyer/order specification.
10. Role-specific pending tasks and approval permissions are mandatory; management dashboards are read/drill-down/escalation surfaces, not duplicate data-entry forms.

## Required linked workflow

Confirmed order + approved CAD/Fabric Order Sheet + approved T&A
→ colour/style/component-wise yarn requirement
→ requirement validation and shortage netting
→ stock reservation by compatible lot
→ separate merchandising forecast requisition and safety/base replenishment demand
→ purchase request / mill PO
→ delivery schedule and in-transit pipeline
→ partial/complete goods receipt (GRN), lot and quality checks
→ put-away into godown/location
→ knitting yarn issue against approved job/program/machine
→ actual knitting production entry by date/shift/machine/program/component/colour/GSM
→ yarn return, unused cone/lot return, waste and process-loss reconciliation
→ greige fabric delivery challan and destination receipt confirmation
→ production/delivery balance and job closeout.

Each transition needs a real persisted transaction, validation, audit event, status history, and next-section pending task.

## Yarn identity and traceability fields

Maintain searchable masters where possible:
- Yarn item/code and description; count (e.g. Ne/denier as applicable); yarn construction/type (combed/carded, ring/OE, slub, melange, modal, viscose, polyester, elastane/Lycra, organic/recycled, etc.); composition percentages; supplier/spinning mill; yarn colour/shade and shade reference; white/greige/dyed status; lot/batch/cone identifiers; certification/quality restrictions; unit; active status.
- Factory, godown, rack/bin/location, receipt date, supplier lot, internal lot, QC status, stock status, and ageing.
- Fabric/knitting requirement dimension: buyer, order/job, PO, style/item, colour, component (Body, L Rib/Rib, S-Jersey/Collar or source-defined component), fabric construction, GSM, composition, machine/program, required-by date, and source document reference.
- Keep colour, GSM, composition, count and factory as explicit searchable columns and filter/group dimensions, not only embedded in free-text descriptions.

## Yarn requirement and shortage calculation

At the same exact specification key:
- Gross requirement = approved base requirement + approved process-loss/allowance quantity (allowance policy must be configurable and approval-controlled).
- Net unreserved requirement = gross requirement - compatible physical stock available for reservation - valid reservations already assigned to this requirement.
- Purchase shortage = max(0, approved demand - eligible free stock - eligible confirmed inbound quantity due before the required-by date), with the UI showing the components separately. Do not count overdue or unconfirmed inbound as guaranteed supply.
- Show total requisition, approved, reserved/allocated, free stock, ordered pipeline, in-transit, received, issued, consumed, returned, outstanding and shortage separately.
- Keep Safety/Base Replenishment and Merchandising Forecast Requisition as distinct demand streams. Do not incorrectly net them into one another.
- Prevent duplicate imports/requisitions using source document ID + line identity/idempotency key; provide an exception queue for possible duplicates.

## Yarn receiving (GRN) — required professional workflow

1. Select supplier/mill PO and expected delivery; support multiple PO lines on a vehicle where policy allows.
2. Record supplier challan/invoice, vehicle, arrival time, receiving factory/godown, receiver and document attachments.
3. Enter line-wise expected quantity, received gross/net quantity, unit, count, composition, colour/shade, supplier lot, cone/package count and variance.
4. Support multiple partial GRNs per PO line. Keep ordered, previously received, current receipt and balance-to-receive visible.
5. Record QC status (pending/pass/hold/reject), shade/lot match, weight discrepancy, damage/shortage, and rejection/return quantities. Quarantined/held stock must not become free-to-issue.
6. Post GRN atomically: update receipt ledger, lot balance, PO received balance, pipeline, stock ageing and audit log together. Failed transactions must roll back fully.
7. Print/export GRN and maintain who received, checked, approved and posted it.
8. Reversal/adjustment requires reason and permissions; no direct silent edits after posting.

## Yarn delivery / issue to knitting — required professional workflow

1. Create issue request against approved job/order, knitting plan/program, component, colour, GSM/construction and required date.
2. Validate free stock, quality release, exact yarn specification, lot compatibility and available quantity.
3. Reserve/allocate lots; support controlled split-lot allocation and FIFO/FEFO where appropriate, without blending incompatible shades/lots.
4. Generate issue/delivery challan with line-level lot, quantity, cone count, from/to locations, requested/issued/received quantities, date, vehicle/person and signatures.
5. Distinguish dispatched from destination-received. Knitting/store acknowledgement confirms actual received quantity; shortages/damage remain exceptions.
6. Support partial delivery, balance delivery, cancellation before posting, and audited return-to-store.
7. Update physical stock only at the correct transaction event; update reservation, dispatch, transit and destination receipt separately.
8. Block duplicate posting and issue beyond free stock unless an approved exception is recorded.
9. Show requisition-to-issue completion and delivery balance by job, style, colour, component, factory, and required date.

## Deadstock, slow-moving and excess control

- Age each stock lot from the agreed ageing basis (receipt date or last movement; make the basis visible/configurable).
- Provide configurable age buckets (e.g. 0–30, 31–60, 61–90, 91–180, 181+ days) and distinguish deadstock from slow-moving, excess, blocked, rejected, and usable surplus.
- Deadstock/excess candidates are based on no/low movement, no open compatible demand, excess over forecast/safety target, and specification obsolescence—not age alone.
- Display lot, count, composition, colour/shade, factory/godown, physical/free/reserved quantity, value if cost data exists, age, last movement, related jobs, reasons and owner.
- Recommend actions: reallocate to compatible future orders, return to mill, transfer factory, approved substitution/shade review, reuse/reprocess, sale/scrap/write-off. Recommendations never auto-post stock or approve substitutions.
- Track disposition request, approval, execution, recovered quantity/value, write-off and closure. Prevent reserved or quarantined stock from being disposed without an approved release.

## Knitting production and execution summary

Every execution row should be traceable by factory, date/shift, job/order, buyer, style, item, colour, GSM, composition, fabric construction, component, yarn count/lot, machine/program, in-house/outside knitting, operator/supervisor, and source plan.

Required plan-vs-actual measures:
- approved total load / requirement, in-house load, outside load, planned quantity, actual production, production balance, accepted quantity, rejected/rework quantity, delivery quantity, delivery balance, yarn required, reserved, issued, consumed, returned, process loss, excess/shortage and variance.
- machine/program allocation, capacity and hours, running/idle/breakdown status, planned start/end, actual start/end, daily/shift production, target vs actual, output rate, delay days, and reason.
- Body, L Rib/Rib, S-Jersey/Collar and any source-defined components remain separately tracked; do not infer arbitrary fixed component percentages when source data is available.
- Colour, GSM and composition must be filterable and aggregatable. Show both detail rows and totals; do not aggregate unlike specifications into misleading totals.
- Outside knitting: subcontractor/factory, work order, sent quantity, challan, received quantity, rejected quantity, balance, due date and delay.
- Delivery: challan lines, dispatched, received/acknowledged, rejected/damaged, pending balance, destination, date and proof/document references.
- Process loss is calculated from approved policy and actual transactions; any allowance/excess requires reason, permission and approval history.

## Dashboards and reports

### Yarn management / procurement
- Physical stock, reserved, free stock, safety target, safety deficit, approved requirements, forecast requirements, purchase requisitions, ordered pipeline, overdue pipeline, due-in-window, GRN received, outstanding PO balance, urgent order required and supplier-wise due/late performance.
- Show physical/base target (~800T) and base/safety pipeline target (~700T) as separate configurable targets per current agreed rule; never hard-code the targets in UI.
- Urgency is derived from required-by date, eligible free stock, confirmed inbound ETA, lead time and production risk. Show calculation/explanation per alert.

### Yarn store
- Stock ledger, lot/location balances, movement history, receipts, issues, returns, transfers, adjustments, QC hold/release, reservations and physical-vs-system reconciliation.
- All stock totals must be calculated from posted ledger transactions or a reconciled materialized balance—not page constants.

### Knitting
- Load vs planned vs produced vs delivered; in-house/outside split; yarn shortage; unallocated load; overdue/at-risk jobs; machine capacity and daily/shift trends; colour × GSM × composition breakdown; component breakdown; process-loss exceptions; pending receipts/deliveries; six-month deadstock and slow-moving exposure.
- Every KPI must drill into the rows that form its number and identify the source/last refresh. Missing data is shown as missing, not replaced with fabricated defaults.

### Required exports
- Filtered Excel/CSV and print-ready reports for yarn requirement, shortage/urgent PO, PO pipeline/ETA, GRN/receipt variance, godown stock ledger, issue/delivery challan, returns, deadstock disposition, knitting plan-vs-actual, date-wise/shift-wise production, colour/GSM/composition summary, outside knitting and job closeout.

## Technical implementation requirements

- Keep Next.js + TypeScript, NestJS + TypeScript, PostgreSQL + Prisma, existing auth and role/permission architecture.
- Add normalized transactional domain models and migrations incrementally. Keep the demo/read-model separated from live transaction tables.
- Use DTO validation and server-side authorization on every mutation. UI hiding is not authorization.
- Use database transactions for stock posting and idempotency keys for GRN/issue/delivery posting.
- Add indexes for factory, item/specification, lot, job, colour, GSM, composition, status, due date and movement date.
- Add immutable audit trail/status events and a stock ledger. Avoid storing a single editable stock number as the source of truth.
- Add automated tests for partial receipt, partial delivery, double-post prevention, insufficient free stock, lot mismatch, QC hold, reservation accounting, reversal, duplicate import, deadstock eligibility and dashboard reconciliation.
- Remove hard-coded KPI fallbacks and fabricated stock/requisition arrays from live pages. If demo mode is active, label it and isolate its totals.
- No destructive reset, seed, migration, production deployment or live-stock mutation without an explicit approved plan and backup.

## Acceptance tests (minimum)

1. PO 1,000 kg; receive 400 kg; physical increases by 400 kg only, pipeline outstanding is 600 kg.
2. A second GRN receives 600 kg; PO is complete and total physical receipt is exactly 1,000 kg.
3. A 500 kg issue against 300 kg free stock is blocked or requires an audited authorized exception; physical/reserved/free totals reconcile.
4. Issue 200 kg; dispatch 200 kg but knitting acknowledges 190 kg. The system shows 190 kg received, 10 kg discrepancy, and does not silently claim full receipt.
5. Two identical post requests cannot double-increase stock or double-decrease stock.
6. QC-hold stock cannot be allocated to knitting.
7. A reserved lot cannot be disposed as deadstock without authorized reservation release.
8. Colour/count/composition/GSM/factory filters reconcile exactly to detail rows; incompatible specifications are not merged.
9. Urgent PO report explains shortage, required-by date, usable free stock, eligible inbound quantity/ETA and lead-time risk.
10. Every management KPI drills down to underlying live records and agrees with ledger-derived totals.
11. All posted stock movements have actor, timestamp, source document and traceable correction/reversal history.
12. Demo data is excluded from live totals by default.

## Factory source-sheet mapping still required before final form parity

Map the actual yarn requisition, mill PO/pipeline, yarn receiving/GRN, godown stock ledger, yarn issue/delivery challan, return/waste, knitting production/execution, outside knitting, and deadstock reports field-by-field. Preserve exact source names, order of columns, units, formulas, sign-offs and print layout. Where the source files already exist in the repository, use them before asking the user to re-upload anything. Do not call the implementation complete until the mapped forms and acceptance tests pass.
