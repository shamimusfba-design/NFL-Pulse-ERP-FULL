export type CommandCenterKpi = {
  activeOrders: number;
  activeOrdersDelta: number;
  orderQty: number;
  orderQtyDelta: number;
  fobValue: number;
  fobValueDelta: number;
  onTimeShipmentPct: number;
  onTimeShipmentDelta: number;
  atRiskOrders: number;
  atRiskOrdersDelta: number;
  shipmentsNext7Days: number;
  shipmentsNext7DaysDelta: number;
  productionCompletionPct: number;
  productionCompletionDelta: number;
  factoryCapacityPct: number;
  factoryCapacityDelta: number;
};

export type PriorityException = {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Info';
  issue: string;
  detail: string;
  jobNo: string;
  impact: string;
  actionText: string;
  actionType: 'resolve' | 'followup' | 'view';
  resolved?: boolean;
};

export type MyActionItem = {
  id: string;
  type: 'shortage' | 'overdue' | 'sample' | 'approval' | 'delay' | 'behind' | 'lab' | 'transport';
  title: string;
  jobNo: string;
  desc: string;
  dueText: string;
  bucket: 'today' | 'overdue' | 'upcoming' | 'completed';
  btnText: string;
  btnStyle: 'red' | 'orange' | 'blue' | 'green';
  completed?: boolean;
};

export type ProductionStage = {
  key: string;
  name: string;
  icon: string;
  plannedQty: number;
  actualQty: number;
  pct: number;
  status: 'On Track' | 'At Risk' | 'Critical' | 'Pending';
};

export type OrderRecord = {
  id: string;
  idx: number;
  jobNo: string;
  buyer: string;
  style: string;
  product: string;
  orderQty: number;
  fobUsd: number;
  shipmentDate: string;
  productionProgress: number;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  statusColor: string;
  factory: string;
};
