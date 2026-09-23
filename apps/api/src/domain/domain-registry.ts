export type DomainModuleStatus = 'FOUNDATION' | 'NEXT' | 'BLUEPRINT';

export interface DomainModuleDefinition {
  slug: string;
  name: string;
  group: string;
  status: DomainModuleStatus;
  purpose: string;
  dependsOn?: string[];
}

export const DOMAIN_MODULES: DomainModuleDefinition[] = [
  { slug:'foundation', name:'Foundation & Security', group:'Core', status:'FOUNDATION', purpose:'Auth, roles, permissions, audit and shared infrastructure.' },
  { slug:'masters', name:'Master Data', group:'Core', status:'FOUNDATION', purpose:'Factory, section, floor, line, machine pool, buyer and shared masters.' },
  { slug:'orders', name:'Merchandising & Order Entry', group:'Commercial', status:'FOUNDATION', purpose:'Confirmed Job/Style/PO/CCD and order source of truth.' },
  { slug:'projection', name:'Projection', group:'Commercial', status:'BLUEPRINT', purpose:'Early forecast supporting yarn/knitting/purchase decisions.' },
  { slug:'yarn', name:'Yarn / Yarn Dyeing / Purchase', group:'Fabric', status:'BLUEPRINT', purpose:'Yarn requirement, purchase, dyeing and availability.' },
  { slug:'knitting', name:'Knitting', group:'Fabric', status:'BLUEPRINT', purpose:'Machine program, plan, production and sample/bulk follow-up.' },
  { slug:'greige-store', name:'Greige Store', group:'Fabric', status:'BLUEPRINT', purpose:'Greige stock, receipt, issue and availability.' },
  { slug:'dyeing', name:'Dyeing', group:'Fabric', status:'BLUEPRINT', purpose:'Batch plan, production, delivery, reprocess and KPI.' },
  { slug:'lab', name:'Lab / Testing', group:'Fabric', status:'BLUEPRINT', purpose:'Lab dip, pilling, color-fastness and QA release.' },
  { slug:'fabric-finishing', name:'Fabric Finishing / AOP / Brush / Peach', group:'Fabric', status:'BLUEPRINT', purpose:'Configurable post-dyeing processes and execution.' },
  { slug:'finished-fabric', name:'Finished Fabric Store', group:'Fabric', status:'BLUEPRINT', purpose:'Finished fabric receipt, stock, issue and cutting readiness.' },
  { slug:'sample', name:'Sample', group:'Pre-production', status:'BLUEPRINT', purpose:'Department sample processes plus separate Central Sample production/delivery.' },
  { slug:'cad', name:'CAD / Pattern / Size Set', group:'Pre-production', status:'BLUEPRINT', purpose:'Technical readiness and handover.' },
  { slug:'ie', name:'IE Bulletin', group:'Pre-production', status:'NEXT', purpose:'SMV, manpower, efficiency and planning readiness.' },
  { slug:'ta', name:'T&A', group:'Planning', status:'NEXT', purpose:'Rule-based activity plan, dependency and execution tracking.' },
  { slug:'planning', name:'Central Planning / Gantt', group:'Planning', status:'NEXT', purpose:'FastReact-style line allocation, change control and plan versions.' },
  { slug:'capacity', name:'Capacity Balancing', group:'Planning', status:'BLUEPRINT', purpose:'Three-slot monthly capacity/load/outsource control.' },
  { slug:'subcontract', name:'Subcontract', group:'Planning', status:'BLUEPRINT', purpose:'Outside process allocation and released/unreleased load.' },
  { slug:'cutting', name:'Cutting / Input', group:'Production', status:'BLUEPRINT', purpose:'Cuttable gate, daily cut plan, color-wise production and input coverage.' },
  { slug:'printing', name:'Printing', group:'Production', status:'BLUEPRINT', purpose:'Plan, send, receive and execution.' },
  { slug:'embroidery', name:'Embroidery', group:'Production', status:'BLUEPRINT', purpose:'Plan, send, receive and execution.' },
  { slug:'special-process', name:'Sequins / Wash / Special Process', group:'Production', status:'BLUEPRINT', purpose:'Configurable special process tracking.' },
  { slug:'sewing', name:'Sewing / Input Follow-up', group:'Production', status:'BLUEPRINT', purpose:'Line input, actual production and shipment-control follow-up.' },
  { slug:'quality', name:'Quality / DHU / OQL / Inspection', group:'Quality', status:'BLUEPRINT', purpose:'Live floor quality, end-line, OQL, inspections, pass rates and defects.' },
  { slug:'finishing', name:'Finishing / Packing', group:'Production', status:'BLUEPRINT', purpose:'Finishing, poly, packing and output.' },
  { slug:'trims', name:'Trims & Accessories', group:'Store', status:'BLUEPRINT', purpose:'Requirement, in-house, due item and issue status.' },
  { slug:'inventory', name:'Stores / Inventory', group:'Store', status:'BLUEPRINT', purpose:'Stock and movement across material categories.' },
  { slug:'shipment', name:'Shipment / Export / Commercial', group:'Commercial', status:'BLUEPRINT', purpose:'Shipment plan, execution and export tracking.' },
  { slug:'mis', name:'MIS / KPI / Management', group:'Management', status:'BLUEPRINT', purpose:'Cross-functional KPI and exception dashboards.' },
  { slug:'job-360', name:'Job 360', group:'Management', status:'BLUEPRINT', purpose:'Full Job timeline, plan-vs-actual and historical drill-down.' },
  { slug:'floor-display', name:'Floor / TV Live Display', group:'Management', status:'BLUEPRINT', purpose:'Configurable display-only live Production + Quality widgets.' },
];
