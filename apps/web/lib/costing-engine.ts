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

export type CostItemCategory =
  | 'YARN'
  | 'FABRIC'
  | 'PROCESSING'
  | 'TRIMS'
  | 'PACKAGING'
  | 'EMBELLISHMENT'
  | 'CM'
  | 'WASH'
  | 'TESTING'
  | 'OVERHEAD';

export interface ItemizedCostItem {
  id: string;
  category: CostItemCategory;
  name: string;
  spec: string;
  unit: 'KG' | 'PC' | 'DZN' | 'GROSS' | 'CONE' | 'YDS' | 'CARTON' | 'SET';
  unitPrice: number; // Base unit rate in USD
  consumptionPerPc: number; // Consumption requirement per single garment piece
  wastagePct: number; // Wastage allowance %
  costPerPc: number; // Calculated cost per piece: (unitPrice * consumptionPerPc) * (1 + wastagePct/100)
  costPerDzn: number; // costPerPc * 12
  supplier?: string;
  isMandatory?: boolean;
  remarks?: string;
}

export interface MasterRateItem {
  id: string;
  category: CostItemCategory;
  name: string;
  spec: string;
  unit: 'KG' | 'PC' | 'DZN' | 'GROSS' | 'CONE' | 'YDS' | 'CARTON' | 'SET';
  defaultRate: number; // Standard rate in USD
  defaultConsumption: number; // Default requirement per piece
  defaultWastagePct: number;
  defaultSupplier: string;
  notes: string;
}

/**
 * Standard Master Item Rates Catalog (Northern Fashions Ltd.)
 * Every single component has a designated standard unit cost.
 */
