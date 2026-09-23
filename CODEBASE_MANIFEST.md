# NFL Pulse ERP — Consolidated Codebase Manifest

## Working application areas
- Login/auth, users/roles/permissions foundation
- Factory/section/floor/line/machine master foundation
- Buyer master
- Manual confirmed Order Entry with Color × Size matrix
- Buyer PO import foundation (Bestseller, OVS, UTG draft)
- Numeric running Job number + Repeat Job/Lot handling
- Item image + FOB in Merchandising data
- Merchandising Follow-up and compact actions
- Order quantity revision history + CAD re-check task
- CAD work queue / consumption foundation
- Industrial Production Engineering work queue / bulletin foundation
- Central Planning T&A work queue
- Auto-generate all pending T&A drafts
- Capacity heatmap and editable capacity policies
- T&A approval/release with capacity check
- Auto-load approved T&A into Sewing Gantt drafts
- Sewing Gantt multi-view, line/date review and official approval
- My Pending Tasks role/ownership filtering
- Management Overview
- Job 360
- Testing Lab demo history / Quality History
- Lead Time & Delivery History
- 50 removable connected demo jobs across Yarn → Shipment

## Module shells / connected read models ready for deeper transaction implementation
Yarn Management, Procurement/SCM, Yarn Store, Yarn Dyeing, Knitting, Greige Fabric Store, Dyeing, Lab & Testing, Fabric Finishing/AOP/Brush/Peach, Finished Fabric Store, Sample, Printing, Embroidery, Special Process, Sewing, Finishing/Packing, Trims, Shipment and reporting pages can display connected demo/state data and role navigation. Exact factory transaction forms should continue to be implemented against the supplied source reports rather than invented generically.

## Intentionally pending
- Exact company Excel print skin for Fabric Order Sheet
- Exact company Excel print skin for T&A Plan
- Exact company Excel print skin for Work Order
- Production certification/UAT for every downstream transaction form
