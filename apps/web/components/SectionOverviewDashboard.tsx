'use client';

import Link from 'next/link';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { MODULE_GROUPS, SectionOverview } from '../lib/modules';
import { displayJobNo } from '../lib/display';
import demo2000DataRaw from '../data/demo-2000-master.json';

function n(v: any) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}
function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0;
}
function scalar(v: any) {
  return typeof v === 'number' ? v : Number(v || 0);
}

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

// Calculate week string from date (e.g. "W33")
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

const masterJobs = (demo2000DataRaw as any)?.jobs || [];

// Compact Donut Chart with Exact Data Labels
function SvgDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 110;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="donut-flex">
      <div className="donut-svg-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {data.map((item, i) => {
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += item.value / total;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="donut-center-text">
          <span className="donut-center-val">{total.toLocaleString()}</span>
          <span className="donut-center-lbl">Total Jobs</span>
        </div>
      </div>

      <div className="donut-legend-col">
        {data.map((item, i) => (
          <div key={i} className="donut-legend-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span className="donut-legend-dot" style={{ backgroundColor: item.color }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px', color: '#475569' }} title={item.label}>
                {item.label}
              </span>
            </div>
            <strong style={{ fontSize: '11px', color: '#0f172a', whiteSpace: 'nowrap' }}>
              {Math.round((item.value / total) * 100)}% <span style={{ color: '#94a3b8', fontWeight: 500 }}>({item.value})</span>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact Multi-Bar Chart with Data Labels on bars
function SvgBarChart({ data }: { data: { label: string; value1: number; value2?: number; color1?: string; color2?: string }[] }) {
  const maxVal = Math.max(1, ...data.flatMap(d => [d.value1, d.value2 || 0]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div className="bar-chart-flex">
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-bars">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#1e40af', marginBottom: '1px' }}>
                  {d.value1 >= 1000 ? `${(d.value1 / 1000).toFixed(0)}k` : d.value1}
                </span>
                <div
                  className="bar-fill"
                  style={{ height: `${Math.max(6, (d.value1 / maxVal) * 70)}px`, backgroundColor: d.color1 || '#2563eb' }}
                  title={`${d.label} (Plan): ${d.value1.toLocaleString()}`}
                />
              </div>
              {d.value2 !== undefined && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#047857', marginBottom: '1px' }}>
                    {d.value2 >= 1000 ? `${(d.value2 / 1000).toFixed(0)}k` : d.value2}
                  </span>
                  <div
                    className="bar-fill"
                    style={{ height: `${Math.max(6, (d.value2 / maxVal) * 70)}px`, backgroundColor: d.color2 || '#10b981' }}
                    title={`${d.label} (Actual): ${d.value2.toLocaleString()}`}
                  />
                </div>
              )}
            </div>
            <span className="bar-lbl" title={d.label}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '6px', fontSize: '10px', color: '#64748b' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2563eb', display: 'inline-block' }} /> Plan / Qty
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }} /> Produced
        </span>
      </div>
    </div>
  );
}

// Compact Trend Area Chart with Exact Numeric Labels above each point
function SvgTrendChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(1, ...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));
  const range = maxVal - minVal || 1;
  const width = 300;
  const height = 75;
  const padX = 14;
  const padY = 16;
  const gw = width - padX * 2;
  const gh = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1 || 1)) * gw;
    const y = height - padY - ((d.value - minVal) / range) * gh;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <div className="trend-chart-box">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '75px', display: 'block' }}>
        <defs>
          <linearGradient id="trendGradientFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#trendGradientFill)" />
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#1e40af">
              {p.value}%
            </text>
          </g>
        ))}
      </svg>
      <div className="trend-axis">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// Generate complete garment manufacturing profile (Sizes, PO/Countries, Fabric Spec, Tests)
