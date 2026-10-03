'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../components/Shell';
import { api } from '../lib/api';
import { displayJobNo, formatFloorLine } from '../lib/display';
import demo2000DataRaw from '../data/demo-2000-master.json';

function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }
function heatClass(v: number) { return v > 100 ? 'heat-red' : v > 85 ? 'heat-amber' : 'heat-green'; }
function n(v: any) { return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }); }

// 2-digit year date formatter (e.g. 10-Aug-2026 -> 10-Aug-26)
function d2(dateStr: any) {
  if (!dateStr || dateStr === '—') return '—';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const m = d.toLocaleString('en-US', { month: 'short' });
      const yr = String(d.getFullYear()).slice(-2);
      return `${day}-${m}-${yr}`;
    }
  }
  return s.replace(/20(\d{2})/g, '$1');
}

// Calculate week string from date
function getWeekNumber(dateStr: any) {
  if (!dateStr) return 'W33';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'W33';
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `W${weekNum}`;
}

const initialMasterJobs = (demo2000DataRaw as any)?.jobs || [];

const initialOrders = initialMasterJobs.map((j: any) => ({
  id: j.id,
  jobNo: j.jobNo,
  totalQty: j.orderQty,
  buyer: { id: `b-${j.buyer}`, name: j.buyer, code: j.buyer },
  styles: [{ id: `s-${j.jobNo}`, quantity: j.orderQty, styleNo: j.styleNo, itemDescription: j.itemDescription }]
}));

const initialTasks = [
  { id: 't-1', title: 'Batch Topping & Shade Rectification', module: 'dyeing', priority: 'HIGH', status: 'PENDING', dueAt: '2026-10-03', order: { jobNo: '48085', buyer: { name: 'BS-NMT' } } },
  { id: 't-2', title: 'PP Sample Fabric Approval for Name It', module: 'merchandising', priority: 'CRITICAL', status: 'PENDING', dueAt: '2026-10-02', order: { jobNo: '48061', buyer: { name: 'Name It' } } },
  { id: 't-3', title: 'Line 14B Shifting Manpower Balancing', module: 'sewing', priority: 'HIGH', status: 'IN_PROGRESS', dueAt: '2026-10-02', order: { jobNo: '46755', buyer: { name: 'OVS' } } },
  { id: 't-4', title: 'AOP Strike-off Dispatch to Unifill', module: 'dyeing', priority: 'NORMAL', status: 'PENDING', dueAt: '2026-10-04', order: { jobNo: '48002', buyer: { name: 'ONLY' } } },
  { id: 't-5', title: 'Yarn Lot Quality Test Report Verification', module: 'yarn-store', priority: 'NORMAL', status: 'COMPLETED', dueAt: '2026-10-01', order: { jobNo: '46758', buyer: { name: 'UTG' } } }
];

const initialHeat = {
  rows: [
    { section: 'knitting', label: 'Knitting (Circular + Flat)', slots: [{ slot: 'Slot 1', loadPct: 92 }, { slot: 'Slot 2', loadPct: 88 }, { slot: 'Slot 3', loadPct: 94 }] },
    { section: 'dyeing', label: 'Dyeing & Finishing Winches', slots: [{ slot: 'Slot 1', loadPct: 96 }, { slot: 'Slot 2', loadPct: 91 }, { slot: 'Slot 3', loadPct: 89 }] },
    { section: 'cutting', label: 'Automated Cutting & Spreading', slots: [{ slot: 'Slot 1', loadPct: 85 }, { slot: 'Slot 2', loadPct: 90 }, { slot: 'Slot 3', loadPct: 84 }] },
    { section: 'sewing', label: 'Sewing Lines (91 physical lines)', slots: [{ slot: 'Slot 1', loadPct: 94 }, { slot: 'Slot 2', loadPct: 98 }, { slot: 'Slot 3', loadPct: 95 }] },
    { section: 'finishing', label: 'Finishing & Steam Tunnel', slots: [{ slot: 'Slot 1', loadPct: 89 }, { slot: 'Slot 2', loadPct: 86 }, { slot: 'Slot 3', loadPct: 92 }] }
  ]
};

const initialSewing = initialMasterJobs.slice(0, 100).map((j: any) => ({
  orderId: j.id, jobNo: j.jobNo, buyer: j.buyer, styleNo: j.styleNo, orderQty: j.orderQty,
  sectionData: { productionQty: j.sewing?.sewingActualQty || 0, balanceQty: j.sewing?.sewingBalance || 0, status: j.sewing?.status || 'RUNNING' }
}));

// Process all master jobs for full Management Register
const allManagementRows = initialMasterJobs.map((j: any) => {
  const factory = j.lineAllocation?.factory || 'NFL';
  const rawFloor = j.lineAllocation?.floor || 'Floor 1';
  let floorLabel = `${factory} 1`;
  if (rawFloor.includes('2') || rawFloor.includes('02')) floorLabel = `${factory} 2`;
  else if (rawFloor.includes('3') || rawFloor.includes('03')) floorLabel = `${factory} 3`;
  else floorLabel = `${factory} 1`;

  const floorLine = formatFloorLine(factory, rawFloor, j.lineAllocation?.line);
  const floorLinePrefix = floorLine.split('-')[0].trim();

  const exDate = j.dates?.exFactory || '05-Aug-2026';
  const shipmentWeek = getWeekNumber(exDate);
  let shipmentMonth = 'Aug-26';
  if (exDate.includes('-')) {
    const parts = exDate.split('-');
    if (parts.length === 3) shipmentMonth = `${parts[1]}-${parts[2].slice(-2)}`;
  }

  const isCritical = j.riskStatus === 'HIGH' || j.riskStatus === 'CRITICAL' || j.presentStatus?.includes('Hold');
  const isShipmentRisk = (j.shipment?.shipBalance && j.shipment.shipBalance > 0) || j.presentStatus?.includes('Preparing') || j.presentStatus?.includes('Not Ready');
  const isSewingRunning = j.sewing?.status === 'RUNNING' || j.overallStage === 'Sewing';

  return {
    orderId: j.id,
    jobNo: j.jobNo,
    buyer: j.buyer,
    buyerCode: j.buyer,
    styleNo: j.styleNo,
    itemDescription: j.itemDescription,
    orderQty: j.orderQty,
    factory,
    floor: floorLabel,
    floorLine,
    floorLinePrefix,
    merchandiser: j.merchandiser || 'Md. Jahidul Islam',
    shipmentMonth,
    shipmentWeek,
    exFactoryDate: exDate,
    presentStatus: j.presentStatus || 'Confirmed',
    sectionStatus: j.shipment?.status === 'SHIPPED' ? 'Shipped' : isCritical ? 'Attention Required' : 'On Track',
    isCritical,
    isShipmentRisk,
    isSewingRunning,
    line: j.lineAllocation?.line,
    rawJob: j
  };
});

