'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import {
  Package,
  Layers,
  Truck,
  MapPin,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Printer,
  Download,
  Plus,
  Save,
  Boxes,
  FileCheck,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Warehouse,
  Scissors,
  ShieldCheck,
  HelpCircle,
  Tag,
  Palette,
  CheckSquare,
  Sparkles,
  X,
  SlidersHorizontal,
  Check,
  Building2,
  Globe,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CrossFilterProvider, CrossFilterBar, useCrossFilter } from '../../../components/ui';
import { FX_SERIES, FX_BAR, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';
import { fmtNum } from '../../../lib/format';
import FabricRackLocation, {
  RackLocations,
  LocationPicker,
  LocationPick,
  emptyPick,
  pickIsValid,
  pickLabel,
  assignLocation,
  locLabel,
  isShelfKey,
  FABRIC_RACKS,
  FABRIC_SHELVES,
  shelfId,
  shelfLabel,
  getShelfItems,
} from '../../../components/fabric/FabricRackLocation';

const RACK_STORE_KEY = 'nos-finished-fabric-rack-locations-v3';

// ============================================================================
// DATA TYPES & INTERFACES (100% PURE ENGLISH)
// ============================================================================

export interface FabricColorLine {
  id: string;
  idx: number;
  month: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  pantone?: string;
  fabric: string;
  fabricType: string;
  construction: string;
  composition: string;
  gsm: string;
  dia: string;
  process: string;
  isImported?: boolean;

  // 1. Order / Required Qty (Kg)
  reqBody: number;
  reqRib: number;
  reqSJ: number;
  totalReq: number;

  // 2. Received Qty (Kg)
  recvBody: number;
  recvRib: number;
  recvSJ: number;
  totalRecv: number;
  dyeingBalance: number; // totalReq - totalRecv

  // 3. Issue / Delivery Qty (Kg)
  issuedBody: number;
  issuedRib: number;
  issuedSJ: number;
  totalIssued: number;

  // 4. Closing Stock (Kg)
  stockBody: number; // recvBody - issuedBody
  stockRib: number;  // recvRib - issuedRib
  stockSJ: number;   // recvSJ - issuedSJ
  stockBalance: number; // totalRecv - totalIssued

  // 5. Location & Leftover
  location: string;
  cuttingLeftover: number;
  excessQty: number;
  date: string;
  remarks?: string;

  challans: string;
  deliveryDate: string;
  supplier: string;
  dyeingFactory?: string;
  exFactoryDate: string;
  slot: string;
  merchandiser: string;
  qualityStatus: 'PASS' | 'PENDING' | 'HOLD';
  stockState: 'In Stock' | 'Partly Received' | 'Waiting Dyeing' | 'Fully Issued' | 'Sent to Reuse';
  isCuttingOk?: boolean;
}

export interface JobFabricGroup {
  key: string;
  buyer: string;
  jobNo: string;
  style: string;
  month: string;
  slot: string;
  merchandiser: string;
  supplier: string;
  dyeingFactory: string;
  fabric: string;
  fabricType: string;
  composition: string;
  gsm: string;
  dia: string;
  process: string;
  isImported?: boolean;

  // Aggregated quantities
  reqBody: number;
  reqRib: number;
  reqSJ: number;
  totalReq: number;

  recvBody: number;
  recvRib: number;
  recvSJ: number;
  totalRecv: number;
  totalBalance: number;

  issuedBody: number;
  issuedRib: number;
  issuedSJ: number;
  totalIssued: number;

  stockBody: number;
  stockRib: number;
  stockSJ: number;
  totalStock: number;

  cuttingLeftover: number;
  location: string;
  colorCount: number;
  colors: FabricColorLine[];
  primaryStatus: string;
  isCuttingOk?: boolean;
}

export interface SupplierChallanItem {
  id: string;
  challanNo: string;
  date: string;
  supplier: string;
  sourceType: 'SUPPLIER' | 'IMPORT' | 'CUTTING_LEFTOVER';
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabric: string;
  challanBodyKg: number;
  challanRibKg: number;
  challanSJKg: number;
  weighedBodyKg: number;
  weighedRibKg: number;
  weighedSJKg: number;
  totalKg: number;
  rollCount: number;
  weightDiffKg: number;
  rackLocation: string;
  remarks?: string;
  status: 'Accepted' | 'Pending Verification' | 'Rejected';
}

export interface CuttingIssueSlip {
  id: string;
  issueNo: string;
  date: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabricDescription: string;
  bodyKg: number;
  ribKg: number;
  sjKg: number;
  totalKg: number;
  issuedBy: string;
  receivedBy: string;
  remarks: string;
  isCuttingOk?: boolean;
}

export interface LeftoverReturnRecord {
  id: string;
  date: string;
  jobNo: string;
  color: string;
  source: 'Cutting Return' | 'Closing Stock Balance' | 'Excess Delivery';
  bodyKg: number;
  ribKg: number;
  sjKg: number;
  totalKg: number;
  returnedBy: string;
  rackAssigned: string;
  status: 'Available in Leftover' | 'Reused' | 'Disposed';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinishedFabricPage() {
  return (
    <CrossFilterProvider>
      <FinishedFabricPageInner />
    </CrossFilterProvider>
  );
}

function FinishedFabricPageInner() {
  const { filters: cfFilters, toggle: cfToggle } = useCrossFilter();

  // Navigation tabs (1 to 5, matching Odoo & Trims standard)
  const [activeTab, setActiveTab] = useState<'STOCK' | 'RECEIVE' | 'ISSUE' | 'LOCATION' | 'REUSE'>('STOCK');

  // Master Data state
  const [rawLines, setRawLines] = useState<FabricColorLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [showAllColors, setShowAllColors] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedFabricType, setSelectedFabricType] = useState('ALL');
  const [filterImportedOnly, setFilterImportedOnly] = useState(false);

  // Dashboard visibility collapse toggle
  const [showDashboard, setShowDashboard] = useState(true);

  // Column Section Toggle Buttons (Professional Odoo filter pills)
  const [visibleSections, setVisibleSections] = useState({
    jobSpecs: true,      // SL, Job, Style, Fabric Type, Composition, Process, GSM, Dia, Color
    orderQty: true,      // Order Qty: Body, Rib, S. Jersey, Total
    receivedQty: true,   // Received Qty: Body, Rib, S. Jersey, Total
    deliveryQty: true,   // Issue / Delivery Qty: Body, Rib, S. Jersey, Total
    closingStock: true,  // Closing Stock: Body, Rib, S. Jersey, Total
    locationInfo: true,  // Location, Cutting Leftover, Excess Qty, Date
  });

  // Drawer state (sliding from right to left)
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobFabricGroup | null>(null);
  const [drawerVisibleSections, setDrawerVisibleSections] = useState({
    orderQty: true,
    receivedQty: true,
    deliveryQty: true,
    closingStock: true,
    location: true,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 35;

  // Modals & Action States
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Location state
  const [rackLoc, setRackLoc] = useState<RackLocations>({});

  // --------------------------------------------------------------------------
  // RECEIVE TAB STATE
  // --------------------------------------------------------------------------
  const [receiveSourceFilter, setReceiveSourceFilter] = useState<'ALL' | 'SUPPLIER' | 'IMPORT' | 'CUTTING_LEFTOVER'>('ALL');
  const [receiveSearchQuery, setReceiveSearchQuery] = useState('');
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    challanNo: '',
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    sourceType: 'SUPPLIER' as 'SUPPLIER' | 'IMPORT' | 'CUTTING_LEFTOVER',
    buyer: 'Bestseller (Only & Sons)',
    jobNo: '',
    style: '',
    fabricType: 'Single Jersey',
    composition: '100% Organic Cotton',
    gsm: '160',
    dia: '64"',
    colors: [
      {
        color: '',
        reqBody: 0,
        reqSJ: 0,
        reqRib: 0,
        recvBody: 0,
        recvSJ: 0,
        recvRib: 0,
        location: 'R-01-S01',
        rollCount: 1,
        remarks: '',
      },
    ],
  });

  // Supplier Challans List
  const [challans, setChallans] = useState<SupplierChallanItem[]>([
    {
      id: 'ch-1',
      challanNo: 'CH-NFL-4828',
      date: '2026-11-08',
      supplier: 'Northern Dyeing Unit-2',
      sourceType: 'SUPPLIER',
      buyer: 'Bestseller (Only & Sons)',
      jobNo: 'BSONS 48283 4th',
      style: '22042341',
      color: 'Black C-N10 (B/Part Dye)',
      fabric: 'Top Ctn, CVC Fleece 340 GSM',
      challanBodyKg: 1180,
      challanRibKg: 285,
      challanSJKg: 0,
      weighedBodyKg: 1180,
      weighedRibKg: 285,
      weighedSJKg: 0,
      totalKg: 1465,
      rollCount: 28,
      weightDiffKg: 0,
      rackLocation: 'R-04 · Shelf 02',
      remarks: 'Lab approved shade',
      status: 'Accepted',
    },
    {
      id: 'ch-2',
      challanNo: 'IMP-TEX-8812',
      date: '2026-11-09',
      supplier: 'Texella Sourcing Overseas',
      sourceType: 'IMPORT',
      buyer: 'Besrseller (Name It)',
      jobNo: '48886',
      style: '13266639',
      color: 'Icy Pink',
      fabric: 'Chiffon Woven Imported 120 GSM',
      challanBodyKg: 40,
      challanRibKg: 0,
      challanSJKg: 0,
      weighedBodyKg: 40,
      weighedRibKg: 0,
      weighedSJKg: 0,
      totalKg: 40,
      rollCount: 2,
      weightDiffKg: 0,
      rackLocation: 'R-12 · Shelf 05',
      remarks: 'Imported Woven fabric for combo style',
      status: 'Accepted',
    },
    {
      id: 'ch-3',
      challanNo: 'RET-CUT-0914',
      date: '2026-11-10',
      supplier: 'Cutting Floor Unit-1',
      sourceType: 'CUTTING_LEFTOVER',
      buyer: 'OVS SPA',
      jobNo: 'OVS 47858',
      style: '271TSH033TS33-6198',
      color: 'Cashmere Blue',
      fabric: 'S/J 100% BCI Ctn 140 GSM',
      challanBodyKg: 18,
      challanRibKg: 0,
      challanSJKg: 0,
      weighedBodyKg: 18,
      weighedRibKg: 0,
      weighedSJKg: 0,
      totalKg: 18,
      rollCount: 1,
      weightDiffKg: 0,
      rackLocation: 'R-18 · Shelf 01',
      remarks: 'Returned from cutting marker lay calibration',
      status: 'Accepted',
    },
    {
      id: 'ch-4',
      challanNo: 'CH-PAK-3301',
      date: '2026-11-10',
      supplier: 'Pakiza Dyeing & Printing',
      sourceType: 'SUPPLIER',
      buyer: 'United Textile (UTG)',
      jobNo: 'UT 41947 29th',
      style: 'BAD1101AX',
      color: 'Black',
      fabric: 'L/S/J 95% Regenagri Ctn 5% Elas',
      challanBodyKg: 1540,
      challanRibKg: 0,
      challanSJKg: 0,
      weighedBodyKg: 1540,
      weighedRibKg: 0,
      weighedSJKg: 0,
      totalKg: 1540,
      rollCount: 32,
      weightDiffKg: 0,
      rackLocation: 'R-07 · Shelf 08',
      remarks: 'Full delivery received',
      status: 'Accepted',
    },
  ]);

  // --------------------------------------------------------------------------
  // ISSUE TO CUTTING TAB STATE
  // --------------------------------------------------------------------------
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [selectedIssueJob, setSelectedIssueJob] = useState<JobFabricGroup | null>(null);
  const [todayDeliveries, setTodayDeliveries] = useState<
    Record<string, { bodyKg: number; sjKg: number; ribKg: number; isCuttingOk: boolean }>
  >({});

  // Cutting Issuance Log
  const [cuttingIssues, setCuttingIssues] = useState<CuttingIssueSlip[]>([
    {
      id: 'ci-1',
      issueNo: 'FI-2026-1101',
      date: '2026-11-09',
      buyer: 'Bestseller (Only & Sons)',
      jobNo: 'BSONS 48283 4th',
      style: '22042341',
      color: 'Black C-N10 (B/Part Dye)',
      fabricDescription: 'Top Ctn, CVC Fleece 340 GSM 72"',
      bodyKg: 1149,
      ribKg: 272,
      sjKg: 0,
      totalKg: 1421,
      issuedBy: 'Store Officer Hasan',
      receivedBy: 'Cutting Master Kabir',
      remarks: 'Dispatched for Body and Rib lot cutting',
      isCuttingOk: false,
    },
    {
      id: 'ci-2',
      issueNo: 'FI-2026-1102',
      date: '2026-11-10',
      buyer: 'Bestseller (ONLY)',
      jobNo: '48845',
      style: '15389960',
      color: 'Orchid Bloom',
      fabricDescription: 'S/J 100% Organic ctn 160 GSM 64"',
      bodyKg: 543,
      ribKg: 0,
      sjKg: 0,
      totalKg: 543,
      issuedBy: 'Store Officer Hasan',
      receivedBy: 'Cutting Table 2 Supervisor',
      remarks: 'Full lay issued, marker approved',
      isCuttingOk: true,
    },
  ]);

  // --------------------------------------------------------------------------
  // LEFTOVER & REUSE LEDGER STATE
  // --------------------------------------------------------------------------
  const [leftoverLedger, setLeftoverLedger] = useState<LeftoverReturnRecord[]>([
    {
      id: 'lr-1',
      date: '2026-11-09',
      jobNo: 'BSONS 48283 4th',
      color: 'Black C-N10 (B/Part Dye)',
      source: 'Closing Stock Balance',
      bodyKg: 31,
      ribKg: 13,
      sjKg: 0,
      totalKg: 44,
      returnedBy: 'Store Inventory Closing',
      rackAssigned: 'R-19 · Shelf 02',
      status: 'Available in Leftover',
    },
    {
      id: 'lr-2',
      date: '2026-11-10',
      jobNo: 'OVS 47858',
      color: 'Cashmere Blue',
      source: 'Cutting Return',
      bodyKg: 18,
      ribKg: 0,
      sjKg: 0,
      totalKg: 18,
      returnedBy: 'Cutting Floor Unit-1',
      rackAssigned: 'R-18 · Shelf 01',
      status: 'Available in Leftover',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load rack locations from localStorage
  useEffect(() => {
    let stored: RackLocations | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(RACK_STORE_KEY) || 'null');
    } catch {
      stored = null;
    }
    if (stored && typeof stored === 'object') setRackLoc(stored);
  }, []);

  const saveRackLoc = (next: RackLocations, message: string) => {
    setRackLoc(next);
    try {
      localStorage.setItem(RACK_STORE_KEY, JSON.stringify(next));
    } catch {
      /* blocked */
    }
    showToast(message);
  };

  // --------------------------------------------------------------------------
  // LOAD MASTER DATA FROM STATIC DATASET
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch('/data/finished-bootstrap.json');
        if (!res.ok) throw new Error('Failed to load finished fabric dataset');
        const json = await res.json();
        if (json?.lines?.F && isMounted) {
          const parsed: FabricColorLine[] = json.lines.F.map((item: any, idx: number) => {
            const reqBody = Number(item.rb) || 0;
            const reqRib = Number(item.rl) || 0;
            const reqSJ = Number(item.rs) || (idx % 4 === 1 ? Math.round(reqBody * 0.12) : 0);
            const totalReq = reqBody + reqRib + reqSJ;

            const recvBody = Number(item.vb) || 0;
            const recvRib = Number(item.vl) || 0;
            const recvSJ = Number(item.vs) || (reqSJ > 0 && recvBody > 0 ? Math.min(reqSJ, Math.round(recvBody * 0.11)) : 0);
            const totalRecv = recvBody + recvRib + recvSJ;

            const dyeingBalance = Math.max(0, totalReq - totalRecv);

            const issuedBody = recvBody > 0 ? (idx % 3 === 0 ? recvBody : Math.round(recvBody * 0.88)) : 0;
            const issuedRib = recvRib > 0 ? (idx % 3 === 0 ? recvRib : Math.round(recvRib * 0.85)) : 0;
            const issuedSJ = recvSJ > 0 ? (idx % 3 === 0 ? recvSJ : Math.round(recvSJ * 0.85)) : 0;
            const totalIssued = issuedBody + issuedRib + issuedSJ;

            const stockBody = Math.max(0, recvBody - issuedBody);
            const stockRib = Math.max(0, recvRib - issuedRib);
            const stockSJ = Math.max(0, recvSJ - issuedSJ);
            const stockBalance = stockBody + stockRib + stockSJ;

            const isImported = Boolean(item.isImported || /imported|woven|chiffon|poplin/i.test(item.f || ''));

            let stockState: FabricColorLine['stockState'] = 'In Stock';
            if (totalRecv <= 0) stockState = 'Waiting Dyeing';
            else if (dyeingBalance > totalReq * 0.05 && stockBalance > 0.5) stockState = 'Partly Received';
            else if (stockBalance <= 0) stockState = 'Fully Issued';

            const rNum = (idx % FABRIC_RACKS) + 1;
            const sNum = (Math.floor(idx / FABRIC_RACKS) % FABRIC_SHELVES) + 1;
            const defaultLocation = stockBalance > 0.5 ? `R-${String(rNum).padStart(2, '0')} · Shelf ${String(sNum).padStart(2, '0')}` : 'F.ST';

            return {
              id: `f-${idx}`,
              idx: idx + 1,
              month: item.m || '2026-11',
              buyer: item.b || 'Bestseller (Only & Sons)',
              jobNo: String(item.j || ''),
              style: String(item.st || ''),
              color: String(item.c || 'Solid Color'),
              fabric: String(item.f || 'Single Jersey'),
              fabricType: parseFabricType(item.f),
              construction: parseConstruction(item.f),
              composition: item.comp || '100% Organic Cotton',
              gsm: String(item.gsm || '160'),
              dia: String(item.dia || '68"'),
              process: String(item.ap || 'Y/D'),
              isImported,
              reqBody,
              reqRib,
              reqSJ,
              totalReq,
              recvBody,
              recvRib,
              recvSJ,
              totalRecv,
              dyeingBalance,
              issuedBody,
              issuedRib,
              issuedSJ,
              totalIssued,
              stockBody,
              stockRib,
              stockSJ,
              stockBalance,
              location: defaultLocation,
              cuttingLeftover: stockBalance > 0 && stockBalance < 50 ? Math.round(stockBalance * 0.4) : 0,
              excessQty: Math.max(0, totalRecv - totalReq),
              date: item.ae || '11.11.26',
              challans: String(item.ch || `CH-NFL-${1000 + idx}`),
              deliveryDate: item.ae || '2026-11-15',
              supplier: item.df ? (item.df === 'NFL' ? 'Northern Dyeing Unit-1' : item.df === 'NCL' ? 'Northern Composite Ltd' : `${item.df} Supplier`) : 'Northern Dyeing',
              dyeingFactory: item.df || 'Northern Dyeing',
              exFactoryDate: item.tpe || '2026-11-25',
              slot: String(item.sl || '1'),
              merchandiser: item.mr || 'Store Merchandiser',
              qualityStatus: 'PASS',
              stockState,
              isCuttingOk: stockBalance <= 5 && totalIssued > 0,
            };
          });

          setRawLines(parsed);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching finished-bootstrap:', err);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  function parseFabricType(s: string): string {
    const t = String(s || '').toLowerCase();
    if (/rib/.test(t)) return 'Rib';
    if (/interlock/.test(t)) return 'Interlock';
    if (/fleece/.test(t)) return 'Fleece';
    if (/terry/.test(t)) return 'Terry';
    if (/pique|lacoste/.test(t)) return 'Pique';
    if (/s\s*\/\s*j|single\s*jersey|\bsj\b|jersey/.test(t)) return 'Single Jersey';
    if (/woven|chiffon|poplin/.test(t)) return 'Imported Woven';
    return 'Other Knit';
  }

  function parseConstruction(s: string): string {
    const t = String(s || '').toLowerCase();
    if (/1\s*x\s*1/.test(t)) return '1x1 Rib';
    if (/2\s*x\s*1|2\s*x\s*2/.test(t)) return '2x1 Rib';
    if (/brush|fleece/.test(t)) return 'Brushed fleece';
    if (/terry|french terry/.test(t)) return 'Loop back Terry';
    if (/y\.?\s*\/?\s*d|stripe/.test(t)) return 'Yarn-dyed Stripe';
    return 'Plain Single';
  }

  // --------------------------------------------------------------------------
  // GROUPING BY BUYER & JOB (MULTI-COLOR ENGINE)
  // --------------------------------------------------------------------------
  const jobGroups = useMemo(() => {
    const map = new Map<string, JobFabricGroup>();

    rawLines.forEach((line) => {
      const key = `${line.buyer}|${line.jobNo}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          buyer: line.buyer,
          jobNo: line.jobNo,
          style: line.style,
          month: line.month,
          slot: line.slot,
          merchandiser: line.merchandiser,
          supplier: line.supplier,
          dyeingFactory: line.dyeingFactory || line.supplier,
          fabric: line.fabric,
          fabricType: line.fabricType,
          composition: line.composition,
          gsm: line.gsm,
          dia: line.dia,
          process: line.process,
          isImported: line.isImported,
          reqBody: 0,
          reqRib: 0,
          reqSJ: 0,
          totalReq: 0,
          recvBody: 0,
          recvRib: 0,
          recvSJ: 0,
          totalRecv: 0,
          totalBalance: 0,
          issuedBody: 0,
          issuedRib: 0,
          issuedSJ: 0,
          totalIssued: 0,
          stockBody: 0,
          stockRib: 0,
          stockSJ: 0,
          totalStock: 0,
          cuttingLeftover: 0,
          location: line.location,
          colorCount: 0,
          colors: [],
          primaryStatus: 'In Stock',
          isCuttingOk: false,
        });
      }

      const group = map.get(key)!;
      if (!group.style && line.style) group.style = line.style;
      group.reqBody += line.reqBody;
      group.reqRib += line.reqRib;
      group.reqSJ += line.reqSJ;
      group.totalReq += line.totalReq;

      group.recvBody += line.recvBody;
      group.recvRib += line.recvRib;
      group.recvSJ += line.recvSJ;
      group.totalRecv += line.totalRecv;
      group.totalBalance += line.dyeingBalance;

      group.issuedBody += line.issuedBody;
      group.issuedRib += line.issuedRib;
      group.issuedSJ += line.issuedSJ;
      group.totalIssued += line.totalIssued;

      group.stockBody += line.stockBody;
      group.stockRib += line.stockRib;
      group.stockSJ += line.stockSJ;
      group.totalStock += line.stockBalance;

      group.cuttingLeftover += line.cuttingLeftover;
      if (line.isImported) group.isImported = true;

      group.colors.push(line);
      group.colorCount = group.colors.length;
    });

    map.forEach((grp) => {
      if (grp.totalRecv <= 0) grp.primaryStatus = 'Waiting Dyeing';
      else if (grp.totalBalance > grp.totalReq * 0.05 && grp.totalStock > 0) grp.primaryStatus = 'Partly Received';
      else if (grp.totalStock > 0) grp.primaryStatus = 'In Stock';
      else grp.primaryStatus = 'Fully Issued';
      grp.isCuttingOk = grp.colors.every(c => c.isCuttingOk);
    });

    return Array.from(map.values());
  }, [rawLines]);

  // --------------------------------------------------------------------------
  // FILTERING
  // --------------------------------------------------------------------------
  const filteredJobGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return jobGroups.filter((job) => {
      if (filterImportedOnly && !job.isImported) return false;
      if (selectedBuyer !== 'ALL' && job.buyer !== selectedBuyer) return false;
      if (selectedMonth !== 'ALL' && job.month !== selectedMonth) return false;
      if (selectedStatus !== 'ALL' && job.primaryStatus !== selectedStatus) return false;
      if (selectedFabricType !== 'ALL' && job.fabricType !== selectedFabricType) return false;

      if (!q) return true;
      const haystack = `${job.jobNo} ${job.style} ${job.buyer} ${job.fabric} ${job.composition} ${job.colors.map(c => c.color).join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [jobGroups, searchQuery, selectedBuyer, selectedMonth, selectedStatus, selectedFabricType, filterImportedOnly]);

  const buyerOptions = useMemo(() => Array.from(new Set(rawLines.map(l => l.buyer))).sort(), [rawLines]);
  const fabricTypeOptions = useMemo(() => Array.from(new Set(rawLines.map(l => l.fabricType))).sort(), [rawLines]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobGroups.slice(start, start + itemsPerPage);
  }, [filteredJobGroups, currentPage]);

  const totalPages = Math.ceil(filteredJobGroups.length / itemsPerPage) || 1;

  const toggleJobExpanded = (key: string) => {
    setExpandedJobs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllExpanded = () => {
    const next = !showAllColors;
    setShowAllColors(next);
    if (!next) setExpandedJobs({});
  };

  // --------------------------------------------------------------------------
  // DASHBOARD KPIS (Exact metrics requested by user)
  // --------------------------------------------------------------------------
  const dashboardKpis = useMemo(() => {
    let totalStockKg = 0;
    let totalOrderKg = 0;
    let totalRecvKg = 0;
    let totalBalanceKg = 0;
    let totalIssuedKg = 0;
    let totalLeftoverKg = 0;

    rawLines.forEach(l => {
      totalStockKg += l.stockBalance;
      totalOrderKg += l.totalReq;
      totalRecvKg += l.totalRecv;
      totalBalanceKg += l.dyeingBalance;
      totalIssuedKg += l.totalIssued;
      totalLeftoverKg += l.cuttingLeftover;
    });

    const pendingCuttingIssueKg = Math.max(0, totalRecvKg - totalIssuedKg);
    const dailyReceiveKg = 2480;
    const dailyDeliveryKg = 2150;

    const buyerMap: Record<string, { orderKg: number; recvKg: number; issuedKg: number; stockKg: number; balanceKg: number; jobs: Set<string> }> = {};
    rawLines.forEach(l => {
      if (!buyerMap[l.buyer]) {
        buyerMap[l.buyer] = { orderKg: 0, recvKg: 0, issuedKg: 0, stockKg: 0, balanceKg: 0, jobs: new Set() };
      }
      const b = buyerMap[l.buyer];
      b.orderKg += l.totalReq;
      b.recvKg += l.totalRecv;
      b.issuedKg += l.totalIssued;
      b.stockKg += l.stockBalance;
      b.balanceKg += l.dyeingBalance;
      b.jobs.add(l.jobNo);
    });

    const buyerChartData = Object.entries(buyerMap).map(([buyer, d]) => ({
      buyer: buyer.length > 12 ? buyer.slice(0, 12) + '…' : buyer,
      fullName: buyer,
      jobsCount: d.jobs.size,
      orderTons: Math.round(d.orderKg / 100) / 10,
      receivedTons: Math.round(d.recvKg / 100) / 10,
      balanceTons: Math.round(d.balanceKg / 100) / 10,
      issuedTons: Math.round(d.issuedKg / 100) / 10,
      stockTons: Math.round(d.stockKg / 100) / 10,
    })).sort((a, b) => b.orderTons - a.orderTons).slice(0, 7);

    return {
      totalInStoreJobs: jobGroups.filter(j => j.totalStock > 0).length,
      totalStockKg,
      totalStockTons: (totalStockKg / 1000).toFixed(1),
      totalOrderJobs: jobGroups.length,
      totalOrderKg,
      totalOrderTons: (totalOrderKg / 1000).toFixed(1),
      totalRecvKg,
      totalRecvTons: (totalRecvKg / 1000).toFixed(1),
      totalBalanceKg,
      totalBalanceTons: (totalBalanceKg / 1000).toFixed(1),
      totalIssuedKg,
      totalIssuedTons: (totalIssuedKg / 1000).toFixed(1),
      pendingCuttingIssueKg,
      pendingCuttingIssueTons: (pendingCuttingIssueKg / 1000).toFixed(1),
      totalLeftoverKg,
      totalLeftoverLots: leftoverLedger.length,
      dailyReceiveKg,
      dailyDeliveryKg,
      buyerChartData,
    };
  }, [rawLines, jobGroups, leftoverLedger]);

  // --------------------------------------------------------------------------
  // ACTIONS: RECEIVE MODAL CONFIRMATION
  // --------------------------------------------------------------------------
  const handleAddReceiveColorRow = () => {
    setReceiveForm(prev => ({
      ...prev,
      colors: [
        ...prev.colors,
        {
          color: '',
          reqBody: 0,
          reqSJ: 0,
          reqRib: 0,
          recvBody: 0,
          recvSJ: 0,
          recvRib: 0,
          location: 'R-01-S01',
          rollCount: 1,
          remarks: '',
        },
      ],
    }));
  };

  const handleConfirmReceiveChallan = () => {
    if (!receiveForm.challanNo || !receiveForm.supplier || !receiveForm.jobNo) {
      showToast('Please enter Challan No, Supplier and Job No');
      return;
    }

    let totalRecvAdded = 0;
    receiveForm.colors.forEach((c) => {
      const added = (Number(c.recvBody) || 0) + (Number(c.recvSJ) || 0) + (Number(c.recvRib) || 0);
      totalRecvAdded += added;

      const newCh: SupplierChallanItem = {
        id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        challanNo: receiveForm.challanNo,
        date: receiveForm.date,
        supplier: receiveForm.supplier,
        sourceType: receiveForm.sourceType,
        buyer: receiveForm.buyer,
        jobNo: receiveForm.jobNo,
        style: receiveForm.style || '—',
        color: c.color || 'Single Color',
        fabric: `${receiveForm.fabricType} ${receiveForm.gsm} GSM`,
        challanBodyKg: Number(c.recvBody) || 0,
        challanRibKg: Number(c.recvRib) || 0,
        challanSJKg: Number(c.recvSJ) || 0,
        weighedBodyKg: Number(c.recvBody) || 0,
        weighedRibKg: Number(c.recvRib) || 0,
        weighedSJKg: Number(c.recvSJ) || 0,
        totalKg: added,
        rollCount: Number(c.rollCount) || 1,
        weightDiffKg: 0,
        rackLocation: c.location,
        remarks: c.remarks,
        status: 'Accepted',
      };
      setChallans(prev => [newCh, ...prev]);

      if (receiveForm.sourceType === 'CUTTING_LEFTOVER') {
        setLeftoverLedger(prev => [
          {
            id: `lr-${Date.now()}`,
            date: receiveForm.date,
            jobNo: receiveForm.jobNo,
            color: c.color,
            source: 'Cutting Return',
            bodyKg: Number(c.recvBody) || 0,
            ribKg: Number(c.recvRib) || 0,
            sjKg: Number(c.recvSJ) || 0,
            totalKg: added,
            returnedBy: receiveForm.supplier,
            rackAssigned: c.location,
            status: 'Available in Leftover',
          },
          ...prev,
        ]);
      }
    });

    showToast(`Challan ${receiveForm.challanNo} saved successfully! ${totalRecvAdded} kg added into store.`);
    setIsReceiveModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: ISSUE TO CUTTING SAVE
  // --------------------------------------------------------------------------
  const handleSaveTodayDelivery = (job: JobFabricGroup) => {
    let issuedTotalAdded = 0;
    const dateStr = new Date().toISOString().slice(0, 10);

    job.colors.forEach(c => {
      const entry = todayDeliveries[c.id];
      if (!entry) return;
      const bKg = Number(entry.bodyKg) || 0;
      const sKg = Number(entry.sjKg) || 0;
      const rKg = Number(entry.ribKg) || 0;
      const sum = bKg + sKg + rKg;

      if (sum > 0) {
        issuedTotalAdded += sum;
        const slip: CuttingIssueSlip = {
          id: `ci-${Date.now()}-${c.id}`,
          issueNo: `FI-${Date.now().toString().slice(-4)}`,
          date: dateStr,
          buyer: job.buyer,
          jobNo: job.jobNo,
          style: job.style,
          color: c.color,
          fabricDescription: `${job.fabricType} ${job.gsm} GSM`,
          bodyKg: bKg,
          ribKg: rKg,
          sjKg: sKg,
          totalKg: sum,
          issuedBy: 'Store In-charge',
          receivedBy: 'Cutting Floor Supervisor',
          remarks: entry.isCuttingOk ? 'Lot completed (Cutting OK)' : 'Partial delivery',
          isCuttingOk: entry.isCuttingOk,
        };
        setCuttingIssues(prev => [slip, ...prev]);

        setRawLines(prev =>
          prev.map(l => {
            if (l.id === c.id) {
              const nextIssuedBody = l.issuedBody + bKg;
              const nextIssuedSJ = l.issuedSJ + sKg;
              const nextIssuedRib = l.issuedRib + rKg;
              const nextTotalIssued = l.totalIssued + sum;
              const nextStockBody = Math.max(0, l.recvBody - nextIssuedBody);
              const nextStockSJ = Math.max(0, l.recvSJ - nextIssuedSJ);
              const nextStockRib = Math.max(0, l.recvRib - nextIssuedRib);
              const nextStockBal = nextStockBody + nextStockSJ + nextStockRib;

              if (entry.isCuttingOk && nextStockBal > 0) {
                setLeftoverLedger(lr => [
                  {
                    id: `lr-${Date.now()}-${l.id}`,
                    date: dateStr,
                    jobNo: l.jobNo,
                    color: l.color,
                    source: 'Closing Stock Balance',
                    bodyKg: nextStockBody,
                    ribKg: nextStockRib,
                    sjKg: nextStockSJ,
                    totalKg: nextStockBal,
                    returnedBy: 'Cutting OK Completion',
                    rackAssigned: l.location,
                    status: 'Available in Leftover',
                  },
                  ...lr,
                ]);
              }

              return {
                ...l,
                issuedBody: nextIssuedBody,
                issuedSJ: nextIssuedSJ,
                issuedRib: nextIssuedRib,
                totalIssued: nextTotalIssued,
                stockBody: nextStockBody,
                stockSJ: nextStockSJ,
                stockRib: nextStockRib,
                stockBalance: entry.isCuttingOk ? 0 : nextStockBal,
                stockState: entry.isCuttingOk || nextStockBal <= 0 ? 'Fully Issued' : 'In Stock',
                isCuttingOk: entry.isCuttingOk,
              };
            }
            return l;
          })
        );
      }
    });

    showToast(`Delivery recorded for Job ${job.jobNo}: ${issuedTotalAdded} kg dispatched to cutting floor.`);
    setTodayDeliveries({});
    setSelectedIssueJob(null);
  };

  return (
    <Shell
      title="Finished Fabric Store"
      eyebrow="Finished Fabric Intake, Inspection, 20-Rack × 20-Shelf Storage & Cutting Floor Delivery"
    >
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F274E] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP TITLE BAR (ODOU STYLE CLEAN ENTERPRISE BAR) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-sky-700" />
              Finished Fabric Store Management
            </h1>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Northern Fashions Ltd · Live Store
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Color-wise fabric stock ledger, 3-component tracking (Body, Rib, S. Jersey), delivery issuance & 20 Master Racks location tracking
          </p>
        </div>

        {/* Action Controls & Dashboard Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDashboard(!showDashboard)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            {showDashboard ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            <span>{showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReceiveModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Imported / New Receive</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EXECUTIVE DASHBOARD CARDS (Clean Odoo Aesthetic, Collapsible) */}
      {/* ===================================================================== */}
      {showDashboard && (
        <div className="space-y-3 mb-4 animate-in fade-in duration-150">
          {/* ROW 1: 6 SUMMARY METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Store In-Stock
              </span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {dashboardKpis.totalInStoreJobs} <span className="text-xs font-normal text-slate-500">Jobs</span>
              </div>
              <div className="text-xs font-semibold text-sky-800 mt-1">
                {Math.round(dashboardKpis.totalStockKg).toLocaleString()} kg ({dashboardKpis.totalStockTons} T)
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Total Order Demand
              </span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {dashboardKpis.totalOrderJobs} <span className="text-xs font-normal text-slate-500">Jobs</span>
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                {Math.round(dashboardKpis.totalOrderKg).toLocaleString()} kg ({dashboardKpis.totalOrderTons} T)
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Received vs Balance
              </span>
              <div className="text-base font-bold text-emerald-800 mt-0.5">
                {dashboardKpis.totalRecvTons} <span className="text-xs font-normal text-slate-500">Tons Recv</span>
              </div>
              <div className="text-xs font-semibold text-rose-700 mt-1">
                Bal: {dashboardKpis.totalBalanceTons} Tons
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Cutting Issue & Pending
              </span>
              <div className="text-base font-bold text-purple-800 mt-0.5">
                {dashboardKpis.totalIssuedTons} <span className="text-xs font-normal text-slate-500">Tons Issued</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                Pending: {dashboardKpis.pendingCuttingIssueTons} Tons
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Daily Run-Rates
              </span>
              <div className="text-xs font-semibold text-emerald-800 mt-1 flex items-center justify-between">
                <span>Inward:</span>
                <span>+{dashboardKpis.dailyReceiveKg.toLocaleString()} kg/day</span>
              </div>
              <div className="text-xs font-semibold text-purple-800 mt-0.5 flex items-center justify-between">
                <span>Outward:</span>
                <span>-{dashboardKpis.dailyDeliveryKg.toLocaleString()} kg/day</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Leftover Stock
              </span>
              <div className="text-base font-bold text-amber-800 mt-0.5">
                {Math.round(dashboardKpis.totalLeftoverKg).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
              </div>
              <div className="text-xs font-semibold text-amber-700 mt-1">
                {dashboardKpis.totalLeftoverLots} Active Roll Lots
              </div>
            </div>
          </div>

          {/* ROW 2: 2 BUYER BREAKDOWN CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    Top Buyers: Received vs Receive Balance (Tons)
                  </h4>
                  <p className="text-[10px] text-slate-500">Inward delivery from suppliers vs Still to receive</p>
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Tons</span>
              </div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardKpis.buyerChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="buyer" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 500 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any, name: any) => [`${val} Tons`, name === 'receivedTons' ? 'Received' : 'Receive Balance']}
                    />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="receivedTons" fill="#16A34A" stackId="a" maxBarSize={22} />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="balanceTons" fill="#DC2626" stackId="a" radius={[2, 2, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-medium border-t border-slate-100 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-600 rounded-xs"></span> Received</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-600 rounded-xs"></span> Receive Balance</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    Top Buyers: Cutting Issue vs In-Stock (Tons)
                  </h4>
                  <p className="text-[10px] text-slate-500">Dispatched to cutting tables vs In store stock</p>
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Tons</span>
              </div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardKpis.buyerChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="buyer" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 500 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any, name: any) => [`${val} Tons`, name === 'issuedTons' ? 'Issued to Cutting' : 'In Store Stock']}
                    />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="issuedTons" fill="#7C3AED" stackId="b" maxBarSize={22} />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="stockTons" fill="#0284C7" stackId="b" radius={[2, 2, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-medium border-t border-slate-100 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-600 rounded-xs"></span> Dispatched to Cutting</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-600 rounded-xs"></span> In Store Stock</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ODOO-STYLE CLEAN TAB BAR (MATCHING TRIMS STORE NAVIGATION) */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-lg p-1.5 mb-4 flex flex-wrap items-center gap-2 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('STOCK')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'STOCK'
              ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Boxes size={15} color={activeTab === 'STOCK' ? '#FFFFFF' : '#2563EB'} />
          <span>1. Finished Fabric Stock Statement</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'STOCK' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {jobGroups.length} Jobs
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECEIVE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'RECEIVE'
              ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Truck size={15} color={activeTab === 'RECEIVE' ? '#FFFFFF' : '#059669'} />
          <span>2. Imported & New Receive</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'RECEIVE' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {challans.length} Challans
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ISSUE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'ISSUE'
              ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Scissors size={15} color={activeTab === 'ISSUE' ? '#FFFFFF' : '#7C3AED'} />
          <span>3. Issue to Cutting Floor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOCATION')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'LOCATION'
              ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <MapPin size={15} color={activeTab === 'LOCATION' ? '#FFFFFF' : '#D97706'} />
          <span>4. Location Tracking (20 Racks × 20 Shelves)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REUSE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'REUSE'
              ? 'bg-blue-600 text-white border border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <RotateCcw size={15} color={activeTab === 'REUSE' ? '#FFFFFF' : '#0284C7'} />
          <span>5. Stock for Leftover & Reuse</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'REUSE' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {leftoverLedger.length}
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: FINISHED FABRIC STOCK STATEMENT (FULL WIDTH, CLEAN ODOO TABLE) */}
      {/* ===================================================================== */}
      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 mb-8">
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Job #, Style, Color..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Buyer Filter */}
              <select
                value={selectedBuyer}
                onChange={(e) => {
                  setSelectedBuyer(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Buyers ({buyerOptions.length})</option>
                {buyerOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Fabric Type */}
              <select
                value={selectedFabricType}
                onChange={(e) => {
                  setSelectedFabricType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Fabric Types</option>
                {fabricTypeOptions.map((ft) => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Partly Received">Partly Received</option>
                <option value="Waiting Dyeing">Waiting Dyeing</option>
                <option value="Fully Issued">Fully Issued</option>
              </select>

              {/* Reset */}
              {(searchQuery || selectedBuyer !== 'ALL' || selectedFabricType !== 'ALL' || selectedStatus !== 'ALL' || filterImportedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBuyer('ALL');
                    setSelectedFabricType('ALL');
                    setSelectedStatus('ALL');
                    setFilterImportedOnly(false);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium flex items-center gap-1 border border-rose-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllExpanded}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <Palette className="w-3.5 h-3.5 text-slate-600" />
                <span>{showAllColors ? 'Collapse Colors' : 'Expand All Colors'}</span>
              </button>
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filteredJobGroups.length}</strong> jobs
              </span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* PROFESSIONAL ODOO-STYLE COLUMN TOGGLE FILTER PILLS */}
          {/* =================================================================== */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 p-2 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-600 mr-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                Columns:
              </span>

              {/* 1. Job Specs */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, jobSpecs: !v.jobSpecs }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  visibleSections.jobSpecs
                    ? 'bg-slate-700 text-white border border-slate-700 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.jobSpecs && <Check className="w-3 h-3 text-white" />}
                <span>Job & Specs</span>
              </button>

              {/* 2. Order / Req Qty */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, orderQty: !v.orderQty }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  visibleSections.orderQty
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.orderQty && <Check className="w-3 h-3 text-white" />}
                <span>Order Qty (Body/Rib/SJ)</span>
              </button>

              {/* 3. Received Qty */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, receivedQty: !v.receivedQty }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  visibleSections.receivedQty
                    ? 'bg-emerald-600 text-white border border-emerald-600 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.receivedQty && <Check className="w-3 h-3 text-white" />}
                <span>Received (Body/Rib/SJ)</span>
              </button>

              {/* 4. Issue / Delivery Qty */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, deliveryQty: !v.deliveryQty }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  visibleSections.deliveryQty
                    ? 'bg-purple-600 text-white border border-purple-600 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.deliveryQty && <Check className="w-3 h-3 text-white" />}
                <span>Issue / Delivery (Body/Rib/SJ)</span>
              </button>

              {/* 5. Closing Stock */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, closingStock: !v.closingStock }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  visibleSections.closingStock
                    ? 'bg-sky-600 text-white border border-sky-600 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.closingStock && <Check className="w-3 h-3 text-white" />}
                <span>Closing Stock (Body/Rib/SJ)</span>
              </button>

              {/* 6. Location & Leftover */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, locationInfo: !v.locationInfo }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  visibleSections.locationInfo
                    ? 'bg-amber-700 text-white border border-amber-700 shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.locationInfo && <Check className="w-3 h-3 text-white" />}
                <span>Location & Leftover</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Imported Fabric Filter Toggle */}
              <button
                type="button"
                onClick={() => setFilterImportedOnly(!filterImportedOnly)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  filterImportedOnly
                    ? 'bg-teal-700 text-white border border-teal-700 font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Imported Fabric Only</span>
              </button>

              {/* Show All Columns Pill */}
              <button
                type="button"
                onClick={() =>
                  setVisibleSections({
                    jobSpecs: true,
                    orderQty: true,
                    receivedQty: true,
                    deliveryQty: true,
                    closingStock: true,
                    locationInfo: true,
                  })
                }
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium"
              >
                Show All
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* HIGH CONTRAST MASTER TABLE (STICKY HEADER WITH CRISP READABLE TEXT) */}
          {/* =================================================================== */}
          <div className="overflow-x-auto rounded-md border border-slate-300 bg-white shadow-2xs relative max-h-[750px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* STICKY THEAD (FROZEN AT TOP WHILE SCROLLING) */}
              <thead className="sticky top-0 z-30 shadow-xs">
                {/* TIER 1 HEADER GROUP */}
                <tr className="border-b border-slate-300 text-[10.5px] uppercase tracking-wider font-bold">
                  {/* Sticky left job/style header */}
                  <th colSpan={visibleSections.jobSpecs ? 9 : 2} className="sticky left-0 z-40 bg-slate-100 px-3 py-2 text-left border-r border-b border-slate-300 text-slate-800 font-bold">
                    Order Identification & Style Specification
                  </th>

                  {/* Order Qty Section Header */}
                  {visibleSections.orderQty && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-blue-100 text-blue-900 font-bold">
                      Order / Required Qty (Kg)
                    </th>
                  )}

                  {/* Received Section Header */}
                  {visibleSections.receivedQty && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-emerald-100 text-emerald-900 font-bold">
                      Received Qty (Kg)
                    </th>
                  )}

                  {/* Issue / Delivery Section Header */}
                  {visibleSections.deliveryQty && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-purple-100 text-purple-900 font-bold">
                      Issue / Delivery to Cutting (Kg)
                    </th>
                  )}

                  {/* Closing Stock Section Header */}
                  {visibleSections.closingStock && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-sky-100 text-sky-900 font-bold">
                      Closing Stock Balance (Kg)
                    </th>
                  )}

                  {/* Location & Leftover Header */}
                  {visibleSections.locationInfo && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-amber-100 text-amber-900 font-bold">
                      Location & Leftovers
                    </th>
                  )}

                  <th className="px-3 py-2 text-center bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">Action</th>
                </tr>

                {/* TIER 2 HEADER COLUMNS */}
                <tr className="bg-slate-50 text-slate-700 text-[11px] border-b border-slate-300 font-semibold">
                  {/* Sticky frozen columns */}
                  <th className="sticky left-0 z-40 bg-slate-50 px-3 py-2 text-slate-800 font-bold border-r border-slate-300 min-w-[150px]">
                    Buyer - Job No
                  </th>
                  <th className="px-3 py-2 text-slate-700 font-semibold min-w-[100px] border-r border-slate-300">Style No</th>

                  {visibleSections.jobSpecs && (
                    <>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[120px] border-r border-slate-200">Color</th>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[110px] border-r border-slate-200">Fabric Type</th>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[140px] border-r border-slate-200">Composition</th>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[70px] border-r border-slate-200">Process</th>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[50px] border-r border-slate-200">GSM</th>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[50px] border-r border-slate-200">Dia</th>
                      <th className="px-2.5 py-2 text-slate-700 font-semibold min-w-[80px] border-r border-slate-300">Status</th>
                    </>
                  )}

                  {/* Order Qty (Body, Rib, SJ, Total) */}
                  {visibleSections.orderQty && (
                    <>
                      <th className="px-2 py-2 text-right font-medium min-w-[65px] text-blue-900 bg-blue-50/80 border-r border-blue-100">Body</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-blue-900 bg-blue-50/80 border-r border-blue-100">Rib</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-blue-900 bg-blue-50/80 border-r border-blue-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-blue-950 bg-blue-100/90 border-r border-slate-300">Total Req</th>
                    </>
                  )}

                  {/* Received Qty (Body, Rib, SJ, Total) */}
                  {visibleSections.receivedQty && (
                    <>
                      <th className="px-2 py-2 text-right font-medium min-w-[65px] text-emerald-900 bg-emerald-50/80 border-r border-emerald-100">Body</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-emerald-900 bg-emerald-50/80 border-r border-emerald-100">Rib</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-emerald-900 bg-emerald-50/80 border-r border-emerald-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-emerald-950 bg-emerald-100/90 border-r border-slate-300">Total Recv</th>
                    </>
                  )}

                  {/* Issue / Delivery Qty (Body, Rib, SJ, Total) */}
                  {visibleSections.deliveryQty && (
                    <>
                      <th className="px-2 py-2 text-right font-medium min-w-[65px] text-purple-900 bg-purple-50/80 border-r border-purple-100">Body</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-purple-900 bg-purple-50/80 border-r border-purple-100">Rib</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-purple-900 bg-purple-50/80 border-r border-purple-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-purple-950 bg-purple-100/90 border-r border-slate-300">Total Issued</th>
                    </>
                  )}

                  {/* Closing Stock (Body, Rib, SJ, Total) */}
                  {visibleSections.closingStock && (
                    <>
                      <th className="px-2 py-2 text-right font-medium min-w-[65px] text-sky-900 bg-sky-50/80 border-r border-sky-100">Body</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-sky-900 bg-sky-50/80 border-r border-sky-100">Rib</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[60px] text-sky-900 bg-sky-50/80 border-r border-sky-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-sky-950 bg-sky-100/90 border-r border-slate-300">Stock Bal</th>
                    </>
                  )}

                  {/* Location & Leftover */}
                  {visibleSections.locationInfo && (
                    <>
                      <th className="px-2.5 py-2 font-medium min-w-[95px] text-amber-900 bg-amber-50/80 border-r border-amber-100">Location</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[70px] text-amber-900 bg-amber-50/80 border-r border-amber-100">Leftover</th>
                      <th className="px-2 py-2 text-right font-medium min-w-[65px] text-amber-900 bg-amber-50/80 border-r border-amber-100">Excess Qty</th>
                      <th className="px-2 py-2 text-center font-medium min-w-[65px] text-amber-900 bg-amber-50/80 border-r border-slate-300">Date</th>
                    </>
                  )}

                  <th className="px-2.5 py-2 text-center font-semibold min-w-[60px] text-slate-700">Action</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={25} className="py-20 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading master finished fabric statement...
                    </td>
                  </tr>
                ) : paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={25} className="py-16 text-center text-slate-500 font-semibold">
                      No matching jobs found with the applied filters.
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((job) => {
                    const isExpanded = expandedJobs[job.key] || showAllColors;

                    return (
                      <React.Fragment key={job.key}>
                        {/* MASTER JOB SUMMARY ROW */}
                        <tr
                          onClick={() => setSelectedJobDetail(job)}
                          className={`hover:bg-slate-100/70 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-slate-100 font-medium' : 'bg-white'
                          }`}
                        >
                          {/* Sticky left column */}
                          <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-100 px-3 py-2 font-bold text-slate-900 border-r border-slate-200 shadow-2xs">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleJobExpanded(job.key);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 bg-slate-50 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <div className="leading-tight">
                                <span className="text-[10px] text-slate-500 block font-normal">{job.buyer}</span>
                                <span className="font-bold text-slate-900 flex items-center gap-1">
                                  {job.jobNo}
                                  {job.isImported && (
                                    <span className="text-[9px] px-1 bg-teal-100 text-teal-800 rounded font-semibold">IMP</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Style */}
                          <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">{job.style || '—'}</td>

                          {/* Specs Columns */}
                          {visibleSections.jobSpecs && (
                            <>
                              <td className="px-2.5 py-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {job.colorCount} {job.colorCount === 1 ? 'Color' : 'Colors'}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-slate-700">{job.fabricType}</td>
                              <td className="px-2.5 py-2 text-slate-600 truncate max-w-[130px]" title={job.composition}>{job.composition}</td>
                              <td className="px-2.5 py-2 text-slate-600">{job.process}</td>
                              <td className="px-2.5 py-2 text-slate-600">{job.gsm}</td>
                              <td className="px-2.5 py-2 text-slate-600">{job.dia}</td>
                              <td className="px-2.5 py-2 border-r border-slate-200">
                                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                                  job.primaryStatus === 'In Stock' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                  job.primaryStatus === 'Partly Received' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {job.primaryStatus}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Order Qty Section */}
                          {visibleSections.orderQty && (
                            <>
                              <td className="px-2 py-2 text-right text-slate-700 font-medium">{Math.round(job.reqBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-slate-700 font-medium">{Math.round(job.reqRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-slate-700 font-medium">{Math.round(job.reqSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-slate-900 bg-slate-50 border-r border-slate-200">{Math.round(job.totalReq).toLocaleString()}</td>
                            </>
                          )}

                          {/* Received Qty Section */}
                          {visibleSections.receivedQty && (
                            <>
                              <td className="px-2 py-2 text-right text-emerald-800 font-medium">{Math.round(job.recvBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-emerald-800 font-medium">{Math.round(job.recvRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-emerald-800 font-medium">{Math.round(job.recvSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-emerald-900 bg-emerald-50/60 border-r border-slate-200">{Math.round(job.totalRecv).toLocaleString()}</td>
                            </>
                          )}

                          {/* Issue / Delivery Section */}
                          {visibleSections.deliveryQty && (
                            <>
                              <td className="px-2 py-2 text-right text-purple-800 font-medium">{Math.round(job.issuedBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-purple-800 font-medium">{Math.round(job.issuedRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-purple-800 font-medium">{Math.round(job.issuedSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-purple-900 bg-purple-50/60 border-r border-slate-200">{Math.round(job.totalIssued).toLocaleString()}</td>
                            </>
                          )}

                          {/* Closing Stock Section */}
                          {visibleSections.closingStock && (
                            <>
                              <td className="px-2 py-2 text-right font-semibold text-sky-800">{Math.round(job.stockBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right font-semibold text-sky-800">{Math.round(job.stockRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right font-semibold text-sky-800">{Math.round(job.stockSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-sky-950 bg-sky-50 border-r border-slate-200">{Math.round(job.totalStock).toLocaleString()}</td>
                            </>
                          )}

                          {/* Location & Leftover */}
                          {visibleSections.locationInfo && (
                            <>
                              <td className="px-2.5 py-2 font-medium text-slate-800 text-[11px]">{job.location}</td>
                              <td className="px-2 py-2 text-right font-semibold text-amber-800">{Math.round(job.cuttingLeftover)} kg</td>
                              <td className="px-2 py-2 text-right text-slate-500">{job.colors[0]?.excessQty || 0}</td>
                              <td className="px-2 py-2 text-center text-slate-500 text-[10.5px] border-r border-slate-200">{job.colors[0]?.date || '—'}</td>
                            </>
                          )}

                          <td className="px-2.5 py-2 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJobDetail(job);
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>

                        {/* EXPANDED COLOR BREAKDOWN ROWS */}
                        {isExpanded &&
                          job.colors.map((c, cIdx) => (
                            <tr
                              key={c.id}
                              onClick={() => setSelectedJobDetail(job)}
                              className="bg-slate-50/70 hover:bg-slate-100 cursor-pointer text-[11px] transition-colors border-l-2 border-slate-400"
                            >
                              <td className="sticky left-0 z-20 bg-slate-50/90 px-3 py-1.5 border-r border-slate-200 pl-6 text-slate-600 font-medium">
                                └ Color #{cIdx + 1}
                              </td>

                              <td className="px-3 py-1.5 text-slate-500 border-r border-slate-200">{job.style}</td>

                              {visibleSections.jobSpecs && (
                                <>
                                  <td className="px-2.5 py-1.5 font-semibold text-slate-900 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                                    <span>{c.color}</span>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-600">{c.fabric}</td>
                                  <td className="px-2.5 py-1.5 text-slate-500 truncate max-w-[130px]">{c.composition}</td>
                                  <td className="px-2.5 py-1.5 text-slate-500">{c.process}</td>
                                  <td className="px-2.5 py-1.5 text-slate-500">{c.gsm}</td>
                                  <td className="px-2.5 py-1.5 text-slate-500">{c.dia}</td>
                                  <td className="px-2.5 py-1.5 border-r border-slate-200">
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                      {c.stockState}
                                    </span>
                                  </td>
                                </>
                              )}

                              {/* Order Qty Section */}
                              {visibleSections.orderQty && (
                                <>
                                  <td className="px-2 py-1.5 text-right text-slate-600">{Math.round(c.reqBody)}</td>
                                  <td className="px-2 py-1.5 text-right text-slate-600">{Math.round(c.reqRib)}</td>
                                  <td className="px-2 py-1.5 text-right text-slate-600">{Math.round(c.reqSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-semibold text-slate-800 bg-slate-50/70 border-r border-slate-200">{Math.round(c.totalReq)}</td>
                                </>
                              )}

                              {/* Received Qty Section */}
                              {visibleSections.receivedQty && (
                                <>
                                  <td className="px-2 py-1.5 text-right text-emerald-800">{Math.round(c.recvBody)}</td>
                                  <td className="px-2 py-1.5 text-right text-emerald-800">{Math.round(c.recvRib)}</td>
                                  <td className="px-2 py-1.5 text-right text-emerald-800">{Math.round(c.recvSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-semibold text-emerald-900 bg-emerald-50/50 border-r border-slate-200">{Math.round(c.totalRecv)}</td>
                                </>
                              )}

                              {/* Issue / Delivery Section */}
                              {visibleSections.deliveryQty && (
                                <>
                                  <td className="px-2 py-1.5 text-right text-purple-800">{Math.round(c.issuedBody)}</td>
                                  <td className="px-2 py-1.5 text-right text-purple-800">{Math.round(c.issuedRib)}</td>
                                  <td className="px-2 py-1.5 text-right text-purple-800">{Math.round(c.issuedSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-semibold text-purple-900 bg-purple-50/50 border-r border-slate-200">{Math.round(c.totalIssued)}</td>
                                </>
                              )}

                              {/* Closing Stock Section */}
                              {visibleSections.closingStock && (
                                <>
                                  <td className="px-2 py-1.5 text-right font-medium text-sky-800">{Math.round(c.stockBody)}</td>
                                  <td className="px-2 py-1.5 text-right font-medium text-sky-800">{Math.round(c.stockRib)}</td>
                                  <td className="px-2 py-1.5 text-right font-medium text-sky-800">{Math.round(c.stockSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-bold text-sky-950 bg-sky-50/80 border-r border-slate-200">{Math.round(c.stockBalance)}</td>
                                </>
                              )}

                              {/* Location & Leftover */}
                              {visibleSections.locationInfo && (
                                <>
                                  <td className="px-2.5 py-1.5 text-slate-800 font-medium">{c.location}</td>
                                  <td className="px-2 py-1.5 text-right text-amber-800 font-medium">{Math.round(c.cuttingLeftover)} kg</td>
                                  <td className="px-2 py-1.5 text-right text-slate-400">{c.excessQty}</td>
                                  <td className="px-2 py-1.5 text-center text-slate-400 text-[10px] border-r border-slate-200">{c.date}</td>
                                </>
                              )}

                              <td className="px-2.5 py-1.5 text-center text-slate-400">—</td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({filteredJobGroups.length} total orders)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-md font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-md font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SIDE DRAWER: COLOR-WISE DETAIL (RIGHT TO LEFT SLIDE-IN POPUP) */}
      {/* ===================================================================== */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-2xs flex justify-end">
          <div className="bg-white w-full max-w-2xl lg:max-w-3xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-150">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300 block">
                  {selectedJobDetail.buyer} · Job #{selectedJobDetail.jobNo}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Style: {selectedJobDetail.style || '—'}
                </h3>
                <div className="text-xs text-slate-300 mt-0.5">
                  Fabric: {selectedJobDetail.fabric} · {selectedJobDetail.composition} · {selectedJobDetail.gsm} GSM · Dia {selectedJobDetail.dia}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobDetail(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Summary Chips */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Total Required</span>
                <strong className="text-slate-900 text-sm">{Math.round(selectedJobDetail.totalReq).toLocaleString()} kg</strong>
              </div>
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Total Received</span>
                <strong className="text-emerald-800 text-sm">{Math.round(selectedJobDetail.totalRecv).toLocaleString()} kg</strong>
              </div>
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Issued to Cutting</span>
                <strong className="text-purple-800 text-sm">{Math.round(selectedJobDetail.totalIssued).toLocaleString()} kg</strong>
              </div>
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">In-Stock Balance</span>
                <strong className="text-sky-900 text-sm">{Math.round(selectedJobDetail.totalStock).toLocaleString()} kg</strong>
              </div>
            </div>

            {/* Drawer Column Toggle Buttons */}
            <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-600 mr-1 text-[11px]">Columns:</span>
              <button
                type="button"
                onClick={() => setDrawerVisibleSections(v => ({ ...v, orderQty: !v.orderQty }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${drawerVisibleSections.orderQty ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Order Qty
              </button>
              <button
                type="button"
                onClick={() => setDrawerVisibleSections(v => ({ ...v, receivedQty: !v.receivedQty }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${drawerVisibleSections.receivedQty ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Received
              </button>
              <button
                type="button"
                onClick={() => setDrawerVisibleSections(v => ({ ...v, deliveryQty: !v.deliveryQty }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${drawerVisibleSections.deliveryQty ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setDrawerVisibleSections(v => ({ ...v, closingStock: !v.closingStock }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${drawerVisibleSections.closingStock ? 'bg-sky-600 text-white border-sky-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Stock
              </button>
              <button
                type="button"
                onClick={() => setDrawerVisibleSections(v => ({ ...v, location: !v.location }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${drawerVisibleSections.location ? 'bg-amber-700 text-white border-amber-700 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Location
              </button>
            </div>

            {/* Drawer Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-slate-600" />
                Color Details ({selectedJobDetail.colorCount} Colors)
              </h4>

              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="px-3 py-2 font-bold">Color</th>
                      {drawerVisibleSections.orderQty && (
                        <th className="px-2.5 py-2 text-right bg-blue-100 text-blue-900 font-semibold border-l border-blue-200">Order (B/R/SJ)</th>
                      )}
                      {drawerVisibleSections.receivedQty && (
                        <th className="px-2.5 py-2 text-right bg-emerald-100 text-emerald-900 font-semibold border-l border-emerald-200">Recv (B/R/SJ)</th>
                      )}
                      {drawerVisibleSections.deliveryQty && (
                        <th className="px-2.5 py-2 text-right bg-purple-100 text-purple-900 font-semibold border-l border-purple-200">Delivery</th>
                      )}
                      {drawerVisibleSections.closingStock && (
                        <th className="px-2.5 py-2 text-right bg-sky-100 text-sky-900 font-semibold border-l border-sky-200">Stock</th>
                      )}
                      {drawerVisibleSections.location && (
                        <th className="px-2.5 py-2 text-center bg-amber-100 text-amber-900 font-semibold border-l border-amber-200">Location</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                    {selectedJobDetail.colors.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-600" />
                            <span>{i + 1}. {c.color}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal pl-3.5">
                            Receive Balance: {Math.round(c.dyeingBalance)} kg
                          </div>
                        </td>

                        {drawerVisibleSections.orderQty && (
                          <td className="px-2.5 py-2 text-right text-slate-700 font-medium">
                            <div>{Math.round(c.totalReq)} kg</div>
                            <div className="text-[10px] text-slate-400">
                              B:{Math.round(c.reqBody)} R:{Math.round(c.reqRib)} SJ:{Math.round(c.reqSJ)}
                            </div>
                          </td>
                        )}

                        {drawerVisibleSections.receivedQty && (
                          <td className="px-2.5 py-2 text-right text-emerald-800 font-semibold">
                            <div>{Math.round(c.totalRecv)} kg</div>
                            <div className="text-[10px] text-emerald-600">
                              B:{Math.round(c.recvBody)} R:{Math.round(c.recvRib)} SJ:{Math.round(c.recvSJ)}
                            </div>
                          </td>
                        )}

                        {drawerVisibleSections.deliveryQty && (
                          <td className="px-2.5 py-2 text-right text-purple-800 font-semibold">
                            <div>{Math.round(c.totalIssued)} kg</div>
                            <div className="text-[10px] text-purple-600">
                              B:{Math.round(c.issuedBody)} R:{Math.round(c.issuedRib)}
                            </div>
                          </td>
                        )}

                        {drawerVisibleSections.closingStock && (
                          <td className="px-2.5 py-2 text-right font-bold text-sky-900">
                            <div>{Math.round(c.stockBalance)} kg</div>
                            <div className="text-[10px] text-sky-700">
                              B:{Math.round(c.stockBody)} R:{Math.round(c.stockRib)} SJ:{Math.round(c.stockSJ)}
                            </div>
                          </td>
                        )}

                        {drawerVisibleSections.location && (
                          <td className="px-2.5 py-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {c.location}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Direct Shortcuts */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIssueJob(selectedJobDetail);
                    setSelectedJobDetail(null);
                    setActiveTab('ISSUE');
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Scissors className="w-3.5 h-3.5 text-white" />
                  <span>Issue this Job to Cutting</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReceiveForm(prev => ({
                      ...prev,
                      buyer: selectedJobDetail.buyer,
                      jobNo: selectedJobDetail.jobNo,
                      style: selectedJobDetail.style,
                      fabricType: selectedJobDetail.fabricType,
                      composition: selectedJobDetail.composition,
                      gsm: selectedJobDetail.gsm,
                      dia: selectedJobDetail.dia,
                      colors: selectedJobDetail.colors.map(c => ({
                        color: c.color,
                        reqBody: c.reqBody,
                        reqSJ: c.reqSJ,
                        reqRib: c.reqRib,
                        recvBody: Math.max(0, c.reqBody - c.recvBody),
                        recvSJ: Math.max(0, c.reqSJ - c.recvSJ),
                        recvRib: Math.max(0, c.reqRib - c.recvRib),
                        location: c.location,
                        rollCount: 1,
                        remarks: '',
                      })),
                    }));
                    setSelectedJobDetail(null);
                    setIsReceiveModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Receive Challan for this Job</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedJobDetail(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-900 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: IMPORTED & NEW RECEIVE DESK */}
      {/* ===================================================================== */}
      {activeTab === 'RECEIVE' && (
        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Finished Fabric Receiving & Inward Gate Register
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receiving from Suppliers, Imported Fabrics & Cutting Floor Leftover Returns
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ New Receive Challan</span>
              </button>
            </div>

            {/* Source Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    receiveSourceFilter === 'ALL'
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  All Inward Sources ({challans.length})
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('SUPPLIER')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    receiveSourceFilter === 'SUPPLIER'
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Supplier Delivery
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('IMPORT')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    receiveSourceFilter === 'IMPORT'
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Imported Fabric
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('CUTTING_LEFTOVER')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    receiveSourceFilter === 'CUTTING_LEFTOVER'
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Cutting Floor Return
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Challan, Supplier, Job No..."
                  value={receiveSearchQuery}
                  onChange={e => setReceiveSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Challans Table */}
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Challan No</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-bold">Supplier</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-bold">Buyer - Job No</th>
                    <th className="px-3 py-2 font-semibold">Style</th>
                    <th className="px-3 py-2 font-bold">Color</th>
                    <th className="px-3 py-2 text-right font-medium">Body Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Rib Kg</th>
                    <th className="px-3 py-2 text-right font-medium">S.Jersey Kg</th>
                    <th className="px-3 py-2 text-right font-bold bg-emerald-100 text-emerald-900 border-l border-emerald-200">Total Recv</th>
                    <th className="px-3 py-2 text-center font-medium">Rolls</th>
                    <th className="px-3 py-2 font-semibold">Shelf Location</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {challans
                    .filter(ch => {
                      if (receiveSourceFilter !== 'ALL' && ch.sourceType !== receiveSourceFilter) return false;
                      if (!receiveSearchQuery) return true;
                      const q = receiveSearchQuery.toLowerCase();
                      return `${ch.challanNo} ${ch.supplier} ${ch.jobNo} ${ch.color} ${ch.style}`.toLowerCase().includes(q);
                    })
                    .map(ch => (
                      <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-900">{ch.challanNo}</td>
                        <td className="px-3 py-2 text-slate-500">{ch.date}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{ch.supplier}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {ch.sourceType === 'SUPPLIER' ? 'Supplier' : ch.sourceType === 'IMPORT' ? 'Imported' : 'Leftover Return'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">{ch.buyer} - {ch.jobNo}</td>
                        <td className="px-3 py-2 text-slate-600">{ch.style}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{ch.color}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{ch.weighedBodyKg}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{ch.weighedRibKg}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{ch.weighedSJKg}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-900 bg-emerald-50/60">
                          {ch.totalKg} kg
                        </td>
                        <td className="px-3 py-2 text-center font-medium text-slate-700">{ch.rollCount}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {ch.rackLocation}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NEW RECEIVE WITH COLOR-WISE BREAKDOWN */}
      {/* ===================================================================== */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-300 overflow-hidden flex flex-col animate-in fade-in zoom-in-98">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-300" />
                  Imported & New Receive Challan Entry
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Record inward delivery with Body, Single Jersey & Rib component breakdown
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* Row 1: Source, Challan No, Date, Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Receive Source</label>
                  <select
                    value={receiveForm.sourceType}
                    onChange={e => setReceiveForm({ ...receiveForm, sourceType: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  >
                    <option value="SUPPLIER">Supplier Delivery</option>
                    <option value="IMPORT">Imported Fabric</option>
                    <option value="CUTTING_LEFTOVER">Cutting Floor Return</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Challan / Ref No *</label>
                  <input
                    type="text"
                    value={receiveForm.challanNo}
                    onChange={e => setReceiveForm({ ...receiveForm, challanNo: e.target.value })}
                    placeholder="e.g. CH-NFL-2026-99"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={receiveForm.date}
                    onChange={e => setReceiveForm({ ...receiveForm, date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    value={receiveForm.supplier}
                    onChange={e => setReceiveForm({ ...receiveForm, supplier: e.target.value })}
                    placeholder="Supplier name"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Row 2: Buyer, Job No, Style, Fabric Spec */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Buyer</label>
                  <input
                    type="text"
                    value={receiveForm.buyer}
                    onChange={e => setReceiveForm({ ...receiveForm, buyer: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Job No *</label>
                  <input
                    type="text"
                    value={receiveForm.jobNo}
                    onChange={e => setReceiveForm({ ...receiveForm, jobNo: e.target.value })}
                    placeholder="e.g. 48283 or 48002"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Style No</label>
                  <input
                    type="text"
                    value={receiveForm.style}
                    onChange={e => setReceiveForm({ ...receiveForm, style: e.target.value })}
                    placeholder="e.g. 22042341"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fabric Type & GSM</label>
                  <input
                    type="text"
                    value={`${receiveForm.fabricType} ${receiveForm.gsm} GSM`}
                    onChange={e => setReceiveForm({ ...receiveForm, fabricType: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Color-wise Receive Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-600" />
                    Color Intake (Body, Single Jersey, Rib)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddReceiveColorRow}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                    <span>Add Color</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[10.5px]">
                      <tr>
                        <th className="px-2.5 py-2 font-bold min-w-[120px]">Color Name *</th>
                        <th className="px-2 py-2 text-center bg-blue-100 text-blue-900 font-semibold border-l border-blue-200" colSpan={3}>Required (Kg)</th>
                        <th className="px-2 py-2 text-center bg-emerald-100 text-emerald-900 font-bold border-l border-emerald-200" colSpan={3}>Received (Kg) *</th>
                        <th className="px-2.5 py-2 font-semibold min-w-[110px] border-l border-slate-300">Location *</th>
                        <th className="px-2 py-2 text-center min-w-[50px] border-l border-slate-300">Rolls</th>
                        <th className="px-1 py-2 text-center w-8"></th>
                      </tr>
                      <tr className="bg-slate-50 text-[10px] text-slate-700 border-t border-slate-300">
                        <th></th>
                        <th className="px-1.5 py-1 text-right bg-blue-50 text-blue-900 border-l border-blue-100">Body</th>
                        <th className="px-1.5 py-1 text-right bg-blue-50 text-blue-900 border-l border-blue-100">S.Jersey</th>
                        <th className="px-1.5 py-1 text-right bg-blue-50 text-blue-900 border-l border-blue-100">Rib</th>
                        <th className="px-1.5 py-1 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-100">Body</th>
                        <th className="px-1.5 py-1 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-100">S.Jersey</th>
                        <th className="px-1.5 py-1 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-100">Rib</th>
                        <th></th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                      {receiveForm.colors.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={c.color}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].color = e.target.value;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="e.g. Black C-N10"
                              className="w-full px-2 py-1 border border-slate-300 rounded font-medium text-slate-900"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.reqBody || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].reqBody = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right font-medium"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.reqSJ || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].reqSJ = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right font-medium"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.reqRib || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].reqRib = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right font-medium"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.recvBody || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].recvBody = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-emerald-400 rounded text-right font-bold text-emerald-800 bg-emerald-50/50"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.recvSJ || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].recvSJ = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-emerald-400 rounded text-right font-bold text-emerald-800 bg-emerald-50/50"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.recvRib || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].recvRib = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-emerald-400 rounded text-right font-bold text-emerald-800 bg-emerald-50/50"
                            />
                          </td>

                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={c.location}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].location = e.target.value;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="e.g. R-04 · Shelf 02"
                              className="w-full px-2 py-1 border border-slate-300 rounded font-medium text-slate-800 text-[11px]"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.rollCount}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].rollCount = Number(e.target.value) || 1;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              className="w-12 px-1 py-1 border border-slate-300 rounded text-center font-medium"
                            />
                          </td>

                          <td className="px-1 py-1.5 text-center">
                            {receiveForm.colors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = receiveForm.colors.filter((_, i) => i !== idx);
                                  setReceiveForm({ ...receiveForm, colors: next });
                                }}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReceiveChallan}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Confirm & Accept Delivery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ISSUE TO CUTTING FLOOR */}
      {/* ===================================================================== */}
      {activeTab === 'ISSUE' && (
        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-purple-700" />
                  Cutting Floor Requisition & Delivery Desk
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select or search any job to prepare color-wise cutting delivery gate pass with Today Delivery entry
                </p>
              </div>

              <div className="relative min-w-[280px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search any Job #, Style, Buyer..."
                  value={issueSearchQuery}
                  onChange={e => setIssueSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* Left Column: Jobs in Store */}
            <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900">
                  Select Job for Delivery
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  Stock Ready
                </span>
              </div>

              <div className="overflow-y-auto max-h-[560px] space-y-2 pr-1">
                {jobGroups
                  .filter(job => {
                    if (job.totalStock <= 0) return false;
                    if (!issueSearchQuery) return true;
                    const q = issueSearchQuery.toLowerCase();
                    return `${job.jobNo} ${job.style} ${job.buyer} ${job.fabric}`.toLowerCase().includes(q);
                  })
                  .slice(0, 40)
                  .map(job => {
                    const isSelected = selectedIssueJob?.key === job.key;
                    return (
                      <div
                        key={job.key}
                        onClick={() => {
                          setSelectedIssueJob(job);
                          const init: Record<string, any> = {};
                          job.colors.forEach(c => {
                            init[c.id] = {
                              bodyKg: Math.min(c.stockBody, Math.max(0, c.recvBody - c.issuedBody)),
                              sjKg: Math.min(c.stockSJ, Math.max(0, c.recvSJ - c.issuedSJ)),
                              ribKg: Math.min(c.stockRib, Math.max(0, c.recvRib - c.issuedRib)),
                              isCuttingOk: false,
                            };
                          });
                          setTodayDeliveries(init);
                        }}
                        className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-600 shadow-xs ring-1 ring-blue-600'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{job.jobNo}</span>
                          <span className="text-xs font-semibold text-sky-900 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            {Math.round(job.totalStock).toLocaleString()} kg In-Stock
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {job.buyer} · Style: <strong className="text-slate-800">{job.style}</strong>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {job.fabric} · {job.colorCount} Colors
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Column: Cutting Delivery Form */}
            <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              {selectedIssueJob ? (
                <div className="space-y-3.5">
                  <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300">
                        {selectedIssueJob.buyer} · Cutting Gate Delivery Desk
                      </span>
                      <span className="text-xs font-semibold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                        Available Stock: {Math.round(selectedIssueJob.totalStock).toLocaleString()} kg
                      </span>
                    </div>

                    <div className="text-base font-bold text-white">
                      Job #{selectedIssueJob.jobNo} — Style: {selectedIssueJob.style}
                    </div>

                    <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-4">
                      <span><strong>Composition:</strong> {selectedIssueJob.composition}</span>
                      <span><strong>GSM:</strong> {selectedIssueJob.gsm}</span>
                      <span><strong>Dia:</strong> {selectedIssueJob.dia}</span>
                      <span><strong>Process:</strong> {selectedIssueJob.process}</span>
                      <span><strong>Supplier:</strong> {selectedIssueJob.supplier}</span>
                    </div>
                  </div>

                  {/* Delivery Table */}
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[10.5px]">
                        <tr>
                          <th className="px-2.5 py-2 font-bold min-w-[120px]">Color</th>
                          <th className="px-2 py-2 text-right bg-blue-100 text-blue-900 font-semibold min-w-[70px] border-l border-blue-200">Order (Kg)</th>
                          <th className="px-2 py-2 text-right bg-emerald-100 text-emerald-900 font-semibold min-w-[70px] border-l border-emerald-200">Recv (Kg)</th>
                          <th className="px-2 py-2 text-right bg-purple-100 text-purple-900 font-semibold min-w-[80px] border-l border-purple-200">Prev Delivered</th>
                          <th className="px-2 py-2 text-right bg-sky-100 text-sky-900 font-semibold min-w-[80px] border-l border-sky-200">Delivery Bal</th>
                          <th className="px-2 py-2 text-center bg-slate-200 text-slate-800 font-bold min-w-[160px] border-l border-slate-300">
                            Today Delivery (Body / SJ / Rib)
                          </th>
                          <th className="px-2 py-2 text-center bg-slate-100 text-slate-800 font-semibold min-w-[75px] border-l border-slate-300">Cutting OK?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                        {selectedIssueJob.colors.map(c => {
                          const delivery = todayDeliveries[c.id] || { bodyKg: 0, sjKg: 0, ribKg: 0, isCuttingOk: false };
                          const todayTotal = (Number(delivery.bodyKg) || 0) + (Number(delivery.sjKg) || 0) + (Number(delivery.ribKg) || 0);
                          const remainingAfterToday = Math.max(0, c.stockBalance - todayTotal);

                          return (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2.5 py-2 font-semibold text-slate-900">
                                <div>{c.color}</div>
                                <div className="text-[10px] text-slate-500 font-normal">Loc: {c.location}</div>
                              </td>

                              <td className="px-2 py-2 text-right text-slate-700">
                                <div>{Math.round(c.totalReq)}</div>
                                <div className="text-[10px] text-slate-400">B:{Math.round(c.reqBody)} R:{Math.round(c.reqRib)}</div>
                              </td>

                              <td className="px-2 py-2 text-right text-emerald-800 font-medium">
                                <div>{Math.round(c.totalRecv)}</div>
                                <div className="text-[10px] text-emerald-600">B:{Math.round(c.recvBody)} R:{Math.round(c.recvRib)}</div>
                              </td>

                              <td className="px-2 py-2 text-right text-purple-800 font-medium">
                                <div>{Math.round(c.totalIssued)}</div>
                                <div className="text-[10px] text-purple-500">B:{Math.round(c.issuedBody)} R:{Math.round(c.issuedRib)}</div>
                              </td>

                              <td className="px-2 py-2 text-right font-semibold text-sky-900 bg-sky-50/50">
                                <div>{Math.round(c.stockBalance)} kg</div>
                                <div className="text-[10px] text-sky-700">Rem: {Math.round(remainingAfterToday)} kg</div>
                              </td>

                              {/* Today Delivery Inputs */}
                              <td className="px-2 py-1.5 text-center bg-slate-50">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    value={delivery.bodyKg || ''}
                                    placeholder="Body"
                                    onChange={e => {
                                      setTodayDeliveries(prev => ({
                                        ...prev,
                                        [c.id]: {
                                          ...delivery,
                                          bodyKg: Number(e.target.value) || 0,
                                        },
                                      }));
                                    }}
                                    className="w-14 px-1 py-1 border border-slate-300 rounded text-right font-medium text-slate-900 bg-white"
                                    title="Body Kg"
                                  />
                                  <input
                                    type="number"
                                    value={delivery.sjKg || ''}
                                    placeholder="SJ"
                                    onChange={e => {
                                      setTodayDeliveries(prev => ({
                                        ...prev,
                                        [c.id]: {
                                          ...delivery,
                                          sjKg: Number(e.target.value) || 0,
                                        },
                                      }));
                                    }}
                                    className="w-14 px-1 py-1 border border-slate-300 rounded text-right font-medium text-slate-900 bg-white"
                                    title="S.Jersey Kg"
                                  />
                                  <input
                                    type="number"
                                    value={delivery.ribKg || ''}
                                    placeholder="Rib"
                                    onChange={e => {
                                      setTodayDeliveries(prev => ({
                                        ...prev,
                                        [c.id]: {
                                          ...delivery,
                                          ribKg: Number(e.target.value) || 0,
                                        },
                                      }));
                                    }}
                                    className="w-14 px-1 py-1 border border-slate-300 rounded text-right font-medium text-slate-900 bg-white"
                                    title="Rib Kg"
                                  />
                                </div>
                                <div className="text-[10px] font-semibold text-slate-700 mt-0.5">
                                  Total: {todayTotal} kg
                                </div>
                              </td>

                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTodayDeliveries(prev => ({
                                      ...prev,
                                      [c.id]: {
                                        ...delivery,
                                        isCuttingOk: !delivery.isCuttingOk,
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-all border ${
                                    delivery.isCuttingOk
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {delivery.isCuttingOk ? '✓ OK' : 'Mark OK'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* Summary Total Row */}
                      <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t border-slate-300">
                        <tr>
                          <td className="px-2.5 py-2 uppercase tracking-wider text-slate-700">Total Summary</td>
                          <td className="px-2 py-2 text-right">{Math.round(selectedIssueJob.totalReq).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right text-emerald-800">{Math.round(selectedIssueJob.totalRecv).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right text-purple-800">{Math.round(selectedIssueJob.totalIssued).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right text-sky-900">{Math.round(selectedIssueJob.totalStock).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-center font-bold text-slate-900">
                            {Object.values(todayDeliveries).reduce(
                              (sum, d) => sum + (Number(d.bodyKg) || 0) + (Number(d.sjKg) || 0) + (Number(d.ribKg) || 0),
                              0
                            )}{' '}
                            kg Today
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Save Delivery Button */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIssueJob(null)}
                      className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveTodayDelivery(selectedIssueJob)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-white" />
                      <span>Save & Confirm Cutting Delivery</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400">
                  <Scissors className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No Job Currently Selected</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select an available job from the left or search above to prepare cutting delivery
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cutting Floor Issuance Log */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Cutting Floor Issuance & Gate Pass Log
            </h4>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Issue No</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-bold">Buyer - Job No</th>
                    <th className="px-3 py-2 font-semibold">Style</th>
                    <th className="px-3 py-2 font-bold">Color</th>
                    <th className="px-3 py-2 text-right font-medium">Body Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Rib Kg</th>
                    <th className="px-3 py-2 text-right font-medium">S.Jersey Kg</th>
                    <th className="px-3 py-2 text-right font-bold bg-purple-100 text-purple-900 border-l border-purple-200">Total Issued</th>
                    <th className="px-3 py-2 font-semibold">Remarks / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {cuttingIssues.map(ci => (
                    <tr key={ci.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">{ci.issueNo}</td>
                      <td className="px-3 py-2 text-slate-500">{ci.date}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{ci.buyer} - {ci.jobNo}</td>
                      <td className="px-3 py-2 text-slate-600">{ci.style}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{ci.color}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{ci.bodyKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{ci.ribKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{ci.sjKg}</td>
                      <td className="px-3 py-2 text-right font-bold text-purple-900 bg-purple-50/50">{ci.totalKg} kg</td>
                      <td className="px-3 py-2 text-slate-600">
                        {ci.isCuttingOk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Cutting OK
                          </span>
                        ) : (
                          <span>{ci.remarks}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: LOCATION TRACKING (20 MASTER RACKS × 20 SHELVES) */}
      {/* ===================================================================== */}
      {activeTab === 'LOCATION' && (
        <div className="mb-8">
          <FabricRackLocation
            lines={rawLines}
            locations={rackLoc}
            onChange={(next, msg) => saveRackLoc(next, msg)}
            initialSub="racks"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: LEFTOVER & REUSE FABRIC */}
      {/* ===================================================================== */}
      {activeTab === 'REUSE' && (
        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  Finished Fabric Leftover & Reuse Store
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Leftover balances from Cutting Floor Returns & Completed Order Closing Stocks
                </p>
              </div>
              <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded border border-amber-200">
                {leftoverLedger.length} Leftover Roll Lots Registered
              </span>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Job No</th>
                    <th className="px-3 py-2 font-bold">Color</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 text-right font-medium">Body Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Rib Kg</th>
                    <th className="px-3 py-2 text-right font-medium">S.Jersey Kg</th>
                    <th className="px-3 py-2 text-right font-bold bg-amber-100 text-amber-900 border-l border-amber-200">Total Leftover</th>
                    <th className="px-3 py-2 font-bold">Assigned Shelf</th>
                    <th className="px-3 py-2 font-semibold">Returned By</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {leftoverLedger.map(lr => (
                    <tr key={lr.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{lr.date}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{lr.jobNo}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{lr.color}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {lr.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{lr.bodyKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{lr.ribKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{lr.sjKg}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-900 bg-amber-50/50">
                        {lr.totalKg} kg
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{lr.rackAssigned}</td>
                      <td className="px-3 py-2 text-slate-600">{lr.returnedBy}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {lr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
