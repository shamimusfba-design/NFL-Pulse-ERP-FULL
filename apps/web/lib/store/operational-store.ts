// NOS ERP Universal Operational Data Store
// Connects departmental data entries, spreadsheets, and live reactive state across the applet

import {
  calculateExecutiveRollup,
  DyeingBatchRecord,
  ExecutiveRollupResult,
  FinishedFabricRecord,
  GreigeRecord,
  InspectionRecord,
  KnittingRecord,
  OrderMasterItem,
  SewingLinePlanRow,
  YarnStockRecord,
} from '../calculations/rollup';
import sewingLinePlanMasterData from '../../data/sewing-line-plan-master.json';

const STORAGE_KEY = 'nos_operational_store_v1';

export interface OperationalStoreState {
  orders: OrderMasterItem[];
  yarnStock: YarnStockRecord[];
  knitting: KnittingRecord[];
  greige: GreigeRecord[];
  dyeing: DyeingBatchRecord[];
  inspections: InspectionRecord[];
  finishedFabric: FinishedFabricRecord[];
  sewingPlan?: SewingLinePlanRow[];
  lastUpdated: string;
}

// Baseline Initial Seed so existing views render immediately without waiting for API
const INITIAL_ORDERS: OrderMasterItem[] = [
  { id: 'ORD-48093', jobNo: '48093', buyer: 'ONLY', styleNo: '22040024', item: 'Crew Neck T-Shirt', orderQty: 12500, fobPrice: 3.85, totalValue: 48125, exFactoryDate: '2026-11-20', month: 'Nov-26', status: 'In Production', merchandiser: 'Md. Jahidul Islam', factory: 'NFL' },
  { id: 'ORD-48085', jobNo: '48085', buyer: 'BS-NMT', styleNo: '13251506', item: 'Fleece Pullover Hoodie', orderQty: 8400, fobPrice: 7.20, totalValue: 60480, exFactoryDate: '2026-11-25', month: 'Nov-26', status: 'In Production', merchandiser: 'Shaker', factory: 'NFL' },
  { id: 'ORD-47783', jobNo: '47783', buyer: 'OVS', styleNo: '2717SW11', item: 'French Terry Sweatshirt', orderQty: 15000, fobPrice: 5.60, totalValue: 84000, exFactoryDate: '2026-11-15', month: 'Nov-26', status: 'In Production', merchandiser: 'Tariqul Islam', factory: 'NFL' },
  { id: 'ORD-46758', jobNo: '46758', buyer: 'UTG', styleNo: '13251495', item: 'Lycra Rib Polo', orderQty: 9200, fobPrice: 4.50, totalValue: 41400, exFactoryDate: '2026-11-10', month: 'Nov-26', status: 'In Production', merchandiser: 'Md. Jahidul Islam', factory: 'NFL' },
  { id: 'ORD-48061', jobNo: '48061', buyer: 'Name It', styleNo: '13251509', item: 'Organic Cotton Tee', orderQty: 11000, fobPrice: 3.20, totalValue: 35200, exFactoryDate: '2026-11-18', month: 'Nov-26', status: 'In Production', merchandiser: 'Tanvir Ahmed', factory: 'NFL' },
  { id: 'ORD-46616', jobNo: '46616', buyer: 'Only&Sons', styleNo: '22039183', item: 'Heavy Interlock Jacket', orderQty: 6800, fobPrice: 8.90, totalValue: 60520, exFactoryDate: '2026-11-28', month: 'Nov-26', status: 'In Production', merchandiser: 'Md. Jahidul Islam', factory: 'NFL' },
];