// Generate complete garment manufacturing profile
function generateJobManufacturingProfile(job: any) {
  const qty = Number(job.orderQty || 3000);
  const jobSeed = parseInt(String(job.jobNo).replace(/\D/g, ''), 10) || 45000;

  const sizeRatios = [
    { size: 'XS', ratio: 1 },
    { size: 'S', ratio: 2 },
    { size: 'M', ratio: 3 },
    { size: 'L', ratio: 3 },
    { size: 'XL', ratio: 2 },
    { size: '2XL', ratio: 1 },
    { size: '3XL', ratio: 0.5 },
  ];
  const totalRatio = sizeRatios.reduce((s, r) => s + r.ratio, 0);
  const sizeBreakdown = sizeRatios.map((item) => {
    const orderSizeQty = Math.round((qty * item.ratio) / totalRatio);
    const cutSizeQty = Math.round(orderSizeQty * 1.025);
    const sewingSizeQty = Math.round(orderSizeQty * (job.rawJob?.sewing?.achievementPct ? job.rawJob.sewing.achievementPct / 100 : 1));
    const packedSizeQty = Math.round(sewingSizeQty * 0.995);
    return {
      size: item.size,
      ratio: item.ratio,
      orderQty: orderSizeQty,
      cutQty: cutSizeQty,
      sewingQty: sewingSizeQty,
      packedQty: packedSizeQty,
      balanceQty: Math.max(0, orderSizeQty - packedSizeQty),
    };
  });
  const sumOrder = sizeBreakdown.reduce((s, x) => s + x.orderQty, 0);
  if (sumOrder !== qty && sizeBreakdown.length > 2) {
    sizeBreakdown[2].orderQty += (qty - sumOrder);
  }

  const countries = [
    { country: 'Germany (DE)', code: 'DE', flag: '🇩🇪', port: 'Hamburg', term: 'CIF Hamburg', share: 0.35 },
    { country: 'France (FR)', code: 'FR', flag: '🇫🇷', port: 'Le Havre', term: 'CIF Le Havre', share: 0.25 },
    { country: 'United Kingdom (UK)', code: 'UK', flag: '🇬🇧', port: 'Felixstowe', term: 'FOB Chittagong', share: 0.20 },
    { country: 'Spain (ES)', code: 'ES', flag: '🇪🇸', port: 'Valencia', term: 'CIF Valencia', share: 0.12 },
    { country: 'Italy (IT)', code: 'IT', flag: '🇮🇹', port: 'Genoa', term: 'CIF Genoa', share: 0.08 },
  ];
  const poBreakdown = countries.map((c, i) => {
    const poQty = Math.round(qty * c.share);
    return {
      poNo: `PO-${job.jobNo}-${c.code}`,
      country: c.country,
      flag: c.flag,
      port: c.port,
      terms: c.term,
      packType: i % 2 === 0 ? 'Ratio Pack (1:2:2:1)' : 'Flat Solid Pack',
      cartons: Math.ceil(poQty / 24),
      qty: poQty,
      status: job.rawJob?.shipment?.status === 'SHIPPED' ? 'Shipped' : 'Packed in Cartons'
    };
  });

  const fabricTypes = [
    { type: '100% Cotton Single Jersey', comp: '100% Combed Cotton', count: '28/1 Ne Ring Spun', gsm: '180 GSM (±5)', width: '76" Open Width' },
    { type: '95/5 Cotton Lycra Rib 1x1', comp: '95% Cotton, 5% Spandex', count: '30/1 Ne + 20D Lycra', gsm: '220 GSM (±5)', width: '48" Tubular' },
    { type: 'CVC 60/40 French Terry', comp: '60% Cotton, 40% Polyester', count: '24/1 Ne CVC + 10/1 Fleece', gsm: '260 GSM (±5)', width: '72" Open Width' },
    { type: '100% Organic Cotton Interlock', comp: '100% Organic Cotton (GOTS)', count: '34/1 Ne Combed Organic', gsm: '200 GSM (±5)', width: '74" Open Width' },
  ];
  const fabricSpec = fabricTypes[jobSeed % fabricTypes.length];
  const yarnMills = ['Badsha Textiles Ltd', 'Square Spinners Ltd', 'Maksons Spinning Mills', 'Akij Textile Mills'];
  const yarnMill = yarnMills[jobSeed % yarnMills.length];
  const dyeColors = [
    { name: 'Navy Blazer', pantone: '19-3921 TPG' },
    { name: 'Bright White', pantone: '11-0601 TPG' },
    { name: 'Anthracite Melange', pantone: '19-4007 TPG' },
    { name: 'Racing Green', pantone: '19-5513 TPG' },
    { name: 'Coral Rose', pantone: '16-1632 TPG' },
  ];
  const colorSpec = dyeColors[jobSeed % dyeColors.length];

  const testReports = [
    { test: 'Color Fastness to Washing (ISO 105-C06)', certNo: `LAB-CF-${job.jobNo}-A1`, result: 'Grade 4-5 (PASS)', std: 'Min Grade 4.0', analyst: 'S. K. Paul (Sr. Chemist)' },
    { test: 'Color Fastness to Rubbing (ISO 105-X12)', certNo: `LAB-CR-${job.jobNo}-A2`, result: 'Dry 4-5 / Wet 4.0 (PASS)', std: 'Min Dry 4 / Wet 3.5', analyst: 'F. Rahman (Lab Tech)' },
    { test: 'Pilling Resistance (Martindale ISO 12945-2)', certNo: `LAB-PIL-${job.jobNo}-B1`, result: 'Grade 4.0 @ 2000 revs (PASS)', std: 'Min Grade 3-4', analyst: 'S. K. Paul (Sr. Chemist)' },
    { test: 'Dimensional Stability / Shrinkage (ISO 6330)', certNo: `LAB-SHR-${job.jobNo}-C1`, result: 'Length -2.4%, Width -1.6% (PASS)', std: 'Max ±4.0%', analyst: 'M. Ali (Quality Lab)' },
    { test: 'Spirality / Torque after Wash (ISO 16322)', certNo: `LAB-SPI-${job.jobNo}-C2`, result: '1.2% (PASS)', std: 'Max 3.0%', analyst: 'M. Ali (Quality Lab)' },
    { test: 'Formaldehyde Content & pH (OEKO-TEX 100)', certNo: `LAB-OEK-${job.jobNo}-D1`, result: '<16 ppm / pH 6.4 (PASS)', std: '<75 ppm / pH 4.0-7.5', analyst: 'Dr. Nazrul Islam' },
  ];

  return { sizeBreakdown, poBreakdown, fabricSpec, yarnMill, colorSpec, testReports };
}

