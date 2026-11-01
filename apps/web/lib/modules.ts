export type ModuleItem = {
  slug: string;
  name: string;
  short: string;
  icon: string;
  status: 'Live' | 'Foundation' | 'Working' | 'Planned';
  description: string;
};

export type ModuleGroup = {
  label: string;
  overviewSlug: string;
  icon?: string;
  items: ModuleItem[];
};

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Sales & Merchandising',
    overviewSlug: 'merchandising-overview',
    icon: 'hanger',
    items: [
      { slug: 'merchandising', name: 'Bulk Merchandising', short: 'BM', icon: 'shirt', status: 'Live', description: 'Enterprise operational dashboard, real-time job monitoring, priority actions, and live production pipeline.' },
      { slug: 'sample-merchandising', name: 'Sample Merchandising', short: 'SM', icon: 'dress', status: 'Working', description: 'Sample order sheets, sample development follow-up, sample approvals and sample delivery status.' },
    ],
  },
  {
    label: 'Trims & Accessories Store',
    overviewSlug: 'trims',
    icon: 'button-trim',
    items: [
      { slug: 'trims', name: 'Trims & Accessories Store', short: 'TR', icon: 'button-trim', status: 'Planned', description: 'Trims receive, stock ledger, color/size inventory, job reservation, issue to sewing floor and supplier return.' },
    ],
  },
  {
    label: 'Sample / CAD / Technical',
    overviewSlug: 'sample-cad-technical',
    icon: 'sample-room',
    items: [
      { slug: 'sample-room', name: 'Sample Room', short: 'SR', icon: 'sample-room', status: 'Live', description: 'Sample cutting, sewing, finishing, sample pattern and physical sample review.' },
      { slug: 'cad', name: 'CAD / Consumption / Pattern', short: 'CD', icon: 'measuring-tape', status: 'Foundation', description: 'Order-linked CAD consumption, color-wise fabric requirement, pattern and size-set work.' },
      { slug: 'technical', name: 'Technical / Size Set', short: 'TS', icon: 'tech-pack', status: 'Live', description: 'Technical specifications, size set cutting/sewing/wash, fit review, and bulk file handover status.' },
    ],
  },
  {
    label: 'Central Planning',
    overviewSlug: 'central-planning',
    icon: 'planning',
    items: [
      { slug: 'ta', name: 'Time & Action & Control Tower', short: 'TA', icon: 'stopwatch', status: 'Live', description: 'Backward T&A engine, Plan vs Actual, Critical Path & Shipment Risk, Fabric/Trims Weekly Follow-up.' },
      { slug: 'planning-approvals', name: 'Approval Desk & Release', short: 'AD', icon: 'approval', status: 'Live', description: 'Physical signed copy verification, Merchandiser return, and colour × part Finish/Grey Kg release to Knitting & Dyeing.' },
      { slug: 'capacity', name: 'Capacity & Holiday Calendar', short: 'CB', icon: 'calendar', status: 'Live', description: '10-day slot-wise and section-wise capacity heatmaps with Sunday weekly holiday and Eid/closure holiday calendar.' },
      { slug: 'sewing-planning', name: 'Sewing Line Gantt', short: 'LP', icon: 'gantt', status: 'Live', description: 'Drag-and-drop Gantt, line allocation, machine capacity validation, baseline versioning and plan vs actual.' },
      { slug: 'subcontract', name: 'Subcontract / Print-Emb Follow-up', short: 'SC', icon: 'subcontract', status: 'Live', description: 'Outside Print, Embroidery & Wash work order dispatch, challan receive, reject and balance follow-up.' },
    ],
  },
  {
    label: 'Yarn Store & Knitting',
    overviewSlug: 'yarn-knitting',
    icon: 'yarn-cone',
    items: [
      { slug: 'yarn', name: 'Yarn Management & Purchasing', short: 'YM', icon: 'yarn-cone', status: 'Live', description: 'Merchandising requisition receipt, spinning mill PO purchasing, safety stock buffer monitoring, GRN receive and issue to knitting.' },
      { slug: 'yarn-store', name: 'Yarn Store & Inventory', short: 'YS', icon: 'yarn-store', status: 'Live', description: 'Warehouse Godown A/B stock ledger, lot/location tracking, GRN vehicle intake and Knitting delivery challan.' },
      { slug: 'knitting', name: 'Knitting Operations', short: 'KN', icon: 'knitting', status: 'Live', description: 'Circular and flat knitting programs, machine programs, greige roll production and yarn leftover returns.' },
    ],
  },
  {
    label: 'Greige Fabric Store',
    overviewSlug: 'greige-store',
    icon: 'fabric-roll',
    items: [
      { slug: 'greige-store', name: 'Greige Fabric Store', short: 'GS', icon: 'fabric-roll', status: 'Live', description: 'Greige roll receipt, 4-point inspection, fabric aging, daily machine plan matching and issue to Dyeing Winches.' },
    ],
  },
  {
    label: 'Dyeing',
    overviewSlug: 'dyeing',
    icon: 'dyeing',
    items: [
      { slug: 'dyeing', name: 'Dyeing Planning', short: 'DP', icon: 'dyeing', status: 'Live', description: '23 Winch & HTHP batch planning, multi-process (Peach, Brush, AOP), RFT quality, recipe issue and dye lot programming.' },
      { slug: 'dyeing-machine-loading', name: 'Machine Loading Plan', short: 'ML', icon: 'machine-loading', status: 'Live', description: 'Winch & HTHP machine allocation, loading schedule, cycle time, nozzling and floor capacity balancing.' },
      { slug: 'fabric-finishing', name: 'Finish Fabric Plan & Execution', short: 'FP', icon: 'stenter', status: 'Planned', description: 'Post-dyeing finishing processes, stenter & compactor output, width, GSM and moisture control.' },
    ],
  },
  {
    label: 'Fabric Quality',
    overviewSlug: 'fabric-quality',
    icon: 'quality',
    items: [
      { slug: 'fabric-quality', name: 'Fabric Quality Management', short: 'FQ', icon: 'quality', status: 'Live', description: 'Centralized fabric quality management for Knitting Quality, Greige Fabric Quality and Dyeing Quality.' },
    ],
  },
  {
    label: 'Finish Fabric Store',
    overviewSlug: 'finished-fabric',
    icon: 'finish-fabric',
    items: [
      { slug: 'finished-fabric', name: 'Finish Fabric Store', short: 'FS', icon: 'finish-fabric', status: 'Live', description: 'Finished fabric inventory, 4-point inspection, roll barcodes and delivery challan to cutting.' },
    ],
  },
  {
    label: 'Cutting & Input Management',
    overviewSlug: 'cutting',
    icon: 'cutting',
    items: [
      { slug: 'cutting', name: 'Cutting & Input Management', short: 'CT', icon: 'cutting', status: 'Live', description: 'Cuttable gate, interactive Cut Planner, marker lay planning, daily cut production and 48h sewing input feeding.' },
    ],
  },
  {
    label: 'Printing Operations',
    overviewSlug: 'printing',
    icon: 'screen-print',
    items: [
      { slug: 'printing', name: 'Printing Operations', short: 'PT', icon: 'screen-print', status: 'Live', description: 'In-house screen & rotary print tables, multi-vendor outsource challan dispatch, return and strike-off quality.' },
    ],
  },
  {
    label: 'Embroidery Operations',
    overviewSlug: 'embroidery',
    icon: 'embroidery',
    items: [
      { slug: 'embroidery', name: 'Embroidery Operations', short: 'EM', icon: 'embroidery', status: 'Live', description: 'In-house multi-head embroidery machines, outsource vendor challan dispatch, return and stitch counters.' },
    ],
  },
  {
    label: 'Sewing & Finishing',
    overviewSlug: 'sewing',
    icon: 'sewing',
    items: [
      { slug: 'sewing', name: 'Sewing Operations', short: 'SW', icon: 'sewing', status: 'Planned', description: 'Line input feeding, actual hourly production, floor supervisor follow-up and line balancing.' },
      { slug: 'finishing', name: 'Finishing & Packing', short: 'FP', icon: 'shirt', status: 'Planned', description: 'Ironing, folding, poly packing, carton audit and final ex-factory readiness.' },
    ],
  },
  {
    label: 'Garment Quality',
    overviewSlug: 'garment-quality',
    icon: 'quality',
    items: [
      { slug: 'quality', name: 'Quality Management & DHU', short: 'QM', icon: 'quality', status: 'Foundation', description: 'DHU, OQL, inspections, testing links and section-wise job quality remarks/history.' },
      { slug: 'quality-history', name: 'Job Quality History', short: 'QH', icon: 'quality-history', status: 'Foundation', description: 'Job-wise section/floor quality release, observations, holds and testing-lab links.' },
    ],
  },
  {
    label: 'Industrial & Production Engineering',
    overviewSlug: 'ie-overview',
    icon: 'ie',
    items: [
      { slug: 'kpi-board', name: 'KPI Data Entry & Board', short: 'KP', icon: 'kpi', status: 'Live', description: 'Central factory KPI entry, section pull (Knitting, Dyeing, Sewing) and monthly KPI charts.' },
      { slug: 'ie-bulletin', name: 'IE Bulletin & Follow-up', short: 'IB', icon: 'bulletin', status: 'Working', description: 'Bulk IE bulletin import, Central IE follow-up, SMV, target, manpower and machine type requirement.' },
      { slug: 'ie-daily-target', name: 'Target Giving', short: 'TG', icon: 'target', status: 'Working', description: 'Floor/line/job-wise daily target giving with WIP, normal/short job logic and released official target.' },
      { slug: 'ie-mis-import', name: 'Daily MIS Import', short: 'MI', icon: 'import', status: 'Working', description: 'Import manual Daily MIS Excel as the historical production, efficiency, manpower, OT and cost data source.' },
      { slug: 'ie-npt', name: 'NPT', short: 'NP', icon: 'npt', status: 'Working', description: 'NPT import/manual entry, Pareto, line/date trend and machine breakdown analysis.' },
      { slug: 'ie-qco', name: 'Quick Changeover', short: 'QC', icon: 'qco', status: 'Working', description: 'QCO status, SMV-wise customizable standard time, actual loss and failure reason.' },
      { slug: 'ie-line-performance', name: 'Line-wise Performance', short: 'LP', icon: 'performance', status: 'Working', description: 'Floor/line/month/custom-date SMV vs efficiency trends with NPT/QCO hover context.' },
      { slug: 'ie-responsibility', name: 'Responsible Person Master', short: 'RP', icon: 'operator', status: 'Working', description: 'Floor, area and line responsibility for Production, Quality and IE with effective dates.' },
      { slug: 'ie-skill-matrix', name: 'Skill Matrix', short: 'SK', icon: 'skill-matrix', status: 'Working', description: 'Operator skill matrix by operation, machine type, proficiency and line/floor.' },
      { slug: 'ie-production-checkpoints', name: 'Production Checkpoints', short: 'PC', icon: 'checkpoints', status: 'Working', description: '1st Hour, 4th Hour, 8th Hour and OT production checkpoints with target vs actual.' },
      { slug: 'ie-reports', name: 'IE Reports', short: 'IR', icon: 'report', status: 'Planned', description: 'IE Bulletin, target, NPT, skill matrix and checkpoint reports.' },
    ],
  },
  {
    label: 'MIS & IT',
    overviewSlug: 'mis-it',
    icon: 'floor-tv',
    items: [
      { slug: 'floor-display', name: 'Floor / TV Live Display', short: 'TV', icon: 'floor-tv', status: 'Foundation', description: 'Configurable production and quality TV widgets for factory floor.' },
      { slug: 'reports', name: 'Reports & Analytics', short: 'RA', icon: 'report', status: 'Planned', description: 'Role-relevant operational reports and management analytics.' },
      { slug: 'data-import', name: 'Excel Import & Running Data', short: 'XL', icon: 'import', status: 'Foundation', description: 'Admin-controlled Excel/XLS import, preview, mapping, validation, batch commit and rollback.' },
      { slug: 'maintenance', name: 'Machine Utilization & Engineering', short: 'MT', icon: 'maintenance', status: 'Live', description: 'Machine master, daily utilization, IE/Gantt running requirement, idle/shortage and changeover add/remove action.' },
    ],
  },
  {
    label: 'HR, Admin & Compliance',
    overviewSlug: 'hr-admin-compliance',
    icon: 'compliance',
    items: [
      { slug: 'administration', name: 'Users, Roles & Permissions', short: 'AD', icon: 'admin', status: 'Foundation', description: 'User access, section/floor scope, job ownership, roles, permissions and audit.' },
      { slug: 'masters', name: 'Masters & Configuration', short: 'MC', icon: 'masters', status: 'Foundation', description: 'Factory, section, floor, line, dropdown masters, job sequence and capacity policies.' },
      { slug: 'shipment', name: 'Shipment & Commercial Dispatch', short: 'SH', icon: 'shipment', status: 'Planned', description: 'Shipment schedule, export/commercial follow-up and delivery status.' },
    ],
  },
];

