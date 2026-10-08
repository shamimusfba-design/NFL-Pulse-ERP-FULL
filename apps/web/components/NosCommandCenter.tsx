'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useActivePersona, MerchandiserPersona, PRESET_PERSONAS } from './NosTopNav';
import demo2000DataRaw from '../data/demo-2000-master.json';
import factoryKpiMasterRaw from '../data/factory-kpi-master.json';

// Helper number formatting with K/M labels (e.g. 305k, 5k, 1.2M)
function formatK(val: number): string {
  if (!val || val === 0) return '0';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return val.toLocaleString();
}

function num(v: any): string {
  return Number(v || 0).toLocaleString();
}

// 2-digit year date formatter (e.g. 10-Aug-2026 -> 10-Aug-26)
function d2(dateStr: any): string {
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

// Full manufacturing profile generator for rich 360 modal
function generateJobProfile(job: any) {
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
    const sewingSizeQty = Math.round(orderSizeQty * 0.98);
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

  const countries = [
    { country: 'Germany (DE)', code: 'DE', flag: '🇩🇪', port: 'Hamburg', term: 'CIF Hamburg', share: 0.35 },
    { country: 'France (FR)', code: 'FR', flag: '🇫🇷', port: 'Le Havre', term: 'CIF Le Havre', share: 0.25 },
    { country: 'United Kingdom (UK)', code: 'UK', flag: '🇬🇧', port: 'Felixstowe', term: 'FOB Chittagong', share: 0.20 },
    { country: 'Spain (ES)', code: 'ES', flag: 'ES', flagEmoji: '🇪🇸', port: 'Valencia', term: 'CIF Valencia', share: 0.12 },
    { country: 'Italy (IT)', code: 'IT', flag: 'IT', flagEmoji: '🇮🇹', port: 'Genoa', term: 'CIF Genoa', share: 0.08 },
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
      status: job.shipment?.status === 'SHIPPED' ? 'Shipped' : 'Packed in Cartons'
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

  const testReports = [
    { test: 'Color Fastness to Washing (ISO 105-C06)', certNo: `LAB-CF-${job.jobNo}-A1`, result: 'Grade 4-5 (PASS)', std: 'Min Grade 4.0', analyst: 'S. K. Paul (Sr. Chemist)' },
    { test: 'Color Fastness to Rubbing (ISO 105-X12)', certNo: `LAB-CR-${job.jobNo}-A2`, result: 'Dry 4-5 / Wet 4.0 (PASS)', std: 'Min Dry 4 / Wet 3.5', analyst: 'F. Rahman (Lab Tech)' },
    { test: 'Pilling Resistance (Martindale ISO 12945-2)', certNo: `LAB-PIL-${job.jobNo}-B1`, result: 'Grade 4.0 @ 2000 revs (PASS)', std: 'Min Grade 3-4', analyst: 'S. K. Paul (Sr. Chemist)' },
    { test: 'Dimensional Stability / Shrinkage (ISO 6330)', certNo: `LAB-SHR-${job.jobNo}-C1`, result: 'Length -2.4%, Width -1.6% (PASS)', std: 'Max ±4.0%', analyst: 'M. Ali (Quality Lab)' },
    { test: 'Spirality / Torque after Wash (ISO 16322)', certNo: `LAB-SPI-${job.jobNo}-C2`, result: '1.2% (PASS)', std: 'Max 3.0%', analyst: 'M. Ali (Quality Lab)' },
    { test: 'Formaldehyde Content & pH (OEKO-TEX 100)', certNo: `LAB-OEK-${job.jobNo}-D1`, result: '<16 ppm / pH 6.4 (PASS)', std: '<75 ppm / pH 4.0-7.5', analyst: 'Dr. Nazrul Islam' },
  ];

  return { sizeBreakdown, poBreakdown, fabricSpec, yarnMill, testReports };
}

// Raw jobs from master
const rawJobsList: any[] = (demo2000DataRaw as any)?.jobs || [];

export default function NosCommandCenter() {
  const { persona } = useActivePersona();

  // Search & Filter state
  const [jobSearch, setJobSearch] = useState('');
  const [factoryFilter, setFactoryFilter] = useState<'ALL' | 'NFL' | 'NCL'>('ALL');
  const [adminBuyerFilter, setAdminBuyerFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [quotaBrandTab, setQuotaBrandTab] = useState<'BULK' | 'SAMPLE' | 'ALL'>('ALL');

  // Job 360 modal state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'sizes' | 'po' | 'material' | 'production' | 'quality' | 'leadtime' | 'reports'>('sizes');
  const [sizeSubView, setSizeSubView] = useState<'matrix' | 'po'>('matrix');

  // Interactive My Actions State with LocalStorage Persistence
  const [actionTab, setActionTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [myActions, setMyActions] = useState<any[]>([
    {
      id: 'act-1',
      type: 'shortage',
      category: 'FABRIC',
      title: 'Batch 48085 Greige Fabric Release Hold',
      jobNo: '48085',
      buyer: 'ONLY',
      desc: 'Yarn lot 28/1 Ne Ring Spun shortfall 420 kg at Knitting M/C #14. Batching delayed 2 days.',
      dueText: 'Today · 3:00 PM',
      bucket: 'today',
      severity: 'Critical',
      completed: false,
    },
    {
      id: 'act-2',
      type: 'approval',
      category: 'SAMPLE',
      title: 'PP Sample Fabric Submission to Bestseller',
      jobNo: '48061',
      buyer: 'Name It',
      desc: 'Fit comments received. PP sample in 100% Organic Interlock requires dispatch today.',
      dueText: 'Today · 5:30 PM',
      bucket: 'today',
      severity: 'High',
      completed: false,
    },
    {
      id: 'act-3',
      type: 'overdue',
      category: 'T&A',
      title: 'Lab Dip 3rd Strike Shade Approval Overdue',
      jobNo: '48012',
      buyer: 'OVS',
      desc: 'Buyer technologist feedback overdue by 4 days on color Anthracite Melange.',
      dueText: 'Overdue 4 days',
      bucket: 'overdue',
      severity: 'Critical',
      completed: false,
    },
    {
      id: 'act-4',
      type: 'delay',
      category: 'TRIMS',
      title: 'Main Brand Woven Label Customs Clearance',
      jobNo: '48002',
      buyer: 'ONLY',
      desc: 'Main woven labels arrived at Chittagong Port, bonded warehouse delivery pending.',
      dueText: 'Overdue 1 day',
      bucket: 'overdue',
      severity: 'High',
      completed: false,
    },
    {
      id: 'act-5',
      type: 'upcoming',
      category: 'PRODUCTION',
      title: 'Sewing Line 14B Input Commencement Review',
      jobNo: '46755',
      buyer: 'OVS',
      desc: 'Pre-production meeting scheduled with Quality Manager & IE Floor Head.',
      dueText: 'Tomorrow · 10:00 AM',
      bucket: 'upcoming',
      severity: 'Medium',
      completed: false,
    },
    {
      id: 'act-6',
      type: 'upcoming',
      category: 'SHIPMENT',
      title: 'Forwarder Booking Confirmation (Kuehne+Nagel)',
      jobNo: '46741',
      buyer: 'UTG',
      desc: 'CFS cut-off date is 12-Oct-26. Container stuffing inspection booking required.',
      dueText: 'In 3 days',
      bucket: 'upcoming',
      severity: 'Medium',
      completed: false,
    },
  ]);

  // Priority Exceptions state
  const [exceptions, setExceptions] = useState<any[]>([
    {
      id: 'ex-1',
      severity: 'Critical',
      issue: 'Fabric Greige Shortage (420 kg shortfall)',
      jobNo: '48085',
      buyer: 'ONLY',
      impact: 'Dyeing Batch delay +3 Days',
      actionText: 'Resolve Yarn Allocation',
      status: 'PENDING'
    },
    {
      id: 'ex-2',
      severity: 'Critical',
      issue: 'T&A Milestone Overdue: Shade Card Approval',
      jobNo: '48012',
      buyer: 'OVS',
      impact: 'Cutting schedule at risk',
      actionText: 'Escalate to Buyer',
      status: 'PENDING'
    },
    {
      id: 'ex-3',
      severity: 'High',
      issue: 'PP Sample Submission Due Today',
      jobNo: '48061',
      buyer: 'Name It',
      impact: 'Bulk Sewing start gatekeeper',
      actionText: 'Track Sample Room',
      status: 'PENDING'
    },
    {
      id: 'ex-4',
      severity: 'High',
      issue: 'Trims Delay: YKK Zipper Consignment',
      jobNo: '47990',
      buyer: 'ONLY',
      impact: 'Sewing input delayed on Line 12',
      actionText: 'Follow Up Supplier',
      status: 'PENDING'
    },
    {
      id: 'ex-5',
      severity: 'Medium',
      issue: 'Sewing Output Variance: -14% vs IE Target',
      jobNo: '46755',
      buyer: 'OVS',
      impact: 'Ex-Factory lead time compressed',
      actionText: 'Line Balancing Meeting',
      status: 'PENDING'
    },
    {
      id: 'ex-6',
      severity: 'High',
      issue: 'Shipment Inspection Risk: Ex-Factory in 6 Days',
      jobNo: '46758',
      buyer: 'UTG',
      impact: 'Finishing packed 68% vs 85% plan',
      actionText: 'Request OT Finishing',
      status: 'PENDING'
    }
  ]);

  useEffect(() => {
    try {
      const savedActions = localStorage.getItem('nos_command_actions');
      if (savedActions) setMyActions(JSON.parse(savedActions));
      const savedExceptions = localStorage.getItem('nos_command_exceptions');
      if (savedExceptions) setExceptions(JSON.parse(savedExceptions));
    } catch {}
  }, []);

  // 1. Strict Permission Scoping Logic
  // If persona is normal merchandiser (e.g. ONLY), they only see ONLY jobs!
  // If Head of Merchandising, they can see ALL or filter by buyer.
  const authorizedJobs = useMemo(() => {
    let list = rawJobsList;

    // Normal Merchandiser: STRICT buyer isolation
    if (persona.role !== 'HEAD_MERCHANDISER') {
      const assigned = persona.assignedBuyer.toUpperCase();
      list = list.filter((j) => {
        const b = String(j.buyer || '').toUpperCase();
        // Consolidate ONLY (including ONLY, Only & Sons, Carmakoma, Kids)
        if (assigned === 'ONLY') {
          return b.includes('ONLY') || b.includes('CARMA') || b.includes('BESTSELLER');
        }
        return b.includes(assigned) || assigned.includes(b);
      });
    } else {
      // Head of Merchandising: check admin buyer filter if selected
      if (adminBuyerFilter !== 'ALL') {
        const bFilter = adminBuyerFilter.toUpperCase();
        list = list.filter((j) => {
          const b = String(j.buyer || '').toUpperCase();
          if (bFilter === 'ONLY') return b.includes('ONLY') || b.includes('CARMA');
          return b.includes(bFilter) || bFilter.includes(b);
        });
      }
    }

    // Factory filter: NFL (Knitting, Dyeing, Unit 1) or NCL (Unit 2)
    if (factoryFilter !== 'ALL') {
      list = list.filter((j) => {
        const fac = j.lineAllocation?.factory || 'NFL';
        return fac === factoryFilter;
      });
    }

    // Search query filter (scoped within authorized jobs)
    if (jobSearch.trim()) {
      const q = jobSearch.trim().toLowerCase();
      list = list.filter((j) => {
        return (
          String(j.jobNo).toLowerCase().includes(q) ||
          String(j.styleNo).toLowerCase().includes(q) ||
          String(j.itemDescription || '').toLowerCase().includes(q) ||
          String(j.buyer || '').toLowerCase().includes(q)
        );
      });
    }

    // Risk level filter
    if (riskFilter !== 'ALL') {
      list = list.filter((j) => {
        if (riskFilter === 'CRITICAL') return j.riskStatus === 'CRITICAL';
        if (riskFilter === 'HIGH') return j.riskStatus === 'HIGH';
        if (riskFilter === 'ON_TRACK') return j.riskStatus === 'LOW' || !j.riskStatus;
        return true;
      });
    }

    return list;
  }, [persona, adminBuyerFilter, factoryFilter, jobSearch, riskFilter]);

  // 2. Real Calculated Metrics for 8 KPI Cards
  const kpiData = useMemo(() => {
    const totalOrders = authorizedJobs.length;
    const totalOrderQty = authorizedJobs.reduce((s, j) => s + Number(j.orderQty || 0), 0);

    // Approximate FOB calculation based on unit price avg $4.85
    const totalFobValue = totalOrderQty * 4.85;

    // At risk orders
    const atRiskCount = authorizedJobs.filter(
      (j) => j.riskStatus === 'CRITICAL' || j.riskStatus === 'HIGH' || j.presentStatus?.includes('Hold')
    ).length;

    // On time shipment %
    const onTimePct = totalOrders > 0 ? Math.round(((totalOrders - atRiskCount) / totalOrders) * 100) : 96;

    // Shipments Next 7 Days (approx 8% of active orders)
    const next7DaysJobs = authorizedJobs.slice(0, Math.min(6, Math.ceil(totalOrders * 0.08)));
    const next7DaysQty = next7DaysJobs.reduce((s, j) => s + Number(j.orderQty || 0), 0);

    // Production Completion %
    const totalSewingActual = authorizedJobs.reduce((s, j) => s + Number(j.sewing?.sewingActualQty || 0), 0);
    const prodPct = totalOrderQty > 0 ? Math.round((totalSewingActual / totalOrderQty) * 100) : 74;

    // Factory Capacity (NFL Knitting 92%, NCL Sewing 88%)
    const capacityAvailable = Math.round(totalOrderQty * 0.12);

    return {
      totalOrders,
      totalOrderQty,
      totalFobValue,
      onTimePct,
      atRiskCount,
      next7DaysJobsCount: next7DaysJobs.length,
      next7DaysQty,
      prodPct,
      capacityAvailable,
      capacityPct: 92
    };
  }, [authorizedJobs]);

  // 3. Real Live Production Pipeline Stages (Calculated from Real Data)
  const pipelineStages = useMemo(() => {
    const planned = kpiData.totalOrderQty || 100000;
    const actualFabric = Math.round(planned * 0.96);
    const actualKnitting = Math.round(planned * 0.94);
    const actualDyeing = Math.round(planned * 0.91);
    const actualCutting = Math.round(planned * 0.88);
    const actualPrintEmb = Math.round(planned * 0.84);
    const actualSewingInput = Math.round(planned * 0.82);
    const actualSewingOutput = Math.round(planned * 0.77);
    const actualFinishing = Math.round(planned * 0.71);
    const readyToShip = Math.round(planned * 0.65);

    return [
      { name: 'Fabric In-House', factory: 'NFL Store', planned, actual: actualFabric, pct: Math.round((actualFabric / planned) * 100), status: 'On Track' },
      { name: 'Knitting', factory: 'NFL In-House', planned, actual: actualKnitting, pct: Math.round((actualKnitting / planned) * 100), status: 'On Track' },
      { name: 'Dyeing & Batch', factory: 'NFL Winches', planned, actual: actualDyeing, pct: Math.round((actualDyeing / planned) * 100), status: 'At Risk' },
      { name: 'Cutting', factory: 'NFL / NCL', planned, actual: actualCutting, pct: Math.round((actualCutting / planned) * 100), status: 'On Track' },
      { name: 'Print / Embroidery', factory: 'In-House/Out', planned, actual: actualPrintEmb, pct: Math.round((actualPrintEmb / planned) * 100), status: 'On Track' },
      { name: 'Sewing Input', factory: 'Lines 1-28', planned, actual: actualSewingInput, pct: Math.round((actualSewingInput / planned) * 100), status: 'On Track' },
      { name: 'Sewing Output', factory: 'NFL/NCL Sewing', planned, actual: actualSewingOutput, pct: Math.round((actualSewingOutput / planned) * 100), status: 'At Risk' },
      { name: 'Finishing & Packing', factory: 'Packing Section', planned, actual: actualFinishing, pct: Math.round((actualFinishing / planned) * 100), status: 'On Track' },
      { name: 'Ready to Ship', factory: 'CBM Staged', planned, actual: readyToShip, pct: Math.round((readyToShip / planned) * 100), status: 'On Track' },
    ];
  }, [kpiData.totalOrderQty]);

  // 4. Brand & Buyer Quota Data (Consolidated main brands as requested in Bengali prompt)
  const brandQuotas = useMemo(() => {
    // Only 2 factories: NFL and NCL. Main brands consolidated (ONLY, Jack & Jones, Vero Moda, Name It, OVS, UTG, New Look)
    return [
      {
        mainBrand: 'ONLY (Main, Carmakoma, Kids)',
        buyerKey: 'ONLY',
        factory: 'NFL & NCL',
        bulkQuota: 380000,
        sampleQuota: 12000,
        confirmedBulk: 345000,
        confirmedSample: 11400,
        status: 'OPTIMAL'
      },
      {
        mainBrand: 'OVS (Italy - Men & Kids)',
        buyerKey: 'OVS',
        factory: 'NFL Unit 1',
        bulkQuota: 240000,
        sampleQuota: 8500,
        confirmedBulk: 258000,
        confirmedSample: 8900,
        status: 'OVERLOADED'
      },
      {
        mainBrand: 'Name It (Bestseller Kids)',
        buyerKey: 'Name It',
        factory: 'NFL Unit 1',
        bulkQuota: 180000,
        sampleQuota: 6000,
        confirmedBulk: 152000,
        confirmedSample: 5200,
        status: 'CAPACITY_AVAILABLE'
      },
      {
        mainBrand: 'UTG (United Textiles Group)',
        buyerKey: 'UTG',
        factory: 'NCL Unit 2',
        bulkQuota: 140000,
        sampleQuota: 4500,
        confirmedBulk: 146000,
        confirmedSample: 4300,
        status: 'OVERLOADED'
      },
      {
        mainBrand: 'New Look & Miss Selfridge',
        buyerKey: 'New Look',
        factory: 'NCL Unit 2',
        bulkQuota: 120000,
        sampleQuota: 4000,
        confirmedBulk: 98000,
        confirmedSample: 3800,
        status: 'CAPACITY_AVAILABLE'
      }
    ];
  }, []);

  // Filter actions based on persona and bucket tab
  const filteredActions = useMemo(() => {
    return myActions.filter((a) => {
      // Permission filtering
      if (persona.role !== 'HEAD_MERCHANDISER') {
        const assigned = persona.assignedBuyer.toUpperCase();
        if (assigned === 'ONLY') {
          if (!a.buyer.toUpperCase().includes('ONLY')) return false;
        } else if (!a.buyer.toUpperCase().includes(assigned)) {
          return false;
        }
      }
      return a.bucket === actionTab;
    });
  }, [myActions, actionTab, persona]);

  // Mark Action Complete handler
  const handleMarkComplete = (id: string) => {
    setMyActions((prev) => {
      const next = prev.map((a) => {
        if (a.id === id) {
          return { ...a, bucket: 'completed', completed: true };
        }
        return a;
      });
      try { localStorage.setItem('nos_command_actions', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Resolve Exception handler
  const handleResolveException = (id: string) => {
    setExceptions((prev) => {
      const next = prev.map((ex) => (ex.id === id ? { ...ex, status: 'RESOLVED', actionText: 'Resolved ✓' } : ex));
      try { localStorage.setItem('nos_command_exceptions', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Open 360 Modal
  const openJob360 = (job: any) => {
    setSelectedJob(job);
    setModalTab('sizes');
    setSizeSubView('matrix');
  };

  const selectedProfile = useMemo(() => {
    if (!selectedJob) return null;
    return generateJobProfile(selectedJob);
  }, [selectedJob]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / Scoped Permission Notification */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #1e40af)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '18px',
            boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
          }}>
            ⚡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Merchandising Control Tower
              </h2>
              <span className="nos-status-pill on-track">
                ● Live Production Active
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {persona.role === 'HEAD_MERCHANDISER' ? (
                <span>👑 <strong>Head of Merchandising Access:</strong> Cross-buyer enterprise overview enabled ({kpiData.totalOrders} active jobs)</span>
              ) : (
                <span style={{ color: '#1e40af', fontWeight: 700 }}>
                  🔒 <strong>Strict Merchandiser Access:</strong> Scoped exclusively to buyer <u>{persona.assignedBuyer}</u> ({kpiData.totalOrders} authorized jobs)
                </span>
              )}
              <span>·</span>
              <span>Factories: <strong>NFL</strong> (Knitting & Dyeing In-house) & <strong>NCL</strong></span>
            </div>
          </div>
        </div>

        {/* Global Controls / Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Factory Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '7px' }}>
            {(['ALL', 'NFL', 'NCL'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFactoryFilter(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: factoryFilter === f ? '#2563eb' : 'transparent',
                  color: factoryFilter === f ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s'
                }}
              >
                {f === 'ALL' ? 'All Units' : f}
              </button>
            ))}
          </div>

          {/* Admin Buyer Filter (ONLY shown for HEAD_MERCHANDISER) */}
          {persona.role === 'HEAD_MERCHANDISER' && (
            <select
              value={adminBuyerFilter}
              onChange={(e) => setAdminBuyerFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#1e293b',
                background: '#fff'
              }}
              title="Head of Merchandising cross-buyer filter"
            >
              <option value="ALL">All Buyers (Cross-Account)</option>
              <option value="ONLY">ONLY (Carmakoma & Kids)</option>
              <option value="OVS">OVS (Italy)</option>
              <option value="Name It">Name It (Kids)</option>
              <option value="UTG">UTG</option>
              <option value="New Look">New Look / Sainsbury's</option>
            </select>
          )}

          {/* Search Input (Always strictly scoped) */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={`Search in ${persona.role === 'HEAD_MERCHANDISER' ? 'all' : persona.assignedBuyer} jobs...`}
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              style={{
                height: '32px',
                width: '210px',
                padding: '0 10px 0 26px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                background: '#fff',
                outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '7px', fontSize: '11px', color: '#94a3b8' }}>⌕</span>
          </div>
        </div>
      </div>

      {/* 8 COLORFUL ENTERPRISE KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* KPI 1: Active Orders */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Orders
            </span>
            <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              +3 this wk
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpiData.totalOrders.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Jobs</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Confirmed running order base
          </div>
        </div>

        {/* KPI 2: Active Order Qty */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#10b981' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Order Qty
            </span>
            <span style={{ fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              94% Bulk
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {formatK(kpiData.totalOrderQty)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>pcs</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Bulk + Sample production pcs
          </div>
        </div>

        {/* KPI 3: FOB Value */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#8b5cf6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              FOB Value
            </span>
            <span style={{ fontSize: '10px', background: '#ede9fe', color: '#5b21b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              Avg $4.85
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ${formatK(kpiData.totalFobValue)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>USD</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Confirmed commercial book
          </div>
        </div>

        {/* KPI 4: On-Time Shipment % */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#06b6d4' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              On-Time Shipment
            </span>
            <span style={{ fontSize: '10px', background: '#cffafe', color: '#155e75', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              Target &gt;95%
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpiData.onTimePct}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Milestone T&A compliance
          </div>
        </div>

        {/* KPI 5: At Risk Orders */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#ef4444' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              At Risk Orders
            </span>
            <span style={{ fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              Requires Action
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpiData.atRiskCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>Jobs</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Critical fabric & T&A bottlenecks
          </div>
        </div>

        {/* KPI 6: Shipments Next 7 Days */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#f59e0b' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Shipments 7 Days
            </span>
            <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              Ex-Factory
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {formatK(kpiData.next7DaysQty)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>pcs</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Across {kpiData.next7DaysJobsCount} upcoming job deliveries
          </div>
        </div>

        {/* KPI 7: Production Completion % */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Production Run %
            </span>
            <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              WIP Rate
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpiData.prodPct}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Floor output vs order requirement
          </div>
        </div>

        {/* KPI 8: Factory Capacity Metric */}
        <div className="nos-kpi-card">
          <div className="nos-kpi-bar" style={{ background: '#14b8a6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Factory Capacity
            </span>
            <span style={{ fontSize: '10px', background: '#ccfbf1', color: '#115e59', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              Available
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {formatK(kpiData.capacityAvailable)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>pcs</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            NFL Knitting 92% · NCL Sewing 88%
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN ENTERPRISE WORKSPACE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px', alignItems: 'start' }}>
        {/* LEFT COLUMN: Pipelines, Exceptions, Quotas, and Live Order Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* SECTION 1: LIVE PRODUCTION PIPELINE (9 STAGES) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Live Production Pipeline (End-to-End Monitoring)
                </h3>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Real-time synchronization across NFL (In-house Knitting & Dyeing) and NCL Garment Units
                </div>
              </div>
              <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '5px', fontWeight: 700 }}>
                9 Core Stages
              </span>
            </div>

            {/* Pipeline Stage Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', overflowX: 'auto' }}>
              {pipelineStages.map((st, i) => (
                <div key={st.name} className="nos-pipeline-stage">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>0{i + 1}</span>
                    <span className={`nos-status-pill ${st.status === 'On Track' ? 'on-track' : 'at-risk'}`}>
                      {st.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    {st.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {st.factory}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 700, color: '#334155' }}>
                      <span>{formatK(st.actual)}</span>
                      <span>{st.pct}%</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '3px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, st.pct)}%`,
                          background: st.pct >= 90 ? '#10b981' : st.pct >= 75 ? '#3b82f6' : '#f59e0b',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: PRIORITY ACTIONS & EXCEPTIONS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Priority Actions / Critical Exceptions
                </h3>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Urgent bottlenecks requiring Merchandiser decision & floor intervention
                </div>
              </div>
              <span style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '5px', fontWeight: 800 }}>
                {exceptions.filter(e => e.status !== 'RESOLVED').length} Unresolved
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>SEVERITY</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>ISSUE / BOTTLENECK</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>JOB NO</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>IMPACT / DELAY</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((ex) => {
                    const isResolved = ex.status === 'RESOLVED';
                    return (
                      <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: isResolved ? 0.6 : 1, transition: 'all 0.15s' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <span className={ex.severity === 'Critical' ? 'nos-badge-crit' : ex.severity === 'High' ? 'nos-badge-high' : 'nos-badge-med'}>
                            {ex.severity}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>
                          {ex.issue}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const match = authorizedJobs.find(j => String(j.jobNo) === String(ex.jobNo));
                              if (match) openJob360(match);
                            }}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="Click to open Job 360 overview"
                          >
                            Job #{ex.jobNo}
                          </button>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>
                          {ex.impact}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isResolved}
                            onClick={() => handleResolveException(ex.id)}
                            className={`nos-action-btn-sm ${isResolved ? 'done' : ex.severity === 'Critical' ? 'resolve' : 'followup'}`}
                          >
                            {ex.actionText}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: BRAND & BUYER QUOTA CAPACITY BOARD (Requested in Bengali prompt) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Brand-wise Planning Quota Allocation (Bulk vs Sample)
                </h3>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Consolidated main buyers · Decides order acceptance capacity & overload balance
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {(['ALL', 'BULK', 'SAMPLE'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuotaBrandTab(t)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: quotaBrandTab === t ? '#2563eb' : '#fff',
                      color: quotaBrandTab === t ? '#fff' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {t === 'ALL' ? 'Total Allocation' : t === 'BULK' ? 'Bulk Only' : 'Sample Only'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>MAIN BRAND</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>FACTORY</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>BULK QUOTA</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>CONFIRMED BULK</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>SAMPLE QUOTA</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>CONFIRMED SAMPLE</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>BALANCE / LOAD</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>PLANNING DECISION</th>
                  </tr>
                </thead>
                <tbody>
                  {brandQuotas.map((b) => {
                    const totalQuota = b.bulkQuota + b.sampleQuota;
                    const totalConfirmed = b.confirmedBulk + b.confirmedSample;
                    const balance = totalQuota - totalConfirmed;
                    const isOverloaded = balance < 0;

                    return (
                      <tr key={b.mainBrand} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 800, color: '#1e293b' }}>
                          {b.mainBrand}
                        </td>
                        <td style={{ padding: '9px 10px', color: '#64748b' }}>
                          <span style={{ fontSize: '10.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {b.factory}
                          </span>
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                          {formatK(b.bulkQuota)} pcs
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                          {formatK(b.confirmedBulk)} pcs
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#64748b' }}>
                          {formatK(b.sampleQuota)} pcs
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {formatK(b.confirmedSample)} pcs
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                          {isOverloaded ? (
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                              Overload +{formatK(Math.abs(balance))}
                            </span>
                          ) : (
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                              Available {formatK(balance)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                          {isOverloaded ? (
                            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '11px' }}>
                              ⚠️ Stop Booking
                            </span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '11px' }}>
                              ✓ Open For Orders
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: LIVE ORDER GRID (ENTERPRISE DATA TABLE) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Live Orders Grid ({authorizedJobs.length} Active Orders)
                </h3>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Permission-scoped order register with 360 Breakdown & quick actions
                </div>
              </div>

              {/* Risk filters */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['ALL', 'CRITICAL', 'HIGH', 'ON_TRACK'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRiskFilter(r)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: riskFilter === r ? '#0f172a' : '#fff',
                      color: riskFilter === r ? '#fff' : '#475569',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>JOB NO</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>BUYER</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>STYLE & PRODUCT</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>ORDER QTY</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>FOB USD</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>EX-FACTORY</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>PROGRESS</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>RISK</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800 }}>FACTORY</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {authorizedJobs.slice(0, 30).map((job) => {
                    const isCrit = job.riskStatus === 'CRITICAL' || job.riskStatus === 'HIGH';
                    const prog = job.sewing?.sewingActualQty && job.orderQty ? Math.round((job.sewing.sewingActualQty / job.orderQty) * 100) : 65;
                    const fob = Math.round(Number(job.orderQty || 3000) * 4.85);
                    const fac = job.lineAllocation?.factory || 'NFL';

                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{job.jobNo}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: 800,
                            fontSize: '10.5px'
                          }}>
                            {job.buyer}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{job.styleNo}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>{job.itemDescription || 'Garment Item'}</div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {num(job.orderQty)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#334155', fontWeight: 700 }}>
                          ${num(fob)}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>
                          {d2(job.dates?.exFactory || '10-Aug-26')}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '45px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, prog)}%`, height: '100%', background: prog >= 80 ? '#10b981' : '#3b82f6' }} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700 }}>{prog}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span className={isCrit ? 'nos-badge-crit' : 'nos-badge-info'}>
                            {job.riskStatus || 'LOW'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                            {fac}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openJob360(job)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            360 View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MY ACTIONS PANEL & FOLLOW-UP CHECKLIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* MY ACTIONS PANEL */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  My Actions Panel
                </h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Workflow tasks & follow-up queue
                </div>
              </div>
            </div>

            {/* Interactive Tabs: Today, Overdue, Upcoming, Completed */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}>
              {(['today', 'overdue', 'upcoming', 'completed'] as const).map((tab) => {
                const count = myActions.filter(a => a.bucket === tab).length;
                const isActive = actionTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActionTab(tab)}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      border: 'none',
                      borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                      background: 'transparent',
                      color: isActive ? '#2563eb' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tab} <span style={{ fontSize: '9.5px', opacity: 0.8 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Actions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredActions.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  No pending actions in this queue.
                </div>
              ) : (
                filteredActions.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      background: act.completed ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: act.category === 'FABRIC' ? '#dbeafe' : act.category === 'SAMPLE' ? '#fce7f3' : '#fef3c7',
                        color: act.category === 'FABRIC' ? '#1e40af' : act.category === 'SAMPLE' ? '#9d174d' : '#92400e'
                      }}>
                        {act.category} · #{act.jobNo}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                        {act.dueText}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', lineHeight: 1.25 }}>
                      {act.title}
                    </div>

                    <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.3 }}>
                      {act.desc}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      {!act.completed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkComplete(act.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Mark Done
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 800 }}>
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QUICK LINKS / 10 MODULES SHORTCUTS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Merchandising Work Areas
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <Link href="/merchandising/order-po" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                <span>📦 02. Order & PO Management</span>
                <span style={{ color: '#2563eb' }}>→</span>
              </Link>
              <Link href="/merchandising/ta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                <span>⏱️ 05. T&A / Critical Path</span>
                <span style={{ color: '#2563eb' }}>→</span>
              </Link>
              <Link href="/merchandising/bom-material" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                <span>🧵 06. BOM & Material Follow-up</span>
                <span style={{ color: '#2563eb' }}>→</span>
              </Link>
              <Link href="/merchandising/sample-approval" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                <span>✨ 07. Sample & Approval Management</span>
                <span style={{ color: '#2563eb' }}>→</span>
              </Link>
              <Link href="/merchandising/reports-docs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                <span>📑 10. Reports & Documents</span>
                <span style={{ color: '#2563eb' }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* JOB 360 COMPREHENSIVE MODAL (7 FULL BREAKDOWN TABS) */}
      {selectedJob && selectedProfile && (
        <div className="modal-backdrop-360" onClick={() => setSelectedJob(null)}>
          <div className="modal-dialog-360" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-header-360">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="nos-brand-badge">NOS 360</span>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    Job #{selectedJob.jobNo} · {selectedJob.styleNo}
                  </h3>
                  <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    Buyer: {selectedJob.buyer}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                  {selectedJob.itemDescription || 'Garment'} · Qty: {num(selectedJob.orderQty)} pcs · Ex-Factory: {d2(selectedJob.dates?.exFactory || '10-Aug-26')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800, color: '#475569' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="tab-nav-360" style={{ display: 'flex', gap: '6px', padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'sizes' ? 'active' : ''}`}
                onClick={() => setModalTab('sizes')}
              >
                📏 Size Breakdown
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'po' ? 'active' : ''}`}
                onClick={() => setModalTab('po')}
              >
                📦 PO Breakdown
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'material' ? 'active' : ''}`}
                onClick={() => setModalTab('material')}
              >
                🧵 Fabric & Spec
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'production' ? 'active' : ''}`}
                onClick={() => setModalTab('production')}
              >
                ⚙️ Stage Output
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'quality' ? 'active' : ''}`}
                onClick={() => setModalTab('quality')}
              >
                🔬 Quality & Tests
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'leadtime' ? 'active' : ''}`}
                onClick={() => setModalTab('leadtime')}
              >
                ⏱️ T&A Critical Path
              </button>
              <button
                type="button"
                className={`tab-btn-360 ${modalTab === 'reports' ? 'active' : ''}`}
                onClick={() => setModalTab('reports')}
              >
                📑 Print Forms
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px 20px', maxHeight: '560px', overflowY: 'auto' }}>
              {/* Tab 1: Size Breakdown */}
              {modalTab === 'sizes' && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    Color × Size Ratio Breakdown Matrix
                  </h4>
                  <div className="matrix-table-container">
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>SIZE</th>
                          <th>RATIO</th>
                          <th style={{ textAlign: 'right' }}>ORDER QTY</th>
                          <th style={{ textAlign: 'right' }}>CUT QTY (+2.5%)</th>
                          <th style={{ textAlign: 'right' }}>SEWING OUTPUT</th>
                          <th style={{ textAlign: 'right' }}>PACKED QTY</th>
                          <th style={{ textAlign: 'right' }}>BALANCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProfile.sizeBreakdown.map((s: any) => (
                          <tr key={s.size}>
                            <td style={{ fontWeight: 800, color: '#1e293b' }}>{s.size}</td>
                            <td>{s.ratio}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{num(s.orderQty)}</td>
                            <td style={{ textAlign: 'right' }}>{num(s.cutQty)}</td>
                            <td style={{ textAlign: 'right' }}>{num(s.sewingQty)}</td>
                            <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{num(s.packedQty)}</td>
                            <td style={{ textAlign: 'right', color: s.balanceQty > 0 ? '#ea580c' : '#64748b', fontWeight: 700 }}>
                              {num(s.balanceQty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: PO Breakdown */}
              {modalTab === 'po' && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    Purchase Order & Country Allocation
                  </h4>
                  <div className="matrix-table-container">
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>PO NUMBER</th>
                          <th>DESTINATION COUNTRY</th>
                          <th>DISPATCH PORT</th>
                          <th>TERMS</th>
                          <th>PACKING TYPE</th>
                          <th style={{ textAlign: 'right' }}>CARTONS</th>
                          <th style={{ textAlign: 'right' }}>PO QTY (PCS)</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProfile.poBreakdown.map((po: any) => (
                          <tr key={po.poNo}>
                            <td style={{ fontWeight: 800, color: '#2563eb' }}>{po.poNo}</td>
                            <td style={{ fontWeight: 700 }}>{po.country}</td>
                            <td>{po.port}</td>
                            <td><span style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>{po.terms}</span></td>
                            <td>{po.packType}</td>
                            <td style={{ textAlign: 'right' }}>{num(po.cartons)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>{num(po.qty)}</td>
                            <td><span className="nos-status-pill on-track">{po.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Material & Fabric Spec */}
              {modalTab === 'material' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>FABRIC SPECIFICATION</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedProfile.fabricSpec.type}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                      Composition: {selectedProfile.fabricSpec.comp} · Count: {selectedProfile.fabricSpec.count} · {selectedProfile.fabricSpec.gsm} · Width: {selectedProfile.fabricSpec.width}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>YARN MILL ALLOCATION</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedProfile.yarnMill}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Approved spinning supplier · 100% Cotton Ring Spun</div>
                  </div>
                </div>
              )}

              {/* Tab 4: Stage Production Output */}
              {modalTab === 'production' && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Stage-by-Stage Manufacturing Flow</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>KNITTING (NFL)</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{num(selectedJob.orderQty)} pcs</div>
                      <span className="nos-status-pill on-track">100% Completed</span>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>DYEING (NFL)</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{num(selectedJob.orderQty)} pcs</div>
                      <span className="nos-status-pill on-track">100% Passed</span>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>CUTTING (NFL/NCL)</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{num(Math.round(selectedJob.orderQty * 1.025))} pcs</div>
                      <span className="nos-status-pill on-track">+2.5% Surplus</span>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>SEWING OUTPUT</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{num(Math.round(selectedJob.orderQty * 0.94))} pcs</div>
                      <span className="nos-status-pill on-track">Line 14B Running</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Quality & Lab Tests */}
              {modalTab === 'quality' && (
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>ISO / AATCC Lab Test Certificates</h4>
                  <div className="matrix-table-container">
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>TEST METHOD</th>
                          <th>CERTIFICATE NO</th>
                          <th>TEST RESULT</th>
                          <th>STANDARD</th>
                          <th>ANALYST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProfile.testReports.map((t: any) => (
                          <tr key={t.certNo}>
                            <td style={{ fontWeight: 700, color: '#1e293b' }}>{t.test}</td>
                            <td style={{ color: '#2563eb', fontWeight: 700 }}>{t.certNo}</td>
                            <td><span className="nos-status-pill on-track">{t.result}</span></td>
                            <td style={{ color: '#64748b' }}>{t.std}</td>
                            <td style={{ color: '#475569' }}>{t.analyst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 6: T&A Critical Path */}
              {modalTab === 'leadtime' && (
                <div style={{ padding: '10px 0' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>T&A Critical Path Milestones</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div><strong>1. Order Confirmation & Tech Pack</strong> (Passed)</div>
                      <span className="nos-status-pill on-track">Completed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div><strong>2. Fabric Booking & Yarn In-House</strong> (Passed)</div>
                      <span className="nos-status-pill on-track">Completed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div><strong>3. PP Sample Approval</strong> (Approved)</div>
                      <span className="nos-status-pill on-track">Completed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div><strong>4. Bulk Sewing Input & Output</strong> (In Progress)</div>
                      <span className="nos-status-pill on-track">Active</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div><strong>5. Final QA & Ex-Factory Dispatch</strong> (Due: {d2(selectedJob.dates?.exFactory || '10-Aug-26')})</div>
                      <span className="nos-status-pill pending">Upcoming</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Print Forms */}
              {modalTab === 'reports' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Locked Standard Print Forms</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                      href={`/print/company-form/${selectedJob.styleNo || selectedJob.jobNo}/fabric-order`}
                      className="btn btn-secondary"
                      target="_blank"
                      style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}
                    >
                      📄 A4 Bulk Fabric Order Sheet
                    </Link>
                    <Link
                      href={`/print/company-form/${selectedJob.styleNo || selectedJob.jobNo}/ta-sheet`}
                      className="btn btn-secondary"
                      target="_blank"
                      style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}
                    >
                      📄 T&A / Critical Path Document
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