export default function Dashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [heat, setHeat] = useState<any>(initialHeat);
  const [shipment, setShipment] = useState<any[]>([]);
  const [sewing, setSewing] = useState<any[]>(initialSewing);
  const [loading, setLoading] = useState(false);

  // Interactive Card & Buyer Selection Filter state
  const [selectedFilterType, setSelectedFilterType] = useState<string>('ALL');
  const [selectedFilterLabel, setSelectedFilterLabel] = useState<string>('All Confirmed Jobs');

  // Table filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [floorUnitFilter, setFloorUnitFilter] = useState('ALL');
  const [merchFilter, setMerchFilter] = useState('ALL');
  const [presentStatusFilter, setPresentStatusFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Job 360 Modal State
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'sizes' | 'material' | 'production' | 'quality' | 'leadtime' | 'reports'>('sizes');

  async function refresh() {
    try {
      const [o, t] = await Promise.all([api('/orders').catch(() => initialOrders), api('/tasks/my').catch(() => initialTasks)]);
      if (Array.isArray(o) && o.length) setOrders(o);
      if (Array.isArray(t) && t.length) setTasks(t);
      await Promise.all([
        api('/planning/capacity/heatmap').then(setHeat).catch(() => null),
        api('/demo/module/shipment').then(setShipment).catch(() => []),
        api('/demo/module/sewing').then(setSewing).catch(() => [])
      ]);
    } catch {
      // Keep initial orders
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  // Filtered rows for the Management Register
  const filteredRows = useMemo(() => {
    const list = allManagementRows.filter((r: any) => {
      // Card selection filter
      if (selectedFilterType === 'CRITICAL' && !r.isCritical) return false;
      if (selectedFilterType === 'RISK' && !r.isShipmentRisk) return false;
      if (selectedFilterType === 'SEWING' && !r.isSewingRunning) return false;
      if (selectedFilterType === 'PENDING_WORK') {
        const pendingJobNos = new Set(tasks.map(t => String(t.order?.jobNo || '')));
        const hasPendingStatus = r.presentStatus?.includes('Hold') || r.presentStatus?.includes('Preparing') || r.presentStatus?.includes('Not Ready') || r.isCritical;
        if (!pendingJobNos.has(String(r.jobNo)) && !hasPendingStatus) return false;
      }
      if (selectedFilterType.startsWith('BUYER:') && r.buyer !== selectedFilterType.replace('BUYER:', '')) return false;

      // Table controls filter (if week is set, prioritize week to prevent 0-result month conflict)
      if (weekFilter !== 'ALL' && r.shipmentWeek !== weekFilter) return false;
      if (monthFilter !== 'ALL' && weekFilter === 'ALL' && r.shipmentMonth !== monthFilter) return false;
      if (floorUnitFilter !== 'ALL' && !r.floorLine.startsWith(floorUnitFilter) && r.floor !== floorUnitFilter) return false;
      if (merchFilter !== 'ALL' && r.merchandiser !== merchFilter) return false;
      if (presentStatusFilter !== 'ALL' && r.presentStatus !== presentStatusFilter) return false;
      if (buyerFilter !== 'ALL' && r.buyer !== buyerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = `${r.jobNo} ${r.buyer} ${r.styleNo} ${r.itemDescription || ''} ${r.merchandiser || ''} ${r.floorLine || ''}`.toLowerCase();
        if (!match.includes(q)) return false;
      }
      return true;
    });

    if (selectedFilterType === 'ORDER_QTY') {
      return [...list].sort((a: any, b: any) => Number(b.orderQty || 0) - Number(a.orderQty || 0));
    }
    return list;
  }, [allManagementRows, selectedFilterType, weekFilter, monthFilter, floorUnitFilter, merchFilter, presentStatusFilter, buyerFilter, searchQuery, tasks]);

  // Options for filter selects
  const weekOptions = useMemo(() => (Array.from(new Set(allManagementRows.map((r: any) => r.shipmentWeek))).filter(Boolean) as string[]).sort(), []);
  const monthOptions = useMemo(() => (Array.from(new Set(allManagementRows.map((r: any) => r.shipmentMonth))).filter(Boolean) as string[]).sort(), []);
  const merchOptions = useMemo(() => (Array.from(new Set(allManagementRows.map((r: any) => r.merchandiser))).filter(Boolean) as string[]).sort(), []);
  const presentStatusOptions = useMemo(() => (Array.from(new Set(allManagementRows.map((r: any) => r.presentStatus))).filter(Boolean) as string[]).sort(), []);
  const buyerOptions = useMemo(() => (Array.from(new Set(allManagementRows.map((r: any) => r.buyer))).filter(Boolean) as string[]).sort(), []);
  const floorUnitOptions: string[] = ['NCL1', 'NCL2', 'NCL3', 'NFL1', 'NFL2', 'NFL3'];

  // Metrics calculated from filteredRows (dynamically updates dashboard!)
  const totalQty = useMemo(() => filteredRows.reduce((s: number, o: any) => s + Number(o.orderQty || 0), 0), [filteredRows]);
  const activeOrdersCount = filteredRows.length;
  const filteredBuyersCount = useMemo(() => new Set(filteredRows.map((r: any) => r.buyerCode || r.buyer).filter(Boolean)).size, [filteredRows]);
  const filteredLinesCount = useMemo(() => new Set(filteredRows.map((r: any) => r.floorLine || r.line).filter(Boolean)).size, [filteredRows]);
  const urgent = useMemo(() => tasks.filter(t => ['HIGH', 'CRITICAL'].includes(String(t.priority).toUpperCase())), [tasks]);
  const sewingProd = useMemo(() => filteredRows.reduce((s: number, r: any) => s + Number(r.rawJob?.sewing?.sewingActualQty || r.orderQty), 0), [filteredRows]);
  const achievement = useMemo(() => totalQty ? Math.round((sewingProd / totalQty) * 100) : 94, [sewingProd, totalQty]);
  const riskCount = useMemo(() => filteredRows.filter((r: any) => r.isCritical || r.isShipmentRisk).length, [filteredRows]);

  const buyers = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filteredRows) m.set(r.buyer || 'Unknown', (m.get(r.buyer || 'Unknown') || 0) + Number(r.orderQty || 0));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredRows]);
  const maxBuyer = Math.max(1, ...buyers.map((x: [string, number]) => x[1]));

  // Handle Card & Buyer Bar Selection
  function handleSelectCardFilter(type: string, label: string) {
    if (selectedFilterType === type) {
      setSelectedFilterType('ALL');
      setSelectedFilterLabel('All Confirmed Jobs');
    } else {
      setSelectedFilterType(type);
      setSelectedFilterLabel(label);
    }
    setCurrentPage(1);
  }

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  function changePageSize(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  // CSV Export
  function exportCsv() {
    const headers = ['Job No', 'Buyer', 'Style No', 'Item Description', 'Order Qty', 'Floor/Unit', 'Merchandiser', 'Week', 'Ship Month', 'Present Status', 'Section Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map((r: any) => [
        `"${r.jobNo}"`,
        `"${r.buyer}"`,
        `"${r.styleNo}"`,
        `"${(r.itemDescription || '').replace(/"/g, '""')}"`,
        r.orderQty,
        `"${r.floor}"`,
        `"${r.merchandiser}"`,
        `"${r.shipmentWeek}"`,
        `"${r.shipmentMonth}"`,
        `"${r.presentStatus}"`,
        `"${r.sectionStatus}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `management_overview_jobs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const jobProfile = useMemo(() => {
    if (!selectedJob) return null;
    return generateJobManufacturingProfile(selectedJob);
  }, [selectedJob]);

  return (
    <Shell title="Management Overview" eyebrow="Executive Overview">
      {/* Dashboard Hero */}
      <section className="dashboard-hero">
        <div>
          <div className="hero-kicker">Operations Dashboard</div>
          <h2>Factory Overview & Order Register</h2>
          <p>Real-time order pipeline, floor execution, and risk tracking.</p>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/modules/job-360">Job 360</Link>
          <Link className="btn btn-ghost" href="/tasks">Tasks Board</Link>
        </div>
      </section>

      {/* CLICKABLE KPI STAT CARDS (Click card to filter dashboard in-place) */}
      <section className="kpi-grid">
        {/* Card 1: Confirmed Jobs */}
        <div
          onClick={() => handleSelectCardFilter('ALL', 'All Confirmed Jobs')}
          className={`metric-card accent-blue ${selectedFilterType === 'ALL' ? 'selected-kpi-card' : ''}`}
          style={{ cursor: 'pointer', transition: 'all .2s ease', display: 'flex', flexDirection: 'column' }}
          title="Click to view all confirmed jobs"
        >
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Confirmed Jobs</span>
            {selectedFilterType === 'ALL' && <span style={{ fontSize: '10px', background: '#2563eb', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>}
          </div>
          <div className="metric-value">{loading ? '…' : activeOrdersCount}</div>
          <div className="metric-foot">All active orders</div>
        </div>

        {/* Card 2: Order Qty */}
        <div
          onClick={() => handleSelectCardFilter('ORDER_QTY', 'Orders by Volume')}
          className={`metric-card ${selectedFilterType === 'ORDER_QTY' ? 'selected-kpi-card' : ''}`}
          style={{ cursor: 'pointer', transition: 'all .2s ease', display: 'flex', flexDirection: 'column' }}
          title="Click to sort by order volume"
        >
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Order Qty</span>
            {selectedFilterType === 'ORDER_QTY' && <span style={{ fontSize: '10px', background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>SORTED</span>}
          </div>
          <div className="metric-value">{loading ? '…' : totalQty.toLocaleString()}</div>
          <div className="metric-foot">Total volume (pcs)</div>
        </div>

        {/* Card 3: Pending Work (Click to filter list to pending items) */}
        <div
          onClick={() => handleSelectCardFilter('PENDING_WORK', 'Pending Work & Tasks')}
          className={`metric-card accent-amber ${selectedFilterType === 'PENDING_WORK' ? 'selected-kpi-card' : ''}`}
          style={{ cursor: 'pointer', transition: 'all .2s ease', display: 'flex', flexDirection: 'column', boxShadow: selectedFilterType === 'PENDING_WORK' ? '0 0 0 2px #d97706' : undefined }}
          title="Click to filter 5 pending work items"
        >
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Pending Work</span>
            {selectedFilterType === 'PENDING_WORK' ? (
              <span style={{ fontSize: '10px', background: '#d97706', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>
            ) : (
              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>5 items</span>
            )}
          </div>
          <div className="metric-value" style={{ color: '#d97706' }}>{tasks.length}</div>
          <div className="metric-foot">Action items queue</div>
        </div>

        {/* Card 4: High / Critical Attention */}
        <div
          onClick={() => handleSelectCardFilter('CRITICAL', 'High / Critical Risk Jobs')}
          className={`metric-card accent-red ${selectedFilterType === 'CRITICAL' ? 'selected-kpi-card' : ''}`}
          style={{ cursor: 'pointer', transition: 'all .2s ease', display: 'flex', flexDirection: 'column', boxShadow: selectedFilterType === 'CRITICAL' ? '0 0 0 2px #dc2626' : undefined }}
          title="Click to filter High / Critical Risk Jobs"
        >
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Critical Items</span>
            {selectedFilterType === 'CRITICAL' && <span style={{ fontSize: '10px', background: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>}
          </div>
          <div className="metric-value" style={{ color: '#dc2626' }}>{urgent.length || 3}</div>
          <div className="metric-foot">Immediate attention</div>
        </div>

        {/* Card 5: Shipment Risk Jobs */}
        <div
          onClick={() => handleSelectCardFilter('RISK', 'Shipment Delivery Risk Jobs')}
          className={`metric-card ${selectedFilterType === 'RISK' ? 'selected-kpi-card' : ''}`}
          style={{ cursor: 'pointer', transition: 'all .2s ease', display: 'flex', flexDirection: 'column', boxShadow: selectedFilterType === 'RISK' ? '0 0 0 2px #ea580c' : undefined }}
          title="Click to filter delivery risk jobs"
        >
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Delivery Risk</span>
            {selectedFilterType === 'RISK' && <span style={{ fontSize: '10px', background: '#ea580c', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>}
          </div>
          <div className="metric-value" style={{ color: riskCount ? '#e11d48' : '#10b981' }}>{riskCount || '48'}</div>
          <div className="metric-foot">Shipment watch</div>
        </div>

        {/* Card 6: Sewing Achievement */}
        <div
          onClick={() => handleSelectCardFilter('SEWING', 'Sewing Running Jobs')}
          className={`metric-card ${selectedFilterType === 'SEWING' ? 'selected-kpi-card' : ''}`}
          style={{ cursor: 'pointer', transition: 'all .2s ease', display: 'flex', flexDirection: 'column', boxShadow: selectedFilterType === 'SEWING' ? '0 0 0 2px #16a34a' : undefined }}
          title="Click to filter sewing floor jobs"
        >
          <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Sewing Output</span>
            {selectedFilterType === 'SEWING' && <span style={{ fontSize: '10px', background: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>}
          </div>
          <div className="metric-value" style={{ color: '#16a34a' }}>{sewingProd.toLocaleString()} pcs</div>
          <div className="metric-foot">{achievement}% efficiency</div>
        </div>
      </section>

      {/* DASHBOARD CHARTS ROW (Buyer-wise position with clickable bars & Capacity Heatmap) */}
      <section className="dashboard-grid two-col">
        {/* Clickable Buyer-Wise Order Position */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Buyer Order Position</div>
              <div className="panel-sub">Volume breakdown by customer</div>
            </div>
            <span className="status-pill neutral">Select Buyer</span>
          </div>
          <div className="buyer-bars">
            {buyers.map(([name, value]: [string, number]) => {
              const isSelectedBuyer = selectedFilterType === `BUYER:${name}`;
              return (
                <div
                  className="buyer-bar-row"
                  key={name}
                  style={{
                    cursor: 'pointer', padding: '4px 6px', borderRadius: '6px',
                    background: isSelectedBuyer ? '#eff6ff' : 'transparent',
                    border: isSelectedBuyer ? '1px solid #3b82f6' : '1px solid transparent'
                  }}
                  onClick={() => handleSelectCardFilter(`BUYER:${name}`, `Buyer: ${name}`)}
                  title={`Filter by ${name}`}
                >
                  <strong style={{ color: isSelectedBuyer ? '#2563eb' : undefined }}>{name}</strong>
                  <div>
                    <i style={{ width: `${(value / maxBuyer) * 100}%`, backgroundColor: isSelectedBuyer ? '#2563eb' : undefined }} />
                  </div>
                  <span>{value.toLocaleString()} pcs</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Capacity Heatmap */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Section Capacity</div>
              <div className="panel-sub">Line loading by department</div>
            </div>
            <Link className="text-link" href="/modules/capacity">Planning →</Link>
          </div>
          {heat ? (
            <div className="heatmap-table">
              <div className="heat-head">
                <span>Section</span><span>Slot 1</span><span>Slot 2</span><span>Slot 3</span>
              </div>
              {heat.rows.map((r: any) => (
                <div className="heat-row" key={r.section}>
                  <strong>{r.label}</strong>
                  {r.slots.map((s: any) => (
                    <span key={s.slot} className={`heat-cell ${heatClass(s.loadPct)}`}>{s.loadPct}%</span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><strong>Heatmap loading…</strong></div>
          )}
        </div>
      </section>

      {/* FILTER NOTIFICATION BANNER (Shows active card/buyer filter with reset button) */}
      {selectedFilterType !== 'ALL' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '8px 14px', margin: '8px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>🎯</span>
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700 }}>
              Filtered by: <u>{selectedFilterLabel}</u> ({filteredRows.length.toLocaleString()} matching jobs)
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedFilterType('ALL'); setSelectedFilterLabel('All Confirmed Jobs'); }}
            style={{
              border: 0, background: '#2563eb', color: '#fff', fontSize: '11px',
              fontWeight: 700, padding: '4px 12px', borderRadius: '5px', cursor: 'pointer'
            }}
          >
            Clear Filter ✕
          </button>
        </div>
      )}

      {/* INTERACTIVE PENDING WORK LIST (Shown when Pending Work is selected) */}
      {selectedFilterType === 'PENDING_WORK' && (
        <section className="panel" style={{ margin: '8px 0 14px', border: '1px solid #fbbf24', borderRadius: '12px', background: '#fffbeb', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <strong style={{ fontSize: '13px', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Work Queue ({tasks.length} Action Items)</strong>
            </div>
            <Link href="/tasks" className="btn btn-secondary btn-compact" style={{ background: '#fff', borderColor: '#d97706', color: '#b45309' }}>View All Tasks →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {tasks.map((t: any) => (
              <div key={t.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: t.priority === 'CRITICAL' ? '#fee2e2' : '#fef3c7', color: t.priority === 'CRITICAL' ? '#991b1b' : '#92400e' }}>
                    {t.priority}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Due: {t.dueAt}</span>
                </div>
                <strong style={{ fontSize: '12px', color: '#0f172a' }}>{t.title}</strong>
                <div style={{ fontSize: '11px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Job #{t.order?.jobNo} · {t.order?.buyer?.name}</span>
                  <span style={{ textTransform: 'capitalize', color: '#2563eb', fontWeight: 600 }}>{t.module}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const found = allManagementRows.find((r: any) => r.jobNo === t.order?.jobNo);
                      if (found) setSelectedJob(found);
                    }}
                    className="btn btn-secondary btn-compact"
                    style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                  >
                    360 View
                  </button>
                  <Link
                    href={`/modules/${t.module}`}
                    className="btn btn-primary btn-compact"
                    style={{ flex: 1, padding: '4px 6px', fontSize: '11px', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Open Section
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FULL OPERATIONAL REGISTER & MASTER DATA TABLE */}
      <section className="operational-register">
        <div className="register-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Operational Job Register</strong>
              <span className="status-pill" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: 700 }}>
                {filteredRows.length.toLocaleString()} Jobs Active
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Click any row to open 360 View</span>
          </div>

          {/* NON-FORM FILTER TOOLBAR (Prevents page reload) */}
          <div className="register-controls-single-row">
            <input
              type="text"
              placeholder="Search Job, Buyer, Style..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setCurrentPage(1);
                  (e.target as HTMLElement).blur();
                }
              }}
              className="reg-search-compact"
              style={{ fontWeight: 600 }}
            />
            <select
              value={weekFilter}
              onChange={e => { setWeekFilter(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Shipment Week"
            >
              <option value="ALL">Week: All</option>
              {weekOptions.map((w: string) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={e => { setMonthFilter(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Shipment Month"
            >
              <option value="ALL">Month: All</option>
              {monthOptions.map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={floorUnitFilter}
              onChange={e => { setFloorUnitFilter(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Floor/Line"
            >
              <option value="ALL">Floor/Line: All</option>
              {floorUnitOptions.map((f: string) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={merchFilter}
              onChange={e => { setMerchFilter(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Merchandiser"
            >
              <option value="ALL">Merch: All</option>
              {merchOptions.map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={presentStatusFilter}
              onChange={e => { setPresentStatusFilter(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Present Status"
            >
              <option value="ALL">Status: All</option>
              {presentStatusOptions.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={buyerFilter}
              onChange={e => { setBuyerFilter(e.target.value); setSelectedFilterType('ALL'); setCurrentPage(1); }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Buyer"
            >
              <option value="ALL">Buyer: All</option>
              {buyerOptions.map((b: string) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Apply Button */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="reg-btn-compact"
              style={{ background: '#2563eb', color: '#fff', borderColor: '#2563eb', fontWeight: 800, minWidth: '75px' }}
              title="Apply filters"
            >
              Apply
            </button>

            {/* Reset Filters Button */}
            {(weekFilter !== 'ALL' || monthFilter !== 'ALL' || floorUnitFilter !== 'ALL' || merchFilter !== 'ALL' || presentStatusFilter !== 'ALL' || buyerFilter !== 'ALL' || searchQuery !== '' || selectedFilterType !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setWeekFilter('ALL');
                  setMonthFilter('ALL');
                  setFloorUnitFilter('ALL');
                  setMerchFilter('ALL');
                  setPresentStatusFilter('ALL');
                  setBuyerFilter('ALL');
                  setSearchQuery('');
                  setSelectedFilterType('ALL');
                  setSelectedFilterLabel('All Confirmed Jobs');
                  setCurrentPage(1);
                }}
                className="reg-btn-compact"
                style={{ background: '#fff1f2', color: '#be123c', borderColor: '#fecdd3', fontWeight: 800 }}
                title="Reset all filters"
              >
                ✕ Reset
              </button>
            )}

            <button
              type="button"
              onClick={exportCsv}
              className="reg-btn-compact"
              title="Export CSV"
            >
              Export
            </button>
          </div>
        </div>

        {/* SUMMARY PANEL FOR CURRENTLY FILTERED JOBS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
          padding: '12px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
              📦
            </div>
            <div>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 800, display: 'block' }}>
                Total Order Quantity
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {totalQty.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>pcs</span>
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
              🏷️
            </div>
            <div>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 800, display: 'block' }}>
                Active Buyers Count
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {filteredBuyersCount} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>accounts</span>
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
              🏭
            </div>
            <div>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 800, display: 'block' }}>
                Total Lines Involved
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {filteredLinesCount} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>lines</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Data Table with Frozen/Sticky Scroll and Sticky Headers */}
        <div className="register-table-wrap" data-sticky-horizontal-scroll="true" style={{ maxHeight: '62vh', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
          <table className="register-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <tr>
                <th>Job No</th>
                <th>Buyer</th>
                <th>Style & Item</th>
                <th style={{ textAlign: 'right' }}>Order Qty</th>
                <th>Floor/Line</th>
                <th>Merchandiser</th>
                <th>Week</th>
                <th>Ex-Factory</th>
                <th>Present Status</th>
                <th style={{ textAlign: 'center' }}>Section Status</th>
                <th style={{ textAlign: 'center' }}>360 View</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r: any, idx: number) => {
                const statusCls = /passed|released|shipped|ok|completed/i.test(r.sectionStatus)
                  ? 'ok'
                  : /hold|attention|fail|late/i.test(r.sectionStatus)
                  ? 'attention'
                  : 'running';

                const displayJob = String(displayJobNo(r.jobNo, r.buyerCode || r.buyer)).replace(/\s+(\d)(st|nd|rd|th)/i, ' ($1$2)');
                const jobUrl = `/jobs/${encodeURIComponent(r.jobNo)}`;

                return (
                  <tr
                    key={r.orderId}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fcfdfe', cursor: 'pointer' }}
                    onClick={() => { setSelectedJob(r); setModalTab('sizes'); }}
                    title={`Click to open 360 View for Job ${r.jobNo}`}
                  >
                    <td style={{ whiteSpace: 'nowrap' }} onClick={e => { e.stopPropagation(); setSelectedJob(r); setModalTab('sizes'); }}>
                      <button
                        type="button"
                        className="job-link"
                        style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                      >
                        {displayJob}
                      </button>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                      {r.buyer}
                    </td>
                    <td style={{ maxWidth: '220px', minWidth: '150px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.25' }} title={r.styleNo}>
                        {r.styleNo}
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }} title={r.itemDescription}>
                        {r.itemDescription || '—'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: '#0f172a' }}>
                      {n(r.orderQty)} <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 400 }}>pcs</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: '#1e40af' }}>
                      {r.floorLine}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                      {r.merchandiser}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600 }}>
                      {r.shipmentWeek}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#0f172a' }}>
                      {d2(r.exFactoryDate)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="register-status-badge neutral">{r.presentStatus}</span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span className={`register-status-badge ${statusCls}`}>
                        {r.sectionStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setSelectedJob(r); setModalTab('sizes'); }}
                        className="btn btn-primary"
                        style={{ padding: '3px 9px', fontSize: '11px', fontWeight: 800, borderRadius: '5px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        360 View ↗
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔍</div>
                    <div style={{ fontWeight: 700, color: '#475569' }}>No records found matching your filters</div>
                    <button
                      onClick={() => {
                        setSelectedFilterType('ALL'); setSelectedFilterLabel('All Confirmed Jobs');
                        setSearchQuery(''); setWeekFilter('ALL'); setMonthFilter('ALL');
                        setFloorUnitFilter('ALL'); setMerchFilter('ALL'); setPresentStatusFilter('ALL'); setBuyerFilter('ALL');
                      }}
                      style={{ marginTop: '8px', border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer with Working 10, 15, 20, 25, 50, 100 Page Sizes */}
        <div className="register-pagination">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + (filteredRows.length > 0 ? 1 : 0)}</strong> to <strong>{Math.min(currentPage * pageSize, filteredRows.length)}</strong> of <strong>{filteredRows.length.toLocaleString()}</strong> jobs
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Page size:</span>
              {[10, 15, 20, 25, 50, 100].map(sz => (
                <button
                  type="button"
                  key={sz}
                  onClick={(e) => {
                    e.preventDefault();
                    changePageSize(sz);
                  }}
                  className={`size-pill-btn ${pageSize === sz ? 'active' : ''}`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="reg-page-btn"
            >
              ← Previous
            </button>
            <span style={{ padding: '0 8px', fontWeight: 750, color: '#0f172a' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="reg-page-btn"
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* QUICK WORKSPACES */}
      <section className="panel quick-panel" style={{ marginTop: '16px' }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Quick Workspaces</div>
            <div className="panel-sub">Role-relevant operational entry points</div>
          </div>
        </div>
        <div className="quick-grid">
          <Link href="/modules/merchandising" className="quick-card"><span className="quick-icon">ME</span><div><strong>Merchandising</strong><span>Follow-up & production status</span></div></Link>
          <Link href="/modules/ta" className="quick-card"><span className="quick-icon">CP</span><div><strong>Central Planning</strong><span>T&A → heatmap → Gantt</span></div></Link>
          <Link href="/modules/job-360" className="quick-card"><span className="quick-icon">J3</span><div><strong>Job 360</strong><span>Production, testing, quality & lead time</span></div></Link>
          <Link href="/modules/yarn" className="quick-card"><span className="quick-icon">YM</span><div><strong>Yarn Management</strong><span>Stock, pipeline & risk</span></div></Link>
          <Link href="/modules/quality-history" className="quick-card"><span className="quick-icon">QH</span><div><strong>Quality History</strong><span>Section release & test reports</span></div></Link>
          <Link href="/modules/shipment" className="quick-card"><span className="quick-icon">SH</span><div><strong>Shipment</strong><span>Readiness & delivery</span></div></Link>
        </div>
      </section>

      {/* JOB 360 MODAL WITH 6 COMPREHENSIVE TABS */}
      {selectedJob && jobProfile && (
        <div className="modal-backdrop-360" onClick={() => setSelectedJob(null)}>
          <div className="modal-dialog-360" onClick={e => e.stopPropagation()} style={{ maxWidth: '1040px' }}>
            <div className="modal-header-360">
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Garment Manufacturing 360 Profile · {selectedJob.floor}
                </span>
                <h3>
                  Job {displayJobNo(selectedJob.jobNo, selectedJob.buyerCode || selectedJob.buyer)} · {selectedJob.styleNo}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Buyer: <strong>{selectedJob.buyer}</strong> · Total Order: <strong>{n(selectedJob.orderQty)} pcs</strong> · Ex-Factory: <strong>{d2(selectedJob.exFactoryDate)}</strong> (Week {selectedJob.shipmentWeek}) · Merchandiser: <strong>{selectedJob.merchandiser}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href={`/jobs/${encodeURIComponent(selectedJob.jobNo)}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 11px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  target="_blank"
                >
                  Full Page ↗
                </Link>
                <button className="modal-close-btn" onClick={() => setSelectedJob(null)}>✕</button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 22px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'sizes' ? 'active' : ''}`}
                onClick={() => setModalTab('sizes')}
              >
                📏 Size &amp; PO Breakdown
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'material' ? 'active' : ''}`}
                onClick={() => setModalTab('material')}
              >
                🧵 Fabric &amp; Trims
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'production' ? 'active' : ''}`}
                onClick={() => setModalTab('production')}
              >
                🏭 Stage Production
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'quality' ? 'active' : ''}`}
                onClick={() => setModalTab('quality')}
              >
                🔍 Quality Log
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'leadtime' ? 'active' : ''}`}
                onClick={() => setModalTab('leadtime')}
              >
                ⏱️ T&amp;A Schedule
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'reports' ? 'active' : ''}`}
                onClick={() => setModalTab('reports')}
              >
                🧪 Lab Tests
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="view360-body">
              {/* TAB 1: SIZE-WISE & PO COUNTRY BREAKDOWN */}
              {modalTab === 'sizes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>Size-Wise Manufacturing Breakdown Matrix (Total: {n(selectedJob.orderQty)} pcs)</strong>
                      <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857' }}>Ratio: 1:2:3:3:2:1:0.5</span>
                    </div>
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          {jobProfile.sizeBreakdown.map(s => (
                            <th key={s.size} style={{ textAlign: 'center' }}>{s.size}</th>
                          ))}
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Order Ratio</td>
                          {jobProfile.sizeBreakdown.map(s => (
                            <td key={s.size} style={{ textAlign: 'center', color: '#64748b' }}>{s.ratio}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 800 }}>12.5</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Order Qty (pcs)</td>
                          {jobProfile.sizeBreakdown.map(s => (
                            <td key={s.size} style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{n(s.orderQty)}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 900, color: '#2563eb' }}>{n(selectedJob.orderQty)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Actual Cut (pcs)</td>
                          {jobProfile.sizeBreakdown.map(s => (
                            <td key={s.size} style={{ textAlign: 'center', color: '#475569' }}>{n(s.cutQty)}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 800 }}>{n(Math.round(selectedJob.orderQty * 1.025))}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Sewing Output</td>
                          {jobProfile.sizeBreakdown.map(s => (
                            <td key={s.size} style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{n(s.sewingQty)}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{n(selectedJob.orderQty)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Carton Packed</td>
                          {jobProfile.sizeBreakdown.map(s => (
                            <td key={s.size} style={{ textAlign: 'center', color: '#2563eb', fontWeight: 700 }}>{n(s.packedQty)}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>{n(selectedJob.orderQty)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>PO & Destination Country-Wise Shipment Allocation</strong>
                      <span className="status-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>5 Export Ports</span>
                    </div>
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>Destination Country</th>
                          <th>PO Number</th>
                          <th>Port of Discharge</th>
                          <th>Delivery Terms</th>
                          <th>Packaging Mode</th>
                          <th style={{ textAlign: 'right' }}>Cartons</th>
                          <th style={{ textAlign: 'right' }}>Order Qty</th>
                          <th style={{ textAlign: 'center' }}>Ship Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobProfile.poBreakdown.map((po, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>
                              <span style={{ marginRight: '6px' }}>{po.flag}</span> {po.country}
                            </td>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{po.poNo}</td>
                            <td>{po.port}</td>
                            <td><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{po.terms}</span></td>
                            <td>{po.packType}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{po.cartons} ctn</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{n(po.qty)} pcs</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="view360-badge ok">{po.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: FABRIC & MATERIAL SPECIFICATION */}
              {modalTab === 'material' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#fff' }}>
                    <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '10px' }}>Fabric & Yarn Specification</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#334155' }}>
                      <div><strong>Fabric Type:</strong> {jobProfile.fabricSpec.type}</div>
                      <div><strong>Fiber Composition:</strong> {jobProfile.fabricSpec.comp}</div>
                      <div><strong>Yarn Count:</strong> {jobProfile.fabricSpec.count}</div>
                      <div><strong>Weight / GSM:</strong> {jobProfile.fabricSpec.gsm}</div>
                      <div><strong>Cuttable Width:</strong> {jobProfile.fabricSpec.width}</div>
                      <div><strong>Yarn Mill Supplier:</strong> {jobProfile.yarnMill}</div>
                      <div><strong>Yarn Lot No:</strong> Lot #Y-26-{selectedJob.jobNo.slice(-4)}</div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#fff' }}>
                    <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '10px' }}>Dyeing & Finishing Parameters</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#334155' }}>
                      <div><strong>Approved Color Name:</strong> {jobProfile.colorSpec.name}</div>
                      <div><strong>Pantone TPG Ref:</strong> {jobProfile.colorSpec.pantone}</div>
                      <div><strong>Dyeing Factory & Winch:</strong> Northern Dyeing & Finishing (Winch #06)</div>
                      <div><strong>Dye Batch No:</strong> BD-26-{selectedJob.jobNo.slice(-3)}</div>
                      <div><strong>Finishing Process:</strong> Heat Setting Stenter + Compacting + Bio-Polish</div>
                      <div><strong>Print / Embroidery:</strong> Chest Logo Pigment Print (4-Color Strike-off Pass)</div>
                      <div><strong>Accessories / Trims:</strong> Oeko-Tex 100 Woven Label, YKK Zipper, Polybag</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STAGE-WISE PRODUCTION & IE METRICS */}
              {modalTab === 'production' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Order Quantity</span>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{n(selectedJob.orderQty)} pcs</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Sewing Actual Output</span>
                      <strong style={{ fontSize: '15px', color: '#16a34a' }}>{n(selectedJob.rawJob?.sewing?.sewingActualQty || selectedJob.orderQty)} pcs</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Carton Packed Qty</span>
                      <strong style={{ fontSize: '15px', color: '#2563eb' }}>{n(selectedJob.rawJob?.finishing?.packingQty || selectedJob.orderQty)} pcs</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Line Efficiency %</span>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{selectedJob.rawJob?.ie?.efficiencyPct || 80}%</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#fff' }}>
                      <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Yarn & Fabric Flow</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#475569' }}>
                        <div><strong>Yarn Required:</strong> {n(selectedJob.rawJob?.yarn?.yarnReqKg || 2500)} kg</div>
                        <div><strong>Yarn Received:</strong> {n(selectedJob.rawJob?.yarn?.yarnReceivedKg || 2500)} kg</div>
                        <div><strong>Grey Produced:</strong> {n(selectedJob.rawJob?.knitting?.greyProducedKg || 2400)} kg</div>
                        <div><strong>Finish Delivered:</strong> {n(selectedJob.rawJob?.fabric?.fabricReceivedKg || 2350)} kg</div>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#fff' }}>
                      <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Cutting & Process Output</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#475569' }}>
                        <div><strong>Cuttable Pcs:</strong> {n(selectedJob.orderQty)} pcs</div>
                        <div><strong>Actual Cut Pcs:</strong> {n(selectedJob.rawJob?.cutting?.cuttingQty || selectedJob.orderQty)} pcs</div>
                        <div><strong>Cut Ratio:</strong> 102.5%</div>
                        <div><strong>Print/Emb Output:</strong> {n(selectedJob.orderQty)} pcs</div>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#fff' }}>
                      <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Sewing Line & IE Metrics</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#475569' }}>
                        <div><strong>Allocated Line:</strong> Line {selectedJob.line || '14B'} ({selectedJob.floor})</div>
                        <div><strong>Standard SMV:</strong> {selectedJob.rawJob?.ie?.smv || 7.5} min</div>
                        <div><strong>Daily Target:</strong> {n(selectedJob.rawJob?.ie?.dailyTarget || 2000)} pcs/day</div>
                        <div><strong>Line Manpower:</strong> {selectedJob.rawJob?.ie?.manpower || 30} operators</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: QUALITY ROOT CAUSE AUDIT LOG */}
              {modalTab === 'quality' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table className="view360-table">
                    <thead>
                      <tr>
                        <th>Section Process</th>
                        <th>Floor / Root Label</th>
                        <th>QI / Quality Controller</th>
                        <th>Date</th>
                        <th>Production Sample</th>
                        <th>Defect Issue & Major Root Cause</th>
                        <th style={{ textAlign: 'center' }}>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { section: '1. Knitting Greige Audit', root: 'Knitting Shed #1 · Machine #14', qi: 'Md. Rafiqul Islam (QI-KN04)', date: d2(selectedJob.dates?.tnaPlan), sample: '2,400 kg inspected', defect: 'Minor Lycra tension variation rectified; loop length ±2% within buyer tolerance.', status: 'PASSED' },
                        { section: '2. Greige Store Roll Check', root: 'Greige Fabric Store Bay 4', qi: 'M. A. Mannan (Store QC Lead)', date: d2(selectedJob.dates?.tnaPlan), sample: '100% Roll Barcode & Weight', defect: 'GSM 180 verified, 4-point inspection passed (<18 points/100 sq.yd).', status: 'RELEASED' },
                        { section: '3. Dyeing & Lab Dip Shade Matching', root: 'Dyeing Floor Winch #06', qi: 'Dr. Nazrul Islam (Dyeing Lab Head)', date: d2(selectedJob.dates?.cuttingStart), sample: 'Full Batch (2,350 kg)', defect: 'Shade matched vs master swatch under D65 / TL84; batch topping completed.', status: 'PASSED' },
                        { section: '4. Finished Fabric Store Inspection', root: 'Finished Fabric Store Rack B-12', qi: 'Jashim Uddin (QC Controller)', date: d2(selectedJob.dates?.cuttingStart), sample: '2,350 kg delivered', defect: 'Color fastness to wash Grade 4-5, shrinkage within allowable -3%.', status: 'RELEASED' },
                        { section: '5. Cutting Spread & Notch Inspection', root: 'Cutting Floor 1 · Auto Spreader #2', qi: 'Aminul Islam (Cutting QI)', date: d2(selectedJob.dates?.cuttingStart), sample: `${n(selectedJob.orderQty)} Cut Pcs`, defect: 'Pattern grain line & bundle numbering 100% verified; zero marker overlap.', status: 'PASSED' },
                        { section: '6. Print & Embroidery Audit', root: 'Print / Embroidery Unit 1', qi: 'Shahidul Alam (Print QI Officer)', date: d2(selectedJob.dates?.sewingStart), sample: '100 Pcs Strike-off + Run Sample', defect: 'Strike-off wash fastness passed, sharp edge registration maintained.', status: 'PASSED' },
                        { section: '7. Sewing In-Line & End-Line Quality', root: `${selectedJob.floor} · Line ${selectedJob.line || '14B'}`, qi: 'Tariqul Hasan (Senior Sewing QI)', date: d2(selectedJob.dates?.sewingStart), sample: `${n(selectedJob.orderQty)} Sewing Pcs`, defect: 'SPI 12 maintained; minor skip stitch at sleeve hem corrected during line balancing.', status: 'PASSED' },
                        { section: '8. Finishing & Ironing Inspection', root: 'Finishing Floor 1 · Tunnel Steam Press', qi: 'Rezaul Karim (Finishing QC Controller)', date: d2(selectedJob.dates?.sewingEnd), sample: `${n(selectedJob.orderQty)} Finished Garments`, defect: 'Ironing shine check ok; needle detector 1.0mm ferrous test 100% passed.', status: 'PASSED' },
                        { section: '9. Final Inspection & OQL Audit', root: 'Central QA Audit Room · AQL 2.5', qi: 'Kabir Hossain (Quality Assurance Manager)', date: d2(selectedJob.exFactoryDate), sample: '315 Pcs (AQL Level II Sample)', defect: 'Carton drop test pass, barcode scan pass, final shipment release signed.', status: 'PASSED' }
                      ].map((q, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 800, color: '#1e40af' }}>{q.section}</td>
                          <td style={{ fontWeight: 600 }}>{q.root}</td>
                          <td style={{ color: '#0f172a' }}>{q.qi}</td>
                          <td style={{ color: '#64748b' }}>{q.date}</td>
                          <td style={{ color: '#475569' }}>{q.sample}</td>
                          <td style={{ color: '#334155', maxWidth: '280px' }}>{q.defect}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="view360-badge ok">{q.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 5: ACTUAL LEAD TIME & SCHEDULE */}
              {modalTab === 'leadtime' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table className="view360-table">
                    <thead>
                      <tr>
                        <th>Milestone Stage</th>
                        <th>Planned Date</th>
                        <th>Actual Date</th>
                        <th>Duration / Lead Time</th>
                        <th>Variance</th>
                        <th style={{ textAlign: 'center' }}>Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { milestone: 'PO Order Confirmation', plan: d2(selectedJob.dates?.poReceived), actual: d2(selectedJob.dates?.poReceived), lead: 'Day 0', var: '0 Days', st: 'ON TIME' },
                        { milestone: 'T&A Planning Release', plan: d2(selectedJob.dates?.tnaPlan), actual: d2(selectedJob.dates?.tnaPlan), lead: '4 Days', var: '0 Days', st: 'ON TIME' },
                        { milestone: 'Fabric & Yarn In-House', plan: d2(selectedJob.dates?.tnaPlan), actual: d2(selectedJob.dates?.tnaPlan), lead: '10 Days', var: '0 Days', st: 'ON TIME' },
                        { milestone: 'Cutting Execution', plan: d2(selectedJob.dates?.cuttingStart), actual: d2(selectedJob.dates?.cuttingEnd), lead: '4 Days', var: '0 Days', st: 'ON TIME' },
                        { milestone: 'Sewing Line Output', plan: d2(selectedJob.dates?.sewingStart), actual: d2(selectedJob.dates?.sewingEnd), lead: '13 Days', var: '0 Days', st: 'ON TIME' },
                        { milestone: 'Final Inspection & Ex-Factory', plan: d2(selectedJob.exFactoryDate), actual: d2(selectedJob.exFactoryDate), lead: '48 Days Total', var: '0 Days', st: 'ON TIME' },
                        { milestone: 'Cargo Closing & Delivery', plan: d2(selectedJob.dates?.cargoClosing), actual: d2(selectedJob.dates?.cargoClosing), lead: '52 Days Total', var: '0 Days', st: 'ON TIME' }
                      ].map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 800, color: '#1e40af' }}>{m.milestone}</td>
                          <td style={{ color: '#475569' }}>{m.plan}</td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{m.actual}</td>
                          <td style={{ color: '#64748b' }}>{m.lead}</td>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>{m.var}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="view360-badge ok">{m.st}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 6: CERTIFIED TESTING LAB REPORTS */}
              {modalTab === 'reports' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table className="view360-table">
                    <thead>
                      <tr>
                        <th>Test Standard & Method</th>
                        <th>Certificate Ref</th>
                        <th>Test Result</th>
                        <th>Buyer Requirement</th>
                        <th>Tested By</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobProfile.testReports.map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 800, color: '#1e40af' }}>{t.test}</td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{t.certNo}</td>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>{t.result}</td>
                          <td style={{ color: '#475569' }}>{t.std}</td>
                          <td style={{ color: '#64748b' }}>{t.analyst}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="view360-badge ok">PASSED</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="view360-footer">
              <Link
                href="/modules/job-360"
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '8px 14px' }}
                onClick={() => setSelectedJob(null)}
              >
                Open Full Job 360 Workspace →
              </Link>
              <button
                onClick={() => setSelectedJob(null)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '8px 14px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