export const DEFAULT_MASTER_ITEM_RATES: MasterRateItem[] = [
  // 1. Yarn & Fibers
  { id: 'rate-yarn-1', category: 'YARN', name: 'Combed Cotton Yarn 30s/1', spec: '100% Cotton Ring Spun Combed', unit: 'KG', defaultRate: 3.85, defaultConsumption: 0.22, defaultWastagePct: 6, defaultSupplier: 'Northern Spinning Ltd', notes: 'Standard body yarn' },
  { id: 'rate-yarn-2', category: 'YARN', name: 'Carded Cotton Yarn 26s/1', spec: '100% Cotton Carded', unit: 'KG', defaultRate: 3.40, defaultConsumption: 0.24, defaultWastagePct: 7, defaultSupplier: 'Badsha Spinning', notes: 'Heavy jersey / fleece backing' },
  { id: 'rate-yarn-3', category: 'YARN', name: 'Melange Yarn 30s/1 Grey', spec: '85/15 Cotton Poly Grey Melange', unit: 'KG', defaultRate: 4.15, defaultConsumption: 0.22, defaultWastagePct: 6, defaultSupplier: 'Viyellatex Mills', notes: 'Heather grey fabric' },
  { id: 'rate-yarn-4', category: 'YARN', name: 'Lycra / Spandex 40D', spec: 'Creora / Roica Bare Spandex', unit: 'KG', defaultRate: 7.20, defaultConsumption: 0.015, defaultWastagePct: 8, defaultSupplier: 'Hyosung Global', notes: 'For 1x1 neck rib & stretch jersey' },

  // 2. Knitting & Weaving Processing
  { id: 'rate-knit-1', category: 'PROCESSING', name: 'Single Jersey Knitting', spec: '28 Gauge, Circular Knit (140-180 GSM)', unit: 'KG', defaultRate: 0.45, defaultConsumption: 0.22, defaultWastagePct: 3, defaultSupplier: 'In-house Knitting Div', notes: 'Machine charge per kg' },
  { id: 'rate-knit-2', category: 'PROCESSING', name: 'Rib Knitting (1x1 & 2x2)', spec: '18 Gauge Rib Machine with Lycra feed', unit: 'KG', defaultRate: 0.55, defaultConsumption: 0.03, defaultWastagePct: 4, defaultSupplier: 'In-house Knitting Div', notes: 'Collar & cuff ribs' },
  { id: 'rate-knit-3', category: 'PROCESSING', name: 'Fleece / French Terry Knitting', spec: '3-End Fleece Circular machine (280 GSM)', unit: 'KG', defaultRate: 0.65, defaultConsumption: 0.45, defaultWastagePct: 4, defaultSupplier: 'In-house Knitting Div', notes: 'Hoodies & sweatshirts' },

  // 3. Dyeing & Chemical Finishing
  { id: 'rate-dye-1', category: 'PROCESSING', name: 'Reactive Solid Dyeing', spec: 'High-temp soft flow reactive, medium shade', unit: 'KG', defaultRate: 1.15, defaultConsumption: 0.22, defaultWastagePct: 4, defaultSupplier: 'Northern Dyeing Unit', notes: 'Includes scouring, bio-polish, enzymes' },
  { id: 'rate-dye-2', category: 'PROCESSING', name: 'Dark / Black Reactive Dyeing', spec: 'Extra depth jet reactive with fixing agent', unit: 'KG', defaultRate: 1.30, defaultConsumption: 0.22, defaultWastagePct: 5, defaultSupplier: 'Northern Dyeing Unit', notes: 'Jet black & navy shades' },
  { id: 'rate-dye-3', category: 'PROCESSING', name: 'Rotary All-Over Print (AOP)', spec: 'Reactive AOP print, 4-color rotary screen', unit: 'KG', defaultRate: 0.95, defaultConsumption: 0.22, defaultWastagePct: 5, defaultSupplier: 'Northern AOP Unit', notes: 'Full fabric rotary printing' },

  // 4. Trims - Labels & Identification
  { id: 'rate-trim-1', category: 'TRIMS', name: 'Woven Damask Main Label', spec: 'High-definition ultrasonic laser cut', unit: 'PC', defaultRate: 0.030, defaultConsumption: 1, defaultWastagePct: 5, defaultSupplier: 'Avery Dennison', notes: 'Main brand neck label' },
  { id: 'rate-trim-2', category: 'TRIMS', name: 'Satin Printed Care Label', spec: 'Washing symbols + multi-language 4-color', unit: 'PC', defaultRate: 0.020, defaultConsumption: 1, defaultWastagePct: 5, defaultSupplier: 'Paxar / Checkpoint', notes: 'Inside side seam care instruction' },
  { id: 'rate-trim-3', category: 'TRIMS', name: 'Heat Transfer Size Label', spec: 'Tagless eco-friendly silicone PU transfer', unit: 'PC', defaultRate: 0.015, defaultConsumption: 1, defaultWastagePct: 5, defaultSupplier: 'Avery Dennison', notes: 'Inner neck tagless transfer' },
  { id: 'rate-trim-4', category: 'TRIMS', name: 'Flag / Hem Woven Label', spec: 'Folded edge hem badge 1.5x2.5cm', unit: 'PC', defaultRate: 0.022, defaultConsumption: 1, defaultWastagePct: 5, defaultSupplier: 'Local Label Park', notes: 'Bottom hem or sleeve clip' },

  // 5. Trims - Tags, Threads & Fasteners
  { id: 'rate-trim-5', category: 'TRIMS', name: 'Hang Tag (400 GSM Art Card)', spec: 'Matte lamination + spot UV + embossed eyelet', unit: 'PC', defaultRate: 0.050, defaultConsumption: 1, defaultWastagePct: 3, defaultSupplier: 'Avery Dennison', notes: 'Exterior brand hang tag' },
  { id: 'rate-trim-6', category: 'TRIMS', name: 'Hang Tag Cord & Seal', spec: 'Braided wax cord with molded plastic seal', unit: 'PC', defaultRate: 0.020, defaultConsumption: 1, defaultWastagePct: 3, defaultSupplier: 'Avery Dennison', notes: 'Tag attachment string' },
  { id: 'rate-trim-7', category: 'TRIMS', name: 'Barcode / Price Sticker', spec: 'Buyer nominated EAN/UPC thermal sticker', unit: 'PC', defaultRate: 0.025, defaultConsumption: 1, defaultWastagePct: 3, defaultSupplier: 'Buyer Nominated', notes: 'Poly bag / hang tag price sticker' },
  { id: 'rate-trim-8', category: 'TRIMS', name: 'Sewing Thread 40/2 Spun Poly', spec: 'Astra / Coats high-tenacity core spun (140m)', unit: 'PC', defaultRate: 0.060, defaultConsumption: 1, defaultWastagePct: 8, defaultSupplier: 'Coats Bangladesh', notes: 'Thread consumption per garment' },
  { id: 'rate-trim-9', category: 'TRIMS', name: 'Neck Twill Tape (10mm)', spec: '100% Cotton herringbone tape for back neck', unit: 'PC', defaultRate: 0.022, defaultConsumption: 1, defaultWastagePct: 5, defaultSupplier: 'Apex Trims', notes: 'Back neck clean finish binding' },
  { id: 'rate-trim-10', category: 'TRIMS', name: 'Buttons (4-Hole Resin 18L)', spec: 'Engraved logo buttons for polo placket', unit: 'PC', defaultRate: 0.015, defaultConsumption: 3, defaultWastagePct: 5, defaultSupplier: 'Dekko Accessories', notes: 'Placket buttons (3 pcs per garment)' },
  { id: 'rate-trim-11', category: 'TRIMS', name: 'Metal Zipper #5 Brass/Nylon', spec: 'YKK Open-end auto lock 60cm zipper', unit: 'PC', defaultRate: 0.420, defaultConsumption: 1, defaultWastagePct: 2, defaultSupplier: 'YKK Bangladesh', notes: 'For jacket / hoodie front opening' },

  // 6. Packaging & Shipping Materials
  { id: 'rate-pack-1', category: 'PACKAGING', name: 'Individual Self-Adhesive Poly Bag', spec: 'PP Poly 0.04mm with warning text print', unit: 'PC', defaultRate: 0.040, defaultConsumption: 1, defaultWastagePct: 4, defaultSupplier: 'Local Pack Ltd', notes: 'Primary garment packaging' },
  { id: 'rate-pack-2', category: 'PACKAGING', name: 'Master Blister Poly Bag', spec: 'LDPE large poly for 24 pcs inner pack', unit: 'PC', defaultRate: 0.005, defaultConsumption: 1, defaultWastagePct: 4, defaultSupplier: 'Local Pack Ltd', notes: 'Inner bundle poly (0.12/24)' },
  { id: 'rate-pack-3', category: 'PACKAGING', name: 'Master Export Carton (7-Ply)', spec: 'Heavy corrugated carton box (holds 24 pcs)', unit: 'PC', defaultRate: 0.060, defaultConsumption: 1, defaultWastagePct: 2, defaultSupplier: 'In-house Packaging', notes: '$1.44 per carton divided by 24 pcs' },
  { id: 'rate-pack-4', category: 'PACKAGING', name: 'Gum Tape & Strapping Band', spec: '2-inch BOPP printed tape + plastic strap', unit: 'PC', defaultRate: 0.010, defaultConsumption: 1, defaultWastagePct: 2, defaultSupplier: 'Local Vendor', notes: 'Carton sealing and banding' },
  { id: 'rate-pack-5', category: 'PACKAGING', name: 'Silica Gel Desiccant Sachet', spec: '2g moisture absorbing packet in poly', unit: 'PC', defaultRate: 0.008, defaultConsumption: 1, defaultWastagePct: 2, defaultSupplier: 'Clariant BD', notes: 'Moisture protection' },

  // 7. Embellishments & Treatments
  { id: 'rate-emb-1', category: 'EMBELLISHMENT', name: 'Chest Screen Print (4-Color)', spec: 'Plastisol / Water-base eco screen print', unit: 'PC', defaultRate: 0.280, defaultConsumption: 1, defaultWastagePct: 3, defaultSupplier: 'In-house Print Floor', notes: 'Front artwork printing' },
  { id: 'rate-emb-2', category: 'EMBELLISHMENT', name: 'Chest Panel Embroidery', spec: 'Tajima 8,000 stitches logo with backing', unit: 'PC', defaultRate: 0.350, defaultConsumption: 1, defaultWastagePct: 3, defaultSupplier: 'In-house Embroidery Floor', notes: 'Direct garment embroidery' },

  // 8. CM (Cutting & Making / Direct Labor)
  { id: 'rate-cm-1', category: 'CM', name: 'CM (Cutting, Making & Ironing)', spec: 'Standard SAM 11.5 mins, floor efficiency 68%', unit: 'PC', defaultRate: 0.920, defaultConsumption: 1, defaultWastagePct: 0, defaultSupplier: 'Sewing Floor NFL-1', notes: 'Direct manufacturing labor' },

  // 9. Garment Washing & Testing
  { id: 'rate-wash-1', category: 'WASH', name: 'Garment Softener / Silicone Wash', spec: 'Rotary washer silicone bath + tumble dry', unit: 'PC', defaultRate: 0.060, defaultConsumption: 1, defaultWastagePct: 2, defaultSupplier: 'In-house Washing Unit', notes: 'Hand feel softening wash' },
  { id: 'rate-test-1', category: 'TESTING', name: 'Chemical & Physical Lab Testing', spec: 'SGS/ITS Oeko-Tex & shrinkage test batch share', unit: 'PC', defaultRate: 0.040, defaultConsumption: 1, defaultWastagePct: 0, defaultSupplier: 'SGS / ITS Nominated', notes: 'Per piece testing cost quota' }
];

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
  itemizedCosts?: ItemizedCostItem[]; // Every single component item with its individual cost rate
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
 * Calculates a single item's total cost per piece:
 * Cost = (Unit Price * Consumption) * (1 + Wastage% / 100)
 */
