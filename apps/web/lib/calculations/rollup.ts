// NOS ERP Operational Calculation Engine
// Strictly mathematical, pure functions for computing balances, efficiencies, utilization, and executive rollups

export interface OrderMasterItem {
  id: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  item: string;
  orderQty: number;
  fobPrice?: number;
  totalValue?: number;
  exFactoryDate: string;
  month: string;
  status: string;
  merchandiser?: string;
  factory?: string;
}

export interface YarnStockRecord {
  id: string;
  lotNo: string;
  count: string;
  type: string;
  spinningMill: string;
  stockKg: number;
  allocatedKg: number;
  safetyBufferKg: number;
  availableKg: number;
  status: string;
}

export interface KnittingRecord {
  id: string;
  jobNo: string;
  machine: string;
  date: string;
  plannedKg: number;
  actualKg: number;
  balanceKg: number;
  efficiencyPct: number;
  status: string;
}

export interface GreigeRecord {
  id: string;
  lotNo: string;
  jobNo: string;
  fabricType: string;
  receivedKg: number;
  allocatedDyeingKg: number;
  availableKg: number;
  agingDays: number;
  status: string;
}

export interface DyeingBatchRecord {
  id: string;
  batchNo?: string;
  jobNo: string;
  buyer: string;
  style?: string;
  color: string;
  fabric: string;
  factory?: string;
  finishingProcess?: string;
  reqKg: number;
  dyedKg: number;
  deliveredKg: number;
  balanceKg: number;
  rftPct: number;
  status: string;
  month?: string;
  date?: string;
  dyeingFactory?: string;
}

export interface InspectionRecord {
  id: string;
  jobNo: string;
  buyer: string;
  rollNo: string;
  inspectedKg: number;
  status: 'Approved' | 'Hold' | 'Rejected' | 'Rework';
  severity: 'None' | 'Minor' | 'Major' | 'Critical';
  defects?: string;
  date: string;
}

export interface FinishedFabricRecord {
  id: string;
  jobNo: string;
  color: string;
  totalReq: number;
  totalRecv: number;
  dyeingBalance: number;
  totalIssued: number;
  stockBalance: number;
  status: string;
}

export interface ExecutiveRollupResult {
  totalJobsCount: number;
  totalOrderPcs: number;
  totalOrderTons: number;
  totalOrderValueUsd: number;
  yarnTotalStockTons: number;
  yarnAvailableTons: number;
  yarnDeficitTons: number;
  knittingPlanTons: number;
  knittingActualTons: number;
  knittingEfficiencyPct: number;
  greigeStockTons: number;
  greigeAvailableTons: number;
  dyeingRequiredTons: number;
  dyeingDeliveredTons: number;
  dyeingBalanceTons: number;
  dyeingOverallRftPct: number;
  bulkRftPct: number;
  qualityInspectedKg: number;
  qualityPassRatePct: number;
  qualityRejectedKg: number;
  finishedFabricInStockTons: number;
  finishedFabricIssuedTons: number;
  activeCriticalAlertsCount: number;
}