const INITIAL_YARN: YarnStockRecord[] = [
  { id: 'YS-101', lotNo: 'LOT-SQ-402', count: '30/1 Combed Cotton', type: 'WHITE', spinningMill: 'Square Textiles', stockKg: 85400, allocatedKg: 52000, safetyBufferKg: 40000, availableKg: 33400, status: 'SUFFICIENT' },
  { id: 'YS-102', lotNo: 'LOT-BD-210', count: '28/1 Cotton Melange', type: 'MELANGE', spinningMill: 'Badsha Textiles', stockKg: 12000, allocatedKg: 8000, safetyBufferKg: 10000, availableKg: 4000, status: 'LOW' },
  { id: 'YS-103', lotNo: 'LOT-SH-119', count: '34/1 Combed Cotton', type: 'WHITE', spinningMill: 'Shurwid Spinning', stockKg: 21000, allocatedKg: 15000, safetyBufferKg: 12000, availableKg: 6000, status: 'SUFFICIENT' },
  { id: 'YS-104', lotNo: 'LOT-MT-804', count: '26/1 CVC 60/40', type: 'COLOR', spinningMill: 'Matin Spinning', stockKg: 9500, allocatedKg: 7000, safetyBufferKg: 8000, availableKg: 2500, status: 'SUFFICIENT' },
  { id: 'YS-105', lotNo: 'LOT-NV-503', count: '30/1 Lycra 5%', type: 'COLOR', spinningMill: 'Novotex Mills', stockKg: 4200, allocatedKg: 3500, safetyBufferKg: 4000, availableKg: 700, status: 'LOW' },
  { id: 'YS-106', lotNo: 'LOT-AK-911', count: '20/1 Carded Cotton', type: 'WHITE', spinningMill: 'Akij Textiles', stockKg: 142000, allocatedKg: 88000, safetyBufferKg: 60000, availableKg: 54000, status: 'SUFFICIENT' },
];

const INITIAL_KNITTING: KnittingRecord[] = [
  { id: 'KT-01', jobNo: '48093', machine: 'KM-02 Mayer & Cie', date: '2026-10-30', plannedKg: 3500, actualKg: 3450, balanceKg: 50, efficiencyPct: 98.5, status: 'COMPLETED' },
  { id: 'KT-02', jobNo: '48085', machine: 'KM-06 Terrot Rib', date: '2026-10-30', plannedKg: 2200, actualKg: 2150, balanceKg: 50, efficiencyPct: 97.7, status: 'COMPLETED' },
  { id: 'KT-03', jobNo: '47783', machine: 'KM-11 Pailung Fleece', date: '2026-10-31', plannedKg: 4200, actualKg: 4100, balanceKg: 100, efficiencyPct: 97.6, status: 'RUNNING' },
  { id: 'KT-04', jobNo: '46758', machine: 'KM-07 Terrot Rib', date: '2026-10-31', plannedKg: 2800, actualKg: 2750, balanceKg: 50, efficiencyPct: 98.2, status: 'RUNNING' },
];

const INITIAL_GREIGE: GreigeRecord[] = [
  { id: 'GR-2601', lotNo: 'GL-48093-A', jobNo: '48093', fabricType: 'Single Jersey 100% Cotton', receivedKg: 3550, allocatedDyeingKg: 2400, availableKg: 1150, agingDays: 4, status: 'AVAILABLE' },
  { id: 'GR-2602', lotNo: 'GL-48085-B', jobNo: '48085', fabricType: '1x1 Cotton Rib', receivedKg: 2100, allocatedDyeingKg: 2100, availableKg: 0, agingDays: 6, status: 'ALLOCATED_WINCH' },
  { id: 'GR-2603', lotNo: 'GL-47783-C', jobNo: '47783', fabricType: 'French Terry Unbrushed', receivedKg: 4290, allocatedDyeingKg: 1800, availableKg: 2490, agingDays: 8, status: 'AVAILABLE' },
  { id: 'GR-2604', lotNo: 'GL-46758-G', jobNo: '46758', fabricType: '2x2 Lycra Rib', receivedKg: 2800, allocatedDyeingKg: 2000, availableKg: 800, agingDays: 5, status: 'AVAILABLE' },
];

const INITIAL_DYEING: DyeingBatchRecord[] = [
  { id: 'DY-01', jobNo: '48093', buyer: 'ONLY', color: 'Navy Blue', fabric: 'Single Jersey', reqKg: 3200, dyedKg: 3200, deliveredKg: 3200, balanceKg: 0, rftPct: 97.5, status: 'Dyed & Delivered', month: 'Nov-26', dyeingFactory: 'NFL' },
  { id: 'DY-02', jobNo: '48085', buyer: 'BS-NMT', color: 'Black Melange', fabric: 'Fleece', reqKg: 2400, dyedKg: 2400, deliveredKg: 2100, balanceKg: 300, rftPct: 96.0, status: 'In Process', month: 'Nov-26', dyeingFactory: 'NFL' },
  { id: 'DY-03', jobNo: '47783', buyer: 'OVS', color: 'Olive Green', fabric: 'Terry', reqKg: 3800, dyedKg: 2900, deliveredKg: 2500, balanceKg: 1300, rftPct: 94.8, status: 'In Process', month: 'Nov-26', dyeingFactory: 'Northern Dyeing' },
  { id: 'DY-04', jobNo: '46758', buyer: 'UTG', color: 'Bright White', fabric: 'Lycra Rib', reqKg: 2100, dyedKg: 2100, deliveredKg: 2100, balanceKg: 0, rftPct: 98.2, status: 'Dyed & Delivered', month: 'Nov-26', dyeingFactory: 'NFL' },
];

