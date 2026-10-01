# Northern Fashion Ltd. (NFL) — Dyeing & Finishing Industrial Architecture
## Comprehensive Process Flow, DBMS Architecture & PostgreSQL DDL Design

**Document Version:** 1.0.0  
**Factory:** Northern Fashion Ltd., Plot # 16-18, Dakhin Panishail, Kashimpur, Gazipur  
**Scope:** Greige Fabric Store, In-House Dyeing Floor, Subcontract Dyeing, Multi-Process Movements (AOP, Peach, Brush, Shearing, Singeing), Finishing Floor, and Finished Fabric Store Delivery.

---

## 1. Executive Summary & Factory Blueprint

Based on the actual operating workbooks of Northern Fashion Ltd.:
* **`DYEING PROFILE.xlsx`**: 22 in-house winch and finishing machines (Dilmenler HTHP winches up to 1,400 KG, Thies 75 KG, Fongs 45 KG sample winches, Bianco slitters, ACC Gas 7-chamber stenter, Ehwha Gas 8-chamber stenter, Laffer compactors).
* **`Buyer Wise Sub-Contract Dyeing Plan & Person.xlsx`**: 15+ external subcontract partner mills (Giant Textile, Newage, Shadhin, Sparkle, Pakiza, APS, Unifill, DB Tex, Knit Plus, Niloy, Space, GTA, Ceylon Blue, Tosrifa) managed with designated buyers and on-site contact persons.
* **`Finish Fabric Plan & Execution Status.xls` (September'26)**: 1,780+ production rows tracking orders across buyers (BS-NMT, BS-ONS, BS-ONL, OVS, GT, UTG), strictly enforcing the **Component Zero-Collapse Rule** (Body, L Rib, S-Jersey kept in separate line items).
* **`AOP Fabric Plan & Execution Schedule(Bulk).xlsx`**: Multi-slot AOP planning, dispatch challans, in-house returns, and process loss audit.
* **`Bulk to Bulk RFT.xlsx`**: Bulk Right-First-Time (RFT) quality monitoring, shade matching, and NRFT topping reason analytics.

---

## 2. End-to-End Industrial Process Flow (Step-by-Step)

```
[ Merchandising Order Booking ]
               │
               ▼
[ 1. Component Requirement Breakdown ]
   ├── Body Fabric (Single Jersey / Fleece / Pique)
   ├── L Rib (1x1, 2x2, 3x2, 5x2, 4x1 Lurex Rib)
   └── S.Jersey (Neckband / Internal Bindings)
               │
               ▼
[ 2. Knitting Store & Greige Receiving ]
   ├── Yarn Issue to Knitting Floor / Outside Mill
   ├── Greige Rolls Received at Greige Store (Gross/Net Weight, Roll Barcodes)
   └── 4-Point Greige Quality Check (Grade A / B / Rejection)
               │
               ▼
[ 3. Central Planning & Daily Machine Scheduling ]
   ├── Batch Size Optimization:
   │    • Small (1 - 300 KG)  ──► MC-01 (45kg), MC-02 (50kg), MC-09 (75kg), MC-11 (150kg), MC-03 (175kg)
   │    • Medium (301 - 650 KG) ► MC-10 (450kg), MC-04 (525kg)
   │    • Large (650+ KG)    ──► MC-05 (700kg), MC-06 (1050kg), MC-08 (1200kg), MC-07 (1400kg)
   │    • Sample Winches     ──► Sample 10kg, 15kg (3 mc), 25kg (3 mc), 50kg (2 mc)
   └── Subcontract Allocation:
        • Giant Textile, Newage, Shadhin, Sparkle, Pakiza, APS
               │
               ▼
[ 4. Batch Card Creation & Greige Issuance ]
   ├── Route A (In-House): Batch Card issued ──► Greige Rolls weighed & issued to Dyeing Floor
   └── Route B (Subcontract): Subcontract WO ──► Delivery Challan + Gate Pass issued to Outside Mill
               │
               ▼
[ 5. Dyeing Execution & Quality Approval ]
   ├── Pre-treatment (Scouring, Bleaching)
   ├── Dyeing (HTHP Winch, Liquor Ratio 1:5 to 1:8, Dyes & Chemicals)
   ├── Lab / Shade Matching & Approval:
   │    • RFT (Right First Time): Passed directly to hydro & slitting
   │    • NRFT: Re-dyeing / Topping logged with reason (Recipe error, Lab variance, Chemical defect)
   └── Hydroextraction & Dewatering
               │
               ▼
[ 6. Multi-Process Routing (Special Finishes) ]
   ├── [AOP - All Over Print]: Dispatch to Unifill / DB Tex / Knit Plus (Challan, Strike-off approval, Return)
   ├── [Peach Finish]: Dispatch to Niloy / Space / Ceylon Blue (Sueding roll pass)
   ├── [Brushing]: Fleece napping & brushing
   ├── [Shearing]: Uneven fiber trimming
   ├── [Singeing]: Surface hairiness singeing
   └── Process Loss Audit: Process Loss % = (Sent Qty - Received Qty) / Sent Qty * 100
               │
               ▼
[ 7. Finishing Floor Operations ]
   ├── Bianco Slitting Machine (Slit + Squeezer)
   ├── Stenter Lines:
   │    • Stenter M/C-1 (ACC - Turkey, Gas 7 Chamber, 8,000 KG/day)
   │    • Stenter M/C-2 (Ehwha Textinno - Korea, Gas 8 Chamber, 12,000 KG/day)
   ├── Compacting Lines:
   │    • Compacting-1 (Laffer - Italy, Tubular/Open Width, 6,000 KG/day)
   │    • Compacting-2 (Laffer - Italy, Long Chain, 8,000 KG/day)
   └── Finished Fabric Quality Inspection (UZU Thailand 4-Point System Inspection)
               │
               ▼
[ 8. Finished Fabric Store & Cutting Handover ]
   ├── Roll Tagging (Weight, Width, GSM, Shade Lot, Inspection Grade)
   ├── Delivery Challan to Finished Fabric Store
   └── Component-Level Handover to Cutting Floor for Marker Spreading
```

---

## 3. Database Management System (DBMS) Architecture

### Key Design Principles:
1. **Component Zero-Collapse Rule**: A job cannot have a single aggregate fabric quantity. Body, L Rib, and S.Jersey maintain separate line items with their own yarn count, knitting structure, dyeing recipes, and balance numbers.
2. **Dual-Route Processing (In-House vs Subcontract)**: Unified tracking where both internal winch machine lots and external mill work orders share identical lifecycle milestone events.
3. **Weight Precision & Traceability**: All fabric weights use `NUMERIC(10, 2)` to eliminate floating-point rounding errors across kilograms and grams.
4. **Strict Gate Pass & Challan Reconciliation**: Outward gate passes must match delivery challan weights and be reconciled against inward receiving challans to prevent fabric loss.
5. **Audited RFT/NRFT Quality Metrics**: Root causes of redyeing and topping are captured for continuous process improvement.

---

## 4. Complete PostgreSQL Database Schema (DDL)

```sql
-- =============================================================================
-- NORTHERN FASHION LTD. (NFL) — DYEING & FINISHING CORE SCHEMA
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
CREATE TYPE fabric_component_type AS ENUM (
    'BODY',
    'L_RIB',
    'S_JERSEY',
    'COLLAR_CUFF',
    'POCKETING'
);

CREATE TYPE dyeing_route AS ENUM (
    'IN_HOUSE',
    'SUBCONTRACT'
);

CREATE TYPE multi_process_type AS ENUM (
    'AOP',
    'PEACH',
    'BRUSH',
    'SHEARING',
    'SINGEING',
    'SUEDING',
    'HEAT_SETTING'
);

CREATE TYPE batch_status AS ENUM (
    'PLANNED',
    'GREIGE_ISSUED',
    'LOADING',
    'DYEING_RUNNING',
    'SHADE_CHECKING',
    'TOPPING_REQUIRED',
    'UNLOADED',
    'SLITTING_COMPLETED',
    'STENTER_COMPLETED',
    'COMPACTING_COMPLETED',
    'STORE_DELIVERED',
    'CANCELLED'
);

CREATE TYPE rft_status AS ENUM (
    'RFT',          -- Right First Time
    'NRFT',         -- Non-Right First Time (Re-dye / Topping)
    'STRIP_REDYE',
    'PENDING'
);

CREATE TYPE movement_status AS ENUM (
    'CHALLAN_CREATED',
    'GATE_PASS_ISSUED',
    'IN_TRANSIT',
    'AT_VENDOR_MILL',
    'PARTIALLY_RECEIVED',
    'FULLY_RECEIVED',
    'CLOSED'
);

-- -----------------------------------------------------------------------------
-- 1. DYEING MACHINES PROFILE (Northern Fashion Ltd. Floor Fleet)
-- -----------------------------------------------------------------------------
CREATE TABLE dyeing_machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_code VARCHAR(30) UNIQUE NOT NULL,      -- e.g. MC-01, MC-02, STENTER-01
    machine_name VARCHAR(100) NOT NULL,
    machine_type VARCHAR(50) NOT NULL,              -- WINCH M/C, STENTER, COMPACTING, SLITTING
    capacity_kg NUMERIC(10, 2) NOT NULL,            -- e.g. 1400.00, 1050.00, 525.00, 45.00
    brand_name VARCHAR(60) NOT NULL,               -- DILMENLER, FONGS, THIES, BIANCO, ACC, LAFFER
    origin_country VARCHAR(40) NOT NULL,           -- TURKEY, CHINA, GERMANY, ITALY, KOREA
    nozzle_count INT DEFAULT 1,
    chamber_count INT DEFAULT 0,                   -- For stenters (e.g. 7 or 8 chambers)
    is_sample_machine BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. SUBCONTRACT MILLS & VENDOR DIRECTORY
-- -----------------------------------------------------------------------------
CREATE TABLE subcontract_mills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mill_name VARCHAR(150) UNIQUE NOT NULL,        -- e.g. Giant Textile Ltd., Unifill, Niloy Fashion
    mill_category VARCHAR(60) NOT NULL,            -- Dyeing, AOP, Peach & Brush, Finishing
    allowed_buyers TEXT[],                         -- ['ONLY', 'ONS', 'NMT', 'OVS', 'UTG']
    primary_contact_person VARCHAR(100),           -- Md. AL-amin Sup.
    primary_contact_mobile VARCHAR(40),            -- 01920139383
    qc_contact_person VARCHAR(100),                -- QC Azizul
    qc_contact_mobile VARCHAR(40),                 -- 01942493911
    lead_manager_name VARCHAR(100),                -- Md. A. Mabud Karim (Dep. Manager)
    lead_manager_mobile VARCHAR(40),               -- 01712848802
    mill_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. ORDERS & FABRIC REQUIREMENTS (Enforcing Component Separation)
-- -----------------------------------------------------------------------------
CREATE TABLE fabric_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_no VARCHAR(50) NOT NULL,                   -- e.g. 48085, 48061, 48002
    buyer_name VARCHAR(80) NOT NULL,               -- BS-NMT, BS-ONS, BS-ONL, OVS, UTG, GT
    style_no VARCHAR(100),                         -- 13251506 - Lace Matching
    season VARCHAR(40),                            -- September'26, Spring/Summer'26
    merchandiser VARCHAR(80),                      -- Shamoly, Haider, Mosaddik
    order_qty_pcs INT DEFAULT 0,
    slot_no VARCHAR(40) DEFAULT '1st Slot',        -- 1st Slot, 2nd Slot, 3rd Slot
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_job_no UNIQUE (job_no)
);

CREATE TABLE fabric_order_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fabric_order_id UUID NOT NULL REFERENCES fabric_orders(id) ON DELETE CASCADE,
    component_type fabric_component_type NOT NULL, -- BODY, L_RIB, S_JERSEY
    fabric_description VARCHAR(200) NOT NULL,      -- Single Jersey, 4x1 Rib with Lurex, Pointal L/Rib
    colour_name VARCHAR(100) NOT NULL,             -- Nosegay (Lurex), Cloud Dancer, Dark Sapphire
    color_code VARCHAR(40),
    gsm VARCHAR(30) NOT NULL,                      -- 150, 180, 200, 220
    width_dia VARCHAR(30) NOT NULL,                -- 60", 62", 78"
    additional_process VARCHAR(100),               -- AOP, Peach, Brush, Y/D, Solid
    required_qty_kg NUMERIC(10, 2) NOT NULL,       -- Planned required quantity in KG
    greige_received_kg NUMERIC(10, 2) DEFAULT 0.00,
    dyeing_delivered_kg NUMERIC(10, 2) DEFAULT 0.00,
    finished_delivered_kg NUMERIC(10, 2) DEFAULT 0.00,
    balance_qty_kg NUMERIC(10, 2) GENERATED ALWAYS AS (required_qty_kg - finished_delivered_kg) STORED,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_foc_order_comp ON fabric_order_components (fabric_order_id, component_type);

-- -----------------------------------------------------------------------------
-- 4. GREIGE FABRIC INVENTORY & ROLL ALLOCATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE greige_rolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_barcode VARCHAR(50) UNIQUE NOT NULL,
    fabric_order_component_id UUID NOT NULL REFERENCES fabric_order_components(id),
    knitting_source VARCHAR(100) NOT NULL,         -- In-house Knitting, Outside Subcontract
    knitting_machine_no VARCHAR(40),
    yarn_lot_no VARCHAR(60) NOT NULL,
    yarn_brand_count VARCHAR(80),
    roll_gross_weight_kg NUMERIC(10, 2) NOT NULL,
    roll_net_weight_kg NUMERIC(10, 2) NOT NULL,
    quality_grade CHAR(1) DEFAULT 'A',             -- A, B, Rejection
    store_rack_location VARCHAR(40),               -- RACK-G-04-B
    is_allocated BOOLEAN DEFAULT FALSE,
    allocated_batch_id UUID,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_greige_rolls_comp ON greige_rolls (fabric_order_component_id, is_allocated);

-- -----------------------------------------------------------------------------
-- 5. DAILY MACHINE SCHEDULE & BATCH CREATION
-- -----------------------------------------------------------------------------
CREATE TABLE dyeing_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_no VARCHAR(60) UNIQUE NOT NULL,          -- e.g. BT-48085-01 or SWO-48085-01
    fabric_order_component_id UUID NOT NULL REFERENCES fabric_order_components(id),
    route dyeing_route NOT NULL,                   -- IN_HOUSE or SUBCONTRACT
    target_machine_id UUID REFERENCES dyeing_machines(id),
    subcontract_mill_id UUID REFERENCES subcontract_mills(id),
    planned_batch_qty_kg NUMERIC(10, 2) NOT NULL,
    greige_issued_qty_kg NUMERIC(10, 2) NOT NULL,
    liquor_ratio VARCHAR(20) DEFAULT '1:6',
    recipe_code VARCHAR(60),                       -- REC-48085-BLK
    dyeing_date DATE NOT NULL,
    dyeing_output_kg NUMERIC(10, 2) DEFAULT 0.00,
    status batch_status DEFAULT 'PLANNED',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_route_target CHECK (
        (route = 'IN_HOUSE' AND target_machine_id IS NOT NULL) OR
        (route = 'SUBCONTRACT' AND subcontract_mill_id IS NOT NULL)
    )
);

CREATE INDEX idx_batches_job_route ON dyeing_batches (route, status);

-- -----------------------------------------------------------------------------
-- 6. QUALITY LOGS (Bulk-to-Bulk RFT / NRFT Analytics)
-- -----------------------------------------------------------------------------
CREATE TABLE dyeing_quality_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dyeing_batch_id UUID NOT NULL REFERENCES dyeing_batches(id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    rft_result rft_status NOT NULL,                -- RFT, NRFT
    shade_status VARCHAR(40) NOT NULL,             -- APPROVED, TOPPING, STRIP_REDYE
    light_source_tested VARCHAR(40) DEFAULT 'D65, TL84',
    reason_of_topping VARCHAR(200),                -- Recipe problem, Shade variation, Chemical defect
    topping_recipe_code VARCHAR(60),
    additional_dye_time_min INT DEFAULT 0,
    approved_by_technologist VARCHAR(80),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. MULTI-PROCESS MOVEMENTS (AOP, Peach, Brush, Shearing, Singeing)
-- -----------------------------------------------------------------------------
CREATE TABLE multi_process_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_code VARCHAR(60) UNIQUE NOT NULL,     -- e.g. MOV-AOP-48085-01
    dyeing_batch_id UUID NOT NULL REFERENCES dyeing_batches(id),
    process_type multi_process_type NOT NULL,      -- AOP, PEACH, BRUSH, SHEARING, SINGEING
    vendor_mill_id UUID REFERENCES subcontract_mills(id),
    outward_challan_no VARCHAR(60) NOT NULL,
    outward_gate_pass_no VARCHAR(60) NOT NULL,
    send_date DATE NOT NULL,
    send_qty_kg NUMERIC(10, 2) NOT NULL,
    combo_name VARCHAR(100),                       -- Tapestry Aop, Bright White Aop
    inward_challan_no VARCHAR(60),
    receive_date DATE,
    received_qty_kg NUMERIC(10, 2) DEFAULT 0.00,
    balance_qty_kg NUMERIC(10, 2) GENERATED ALWAYS AS (send_qty_kg - received_qty_kg) STORED,
    process_loss_kg NUMERIC(10, 2) DEFAULT 0.00,
    process_loss_pct NUMERIC(5, 2) DEFAULT 0.00,
    movement_status movement_status DEFAULT 'CHALLAN_CREATED',
    strike_off_approval_date DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_multi_proc_type ON multi_process_movements (process_type, movement_status);

-- -----------------------------------------------------------------------------
-- 8. FINISHING RUNS (Slitting, Stenter, Compactor & 4-Point Inspection)
-- -----------------------------------------------------------------------------
CREATE TABLE finishing_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dyeing_batch_id UUID NOT NULL REFERENCES dyeing_batches(id),
    slitting_machine_id UUID REFERENCES dyeing_machines(id),
    slitting_date DATE,
    slitting_output_kg NUMERIC(10, 2),
    stenter_machine_id UUID REFERENCES dyeing_machines(id),
    stenter_date DATE,
    stenter_temp_celsius INT,
    stenter_speed_m_per_min NUMERIC(5, 1),
    compacting_machine_id UUID REFERENCES dyeing_machines(id),
    compacting_date DATE,
    achieved_gsm INT,
    achieved_width_dia VARCHAR(30),
    four_point_penalty_points INT DEFAULT 0,
    quality_status VARCHAR(30) DEFAULT 'PASSED',   -- PASSED, HOLD, RE-COMPACT
    inspected_by VARCHAR(80),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. FINISHED FABRIC STORE DELIVERY & CUTTING SECTION HANDOVER
-- -----------------------------------------------------------------------------
CREATE TABLE finished_fabric_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_challan_no VARCHAR(60) UNIQUE NOT NULL, -- e.g. CH-DEL-48085-01
    fabric_order_id UUID NOT NULL REFERENCES fabric_orders(id),
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    slot_no VARCHAR(40) NOT NULL,                  -- 1st Slot, 2nd Slot, 3rd Slot
    body_delivery_kg NUMERIC(10, 2) DEFAULT 0.00,
    lrib_delivery_kg NUMERIC(10, 2) DEFAULT 0.00,
    sjersey_delivery_kg NUMERIC(10, 2) DEFAULT 0.00,
    total_delivery_kg NUMERIC(10, 2) GENERATED ALWAYS AS (body_delivery_kg + lrib_delivery_kg + sjersey_delivery_kg) STORED,
    received_by_store_officer VARCHAR(80),
    handed_over_to_cutting_officer VARCHAR(80),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliv_order ON finished_fabric_deliveries (fabric_order_id, delivery_date);

-- =============================================================================
-- ESSENTIAL ANALYTICAL VIEWS
-- =============================================================================

-- View 1: Machine Loading & Capacity Utilization
CREATE OR REPLACE VIEW view_machine_capacity_utilization AS
SELECT 
    m.id AS machine_id,
    m.machine_code,
    m.machine_name,
    m.capacity_kg AS total_capacity,
    COALESCE(SUM(b.planned_batch_qty_kg), 0) AS current_loaded_kg,
    m.capacity_kg - COALESCE(SUM(b.planned_batch_qty_kg), 0) AS free_capacity_kg,
    ROUND((COALESCE(SUM(b.planned_batch_qty_kg), 0) / NULLIF(m.capacity_kg, 0)) * 100, 1) AS utilization_pct
FROM dyeing_machines m
LEFT JOIN dyeing_batches b ON m.id = b.target_machine_id 
    AND b.status IN ('PLANNED', 'LOADING', 'DYEING_RUNNING')
    AND b.dyeing_date = CURRENT_DATE
WHERE m.machine_type = 'WINCH M/C' AND m.is_active = TRUE
GROUP BY m.id, m.machine_code, m.machine_name, m.capacity_kg;

-- View 2: Subcontract WIP & Mill Balance Tracking
CREATE OR REPLACE VIEW view_subcontract_vendor_balance AS
SELECT 
    sm.id AS vendor_id,
    sm.mill_name,
    sm.mill_category,
    sm.primary_contact_person,
    sm.primary_contact_mobile,
    COUNT(mpm.id) AS total_active_movements,
    COALESCE(SUM(mpm.send_qty_kg), 0) AS total_sent_kg,
    COALESCE(SUM(mpm.received_qty_kg), 0) AS total_received_kg,
    COALESCE(SUM(mpm.balance_qty_kg), 0) AS current_vendor_balance_kg
FROM subcontract_mills sm
LEFT JOIN multi_process_movements mpm ON sm.id = mpm.vendor_mill_id 
    AND mpm.movement_status IN ('CHALLAN_CREATED', 'GATE_PASS_ISSUED', 'IN_TRANSIT', 'AT_VENDOR_MILL', 'PARTIALLY_RECEIVED')
GROUP BY sm.id, sm.mill_name, sm.mill_category, sm.primary_contact_person, sm.primary_contact_mobile;

-- View 3: Order Component Reconciliation (Zero-Collapse Verification)
CREATE OR REPLACE VIEW view_order_component_reconciliation AS
SELECT 
    fo.job_no,
    fo.buyer_name,
    fo.style_no,
    foc.component_type,
    foc.colour_name,
    foc.gsm,
    foc.width_dia,
    foc.required_qty_kg,
    foc.greige_received_kg,
    foc.dyeing_delivered_kg,
    foc.finished_delivered_kg,
    foc.balance_qty_kg,
    ROUND((foc.balance_qty_kg / NULLIF(foc.required_qty_kg, 0)) * 100, 1) AS balance_pct
FROM fabric_orders fo
JOIN fabric_order_components foc ON fo.id = foc.fabric_order_id;
```

---

## 5. Mapping Between Factory Excel Sheets & Database Schema

| Factory Excel File & Sheet | Database Table | Mapped Fields / Logic |
| :--- | :--- | :--- |
| **`DYEING PROFILE.xlsx`** (Sheet1) | `dyeing_machines` | Capacity (`45kg` to `1400kg`), M/C Type, Brand Name (`DILMENLER`, `FONGS`, `THIES`, `ACC`), Origin, Remarks |
| **`Buyer Wise Sub-Contract Dyeing Plan.xlsx`** | `subcontract_mills` | Factory Name, Category (Dyeing, AOP, Peach, Brush), Designated Buyers, Supervisor & QC Contact + Mobile, Lead Manager |
| **`Finish Fabric Plan & Execution.xls`** (September'26) | `fabric_orders`, `fabric_order_components` | Col 0: Buyer, Col 1: Job No, Col 2: Style No, Col 4: GSM, Col 5: Dia, Col 6: Colour, Col 8-11: Body/L.Rib/S.Jersey required |
| **`Finish Fabric Plan & Execution.xls`** (Knitting Recv) | `greige_rolls`, `fabric_order_components` | Col 14-16: Greige Body, L.Rib, S.Jersey received from knitting floor |
| **`Finish Fabric Plan & Execution.xls`** (Dyeing Batch) | `dyeing_batches` | Col 18: Factory (NFL vs Sub), Col 19: Batch No, Col 20: Dyeing Date, Col 24-27: Dyeing Body/Rib output |
| **`Finish Fabric Plan & Execution.xls`** (AOP/Peach/Brush) | `multi_process_movements` | Col 28-33 (AOP), Col 34-39 (Peach), Col 40-45 (Brush), Col 46-51 (Shearing), Col 52-57 (Singeing): Send Date, Qty, Receive Date, Qty, Balance |
| **`AOP Fabric Plan & Execution Schedule.xlsx`** | `multi_process_movements` | Slot Wise Combo breakdown, Dyeing Start/End, AOP Start/End, Gate Pass Challan No, Process Loss %, Laboratory shade approval |
| **`Bulk to Bulk RFT.xlsx`** | `dyeing_quality_logs` | Machine No, Batch No, Buyer, Color, RFT vs NRFT, Reason of Topping (Recipe problem, Lab variance, Chemical defect) |
| **`Finish Fabric Plan & Execution.xls`** (Delivery) | `finished_fabric_deliveries` | Col 71-77: Delivery Challan No, Delivered Body/Rib/S.Jersey, Total Delivery, Balance Qty, Balance % |

---

## 6. Verification and Integration Status

1. **Document Location**: Saved permanently in `/docs/DYEING_PROCESS_DBMS_SQL_DESIGN.md`.
2. **Next Steps**:
   - The PostgreSQL schema can be applied directly to Cloud SQL or Prisma ORM.
   - The NestJS API import pipeline in `apps/api/src/report-profiles.ts` directly populates these tables when the user uploads an Excel report.