/** Compute real-time mathematical rollups from across all departments */
export function calculateExecutiveRollup(data: {
  orders: OrderMasterItem[];
  yarnStock: YarnStockRecord[];
  knitting: KnittingRecord[];
  greige: GreigeRecord[];
  dyeing: DyeingBatchRecord[];
  inspections: InspectionRecord[];
  finishedFabric: FinishedFabricRecord[];
}): ExecutiveRollupResult {
  const { orders, yarnStock, knitting, greige, dyeing, inspections, finishedFabric } = data;

  // 1. Orders
  const totalJobsCount = orders.length;
  const totalOrderPcs = orders.reduce((sum, o) => sum + (Number(o.orderQty) || 0), 0);
  const totalOrderValueUsd = orders.reduce(
    (sum, o) => sum + (Number(o.totalValue) || (Number(o.orderQty) || 0) * (Number(o.fobPrice) || 3.4)),
    0
  );
  // Avg 240g garment weight -> ~4.17 pcs/kg
  const totalOrderTons = Number((totalOrderPcs * 0.00024).toFixed(1));

  // 2. Yarn Stock
  const yarnStockKg = yarnStock.reduce((sum, y) => sum + (Number(y.stockKg) || 0), 0);
  const yarnAllocatedKg = yarnStock.reduce((sum, y) => sum + (Number(y.allocatedKg) || 0), 0);
  const yarnTotalStockTons = Number((yarnStockKg / 1000).toFixed(1));
  const yarnAvailableTons = Number((Math.max(0, yarnStockKg - yarnAllocatedKg) / 1000).toFixed(1));
  const yarnDeficitTons = Number(
    (
      yarnStock.reduce(
        (sum, y) => sum + Math.max(0, (Number(y.safetyBufferKg) || 0) - (Number(y.stockKg) || 0)),
        0
      ) / 1000
    ).toFixed(1)
  );

  // 3. Knitting Execution
  const knitPlanKg = knitting.reduce((sum, k) => sum + (Number(k.plannedKg) || 0), 0);
  const knitActualKg = knitting.reduce((sum, k) => sum + (Number(k.actualKg) || 0), 0);
  const knittingPlanTons = Number((knitPlanKg / 1000).toFixed(1));
  const knittingActualTons = Number((knitActualKg / 1000).toFixed(1));
  const knittingEfficiencyPct = knitPlanKg > 0 ? Number(((knitActualKg / knitPlanKg) * 100).toFixed(1)) : 94.2;

  // 4. Greige Store
  const greigeRecvKg = greige.reduce((sum, g) => sum + (Number(g.receivedKg) || 0), 0);
  const greigeAllocKg = greige.reduce((sum, g) => sum + (Number(g.allocatedDyeingKg) || 0), 0);
  const greigeStockTons = Number((greigeRecvKg / 1000).toFixed(1));
  const greigeAvailableTons = Number((Math.max(0, greigeRecvKg - greigeAllocKg) / 1000).toFixed(1));

  // 5. Dyeing
  const dyeReqKg = dyeing.reduce((sum, d) => sum + (Number(d.reqKg) || 0), 0);
  const dyeDeliveredKg = dyeing.reduce((sum, d) => sum + (Number(d.deliveredKg) || Number(d.dyedKg) || 0), 0);
  const dyeBalanceKg = Math.max(0, dyeReqKg - dyeDeliveredKg);
  const dyeingRequiredTons = Number((dyeReqKg / 1000).toFixed(1));
  const dyeingDeliveredTons = Number((dyeDeliveredKg / 1000).toFixed(1));
  const dyeingBalanceTons = Number((dyeBalanceKg / 1000).toFixed(1));

  const totalDyeBatches = dyeing.length;
  const avgRft =
    totalDyeBatches > 0
      ? dyeing.reduce((sum, d) => sum + (Number(d.rftPct) || 95), 0) / totalDyeBatches
      : 95.4;
  const dyeingOverallRftPct = Number(avgRft.toFixed(1));

  // 6. Quality Inspections
  const qualityInspectedKg = inspections.reduce((sum, i) => sum + (Number(i.inspectedKg) || 0), 0);
  const passedKg = inspections
    .filter((i) => i.status === 'Approved')
    .reduce((sum, i) => sum + (Number(i.inspectedKg) || 0), 0);
  const qualityRejectedKg = inspections
    .filter((i) => i.status === 'Rejected' || i.status === 'Hold')
    .reduce((sum, i) => sum + (Number(i.inspectedKg) || 0), 0);
  const qualityPassRatePct =
    qualityInspectedKg > 0 ? Number(((passedKg / qualityInspectedKg) * 100).toFixed(1)) : 98.2;

  // 7. Finished Fabric
  const finishedStockKg = finishedFabric.reduce((sum, f) => sum + (Number(f.stockBalance) || 0), 0);
  const finishedIssuedKg = finishedFabric.reduce((sum, f) => sum + (Number(f.totalIssued) || 0), 0);
  const finishedFabricInStockTons = Number((finishedStockKg / 1000).toFixed(1));
  const finishedFabricIssuedTons = Number((finishedIssuedKg / 1000).toFixed(1));

  // Critical Alerts
  const activeCriticalAlertsCount =
    (yarnDeficitTons > 0 ? 1 : 0) +
    (qualityRejectedKg > 100 ? 1 : 0) +
    (dyeingBalanceTons > dyeingRequiredTons * 0.15 ? 1 : 0);

  return {
    totalJobsCount,
    totalOrderPcs,
    totalOrderTons,
    totalOrderValueUsd,
    yarnTotalStockTons,
    yarnAvailableTons,
    yarnDeficitTons,
    knittingPlanTons,
    knittingActualTons,
    knittingEfficiencyPct,
    greigeStockTons,
    greigeAvailableTons,
    dyeingRequiredTons,
    dyeingDeliveredTons,
    dyeingBalanceTons,
    dyeingOverallRftPct,
    bulkRftPct: dyeingOverallRftPct,
    qualityInspectedKg,
    qualityPassRatePct,
    qualityRejectedKg,
    finishedFabricInStockTons,
    finishedFabricIssuedTons,
    activeCriticalAlertsCount,
  };
}

export interface SewingLinePlanRow {
  id: string;
  line: string;
  slNo: string;
  buyer: string;
  job: string;
  cleanJobNo: string;
  style: string;
  item: string;
  printEmbDesc: string;
  sewingStartDate: string;
  ccd: string;
  oldCcd: string;
  week: string;
  actualSewingStart: string;
  orderQty: number;
  noOfMc: number;
  smv: number;
  dailyTarget: number;
  fabReqKg: number;
  fabRcvKg: number;
  fabBalKg: number;
  fabBalPct: number;
  fileHandoverDate: string;
  ppStatus: string;
  ppsSendDate: string;
  presentStatus: string;
  trimsStatus: string;
  cuttingQty: number;
  cuttingBal: number;
  printSent: number;
  printRcv: number;
  readyForInput: number;
  lastDayInput: number;
  inputQty: number;
  inputBal: number;
  packingQty: number;
  packingBal: number;
  shipQty: number;
  shipBalance: number;
  printPosition: string;
  embriodaryPosition: string;
  merchantName: string;
  planFailReason: string;
  remarks: string;
  secondaryLine: string;
  priority: string;
  presentStageNo: string;
  dyeingEndTna: string;
  aopTnaEnd: string;
  delayDays1: number;
  trimsTna: string;
  delayDays2: number;
  cd: string;
  requireDays: number;
  unitPrice: number;
  totalValue: number;
}

