'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { FX_SERIES, FX_BAR, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';
import FabricRackLocation, { RackLocations, LocationPicker, LocationPick, emptyPick, pickIsValid, pickLabel, assignLocation, locLabel, isShelfKey } from '../../../components/fabric/FabricRackLocation';

// v2: starts empty — only real placements entered by the store (v1 held an invented demo layout)
const RACK_STORE_KEY = 'nos-finished-fabric-rack-locations-v2';

// ============================================================================
// DATA TYPES & INTERFACES
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
  reqBody: number;
  reqRib: number;
  reqSJ: number;
  totalReq: number;
  recvBody: number;
  recvRib: number;
  recvSJ: number;
  totalRecv: number;
  dyeingBalance: number; // totalReq - totalRecv
  issuedBody: number;
  issuedRib: number;
  issuedSJ: number;
  totalIssued: number;
  stockBalance: number; // totalRecv - totalIssued
  challans: string;
  deliveryDate: string;
  dyeingFactory: string;
  exFactoryDate: string;
  slot: string;
  merchandiser: string;
  qualityStatus: 'PASS' | 'PENDING' | 'HOLD';
  stockState: 'In Stock' | 'Partly Received' | 'Waiting Dyeing' | 'Fully Issued' | 'Sent to Reuse';
}

export interface JobFabricGroup {
  key: string;
  buyer: string;
  jobNo: string;
  style: string;
  month: string;
  slot: string;
  merchandiser: string;
  dyeingFactory: string;
  fabric: string;
  fabricType: string;
  gsm: string;
  dia: string;
  process: string;
  totalReq: number;
  totalRecv: number;
  totalBalance: number;
  totalIssued: number;
  totalStock: number;
  colorCount: number;
  colors: FabricColorLine[];
  primaryStatus: string;
}

export interface DyeingChallanItem {
  id: string;
  challanNo: string;
  date: string;
  dyeingMill: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabric: string;
  challanBodyKg: number;
  challanRibKg: number;
  weighedBodyKg: number;
  weighedRibKg: number;
  rollCount: number;
  weightDiffKg: number;
  rackLocation: string;
  shadeApproval: 'Approved' | 'Conditional' | 'Pending Lab';
  inspectionStatus: 'PASS' | 'PENDING' | 'HOLD';
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
  cuttingTable: string;
  cuttingLotNo: string;
  bodyKg: number;
  ribKg: number;
  sjKg: number;
  totalKg: number;
  issuedBy: string;
  receivedBy: string;
  remarks: string;
}

export interface LeftoverReturnRecord {
  id: string;
  date: string;
  jobNo: string;
  color: string;
  cuttingLotNo: string;
  returnedKg: number;
  reason: string;
  returnedBy: string;
  rackAssigned: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinishedFabricPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'stock' | 'receive' | 'issue' | 'reuse' | 'location'>('stock');
  const [stockView, setStockView] = useState<'job' | 'color'>('job');
  const [rackLoc, setRackLoc] = useState<RackLocations>({});
  const [locFocus, setLocFocus] = useState<{ sub: 'racks' | 'tracking'; q: string; n: number }>({ sub: 'racks', q: '', n: 0 });

  // Master Data & Loading State
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
  const [selectedSlot, setSelectedSlot] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 35;

  // Drawer / Drilldown state
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobFabricGroup | null>(null);

  // Modals & Action States
  const [receiveModalTarget, setReceiveModalTarget] = useState<FabricColorLine | null>(null);
  const [issueModalTarget, setIssueModalTarget] = useState<FabricColorLine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dyeing Delivery Challans state (local interactive store)
  const [challans, setChallans] = useState<DyeingChallanItem[]>([
    {
      id: 'ch-1',
      challanNo: 'CH-NFL-1721',
      date: '2026-11-04',
      dyeingMill: 'Northern Dyeing Unit-2',
      buyer: 'BS-NMT',
      jobNo: '47658',
      style: '13258646',
      color: 'Light Grey Melange+Victoria Blue',
      fabric: 'S/J 160 GSM 68"',
      challanBodyKg: 117,
      challanRibKg: 12,
      weighedBodyKg: 116.5,
      weighedRibKg: 12,
      rollCount: 7,
      weightDiffKg: -0.5,
      rackLocation: 'F.ST / Rack 14B2',
      shadeApproval: 'Approved',
      inspectionStatus: 'PASS',
      status: 'Accepted',
    },
    {
      id: 'ch-2',
      challanNo: 'CH-PAK-2203',
      date: '2026-11-05',
      dyeingMill: 'Pakiza Dyeing & Printing',
      buyer: 'BS-NMT',
      jobNo: '44025 4th',
      style: '13251205',
      color: 'Dark Sapphire Aop (Discharge Dye)',
      fabric: 'L/Fleece 240 GSM 72"',
      challanBodyKg: 252,
      challanRibKg: 0,
      weighedBodyKg: 250,
      weighedRibKg: 0,
      rollCount: 12,
      weightDiffKg: -2.0,
      rackLocation: 'NCL ST / Bay 3',
      shadeApproval: 'Approved',
      inspectionStatus: 'PASS',
      status: 'Pending Verification',
    },
    {
      id: 'ch-3',
      challanNo: 'CH-DBL-8841',
      date: '2026-11-05',
      dyeingMill: 'DBL Dyeing Complex',
      buyer: 'OVS',
      jobNo: '46880',
      style: '262TSH320-227',
      color: 'White Sand Melange',
      fabric: 'Single Jersey 160 GSM 70"',
      challanBodyKg: 380,
      challanRibKg: 28,
      weighedBodyKg: 377,
      weighedRibKg: 28,
      rollCount: 18,
      weightDiffKg: -3.0,
      rackLocation: 'F.ST / Rack 08A1',
      shadeApproval: 'Approved',
      inspectionStatus: 'PASS',
      status: 'Pending Verification',
    },
    {
      id: 'ch-4',
      challanNo: 'CH-GMS-5109',
      date: '2026-11-05',
      dyeingMill: 'GMS Composite Knitting',
      buyer: 'UTG',
      jobNo: '44278 3rd',
      style: 'BAD2916B',
      color: 'Olive Night',
      fabric: 'Heavy Terry 280 GSM 68"',
      challanBodyKg: 420,
      challanRibKg: 35,
      weighedBodyKg: 418.5,
      weighedRibKg: 35,
      rollCount: 22,
      weightDiffKg: -1.5,
      rackLocation: 'F.ST / Rack 22C4',
      shadeApproval: 'Approved',
      inspectionStatus: 'PASS',
      status: 'Pending Verification',
    },
    {
      id: 'ch-5',
      challanNo: 'CH-NFL-1729',
      date: '2026-11-05',
      dyeingMill: 'Northern Dyeing Unit-1',
      buyer: 'BS-ONS',
      jobNo: '44077 8th',
      style: '22012786',
      color: 'Shark',
      fabric: 'S/J 150 GSM 72"',
      challanBodyKg: 195,
      challanRibKg: 16,
      weighedBodyKg: 195,
      weighedRibKg: 16,
      rollCount: 9,
      weightDiffKg: 0.0,
      rackLocation: 'F.ST / Rack 11A3',
      shadeApproval: 'Approved',
      inspectionStatus: 'PASS',
      status: 'Pending Verification',
    },
  ]);

  // Cutting Issuance Log state
  const [cuttingIssues, setCuttingIssues] = useState<CuttingIssueSlip[]>([
    {
      id: 'ci-1',
      issueNo: 'FI-2026-0811',
      date: '2026-11-04',
      buyer: 'BS-NMT',
      jobNo: '47621',
      style: '13259902',
      color: 'Mauve Shadows',
      cuttingTable: 'Table 02 - Line 04',
      cuttingLotNo: 'CL-2026-0412',
      bodyKg: 57,
      ribKg: 6,
      sjKg: 0,
      totalKg: 63,
      issuedBy: 'Finished Fabric In-charge',
      receivedBy: 'Cutting Floor Supervisor',
      remarks: 'Layup approved, steam shrinkage calibrated',
    },
    {
      id: 'ci-2',
      issueNo: 'FI-2026-0812',
      date: '2026-11-05',
      buyer: 'GT-Miss Selfridge',
      jobNo: '47240 2nd',
      style: '22041920',
      color: 'Off White Melange',
      cuttingTable: 'Table 05 - Line 09',
      cuttingLotNo: 'CL-2026-0418',
      bodyKg: 174,
      ribKg: 18,
      sjKg: 0,
      totalKg: 192,
      issuedBy: 'Finished Fabric In-charge',
      receivedBy: 'Cutting Master Kabir',
      remarks: 'Full lot issued with rib matching',
    },
  ]);

  // Leftover return ledger state
  const [returnLedger, setReturnLedger] = useState<LeftoverReturnRecord[]>([
    {
      id: 'ret-1',
      date: '2026-11-04',
      jobNo: '47621',
      color: 'Mauve Shadows',
      cuttingLotNo: 'CL-2026-0412',
      returnedKg: 4.2,
      reason: 'Leftover end roll after marker lay calibration',
      returnedBy: 'Cutting Table 2',
      rackAssigned: 'F.ST / Leftover Bay B',
    },
  ]);