const INITIAL_INSPECTIONS: InspectionRecord[] = [
  { id: 'INS-01', jobNo: '48093', buyer: 'ONLY', rollNo: 'R-01', inspectedKg: 48.5, status: 'Approved', severity: 'None', date: '2026-10-31' },
  { id: 'INS-02', jobNo: '48085', buyer: 'BS-NMT', rollNo: 'R-05', inspectedKg: 52.0, status: 'Approved', severity: 'None', date: '2026-10-31' },
  { id: 'INS-03', jobNo: '47783', buyer: 'OVS', rollNo: 'R-12', inspectedKg: 46.0, status: 'Hold', severity: 'Major', defects: 'Mild GSM variation', date: '2026-10-31' },
  { id: 'INS-04', jobNo: '46758', buyer: 'UTG', rollNo: 'R-08', inspectedKg: 50.2, status: 'Approved', severity: 'None', date: '2026-10-31' },
];

const INITIAL_FINISHED: FinishedFabricRecord[] = [
  { id: 'FF-01', jobNo: '48093', color: 'Navy Blue', totalReq: 3200, totalRecv: 3200, dyeingBalance: 0, totalIssued: 2800, stockBalance: 400, status: 'In Stock' },
  { id: 'FF-02', jobNo: '48085', color: 'Black Melange', totalReq: 2400, totalRecv: 2100, dyeingBalance: 300, totalIssued: 1500, stockBalance: 600, status: 'In Stock' },
  { id: 'FF-03', jobNo: '47783', color: 'Olive Green', totalReq: 3800, totalRecv: 2500, dyeingBalance: 1300, totalIssued: 1800, stockBalance: 700, status: 'In Stock' },
  { id: 'FF-04', jobNo: '46758', color: 'Bright White', totalReq: 2100, totalRecv: 2100, dyeingBalance: 0, totalIssued: 2100, stockBalance: 0, status: 'Fully Issued' },
];

export function getInitialOperationalState(): OperationalStoreState {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Fallback to fresh initial
    }
  }
  return {
    orders: INITIAL_ORDERS,
    yarnStock: INITIAL_YARN,
    knitting: INITIAL_KNITTING,
    greige: INITIAL_GREIGE,
    dyeing: INITIAL_DYEING,
    inspections: INITIAL_INSPECTIONS,
    finishedFabric: INITIAL_FINISHED,
    sewingPlan: (sewingLinePlanMasterData as SewingLinePlanRow[]) || [],
    lastUpdated: new Date().toISOString(),
  };
}

export function saveOperationalState(state: OperationalStoreState): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Dispatch browser custom event so other active dashboard components update instantly
      window.dispatchEvent(new CustomEvent('nos-operational-data-changed', { detail: state }));
    } catch {
      // ignore
    }
  }
}

/** Get live computed rollups across all operational departments */
export function getLiveExecutiveRollup(): ExecutiveRollupResult {
  const current = getInitialOperationalState();
  return calculateExecutiveRollup(current);
}

// -----------------------------------------------------------------------------
// Type-safe Operational Mutators
// -----------------------------------------------------------------------------

