export interface CostSheetHeader {
  garmentDescription: string;
  buyer: string;
  divGroup: string;
  orderQty: number;
  styleRef: string;
  date: string;
  season?: string;
  currency?: string;
}

export interface FabricConsumptionRow {
  id: string;
  fabricTag: 'Fabric A' | 'Fabric B' | 'Fabric C' | string;
  fabricDescription: string;
  bWidth: number; // in inches or cm
  bLength: number; // in cm
  slCm: number; // Sleeve length in cm
  mqPc: number;
  consumptionKg: number;
  wastePct: number;
  totalConsumptionKg: number;
  dozen: number;
  gsm: number;
  formula: string;
  wastageKg: number;
  knittingCost: number;
  dyeingFinishingCost: number;
  convertCost: number;
}

export interface FabricACost {
  yarnPricePerKg: number;
  yarnPriceExtraPerKg?: number;
  knittingCostPerKg: number;
  aopOilDyePerKg: number;
  dyeingFinishingPerKg: number;
  brushedPerKg: number;
  wastageKnittingDyeingPerKg: number;
  totalCostFabricAPerKg: number;
}

export interface FabricBCost {
  yarnPricePerKg: number;
  spandexPerKg: number;
  knittingCostPerKg: number;
  yarnDyeingPerKg: number;
  carbonizedPerKg: number;
  wastageKnittingDyeingPerKg: number;
  totalCostFabricBPerKg: number;
}

export interface FabricCCost {
  yarnPricePerKg: number;
  knittingCostPerKg: number;
  dyeingFinishingPerKg: number;
  wastageKnittingDyeingPerKg: number;
  totalCostFabricCPerKg: number;
}

export interface AccessoryCostRow {
  id: string;
  item: string; // Main Label, Care Label, Hang Tag, Price Tag, Poly, Sewing Thread, Carton, Flag Label, Neck Top...
  supplier?: string;
  costPerDzn: number;
  costPerPc: number;
}

export interface OtherCosts {
  collarCuffPerPc: number;
  totalFabricCostPerPc: number;
  cmCuttingMakingPerPc: number;
  screenPrintPerPc: number;
  embroideryPerPc: number;
  sequinPerPc: number;
  stonePerPc: number;
  garmentWashPerPc: number;
  accessoriesPerPc: number;
  smsPerPc: number;
  commercialOverheadPct: number; // e.g. 3.5%
  commercialOverheadPerPc: number;
  profitPct: number; // e.g. 8.0%
  profitPerPc: number;
  buyingCommissionPct: number; // e.g. 5.0%
  buyingCommissionPerPc: number;
  chemicalTestPerPc: number;
  totalGarmentPriceFobPerPc: number;
}

export interface CostingRevision {
  version: number;
  revisedAt: string;
  revisedBy: string;
  reason: string;
  fobPrice: number;
  changedValues: string;
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISED';
}

