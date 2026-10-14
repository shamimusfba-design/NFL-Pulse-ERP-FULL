export type ModuleItem = {
  slug: string;
  name: string;
  short: string;
  status: 'Live' | 'Foundation' | 'Working' | 'Planned';
  description: string;
};

export type ModuleGroup = {
  label: string;
  overviewSlug: string;
  items: ModuleItem[];
};

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Management',
    overviewSlug: 'management',
    items: [
      { slug: 'job-360', name: 'Job 360', short: 'J3', status: 'Foundation', description: 'One job view across order, material, production, quality, T&A and shipment.' },
      { slug: 'kpi-board', name: 'KPI Board', short: 'KP', status: 'Working', description: 'Auto + manual KPI values, monthly board readiness and print-oriented KPI charts.' },
      { slug: 'kaizen', name: 'Kaizen', short: 'KZ', status: 'Working', description: 'Kaizen submit, review, implement, sustain/spread and KPI saving history.' },
    ],
  },
  {
    label: 'Merchandising',
    overviewSlug: 'merchandising-overview',
    items: [
      { slug: 'merchandising', name: 'Bulk Merchandising Dashboard', short: 'BM', status: 'Live', description: 'Enterprise operational dashboard, real-time job monitoring, priority actions, and live production pipeline.' },
      { slug: 'order-entry', name: 'Order Entry & PO Import', short: 'OE', status: 'Live', description: 'Direct buyer order creation, Bestseller & OVS PO import, color × size matrix, and job sequence allocation.' },
      { slug: 'bulk-followup', name: 'Bulk Follow-up & Revisions', short: 'BF', status: 'Live', description: 'Buyer PO/Market order foundation, follow-up, production-lot links, documents and production status.' },
      { slug: 'production-lots', name: 'PO / Market Production Lots', short: 'PL', status: 'Live', description: 'Select PO or OVS market scope, combine Color × Size, reserve quantity and release production lots.' },
      { slug: 'projection', name: 'Merchandising Projection', short: 'PR', status: 'Planned', description: 'Pre-order projection and yarn forecast requirements.' },
      { slug: 'sample-merchandising', name: 'Sample Follow-up', short: 'SF', status: 'Working', description: 'Sample Dashboard, Manual/SO entry, Sample Report, colour-wise quantities, Present Status and Approval Status.' },
      { slug: 'forms-print', name: 'Forms & Print Documents', short: 'FM', status: 'Live', description: 'Locked company-standard SMS, T&A/TNF and bulk fabric order forms with whole-style or Production-Lot A4 printing.' },
    ],
  },
  {
    label: 'Sample / CAD / Technical',
    overviewSlug: 'sample-cad-technical',
    items: [
      { slug: 'central-sample', name: 'Central Sample Department', short: 'CS', status: 'Planned', description: 'Sample cutting, sewing, finishing and final delivery.' },
      { slug: 'sample-fabric-store', name: 'Sample Finish Fabric Store', short: 'SF', status: 'Planned', description: 'Sample finished fabric receive, issue, balance and handover.' },
      { slug: 'cad', name: 'CAD / Consumption / Pattern', short: 'CD', status: 'Foundation', description: 'Order-linked CAD consumption, color-wise fabric requirement, pattern and size-set work.' },
      { slug: 'technical', name: 'Technical / File Handover', short: 'TC', status: 'Planned', description: 'Technical files, specifications and handover status connected to sample and bulk jobs.' },
    ],
  },
  {
    label: 'Central Planning',
    overviewSlug: 'central-planning',
    items: [
      { slug: 'ta', name: 'Time & Action Planning', short: 'TA', status: 'Foundation', description: 'Central Planning issued T&A with capacity-aware dates and milestone tracking.' },
      { slug: 'capacity', name: 'Capacity Balancing', short: 'CB', status: 'Foundation', description: 'Slot-wise and section-wise capacity heatmaps for bulk and sample.' },
      { slug: 'sewing-planning', name: 'Sewing Line Planning', short: 'LP', status: 'Foundation', description: 'Drag-and-drop Gantt, line allocation, plan revision and plan vs actual.' },
      { slug: 'subcontract', name: 'Subcontract / Outside Process Planning', short: 'SC', status: 'Planned', description: 'Outside process planning, work-order dependency and return follow-up.' },
      { slug: 'lead-time-history', name: 'Lead Time & Delivery History', short: 'LT', status: 'Foundation', description: 'Job-wise planned vs actual section lead time, production delivery, variance days and delay reason.' },
    ],
  },
  {
    label: 'IE / Industrial Engineering',
    overviewSlug: 'ie-overview',
    items: [
      { slug: 'kpi-board', name: 'KPI Data Entry & Board', short: 'KP', status: 'Live', description: 'Central factory KPI entry, section pull (Knitting, Dyeing, Sewing) and monthly KPI charts.' },
      { slug: 'ie-bulletin', name: 'IE Bulletin & Follow-up', short: 'IB', status: 'Working', description: 'Bulk IE bulletin import, Central IE follow-up, SMV, target, manpower and machine type requirement released to Planning/Gantt.' },
      { slug: 'ie-daily-target', name: 'Target Giving', short: 'TG', status: 'Working', description: 'Floor/line/job-wise daily target giving with WIP, normal/short job logic and released official target.' },
      { slug: 'ie-mis-import', name: 'Daily MIS Import', short: 'MI', status: 'Working', description: 'Import manual Daily MIS Excel as the historical production, efficiency, manpower, OT and cost data source.' },
      { slug: 'ie-npt', name: 'NPT', short: 'NP', status: 'Working', description: 'NPT import/manual entry, Pareto, line/date trend and machine breakdown analysis.' },
      { slug: 'ie-qco', name: 'Quick Changeover', short: 'QC', status: 'Working', description: 'QCO status, SMV-wise customizable standard time, actual loss and failure reason.' },
      { slug: 'ie-line-performance', name: 'Line-wise Performance', short: 'LP', status: 'Working', description: 'Floor/line/month/custom-date SMV vs efficiency trends with NPT/QCO hover context.' },
      { slug: 'ie-responsibility', name: 'Responsible Person Master', short: 'RP', status: 'Working', description: 'Floor, area and line responsibility for Production, Quality and IE with effective dates.' },
      { slug: 'ie-skill-matrix', name: 'Skill Matrix', short: 'SK', status: 'Working', description: 'Operator skill matrix by operation, machine type, proficiency and line/floor.' },
      { slug: 'ie-production-checkpoints', name: 'Production Checkpoints', short: 'PC', status: 'Working', description: '1st Hour, 4th Hour, 8th Hour and OT production checkpoints with target vs actual.' },
      { slug: 'ie-reports', name: 'IE Reports', short: 'IR', status: 'Planned', description: 'IE Bulletin, target, NPT, skill matrix and checkpoint reports.' },
    ],
  },
  {
    label: 'Yarn & Fabric',
    overviewSlug: 'yarn-fabric',
    items: [
      { slug: 'yarn', name: 'Yarn Management & Purchasing', short: 'YM', status: 'Live', description: 'Merchandising requisition receipt, spinning mill PO purchasing, safety stock buffer monitoring, GRN receive and issue to knitting.' },
      { slug: 'yarn-store', name: 'Yarn Store & Inventory', short: 'YS', status: 'Live', description: 'Warehouse Godown A/B stock ledger, lot/location tracking, GRN vehicle intake and Knitting delivery challan.' },
      { slug: 'knitting', name: 'Knitting Operations', short: 'KN', status: 'Live', description: 'Circular and flat knitting programs, machine programs, greige roll production and yarn leftover returns.' },
      { slug: 'greige-store', name: 'Greige Fabric Store', short: 'GS', status: 'Live', description: 'Greige roll receipt, 4-point inspection, fabric aging, daily machine plan matching and issue to Dyeing Winches.' },
      { slug: 'dyeing', name: 'Dyeing Floor & Winches', short: 'DY', status: 'Live', description: '23 Winch & HTHP machines, batching, multi-process (Peach, Brush, AOP), RFT quality, stenter & compactor finishing.' },
      { slug: 'lab', name: 'Lab & Testing', short: 'LB', status: 'Live', description: '3-Stage validation: Stage 1 Before Dyeing (Yarn/Dip), Stage 2 Before Bulk (Pilot trial), Stage 3 Testing Before Delivery (COA).' },
      { slug: 'fabric-finishing', name: 'Fabric Finishing', short: 'FF', status: 'Planned', description: 'Post-dyeing finishing processes, stenter and compactor output.' },
      { slug: 'finished-fabric', name: 'Finished Fabric Store', short: 'FS', status: 'Live', description: 'Finished fabric inventory, 4-point inspection, roll barcodes and delivery challan to cutting.' },
    ],
  },
  {
    label: 'Garment Production',
    overviewSlug: 'garment-production',
    items: [
      { slug: 'cutting', name: 'Cutting & Input Management', short: 'CT', status: 'Planned', description: 'Cuttable, daily cut plan, cutting execution and input follow-up.' },
      { slug: 'printing', name: 'Printing Operations', short: 'PT', status: 'Live', description: 'In-house screen & rotary print tables, multi-vendor outsource challan dispatch, return and strike-off quality.' },
      { slug: 'embroidery', name: 'Embroidery Operations', short: 'EM', status: 'Live', description: 'In-house multi-head embroidery machines, outsource vendor challan dispatch, return and stitch counters.' },
      { slug: 'special-process', name: 'Special Processes', short: 'SP', status: 'Planned', description: 'Sequins, wash and other configurable garment processes.' },
      { slug: 'sewing', name: 'Sewing', short: 'SW', status: 'Planned', description: 'Input, line production, execution and production status.' },
      { slug: 'finishing', name: 'Finishing & Packing', short: 'FP', status: 'Planned', description: 'Finishing, packing, poly/carton status and shipment readiness.' },
    ],
  },
  {
    label: 'Quality & Stores',
    overviewSlug: 'quality-stores',
    items: [
      { slug: 'quality', name: 'Quality Management', short: 'QM', status: 'Foundation', description: 'DHU, OQL, inspections, testing links and optional section-wise job quality remarks/history.' },
      { slug: 'quality-history', name: 'Job Quality History', short: 'QH', status: 'Foundation', description: 'Job-wise section/floor quality release, observations, holds and testing-lab links.' },
      { slug: 'trims', name: 'Trims & Accessories Store', short: 'TR', status: 'Planned', description: 'Trims receive, stock, issue, in-house status and job readiness.' },
      { slug: 'inventory', name: 'General Stores & Inventory', short: 'IN', status: 'Planned', description: 'General store movements, stock controls and ledgers.' },
    ],
  },
  {
    label: 'Maintenance & Engineering',
    overviewSlug: 'maintenance',
    items: [
      { slug: 'maintenance', name: 'Machine Utilization & Requirement', short: 'MT', status: 'Live', description: 'Machine master, daily utilization, IE/Gantt running requirement, idle/shortage and changeover add/remove action.' },
    ],
  },
  {
    label: 'Shipment & System',
    overviewSlug: 'shipment-system',
    items: [
      { slug: 'shipment', name: 'Shipment & Commercial', short: 'SH', status: 'Planned', description: 'Shipment schedule, export/commercial follow-up and delivery status.' },
      { slug: 'reports', name: 'Reports & Analytics', short: 'RA', status: 'Planned', description: 'Role-relevant operational reports and management analytics.' },
      { slug: 'floor-display', name: 'Floor / TV Live Display', short: 'TV', status: 'Foundation', description: 'Configurable production and quality TV widgets.' },
      { slug: 'masters', name: 'Masters & Configuration', short: 'MC', status: 'Foundation', description: 'Factory, section, floor, line, dropdown masters, job sequence and capacity policies.' },
      { slug: 'data-import', name: 'Excel Import & Running Data', short: 'XL', status: 'Foundation', description: 'Admin-controlled Excel/XLS import, preview, mapping, validation, batch commit and rollback for running section data.' },
      { slug: 'administration', name: 'Users, Roles & Permissions', short: 'AD', status: 'Foundation', description: 'User access, section/floor scope, job ownership, roles, permissions and audit.' },
    ],
  },
];