function generateJobManufacturingProfile(job: any) {
  const qty = Number(job.orderQty || 3000);
  const jobSeed = parseInt(String(job.jobNo).replace(/\D/g, ''), 10) || 45000;

  // 1. Size Breakdown (XS, S, M, L, XL, 2XL, 3XL)
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

  // 2. PO & Country Breakdown
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

  // 3. Fabric & Material Specification
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

  // 4. Lab Test Reports
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

function buildSectionData(slug: string) {
  const initialOrders = masterJobs.map((j: any) => ({
    id: j.id,
    jobNo: j.jobNo,
    totalQty: j.orderQty,
    buyer: { name: j.buyer, code: j.buyer },
    styles: [{
      id: `s-${j.jobNo}`,
      quantity: j.orderQty,
      sourceMetadata: {
        merchandisingFollowUp: { presentStatus: j.presentStatus }
      }
    }]
  }));

  const initialTasks = [
    { id: 't-1', title: 'Batch Topping & Shade Rectification', module: 'dyeing', priority: 'HIGH', status: 'PENDING' },
    { id: 't-2', title: 'PP Sample Fabric Approval for Name It', module: 'merchandising', priority: 'CRITICAL', status: 'PENDING' },
    { id: 't-3', title: 'Line 14B Shifting Manpower Balancing', module: 'sewing', priority: 'HIGH', status: 'IN_PROGRESS' },
    { id: 't-4', title: 'AOP Strike-off Dispatch to Unifill', module: 'dyeing', priority: 'NORMAL', status: 'PENDING' },
    { id: 't-5', title: 'Yarn Lot Quality Test Report Verification', module: 'yarn-store', priority: 'NORMAL', status: 'COMPLETED' }
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

  const initialTa = masterJobs.slice(0, 100).map((j: any) => ({
    id: j.id,
    jobNo: j.jobNo,
    buyer: j.buyer,
    styleNo: j.styleNo,
    orderQty: j.orderQty,
    taStatus: 'APPROVED',
    taPlanDate: j.dates?.tnaPlan,
    exFactoryDate: j.dates?.exFactory
  }));

  const allSectionRows = masterJobs.map((j: any) => {
    let sectionStatus = 'In Progress';
    let sec1Label = 'T&A Plan';
    let sec1Val: any = j.dates?.tnaPlan || '—';
    let sec2Label = 'Line';
    let sec2Val: any = j.lineAllocation?.line ? `Line ${j.lineAllocation.line}` : 'Unassigned';
    let sec3Label = 'Ex-Factory';
    let sec3Val: any = j.dates?.exFactory || '—';

    if (slug === 'central-planning') {
      sectionStatus = j.lineAllocation?.status === 'RELEASED' ? 'Plan Released' : 'In Planning';
      sec1Label = 'T&A Plan'; sec1Val = j.dates?.tnaPlan || '—';
      sec2Label = 'Sewing Line'; sec2Val = `Line ${j.lineAllocation?.line || '1A'} (${j.lineAllocation?.factory || 'NFL'})`;
      sec3Label = 'Ex-Factory'; sec3Val = j.dates?.exFactory || '—';
    } else if (slug === 'garment-production') {
      sectionStatus = j.sewing?.status === 'COMPLETED' ? 'Sewing Completed' : 'Running';
      sec1Label = 'Cutting Qty'; sec1Val = `${n(j.cutting?.cuttingQty || j.orderQty)} pcs`;
      sec2Label = 'Sewing Actual'; sec2Val = `${n(j.sewing?.sewingActualQty || j.orderQty)} pcs`;
      sec3Label = 'Packed Qty'; sec3Val = `${n(j.finishing?.packingQty || j.orderQty)} pcs`;
    } else if (slug === 'quality-stores') {
      sectionStatus = j.finishing?.inspectionStatus === 'PASSED' ? 'Released / Clear' : 'Hold / Attention';
      sec1Label = 'Lab Test'; sec1Val = `ISO Pass`;
      sec2Label = 'Yarn Lot No'; sec2Val = j.yarn?.yarnLotNo || 'Standard';
      sec3Label = 'Inspection'; sec3Val = j.finishing?.inspectionStatus || 'PASSED';
    } else if (slug === 'yarn-fabric') {
      sectionStatus = j.fabric?.fabricBalanceKg === 0 ? 'In House / Ready' : 'Dyeing / Knitting';
      sec1Label = 'Yarn Req (KG)'; sec1Val = `${n(j.yarn?.yarnReqKg || 2500)} kg`;
      sec2Label = 'Grey Produced'; sec2Val = `${n(j.knitting?.greyProducedKg || 2400)} kg`;
      sec3Label = 'Dye Batch'; sec3Val = j.fabric?.dyeBatchNo || 'BD-019';
    } else if (slug === 'ie-overview') {
      sectionStatus = j.ie?.bulletinStatus === 'RELEASED' ? 'IE Released' : 'In Progress';
      sec1Label = 'SMV'; sec1Val = `${j.ie?.smv || 7.5} min`;
      sec2Label = 'Manpower'; sec2Val = `${j.ie?.manpower || 30} ops`;
      sec3Label = 'Daily Target'; sec3Val = `${n(j.ie?.dailyTarget || 2000)} pcs`;
    } else if (slug === 'sample-cad-technical') {
      sectionStatus = 'Sample Approved';
      sec1Label = 'Sample Status'; sec1Val = 'PP Approved';
      sec2Label = 'Marker Effic.'; sec2Val = '85.4%';
      sec3Label = 'Fabric Width'; sec3Val = j.fabric?.widthDia || '76"';
    } else if (slug === 'merchandising-overview') {
      sectionStatus = j.presentStatus || 'Order Confirmed';
      sec1Label = 'Merchandiser'; sec1Val = j.merchandiser || 'Merchandiser';
      sec2Label = 'Stage'; sec2Val = j.overallStage || 'Production';
      sec3Label = 'Ex-Factory'; sec3Val = j.dates?.exFactory || '—';
    } else {
      sectionStatus = j.shipment?.status === 'SHIPPED' ? 'Shipped' : 'Ready / Preparing';
      sec1Label = 'Ship Qty'; sec1Val = `${n(j.shipment?.shipQty || j.orderQty)} pcs`;
      sec2Label = 'Balance Qty'; sec2Val = `${n(j.shipment?.shipBalance || 0)} pcs`;
      sec3Label = 'Cargo Closing'; sec3Val = j.dates?.cargoClosing || '—';
    }

    const factory = j.lineAllocation?.factory || 'NFL';
    const rawFloor = j.lineAllocation?.floor || 'Floor 1';
    let floorLabel = `${factory} 1`;
    if (rawFloor.includes('2') || rawFloor.includes('02')) floorLabel = `${factory} 2`;
    else if (rawFloor.includes('3') || rawFloor.includes('03')) floorLabel = `${factory} 3`;
    else floorLabel = `${factory} 1`;

    const exDate = j.dates?.exFactory || '2026-08-15';
    const shipmentWeek = getWeekNumber(exDate);
    const shipmentMonth = d2(j.planMonth || exDate.substring(0, 7));

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
      merchandiser: j.merchandiser || 'Md. Jahidul Islam',
      shipmentMonth,
      shipmentWeek,
      exFactoryDate: exDate,
      presentStatus: j.presentStatus || 'Confirmed',
      sectionStatus,
      sec1Label, sec1Val,
      sec2Label, sec2Val,
      sec3Label, sec3Val,
      dates: j.dates,
      line: j.lineAllocation?.line,
      rawJob: j
    };
  });

  return { initialOrders, initialTasks, allSectionRows, initialTa, initialHeat };
}

export default function SectionOverviewDashboard({ overview }: { overview: SectionOverview }) {
  const init = useMemo(() => buildSectionData(overview.slug), [overview.slug]);
  const [orders, setOrders] = useState<any[]>(init.initialOrders);
  const [tasks, setTasks] = useState<any[]>(init.initialTasks);
  const [allRows, setAllRows] = useState<any[]>(init.allSectionRows);
  const [ta, setTa] = useState<any[]>(init.initialTa);
  const [heat, setHeat] = useState<any>(init.initialHeat);
  const [loading, setLoading] = useState(false);

  // Filters: Search, Week, Month, Merchandiser, Floor/Unit, Present Status, Buyer
  const [searchQuery, setSearchQuery] = useState('');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [merchFilter, setMerchFilter] = useState('ALL');
  const [floorUnitFilter, setFloorUnitFilter] = useState('ALL'); // Combined NFL 1..3, NCL 1..3
  const [presentStatusFilter, setPresentStatusFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [cardFilterIndex, setCardFilterIndex] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Job 360 Rich Modal State
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'sizes' | 'material' | 'quality' | 'production' | 'leadtime' | 'reports'>('sizes');

  useEffect(() => {
    (async () => {
      try {
        const base = await Promise.all([
          api('/orders').catch(() => null),
          api('/tasks/my').catch(() => null),
          api(`/demo/module/${overview.representativeSlug}`).catch(() => null)
        ]);
        if (Array.isArray(base[0]) && base[0].length) setOrders(base[0]);
        if (Array.isArray(base[1]) && base[1].length) setTasks(base[1]);
        if (['central-planning', 'management'].includes(overview.slug)) {
          const h = await api('/planning/capacity/heatmap').catch(() => null);
          if (h?.rows) setHeat(h);
        }
        if (overview.slug === 'central-planning') {
          const t = await api('/planning/ta/workqueue').catch(() => null);
          if (Array.isArray(t) && t.length) setTa(t);
        }
      } catch {
        // Keep initial values
      } finally {
        setLoading(false);
      }
    })();
  }, [overview.slug, overview.representativeSlug]);

  const group = MODULE_GROUPS.find(g => g.overviewSlug === overview.slug);

  // Facts & KPIs
  const facts = useMemo(() => {
    const totalQty = allRows.reduce((s, o) => s + scalar(o.orderQty), 0);
    const critical = tasks.filter(t => ['HIGH', 'CRITICAL'].includes(String(t.priority).toUpperCase())).length;
    const attention = allRows.filter(r => /hold|attention|late|fail|preparing/i.test(String(r.sectionStatus || ''))).length;

    if (overview.slug === 'central-planning') {
      const approved = allRows.filter(x => /released|approved/i.test(x.sectionStatus)).length;
      const maxLoad = heat ? Math.max(0, ...heat.rows.flatMap((r: any) => r.slots.map((s: any) => Number(s.loadPct || 0)))) : 98;
      return {
        cards: [
          ['T&A Queue', allRows.length, 'Confirmed jobs'],
          ['Approved T&A', approved, 'Released to lines'],
          ['Draft / Planning', allRows.length - approved, 'Planning work'],
          ['Max Capacity Load', `${maxLoad}%`, 'Peak sewing/dyeing']
        ]
      };
    }
    if (overview.slug === 'garment-production') {
      const totalCut = allRows.reduce((s, r) => s + scalar(r.orderQty), 0);
      const totalSewn = allRows.reduce((s, r) => s + scalar(r.rawJob?.sewing?.sewingActualQty || r.orderQty), 0);
      const totalPacked = allRows.reduce((s, r) => s + scalar(r.rawJob?.finishing?.packingQty || r.orderQty), 0);
      return {
        cards: [
          ['Order Qty', n(totalQty), 'pcs total volume'],
          ['Cutting Output', n(totalCut), 'pcs spread & cut'],
          ['Sewing Output', n(totalSewn), 'pcs line produced'],
          ['Packed & Ready', n(totalPacked), 'pcs cartons ready']
        ]
      };
    }
    if (overview.slug === 'quality-stores') {
      const clear = allRows.filter(r => /passed|released|clear/i.test(r.sectionStatus)).length;
      return {
        cards: [
          ['Jobs Monitored', allRows.length, 'Quality & audit scope'],
          ['Released / Clear', clear, 'Passed inspection'],
          ['Hold / Attention', attention, 'Under observation'],
          ['Active QC Tasks', tasks.length, 'Action items']
        ]
      };
    }
    if (overview.slug === 'yarn-fabric') {
      const reqKg = allRows.reduce((s, r) => s + scalar(r.rawJob?.yarn?.yarnReqKg || 2500), 0);
      const recKg = allRows.reduce((s, r) => s + scalar(r.rawJob?.yarn?.yarnReceivedKg || 2500), 0);
      return {
        cards: [
          ['Tracked Jobs', allRows.length, 'Yarn & fabric flow'],
          ['Yarn Required', `${n(reqKg)} KG`, 'Requirement total'],
          ['Yarn In-House', `${n(recKg)} KG`, 'Received stock'],
          ['Material Gap', attention, 'Pending clearance']
        ]
      };
    }
    return {
      cards: [
        ['Active Jobs', allRows.length, 'Confirmed jobs'],
        ['Total Order Qty', n(totalQty), 'pcs total volume'],
        ['Critical Tasks', critical, 'Urgent actions'],
        ['Section Readiness', `${pct(allRows.length - attention, allRows.length)}%`, 'On-track rate']
      ]
    };
  }, [overview.slug, allRows, tasks, heat]);

  // Chart Data Calculations
  const donutData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRows) {
      const st = r.sectionStatus || 'In Progress';
      counts.set(st, (counts.get(st) || 0) + 1);
    }
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return [...counts.entries()].slice(0, 4).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length]
    }));
  }, [allRows]);

  const barData = useMemo(() => {
    const buyerMap = new Map<string, { plan: number; actual: number }>();
    for (const r of allRows) {
      const b = r.buyer || 'Unknown';
      const cur = buyerMap.get(b) || { plan: 0, actual: 0 };
      cur.plan += Number(r.orderQty || 0);
      cur.actual += Number(r.rawJob?.sewing?.sewingActualQty || r.rawJob?.shipment?.shipQty || r.orderQty);
      buyerMap.set(b, cur);
    }
    return [...buyerMap.entries()]
      .sort((a, b) => b[1].plan - a[1].plan)
      .slice(0, 5)
      .map(([label, val]) => ({
        label,
        value1: val.plan,
        value2: val.actual,
        color1: '#2563eb',
        color2: '#10b981'
      }));
  }, [allRows]);

  const trendData = useMemo(() => {
    return [
      { label: 'W31', value: 82 },
      { label: 'W32', value: 88 },
      { label: 'W33', value: 91 },
      { label: 'W34', value: 89 },
      { label: 'W35', value: 95 },
      { label: 'W36', value: 94 },
      { label: 'W37', value: 97 }
    ];
  }, []);

  // Filtered rows for the Data Register Table
  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      // Card selection filter
      if (cardFilterIndex === 1) {
        if (!/released|completed|shipped|ok/i.test(r.sectionStatus)) return false;
      } else if (cardFilterIndex === 2) {
        if (/complete|shipped/i.test(r.sectionStatus)) return false;
      } else if (cardFilterIndex === 3) {
        if (!/hold|attention|late|fail|preparing/i.test(r.sectionStatus)) return false;
      }

      if (weekFilter !== 'ALL' && r.shipmentWeek !== weekFilter) return false;
      if (monthFilter !== 'ALL' && r.shipmentMonth !== monthFilter) return false;
      if (merchFilter !== 'ALL' && r.merchandiser !== merchFilter) return false;
      if (floorUnitFilter !== 'ALL' && r.floor !== floorUnitFilter) return false;
      if (presentStatusFilter !== 'ALL' && r.presentStatus !== presentStatusFilter) return false;
      if (buyerFilter !== 'ALL' && r.buyer !== buyerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = `${r.jobNo} ${r.buyer} ${r.styleNo} ${r.itemDescription || ''} ${r.merchandiser || ''}`.toLowerCase();
        if (!match.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, cardFilterIndex, weekFilter, monthFilter, merchFilter, floorUnitFilter, presentStatusFilter, buyerFilter, searchQuery]);

  // Options for all filters
  const weekOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.shipmentWeek))).filter(Boolean).sort(), [allRows]);
  const monthOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.shipmentMonth))).filter(Boolean).sort(), [allRows]);
  const merchOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.merchandiser))).filter(Boolean).sort(), [allRows]);
  const presentStatusOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.presentStatus))).filter(Boolean).sort(), [allRows]);
  const buyerOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.buyer))).filter(Boolean).sort(), [allRows]);

  // Combined 6 Floor / Unit Options: NFL 1, 2, 3 and NCL 1, 2, 3
  const floorUnitOptions = ['NFL 1', 'NFL 2', 'NFL 3', 'NCL 1', 'NCL 2', 'NCL 3'];

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Page size changer that resets to page 1
  function changePageSize(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  // CSV Export function
  function exportCsv() {
    const headers = ['Job No', 'Buyer', 'Style No', 'Item Description', 'Order Qty', 'Floor/Unit', 'Merchandiser', 'Week', 'Ship Month', 'Present Status', 'Section Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(r => [
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
    link.setAttribute('download', `${overview.slug}_operational_register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Selected job complete manufacturing profile (Sizes, PO/Countries, Fabric Spec, Tests)
  const jobProfile = useMemo(() => {
    if (!selectedJob) return null;
    return generateJobManufacturingProfile(selectedJob);
  }, [selectedJob]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      {/* 1. TOP STAT CARDS (Clickable: filters table and dashboard below) */}
      <section className="section-overview-kpis">
        {facts.cards.map((c: any, i: number) => {
          const isCardActive = cardFilterIndex === i;
          return (
            <div
              className={`metric-card compact-metric ${i === 0 ? 'accent-blue' : i === 2 ? 'accent-amber' : ''}`}
              style={{
                cursor: 'pointer',
                border: isCardActive ? '2px solid #2563eb' : undefined,
                boxShadow: isCardActive ? '0 4px 14px rgba(37,99,235,0.2)' : undefined,
                transition: 'all .2s ease'
              }}
              onClick={() => {
                setCardFilterIndex(cardFilterIndex === i ? null : i);
                setCurrentPage(1);
              }}
              title={`Click to filter table by ${c[0]}`}
              key={c[0]}
            >
              <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{c[0]}</span>
                {isCardActive && <span style={{ fontSize: '9px', color: '#2563eb', fontWeight: 800 }}>ACTIVE</span>}
              </div>
              <div className="metric-value">{loading ? '…' : c[1]}</div>
              <div className="metric-foot">{c[2]}</div>
            </div>
          );
        })}
      </section>

      {/* FILTER NOTIFICATION BANNER */}
      {cardFilterIndex !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '8px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>🎯</span>
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700 }}>
              Filtered by Card: <u>{facts.cards[cardFilterIndex]?.[0]}</u> ({filteredRows.length.toLocaleString()} matching jobs)
            </span>
          </div>
          <button
            onClick={() => setCardFilterIndex(null)}
            style={{
              border: 0, background: '#2563eb', color: '#fff', fontSize: '11px',
              fontWeight: 700, padding: '3px 10px', borderRadius: '5px', cursor: 'pointer'
            }}
          >
            Clear Card Filter ✕
          </button>
        </div>
      )}

      {/* 2. TOP MULTI-GRAPH ANALYTICS WITH DATA LABELS */}
      <section className="section-graphs-row">
        {/* Chart 1: Donut Distribution */}
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Status Distribution</div>
              <div className="chart-card-sub">Active job status mix with %</div>
            </div>
            <span className="status-pill" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Real-time</span>
          </div>
          <SvgDonut data={donutData} />
        </div>

        {/* Chart 2: Buyer Multi-Bar Histogram with Numeric Data Labels */}
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Volume by Key Buyer</div>
              <div className="chart-card-sub">Order vs Produced (pcs with labels)</div>
            </div>
            <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857' }}>Capacity</span>
          </div>
          <SvgBarChart data={barData} />
        </div>

        {/* Chart 3: Progression Trend Line with Exact Data Labels */}
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Weekly Achievement Trend</div>
              <div className="chart-card-sub">Trajectory with exact % data labels</div>
            </div>
            <span className="status-pill" style={{ background: '#faf5ff', color: '#7e22ce' }}>Trend</span>
          </div>
          <SvgTrendChart data={trendData} />
        </div>
      </section>

      {/* 3. WORK AREAS QUICK LINKS */}
      {group && group.items.length > 0 && (
        <section className="panel" style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '.06em', marginBottom: '8px' }}>
            Quick Navigation · {overview.label} Work Areas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
            {group.items.map(item => (
              <Link
                href={`/modules/${item.slug}`}
                key={item.slug}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none'
                }}
              >
                <span style={{
                  width: '26px', height: '26px', borderRadius: '6px', background: '#eff6ff',
                  color: '#1d4ed8', fontWeight: 800, fontSize: '10px', display: 'grid', placeItems: 'center', flexShrink: 0
                }}>
                  {item.short}
                </span>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <strong style={{ display: 'block', fontSize: '11px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </strong>
                  <span style={{ display: 'block', fontSize: '9px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. NICHE: OPERATIONAL REGISTER (SINGLE-ROW COMPACT TOOLBAR) */}
      <section className="operational-register">
        <div className="register-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{overview.label} Operational Register</strong>
              <span className="status-pill" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px' }}>
                {filteredRows.length.toLocaleString()} Active Jobs
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Connected factory records · Click any row for Size & Country Breakdown</span>
          </div>

          {/* STRICT SINGLE-LINE FILTER TOOLBAR (No wrapping, compact font) */}
          <div className="register-controls-single-row">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search Job, Buyer, Style..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="reg-search-compact"
            />

            {/* Shipment Week Filter */}
            <select
              value={weekFilter}
              onChange={e => { setWeekFilter(e.target.value); setCurrentPage(1); }}
              className="reg-select-compact"
              title="Shipment Week"
            >
              <option value="ALL">📅 Week: All</option>
              {weekOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Shipment Month Filter */}
            <select
              value={monthFilter}
              onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }}
              className="reg-select-compact"
              title="Shipment Month"
            >
              <option value="ALL">🗓️ Month: All</option>
              {monthOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Floor / Unit Single Filter (NFL 1..3, NCL 1..3) */}
            <select
              value={floorUnitFilter}
              onChange={e => { setFloorUnitFilter(e.target.value); setCurrentPage(1); }}
              className="reg-select-compact"
              title="Floor & Factory Unit"
            >
              <option value="ALL">🏢 Floor: All</option>
              {floorUnitOptions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {/* Merchandiser Filter */}
            <select
              value={merchFilter}
              onChange={e => { setMerchFilter(e.target.value); setCurrentPage(1); }}
              className="reg-select-compact"
              title="Merchandiser"
            >
              <option value="ALL">👤 Merch: All</option>
              {merchOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Present Status Filter */}
            <select
              value={presentStatusFilter}
              onChange={e => { setPresentStatusFilter(e.target.value); setCurrentPage(1); }}
              className="reg-select-compact"
              title="Present Status"
            >
              <option value="ALL">⚡ Status: All</option>
              {presentStatusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Buyer Filter */}
            <select
              value={buyerFilter}
              onChange={e => { setBuyerFilter(e.target.value); setCurrentPage(1); }}
              className="reg-select-compact"
              title="Buyer"
            >
              <option value="ALL">🏷️ Buyer: All</option>
              {buyerOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Export CSV Button */}
            <button
              onClick={exportCsv}
              className="reg-btn-compact"
              title="Export CSV"
            >
              <span>📥</span> Export
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="register-table-wrap">
          <table className="register-table">
            <thead>
              <tr>
                <th>Job No</th>
                <th>Buyer</th>
                <th>Style & Item</th>
                <th style={{ textAlign: 'right' }}>Order Qty</th>
                <th>Floor / Unit</th>
                <th>Merchandiser</th>
                <th>Week</th>
                <th>Ex-Factory</th>
                <th>Present Status</th>
                <th style={{ textAlign: 'center' }}>Section Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => {
                const statusCls = /passed|released|shipped|ok|completed/i.test(r.sectionStatus)
                  ? 'ok'
                  : /hold|attention|fail|late/i.test(r.sectionStatus)
                  ? 'attention'
                  : 'running';

                const displayJob = String(displayJobNo(r.jobNo, r.buyerCode || r.buyer)).replace(/\s+(\d)(st|nd|rd|th)/i, ' ($1$2)');

                return (
                  <tr
                    key={r.orderId}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fcfdfe', cursor: 'pointer' }}
                    onClick={() => setSelectedJob(r)}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="job-link">{displayJob}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                      {r.buyer}
                    </td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${r.styleNo} · ${r.itemDescription || ''}`}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.styleNo}</span>
                      {r.itemDescription && <span style={{ color: '#64748b' }}> · {r.itemDescription}</span>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: '#0f172a' }}>
                      {n(r.orderQty)} <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 400 }}>pcs</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: '#1e40af' }}>
                      {r.floor}{r.line ? ` (${r.line.startsWith('L-') ? r.line : `L-${r.line}`})` : ''}
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
                        onClick={() => setSelectedJob(r)}
                        className="btn btn-primary"
                        style={{ padding: '2px 7px', fontSize: '10.5px', fontWeight: 600, borderRadius: '4px', whiteSpace: 'nowrap' }}
                      >
                        View 360 ↗
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
                        setSearchQuery(''); setWeekFilter('ALL'); setMonthFilter('ALL');
                        setMerchFilter('ALL'); setFloorUnitFilter('ALL'); setPresentStatusFilter('ALL'); setBuyerFilter('ALL');
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

        {/* Pagination Footer with Working 10, 15, 25, 50, 100 Page Sizes */}
        <div className="register-pagination">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + (filteredRows.length > 0 ? 1 : 0)}</strong> to <strong>{Math.min(currentPage * pageSize, filteredRows.length)}</strong> of <strong>{filteredRows.length.toLocaleString()}</strong> jobs
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Page size:</span>
              {[10, 15, 25, 50, 100].map(sz => (
                <button
                  key={sz}
                  onClick={() => changePageSize(sz)}
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

      {/* 5. JOB 360 MODAL WITH COMPREHENSIVE GARMENT MANUFACTURING BREAKDOWN */}
      {selectedJob && jobProfile && (
        <div className="modal-backdrop-360" onClick={() => setSelectedJob(null)}>
          <div className="modal-dialog-360" onClick={e => e.stopPropagation()} style={{ maxWidth: '1040px' }}>
            {/* Modal Header */}
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
              <button className="modal-close-btn" onClick={() => setSelectedJob(null)}>✕</button>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 22px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <button
                className={`size-pill-btn ${modalTab === 'sizes' ? 'active' : ''}`}
                onClick={() => setModalTab('sizes')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                📏 Size & PO Country Breakdown
              </button>
              <button
                className={`size-pill-btn ${modalTab === 'material' ? 'active' : ''}`}
                onClick={() => setModalTab('material')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                🧵 Fabric & Material Spec
              </button>
              <button
                className={`size-pill-btn ${modalTab === 'production' ? 'active' : ''}`}
                onClick={() => setModalTab('production')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                🏭 Stage-Wise Production & IE
              </button>
              <button
                className={`size-pill-btn ${modalTab === 'quality' ? 'active' : ''}`}
                onClick={() => setModalTab('quality')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                🔍 Quality Root Cause Log
              </button>
              <button
                className={`size-pill-btn ${modalTab === 'leadtime' ? 'active' : ''}`}
                onClick={() => setModalTab('leadtime')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                ⏱️ Lead Time & Schedule
              </button>
              <button
                className={`size-pill-btn ${modalTab === 'reports' ? 'active' : ''}`}
                onClick={() => setModalTab('reports')}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                🧪 Lab Test Reports
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="view360-body">
              {/* TAB 1: SIZE-WISE & PO COUNTRY BREAKDOWN */}
              {modalTab === 'sizes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Size Matrix Table */}
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

                  {/* PO & Country-Wise Breakdown */}
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

              {/* TAB 3: STAGE-WISE PRODUCTION & IE TARGET */}
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

            {/* Modal Footer */}
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
    </div>
  );
}