  // Show toast helper
  // Rack & shelf locations — saved in this browser; first visit gets a seeded layout from current stock
  useEffect(() => {
    if (!rawLines.length) return;
    let stored: RackLocations | null = null;
    try { stored = JSON.parse(localStorage.getItem(RACK_STORE_KEY) || 'null'); } catch { stored = null; }
    if (stored && typeof stored === 'object') setRackLoc(stored);
  }, [rawLines.length > 0]);
  const saveRackLoc = (next: RackLocations, message: string) => {
    setRackLoc(next);
    try { localStorage.setItem(RACK_STORE_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
    showToast(message);
  };
  const lineShelf = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(rackLoc).forEach(([sid, a]) => (m[a.lineId] = sid));
    return m;
  }, [rackLoc]);
  const openLocation = (q: string, sub: 'racks' | 'tracking' = 'tracking') => {
    setLocFocus(f => ({ sub, q, n: f.n + 1 }));
    setActiveTab('location');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --------------------------------------------------------------------------
  // LOAD MASTER DATA FROM API / STATIC DATASET
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
            const reqSJ = Number(item.rs) || 0;
            const totalReq = reqBody + reqRib + reqSJ;

            const recvBody = Number(item.vb) || 0;
            const recvRib = Number(item.vl) || 0;
            const recvSJ = Number(item.vs) || 0;
            const totalRecv = recvBody + recvRib + recvSJ;

            const dyeingBalance = Math.max(0, totalReq - totalRecv);
            const issuedBody = 0; // standard initial
            const issuedRib = 0;
            const issuedSJ = 0;
            const totalIssued = 0;
            const stockBalance = totalRecv - totalIssued;

            let stockState: FabricColorLine['stockState'] = 'In Stock';
            if (totalRecv <= 0) stockState = 'Waiting Dyeing';
            else if (dyeingBalance > totalReq * 0.05 && stockBalance > 0.5) stockState = 'Partly Received';
            else if (stockBalance <= 0) stockState = 'Fully Issued';

            return {
              id: `f-${idx}`,
              idx,
              month: item.m || '2026-06',
              buyer: item.b || 'BS-NMT',
              jobNo: String(item.j || ''),
              style: String(item.st || ''),
              color: String(item.c || 'Single Colorway'),
              fabric: String(item.f || 'S/J'),
              fabricType: parseFabricType(item.f),
              construction: parseConstruction(item.f),
              composition: item.comp || '100% Cotton',
              gsm: String(item.gsm || '160'),
              dia: String(item.dia || '68"'),
              process: String(item.ap || 'Y/D'),
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
              stockBalance,
              challans: String(item.ch || ''),
              deliveryDate: item.ae || '2026-06-15',
              dyeingFactory: item.df || 'Northern Dyeing',
              exFactoryDate: item.tpe || '2026-06-25',
              slot: String(item.sl || '1'),
              merchandiser: item.mr || 'Merchandiser',
              qualityStatus: 'PASS',
              stockState,
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

  // Helper parsers
  function parseFabricType(s: string): string {
    const t = String(s || '').toLowerCase();
    if (/rib/.test(t)) return 'Rib';
    if (/interlock/.test(t)) return 'Interlock';
    if (/fleece/.test(t)) return 'Fleece';
    if (/terry/.test(t)) return 'Terry';
    if (/pique|lacoste/.test(t)) return 'Pique';
    if (/s\s*\/\s*j|single\s*jersey|\bsj\b|jersey/.test(t)) return 'Single Jersey';
    return 'Other Knit';
  }

  function parseConstruction(s: string): string {
    const t = String(s || '').toLowerCase();
    if (/1\s*x\s*1/.test(t)) return '1x1 Rib';
    if (/2\s*x\s*1|2\s*x\s*2/.test(t)) return '2x1 Rib';
    if (/brush|fleece/.test(t)) return 'Brushed back';
    if (/terry|french terry/.test(t)) return 'Loop back Terry';
    if (/y\.?\s*\/?\s*d|stripe/.test(t)) return 'Yarn-dyed Stripe';
    return 'Plain Single';
  }

  // --------------------------------------------------------------------------
  // GROUPING BY BUYER & JOB (MULTI-COLOR ARCHITECTURE)
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
          dyeingFactory: line.dyeingFactory,
          fabric: line.fabric,
          fabricType: line.fabricType,
          gsm: line.gsm,
          dia: line.dia,
          process: line.process,
          totalReq: 0,
          totalRecv: 0,
          totalBalance: 0,
          totalIssued: 0,
          totalStock: 0,
          colorCount: 0,
          colors: [],
          primaryStatus: 'In Stock',
        });
      }

      const group = map.get(key)!;
      if (!group.style && line.style) group.style = line.style;
      group.totalReq += line.totalReq;
      group.totalRecv += line.totalRecv;
      group.totalBalance += line.dyeingBalance;
      group.totalIssued += line.totalIssued;
      group.totalStock += line.stockBalance;
      group.colors.push(line);
      group.colorCount = group.colors.length;
    });

    // Compute primary status per job group
    map.forEach((grp) => {
      if (grp.totalRecv <= 0) grp.primaryStatus = 'Waiting Dyeing';
      else if (grp.totalBalance > grp.totalReq * 0.05 && grp.totalStock > 0) grp.primaryStatus = 'Partly Received';
      else if (grp.totalStock > 0) grp.primaryStatus = 'In Stock';
      else grp.primaryStatus = 'Fully Issued';
    });

    return Array.from(map.values());
  }, [rawLines]);

  // --------------------------------------------------------------------------
  // FILTERING & SEARCH
  // --------------------------------------------------------------------------
  const filteredJobGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return jobGroups.filter((job) => {
      if (selectedBuyer !== 'ALL' && job.buyer !== selectedBuyer) return false;
      if (selectedMonth !== 'ALL' && job.month !== selectedMonth) return false;
      if (selectedStatus !== 'ALL' && job.primaryStatus !== selectedStatus) return false;
      if (selectedFabricType !== 'ALL' && job.fabricType !== selectedFabricType) return false;
      if (selectedSlot !== 'ALL' && job.slot !== selectedSlot) return false;

      if (!q) return true;

      // Match in Job #, Style, Buyer, Merchandiser, or any color name in this job!
      const matchJob = job.jobNo.toLowerCase().includes(q);
      const matchBuyer = job.buyer.toLowerCase().includes(q);
      const matchStyle = job.style.toLowerCase().includes(q);
      const matchColor = job.colors.some((c) => c.color.toLowerCase().includes(q) || c.challans.toLowerCase().includes(q));

      return matchJob || matchBuyer || matchStyle || matchColor;
    });
  }, [jobGroups, searchQuery, selectedBuyer, selectedMonth, selectedStatus, selectedFabricType, selectedSlot]);

  // Distinct Filter Option Lists
  const buyerOptions = useMemo(() => Array.from(new Set(jobGroups.map((j) => j.buyer))).sort(), [jobGroups]);
  const monthOptions = useMemo(() => Array.from(new Set(jobGroups.map((j) => j.month))).sort(), [jobGroups]);
  const fabricTypeOptions = useMemo(() => Array.from(new Set(jobGroups.map((j) => j.fabricType))).sort(), [jobGroups]);

  // Pagination slice
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobGroups.slice(start, start + itemsPerPage);
  }, [filteredJobGroups, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredJobGroups.length / itemsPerPage));

  // Toggle expanded state for a single job
  const toggleJobExpanded = (key: string) => {
    setExpandedJobs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle all jobs expanded
  const toggleAllExpanded = () => {
    const nextState = !showAllColors;
    setShowAllColors(nextState);
    const updated: Record<string, boolean> = {};
    if (nextState) {
      paginatedGroups.forEach((g) => {
        updated[g.key] = true;
      });
    }
    setExpandedJobs(updated);
  };

  // --------------------------------------------------------------------------
  // EXECUTIVE KPIS & SUMMARY TOTALS
  // --------------------------------------------------------------------------
  const summaryKpis = useMemo(() => {
    const totalJobs = jobGroups.length;
    const totalColorways = rawLines.length;

    let totalReqKg = 0;
    let totalRecvKg = 0;
    let totalBalKg = 0;
    let totalStockKg = 0;
    let totalIssuedKg = 0;

    rawLines.forEach((l) => {
      totalReqKg += l.totalReq;
      totalRecvKg += l.totalRecv;
      totalBalKg += l.dyeingBalance;
      totalStockKg += l.stockBalance;
      totalIssuedKg += l.totalIssued;
    });

    const deliveryPercent = totalReqKg > 0 ? ((totalRecvKg / totalReqKg) * 100).toFixed(1) : '0';
    const pendingChallansCount = challans.filter((c) => c.status === 'Pending Verification').length;

    return {
      totalJobs,
      totalColorways,
      totalReqTons: (totalReqKg / 1000).toFixed(1),
      totalRecvTons: (totalRecvKg / 1000).toFixed(1),
      totalBalTons: (totalBalKg / 1000).toFixed(1),
      totalStockTons: (totalStockKg / 1000).toFixed(1),
      totalIssuedTons: (totalIssuedKg / 1000).toFixed(1),
      deliveryPercent,
      pendingChallansCount,
    };
  }, [jobGroups, rawLines, challans]);

  // --------------------------------------------------------------------------
  // 4 DASHBOARD CHARTS DATA (FULL WIDTH - ZERO BLANK SPACE)
  // --------------------------------------------------------------------------

  // Chart 1: Top Buyers Received vs Dyeing Balance (Tons)
  const buyerChartData = useMemo(() => {
    const map: Record<string, { received: number; balance: number }> = {};

    rawLines.forEach((l) => {
      const b = l.buyer;
      if (!map[b]) map[b] = { received: 0, balance: 0 };
      map[b].received += l.totalRecv;
      map[b].balance += l.dyeingBalance;
    });

    return Object.entries(map)
      .sort((a, b) => b[1].received + b[1].balance - (a[1].received + a[1].balance))
      .slice(0, 6)
      .map(([buyer, vals]) => ({
        buyer: buyer.length > 10 ? buyer.slice(0, 9) + '…' : buyer,
        fullName: buyer,
        received: Math.round(vals.received / 1000),
        balance: Math.round(vals.balance / 1000),
      }));
  }, [rawLines]);

  // Chart 2: Monthly Demand vs Actual Delivered (Tons)
  const monthChartData = useMemo(() => {
    const map: Record<string, { required: number; received: number }> = {};

    rawLines.forEach((l) => {
      const m = l.month || '2026-06';
      if (!map[m]) map[m] = { required: 0, received: 0 };
      map[m].required += l.totalReq;
      map[m].received += l.totalRecv;
    });

    return Object.keys(map)
      .sort()
      .slice(0, 6)
      .map((m) => {
        const short = m.slice(5) + "'" + m.slice(2, 4);
        return {
          month: short,
          fullMonth: m,
          required: Math.round(map[m].required / 1000),
          received: Math.round(map[m].received / 1000),
        };
      });
  }, [rawLines]);

  // Chart 3: Garment Part Breakdown (Body vs Lycra Rib vs Collar/Cuff/SJ)
  const partChartData = useMemo(() => {
    let body = 0;
    let rib = 0;
    let sj = 0;

    rawLines.forEach((l) => {
      body += l.recvBody;
      rib += l.recvRib;
      sj += l.recvSJ;
    });

    return [
      { part: 'Body Knit', tons: Math.round(body / 1000), share: '92.4%' },
      { part: '1x1 L.Rib', tons: Math.round(rib / 1000), share: '5.8%' },
      { part: 'S.Jersey / Trim', tons: Math.round(sj / 1000), share: '1.8%' },
    ];
  }, [rawLines]);

  // Chart 4: Shade Quality & 4-Point Inspection Status
  const qualityChartData = useMemo(() => {
    return [
      { status: 'Shade Pass', tons: 1240, color: '#10B981' },
      { status: '4-Pt Passed', tons: 1195, color: '#0284C7' },
      { status: 'Lab Audit', tons: 34, color: '#F59E0B' },
      { status: 'Quality Hold', tons: 12, color: '#EF4444' },
    ];
  }, []);

  // --------------------------------------------------------------------------
  // ACTIONS: RECEIVE CHALLAN MODAL HANDLER
  // --------------------------------------------------------------------------
  const [receiveForm, setReceiveForm] = useState({
    challanNo: '',
    date: new Date().toISOString().slice(0, 10),
    mill: 'Northern Dyeing Unit-2',
    bodyKg: '',
    ribKg: '',
    sjKg: '',
    weighedScaleKg: '',
    rollCount: '6',
    rackLoc: 'F.ST / Rack 14B2',
  });

  const [recvPick, setRecvPick] = useState<LocationPick>(emptyPick());
  const [verifyTarget, setVerifyTarget] = useState<DyeingChallanItem | null>(null);
  const [verifyPick, setVerifyPick] = useState<LocationPick>(emptyPick());
  const lineNameById = (id: string) => { const l = rawLines.find(x => x.id === id); return l ? `${l.jobNo} ${l.color}` : ''; };

  const handleOpenReceive = (colorLine: FabricColorLine) => {
    setReceiveModalTarget(colorLine);
    setRecvPick(emptyPick());
    setReceiveForm({
      challanNo: `CH-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      mill: colorLine.dyeingFactory || 'Northern Dyeing',
      bodyKg: String(Math.round(colorLine.dyeingBalance > 0 ? colorLine.dyeingBalance * 0.9 : 100)),
      ribKg: String(colorLine.reqRib > 0 ? Math.round(colorLine.reqRib) : 0),
      sjKg: '0',
      weighedScaleKg: String(Math.round(colorLine.dyeingBalance > 0 ? colorLine.dyeingBalance * 0.9 : 100)),
      rollCount: '6',
      rackLoc: 'F.ST / Rack 15B1',
    });
  };

  const handleConfirmReceive = () => {
    if (!receiveModalTarget) return;
    if (!pickIsValid(recvPick, rackLoc)) { showToast('Choose the rack & shelf (or write the other place) where this fabric is kept'); return; }

    const bKg = Number(receiveForm.bodyKg) || 0;
    const rKg = Number(receiveForm.ribKg) || 0;
    const weighed = Number(receiveForm.weighedScaleKg) || bKg + rKg;
    const diff = weighed - (bKg + rKg);

    const newChallan: DyeingChallanItem = {
      id: `ch-${Date.now()}`,
      challanNo: receiveForm.challanNo,
      date: receiveForm.date,
      dyeingMill: receiveForm.mill,
      buyer: receiveModalTarget.buyer,
      jobNo: receiveModalTarget.jobNo,
      style: receiveModalTarget.style,
      color: receiveModalTarget.color,
      fabric: `${receiveModalTarget.fabric} ${receiveModalTarget.gsm} GSM`,
      challanBodyKg: bKg,
      challanRibKg: rKg,
      weighedBodyKg: bKg + diff,
      weighedRibKg: rKg,
      rollCount: Number(receiveForm.rollCount) || 1,
      weightDiffKg: Number(diff.toFixed(1)),
      rackLocation: pickLabel(recvPick),
      shadeApproval: 'Approved',
      inspectionStatus: 'PASS',
      status: 'Accepted',
    };

    setChallans([newChallan, ...challans]);

    // Update raw lines state
    setRawLines((prev) =>
      prev.map((item) => {
        if (item.id === receiveModalTarget.id) {
          const updatedRecv = item.totalRecv + bKg + rKg;
          const updatedBal = Math.max(0, item.totalReq - updatedRecv);
          const updatedStock = item.stockBalance + bKg + rKg;
          return {
            ...item,
            recvBody: item.recvBody + bKg,
            recvRib: item.recvRib + rKg,
            totalRecv: updatedRecv,
            dyeingBalance: updatedBal,
            stockBalance: updatedStock,
            stockState: updatedStock > 0 ? 'In Stock' : item.stockState,
          };
        }
        return item;
      })
    );

    saveRackLoc(assignLocation(rackLoc, receiveModalTarget.id, recvPick, receiveForm.date), `Challan ${receiveForm.challanNo} accepted · ${bKg + rKg} kg · kept at ${pickLabel(recvPick)}`);
    setReceiveModalTarget(null);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: ISSUE TO CUTTING MODAL & FORM HANDLER
  // --------------------------------------------------------------------------
  const [issueForm, setIssueForm] = useState({
    tableNo: 'Table 03 - Line 06',
    cuttingLotNo: `CL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    bodyKg: '',
    ribKg: '',
    sjKg: '',
    issuedBy: 'Finished Fabric In-charge',
    receivedBy: 'Cutting Master',
    remarks: 'Pre-calibrated lay length',
  });

  const handleOpenIssue = (colorLine: FabricColorLine) => {
    setIssueModalTarget(colorLine);
    const maxBody = Math.min(colorLine.stockBalance, colorLine.recvBody || colorLine.stockBalance);
    const maxRib = Math.min(colorLine.recvRib, 20);
    setIssueForm({
      tableNo: 'Table 02 - Line 04',
      cuttingLotNo: `CL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      bodyKg: String(Math.round(maxBody * 0.8 || colorLine.stockBalance)),
      ribKg: String(Math.round(maxRib)),
      sjKg: '0',
      issuedBy: 'Finished Fabric In-charge',
      receivedBy: 'Cutting Master',
      remarks: 'Layup approved, 100% shade inspected',
    });
  };

  const handleConfirmIssue = () => {
    if (!issueModalTarget) return;

    const bKg = Number(issueForm.bodyKg) || 0;
    const rKg = Number(issueForm.ribKg) || 0;
    const totalIssueKg = bKg + rKg;

    if (totalIssueKg <= 0) {
      alert('Please enter a valid issue quantity.');
      return;
    }

    if (totalIssueKg > issueModalTarget.stockBalance) {
      alert(`Cannot issue ${totalIssueKg} kg. Only ${issueModalTarget.stockBalance} kg available in store stock!`);
      return;
    }

    const newIssueSlip: CuttingIssueSlip = {
      id: `ci-${Date.now()}`,
      issueNo: `FI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().slice(0, 10),
      buyer: issueModalTarget.buyer,
      jobNo: issueModalTarget.jobNo,
      style: issueModalTarget.style,
      color: issueModalTarget.color,
      cuttingTable: issueForm.tableNo,
      cuttingLotNo: issueForm.cuttingLotNo,
      bodyKg: bKg,
      ribKg: rKg,
      sjKg: 0,
      totalKg: totalIssueKg,
      issuedBy: issueForm.issuedBy,
      receivedBy: issueForm.receivedBy,
      remarks: issueForm.remarks,
    };

    setCuttingIssues([newIssueSlip, ...cuttingIssues]);

    // Update raw lines state
    setRawLines((prev) =>
      prev.map((item) => {
        if (item.id === issueModalTarget.id) {
          const updatedStock = Math.max(0, item.stockBalance - totalIssueKg);
          const updatedIssued = item.totalIssued + totalIssueKg;
          return {
            ...item,
            issuedBody: item.issuedBody + bKg,
            issuedRib: item.issuedRib + rKg,
            totalIssued: updatedIssued,
            stockBalance: updatedStock,
            stockState: updatedStock <= 0 ? 'Fully Issued' : item.stockState,
          };
        }
        return item;
      })
    );

    showToast(`Issued ${totalIssueKg} kg to Cutting Floor (${issueForm.tableNo})! Issue Slip: ${newIssueSlip.issueNo}`);
    setIssueModalTarget(null);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: CUTTING LEFTOVER RETURN
  // --------------------------------------------------------------------------
  const [returnForm, setReturnForm] = useState({
    jobNo: '',
    color: '',
    cuttingLotNo: '',
    returnedKg: '',
    reason: 'Leftover end bits after marker lay',
    returnedBy: 'Cutting Floor Table 03',
    rackLoc: 'F.ST / Return Bay A',
  });

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const retKg = Number(returnForm.returnedKg) || 0;
    if (retKg <= 0 || !returnForm.jobNo) {
      alert('Please fill out the Job No and valid Returned Kg.');
      return;
    }

    const newRet: LeftoverReturnRecord = {
      id: `ret-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      jobNo: returnForm.jobNo,
      color: returnForm.color || 'Mixed Color',
      cuttingLotNo: returnForm.cuttingLotNo || 'CL-2026-RET',
      returnedKg: retKg,
      reason: returnForm.reason,
      returnedBy: returnForm.returnedBy,
      rackAssigned: returnForm.rackLoc,
    };

    setReturnLedger([newRet, ...returnLedger]);

    // Add back to first matching line or stock
    setRawLines((prev) =>
      prev.map((item) => {
        if (item.jobNo === returnForm.jobNo) {
          return {
            ...item,
            stockBalance: item.stockBalance + retKg,
          };
        }
        return item;
      })
    );

    showToast(`Successfully returned ${retKg} kg back to finished fabric stock.`);
    setReturnForm({
      jobNo: '',
      color: '',
      cuttingLotNo: '',
      returnedKg: '',
      reason: 'Leftover end bits after marker lay',
      returnedBy: 'Cutting Floor Table 03',
      rackLoc: 'F.ST / Return Bay A',
    });
  };

  // --------------------------------------------------------------------------
  // EXPORT TO CSV
  // --------------------------------------------------------------------------
  const handleExportCSV = () => {
    const headers = [
      'Buyer',
      'Job No',
      'Style',
      'Month',
      'Slot',
      'Colourway',
      'Fabric Type',
      'Construction',
      'GSM',
      'Dia',
      'Process',
      'Req Body Kg',
      'Req Rib Kg',
      'Total Req Kg',
      'Recv Body Kg',
      'Recv Rib Kg',
      'Total Recv Kg',
      'Dyeing Balance Kg (Still to come)',
      'Issued to Cutting Kg',
      'Store Stock Balance Kg',
      'Status',
      'Dyeing Factory',
      'Challan',
    ];

    const rows: string[][] = [];

    filteredJobGroups.forEach((job) => {
      job.colors.forEach((c) => {
        rows.push([
          job.buyer,
          job.jobNo,
          job.style,
          job.month,
          job.slot,
          `"${c.color.replace(/"/g, '""')}"`,
          c.fabricType,
          c.construction,
          c.gsm,
          `"${c.dia}"`,
          `"${c.process}"`,
          String(c.reqBody),
          String(c.reqRib),
          String(c.totalReq),
          String(c.recvBody),
          String(c.recvRib),
          String(c.totalRecv),
          String(c.dyeingBalance),
          String(c.totalIssued),
          String(c.stockBalance),
          c.stockState,
          c.dyeingFactory,
          `"${c.challans}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NFL_Finished_Fabric_Store_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Finished Fabric Report successfully downloaded as CSV.');
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------
  return (
    <Shell
      title="Finished Fabric Store"
      eyebrow="Quality Clearance Verification, Roll Stock, Shade Lots & Cutting Issue"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS & SUB-TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-200 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'stock'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-400" />
            Finished Stock
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'stock' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {jobGroups.length.toLocaleString()} jobs
            </span>
          </button>

          <button
            onClick={() => setActiveTab('receive')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'receive'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-4 h-4 text-sky-400" />
            Receive from Dyeing
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'receive' ? 'bg-slate-800 text-sky-300' : 'bg-amber-100 text-amber-800 font-bold'
              }`}
            >
              {summaryKpis.pendingChallansCount} Pending
            </span>
          </button>

          <button
            onClick={() => setActiveTab('issue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'issue'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Scissors className="w-4 h-4 text-purple-400" />
            Issue to Cutting
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'issue' ? 'bg-slate-800 text-purple-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Floor Ready
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reuse')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'reuse'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Leftover & Reuse Fabric
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'reuse' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {returnLedger.length} Rolls
            </span>
          </button>

          <button
            onClick={() => openLocation('', 'racks')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'location'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4 text-sky-500" />
            Rack & Location
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'location' ? 'bg-slate-800 text-sky-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {Object.keys(rackLoc).filter(isShelfKey).length}/180 Shelves
            </span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Report
          </button>
          <button
            onClick={() => {
              if (rawLines[0]) handleOpenReceive(rawLines[0]);
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Dyeing Receipt
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ROW 1: EXECUTIVE KPI SUMMARY CARDS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {/* Card 1: Requirement */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Requirement</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {summaryKpis.totalReqTons} <span className="text-xs font-bold text-slate-500">Tons</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center justify-between">
            <span>{summaryKpis.totalJobs.toLocaleString()} Master Jobs</span>
            <span className="text-blue-600 font-semibold">{summaryKpis.totalColorways} Colors</span>
          </div>
        </div>

        {/* Card 2: Received */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Received from Dyeing</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 tracking-tight">
            {summaryKpis.totalRecvTons} <span className="text-xs font-bold text-emerald-600">Tons</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-between">
            <span>Delivered & Weighed</span>
            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">
              {summaryKpis.deliveryPercent}%
            </span>
          </div>
        </div>

        {/* Card 3: Dyeing Balance (Still to come) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Still to Come (Balance)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 tracking-tight">
            {summaryKpis.totalBalTons} <span className="text-xs font-bold text-amber-600">Tons</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center justify-between">
            <span>Dyeing Pipeline Bal</span>
            <span className="bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-bold">Pending Mills</span>
          </div>
        </div>

        {/* Card 4: Store Stock in Hand */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>In-Store Stock Balance</span>
            <Warehouse className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-sky-700 tracking-tight">
            {summaryKpis.totalStockTons} <span className="text-xs font-bold text-sky-600">Tons</span>
          </div>
          <div className="text-[11px] text-sky-600 font-medium mt-1 flex items-center justify-between">
            <span>Ready for Cutting</span>
            <span className="bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded font-bold">Active Godown</span>
          </div>
        </div>

        {/* Card 5: Issued to Cutting */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Issued to Cutting Floor</span>
            <Scissors className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-700 tracking-tight">
            {summaryKpis.totalIssuedTons} <span className="text-xs font-bold text-purple-600">Tons</span>
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-1 flex items-center justify-between">
            <span>Delivered to Tables</span>
            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-bold">In Cutting</span>
          </div>
        </div>

        {/* Card 6: Shade Quality Clearance */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Quality & Shade Clearance</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-teal-700 tracking-tight">
            98.4% <span className="text-xs font-bold text-teal-600">Pass</span>
          </div>
          <div className="text-[11px] text-teal-700 font-medium mt-1 flex items-center justify-between">
            <span>4-Point & Lab Approved</span>
            <span className="bg-teal-50 text-teal-800 px-1.5 py-0.2 rounded font-bold">AQL 1.5</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ROW 2: 4 STANDARDIZED EXECUTIVE CHARTS (FULL WIDTH - ZERO BLANK SPACE) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* CHART 1: Top Buyers: Received vs Dyeing Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Top Buyers: Received vs Balance
              </h4>
              <p className="text-[10px] text-slate-500">Delivered (Tons) vs still to come from mills</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Tons</span>
          </div>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buyerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="buyer" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  formatter={(val: any, name: any) => [`${val} Tons`, name === 'received' ? 'Received from Dyeing' : 'Still to Come (Balance)']}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="received" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={28} />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="balance" stackId="a" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Received
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> Still to Come (Balance)
            </span>
          </div>
        </div>

        {/* CHART 2: Monthly Demand vs Actual Delivery Run-Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Month-Wise Required vs Received
              </h4>
              <p className="text-[10px] text-slate-500">Total requirement demand vs factory intake</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Tons</span>
          </div>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(2, 132, 199, 0.05)' }}
                  contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  formatter={(val: any, name: any) => [`${val} Tons`, name === 'required' ? 'Required Demand' : 'Delivered to Store']}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="required" fill="#0F274E" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="received" fill="#0284C7" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-slate-900 rounded-sm"></span> Required
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-sky-600 rounded-sm"></span> Received
            </span>
          </div>
        </div>

        {/* CHART 3: Garment Part Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Fabric Received by Garment Part
              </h4>
              <p className="text-[10px] text-slate-500">Body Fabric, 1x1 Lycra Rib & S.Jersey binding</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Tons</span>
          </div>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="part" tick={{ fill: '#1E293B', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(147, 51, 234, 0.05)' }}
                  contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  formatter={(val: any) => [`${val} Tons`, 'Received Volume']}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="tons" fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2 px-1">
            <span>Body: 92.4%</span>
            <span>1x1 Rib: 5.8%</span>
            <span>S.Jersey: 1.8%</span>
          </div>
        </div>

        {/* CHART 4: Shade Clearance & Quality Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                Shade Lot & Quality Clearance
              </h4>
              <p className="text-[10px] text-slate-500">4-Point inspection & laboratory approval</p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">98.4% Pass</span>
          </div>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="status" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(13, 148, 136, 0.05)' }}
                  contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  formatter={(val: any) => [`${val} Tons`, 'Audited Volume']}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="tons" fill="#0D9488" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-bold">● Pass: 1,240 T</span>
            <span className="text-amber-700 font-bold">● Lab Audit: 34 T</span>
            <span className="text-rose-700 font-bold">● Hold: 12 T</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: FINISHED STOCK MASTER REGISTER (FROZEN HEADER & MULTI-COLOR) */}
      {/* ===================================================================== */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 mb-8">
          {/* FILTER BAR & SEARCH CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Job #, Style, Colourway..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Buyer Filter */}
              <select
                value={selectedBuyer}
                onChange={(e) => {
                  setSelectedBuyer(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Buyers ({buyerOptions.length})</option>
                {buyerOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Month Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Delivery Months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Partly Received">Partly Received (Pending Balance)</option>
                <option value="Waiting Dyeing">Waiting Dyeing</option>
                <option value="Fully Issued">Fully Issued</option>
              </select>

              {/* Fabric Type Filter */}
              <select
                value={selectedFabricType}
                onChange={(e) => {
                  setSelectedFabricType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Fabric Types</option>
                {fabricTypeOptions.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(searchQuery || selectedBuyer !== 'ALL' || selectedMonth !== 'ALL' || selectedStatus !== 'ALL' || selectedFabricType !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBuyer('ALL');
                    setSelectedMonth('ALL');
                    setSelectedStatus('ALL');
                    setSelectedFabricType('ALL');
                    setSelectedSlot('ALL');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Toggle All Colors Button & Record Count */}
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden" role="tablist" aria-label="Table view">
                <button
                  onClick={() => setStockView('job')}
                  className={`px-3 py-1.5 text-xs font-bold ${stockView === 'job' ? 'nos-tab-on' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
                >
                  Job-wise view
                </button>
                <button
                  onClick={() => setStockView('color')}
                  className={`px-3 py-1.5 text-xs font-bold border-l border-slate-300 ${stockView === 'color' ? 'nos-tab-on' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
                >
                  Color-wise view
                </button>
              </div>
              {stockView === 'job' && (
              <button
                onClick={toggleAllExpanded}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                {showAllColors ? 'Collapse Color Breakdown' : 'Expand All Colorways'}
              </button>
              )}
              <span className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-900">{filteredJobGroups.length.toLocaleString()}</strong> jobs (
                {rawLines.length.toLocaleString()} colorways)
              </span>
            </div>
          </div>

          {/* MASTER DATA TABLE CONTAINER (STICKY HEADER + FROZEN BUYER-JOB COLUMN) */}
          <div className="overflow-auto max-h-[580px] rounded-lg border border-slate-200 bg-white shadow-xs relative">
            <table className="w-full text-left text-xs border-collapse">
              {/* STICKY THEAD - FROZEN AT TOP WHILE SCROLLING */}
              <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-md">
                {/* Tier 1 Header */}
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                  <th colSpan={3} className="sticky left-0 z-30 bg-slate-950 px-3 py-2 text-left font-bold border-r border-slate-800">
                    Order Identification & Style
                  </th>
                  <th colSpan={3} className="px-3 py-2 text-center font-bold border-r border-slate-800">
                    Fabric Specs
                  </th>
                  <th colSpan={4} className="px-3 py-2 text-center font-bold border-r border-slate-800 bg-blue-950/70 text-blue-200">
                    Dyeing Pipeline (Kg)
                  </th>
                  <th colSpan={2} className="px-3 py-2 text-center font-bold border-r border-slate-800 bg-emerald-950/70 text-emerald-200">
                    Store Stock (Kg)
                  </th>
                  <th colSpan={2} className="px-3 py-2 text-center font-bold">
                    Floor Actions
                  </th>
                </tr>

                {/* Tier 2 Header */}
                <tr className="bg-slate-900 text-slate-200 border-b border-slate-700 text-[11px]">
                  {/* Sticky left Buyer-Job column */}
                  <th className="sticky left-0 z-30 bg-slate-900 px-3 py-2.5 font-bold border-r border-slate-700 min-w-[150px]">
                    Buyer - Job No
                  </th>
                  <th className="px-3 py-2.5 font-semibold min-w-[110px]">Style No</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[180px]">Colorways & Shades</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[120px]">Fabric Type</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[65px]">GSM</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[55px]">Dia</th>

                  {/* Dyeing Pipeline Columns */}
                  <th className="px-3 py-2.5 font-semibold text-right min-w-[85px] bg-blue-900/40 text-blue-100">
                    Total Req
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-right min-w-[85px] bg-blue-900/40 text-blue-100">
                    Received
                  </th>
                  <th className="px-3 py-2.5 font-bold text-right min-w-[110px] bg-amber-900/60 text-amber-200">
                    Dyeing Bal (Still to come)
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-right min-w-[75px] bg-blue-900/40 text-blue-100">
                    Delivered %
                  </th>

                  {/* Stock & Issue Columns */}
                  <th className="px-3 py-2.5 font-semibold text-right min-w-[85px] bg-emerald-900/40 text-emerald-100">
                    Issued Cut
                  </th>
                  <th className="px-3 py-2.5 font-bold text-right min-w-[100px] bg-emerald-900/60 text-emerald-200">
                    In Stock Bal
                  </th>

                  {/* Status & Actions */}
                  <th className="px-3 py-2.5 font-semibold text-center min-w-[110px]">Stock Status</th>
                  <th className="px-3 py-2.5 font-semibold text-center min-w-[130px]">Color Actions</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-slate-100 text-[11.5px]">
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading master finished fabric data...
                    </td>
                  </tr>
                ) : paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      No matching jobs found with the applied filters.
                    </td>
                  </tr>
                ) : stockView === 'color' ? (
                  paginatedGroups.flatMap((job) =>
                    job.colors.map((c) => {
                      const sid = lineShelf[c.id];
                      const pct = c.totalReq > 0 ? Math.round((c.totalRecv / c.totalReq) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-r border-slate-200">
                            <span className="text-[11px] text-slate-600 block font-semibold leading-none">{job.buyer}</span>
                            <span className="font-bold text-slate-900">{job.jobNo}</span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{job.style || '—'}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{c.color}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{c.fabric} ({c.construction})</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{c.gsm}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{c.dia}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{Math.round(c.totalReq).toLocaleString()} kg</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-800">{Math.round(c.totalRecv).toLocaleString()} kg</td>
                          <td className="px-3 py-2.5 text-right font-semibold">
                            {c.dyeingBalance > 0.5 ? (
                              <span className="text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">{Math.round(c.dyeingBalance).toLocaleString()} kg</span>
                            ) : (
                              <span className="text-emerald-800">0 kg</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{pct}%</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-purple-800">{Math.round(c.totalIssued).toLocaleString()} kg</td>
                          <td className="px-3 py-2.5 text-right font-bold text-sky-800">{Math.round(c.stockBalance).toLocaleString()} kg</td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-800 font-semibold">{c.stockState}</span>
                              {sid ? (
                                <button onClick={() => openLocation(job.jobNo, isShelfKey(sid) ? 'racks' : 'tracking')} className="text-[11px] px-1.5 py-0.5 rounded border border-sky-300 bg-sky-50 text-sky-900 font-bold inline-flex items-center gap-1" title="Show on rack">
                                  <MapPin className="w-3 h-3" /> {locLabel(sid, rackLoc)}
                                </button>
                              ) : c.stockBalance > 0.5 ? (
                                <button onClick={() => openLocation(job.jobNo, 'tracking')} className="text-[11px] px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 font-bold" title="Enter the location">
                                  Location not entered
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handleOpenReceive(c)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Receive
                              </button>
                              <button
                                onClick={() => handleOpenIssue(c)}
                                disabled={c.stockBalance <= 0}
                                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 ${c.stockBalance > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-200 text-slate-600 cursor-not-allowed'}`}
                              >
                                <Scissors className="w-3 h-3" /> Issue
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  paginatedGroups.map((job) => {
                    const isExpanded = expandedJobs[job.key] || showAllColors;
                    const percentDelivered = job.totalReq > 0 ? Math.round((job.totalRecv / job.totalReq) * 100) : 0;
                    const hasBalance = job.totalBalance > 0.5;

                    return (
                      <React.Fragment key={job.key}>
                        {/* -------------------------------------------------- */}
                        {/* MASTER JOB SUMMARY ROW */}
                        {/* -------------------------------------------------- */}
                        <tr
                          className={`hover:bg-slate-50 transition-colors ${
                            isExpanded ? 'bg-slate-50/80 font-medium' : ''
                          }`}
                        >
                          {/* Sticky left Buyer-Job column */}
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-2.5 font-bold text-slate-900 border-r border-slate-200 shadow-xs">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleJobExpanded(job.key)}
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 transition-colors shrink-0"
                                title={isExpanded ? 'Hide colours' : `Show ${job.colorCount} colours`}
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-normal leading-none">{job.buyer}</span>
                                <span className="font-bold text-slate-900">{job.jobNo}</span>
                              </div>
                            </div>
                          </td>

                          {/* Style */}
                          <td className="px-3 py-2.5 text-slate-700 font-semibold">{job.style || '—'}</td>

                          {/* Colors Summary Badge */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {job.colorCount} {job.colorCount === 1 ? 'Color' : 'Colors'}
                              </span>
                              <span className="text-slate-600 truncate max-w-[140px]" title={job.colors.map((c) => c.color).join(', ')}>
                                {job.colors.map((c) => c.color).slice(0, 2).join(', ')}
                                {job.colorCount > 2 ? ` +${job.colorCount - 2}` : ''}
                              </span>
                            </div>
                          </td>

                          {/* Fabric Type */}
                          <td className="px-3 py-2.5 text-slate-700">{job.fabricType}</td>

                          {/* GSM */}
                          <td className="px-3 py-2.5 text-slate-600">{job.gsm || '—'}</td>

                          {/* Dia */}
                          <td className="px-3 py-2.5 text-slate-600">{job.dia || '—'}</td>

                          {/* Total Req */}
                          <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                            {Math.round(job.totalReq).toLocaleString()} kg
                          </td>

                          {/* Received */}
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                            {Math.round(job.totalRecv).toLocaleString()} kg
                          </td>

                          {/* Dyeing Balance (Still to come) */}
                          <td className="px-3 py-2.5 text-right font-bold">
                            {hasBalance ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-black">
                                {Math.round(job.totalBalance).toLocaleString()} kg
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold text-[11px]">0 kg (Complete)</span>
                            )}
                          </td>

                          {/* Delivered % */}
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-600">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                percentDelivered >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : percentDelivered >= 75
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {percentDelivered}%
                            </span>
                          </td>

                          {/* Issued to Cutting */}
                          <td className="px-3 py-2.5 text-right text-purple-700 font-semibold">
                            {Math.round(job.totalIssued).toLocaleString()} kg
                          </td>

                          {/* Store Stock Balance */}
                          <td className="px-3 py-2.5 text-right font-black text-slate-900">
                            <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              {Math.round(job.totalStock).toLocaleString()} kg
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                job.primaryStatus === 'In Stock'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : job.primaryStatus === 'Partly Received'
                                  ? 'bg-amber-100 text-amber-800'
                                  : job.primaryStatus === 'Fully Issued'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {job.primaryStatus}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => toggleJobExpanded(job.key)}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                              >
                                {isExpanded ? 'Hide Colors' : `View ${job.colorCount} Colors`}
                              </button>
                              <button
                                onClick={() => setSelectedJobDetail(job)}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                                title="Open Job 360 Fabric Ledger"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* -------------------------------------------------- */}
                        {/* EXPANDED COLOR BREAKDOWN ROWS (MULTI-COLOR ENGINE) */}
                        {/* -------------------------------------------------- */}
                        {isExpanded &&
                          job.colors.map((c, cIdx) => (
                            <tr
                              key={c.id}
                              className="bg-indigo-50/30 hover:bg-indigo-50/60 text-[11px] transition-colors border-l-4 border-indigo-500"
                            >
                              {/* Sticky left indicator */}
                              <td className="sticky left-0 z-10 bg-indigo-50/80 px-3 py-2 border-r border-slate-200 text-slate-500 pl-7 text-[10px]">
                                └ Color #{cIdx + 1}
                              </td>

                              <td className="px-3 py-2 text-slate-500 text-[10px] font-medium">
                                {c.process || 'Solid Dye'}
                              </td>

                              {/* PROMINENT COLORWAY NAME & SWATCH */}
                              <td className="px-3 py-2 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-slate-700 border border-white shadow-xs shrink-0"></span>
                                  <span className="text-slate-900 font-bold tracking-tight">{c.color}</span>
                                </div>
                              </td>

                              <td className="px-3 py-2 text-slate-600">
                                {c.fabric} ({c.construction})
                              </td>

                              <td className="px-3 py-2 text-slate-600">{c.gsm}</td>
                              <td className="px-3 py-2 text-slate-600">{c.dia}</td>

                              {/* Color Req */}
                              <td className="px-3 py-2 text-right text-slate-700">
                                {Math.round(c.totalReq).toLocaleString()} kg
                              </td>

                              {/* Color Received */}
                              <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                {Math.round(c.totalRecv).toLocaleString()} kg
                              </td>

                              {/* Color Dyeing Balance (Still to come) */}
                              <td className="px-3 py-2 text-right font-bold">
                                {c.dyeingBalance > 0.5 ? (
                                  <span className="text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded text-[10px]">
                                    {Math.round(c.dyeingBalance).toLocaleString()} kg
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 text-[10px]">0 kg (Complete)</span>
                                )}
                              </td>

                              <td className="px-3 py-2 text-right text-slate-500 text-[10px]">
                                {c.totalReq > 0 ? Math.round((c.totalRecv / c.totalReq) * 100) : 0}%
                              </td>

                              {/* Color Issued */}
                              <td className="px-3 py-2 text-right text-purple-700">
                                {Math.round(c.totalIssued).toLocaleString()} kg
                              </td>

                              {/* Color Stock Balance */}
                              <td className="px-3 py-2 text-right font-bold text-sky-800">
                                {Math.round(c.stockBalance).toLocaleString()} kg
                              </td>

                              {/* Color Status */}
                              <td className="px-3 py-2 text-center">
                                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
                                  {c.stockState}
                                </span>
                                {lineShelf[c.id] && (
                                  <button onClick={() => openLocation(job.jobNo, 'racks')} className="block mx-auto mt-1 text-[11px] px-1.5 py-0.5 rounded border border-sky-300 bg-sky-50 text-sky-900 font-bold" title="Show on rack">
                                    {locLabel(lineShelf[c.id], rackLoc)}
                                  </button>
                                )}
                              </td>

                              {/* Color Direct Actions: Receive / Issue */}
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenReceive(c)}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs transition-colors flex items-center gap-1"
                                    title={`Receive Dyeing Challan for ${c.color}`}
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    Receive
                                  </button>
                                  <button
                                    onClick={() => handleOpenIssue(c)}
                                    disabled={c.stockBalance <= 0}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors flex items-center gap-1 ${
                                      c.stockBalance > 0
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                    title={c.stockBalance > 0 ? `Issue ${c.color} to Cutting` : 'No Stock Available'}
                                  >
                                    <Scissors className="w-2.5 h-2.5" />
                                    Issue
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER & PAGINATION */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <div>
              Showing Page <strong className="text-slate-900">{currentPage}</strong> of{' '}
              <strong className="text-slate-900">{totalPages}</strong> (
              {((currentPage - 1) * itemsPerPage + 1).toLocaleString()} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredJobGroups.length).toLocaleString()} of{' '}
              {filteredJobGroups.length.toLocaleString()} total jobs)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-slate-900 text-white font-bold rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: RECEIVE FROM DYEING (CHALLAN RECEIVING & WEIGHING) */}
      {/* ===================================================================== */}
      {activeTab === 'receive' && (
        <div className="space-y-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-600" />
                  Dyeing Delivery Challans Verification & Inward Gate Register
                </h3>
                <p className="text-xs text-slate-500">
                  Verify scale weight vs mill delivery challan, shade clearance & bin rack assignment
                </p>
              </div>
              <button
                onClick={() => {
                  if (rawLines[0]) handleOpenReceive(rawLines[0]);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Receive New Dyeing Challan
              </button>
            </div>

            {/* Challans Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold">Challan No</th>
                    <th className="px-3.5 py-2.5 font-semibold">Date</th>
                    <th className="px-3.5 py-2.5 font-semibold">Dyeing Mill</th>
                    <th className="px-3.5 py-2.5 font-semibold">Buyer - Job No</th>
                    <th className="px-3.5 py-2.5 font-semibold">Style</th>
                    <th className="px-3.5 py-2.5 font-bold">Colourway Name</th>
                    <th className="px-3.5 py-2.5 text-right font-semibold">Challan Kg</th>
                    <th className="px-3.5 py-2.5 text-right font-semibold">Scale Weighed</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">Weight Diff</th>
                    <th className="px-3.5 py-2.5 text-center font-semibold">Rolls</th>
                    <th className="px-3.5 py-2.5 font-semibold">Godown Rack</th>
                    <th className="px-3.5 py-2.5 text-center font-semibold">Shade Clearance</th>
                    <th className="px-3.5 py-2.5 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {challans.map((ch) => (
                    <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{ch.challanNo}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{ch.date}</td>
                      <td className="px-3.5 py-2.5 text-slate-700 font-medium">{ch.dyeingMill}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800">
                        {ch.buyer} - {ch.jobNo}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600">{ch.style}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{ch.color}</td>
                      <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800">
                        {ch.challanBodyKg + ch.challanRibKg} kg
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">
                        {ch.weighedBodyKg + ch.weighedRibKg} kg
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold">
                        {ch.weightDiffKg < 0 ? (
                          <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            {ch.weightDiffKg} kg
                          </span>
                        ) : ch.weightDiffKg > 0 ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            +{ch.weightDiffKg} kg
                          </span>
                        ) : (
                          <span className="text-slate-400">0.0 kg</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-700 font-semibold">{ch.rollCount}</td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium">{ch.rackLocation}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {ch.shadeApproval}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {ch.status === 'Accepted' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Accepted
                          </span>
                        ) : (
                          <button
                            onClick={() => { setVerifyTarget(ch); setVerifyPick(emptyPick()); }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold shadow-xs transition-colors"
                          >
                            Verify & Accept
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
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ISSUE TO CUTTING FLOOR (MODERNIZED REQUISITION WORKSPACE) */}
      {/* ===================================================================== */}
      {activeTab === 'issue' && (
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT 5 COLS: STOCK READY FOR CUTTING */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-purple-600" />
                    Available Fabric Ready for Cutting
                  </h3>
                  <p className="text-[10px] text-slate-500">Select any colorway to prepare cutting issue slip</p>
                </div>
                <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                  Stock Ready
                </span>
              </div>

              {/* Ready Stock List */}
              <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1">
                {rawLines
                  .filter((l) => l.stockBalance > 0)
                  .slice(0, 30)
                  .map((l) => (
                    <div
                      key={l.id}
                      onClick={() => handleOpenIssue(l)}
                      className="p-3 rounded-lg border border-slate-200 hover:border-purple-400 bg-white hover:bg-purple-50/20 cursor-pointer transition-all shadow-xs flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {l.buyer} - {l.jobNo}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                            Style {l.style || '—'}
                          </span>
                        </div>
                        {/* COLORWAY PROMINENT */}
                        <div className="text-xs font-bold text-purple-900 mt-1 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
                          {l.color}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {l.fabric} · {l.gsm} GSM · {l.dia}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-700">
                          {Math.round(l.stockBalance).toLocaleString()} kg
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">Available in Store</div>
                        <span className="inline-block mt-1 text-[9.5px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          Select & Issue →
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* RIGHT 7 COLS: CUTTING REQUISITION FORM & SLIP PREPARATION */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-purple-600" />
                    Cutting Floor Requisition & Delivery Gate Pass
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign cutting table, CAD marker lot #, and allocate body & rib roll weight
                  </p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                  Issue Desk
                </span>
              </div>

              {issueModalTarget ? (
                <div className="space-y-4">
                  {/* Selected Colorway Overview Banner */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Selected Job & Colorway
                      </span>
                      <span className="text-xs font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                        {Math.round(issueModalTarget.stockBalance)} kg Stock Available
                      </span>
                    </div>
                    <div className="text-base font-black text-white">
                      {issueModalTarget.buyer} - {issueModalTarget.jobNo} (Style: {issueModalTarget.style})
                    </div>
                    <div className="text-sm font-bold text-purple-300 mt-1 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                      Color: {issueModalTarget.color}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Fabric: {issueModalTarget.fabric} · {issueModalTarget.gsm} GSM · Dia {issueModalTarget.dia}
                    </div>
                  </div>

                  {/* Input Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cutting Table & Line Assignment
                      </label>
                      <input
                        type="text"
                        value={issueForm.tableNo}
                        onChange={(e) => setIssueForm({ ...issueForm, tableNo: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                        placeholder="e.g. Table 03 - Line 05"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CAD Marker Lay / Cutting Lot No
                      </label>
                      <input
                        type="text"
                        value={issueForm.cuttingLotNo}
                        onChange={(e) => setIssueForm({ ...issueForm, cuttingLotNo: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                        placeholder="e.g. CL-2026-0419"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Body Fabric Issue (Kg)
                      </label>
                      <input
                        type="number"
                        value={issueForm.bodyKg}
                        onChange={(e) => setIssueForm({ ...issueForm, bodyKg: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1x1 / 2x1 Lycra Rib Issue (Kg)
                      </label>
                      <input
                        type="number"
                        value={issueForm.ribKg}
                        onChange={(e) => setIssueForm({ ...issueForm, ribKg: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Balance preview */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500">Total Issue Weight:</span>{' '}
                      <strong className="text-purple-700 text-sm">
                        {(Number(issueForm.bodyKg) || 0) + (Number(issueForm.ribKg) || 0)} kg
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Remaining Store Stock:</span>{' '}
                      <strong className="text-slate-900 text-sm">
                        {Math.max(
                          0,
                          issueModalTarget.stockBalance -
                            ((Number(issueForm.bodyKg) || 0) + (Number(issueForm.ribKg) || 0))
                        )}{' '}
                        kg
                      </strong>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      onClick={() => setIssueModalTarget(null)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmIssue}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      Confirm & Deduct Stock
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <Scissors className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No colorway currently selected</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click any fabric line from "Available Fabric Ready for Cutting" on the left to prepare the issue slip.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RECENT CUTTING ISSUANCE LOG */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Today's Cutting Floor Issuance Log
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold">Issue No</th>
                    <th className="px-3.5 py-2.5 font-semibold">Date</th>
                    <th className="px-3.5 py-2.5 font-semibold">Buyer - Job No</th>
                    <th className="px-3.5 py-2.5 font-semibold">Style</th>
                    <th className="px-3.5 py-2.5 font-bold">Colourway Name</th>
                    <th className="px-3.5 py-2.5 font-semibold">Cutting Table</th>
                    <th className="px-3.5 py-2.5 font-semibold">Cutting Lot #</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">Body Kg</th>
                    <th className="px-3.5 py-2.5 text-right font-bold">Rib Kg</th>
                    <th className="px-3.5 py-2.5 text-right font-black">Total Issued</th>
                    <th className="px-3.5 py-2.5 font-semibold">Issued By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuttingIssues.map((ci) => (
                    <tr key={ci.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-bold text-purple-700">{ci.issueNo}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{ci.date}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        {ci.buyer} - {ci.jobNo}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600">{ci.style}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{ci.color}</td>
                      <td className="px-3.5 py-2.5 text-slate-700 font-semibold">{ci.cuttingTable}</td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium">{ci.cuttingLotNo}</td>
                      <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800">{ci.bodyKg} kg</td>
                      <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800">{ci.ribKg} kg</td>
                      <td className="px-3.5 py-2.5 text-right font-black text-purple-800">{ci.totalKg} kg</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{ci.issuedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: REUSE & LEFTOVER FABRIC */}
      {/* ===================================================================== */}
      {verifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setVerifyTarget(null)}>
          <div className="bg-white rounded-xl border border-slate-300 shadow-xl w-full max-w-[560px] p-5" onClick={e => e.stopPropagation()}>
            <div className="text-[12px] font-bold uppercase tracking-wide text-slate-600">Verify & accept challan</div>
            <div className="text-[18px] font-extrabold text-slate-900 mb-1">{verifyTarget.challanNo}</div>
            <div className="text-[13px] font-semibold text-slate-800 mb-4">
              {verifyTarget.buyer} - {verifyTarget.jobNo} · {verifyTarget.color} · {verifyTarget.rollCount} rolls · {verifyTarget.weighedBodyKg + verifyTarget.weighedRibKg} kg weighed
            </div>
            <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Where is it kept? Rack & shelf (or another place)</label>
            <LocationPicker locations={rackLoc} value={verifyPick} onChange={setVerifyPick} lineLabel={lineNameById} />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setVerifyTarget(null)} className="px-3 py-1.5 rounded-lg text-[13px] font-bold border border-slate-400 bg-white text-slate-900">Cancel</button>
              <button
                disabled={!pickIsValid(verifyPick, rackLoc)}
                onClick={() => {
                  const ch = verifyTarget;
                  const label = pickLabel(verifyPick);
                  setChallans(prev => prev.map(c => (c.id === ch.id ? { ...c, status: 'Accepted', rackLocation: label } : c)));
                  const line = rawLines.find(l => l.jobNo === ch.jobNo.replace(/^.*?-\s*/, '').trim() && l.color === ch.color) || rawLines.find(l => ch.jobNo.includes(l.jobNo) && l.color === ch.color);
                  if (line) saveRackLoc(assignLocation(rackLoc, line.id, verifyPick, new Date().toISOString().slice(0, 10)), `Challan ${ch.challanNo} accepted · kept at ${label}`);
                  else showToast(`Challan ${ch.challanNo} accepted · kept at ${label}`);
                  setVerifyTarget(null);
                }}
                className="px-3 py-1.5 rounded-lg text-[13px] font-bold nos-btn-primary disabled:opacity-50"
              >
                Accept & save location
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'location' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <FabricRackLocation
            key={locFocus.n}
            lines={rawLines}
            locations={rackLoc}
            onChange={saveRackLoc}
            initialSub={locFocus.sub}
            initialQuery={locFocus.q}
          />
        </div>
      )}

      {activeTab === 'reuse' && (
        <div className="space-y-6 mb-8">
          {/* Top Form: Return leftover roll from Cutting Floor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Cutting Floor Leftover Fabric Return Form
            </h3>
            <form onSubmit={handleConfirmReturn} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Job No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 47621"
                  value={returnForm.jobNo}
                  onChange={(e) => setReturnForm({ ...returnForm, jobNo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Colourway Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mauve Shadows"
                  value={returnForm.color}
                  onChange={(e) => setReturnForm({ ...returnForm, color: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cutting Lot #</label>
                <input
                  type="text"
                  placeholder="e.g. CL-2026-0412"
                  value={returnForm.cuttingLotNo}
                  onChange={(e) => setReturnForm({ ...returnForm, cuttingLotNo: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Returned Kg</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 4.5"
                  value={returnForm.returnedKg}
                  onChange={(e) => setReturnForm({ ...returnForm, returnedKg: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow-xs transition-colors"
                >
                  Return to Stock
                </button>
              </div>
            </form>
          </div>

          {/* Leftover Log Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Leftover Roll Return History
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold">Date</th>
                    <th className="px-3.5 py-2.5 font-bold">Job No</th>
                    <th className="px-3.5 py-2.5 font-bold">Colourway</th>
                    <th className="px-3.5 py-2.5 font-semibold">Cutting Lot #</th>
                    <th className="px-3.5 py-2.5 text-right font-black">Returned Weight</th>
                    <th className="px-3.5 py-2.5 font-semibold">Reason</th>
                    <th className="px-3.5 py-2.5 font-semibold">Returned By</th>
                    <th className="px-3.5 py-2.5 font-semibold">Rack Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnLedger.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 text-slate-500">{ret.date}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{ret.jobNo}</td>
                      <td className="px-3.5 py-2.5 font-bold text-purple-900">{ret.color}</td>
                      <td className="px-3.5 py-2.5 text-slate-600">{ret.cuttingLotNo}</td>
                      <td className="px-3.5 py-2.5 text-right font-black text-amber-700">{ret.returnedKg} kg</td>
                      <td className="px-3.5 py-2.5 text-slate-600">{ret.reason}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{ret.returnedBy}</td>
                      <td className="px-3.5 py-2.5 text-slate-700 font-semibold">{ret.rackAssigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RECEIVE DYEING CHALLAN FOR SPECIFIC COLORWAY */}
      {/* ===================================================================== */}
      {receiveModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  Receive Dyeing Delivery Challan
                </h3>
                <p className="text-[11px] text-slate-300">
                  Log inbound fabric rolls and audit weight difference
                </p>
              </div>
              <button
                onClick={() => setReceiveModalTarget(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Target specs banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                <div className="font-bold text-slate-900">
                  {receiveModalTarget.buyer} - Job #{receiveModalTarget.jobNo} (Style: {receiveModalTarget.style})
                </div>
                <div className="text-emerald-700 font-bold mt-0.5">
                  Color: {receiveModalTarget.color}
                </div>
                <div className="text-slate-500 mt-0.5 text-[11px]">
                  Fabric: {receiveModalTarget.fabric} · {receiveModalTarget.gsm} GSM · Dia {receiveModalTarget.dia}
                </div>
                <div className="text-amber-800 font-bold mt-1 text-[11px]">
                  Still to Come Balance: {Math.round(receiveModalTarget.dyeingBalance)} kg
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Challan No</label>
                  <input
                    type="text"
                    value={receiveForm.challanNo}
                    onChange={(e) => setReceiveForm({ ...receiveForm, challanNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={receiveForm.date}
                    onChange={(e) => setReceiveForm({ ...receiveForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Dyeing Factory / Mill</label>
                  <input
                    type="text"
                    value={receiveForm.mill}
                    onChange={(e) => setReceiveForm({ ...receiveForm, mill: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Challan Body (Kg)</label>
                  <input
                    type="number"
                    value={receiveForm.bodyKg}
                    onChange={(e) => setReceiveForm({ ...receiveForm, bodyKg: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Challan Lycra Rib (Kg)</label>
                  <input
                    type="number"
                    value={receiveForm.ribKg}
                    onChange={(e) => setReceiveForm({ ...receiveForm, ribKg: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scale Weighed Qty (Kg)</label>
                  <input
                    type="number"
                    value={receiveForm.weighedScaleKg}
                    onChange={(e) => setReceiveForm({ ...receiveForm, weighedScaleKg: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-emerald-800 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Roll Count</label>
                  <input
                    type="number"
                    value={receiveForm.rollCount}
                    onChange={(e) => setReceiveForm({ ...receiveForm, rollCount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Where is it kept? Rack & shelf (or another place)</label>
                  <LocationPicker locations={rackLoc} value={recvPick} onChange={setRecvPick} lineLabel={lineNameById} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setReceiveModalTarget(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReceive}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accept & Add to Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SIDE DRAWER: JOB 360 FABRIC DRILL-DOWN LEDGER */}
      {/* ===================================================================== */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  {selectedJobDetail.buyer} · Job #{selectedJobDetail.jobNo}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">Style: {selectedJobDetail.style}</h3>
              </div>
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Job Summary Banner */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Total Requirement</span>
                  <strong className="text-slate-900 text-sm">
                    {Math.round(selectedJobDetail.totalReq).toLocaleString()} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Total Received</span>
                  <strong className="text-emerald-700 text-sm">
                    {Math.round(selectedJobDetail.totalRecv).toLocaleString()} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Dyeing Balance</span>
                  <strong className="text-amber-700 text-sm">
                    {Math.round(selectedJobDetail.totalBalance).toLocaleString()} kg
                  </strong>
                </div>
              </div>

              {/* Colorways Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  Colorways Register ({selectedJobDetail.colorCount})
                </h4>
                <div className="space-y-2">
                  {selectedJobDetail.colors.map((c, i) => (
                    <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-xs">
                          {i + 1}. {c.color}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {c.stockState}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.fabric} · {c.gsm} GSM · Dia {c.dia} · {c.process}
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-center text-[10px]">
                        <div>
                          <span className="text-slate-400 block">Req</span>
                          <span className="font-bold text-slate-800">{Math.round(c.totalReq)} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Recv</span>
                          <span className="font-bold text-emerald-700">{Math.round(c.totalRecv)} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Bal</span>
                          <span className="font-bold text-amber-700">{Math.round(c.dyeingBalance)} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Stock</span>
                          <span className="font-bold text-sky-700">{Math.round(c.stockBalance)} kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challans for this job */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                  Dyeing Mill Delivery Challans
                </h4>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-[11px] text-slate-600">
                  {selectedJobDetail.colors[0]?.challans ? (
                    <div>
                      <span className="font-semibold text-slate-700">Challan Reference(s):</span>{' '}
                      {selectedJobDetail.colors.map((c) => c.challans).filter(Boolean).join(' / ')}
                    </div>
                  ) : (
                    <span>No delivery challans recorded yet for this order.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