export function addOperationalOrder(order: OrderMasterItem): OperationalStoreState {
  const current = getInitialOperationalState();
  const nextOrders = [order, ...current.orders.filter((o) => o.jobNo !== order.jobNo)];
  const updated: OperationalStoreState = {
    ...current,
    orders: nextOrders,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function logYarnChallan(challan: YarnStockRecord): OperationalStoreState {
  const current = getInitialOperationalState();
  const next = [challan, ...current.yarnStock.filter((y) => y.id !== challan.id)];
  const updated: OperationalStoreState = {
    ...current,
    yarnStock: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function recordGreigeRoll(roll: GreigeRecord): OperationalStoreState {
  const current = getInitialOperationalState();
  const next = [roll, ...current.greige.filter((g) => g.id !== roll.id)];
  const updated: OperationalStoreState = {
    ...current,
    greige: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function logDyeingBatch(batch: DyeingBatchRecord): OperationalStoreState {
  const current = getInitialOperationalState();
  const next = [batch, ...current.dyeing.filter((d) => d.id !== batch.id)];
  const updated: OperationalStoreState = {
    ...current,
    dyeing: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function recordQualityInspection(inspection: InspectionRecord): OperationalStoreState {
  const current = getInitialOperationalState();
  const next = [inspection, ...current.inspections.filter((i) => i.id !== inspection.id)];
  const updated: OperationalStoreState = {
    ...current,
    inspections: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function logKnittingProduction(rec: KnittingRecord): OperationalStoreState {
  const current = getInitialOperationalState();
  const next = [rec, ...current.knitting.filter((k) => k.id !== rec.id)];
  const updated: OperationalStoreState = {
    ...current,
    knitting: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function logFinishedFabric(rec: FinishedFabricRecord): OperationalStoreState {
  const current = getInitialOperationalState();
  const next = [rec, ...current.finishedFabric.filter((f) => f.id !== rec.id)];
  const updated: OperationalStoreState = {
    ...current,
    finishedFabric: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function logSewingPlanUpdate(row: SewingLinePlanRow): OperationalStoreState {
  const current = getInitialOperationalState();
  const existing = current.sewingPlan || (sewingLinePlanMasterData as SewingLinePlanRow[]) || [];
  const next = [row, ...existing.filter((r) => r.id !== row.id)];
  const updated: OperationalStoreState = {
    ...current,
    sewingPlan: next,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

/**
 * Update Sewing Status with Cutting Gate validation rule:
 * Sewing status cannot be changed to 'Sewing Running' or 'Sewing Completed'
 * unless Cutting is OK and Ready for Input > 0.
 */
export function updateSewingStatus(rowId: string, nextStatus: string): { success: boolean; message: string; state: OperationalStoreState } {
  const current = getInitialOperationalState();
  const list = current.sewingPlan || (sewingLinePlanMasterData as SewingLinePlanRow[]) || [];
  const target = list.find((r) => r.id === rowId);

  if (!target) {
    return { success: false, message: 'Job not found', state: current };
  }

  const isAttemptingSewing = nextStatus === 'Sewing Running' || nextStatus === 'Sewing Completed';
  const cuttingCompleted = target.cuttingQty > 0 && target.readyForInput > 0;

  if (isAttemptingSewing && !cuttingCompleted) {
    return {
      success: false,
      message: `Cutting Gate Blocked: Cutting is not completed yet (Cut: ${target.cuttingQty}, Ready: ${target.readyForInput}). Status remains locked to Waiting Cutting until Cutting releases garments.`,
      state: current,
    };
  }

  const updatedRows = list.map((r) => (r.id === rowId ? { ...r, presentStatus: nextStatus } : r));
  const updatedState: OperationalStoreState = {
    ...current,
    sewingPlan: updatedRows,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updatedState);
  return { success: true, message: `Status updated to ${nextStatus}`, state: updatedState };
}

export type OperationalSheetKey =
  | 'orders'
  | 'yarnStock'
  | 'knitting'
  | 'greige'
  | 'dyeing'
  | 'inspections'
  | 'finishedFabric'
  | 'sewingPlan';

export function updateOperationalSheet<K extends OperationalSheetKey>(
  sheetKey: K,
  rows: OperationalStoreState[K]
): OperationalStoreState {
  const current = getInitialOperationalState();
  const updated: OperationalStoreState = {
    ...current,
    [sheetKey]: rows,
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(updated);
  return updated;
}

export function resetOperationalStoreToDefaults(): OperationalStoreState {
  const fresh: OperationalStoreState = {
    orders: INITIAL_ORDERS,
    yarnStock: INITIAL_YARN,
    knitting: INITIAL_KNITTING,
    greige: INITIAL_GREIGE,
    dyeing: INITIAL_DYEING,
    inspections: INITIAL_INSPECTIONS,
    finishedFabric: INITIAL_FINISHED,
    sewingPlan: (sewingLinePlanMasterData as SewingLinePlanRow[]) || [],
    lastUpdated: new Date().toISOString(),
  };
  saveOperationalState(fresh);
  return fresh;
}


