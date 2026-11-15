# Sewing Line Plan & Shipment Follow-Up Architecture & Implementation Plan

A comprehensive, production-grade Sewing Line Planning, Line-Wise Input Management, and Shipment Follow-Up dashboard and spreadsheet workspace for NOS ERP, modeled directly on the high-density analytical layout of the Dyeing module (`/modules/dyeing`) with 100% column preservation and interactive column group toggles.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following operational principles and architectural choices are incorporated per your feedback:
>
> 1. **Zero-Column-Drop Policy (All 52 Columns Preserved)**: Every single column from the master sheet is fully retained. No column is dropped or simplified.
> 2. **Departmental Auto-Pull Flow**: Upstream sections automatically populate their respective fields:
>    - *Merchandising*: Job No, Buyer, Style, Item, Print & Emb Description, Order Qty, CCD, Old CCD, Week, Merchant Name.
>    - *Fabric Store & Dyeing*: Fabric Req., Fabric Rcv., Fabric Bal., Bal %, Dyeing End T&A, AOP T&A End.
>    - *Trims Store*: Trims & Accessories Status, Trims T&A, PP Status.
>    - *Cutting Floor*: Cutting Qty, Cutting Bal, Print Sent, Print Rcv, Ready for Input.
>    - *Sewing Floor*: Sewing Start Date, Actual Start, No of M/C, SMV, TGT, Last Day Input, Input Qty, Input Bal, Present Status, Remarks / Shifting.
>    - *Finishing & Packing*: Packing Qty, Packing Bal.
>    - *Commercial / Shipping*: Ship Qty, Ship Bal, Delay Days, CD, Require Days.
> 3. **Dynamic Column Group Toggle Buttons**:
>    To manage 52 columns cleanly without horizontal clutter, the table includes quick toggle buttons at the top:
>    - **Job Information** (Line, SL No, Buyer, Job, Style, Item, Print & Emb, Merchant, Priority)
>    - **Cutting Status** (Cutting Qty, Cutting Bal, Print Sent, Print Rcv, Ready for Input)
>    - **Production Status** (No of M/C, SMV, TGT, Last Day Input, Input Qty, Input Bal, Present Status, Packing Qty, Packing Bal)
>    - **Material & T&A Status** (Fab Req, Fab Rcv, Fab Bal, Bal%, PP Status, Trims Status, Dyeing T&A, AOP T&A, Delay Days)
>    - **Shipment & Delivery** (CCD, Old CCD, Week, Ship Qty, Ship Bal, Delay Days, Plan Fail Reason, Remarks)
>    - **Show All 52 Columns**: Quick one-click view of the complete master spreadsheet.
>    - *Core columns (Line, Job No., Style, Buyer) always remain pinned/frozen on the left for context.*
> 4. **Cutting Status Gate**: Sewing status cannot be changed to Running or Completed until Cutting is completed and Ready for Input > 0.

---

## 1. Overview & Core Concept

### What It Delivers
A unified mission control for garment sewing lines, line supervisors, and merchandisers that bridges the gap between pre-sewing material supply, floor loading, line output, and customer shipment deadlines.