export const MODULES = MODULE_GROUPS.flatMap((group) => group.items);

export function getModule(slug: string) {
  return MODULES.find((item) => item.slug === slug) || null;
}

export type SectionOverview = {
  slug: string;
  label: string;
  short: string;
  description: string;
  representativeSlug: string;
};

export const SECTION_OVERVIEWS: SectionOverview[] = [
  { slug: 'management', label: 'Management', short: 'MG', description: 'Factory KPIs, order pipeline, delivery risk and executive register.', representativeSlug: 'shipment' },
  { slug: 'merchandising-overview', label: 'Sales & Merchandising', short: 'SM', description: 'Order execution, follow-up, bulk and sample merchandising.', representativeSlug: 'merchandising' },
  { slug: 'trims', label: 'Trims & Accessories Store', short: 'TR', description: 'Trims receive, stock, issue, in-house status and job readiness.', representativeSlug: 'trims' },
  { slug: 'sample-cad-technical', label: 'Sample / CAD / Technical', short: 'SC', description: 'Sample, CAD consumption and technical files.', representativeSlug: 'sample-room' },
  { slug: 'central-planning', label: 'Planning', short: 'CP', description: 'T&A, capacity and sewing line planning.', representativeSlug: 'sewing-planning' },
  { slug: 'yarn-knitting', label: 'Yarn Store & Knitting', short: 'YK', description: 'Yarn, knitting, inventory and spinning mill purchase.', representativeSlug: 'yarn' },
  { slug: 'greige-store', label: 'Greige Fabric Store', short: 'GS', description: 'Greige roll receipt, 4-point inspection and issue to Dyeing.', representativeSlug: 'greige-store' },
  { slug: 'dyeing', label: 'Dyeing', short: 'DY', description: '23 winches & HTHP, dyeing planning, machine loading and finish fabric execution.', representativeSlug: 'dyeing' },
  { slug: 'fabric-quality', label: 'Fabric Quality', short: 'FQ', description: 'Centralized fabric quality management across Knitting, Greige and Dyeing stages.', representativeSlug: 'fabric-quality' },
  { slug: 'finished-fabric', label: 'Finish Fabric Store', short: 'FS', description: 'Finished fabric inventory, 4-point inspection and roll delivery.', representativeSlug: 'finished-fabric' },
  { slug: 'cutting', label: 'Cutting & Input Management', short: 'CT', description: 'Cuttable gate, interactive Cut Planner, lay spreading and sewing input buffer.', representativeSlug: 'cutting' },
  { slug: 'printing', label: 'Printing Operations', short: 'PT', description: 'In-house and outsource print dispatch, receive and strike-off quality.', representativeSlug: 'printing' },
  { slug: 'embroidery', label: 'Embroidery Operations', short: 'EM', description: 'Multi-head embroidery execution and vendor follow-up.', representativeSlug: 'embroidery' },
  { slug: 'sewing', label: 'Sewing & Finishing', short: 'SF', description: 'Sewing lines, line balancing, finishing, poly and packing.', representativeSlug: 'sewing' },
  { slug: 'garment-quality', label: 'Garment Quality', short: 'GQ', description: 'Quality inspections, DHU, line quality and testing records.', representativeSlug: 'quality' },
  { slug: 'ie-overview', label: 'Industrial & Production Engineering', short: 'IE', description: 'IE bulletin, line targets, NPT and factory KPIs.', representativeSlug: 'ie-bulletin' },
  { slug: 'mis-it', label: 'MIS & IT', short: 'MI', description: 'Floor TV display, reports, Excel import and machine utilization.', representativeSlug: 'floor-display' },
  { slug: 'hr-admin-compliance', label: 'HR, Admin & Compliance', short: 'HR', description: 'Users, permissions, factory masters and commercial shipment dispatch.', representativeSlug: 'administration' },
];

export function getSectionOverview(slug: string) {
  return SECTION_OVERVIEWS.find((x) => x.slug === slug) || null;
}