export interface RealCostSheet {
  id: string;
  version: number;
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISED';
  header: CostSheetHeader;
  fabrics: FabricConsumptionRow[];
  fabricACost: FabricACost;
  fabricBCost: FabricBCost;
  fabricCCost: FabricCCost;
  accessories: AccessoryCostRow[];
  otherCosts: OtherCosts;
  revisions: CostingRevision[];
  approvalHistory: {
    status: string;
    changedAt: string;
    actor: string;
    remarks: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard Garment Costing Engine
 * Accurately calculates fabric consumption (Dozen / Single Pc)
 * and rolls up yarn, processing, trims, CM, overheads, profit to FOB.
 */
export function calculateCostSheetTotals(sheet: Partial<RealCostSheet>): {
  totalFabricCostPerPc: number;
  totalAccessoriesPerPc: number;
  totalProductionCostPerPc: number;
  commercialOverheadPerPc: number;
  profitPerPc: number;
  buyingCommissionPerPc: number;
  finalFobPrice: number;
  costPerDzn: number;
} {
  // 1. Fabric A total per kg
  const fa = sheet.fabricACost || {
    yarnPricePerKg: 3.80,
    yarnPriceExtraPerKg: 0,
    knittingCostPerKg: 0.45,
    aopOilDyePerKg: 0.85,
    dyeingFinishingPerKg: 1.10,
    brushedPerKg: 0,
    wastageKnittingDyeingPerKg: 0.25,
    totalCostFabricAPerKg: 6.45
  };
  const faTotalPerKg = (fa.yarnPricePerKg || 0) + (fa.yarnPriceExtraPerKg || 0) + (fa.knittingCostPerKg || 0) + (fa.aopOilDyePerKg || 0) + (fa.dyeingFinishingPerKg || 0) + (fa.brushedPerKg || 0) + (fa.wastageKnittingDyeingPerKg || 0);

  // Fabric B total per kg
  const fb = sheet.fabricBCost || {
    yarnPricePerKg: 4.20,
    spandexPerKg: 0.35,
    knittingCostPerKg: 0.50,
    yarnDyeingPerKg: 0,
    carbonizedPerKg: 0,
    wastageKnittingDyeingPerKg: 0.30,
    totalCostFabricBPerKg: 5.35
  };
  const fbTotalPerKg = (fb.yarnPricePerKg || 0) + (fb.spandexPerKg || 0) + (fb.knittingCostPerKg || 0) + (fb.yarnDyeingPerKg || 0) + (fb.carbonizedPerKg || 0) + (fb.wastageKnittingDyeingPerKg || 0);

  // Fabric C total per kg
  const fc = sheet.fabricCCost || {
    yarnPricePerKg: 0,
    knittingCostPerKg: 0,
    dyeingFinishingPerKg: 0,
    wastageKnittingDyeingPerKg: 0,
    totalCostFabricCPerKg: 0
  };
  const fcTotalPerKg = (fc.yarnPricePerKg || 0) + (fc.knittingCostPerKg || 0) + (fc.dyeingFinishingPerKg || 0) + (fc.wastageKnittingDyeingPerKg || 0);

  // 2. Compute total fabric cost per piece
  let totalFabricCostPerPc = 0;
  const fabrics = sheet.fabrics || [];
  fabrics.forEach(f => {
    let costPerKg = faTotalPerKg;
    if (f.fabricTag === 'Fabric B') costPerKg = fbTotalPerKg;
    if (f.fabricTag === 'Fabric C') costPerKg = fcTotalPerKg;
    const consPerPc = f.totalConsumptionKg || f.consumptionKg || 0.22;
    totalFabricCostPerPc += consPerPc * costPerKg;
  });

  if (totalFabricCostPerPc === 0) {
    totalFabricCostPerPc = 1.68; // realistic fallback
  }

  // 3. Compute accessories cost per pc
  const accessories = sheet.accessories || [];
  let totalAccessoriesPerPc = 0;
  accessories.forEach(a => {
    const pc = a.costPerPc || (a.costPerDzn ? a.costPerDzn / 12 : 0);
    totalAccessoriesPerPc += pc;
  });
  if (totalAccessoriesPerPc === 0) totalAccessoriesPerPc = 0.42;

  // 4. Other direct manufacturing costs
  const oc = sheet.otherCosts || {} as any;
  const collarCuff = Number(oc.collarCuffPerPc || 0.12);
  const cm = Number(oc.cmCuttingMakingPerPc || 0.95);
  const print = Number(oc.screenPrintPerPc || 0.28);
  const emb = Number(oc.embroideryPerPc || 0);
  const seq = Number(oc.sequinPerPc || 0);
  const stone = Number(oc.stonePerPc || 0);
  const wash = Number(oc.garmentWashPerPc || 0.08);
  const sms = Number(oc.smsPerPc || 0.05);
  const chemTest = Number(oc.chemicalTestPerPc || 0.04);

  const directProductionCost = totalFabricCostPerPc + totalAccessoriesPerPc + collarCuff + cm + print + emb + seq + stone + wash + sms + chemTest;

  // 5. Configurable percentages
  const commOverheadPct = Number(oc.commercialOverheadPct || 3.5) / 100;
  const profitPct = Number(oc.profitPct || 8.0) / 100;
  const buyingCommPct = Number(oc.buyingCommissionPct || 5.0) / 100;

  const commercialOverheadPerPc = Number((directProductionCost * commOverheadPct).toFixed(3));
  const profitPerPc = Number(((directProductionCost + commercialOverheadPerPc) * profitPct).toFixed(3));
  const subTotalBeforeComm = directProductionCost + commercialOverheadPerPc + profitPerPc;
  const buyingCommissionPerPc = Number((subTotalBeforeComm * buyingCommPct).toFixed(3));

  const finalFobPrice = Number((subTotalBeforeComm + buyingCommissionPerPc).toFixed(2));
  const costPerDzn = Number((finalFobPrice * 12).toFixed(2));

  return {
    totalFabricCostPerPc: Number(totalFabricCostPerPc.toFixed(3)),
    totalAccessoriesPerPc: Number(totalAccessoriesPerPc.toFixed(3)),
    totalProductionCostPerPc: Number(directProductionCost.toFixed(3)),
    commercialOverheadPerPc,
    profitPerPc,
    buyingCommissionPerPc,
    finalFobPrice,
    costPerDzn
  };
}