export const MODULES = MODULE_GROUPS.flatMap((group) => group.items);

export function getModule(slug: string) {
  return MODULES.find((item) => item.slug === slug) || null;
}


export type SectionOverview = {
  slug:string;
  label:string;
  short:string;
  description:string;
  representativeSlug:string;
};

export const SECTION_OVERVIEWS: SectionOverview[] = [
  {slug:'management',label:'Management',short:'MG',description:'Factory KPIs, order pipeline, delivery risk and executive register.',representativeSlug:'shipment'},
  {slug:'merchandising-overview',label:'Merchandising',short:'ME',description:'Order execution, follow-up, production lots and forms.',representativeSlug:'merchandising'},
  {slug:'sample-cad-technical',label:'Sample & CAD',short:'SC',description:'Sample, CAD consumption and technical files.',representativeSlug:'central-sample'},
  {slug:'central-planning',label:'Planning',short:'CP',description:'T&A, capacity and sewing line planning.',representativeSlug:'sewing-planning'},
  {slug:'ie-overview',label:'IE',short:'IE',description:'IE bulletin, line targets, NPT and factory KPIs.',representativeSlug:'ie-bulletin'},
  {slug:'yarn-fabric',label:'Knitting & Dyeing',short:'YF',description:'Yarn, knitting, dyeing and fabric finishing.',representativeSlug:'yarn'},
  {slug:'garment-production',label:'Sewing & Finishing',short:'GP',description:'Cutting, sewing, print, embroidery and packing.',representativeSlug:'sewing'},
  {slug:'quality-stores',label:'Quality & Stores',short:'QS',description:'Quality inspections, trims and store stocks.',representativeSlug:'quality'},
  {slug:'shipment-system',label:'Shipment',short:'SS',description:'Shipment schedule and commercial dispatch.',representativeSlug:'shipment'},
];

export function getSectionOverview(slug:string){ return SECTION_OVERVIEWS.find(x=>x.slug===slug)||null; }