### Master Dataset Integration (All 52 Columns)
1. **Core Identifiers & Order Info**: `Line`, `SL No.`, `Buyer`, `Job`, `Style`, `Item`, `Print & Emb Description`, `Merchant Name`, `Priority`, `Present stage No`.
2. **Planning & Setup**: `Sewing Start Date`, `Actual Sewing Start`, `CCD`, `Old CCD`, `Week`, `O.Qty`, `No of M/C`, `SMV`, `TGT`, `Require Days`, `CD`.
3. **Pre-Sewing T&A Readiness**: `Fab Req.`, `Fab Rcv.`, `Fab Bal.`, `Bal%`, `File Handover Date`, `PP Status`, `PPS Send Date`, `Trims & Accessories Status`, `Dyeing End T&A`, `AOP T&A END`, `Delay Days (Dyeing)`, `Trims T&A`, `Delay Days (Trims)`.
4. **Cutting to Sewing Input Management**: `Cutting Qty`, `Cuting Bal`, `Print Sent`, `Print Rcv`, `Ready for Input`, `Last day Input`, `Input qty`, `Input Bal`.
5. **Sewing & Shipment Follow-up**: `Present Status` (`Sewing Running`, `Sewing Completed`, `Ready for Input`, `Waiting Cutting`, `Hold / Delay`), `Packing Qty`, `Packing Bal`, `Ship Qty`, `Ship Balance`, `Delay Days`, `Print Position`, `Embriodary Position`, `Plan Fail Reason`, `Remarks` (Line shifting notes: e.g. "C to B=Planning", "Advance sew from September'26").

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SEWING LINE PLAN & SHIPMENT FOLLOW-UP                           │
│                                                                                        │
│  [ Plant: NFL/NCL ]  [ Horizon: Nov 2026 ]  [ Line: All (32 Lines) ]  [ Buyer: All ]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  KPI STRIP (6 Metrics)                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 128 Jobs   │ │ 482,500 pcs│ │ 312,400 pcs│ │ 170,100 pcs│ │ 38.4 t   │ │ 14 Jobs  │ │
│  │ Active Plan│ │ Order Qty  │ │ Input Loaded│ │ Input Bal  │ │ Fab Ready│ │ Delayed  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘ └──────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  CHART ROW 1: PRE-SEWING SUPPLY & INPUT READINESS (Dyeing Group Box Layout)            │
│  ┌────────────────────────────────────────┬──────────────────────────────────────────┐ │
│  │ 3 SUPPLY DONUTS                        │ 4 SEPARATE STAGE COLUMNS                 │ │
│  │ ◐ Fabric Store (Rcv vs Bal)            │ █ Cutting Completed:  348,200 pcs (88 J) │ │
│  │ ◐ Pre-Sewing T&A (Dyeing/Trims OK)     │ █ Ready for Input:     42,100 pcs (19 J) │ │
│  │ ◐ Sewing Input (Loaded vs Balance)     │ █ Sewing Running:     184,500 pcs (41 J) │ │
│  │                                        │ █ Shipped & Invoiced: 210,000 pcs (48 J) │ │
│  └────────────────────────────────────────┴──────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  CHART ROW 2: LINE EXECUTION & SHIPMENT DELAY TRACKER                                  │
│  ┌────────────────────────────────────────┬──────────────────────────────────────────┐ │
│  │ LINE LOAD & OUTPUT (Plan vs Actual)    │ SHIPMENT DELAY & T&A CROSSED BY BUYER    │ │
│  │ [Sorted Horizontal Bars by Line A..Z]  │ [Trend Line & Reason Breakdown Bar]      │ │
│  └────────────────────────────────────────┴──────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  DYNAMIC COLUMN TOGGLE BAR:                                                            │
│  [✓ Job Info]  [✓ Cutting Status]  [✓ Production Status]  [✓ Material & T&A]  [✓ Ship] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  SCHEDULE & FOLLOW-UP LEDGER                                                           │
│  [ 📋 Analytical DataGrid ]  [ 📊 Live Excel Sheet (EditableSheetGrid) ]               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Line │ Job │ Style │ Buyer │ O.Qty │ Cut │ Ready │ Input │ Status │ Ship │ Delay │  │
│  │ A    │48202│ 22040 │ ONL   │ 12,500│12,50│ 2,500 │ 10,000│Running │ 8,500│ 0 d   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. User Experience & Visual Design

### A. Layout Structure & Navigation
- **Department Route**: `/modules/sewing` (Main Sewing Overview with Subsections) and `/modules/sewing/line-plan` (Direct Full-Page Workspace).
- **Navigation Contract (`Shell.tsx`)**:
  - Update `Sewing & Finishing` with:
    1. `Line Plan & Shipment Follow-up` (`/modules/sewing/line-plan`)
    2. `Sewing Operations & Line Gantt` (`/modules/sewing-planning`)
    3. `Finishing & Packing` (`/modules/finishing`)

### B. Top Slicer Bar & KPI Strip
- **Slicer Bar**: Month, Shipment Week (52W, 42W, etc.), Line Filter (All, Line A–Z, ZA1, Sew-01–03), Buyer Filter (ONL, OVS, ONS, NMT, UTG), Present Status.
- **KPI Strip (Locked Meaning Colours)**:
  - Jobs Planned, Total Order Pcs, Input Loaded Pcs, Sewing Balance Pcs, Ready for Input Pcs, Shipment Delayed Jobs.

### C. Analytical Graphs (Following `/modules/dyeing` Standard)
1. **Supply & Pipeline Readiness Group Box**:
   - **Left Half (3 Donut Charts with Center %)**:
     - *Fabric Store Readiness*: Total Fabric Received vs. Fabric Balance (in tons & %).
     - *Pre-Sewing T&A Readiness*: Jobs with Dyeing End T&A + Trims T&A in-house vs. delayed.
     - *Sewing Input Coverage*: Cumulative Input Qty vs. Input Balance (in pcs & %).
   - **Right Half (4 Separate Metric Columns — Not Stacked)**:
     - Column 1: **Cutting Completed** (Total pcs, Job count, Avg yield %)
     - Column 2: **Ready for Input** (Total pcs cleared print/emb, Job count)
     - Column 3: **Sewing Running** (Total pcs actively on lines, Line count)
     - Column 4: **Shipped & Invoiced** (Total pcs shipped, Job count)
2. **Line-Wise Progress & Target Performance**:
   - Sorted horizontal bars showing daily target vs. actual input loaded across Lines A through Z.
3. **Shipment Delay & Risk Horizon**:
   - Visual breakdown of orders past Confirmed Customer Date (CCD) or at risk within 7 days, categorized by Buyer and Root Cause (Fabric Delay, Trims Shortage, Line Changeover).