export function calculateItemCostPerPc(unitPrice: number, consumption: number, wastagePct: number = 0): number {
  const base = (unitPrice || 0) * (consumption || 0);
  const withWaste = base * (1 + (wastagePct || 0) / 100);
  return Number(withWaste.toFixed(4));
}

/**
 * Generate a complete itemized breakdown for a style based on master rates
 */
export function generateDefaultItemizedCostsForStyle(styleRef: string, description: string, buyer: string): ItemizedCostItem[] {
  const isPolo = description.toLowerCase().includes('polo');
  const isHoodie = description.toLowerCase().includes('hoodie') || description.toLowerCase().includes('sweat') || description.toLowerCase().includes('fleece');
  const isAop = description.toLowerCase().includes('aop');

  const items: ItemizedCostItem[] = [];

  // 1. Body Yarn
  const yarnWeight = isHoodie ? 0.42 : isPolo ? 0.24 : 0.22;
  items.push({
    id: `item-yarn-${Date.now()}-1`,
    category: 'YARN',
    name: 'Combed Cotton Yarn 30s/1',
    spec: '100% Cotton Ring Spun Combed',
    unit: 'KG',
    unitPrice: 3.85,
    consumptionPerPc: yarnWeight,
    wastagePct: 6,
    costPerPc: calculateItemCostPerPc(3.85, yarnWeight, 6),
    costPerDzn: Number((calculateItemCostPerPc(3.85, yarnWeight, 6) * 12).toFixed(3)),
    supplier: 'Northern Spinning Ltd',
    isMandatory: true,
    remarks: 'Body fabric yarn'
  });

  // 2. Rib Yarn (Neck rib / cuffs)
  const ribWeight = isHoodie ? 0.08 : 0.025;
  items.push({
    id: `item-yarn-${Date.now()}-2`,
    category: 'YARN',
    name: 'Lycra Spandex Neck Rib Yarn',
    spec: '95/5 Cotton Spandex 1x1 Rib Yarn',
    unit: 'KG',
    unitPrice: 4.20,
    consumptionPerPc: ribWeight,
    wastagePct: 8,
    costPerPc: calculateItemCostPerPc(4.20, ribWeight, 8),
    costPerDzn: Number((calculateItemCostPerPc(4.20, ribWeight, 8) * 12).toFixed(3)),
    supplier: 'Northern Spinning Ltd',
    isMandatory: true,
    remarks: 'Neck collar / rib'
  });

  // 3. Knitting Charge
  items.push({
    id: `item-knit-${Date.now()}`,
    category: 'PROCESSING',
    name: isHoodie ? 'Fleece / Terry Knitting' : 'Single Jersey Knitting Charge',
    spec: isHoodie ? '3-End Fleece circular knit' : '28G circular knit machine',
    unit: 'KG',
    unitPrice: isHoodie ? 0.65 : 0.45,
    consumptionPerPc: yarnWeight,
    wastagePct: 3,
    costPerPc: calculateItemCostPerPc(isHoodie ? 0.65 : 0.45, yarnWeight, 3),
    costPerDzn: Number((calculateItemCostPerPc(isHoodie ? 0.65 : 0.45, yarnWeight, 3) * 12).toFixed(3)),
    supplier: 'In-house Knitting Div',
    isMandatory: true,
    remarks: 'Knitting conversion charge'
  });

  // 4. Dyeing & Finishing Charge
  const dyeRate = isAop ? 0.95 : 1.15;
  items.push({
    id: `item-dye-${Date.now()}`,
    category: 'PROCESSING',
    name: isAop ? 'Rotary All-Over Print (AOP)' : 'Reactive Solid Dyeing & Finishing',
    spec: isAop ? '4-color rotary reactive AOP' : 'High temp soft flow reactive dye',
    unit: 'KG',
    unitPrice: dyeRate,
    consumptionPerPc: yarnWeight,
    wastagePct: 4,
    costPerPc: calculateItemCostPerPc(dyeRate, yarnWeight, 4),
    costPerDzn: Number((calculateItemCostPerPc(dyeRate, yarnWeight, 4) * 12).toFixed(3)),
    supplier: 'Northern Dyeing Unit',
    isMandatory: true,
    remarks: 'Fabric dyeing & chemical finish'
  });

  // 5. Trims - Labels
  items.push({
    id: `item-trim-1-${Date.now()}`,
    category: 'TRIMS',
    name: 'Woven Damask Main Label',
    spec: 'Laser cut center fold brand label',
    unit: 'PC',
    unitPrice: 0.030,
    consumptionPerPc: 1,
    wastagePct: 5,
    costPerPc: 0.0315,
    costPerDzn: 0.378,
    supplier: 'Avery Dennison',
    isMandatory: true
  });

  items.push({
    id: `item-trim-2-${Date.now()}`,
    category: 'TRIMS',
    name: 'Satin Printed Care Label',
    spec: 'Multi-lingual wash care instruction',
    unit: 'PC',
    unitPrice: 0.020,
    consumptionPerPc: 1,
    wastagePct: 5,
    costPerPc: 0.0210,
    costPerDzn: 0.252,
    supplier: 'Paxar / Checkpoint',
    isMandatory: true
  });

  items.push({
    id: `item-trim-3-${Date.now()}`,
    category: 'TRIMS',
    name: 'Hang Tag & Cord',
    spec: '400 GSM art card with braided wax cord',
    unit: 'PC',
    unitPrice: 0.070,
    consumptionPerPc: 1,
    wastagePct: 3,
    costPerPc: 0.0721,
    costPerDzn: 0.865,
    supplier: 'Avery Dennison',
    isMandatory: true
  });

  items.push({
    id: `item-trim-4-${Date.now()}`,
    category: 'TRIMS',
    name: 'Sewing Thread 40/2',
    spec: 'Coats Astra spun poly core (140m)',
    unit: 'PC',
    unitPrice: 0.060,
    consumptionPerPc: 1,
    wastagePct: 8,
    costPerPc: 0.0648,
    costPerDzn: 0.778,
    supplier: 'Coats Bangladesh',
    isMandatory: true
  });

  items.push({
    id: `item-trim-5-${Date.now()}`,
    category: 'TRIMS',
    name: 'Barcode / Price Ticket',
    spec: 'Buyer thermal sticker for hangtag',
    unit: 'PC',
    unitPrice: 0.025,
    consumptionPerPc: 1,
    wastagePct: 3,
    costPerPc: 0.0258,
    costPerDzn: 0.309,
    supplier: 'Buyer Nominated',
    isMandatory: true
  });

  if (isPolo) {
    items.push({
      id: `item-trim-btn-${Date.now()}`,
      category: 'TRIMS',
      name: 'Placket Resin Buttons (18L)',
      spec: '4-hole engraved polyester button (3 pcs)',
      unit: 'PC',
      unitPrice: 0.015,
      consumptionPerPc: 3,
      wastagePct: 5,
      costPerPc: 0.0473,
      costPerDzn: 0.567,
      supplier: 'Dekko Accessories',
      isMandatory: true
    });
  }

  // 6. Packaging
  items.push({
    id: `item-pack-1-${Date.now()}`,
    category: 'PACKAGING',
    name: 'Individual Self-Adhesive Poly Bag',
    spec: 'PP Clear poly 0.04mm with warning print',
    unit: 'PC',
    unitPrice: 0.040,
    consumptionPerPc: 1,
    wastagePct: 4,
    costPerPc: 0.0416,
    costPerDzn: 0.499,
    supplier: 'Local Pack Ltd',
    isMandatory: true
  });

  items.push({
    id: `item-pack-2-${Date.now()}`,
    category: 'PACKAGING',
    name: 'Master Export Carton (7-Ply)',
    spec: 'Heavy corrugated box ($1.44 / 24 pcs)',
    unit: 'PC',
    unitPrice: 0.060,
    consumptionPerPc: 1,
    wastagePct: 2,
    costPerPc: 0.0612,
    costPerDzn: 0.734,
    supplier: 'In-house Packaging',
    isMandatory: true
  });

  items.push({
    id: `item-pack-3-${Date.now()}`,
    category: 'PACKAGING',
    name: 'Gum Tape & Silica Gel Desiccant',
    spec: 'BOPP sealing tape + 2g silica packet',
    unit: 'PC',
    unitPrice: 0.018,
    consumptionPerPc: 1,
    wastagePct: 2,
    costPerPc: 0.0184,
    costPerDzn: 0.220,
    supplier: 'Local Vendor'
  });

  // 7. CM (Direct Labor)
  const cmRate = isHoodie ? 1.85 : isPolo ? 1.25 : 0.92;
  items.push({
    id: `item-cm-${Date.now()}`,
    category: 'CM',
    name: 'CM (Cutting, Making & Ironing Labor)',
    spec: `Standard SAM ${isHoodie ? '24.5' : isPolo ? '18.0' : '11.5'} mins @ 68% line efficiency`,
    unit: 'PC',
    unitPrice: cmRate,
    consumptionPerPc: 1,
    wastagePct: 0,
    costPerPc: cmRate,
    costPerDzn: Number((cmRate * 12).toFixed(2)),
    supplier: 'Sewing Floor NFL-1',
    isMandatory: true
  });

  // 8. Wash & Testing
  items.push({
    id: `item-wash-${Date.now()}`,
    category: 'WASH',
    name: 'Garment Softener / Silicone Wash',
    spec: 'Rotary washer softening bath + tumble dry',
    unit: 'PC',
    unitPrice: 0.060,
    consumptionPerPc: 1,
    wastagePct: 2,
    costPerPc: 0.0612,
    costPerDzn: 0.734,
    supplier: 'In-house Washing Unit'
  });

  items.push({
    id: `item-test-${Date.now()}`,
    category: 'TESTING',
    name: 'Chemical & Physical Testing Quota',
    spec: 'SGS/ITS Oeko-Tex & shrinkage batch share',
    unit: 'PC',
    unitPrice: 0.040,
    consumptionPerPc: 1,
    wastagePct: 0,
    costPerPc: 0.040,
    costPerDzn: 0.480,
    supplier: 'SGS Nominated Lab'
  });

  return items;
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
  totalCmPerPc: number;
  totalWashAndTestPerPc: number;
  totalEmbellishmentPerPc: number;
  commercialOverheadPerPc: number;
  profitPerPc: number;
  buyingCommissionPerPc: number;
  finalFobPrice: number;
  costPerDzn: number;
  categoryBreakdown: {
    category: string;
    cost: number;
    pct: number;
  }[];
} {
  // If itemizedCosts are provided, we can sum them up precisely per category!
  if (sheet.itemizedCosts && sheet.itemizedCosts.length > 0) {
    let fabricTotal = 0;
    let trimsTotal = 0;
    let cmTotal = 0;
    let embTotal = 0;
    let washTestTotal = 0;

    sheet.itemizedCosts.forEach((item) => {
      const rowCost = item.costPerPc || calculateItemCostPerPc(item.unitPrice, item.consumptionPerPc, item.wastagePct);
      if (item.category === 'YARN' || item.category === 'FABRIC' || item.category === 'PROCESSING') {
        fabricTotal += rowCost;
      } else if (item.category === 'TRIMS' || item.category === 'PACKAGING') {
        trimsTotal += rowCost;
      } else if (item.category === 'CM') {
        cmTotal += rowCost;
      } else if (item.category === 'EMBELLISHMENT') {
        embTotal += rowCost;
      } else if (item.category === 'WASH' || item.category === 'TESTING') {
        washTestTotal += rowCost;
      } else {
        trimsTotal += rowCost;
      }
    });

    const directProductionCost = fabricTotal + trimsTotal + cmTotal + embTotal + washTestTotal;
    const oc = sheet.otherCosts || ({} as any);
    const commOverheadPct = Number(oc.commercialOverheadPct || 3.5) / 100;
    const profitPct = Number(oc.profitPct || 8.0) / 100;
    const buyingCommPct = Number(oc.buyingCommissionPct || 5.0) / 100;

    const commercialOverheadPerPc = Number((directProductionCost * commOverheadPct).toFixed(3));
    const profitPerPc = Number(((directProductionCost + commercialOverheadPerPc) * profitPct).toFixed(3));
    const subTotalBeforeComm = directProductionCost + commercialOverheadPerPc + profitPerPc;
    const buyingCommissionPerPc = Number((subTotalBeforeComm * buyingCommPct).toFixed(3));
    const finalFobPrice = Number((subTotalBeforeComm + buyingCommissionPerPc).toFixed(2));
    const costPerDzn = Number((finalFobPrice * 12).toFixed(2));

    const totalForPct = finalFobPrice > 0 ? finalFobPrice : 1;
    const categoryBreakdown = [
      { category: 'Fabric & Processing', cost: Number(fabricTotal.toFixed(2)), pct: Math.round((fabricTotal / totalForPct) * 100) },
      { category: 'Trims & Packaging', cost: Number(trimsTotal.toFixed(2)), pct: Math.round((trimsTotal / totalForPct) * 100) },
      { category: 'CM (Direct Labor)', cost: Number(cmTotal.toFixed(2)), pct: Math.round((cmTotal / totalForPct) * 100) },
      { category: 'Embellishments', cost: Number(embTotal.toFixed(2)), pct: Math.round((embTotal / totalForPct) * 100) },
      { category: 'Wash & Testing', cost: Number(washTestTotal.toFixed(2)), pct: Math.round((washTestTotal / totalForPct) * 100) },
      { category: 'Overheads & Profit', cost: Number((commercialOverheadPerPc + profitPerPc + buyingCommissionPerPc).toFixed(2)), pct: Math.round(((commercialOverheadPerPc + profitPerPc + buyingCommissionPerPc) / totalForPct) * 100) }
    ];

    return {
      totalFabricCostPerPc: Number(fabricTotal.toFixed(3)),
      totalAccessoriesPerPc: Number(trimsTotal.toFixed(3)),
      totalProductionCostPerPc: Number(directProductionCost.toFixed(3)),
      totalCmPerPc: Number(cmTotal.toFixed(3)),
      totalWashAndTestPerPc: Number(washTestTotal.toFixed(3)),
      totalEmbellishmentPerPc: Number(embTotal.toFixed(3)),
      commercialOverheadPerPc,
      profitPerPc,
      buyingCommissionPerPc,
      finalFobPrice,
      costPerDzn,
      categoryBreakdown
    };
  }

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
    totalFabricCostPerPc = 1.68;
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
  const oc = sheet.otherCosts || ({} as any);
  const collarCuff = Number(oc.collarCuffPerPc || 0.12);
  const cm = Number(oc.cmCuttingMakingPerPc || 0.95);
  const print = Number(oc.screenPrintPerPc || 0);
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

  const totalForPct = finalFobPrice > 0 ? finalFobPrice : 1;
  const categoryBreakdown = [
    { category: 'Fabric & Processing', cost: Number(totalFabricCostPerPc.toFixed(2)), pct: Math.round((totalFabricCostPerPc / totalForPct) * 100) },
    { category: 'Trims & Packaging', cost: Number(totalAccessoriesPerPc.toFixed(2)), pct: Math.round((totalAccessoriesPerPc / totalForPct) * 100) },
    { category: 'CM (Direct Labor)', cost: Number(cm.toFixed(2)), pct: Math.round((cm / totalForPct) * 100) },
    { category: 'Embellishments', cost: Number((print + emb + seq + stone).toFixed(2)), pct: Math.round(((print + emb + seq + stone) / totalForPct) * 100) },
    { category: 'Wash & Testing', cost: Number((wash + chemTest).toFixed(2)), pct: Math.round(((wash + chemTest) / totalForPct) * 100) },
    { category: 'Overheads & Profit', cost: Number((commercialOverheadPerPc + profitPerPc + buyingCommissionPerPc).toFixed(2)), pct: Math.round(((commercialOverheadPerPc + profitPerPc + buyingCommissionPerPc) / totalForPct) * 100) }
  ];

  return {
    totalFabricCostPerPc: Number(totalFabricCostPerPc.toFixed(3)),
    totalAccessoriesPerPc: Number(totalAccessoriesPerPc.toFixed(3)),
    totalProductionCostPerPc: Number(directProductionCost.toFixed(3)),
    totalCmPerPc: Number(cm.toFixed(3)),
    totalWashAndTestPerPc: Number((wash + chemTest).toFixed(3)),
    totalEmbellishmentPerPc: Number((print + emb + seq + stone).toFixed(3)),
    commercialOverheadPerPc,
    profitPerPc,
    buyingCommissionPerPc,
    finalFobPrice,
    costPerDzn,
    categoryBreakdown
  };
}
