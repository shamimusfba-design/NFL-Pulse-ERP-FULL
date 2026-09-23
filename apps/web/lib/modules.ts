export type ModuleItem = {
  slug: string;
  name: string;
  short: string;
  status: 'Live' | 'Foundation' | 'Planned';
  description: string;
};

export type ModuleGroup = {
  label: string;
  items: ModuleItem[];
};

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Management',
    items: [
      { slug: 'management', name: 'Management Dashboard & MIS', short: 'MG', status: 'Foundation', description: 'Executive overview, factory performance, capacity, shipment risk, quality and critical exceptions.' },
      { slug: 'job-360', name: 'Job 360', short: 'J3', status: 'Foundation', description: 'One job view across order, material, production, quality, T&A and shipment.' },
    ],
  },
  {
    label: 'Merchandising',
    items: [
      { slug: 'merchandising', name: 'Bulk Merchandising', short: 'ME', status: 'Foundation', description: 'PO-based bulk follow-up, merchandising checkpoints, printable job documents and production status.' },
      { slug: 'projection', name: 'Merchandising Projection', short: 'PR', status: 'Planned', description: 'Pre-order projection and yarn forecast requirements.' },
      { slug: 'sample-merchandising', name: 'Sample Merchandising', short: 'SM', status: 'Planned', description: 'Costing, lab dip, sample follow-up, buyer comments and approvals.' },
    ],
  },
  {
    label: 'Sample / CAD / Technical',
    items: [
      { slug: 'central-sample', name: 'Central Sample Department', short: 'CS', status: 'Planned', description: 'Sample cutting, sewing, finishing and final delivery.' },
      { slug: 'sample-fabric-store', name: 'Sample Finish Fabric Store', short: 'SF', status: 'Planned', description: 'Sample finished fabric receive, issue, balance and handover.' },
      { slug: 'cad', name: 'CAD / Consumption / Pattern', short: 'CD', status: 'Foundation', description: 'Order-linked CAD consumption, color-wise fabric requirement, pattern and size-set work.' },
      { slug: 'technical', name: 'Technical / File Handover', short: 'TC', status: 'Planned', description: 'Technical files, specifications and handover status connected to sample and bulk jobs.' },
    ],
  },
  {
    label: 'Central Planning',
    items: [
      { slug: 'ta', name: 'Time & Action Planning', short: 'TA', status: 'Foundation', description: 'Central Planning issued T&A with capacity-aware dates and milestone tracking.' },
      { slug: 'capacity', name: 'Capacity Balancing', short: 'CB', status: 'Foundation', description: 'Slot-wise and section-wise capacity heatmaps for bulk and sample.' },
      { slug: 'sewing-planning', name: 'Sewing Line Planning', short: 'LP', status: 'Foundation', description: 'Drag-and-drop Gantt, line allocation, plan revision and plan vs actual.' },
      { slug: 'subcontract', name: 'Subcontract / Outside Process Planning', short: 'SC', status: 'Planned', description: 'Outside process planning, work-order dependency and return follow-up.' },
      { slug: 'lead-time-history', name: 'Lead Time & Delivery History', short: 'LT', status: 'Foundation', description: 'Job-wise planned vs actual section lead time, production delivery, variance days and delay reason.' },
    ],
  },
  {
    label: 'Industrial Production Engineering',
    items: [
      { slug: 'ie-overview', name: 'IE Overview', short: 'IO', status: 'Foundation', description: 'IE workload, pending bulletins, target readiness, NPT and production checkpoint summary.' },
      { slug: 'ie-bulletin', name: 'IE / Operation Bulletin', short: 'IB', status: 'Foundation', description: 'Order-created IE pending queue, item image / sample reference, SMV, manpower, machine and achievable efficiency entry.' },
      { slug: 'ie-daily-target', name: 'Daily Target', short: 'DT', status: 'Planned', description: 'Job and line daily target control based on approved IE bulletin and production plan.' },
      { slug: 'ie-npt', name: 'NPT', short: 'NP', status: 'Planned', description: 'Non-productive time entry, reason-wise analysis, responsibility and recovery follow-up.' },
      { slug: 'ie-skill-matrix', name: 'Skill Matrix', short: 'SK', status: 'Planned', description: 'Operator skill matrix by operation, machine type, proficiency and line/floor.' },
      { slug: 'ie-production-checkpoints', name: 'Production Checkpoints', short: 'PC', status: 'Planned', description: '1st Hour, 4th Hour, 8th Hour and OT production checkpoints with target vs actual.' },
      { slug: 'ie-reports', name: 'IE Reports', short: 'IR', status: 'Planned', description: 'IE Bulletin, target, NPT, skill matrix and checkpoint reports.' },
    ],
  },
  {
    label: 'Yarn & Fabric',
    items: [
      { slug: 'yarn', name: 'Yarn Management', short: 'YM', status: 'Planned', description: 'Forecast, safety stock, pipeline, purchase follow-up, stock risk and tasks.' },
      { slug: 'procurement', name: 'Procurement / SCM', short: 'SCM', status: 'Planned', description: 'Purchase requirement, supplier, PI, LC, ETD, ETA and arrival follow-up.' },
      { slug: 'yarn-store', name: 'Yarn Store', short: 'YS', status: 'Planned', description: 'Yarn receive, issue, lot/location stock and ledger.' },
      { slug: 'yarn-dyeing', name: 'Yarn Dyeing', short: 'YD', status: 'Planned', description: 'Grey yarn sent, dyed yarn receive, issue and balance.' },
      { slug: 'knitting', name: 'Knitting', short: 'KN', status: 'Planned', description: 'Bulk and sample knitting plan, machine program, readiness and actual production.' },
      { slug: 'greige-store', name: 'Greige Fabric Store', short: 'GS', status: 'Planned', description: 'Greige receive, issue, stock and job-wise fabric position.' },
      { slug: 'dyeing', name: 'Dyeing', short: 'DY', status: 'Planned', description: 'Bulk/sample dyeing plan, execution, RFT, reprocess and delivery performance.' },
      { slug: 'lab', name: 'Lab & Testing', short: 'LB', status: 'Planned', description: 'Testing reports, test result history and release status.' },
      { slug: 'fabric-finishing', name: 'Fabric Finishing / AOP / Brush / Peach', short: 'FF', status: 'Planned', description: 'Configurable post-dyeing processes and finishing execution.' },
      { slug: 'finished-fabric', name: 'Finished Fabric Store', short: 'FS', status: 'Planned', description: 'Finished fabric receive, stock, issue and cutting readiness.' },
    ],
  },
  {
    label: 'Garment Production',
    items: [
      { slug: 'cutting', name: 'Cutting & Input Management', short: 'CT', status: 'Planned', description: 'Cuttable, daily cut plan, cutting execution and input follow-up.' },
      { slug: 'printing', name: 'Printing', short: 'PT', status: 'Planned', description: 'Bulk/sample print send, receive, balance and production follow-up.' },
      { slug: 'embroidery', name: 'Embroidery', short: 'EM', status: 'Planned', description: 'Bulk/sample embroidery send, receive, balance and production follow-up.' },
      { slug: 'special-process', name: 'Special Processes', short: 'SP', status: 'Planned', description: 'Sequins, wash and other configurable garment processes.' },
      { slug: 'sewing', name: 'Sewing', short: 'SW', status: 'Planned', description: 'Input, line production, execution and production status.' },
      { slug: 'finishing', name: 'Finishing & Packing', short: 'FP', status: 'Planned', description: 'Finishing, packing, poly/carton status and shipment readiness.' },
    ],
  },
  {
    label: 'Quality & Stores',
    items: [
      { slug: 'quality', name: 'Quality Management', short: 'QM', status: 'Foundation', description: 'DHU, OQL, inspections, testing links and optional section-wise job quality remarks/history.' },
      { slug: 'quality-history', name: 'Job Quality History', short: 'QH', status: 'Foundation', description: 'Job-wise section/floor quality release, observations, holds and testing-lab links.' },
      { slug: 'trims', name: 'Trims & Accessories Store', short: 'TR', status: 'Planned', description: 'Trims receive, stock, issue, in-house status and job readiness.' },
      { slug: 'inventory', name: 'General Stores & Inventory', short: 'IN', status: 'Planned', description: 'General store movements, stock controls and ledgers.' },
    ],
  },
  {
    label: 'Shipment & System',
    items: [
      { slug: 'shipment', name: 'Shipment & Commercial', short: 'SH', status: 'Planned', description: 'Shipment schedule, export/commercial follow-up and delivery status.' },
      { slug: 'reports', name: 'Reports & Analytics', short: 'RA', status: 'Planned', description: 'Role-relevant operational reports and management analytics.' },
      { slug: 'floor-display', name: 'Floor / TV Live Display', short: 'TV', status: 'Foundation', description: 'Configurable production and quality TV widgets.' },
      { slug: 'masters', name: 'Masters & Configuration', short: 'MC', status: 'Foundation', description: 'Factory, section, floor, line, dropdown masters, job sequence and capacity policies.' },
      { slug: 'administration', name: 'Users, Roles & Permissions', short: 'AD', status: 'Foundation', description: 'User access, section/floor scope, job ownership, roles, permissions and audit.' },
    ],
  },
];

export const MODULES = MODULE_GROUPS.flatMap((group) => group.items);

export function getModule(slug: string) {
  return MODULES.find((item) => item.slug === slug) || null;
}