### D. Dynamic Column Visibility Bar & Dual Table View
1. **Interactive Column Group Buttons**:
   - Button 1: **Job Information** (`Line`, `SL No.`, `Buyer`, `Job`, `Style`, `Item`, `Print & Emb Description`, `Merchant Name`, `Priority`)
   - Button 2: **Cutting Status** (`Cutting Qty`, `Cuting Bal`, `Print Sent`, `Print Rcv`, `Ready for Input`)
   - Button 3: **Production Status** (`No of M/C`, `SMV`, `TGT`, `Last day Input`, `Input qty`, `Input Bal`, `Present Status`, `Packing Qty`, `Packing Bal`)
   - Button 4: **Material & T&A Status** (`Fab Req.`, `Fab Rcv.`, `Fab Bal.`, `Bal%`, `PP Status`, `Trims Status`, `Dyeing T&A`, `AOP T&A`, `Delay Days`)
   - Button 5: **Shipment Follow-Up** (`CCD`, `Old CCD`, `Week`, `Ship Qty`, `Ship Balance`, `Delay Days`, `Plan Fail Reason`, `Remarks`)
   - Button 6: **Select All / Reset**
2. **Mode A — Analytical DataGrid**:
   - Frozen columns (`Line`, `Job No.`, `Style`).
   - Color-coded status chips.
   - Single-click opens slide-out **RecordPanel**; double-click opens square **DrillPopup** bubble.
3. **Mode B — Live Interactive Spreadsheet (`EditableSheetGrid`)**:
   - Excel-style lettered columns (`A`, `B`, `C`...), active cell badge (`E14`), and formula bar (`fx`).
   - Inline cell editing for Daily Input, M/C count, Remarks, and Line Notes.
   - Live recalculation for balances and delay days.

### E. Cutting Handoff Gate (Business Rule Enforcement)
- **Validation Rule**: A line supervisor cannot mark a job as `Sewing Running` or `Sewing Completed` unless `Cutting Qty > 0` and `Ready for Input > 0`.
- If cutting has not finished, the status is locked to `Waiting Cutting` with a descriptive tooltip.

---

## 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OPERATIONAL DATA STORE                             │
│                  lib/store/operational-store.ts (Persistent)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│     SEWING LINE PLAN DATA MODEL       │ │    UPSTREAM DEPARTMENT STATUS     │
│   SewingLinePlanRow (All 52 Columns)  │ │ - Cutting Store (Ready for Input) │
│ - Line Allocation & Priority          │ │ - Fabric Store (Fab Rcv / Bal)    │
│ - Input Qty & Input Balance           │ │ - Merchandising Orders (CCD / OQ) │
│ - Packing & Shipment Progress         │ │ - Trims / Dyeing T&A Milestone    │
└──────────────────┬────────────────────┘ └─────────────────┬─────────────────┘
                   │                                        │
                   └───────────────────┬────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 CUTTING HANDOFF & STATUS VALIDATION ENGINE                  │
│  - If CuttingQty == 0 -> Status locked to "Waiting Cutting"                 │
│  - If ReadyForInput > 0 -> Can transition to "Ready for Input" / "Running"  │
│  - Compute DelayDays = DateDiff(Today, CCD) if ShipBal > 0                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               PRESENTATION LAYER (apps/web/app/modules/sewing)              │
│  - Top Slicer Bar (Month, Week, Line, Buyer, Status)                        │
│  - KPI Strip (6 Summary Tiles)                                              │
│  - Supply Readiness Group Box (3 Donuts + 4 Columns)                        │
│  - Line Execution Bar Chart & Shipment Delay Trend                          │
│  - Dynamic Column Visibility Toggle Buttons (Job, Cut, Prod, T&A, Ship)     │
│  - Dual View: DataGrid + EditableSheetGrid (Live Formulas)                  │
│  - DrillPopup (Double-click) & RecordPanel (Single-click)                   │
│  - Excel/CSV Batch Importer (Sewing_Line_Plan___Execution_Follow__Up)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

1. **Dataset Seed & Column Mapping**:
   - Parse all records from `/public/assets/aistudio/Sewing_Line_Plan___Execution_Follow__Up_2862b2aa` into structured JSON seeds containing all 52 columns.
   - Define TypeScript interfaces `SewingLinePlanRow` with all 52 fields and mathematical default formulas.

2. **Core Sewing Dashboard (`/apps/web/app/modules/sewing/page.tsx` & `/line-plan/page.tsx`)**:
   - Construct the top slicer bar and 6-card KPI strip.
   - Build the Dyeing-style Supply Readiness group box (3 Donuts + 4 Separate Columns).
   - Implement Line-wise Target vs. Input Loaded chart and Shipment Delay breakdown.

3. **Column Group Toggle System & Dual Table Mode**:
   - Build the button bar toggling column groups: Job Info, Cutting Status, Production Status, Material & T&A, Shipment Follow-up.
   - Connect both `DataGrid` and `EditableSheetGrid` to dynamically filter visible columns based on active toggle buttons.
   - Enforce the Cutting validation gate in both grid editing and record update modals.

4. **Batch Workbook Importer & Navigation Integration**:
   - Configure `DataImportModal` with predefined column mappings for the factory's CSV/Excel sheet.
   - Add the new module to `Shell.tsx` navigation under `Sewing & Finishing`.

5. **Strict Quality Verification**:
   - Verify 0 TypeScript errors with `tsc --noEmit`.
   - Validate strict compliance with `check-ux-standard.mjs` and `check-chart-standard.mjs`.
