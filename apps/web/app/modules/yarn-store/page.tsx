'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import MerchandisingYarnRequisitionForm, { YarnRequisitionFormData } from '../../../components/MerchandisingYarnRequisitionForm';
import YarnDepletionDashboard from '../../../components/YarnDepletionDashboard';

type YarnStoreTab = 
  | 'requisitions' 
  | 'purchasing' 
  | 'safety-stock' 
  | 'receive-grn' 
  | 'delivery-issue' 
  | 'stock-ledger' 
  | 'dead-stock'
  | 'depletion-trends';

function num(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })) : String(v);
}

function dt(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// 1. Merchandising Requisition initial dataset
interface YarnRequisition {
  id: string;
  reqNo: string;
  reqDate: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  garmentItem: string;
  fabricType: string;
  yarnCount: string;
  composition: string;
  requiredKg: number;
  inHouseTarget: string;
  status: 'ALLOCATED' | 'PO_IN_PROGRESS' | 'PENDING_PURCHASE';
  poRef?: string;
  allocatedLot?: string;
  merchandiser: string;
}

const INITIAL_REQUISITIONS: YarnRequisition[] = [
  {
    id: 'YREQ-01',
    reqNo: 'YRN-REQ-2026-081',
    reqDate: '2026-08-01',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    garmentItem: 'Lurex T-Shirt',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    yarnCount: '30/1 Ne Combed',
    composition: '98% Cotton + 2% Metallic Lurex',
    requiredKg: 4850,
    inHouseTarget: '2026-08-05',
    status: 'ALLOCATED',
    allocatedLot: 'LOT-SL-301 (Godown A)',
    merchandiser: 'Md. Jahidul Islam'
  },
  {
    id: 'YREQ-02',
    reqNo: 'YRN-REQ-2026-082',
    reqDate: '2026-08-02',
    jobNo: '48086',
    buyer: 'BS-JJ',
    styleNo: '12267123',
    garmentItem: 'Hooded Sweatshirt',
    fabricType: 'CVC Fleece 280 GSM',
    yarnCount: '32/1 CVC + 10/1 Poly',
    composition: '60% Cotton / 40% Polyester',
    requiredKg: 7200,
    inHouseTarget: '2026-08-08',
    status: 'PO_IN_PROGRESS',
    poRef: 'PO-YRN-SQR-904',
    merchandiser: 'K. M. Tareq'
  },
  {
    id: 'YREQ-03',
    reqNo: 'YRN-REQ-2026-083',
    reqDate: '2026-08-03',
    jobNo: '48087',
    buyer: 'ONLY',
    styleNo: '15289944',
    garmentItem: 'Basic Crewneck',
    fabricType: 'Single Jersey 160 GSM',
    yarnCount: '30/1 Ne Combed',
    composition: '100% Cotton',
    requiredKg: 3600,
    inHouseTarget: '2026-08-07',
    status: 'ALLOCATED',
    allocatedLot: 'LOT-SL-301 (Godown A)',
    merchandiser: 'S. N. Shuvo'
  },
  {
    id: 'YREQ-04',
    reqNo: 'YRN-REQ-2026-084',
    reqDate: '2026-08-04',
    jobNo: '48088',
    buyer: 'OVS',
    styleNo: '903412',
    garmentItem: 'Polo Shirt',
    fabricType: 'Pique / Lacoste 200 GSM',
    yarnCount: '24/1 Ne Slub Cotton',
    composition: '100% Slub Cotton',
    requiredKg: 5400,
    inHouseTarget: '2026-08-12',
    status: 'PO_IN_PROGRESS',
    poRef: 'PO-YRN-BDSH-812',
    merchandiser: 'Md. Jahidul Islam'
  },
  {
    id: 'YREQ-05',
    reqNo: 'YRN-REQ-2026-085',
    reqDate: '2026-08-05',
    jobNo: '48092',
    buyer: 'UTG',
    styleNo: '882190',
    garmentItem: 'Fleece Pullover',
    fabricType: 'Terry / Fleece 260 GSM',
    yarnCount: '20/1 Ne Carded + 30/1 Terry',
    composition: '100% Cotton',
    requiredKg: 4200,
    inHouseTarget: '2026-08-14',
    status: 'PENDING_PURCHASE',
    merchandiser: 'K. M. Tareq'
  }
];

// 2. Yarn Purchasing initial dataset
interface YarnPurchaseOrder {
  id: string;
  poNo: string;
  spinningMill: string;
  yarnCount: string;
  composition: string;
  orderKg: number;
  unitPriceUsd: number;
  totalUsd: number;
  lcNo: string;
  piDate: string;
  etd: string;
  eta: string;
  status: 'PO_ISSUED' | 'LC_OPENED' | 'IN_TRANSIT' | 'ARRIVED';
  paymentTerms: string;
  remarks: string;
}

const INITIAL_PURCHASE_ORDERS: YarnPurchaseOrder[] = [
  {
    id: 'YPO-01',
    poNo: 'PO-YRN-SQR-904',
    spinningMill: 'Square Textiles Ltd.',
    yarnCount: '30/1 Ne Combed Cotton',
    composition: '100% Cotton BCI Certified',
    orderKg: 20000,
    unitPriceUsd: 3.85,
    totalUsd: 77000,
    lcNo: 'LC-2026-SQR-0441',
    piDate: '2026-07-28',
    etd: '2026-08-04',
    eta: '2026-08-07',
    status: 'ARRIVED',
    paymentTerms: 'At Sight Letter of Credit',
    remarks: 'Delivered to Kashimpur Godown A on 4 trucks'
  },
  {
    id: 'YPO-02',
    poNo: 'PO-YRN-ENV-882',
    spinningMill: 'Envoy Textiles Ltd.',
    yarnCount: '26/1 Ne Carded Cotton',
    composition: '100% Cotton Ring Spun',
    orderKg: 15000,
    unitPriceUsd: 3.55,
    totalUsd: 53250,
    lcNo: 'LC-2026-ENV-0199',
    piDate: '2026-08-01',
    etd: '2026-08-08',
    eta: '2026-08-11',
    status: 'IN_TRANSIT',
    paymentTerms: '60 Days Usance L/C',
    remarks: 'Dispatched from Mymensingh mill; in transit on road'
  },
  {
    id: 'YPO-03',
    poNo: 'PO-YRN-BDSH-812',
    spinningMill: 'Badsha Textiles Ltd.',
    yarnCount: '24/1 Ne Cotton Slub',
    composition: '100% Cotton Ring Slub',
    orderKg: 10000,
    unitPriceUsd: 3.95,
    totalUsd: 39500,
    lcNo: 'LC-2026-BDS-0711',
    piDate: '2026-08-03',
    etd: '2026-08-10',
    eta: '2026-08-14',
    status: 'LC_OPENED',
    paymentTerms: 'At Sight L/C',
    remarks: 'Replenishing critical slub safety stock buffer'
  },
  {
    id: 'YPO-04',
    poNo: 'PO-YRN-AKJ-411',
    spinningMill: 'Akij Spinning Mills Ltd.',
    yarnCount: '32/1 CVC 60/40 Melange',
    composition: '60% Cotton / 40% Polyester Melange',
    orderKg: 12000,
    unitPriceUsd: 4.10,
    totalUsd: 49200,
    lcNo: 'LC-2026-AKJ-0304',
    piDate: '2026-08-05',
    etd: '2026-08-12',
    eta: '2026-08-16',
    status: 'PO_ISSUED',
    paymentTerms: '90 Days Deferred L/C',
    remarks: 'For winter fleece program Bestseller orders'
  },
  {
    id: 'YPO-05',
    poNo: 'PO-YRN-SHS-205',
    spinningMill: 'Shasha Denims / Yarn Div',
    yarnCount: '40D Spandex (Creora / Hyosung)',
    composition: '100% Polyurethane Spandex Filament',
    orderKg: 3000,
    unitPriceUsd: 7.20,
    totalUsd: 21600,
    lcNo: 'LC-2026-SHS-0118',
    piDate: '2026-08-02',
    etd: '2026-08-06',
    eta: '2026-08-09',
    status: 'ARRIVED',
    paymentTerms: 'At Sight L/C',
    remarks: 'Spandex inventory for 2x2 Lycra rib lines'
  }
];

// 3. Yarn Safety Stock initial dataset
export interface YarnSafetyItem {
  id: string;
  yarnCount: string;
  composition: string;
  physicalStock: number;
  dailyBurnKg: number;
  leadTimeDays: number;
  nominatedMill: string;
}

export interface CalculatedSafetyItem extends YarnSafetyItem {
  effectiveDailyBurn: number;
  safetyStockTarget: number;
  leadTimeConsumption: number;
  reorderPoint: number;
  runwayDays: number;
  diff: number;
  deficitKg: number;
  isBelowRop: boolean;
  isCritical: boolean;
  status: 'SAFE' | 'BELOW_SAFETY' | 'CRITICAL' | 'SURPLUS';
  recommendedOrderKg: number;
}

const INITIAL_SAFETY_ROWS: YarnSafetyItem[] = [
  { id: 'YS-01', yarnCount: '30/1 Ne Combed Cotton', composition: '100% Cotton BCI', physicalStock: 38400, dailyBurnKg: 1800, leadTimeDays: 14, nominatedMill: 'Square Textiles Ltd.' },
  { id: 'YS-02', yarnCount: '26/1 Ne Carded Cotton', composition: '100% Cotton Ring Spun', physicalStock: 14200, dailyBurnKg: 1200, leadTimeDays: 14, nominatedMill: 'Envoy Textiles Ltd.' },
  { id: 'YS-03', yarnCount: '24/1 Ne Cotton Slub', composition: '100% Cotton Ring Slub', physicalStock: 3400, dailyBurnKg: 650, leadTimeDays: 18, nominatedMill: 'Badsha Textiles Ltd.' },
  { id: 'YS-04', yarnCount: '20/1 Ne Carded Cotton', composition: '100% Cotton Carded', physicalStock: 15600, dailyBurnKg: 850, leadTimeDays: 14, nominatedMill: 'Kamal Yarn Mills Ltd.' },
  { id: 'YS-05', yarnCount: '30/1 Ne CVC 60/40 Melange', composition: '60/40 Cotton-Poly', physicalStock: 9500, dailyBurnKg: 950, leadTimeDays: 21, nominatedMill: 'Akij Spinning Mills Ltd.' },
  { id: 'YS-06', yarnCount: '34/1 Ne Combed Cotton', composition: '100% Cotton BCI Combed', physicalStock: 18200, dailyBurnKg: 1100, leadTimeDays: 14, nominatedMill: 'Square Textiles Ltd.' },
  { id: 'YS-07', yarnCount: '40/1 Ne Combed Cotton', composition: '100% Cotton (Rib/Interlock)', physicalStock: 7400, dailyBurnKg: 400, leadTimeDays: 14, nominatedMill: 'Envoy Textiles Ltd.' },
  { id: 'YS-08', yarnCount: '40D Spandex / Elastane', composition: 'Creora / Hyosung', physicalStock: 4100, dailyBurnKg: 220, leadTimeDays: 10, nominatedMill: 'Shasha Denims / Yarn Div' },
  { id: 'YS-09', yarnCount: '70D Spandex / Elastane', composition: 'Creora / Hyosung', physicalStock: 1800, dailyBurnKg: 180, leadTimeDays: 10, nominatedMill: 'Shasha Denims / Yarn Div' }
];

// 4. Yarn Receive (GRN) initial dataset
interface YarnGrnReceive {
  id: string;
  grnNo: string;
  grnDate: string;
  spinningMill: string;
  challanNo: string;
  truckNo: string;
  millLotNo: string;
  yarnCount: string;
  bagCount: number;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  labTestStatus: 'PASSED' | 'PENDING' | 'REJECTED';
  labCertRef: string;
  testedCountNe: string;
  cspStrength: number;
  storageLocation: string;
  receivedBy: string;
}

const INITIAL_GRN_RECEIVES: YarnGrnReceive[] = [
  {
    id: 'GRN-01',
    grnNo: 'GRN-YRN-2026-101',
    grnDate: '2026-08-02',
    spinningMill: 'Square Textiles Ltd.',
    challanNo: 'CH-SQR-88192',
    truckNo: 'DM-TA-14-9921',
    millLotNo: 'LOT-SL-301',
    yarnCount: '30/1 Ne Combed Cotton',
    bagCount: 110,
    grossWeightKg: 5040,
    tareWeightKg: 50,
    netWeightKg: 4990,
    labTestStatus: 'PASSED',
    labCertRef: 'COA-YRN-48085-A',
    testedCountNe: '29.8s Ne',
    cspStrength: 2840,
    storageLocation: 'Godown A · Bay 04',
    receivedBy: 'T. Hossain (Store Head)'
  },
  {
    id: 'GRN-02',
    grnNo: 'GRN-YRN-2026-102',
    grnDate: '2026-08-04',
    spinningMill: 'Envoy Textiles Ltd.',
    challanNo: 'CH-ENV-44021',
    truckNo: 'DM-TA-11-4032',
    millLotNo: 'LOT-SL-302',
    yarnCount: '26/1 Ne Carded Cotton',
    bagCount: 88,
    grossWeightKg: 4030,
    tareWeightKg: 40,
    netWeightKg: 3990,
    labTestStatus: 'PASSED',
    labCertRef: 'COA-YRN-48086-T',
    testedCountNe: '25.9s Ne',
    cspStrength: 2680,
    storageLocation: 'Godown A · Bay 07',
    receivedBy: 'R. K. Roy (Store Officer)'
  },
  {
    id: 'GRN-03',
    grnNo: 'GRN-YRN-2026-103',
    grnDate: '2026-08-06',
    spinningMill: 'Shasha Denims / Yarn',
    challanNo: 'CH-SHS-0912',
    truckNo: 'DM-KA-23-1109',
    millLotNo: 'LOT-SPX-204',
    yarnCount: '40D Spandex (Creora)',
    bagCount: 60,
    grossWeightKg: 1530,
    tareWeightKg: 20,
    netWeightKg: 1510,
    labTestStatus: 'PASSED',
    labCertRef: 'COA-SPX-2026-09',
    testedCountNe: '40 Denier',
    cspStrength: 3100,
    storageLocation: 'Godown B · AC Chamber 1',
    receivedBy: 'T. Hossain (Store Head)'
  },
  {
    id: 'GRN-04',
    grnNo: 'GRN-YRN-2026-104',
    grnDate: '2026-08-07',
    spinningMill: 'Badsha Textiles Ltd.',
    challanNo: 'CH-BDS-7741',
    truckNo: 'DM-TA-19-8802',
    millLotNo: 'LOT-PIQ-09',
    yarnCount: '24/1 Ne Cotton Slub',
    bagCount: 75,
    grossWeightKg: 3430,
    tareWeightKg: 30,
    netWeightKg: 3400,
    labTestStatus: 'PASSED',
    labCertRef: 'COA-SLB-2026-14',
    testedCountNe: '23.8s Slub',
    cspStrength: 2620,
    storageLocation: 'Godown A · Bay 02',
    receivedBy: 'R. K. Roy (Store Officer)'
  }
];

// 5. Yarn Delivery & Issue to Knitting initial dataset
interface YarnDeliveryIssue {
  id: string;
  issueChallanNo: string;
  issueDate: string;
  programNo: string;
  jobNo: string;
  buyer: string;
  fabricType: string;
  yarnCount: string;
  lotNo: string;
  targetMachine: string;
  bagCount: number;
  grossWeightKg: number;
  netWeightKg: number;
  returnedLeftoverKg: number;
  netConsumedKg: number;
  issuedBy: string;
  receivedByKnitting: string;
  status: 'ISSUED' | 'RUNNING' | 'CLOSED';
}

const INITIAL_DELIVERY_ISSUES: YarnDeliveryIssue[] = [
  {
    id: 'YISS-01',
    issueChallanNo: 'CH-KNIT-48085-01',
    issueDate: '2026-08-03',
    programNo: 'PROG-KNT-48085-SJ',
    jobNo: '48085',
    buyer: 'BS-NMT',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    yarnCount: '30/1 Ne Combed Cotton',
    lotNo: 'LOT-SL-301',
    targetMachine: 'Circular M/C #04 (Mayer & Cie)',
    bagCount: 50,
    grossWeightKg: 2280,
    netWeightKg: 2268,
    returnedLeftoverKg: 32,
    netConsumedKg: 2236,
    issuedBy: 'T. Hossain (Store Head)',
    receivedByKnitting: 'Alamgir (Knitting Master)',
    status: 'CLOSED'
  },
  {
    id: 'YISS-02',
    issueChallanNo: 'CH-KNIT-48085-02',
    issueDate: '2026-08-04',
    programNo: 'PROG-KNT-48085-RIB',
    jobNo: '48085',
    buyer: 'BS-NMT',
    fabricType: '1x1 Rib 220 GSM',
    yarnCount: '30/1 Ne Combed + 40D Spandex',
    lotNo: 'LOT-RIB-101 / LOT-SPX-204',
    targetMachine: 'Circular M/C #08 (Rib 1x1 Terrot)',
    bagCount: 22,
    grossWeightKg: 1010,
    netWeightKg: 1005,
    returnedLeftoverKg: 15,
    netConsumedKg: 990,
    issuedBy: 'R. K. Roy (Store Officer)',
    receivedByKnitting: 'Kabir (Shift In-charge)',
    status: 'CLOSED'
  },
  {
    id: 'YISS-03',
    issueChallanNo: 'CH-KNIT-48086-01',
    issueDate: '2026-08-05',
    programNo: 'PROG-KNT-48086-FLC',
    jobNo: '48086',
    buyer: 'BS-JJ',
    fabricType: 'CVC Fleece 280 GSM',
    yarnCount: '32/1 CVC + 10/1 Poly',
    lotNo: 'LOT-FLC-501',
    targetMachine: 'Circular M/C #12 (Fleece Pailung)',
    bagCount: 80,
    grossWeightKg: 3650,
    netWeightKg: 3628,
    returnedLeftoverKg: 0,
    netConsumedKg: 3628,
    issuedBy: 'T. Hossain (Store Head)',
    receivedByKnitting: 'Alamgir (Knitting Master)',
    status: 'RUNNING'
  },
  {
    id: 'YISS-04',
    issueChallanNo: 'CH-KNIT-48087-01',
    issueDate: '2026-08-06',
    programNo: 'PROG-KNT-48087-SJ',
    jobNo: '48087',
    buyer: 'ONLY',
    fabricType: 'Single Jersey 160 GSM',
    yarnCount: '30/1 Ne Combed Cotton',
    lotNo: 'LOT-SL-301',
    targetMachine: 'Circular M/C #02 (Vignoni)',
    bagCount: 40,
    grossWeightKg: 1825,
    netWeightKg: 1814,
    returnedLeftoverKg: 0,
    netConsumedKg: 1814,
    issuedBy: 'R. K. Roy (Store Officer)',
    receivedByKnitting: 'Zahir (Knitting Supervisor)',
    status: 'RUNNING'
  }
];

export default function YarnStorePage() {
  const [tab, setTab] = useState<YarnStoreTab>('requisitions');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tab') as YarnStoreTab;
      if (t && ['requisitions', 'purchasing', 'safety-stock', 'receive-grn', 'delivery-issue', 'stock-ledger', 'dead-stock', 'depletion-trends'].includes(t)) {
        setTab(t);
      }
      if (p.get('openForm') === 'true') {
        setShowInlineReqForm(true);
      }
    }
  }, []);

  // Interactive state
  const [requisitions, setRequisitions] = useState<YarnRequisition[]>(INITIAL_REQUISITIONS);
  const [purchaseOrders, setPurchaseOrders] = useState<YarnPurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [safetyRows, setSafetyRows] = useState<YarnSafetyItem[]>(INITIAL_SAFETY_ROWS);
  const [grnReceives, setGrnReceives] = useState<YarnGrnReceive[]>(INITIAL_GRN_RECEIVES);
  const [deliveryIssues, setDeliveryIssues] = useState<YarnDeliveryIssue[]>(INITIAL_DELIVERY_ISSUES);

  // Filter state
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  // Modals & Panels
  const [showAddReqModal, setShowAddReqModal] = useState(false);
  const [showInlineReqForm, setShowInlineReqForm] = useState(false);
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showAddGrnModal, setShowAddGrnModal] = useState(false);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);

  // Automated Safety Stock Threshold State
  const [safetyBufferDays, setSafetyBufferDays] = useState<number>(7);
  const [burnMultiplier, setBurnMultiplier] = useState<number>(1.0);
  const [safetyFilter, setSafetyFilter] = useState<'ALL' | 'BREACHED' | 'CRITICAL'>('ALL');
  const [editingYarnId, setEditingYarnId] = useState<string | null>(null);
  const [editBurnValue, setEditBurnValue] = useState<number>(0);
  const [editLeadTimeValue, setEditLeadTimeValue] = useState<number>(0);

  // Stock lookup for Merchandising requisition form allocation preview
  const stockLookup = useMemo(() => {
    const map: Record<string, number> = {};
    safetyRows.forEach(r => {
      map[r.yarnCount] = r.physicalStock;
    });
    return map;
  }, [safetyRows]);

  // Automated dynamic safety stock calculation & threshold flagging based on daily burn rate
  const calculatedSafetyRows = useMemo<CalculatedSafetyItem[]>(() => {
    return safetyRows.map(row => {
      const effectiveDailyBurn = Math.round(row.dailyBurnKg * burnMultiplier);
      const safetyStockTarget = Math.round(effectiveDailyBurn * safetyBufferDays);
      const leadTimeConsumption = Math.round(effectiveDailyBurn * row.leadTimeDays);
      const reorderPoint = leadTimeConsumption + safetyStockTarget;
      const diff = row.physicalStock - reorderPoint;
      const deficitKg = diff < 0 ? Math.abs(diff) : 0;
      const runwayDays = effectiveDailyBurn > 0 ? Number((row.physicalStock / effectiveDailyBurn).toFixed(1)) : 999;
      const isCritical = runwayDays <= 5 || row.physicalStock < (reorderPoint * 0.45);
      const isBelowRop = row.physicalStock < reorderPoint;
      const status: 'CRITICAL' | 'BELOW_SAFETY' | 'SAFE' | 'SURPLUS' = isCritical 
        ? 'CRITICAL' 
        : isBelowRop 
          ? 'BELOW_SAFETY' 
          : (row.physicalStock > reorderPoint * 2.3 ? 'SURPLUS' : 'SAFE');
      const recommendedOrderKg = isBelowRop ? Math.ceil((reorderPoint * 1.35 - row.physicalStock) / 500) * 500 : 0;

      return {
        ...row,
        effectiveDailyBurn,
        safetyStockTarget,
        leadTimeConsumption,
        reorderPoint,
        runwayDays,
        diff,
        deficitKg,
        isBelowRop,
        isCritical,
        status,
        recommendedOrderKg
      };
    });
  }, [safetyRows, burnMultiplier, safetyBufferDays]);

  // New PO form
  const [newPo, setNewPo] = useState({
    spinningMill: 'Square Textiles Ltd.',
    yarnCount: '30/1 Ne Combed Cotton',
    composition: '100% Cotton',
    orderKg: 10000,
    unitPriceUsd: 3.85,
    paymentTerms: 'At Sight L/C',
    remarks: 'Urgent buffer replenishment'
  });

  // New GRN form
  const [newGrn, setNewGrn] = useState({
    spinningMill: 'Square Textiles Ltd.',
    challanNo: 'CH-SQR-9901',
    truckNo: 'DM-TA-12-8800',
    millLotNo: 'LOT-NEW-101',
    yarnCount: '30/1 Ne Combed Cotton',
    bagCount: 100,
    netWeightKg: 4536,
    storageLocation: 'Godown A · Bay 05'
  });

  // New Issue form
  const [newIssue, setNewIssue] = useState({
    jobNo: '48085',
    buyer: 'BS-NMT',
    fabricType: 'Single Jersey 180 GSM',
    yarnCount: '30/1 Ne Combed Cotton',
    lotNo: 'LOT-SL-301',
    targetMachine: 'Circular M/C #04',
    bagCount: 30,
    netWeightKg: 1360
  });

  // Overall calculations
  const summary = useMemo(() => {
    const totalPhysicalStock = safetyRows.reduce((s, r) => s + r.physicalStock, 0);
    const totalSafetyBuffer = calculatedSafetyRows.reduce((s, r) => s + r.safetyStockTarget, 0);
    const totalPipeline = purchaseOrders.filter(p => p.status !== 'ARRIVED').reduce((s, p) => s + p.orderKg, 0);
    const totalGrnRcvd = grnReceives.reduce((s, g) => s + g.netWeightKg, 0);
    const totalIssuedKnitting = deliveryIssues.reduce((s, d) => s + d.netWeightKg, 0);
    const criticalCounts = calculatedSafetyRows.filter(r => r.isBelowRop).length;

    return {
      totalPhysicalStock,
      totalSafetyBuffer,
      totalPipeline,
      totalGrnRcvd,
      totalIssuedKnitting,
      criticalCounts,
      closingStock: totalPhysicalStock,
      reservedStock: 112000
    };
  }, [safetyRows, calculatedSafetyRows, purchaseOrders, grnReceives, deliveryIssues]);

  // Handler for Merchandising Yarn Requisition submission
  function handleCreateRequisitionDirect(formData: YarnRequisitionFormData) {
    const reqNo = `YRN-REQ-2026-${String(requisitions.length + 101).padStart(3, '0')}`;
    const matchingStock = stockLookup[formData.yarnCount] ?? 0;
    const canAllocate = matchingStock >= Number(formData.requiredKg);

    const created: YarnRequisition = {
      id: `YREQ-${Date.now()}`,
      reqNo,
      reqDate: new Date().toISOString().slice(0, 10),
      jobNo: formData.jobNo,
      buyer: formData.buyer,
      styleNo: formData.styleNo,
      garmentItem: formData.garmentItem,
      fabricType: formData.fabricType,
      yarnCount: formData.yarnCount,
      composition: formData.composition,
      requiredKg: Number(formData.requiredKg),
      inHouseTarget: formData.inHouseTarget,
      status: canAllocate ? 'ALLOCATED' : 'PENDING_PURCHASE',
      allocatedLot: canAllocate ? 'LOT-SL-301 (Godown A - Reserved)' : undefined,
      poRef: canAllocate ? undefined : 'Pending SCM Mill PO',
      merchandiser: formData.merchandiser
    };

    setRequisitions(prev => [created, ...prev]);
    setShowAddReqModal(false);
    setShowInlineReqForm(false);
    setMsg(`✓ Yarn Requisition ${reqNo} for Job ${formData.jobNo} (${num(formData.requiredKg)} KG) successfully submitted by Merchandising! Allocation: ${canAllocate ? 'Godown Stock Locked' : 'Queued for SCM PO'}`);
    setTimeout(() => setMsg(''), 7000);
  }

  // Auto-generate SCM POs for all below-ROP flagged items
  function handleAutoGenerateBreachedPOs() {
    const breachedItems = calculatedSafetyRows.filter(r => r.isBelowRop);
    if (breachedItems.length === 0) {
      setMsg('ℹ️ All yarn counts are currently above reorder points! No emergency replenishment needed.');
      setTimeout(() => setMsg(''), 5000);
      return;
    }

    const newOrders: YarnPurchaseOrder[] = breachedItems.map((item, idx) => {
      const mill = item.nominatedMill || 'Square Textiles Ltd.';
      const poNo = `PO-AUTO-${mill.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-3)}${idx}`;
      return {
        id: `YPO-${Date.now()}-${idx}`,
        poNo,
        spinningMill: mill,
        yarnCount: item.yarnCount,
        composition: item.composition,
        orderKg: item.recommendedOrderKg,
        unitPriceUsd: 3.85,
        totalUsd: Math.round(item.recommendedOrderKg * 3.85),
        lcNo: `LC-AUTO-${Date.now().toString().slice(-4)}`,
        piDate: new Date().toISOString().slice(0, 10),
        etd: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
        eta: new Date(Date.now() + 11 * 86400000).toISOString().slice(0, 10),
        status: 'PO_ISSUED',
        paymentTerms: 'At Sight L/C',
        remarks: `Automated threshold replenishment for below-ROP deficit (${num(item.deficitKg)} KG shortage)`
      };
    });

    setPurchaseOrders(prev => [...newOrders, ...prev]);
    const totalReplenishKg = breachedItems.reduce((acc, i) => acc + i.recommendedOrderKg, 0);
    setMsg(`⚡ Automated SCM POs created for ${breachedItems.length} breached yarn counts (${num(totalReplenishKg)} KG ordered) to replenish safety buffers!`);
    setTimeout(() => setMsg(''), 7000);
  }

  // Quick PO for a single breached item
  function handleQuickPoForSingleItem(item: CalculatedSafetyItem) {
    const mill = item.nominatedMill || 'Square Textiles Ltd.';
    const poNo = `PO-AUTO-${mill.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-3)}`;
    const created: YarnPurchaseOrder = {
      id: `YPO-${Date.now()}`,
      poNo,
      spinningMill: mill,
      yarnCount: item.yarnCount,
      composition: item.composition,
      orderKg: item.recommendedOrderKg,
      unitPriceUsd: 3.85,
      totalUsd: Math.round(item.recommendedOrderKg * 3.85),
      lcNo: `LC-AUTO-${Date.now().toString().slice(-4)}`,
      piDate: new Date().toISOString().slice(0, 10),
      etd: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
      eta: new Date(Date.now() + 11 * 86400000).toISOString().slice(0, 10),
      status: 'PO_ISSUED',
      paymentTerms: 'At Sight L/C',
      remarks: `Safety stock buffer replenishment (${num(item.deficitKg)} KG deficit)`
    };

    setPurchaseOrders(prev => [created, ...prev]);
    setMsg(`✓ Emergency PO ${poNo} issued to ${mill} for ${num(item.recommendedOrderKg)} KG of ${item.yarnCount}!`);
    setTimeout(() => setMsg(''), 6000);
  }

  // In-line update of daily burn rate or supplier lead time
  function handleSaveSafetyEdit(id: string) {
    setSafetyRows(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          dailyBurnKg: editBurnValue > 0 ? editBurnValue : r.dailyBurnKg,
          leadTimeDays: editLeadTimeValue > 0 ? editLeadTimeValue : r.leadTimeDays
        };
      }
      return r;
    }));
    setEditingYarnId(null);
    setMsg('✓ Daily burn rate & lead time parameters updated! Automated thresholds recalculated.');
    setTimeout(() => setMsg(''), 5000);
  }

  function handleCreatePo(e: React.FormEvent) {
    e.preventDefault();
    const poNo = `PO-YRN-${newPo.spinningMill.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-3)}`;
    const created: YarnPurchaseOrder = {
      id: `YPO-${Date.now()}`,
      poNo,
      spinningMill: newPo.spinningMill,
      yarnCount: newPo.yarnCount,
      composition: newPo.composition,
      orderKg: Number(newPo.orderKg),
      unitPriceUsd: Number(newPo.unitPriceUsd),
      totalUsd: Number(newPo.orderKg) * Number(newPo.unitPriceUsd),
      lcNo: `LC-2026-${Date.now().toString().slice(-4)}`,
      piDate: new Date().toISOString().slice(0, 10),
      etd: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      eta: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
      status: 'PO_ISSUED',
      paymentTerms: newPo.paymentTerms,
      remarks: newPo.remarks
    };

    setPurchaseOrders(prev => [created, ...prev]);
    setShowAddPoModal(false);
    setMsg(`✓ Purchase Order ${poNo} issued to ${newPo.spinningMill} for ${num(newPo.orderKg)} KG!`);
    setTimeout(() => setMsg(''), 6000);
  }

  function handleCreateGrn(e: React.FormEvent) {
    e.preventDefault();
    const grnNo = `GRN-YRN-2026-${String(grnReceives.length + 105).padStart(3, '0')}`;
    const created: YarnGrnReceive = {
      id: `GRN-${Date.now()}`,
      grnNo,
      grnDate: new Date().toISOString().slice(0, 10),
      spinningMill: newGrn.spinningMill,
      challanNo: newGrn.challanNo,
      truckNo: newGrn.truckNo,
      millLotNo: newGrn.millLotNo,
      yarnCount: newGrn.yarnCount,
      bagCount: Number(newGrn.bagCount),
      grossWeightKg: Number(newGrn.netWeightKg) + 40,
      tareWeightKg: 40,
      netWeightKg: Number(newGrn.netWeightKg),
      labTestStatus: 'PASSED',
      labCertRef: `COA-YRN-${Date.now().toString().slice(-4)}`,
      testedCountNe: newGrn.yarnCount,
      cspStrength: 2820,
      storageLocation: newGrn.storageLocation,
      receivedBy: 'T. Hossain (Store Head)'
    };

    setGrnReceives(prev => [created, ...prev]);
    // update safety stock physical inventory
    setSafetyRows(prev => prev.map(row => {
      if (row.yarnCount === newGrn.yarnCount) {
        return { ...row, physicalStock: row.physicalStock + Number(newGrn.netWeightKg) };
      }
      return row;
    }));

    setShowAddGrnModal(false);
    setMsg(`✓ ${grnNo} recorded! Received ${num(newGrn.netWeightKg)} KG into ${newGrn.storageLocation}.`);
    setTimeout(() => setMsg(''), 6000);
  }

  function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault();
    const issueChallanNo = `CH-KNIT-${newIssue.jobNo}-${Date.now().toString().slice(-2)}`;
    const created: YarnDeliveryIssue = {
      id: `YISS-${Date.now()}`,
      issueChallanNo,
      issueDate: new Date().toISOString().slice(0, 10),
      programNo: `PROG-KNT-${newIssue.jobNo}-AUTO`,
      jobNo: newIssue.jobNo,
      buyer: newIssue.buyer,
      fabricType: newIssue.fabricType,
      yarnCount: newIssue.yarnCount,
      lotNo: newIssue.lotNo,
      targetMachine: newIssue.targetMachine,
      bagCount: Number(newIssue.bagCount),
      grossWeightKg: Number(newIssue.netWeightKg) + 15,
      netWeightKg: Number(newIssue.netWeightKg),
      returnedLeftoverKg: 0,
      netConsumedKg: Number(newIssue.netWeightKg),
      issuedBy: 'T. Hossain (Store Head)',
      receivedByKnitting: 'Knitting Shift In-charge',
      status: 'RUNNING'
    };

    setDeliveryIssues(prev => [created, ...prev]);
    // decrease safety stock physical inventory
    setSafetyRows(prev => prev.map(row => {
      if (row.yarnCount === newIssue.yarnCount) {
        return { ...row, physicalStock: Math.max(0, row.physicalStock - Number(newIssue.netWeightKg)) };
      }
      return row;
    }));

    setShowAddIssueModal(false);
    setMsg(`✓ Yarn issued to ${newIssue.targetMachine} on Challan ${issueChallanNo} (${num(newIssue.netWeightKg)} KG)!`);
    setTimeout(() => setMsg(''), 6000);
  }

  return (
    <Shell title="Yarn Management, Purchasing & Store Flow" eyebrow="Merchandising Requisition → Purchasing (PO) → Safety Stock → GRN Receive → Delivery to Knitting">
      {/* Top Banner */}
      <section className="module-hero">
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="status-pill good">Comprehensive Yarn Operations</span>
            <span style={{ fontSize: '10px', background: '#38bdf8', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
              ইয়ার্ন ম্যানেজমেন্ট ও স্টক কন্ট্রোল
            </span>
          </div>
          <h2>Yarn Management, Purchasing &amp; Safety Stock Control Tower</h2>
          <p>
            Complete 5-stage yarn ecosystem: <strong>1. Requisition Receipt from Merchandise Management</strong> → 
            <strong> 2. Yarn Purchasing (Spinning Mill PO &amp; L/C)</strong> → 
            <strong> 3. Yarn Safety Stock Maintaining &amp; Buffer Alerts</strong> → 
            <strong> 4. Yarn Stock Receive (GRN &amp; Lab QC)</strong> → 
            <strong> 5. Delivery &amp; Issue to Circular/Flat Knitting</strong>.
          </p>
        </div>
        <div className="module-actions">
          <button type="button" className="btn btn-primary" onClick={() => setTab('depletion-trends')} style={{ background: '#2563eb', border: 'none', fontWeight: 700 }}>
            📊 6M Depletion Trends
          </button>
          <Link href="/?view=FABRIC_MEETING" className="btn btn-secondary">
            🧵 Fabric Meeting Review
          </Link>
          <Link href="/modules/knitting" className="btn btn-secondary">
            🧶 Knitting Module
          </Link>
          <Link href="/modules/greige-store" className="btn btn-secondary">
            🏬 Greige Fabric Store
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ Print Yarn Report
          </button>
        </div>
      </section>

      {msg && <div className="notice success-notice" style={{ margin: '10px 0' }}>{msg}</div>}

      {/* KPI Overview Strip */}
      <section className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 16 }}>
        <div>
          <span>Total Godown Stock</span>
          <strong style={{ color: '#0f172a' }}>{num(summary.totalPhysicalStock)} KG</strong>
          <small style={{ color: '#16a34a', fontSize: '10px', fontWeight: 700 }}>In Godown A &amp; B</small>
        </div>
        <div>
          <span>Safety Stock Buffer</span>
          <strong style={{ color: '#2563eb' }}>{num(summary.totalSafetyBuffer)} KG</strong>
          <small style={{ color: '#64748b', fontSize: '10px' }}>Target Floor Buffer</small>
        </div>
        <div>
          <span>Pipeline (Spinning Mills)</span>
          <strong style={{ color: '#0284c7' }}>{num(summary.totalPipeline)} KG</strong>
          <small style={{ color: '#0284c7', fontSize: '10px' }}>Under PO &amp; L/C</small>
        </div>
        <div>
          <span>Received (GRN)</span>
          <strong style={{ color: '#16a34a' }}>{num(summary.totalGrnRcvd)} KG</strong>
          <small style={{ color: '#16a34a', fontSize: '10px' }}>Mill Trucks Cleared</small>
        </div>
        <div>
          <span>Delivered to Knitting</span>
          <strong style={{ color: '#15803d' }}>{num(summary.totalIssuedKnitting)} KG</strong>
          <small style={{ color: '#15803d', fontSize: '10px' }}>Circular &amp; Flat lines</small>
        </div>
        <div>
          <span>Safety Gap &amp; Risk</span>
          <strong style={{ color: summary.criticalCounts > 0 ? '#dc2626' : '#16a34a' }}>
            {summary.criticalCounts} Counts Alert
          </strong>
          <small style={{ color: '#dc2626', fontSize: '10px', fontWeight: 700 }}>Action Required</small>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="workspace-tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'requisitions' ? 'active' : ''} onClick={() => setTab('requisitions')}>
          1. Merchandising Requisitions ({requisitions.length})
        </button>
        <button className={tab === 'purchasing' ? 'active' : ''} onClick={() => setTab('purchasing')}>
          2. Yarn Purchasing &amp; POs ({purchaseOrders.length})
        </button>
        <button className={tab === 'safety-stock' ? 'active' : ''} onClick={() => setTab('safety-stock')}>
          3. Safety Stock Maintaining ({safetyRows.length})
        </button>
        <button className={tab === 'receive-grn' ? 'active' : ''} onClick={() => setTab('receive-grn')}>
          4. Yarn Receive (GRN) ({grnReceives.length})
        </button>
        <button className={tab === 'delivery-issue' ? 'active' : ''} onClick={() => setTab('delivery-issue')}>
          5. Delivery / Issue to Knitting ({deliveryIssues.length})
        </button>
        <button className={tab === 'stock-ledger' ? 'active' : ''} onClick={() => setTab('stock-ledger')}>
          6. Authoritative Stock Ledger (15 Cols)
        </button>
        <button className={tab === 'dead-stock' ? 'active' : ''} onClick={() => setTab('dead-stock')}>
          7. Dead Stock (&lt;25% in 6M)
        </button>
        <button className={tab === 'depletion-trends' ? 'active' : ''} onClick={() => setTab('depletion-trends')} style={{ background: tab === 'depletion-trends' ? '#2563eb' : undefined, color: tab === 'depletion-trends' ? '#ffffff' : undefined, fontWeight: 700 }}>
          📊 8. Depletion Trends (6M Recharts)
        </button>
      </div>

      {/* TAB 1: MERCHANDISING REQUISITIONS */}
      {tab === 'requisitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Collapsible Inline Merchandising Requisition Interface */}
          {showInlineReqForm && (
            <div className="panel" style={{ border: '2px solid #2563eb', background: '#ffffff', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.1)', padding: '16px' }}>
              <MerchandisingYarnRequisitionForm
                stockLookup={stockLookup}
                onSubmit={handleCreateRequisitionDirect}
                onCancel={() => setShowInlineReqForm(false)}
              />
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">📋 Requisition Receipt from Merchandise Management</div>
                <div className="panel-sub">
                  Confirmed buyer order requirements transferred directly from Merchandising for Yarn allocation or SCM Purchasing
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowInlineReqForm(!showInlineReqForm)}
                  style={{ fontSize: '11px', padding: '6px 14px', background: showInlineReqForm ? '#0f172a' : '#2563eb', border: 'none', fontWeight: 700 }}
                >
                  {showInlineReqForm ? '✕ Close Requisition Form' : '+ New Yarn Requisition (মার্চেন্ডাইজিং রিকুইজিশন)'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddReqModal(true)}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  Open in Dialog Modal
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddPoModal(true)}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  + Raise Spinning Mill PO
                </button>
              </div>
            </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Requisition No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Job No &amp; Buyer</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Style &amp; Item</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Fabric Type</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Required Yarn Count</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Composition</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Req Qty (KG)</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>In-House Target</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Allocation Status</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Allocated Lot / PO Ref</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((req) => {
                  const isAllocated = req.status === 'ALLOCATED';
                  const isPo = req.status === 'PO_IN_PROGRESS';

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{req.reqNo}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{req.reqDate}</td>
                      <td style={{ padding: '8px' }}>
                        <strong>Job {req.jobNo}</strong> · <span style={{ color: '#475569' }}>{req.buyer}</span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div><strong>{req.styleNo}</strong></div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{req.garmentItem}</div>
                      </td>
                      <td style={{ padding: '8px', color: '#0f172a' }}>{req.fabricType}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{req.yarnCount}</td>
                      <td style={{ padding: '8px', color: '#475569', fontSize: '10px' }}>{req.composition}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {num(req.requiredKg)} kg
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{req.inHouseTarget}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            background: isAllocated ? '#dcfce7' : isPo ? '#e0f2fe' : '#fef3c7',
                            color: isAllocated ? '#166534' : isPo ? '#0369a1' : '#92400e'
                          }}
                        >
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#2563eb', fontWeight: 600 }}>
                        {req.allocatedLot || req.poRef || 'Pending Allocation'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {req.status === 'PENDING_PURCHASE' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNewPo(p => ({
                                ...p,
                                yarnCount: req.yarnCount,
                                composition: req.composition,
                                orderKg: req.requiredKg,
                                remarks: `For Job ${req.jobNo} (${req.buyer} - ${req.styleNo})`
                              }));
                              setShowAddPoModal(true);
                            }}
                            style={{
                              fontSize: '10px', background: '#0284c7', color: '#fff', border: 'none',
                              padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                            }}
                          >
                            + Raise PO
                          </button>
                        ) : req.status === 'ALLOCATED' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNewIssue(p => ({
                                ...p,
                                jobNo: req.jobNo,
                                buyer: req.buyer,
                                fabricType: req.fabricType,
                                yarnCount: req.yarnCount,
                                netWeightKg: req.requiredKg
                              }));
                              setShowAddIssueModal(true);
                            }}
                            style={{
                              fontSize: '10px', background: '#16a34a', color: '#fff', border: 'none',
                              padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                            }}
                          >
                            Issue to Knit
                          </button>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#64748b' }}>PO Placed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* TAB 2: YARN PURCHASING & PROCUREMENT */}
      {tab === 'purchasing' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">🏭 Yarn Purchasing &amp; Spinning Mill Procurement (SCM)</div>
              <div className="panel-sub">
                Purchase orders (PO), L/C issuance, PI confirmation, and arrival tracking across nominated spinning mills
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddPoModal(true)}
              style={{ fontSize: '11px', padding: '6px 12px', background: '#2563eb', border: 'none' }}
            >
              + Create New Yarn PO
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>PO Number</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Spinning Mill</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Yarn Count &amp; Blend</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Order Qty (KG)</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price ($/kg)</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total Amount ($)</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>L/C Ref &amp; Terms</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>ETD / ETA</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Procurement Status</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Floor Action / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => {
                  const isArrived = po.status === 'ARRIVED';
                  const isInTransit = po.status === 'IN_TRANSIT';

                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{po.poNo}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{po.spinningMill}</td>
                      <td style={{ padding: '8px' }}>
                        <div><strong>{po.yarnCount}</strong></div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{po.composition}</div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{num(po.orderKg)} kg</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>${po.unitPriceUsd.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>${num(po.totalUsd)}</td>
                      <td style={{ padding: '8px' }}>
                        <div><strong>{po.lcNo}</strong></div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{po.paymentTerms}</div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div><small>ETD: {po.etd}</small></div>
                        <div><strong style={{ color: '#2563eb' }}>ETA: {po.eta}</strong></div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            background: isArrived ? '#dcfce7' : isInTransit ? '#fef3c7' : '#e0f2fe',
                            color: isArrived ? '#166534' : isInTransit ? '#92400e' : '#0369a1'
                          }}
                        >
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#475569' }}>{po.remarks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SAFETY STOCK MAINTAINING & AUTOMATED ALERT THRESHOLDS */}
      {tab === 'safety-stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Automated Threshold Controls & Stress-Test Simulation Strip */}
          <div className="panel" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    🛡️ Automated Yarn Safety Stock &amp; Reorder Point Threshold Engine
                  </span>
                  <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                    অটোমেটেড সেফটি স্টক অ্যালার্ট
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Automated Reorder Point: <strong>ROP = Daily Burn Rate × (Lead Time Days + Safety Buffer Days)</strong>. Flags counts below threshold to prevent circular/flat knitting machine starvation.
                </div>
              </div>

              {/* Action: Auto-generate POs for all breached counts */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAutoGenerateBreachedPOs}
                  style={{
                    fontSize: '11px',
                    padding: '7px 14px',
                    background: calculatedSafetyRows.some(r => r.isBelowRop) ? '#dc2626' : '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>⚡</span>
                  <span>Auto-Generate SCM POs For Flagged Items</span>
                  <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: '8px', fontSize: '10px' }}>
                    {calculatedSafetyRows.filter(r => r.isBelowRop).length} counts
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddPoModal(true)}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  + Manual Mill PO
                </button>
              </div>
            </div>

            {/* Threshold Parameters Adjuster Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0'
            }}>
              {/* Parameter 1: Safety Buffer Days Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                    Safety Buffer Threshold (Days):
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                    {safetyBufferDays} Days Buffer
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { label: '5d (Lean JIT)', days: 5 },
                    { label: '7d (Standard)', days: 7 },
                    { label: '10d (Buffer)', days: 10 },
                    { label: '14d (Conservative)', days: 14 },
                    { label: '21d (High Security)', days: 21 }
                  ].map(b => (
                    <button
                      key={b.days}
                      type="button"
                      onClick={() => setSafetyBufferDays(b.days)}
                      style={{
                        fontSize: '10px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: safetyBufferDays === b.days ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: safetyBufferDays === b.days ? '#2563eb' : '#ffffff',
                        color: safetyBufferDays === b.days ? '#ffffff' : '#334155',
                        fontWeight: safetyBufferDays === b.days ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 2: Daily Burn Rate Stress-Test Simulator */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                    Burn Rate Demand Simulator (Knitting Floor):
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: burnMultiplier > 1 ? '#d97706' : '#16a34a' }}>
                    {burnMultiplier === 1 ? '1.0x Normal Burn' : `${burnMultiplier}x (+${Math.round((burnMultiplier - 1) * 100)}% Surge)`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { label: '0.8x (Low Season)', mult: 0.8 },
                    { label: '1.0x (Normal Burn)', mult: 1.0 },
                    { label: '1.2x (Peak +20%)', mult: 1.2 },
                    { label: '1.4x (Surge +40%)', mult: 1.4 }
                  ].map(m => (
                    <button
                      key={m.mult}
                      type="button"
                      onClick={() => setBurnMultiplier(m.mult)}
                      style={{
                        fontSize: '10px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: burnMultiplier === m.mult ? '1px solid #d97706' : '1px solid #cbd5e1',
                        background: burnMultiplier === m.mult ? '#d97706' : '#ffffff',
                        color: burnMultiplier === m.mult ? '#ffffff' : '#334155',
                        fontWeight: burnMultiplier === m.mult ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 3: Threshold Alert Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Filter By Automated Alert Level:
                </label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSafetyFilter('ALL')}
                    style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: safetyFilter === 'ALL' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: safetyFilter === 'ALL' ? '#0f172a' : '#ffffff',
                      color: safetyFilter === 'ALL' ? '#ffffff' : '#334155',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All Counts ({calculatedSafetyRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyFilter('BREACHED')}
                    style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: safetyFilter === 'BREACHED' ? '1px solid #dc2626' : '1px solid #fecaca',
                      background: safetyFilter === 'BREACHED' ? '#dc2626' : '#fef2f2',
                      color: safetyFilter === 'BREACHED' ? '#ffffff' : '#991b1b',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🚨 Below ROP ({calculatedSafetyRows.filter(r => r.isBelowRop).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyFilter('CRITICAL')}
                    style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: safetyFilter === 'CRITICAL' ? '1px solid #b91c1c' : '1px solid #fee2e2',
                      background: safetyFilter === 'CRITICAL' ? '#b91c1c' : '#fee2e2',
                      color: safetyFilter === 'CRITICAL' ? '#ffffff' : '#7f1d1d',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🚨 Critical &lt;5d Runway ({calculatedSafetyRows.filter(r => r.isCritical).length})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Automated Safety Alert Monitor Banner */}
          {(() => {
            const breached = calculatedSafetyRows.filter(r => r.isBelowRop);
            const critical = calculatedSafetyRows.filter(r => r.isCritical);
            const totalDeficit = breached.reduce((acc, r) => acc + r.deficitKg, 0);
            const totalReplenish = breached.reduce((acc, r) => acc + r.recommendedOrderKg, 0);

            if (breached.length > 0) {
              const mostUrgent = [...breached].sort((a, b) => a.runwayDays - b.runwayDays)[0];

              return (
                <div style={{
                  background: critical.length > 0 ? '#fef2f2' : '#fffbeb',
                  border: `2px solid ${critical.length > 0 ? '#f87171' : '#fcd34d'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '24px', lineHeight: 1 }}>{critical.length > 0 ? '🚨' : '⚠️'}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: critical.length > 0 ? '#991b1b' : '#92400e' }}>
                          AUTOMATED THRESHOLD ALERT: {breached.length} of {calculatedSafetyRows.length} Yarn Counts Are Operating Below Reorder Point (ROP)!
                        </div>
                        <div style={{ fontSize: '11px', color: critical.length > 0 ? '#7f1d1d' : '#78350f', marginTop: '2px' }}>
                          Calculated daily burn rate indicates total buffer deficit of <strong>{num(totalDeficit)} KG</strong>.
                          {mostUrgent && (
                            <span> Highest urgency: <strong>{mostUrgent.yarnCount}</strong> has only <strong>{mostUrgent.runwayDays} days of supply</strong> left (Daily burn: {num(mostUrgent.effectiveDailyBurn)} kg/d).</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleAutoGenerateBreachedPOs}
                        style={{
                          fontSize: '11px',
                          padding: '6px 14px',
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Order Replenishment ({num(totalReplenish)} KG)
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    All 9 Yarn Counts Operating Above Automated Safety Thresholds
                  </div>
                  <div style={{ fontSize: '10px', color: '#15803d' }}>
                    Godown inventory satisfies supplier lead times + {safetyBufferDays} days safety buffer based on {burnMultiplier}x daily burn rate.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. In-Line Burn Rate / Lead Time Parameter Tuning Dialog */}
          {editingYarnId && (
            <div style={{ background: '#ffffff', border: '2px solid #2563eb', padding: '14px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                  ✏️ Edit Daily Burn Rate &amp; Supplier Lead Time: {calculatedSafetyRows.find(r => r.id === editingYarnId)?.yarnCount}
                </strong>
                <button type="button" onClick={() => setEditingYarnId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Daily Burn Rate (KG/day)</label>
                  <input
                    type="number"
                    value={editBurnValue}
                    onChange={e => setEditBurnValue(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Supplier Lead Time (Days)</label>
                  <input
                    type="number"
                    value={editLeadTimeValue}
                    onChange={e => setEditLeadTimeValue(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleSaveSafetyEdit(editingYarnId)}
                    style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save &amp; Recalculate Threshold
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingYarnId(null)}
                    style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Automated Safety Stock Data Table */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">🛡️ Yarn Safety Stock Maintaining &amp; Buffer Control Register</div>
                <div className="panel-sub">
                  Dynamic calculations: Lead Time Days + {safetyBufferDays} Days Buffer × Daily Burn Rate ({burnMultiplier}x active). Flagged rows indicate starvation threat to knitting.
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Showing <strong>{calculatedSafetyRows.filter(r => safetyFilter === 'ALL' ? true : safetyFilter === 'BREACHED' ? r.isBelowRop : r.isCritical).length}</strong> counts
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Yarn Count &amp; Mill</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Composition</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Godown Stock</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Daily Burn</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Lead Time</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Automated ROP</th>
                    <th style={{ textAlign: 'left', padding: '8px', minWidth: 140 }}>Stock Runway (Days)</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Buffer Gap (KG)</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Threshold Status</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedSafetyRows
                    .filter(r => safetyFilter === 'ALL' ? true : safetyFilter === 'BREACHED' ? r.isBelowRop : r.isCritical)
                    .map((row) => {
                      const isCritical = row.status === 'CRITICAL';
                      const isBelow = row.status === 'BELOW_SAFETY';
                      const isSurplus = row.status === 'SURPLUS';
                      const targetDays = row.leadTimeDays + safetyBufferDays;
                      const runwayPct = Math.min(100, Math.round((row.runwayDays / targetDays) * 100));

                      return (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isCritical ? '#fef2f2' : isBelow ? '#fffbeb' : undefined
                          }}
                        >
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.yarnCount}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Nominated: {row.nominatedMill}</div>
                          </td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{row.composition}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {num(row.physicalStock)} kg
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{num(row.effectiveDailyBurn)} kg/d</span>
                              <button
                                type="button"
                                title="Edit daily burn rate or lead time"
                                onClick={() => {
                                  setEditingYarnId(row.id);
                                  setEditBurnValue(row.dailyBurnKg);
                                  setEditLeadTimeValue(row.leadTimeDays);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', opacity: 0.7 }}
                              >
                                ✏️
                              </button>
                            </div>
                            {burnMultiplier !== 1 && (
                              <div style={{ fontSize: '9px', color: '#d97706' }}>base: {num(row.dailyBurnKg)}</div>
                            )}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {row.leadTimeDays} days
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{num(row.reorderPoint)} kg</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>
                              {row.effectiveDailyBurn} × ({row.leadTimeDays}+{safetyBufferDays}d)
                            </div>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                              <strong style={{ color: isCritical ? '#dc2626' : isBelow ? '#d97706' : '#16a34a' }}>
                                {row.runwayDays} days left
                              </strong>
                              <span style={{ color: '#64748b' }}>target {targetDays}d</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${runwayPct}%`,
                                  height: '100%',
                                  background: isCritical ? '#dc2626' : isBelow ? '#f59e0b' : '#16a34a',
                                  borderRadius: '3px'
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: row.diff < 0 ? '#dc2626' : '#16a34a' }}>
                            {row.diff < 0 ? `-${num(row.deficitKg)} kg` : `+${num(row.diff)} kg`}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                background: isCritical ? '#fee2e2' : isBelow ? '#fef3c7' : isSurplus ? '#e0f2fe' : '#dcfce7',
                                color: isCritical ? '#991b1b' : isBelow ? '#92400e' : isSurplus ? '#0369a1' : '#166534',
                                display: 'inline-block'
                              }}
                            >
                              {isCritical ? '🚨 CRITICAL (<5d)' : isBelow ? '⚠️ BELOW ROP' : isSurplus ? '📦 SURPLUS' : '✅ SAFE BUFFER'}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {row.isBelowRop ? (
                              <button
                                type="button"
                                onClick={() => handleQuickPoForSingleItem(row)}
                                style={{
                                  fontSize: '10px',
                                  background: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                              >
                                + Auto-PO ({num(row.recommendedOrderKg)} kg)
                              </button>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>✓ Healthy</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: YARN RECEIVE (GRN) */}
      {tab === 'receive-grn' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">🚚 Yarn Stock Receive &amp; Gate GRN Register</div>
              <div className="panel-sub">
                Spinning mill truck arrival, delivery challan inspection, bag counting, net weight verification, and lab testing lot clearance
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddGrnModal(true)}
              style={{ fontSize: '11px', padding: '6px 12px', background: '#2563eb', border: 'none' }}
            >
              + Record Spinning Mill GRN Receive
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>GRN Number</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Spinning Mill</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Challan &amp; Truck No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Mill Lot No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Yarn Count</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Bags</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Net Weight (KG)</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Lab QC Status</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Storage Bay / Location</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Received By</th>
                </tr>
              </thead>
              <tbody>
                {grnReceives.map((grn) => (
                  <tr key={grn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{grn.grnNo}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{grn.grnDate}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{grn.spinningMill}</td>
                    <td style={{ padding: '8px' }}>
                      <div><strong>{grn.challanNo}</strong></div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{grn.truckNo}</div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span className="status-pill neutral">{grn.millLotNo}</span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{grn.yarnCount}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>{grn.bagCount} bags</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {num(grn.netWeightKg)} kg
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                        {grn.labTestStatus} ({grn.testedCountNe}, CSP {grn.cspStrength})
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{grn.storageLocation}</td>
                    <td style={{ padding: '8px', color: '#475569' }}>{grn.receivedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: YARN DELIVERY / ISSUE TO KNITTING */}
      {tab === 'delivery-issue' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">🧵 Yarn Stock Delivery &amp; Issue to Knitting Floor</div>
              <div className="panel-sub">
                Issuing against Central Planning Knitting Program, machine assignment (Circular &amp; Flat), delivery challans and leftover returns
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddIssueModal(true)}
              style={{ fontSize: '11px', padding: '6px 12px', background: '#2563eb', border: 'none' }}
            >
              + Issue Yarn to Knitting Floor
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Challan No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Job No &amp; Buyer</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Fabric &amp; Yarn Count</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Yarn Lot No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Target Machine</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Bags</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Issued Net KG</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Leftover Return</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Net Consumed</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Line Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryIssues.map((iss) => (
                  <tr key={iss.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{iss.issueChallanNo}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{iss.issueDate}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>Job {iss.jobNo}</strong> · <span style={{ color: '#475569' }}>{iss.buyer}</span>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div><strong>{iss.fabricType}</strong></div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{iss.yarnCount}</div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span className="status-pill neutral">{iss.lotNo}</span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{iss.targetMachine}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>{iss.bagCount} bags</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                      {num(iss.netWeightKg)} kg
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#d97706' }}>
                      {iss.returnedLeftoverKg ? `${num(iss.returnedLeftoverKg)} kg` : '0 kg'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {num(iss.netConsumedKg)} kg
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          background: iss.status === 'CLOSED' ? '#dcfce7' : '#e0f2fe',
                          color: iss.status === 'CLOSED' ? '#166534' : '#0369a1'
                        }}
                      >
                        {iss.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUTHORITATIVE STOCK LEDGER */}
      {tab === 'stock-ledger' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Authoritative Monthly Yarn Stock Ledger (15 Columns)</div>
              <div className="panel-sub">
                Original Excel Columns: S.L, Description, Manufacturer, Lot No, Rcvd Date, L/c No, Invoice No, Opening Stock, RCVD Month, Total, Issue, In-House Prog, Closing Stock, Location.
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => window.print()}>Print Ledger</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>S.L</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Description of Yarn</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Manufacturer</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Lot No</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Rcvd Date</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>L/C No</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Opening (KG)</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>RCVD Month</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Total (KG)</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Issue (KG)</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Closing Stock (KG)</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { sl: 1, desc: '30/1 Ne Combed Cotton', mfg: 'Square Textiles Ltd.', lot: 'LOT-SL-301', dt: '2026-08-02', lc: 'LC-2026-SQR-0441', open: 35678, rcvd: 4990, total: 40668, issue: 2268, close: 38400, loc: 'Godown A · Bay 04' },
                  { sl: 2, desc: '26/1 Ne Carded Cotton', mfg: 'Envoy Textiles Ltd.', lot: 'LOT-SL-302', dt: '2026-08-04', lc: 'LC-2026-ENV-0199', open: 11215, rcvd: 3990, total: 15205, issue: 1005, close: 14200, loc: 'Godown A · Bay 07' },
                  { sl: 3, desc: '24/1 Ne Cotton Slub', mfg: 'Badsha Textiles Ltd.', lot: 'LOT-PIQ-09', dt: '2026-08-07', lc: 'LC-2026-BDS-0711', open: 0, rcvd: 3400, total: 3400, issue: 0, close: 3400, loc: 'Godown A · Bay 02' },
                  { sl: 4, desc: '20/1 Ne Carded Cotton', mfg: 'Akij Spinning Mills', lot: 'LOT-TR-401', dt: '2026-07-25', lc: 'LC-2026-AKJ-0112', open: 19228, rcvd: 0, total: 19228, issue: 3628, close: 15600, loc: 'Godown B · Bay 01' },
                  { sl: 5, desc: '32/1 CVC 60/40 Melange', mfg: 'Kamal Yarn Mills', lot: 'LOT-FLC-501', dt: '2026-07-15', lc: 'LC-2026-KML-0901', open: 11314, rcvd: 0, total: 11314, issue: 1814, close: 9500, loc: 'Godown B · Bay 03' },
                  { sl: 6, desc: '40D Spandex (Creora)', mfg: 'Shasha Denims / Yarn', lot: 'LOT-SPX-204', dt: '2026-08-06', lc: 'LC-2026-SHS-0118', open: 2590, rcvd: 1510, total: 4100, issue: 0, close: 4100, loc: 'Godown B · AC Chamber 1' }
                ].map((row) => (
                  <tr key={row.sl} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>{row.sl}</td>
                    <td style={{ padding: '6px', fontWeight: 700, color: '#0f172a' }}>{row.desc}</td>
                    <td style={{ padding: '6px' }}>{row.mfg}</td>
                    <td style={{ padding: '6px' }}><span className="status-pill neutral">{row.lot}</span></td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{row.dt}</td>
                    <td style={{ padding: '6px', color: '#64748b' }}>{row.lc}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{num(row.open)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>{num(row.rcvd)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{num(row.total)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{num(row.issue)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{num(row.close)}</td>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{row.loc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: DEAD STOCK */}
      {tab === 'dead-stock' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">⚠️ Dead Stock Analysis (&lt; 25% Usage Over 6 Months)</div>
              <div className="panel-sub">
                Identifies inactive yarn lots taking up Godown footprint. Requires management clearance or sample/combo liquidation.
              </div>
            </div>
            <span className="status-pill warn">Total Dead Stock: 4,200 KG</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Yarn Count &amp; Description</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Spinning Mill</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Lot No</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Current Stock (KG)</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>6M Available</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>6M Issued</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Usage %</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Days Idle</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Recommended Management Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { desc: '16/1 Ne Carded Open End (Grey)', mfg: 'Akij Spinning', lot: 'LOT-OE-1601', stock: 2400, avail: 2800, issue: 400, usage: 14.3, idle: 184, action: 'Liquidate to local market or convert to low-gauge fleece backing' },
                  { desc: '30/1 Ne Poly-Viscose (PV) 65/35', mfg: 'Maksons Spinning', lot: 'LOT-PV-3009', stock: 1800, avail: 2200, issue: 400, usage: 18.2, idle: 165, action: 'Repurpose for contrast neckband / rib or sample development' }
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>{row.desc}</td>
                    <td style={{ padding: '8px' }}>{row.mfg}</td>
                    <td style={{ padding: '8px' }}><span className="status-pill bad">{row.lot}</span></td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{num(row.stock)} kg</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{num(row.avail)} kg</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{num(row.issue)} kg</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{row.usage}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{row.idle} days</td>
                    <td style={{ padding: '8px', color: '#991b1b', fontWeight: 600 }}>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: 6-MONTH DEPLETION TRENDS (RECHARTS VISUAL DASHBOARD) */}
      {tab === 'depletion-trends' && (
        <YarnDepletionDashboard />
      )}

      {/* MODAL 0: ADD MERCHANDISING YARN REQUISITION */}
      {showAddReqModal && (
        <div className="modal-backdrop" onClick={() => setShowAddReqModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <MerchandisingYarnRequisitionForm
              isModal={true}
              stockLookup={stockLookup}
              onSubmit={handleCreateRequisitionDirect}
              onCancel={() => setShowAddReqModal(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL 1: ADD YARN PO */}
      {showAddPoModal && (
        <div className="modal-backdrop" onClick={() => setShowAddPoModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Create Yarn Purchase Order (PO to Spinning Mill)</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddPoModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePo} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Spinning Mill</label>
                <select
                  value={newPo.spinningMill}
                  onChange={e => setNewPo(p => ({ ...p, spinningMill: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="Square Textiles Ltd.">Square Textiles Ltd.</option>
                  <option value="Envoy Textiles Ltd.">Envoy Textiles Ltd.</option>
                  <option value="Badsha Textiles Ltd.">Badsha Textiles Ltd.</option>
                  <option value="Akij Spinning Mills Ltd.">Akij Spinning Mills Ltd.</option>
                  <option value="Kamal Yarn Mills Ltd.">Kamal Yarn Mills Ltd.</option>
                  <option value="Shasha Denims / Yarn Div">Shasha Denims / Yarn Div</option>
                  <option value="Maksons Spinning Mills">Maksons Spinning Mills</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Yarn Count</label>
                  <input
                    type="text"
                    required
                    value={newPo.yarnCount}
                    onChange={e => setNewPo(p => ({ ...p, yarnCount: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Quantity (KG)</label>
                  <input
                    type="number"
                    required
                    value={newPo.orderKg}
                    onChange={e => setNewPo(p => ({ ...p, orderKg: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Unit Price ($/kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPo.unitPriceUsd}
                    onChange={e => setNewPo(p => ({ ...p, unitPriceUsd: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Payment Terms</label>
                  <select
                    value={newPo.paymentTerms}
                    onChange={e => setNewPo(p => ({ ...p, paymentTerms: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="At Sight L/C">At Sight L/C</option>
                    <option value="60 Days Usance L/C">60 Days Usance L/C</option>
                    <option value="90 Days Deferred L/C">90 Days Deferred L/C</option>
                    <option value="TT in Advance">TT in Advance</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Order Notes / Purpose</label>
                <input
                  type="text"
                  value={newPo.remarks}
                  onChange={e => setNewPo(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="e.g. For Bestseller 48085 Single Jersey production"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddPoModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', border: 'none' }}>Issue Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD YARN GRN RECEIVE */}
      {showAddGrnModal && (
        <div className="modal-backdrop" onClick={() => setShowAddGrnModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Record Spinning Mill Yarn GRN Receive</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddGrnModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateGrn} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Spinning Mill</label>
                  <select
                    value={newGrn.spinningMill}
                    onChange={e => setNewGrn(p => ({ ...p, spinningMill: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Square Textiles Ltd.">Square Textiles Ltd.</option>
                    <option value="Envoy Textiles Ltd.">Envoy Textiles Ltd.</option>
                    <option value="Badsha Textiles Ltd.">Badsha Textiles Ltd.</option>
                    <option value="Akij Spinning Mills Ltd.">Akij Spinning Mills Ltd.</option>
                    <option value="Shasha Denims / Yarn">Shasha Denims / Yarn</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Mill Lot No</label>
                  <input
                    type="text"
                    required
                    value={newGrn.millLotNo}
                    onChange={e => setNewGrn(p => ({ ...p, millLotNo: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Delivery Challan No</label>
                  <input
                    type="text"
                    required
                    value={newGrn.challanNo}
                    onChange={e => setNewGrn(p => ({ ...p, challanNo: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Truck / Vehicle No</label>
                  <input
                    type="text"
                    required
                    value={newGrn.truckNo}
                    onChange={e => setNewGrn(p => ({ ...p, truckNo: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Number of Bags</label>
                  <input
                    type="number"
                    required
                    value={newGrn.bagCount}
                    onChange={e => setNewGrn(p => ({ ...p, bagCount: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Net Weight (KG)</label>
                  <input
                    type="number"
                    required
                    value={newGrn.netWeightKg}
                    onChange={e => setNewGrn(p => ({ ...p, netWeightKg: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Storage Bay / Location</label>
                <input
                  type="text"
                  required
                  value={newGrn.storageLocation}
                  onChange={e => setNewGrn(p => ({ ...p, storageLocation: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddGrnModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', border: 'none' }}>Confirm GRN Intake</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD YARN DELIVERY / ISSUE */}
      {showAddIssueModal && (
        <div className="modal-backdrop" onClick={() => setShowAddIssueModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Issue / Deliver Yarn to Knitting Floor</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateIssue} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Job No</label>
                  <input
                    type="text"
                    required
                    value={newIssue.jobNo}
                    onChange={e => setNewIssue(p => ({ ...p, jobNo: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Buyer</label>
                  <input
                    type="text"
                    required
                    value={newIssue.buyer}
                    onChange={e => setNewIssue(p => ({ ...p, buyer: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Target Knitting Machine</label>
                  <input
                    type="text"
                    required
                    value={newIssue.targetMachine}
                    onChange={e => setNewIssue(p => ({ ...p, targetMachine: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Yarn Lot No</label>
                  <input
                    type="text"
                    required
                    value={newIssue.lotNo}
                    onChange={e => setNewIssue(p => ({ ...p, lotNo: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Number of Bags</label>
                  <input
                    type="number"
                    required
                    value={newIssue.bagCount}
                    onChange={e => setNewIssue(p => ({ ...p, bagCount: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Issue Net Weight (KG)</label>
                  <input
                    type="number"
                    required
                    value={newIssue.netWeightKg}
                    onChange={e => setNewIssue(p => ({ ...p, netWeightKg: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', border: 'none' }}>Issue Delivery Challan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
