'use client';

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import { displayJobNo } from '../../../lib/display';

export const dynamic = 'force-dynamic';

function n(v: any) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

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

function getWeekNumber(dateStr: any) {
  if (!dateStr) return 'W33';
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return `W${1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)}`;
  }
  return 'W33';
}

function generateJobManufacturingProfile(job: any) {
  const qty = Number(job.orderQty || 3000);
  const jobSeed = parseInt(String(job.jobNo).replace(/\D/g, ''), 10) || 45000;

  // Size Ratios (From imported Buyer PO Pack Sheet)
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
    return {
      size: item.size,
      ratio: item.ratio,
      orderQty: orderSizeQty,
      shippedQty: orderSizeQty, // Only PO Order Entry and Ex-Factory Shipment are tracked size-wise
    };
  });
  const sumOrder = sizeBreakdown.reduce((s, x) => s + x.orderQty, 0);
  if (sumOrder !== qty && sizeBreakdown.length > 2) {
    sizeBreakdown[2].orderQty += (qty - sumOrder);
    sizeBreakdown[2].shippedQty += (qty - sumOrder);
  }

  // PO & Destination Country Breakdown
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
      packType: i % 2 === 0 ? 'Ratio Pack (1:2:2:1)' : 'Solid Size Pack (24 pcs/ctn)',
      cartons: Math.ceil(poQty / 24),
      qty: poQty,
      status: job.shipment?.status === 'SHIPPED' ? 'Shipped' : 'Packed in Cartons'
    };
  });

  // Fabric & Trims Details
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

  // Trims Register
  const trimsBOM = [
    { item: 'Sewing Thread', spec: '100% Spun Poly 40/2 & 120 (Tex 24)', supplier: 'Aman Threads / Coats', required: `${Math.round(qty * 140 / 1000)} cones`, received: `${Math.round(qty * 140 / 1000)} cones`, balance: '0 cones', status: 'IN-HOUSE' },
    { item: 'Main Label', spec: 'High-Definition Damask Woven Label', supplier: 'Dekko Accessories Ltd', required: `${n(qty)} pcs`, received: `${n(qty)} pcs`, balance: '0 pcs', status: 'IN-HOUSE' },
    { item: 'Care / Wash Label', spec: 'Printed Satin Ribbon (4-Language)', supplier: 'Uniglory Paper & Packaging', required: `${n(qty)} pcs`, received: `${n(qty)} pcs`, balance: '0 pcs', status: 'IN-HOUSE' },
    { item: 'Size Label', spec: 'Woven Center-Fold Size Pip', supplier: 'Dekko Accessories Ltd', required: `${n(qty)} pcs`, received: `${n(qty)} pcs`, balance: '0 pcs', status: 'IN-HOUSE' },
    { item: 'Hangtag & Price Ticket', spec: '350 GSM FSC Art Card with Seal Tag', supplier: 'Montrims Limited', required: `${n(qty)} pcs`, received: `${n(qty)} pcs`, balance: '0 pcs', status: 'APPROVED' },
    { item: 'Polybag', spec: 'Recycled LDPE 0.04mm self-adhesive', supplier: 'KDS Accessories Ltd', required: `${n(qty)} pcs`, received: `${n(qty)} pcs`, balance: '0 pcs', status: 'IN-HOUSE' },
    { item: 'Master Carton', spec: '5-Ply 150/150 Kraft Corrugated', supplier: 'Bengal Corrugated Cartons', required: `${Math.ceil(qty / 24)} ctn`, received: `${Math.ceil(qty / 24)} ctn`, balance: '0 ctn', status: 'IN-HOUSE' },
  ];

  // Certified Lab Test Reports
  const testReports = [
    { test: 'Color Fastness to Washing (ISO 105-C06)', certNo: `LAB-CF-${job.jobNo}-A1`, result: 'Grade 4-5 (PASS)', std: 'Min Grade 4.0', lab: 'Central QA Lab', analyst: 'S. K. Paul (Sr. Chemist)' },
    { test: 'Color Fastness to Rubbing / Crocking (ISO 105-X12)', certNo: `LAB-CR-${job.jobNo}-A2`, result: 'Dry 4-5 / Wet 4.0 (PASS)', std: 'Min Dry 4.0 / Wet 3.5', lab: 'Intertek Bangladesh', analyst: 'F. Rahman (Lab Tech)' },
    { test: 'Pilling Resistance (Martindale ISO 12945-2)', certNo: `LAB-PIL-${job.jobNo}-B1`, result: 'Grade 4.0 @ 2000 revs (PASS)', std: 'Min Grade 3-4', lab: 'Central QA Lab', analyst: 'S. K. Paul (Sr. Chemist)' },
    { test: 'Dimensional Stability / Shrinkage (ISO 6330)', certNo: `LAB-SHR-${job.jobNo}-C1`, result: 'Length -2.2%, Width -1.4% (PASS)', std: 'Max ±3.5%', lab: 'SGS Bangladesh', analyst: 'M. Ali (Quality Lab)' },
    { test: 'Spirality / Torque after Laundering (ISO 16322)', certNo: `LAB-SPI-${job.jobNo}-C2`, result: '1.2% (PASS)', std: 'Max 3.0%', lab: 'Central QA Lab', analyst: 'M. Ali (Quality Lab)' },
    { test: 'Bursting Strength (ASTM D3786)', certNo: `LAB-BST-${job.jobNo}-D1`, result: '320 kPa (PASS)', std: 'Min 250 kPa', lab: 'Intertek Bangladesh', analyst: 'T. Hossain (Material Lab)' },
    { test: 'Formaldehyde & Restricted Substances (OEKO-TEX 100)', certNo: `LAB-OEK-${job.jobNo}-E1`, result: '<16 ppm (ND - PASS)', std: '<75 ppm / Oeko-Tex Class 1', lab: 'Hohenstein / Testex', analyst: 'Dr. Nazrul Islam' },
    { test: 'pH Value of Aqueous Extract (ISO 3071)', certNo: `LAB-PH-${job.jobNo}-E2`, result: 'pH 6.4 (PASS)', std: 'pH 5.0 - 7.5', lab: 'Central QA Lab', analyst: 'Dr. Nazrul Islam' },
  ];

  return { sizeBreakdown, poBreakdown, fabricSpec, yarnMill, colorSpec, trimsBOM, testReports };
}

function JobDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = decodeURIComponent(String(params?.id || ''));

  const initialTab = searchParams.get('tab') || 'sizes';
  const [activeTab, setActiveTab] = useState<'sizes' | 'material' | 'production' | 'quality' | 'leadtime' | 'reports'>(
    ['sizes', 'material', 'production', 'quality', 'leadtime', 'reports'].includes(initialTab) ? (initialTab as any) : 'sizes'
  );
  const [viewMode, setViewMode] = useState<'tab' | 'all'>('tab');

  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t && ['sizes', 'material', 'production', 'quality', 'leadtime', 'reports'].includes(t)) {
      setActiveTab(t as any);
      setViewMode('tab');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jobsList = (demo2000DataRaw as any)?.jobs || [];

  // Find job by ID or Job No
  const job = useMemo(() => {
    if (!idParam) return jobsList[0] || null;
    const cleanId = idParam.toLowerCase().trim();
    const found = jobsList.find((j: any) =>
      String(j.jobNo).toLowerCase() === cleanId ||
      String(j.id).toLowerCase() === cleanId ||
      cleanId.includes(String(j.jobNo).toLowerCase()) ||
      String(j.jobNo).toLowerCase().includes(cleanId)
    );
    return found || jobsList[0] || null;
  }, [idParam, jobsList]);

  const profile = useMemo(() => {
    if (!job) return null;
    return generateJobManufacturingProfile(job);
  }, [job]);

  if (!job || !profile) {
    return (
      <Shell title="Job Details" eyebrow="Garment Manufacturing Order Profile">
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontWeight: 800 }}>Job Record Not Found</h3>
          <p style={{ color: '#64748b' }}>No record matching &quot;{idParam}&quot; was found in the ERP database.</p>
          <button onClick={() => router.back()} className="btn btn-primary" style={{ marginTop: '12px', fontWeight: 800 }}>
            ← Back to Job Register
          </button>
        </div>
      </Shell>
    );
  }

  const factory = job.lineAllocation?.factory || 'NFL';
  const rawFloor = job.lineAllocation?.floor || 'Floor 1';
  let floorLabel = `${factory} 1`;
  if (rawFloor.includes('2') || rawFloor.includes('02')) floorLabel = `${factory} 2`;
  else if (rawFloor.includes('3') || rawFloor.includes('03')) floorLabel = `${factory} 3`;
  else floorLabel = `${factory} 1`;

  const exDate = job.dates?.exFactory || '05-Aug-2026';
  const shipmentWeek = getWeekNumber(exDate);
  const formattedJob = displayJobNo(job.jobNo, job.buyer);

  const pipeline = [
    { title: 'Order PO', date: d2(job.dates?.poReceived), status: 'OK' },
    { title: 'T&A Planning', date: d2(job.dates?.tnaPlan), status: 'OK' },
    { title: 'Yarn In-House', date: d2(job.dates?.tnaPlan), status: 'OK' },
    { title: 'Knitting Greige', date: d2(job.dates?.cuttingStart), status: 'OK' },
    { title: 'Dyeing / Finish', date: d2(job.dates?.cuttingStart), status: 'OK' },
    { title: 'Cutting', date: d2(job.dates?.cuttingEnd), status: 'OK' },
    { title: 'Sewing Floor', date: d2(job.dates?.sewingEnd), status: 'RUNNING' },
    { title: 'Finishing & Pack', date: d2(job.dates?.sewingEnd), status: 'IN_PROGRESS' },
    { title: 'Ex-Factory Cargo', date: d2(job.dates?.cargoClosing), status: 'PENDING' },
  ];

  function handleTabClick(tabId: 'sizes' | 'material' | 'production' | 'quality' | 'leadtime' | 'reports') {
    setViewMode('tab');
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }
  }

  return (
    <Shell
      title={`Job ${formattedJob} · ${job.styleNo}`}
      eyebrow={`Comprehensive Garment Manufacturing Profile · ${job.buyer} · ${floorLabel}`}
    >
      {/* 1. TOP NAVIGATION & ACTION BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.back()}
            className="reg-btn-compact"
            style={{ height: '34px', padding: '0 14px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Back to Table
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748b' }}>
            <Link href="/" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Management Overview</Link>
            <span>/</span>
            <Link href="/modules/central-planning" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Central Planning</Link>
            <span>/</span>
            <strong style={{ color: '#0f172a', fontWeight: 900 }}>{formattedJob}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            className="reg-btn-compact"
            style={{ fontWeight: 800 }}
            title="Print Complete Job Spec Sheet"
          >
            🖨️ Print Spec Sheet
          </button>
          <span className="status-pill ok" style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 800 }}>
            {job.presentStatus || 'Cut OK'}
          </span>
        </div>
      </div>

      {/* 2. JOB HEADER HERO CARD (BOLD QUANTITIES & HIGH CONTRAST) */}
      <section className="panel" style={{ padding: '18px 24px', background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '.06em', background: '#eff6ff', padding: '3px 10px', borderRadius: '4px' }}>
                Buyer: {job.buyer}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: '4px' }}>
                Status: {job.presentStatus || 'Cut OK'}
              </span>
            </div>

            <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
              {formattedJob} · <span style={{ color: '#2563eb' }}>{job.styleNo}</span>
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              {job.itemDescription || 'Garment Production Item'} · Assigned Line: <strong style={{ fontWeight: 900, color: '#0f172a' }}>{job.lineAllocation?.line || '16B'}</strong> ({floorLabel}) · Merchandiser: <strong style={{ fontWeight: 800, color: '#0f172a' }}>{job.merchandiser || 'Md. Jahidul Islam'}</strong>
            </p>
          </div>

          {/* Quick Metrics Badge Row (BOLD DIGITS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', textAlign: 'right' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL ORDER</span>
              <strong style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{n(job.orderQty)} <span style={{ fontSize: '12px', fontWeight: 700 }}>pcs</span></strong>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 16px', textAlign: 'right' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#1e40af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>EX-FACTORY DATE</span>
              <strong style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>{d2(exDate)}</strong>
            </div>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 16px', textAlign: 'right' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SEWING OUTPUT</span>
              <strong style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>{n(job.sewing?.sewingActualQty || job.orderQty)} <span style={{ fontSize: '12px', fontWeight: 700 }}>pcs</span></strong>
            </div>
          </div>
        </div>
      </section>

      {/* 3. END-TO-END FACTORY PIPELINE TRACKER */}
      <section className="panel" style={{ padding: '14px 20px', marginBottom: '14px' }}>
        <div className="panel-title" style={{ fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong style={{ fontWeight: 900, color: '#0f172a' }}>End-to-End Production Process Milestone Tracking</strong>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Connected factory logs</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: '6px', overflowX: 'auto' }}>
          {pipeline.map((p, idx) => (
            <div
              key={idx}
              style={{
                background: p.status === 'OK' ? '#ecfdf5' : p.status === 'RUNNING' ? '#eff6ff' : '#f8fafc',
                border: p.status === 'OK' ? '1px solid #a7f3d0' : p.status === 'RUNNING' ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 6px',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 900, color: p.status === 'OK' ? '#047857' : p.status === 'RUNNING' ? '#1d4ed8' : '#94a3b8' }}>
                STEP {idx + 1}
              </span>
              <strong style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#0f172a', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.title}
              </strong>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block' }}>{p.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DETAIL TABS NAVIGATION (ACTUAL SEPARATE SUB-PAGE VIEWS) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flexWrap: 'wrap' }}>
          {[
            { id: 'sizes', label: '📏 Size-Wise & PO / Qty Breakdown', desc: 'Order breakdown & PO details' },
            { id: 'material', label: '🧵 Fabric & Trims', desc: 'Yarn, fabric & accessories BOM' },
            { id: 'production', label: '🏭 Stage Production & IE', desc: 'Lines, SMV & stage runs' },
            { id: 'quality', label: '🔍 Quality & Inspection', desc: 'Audit log & defect control' },
            { id: 'leadtime', label: '⏱️ T&A Schedule', desc: 'Planned vs actual milestones' },
            { id: 'reports', label: '🧪 Lab Test Reports', desc: 'ISO certified lab tests' },
          ].map(t => {
            const isActive = viewMode === 'tab' && activeTab === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => handleTabClick(t.id as any)}
                className={`tab-btn-360 ${isActive ? 'active' : ''}`}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isActive ? '#2563eb' : '#ffffff',
                  color: isActive ? '#ffffff' : '#1e293b',
                  fontWeight: isActive ? 900 : 700,
                  boxShadow: isActive ? '0 3px 10px rgba(37,99,235,0.28)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all .15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* View All Sections Toggle */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'all' ? 'tab' : 'all')}
          style={{
            padding: '9px 14px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '8px',
            cursor: 'pointer',
            border: viewMode === 'all' ? '2px solid #059669' : '1px solid #94a3b8',
            background: viewMode === 'all' ? '#ecfdf5' : '#f8fafc',
            color: viewMode === 'all' ? '#047857' : '#475569'
          }}
          title="Toggle viewing all 6 sections on one screen"
        >
          {viewMode === 'all' ? '✓ Showing All 6 Sections' : '📑 View All Sections (Full View)'}
        </button>
      </div>

      {/* 5. TAB DETAILS CONTENT */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ========================================================================= */}
        {/* TAB 1: SIZE & PO ALLOCATION */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || activeTab === 'sizes') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header description */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                  📏 Size & Destination PO Allocation
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  PO breakdown and destination allocation
                </span>
              </div>
              <span className="status-pill ok" style={{ fontWeight: 800 }}>Total Order: {n(job.orderQty)} pcs</span>
            </div>

            {/* Standard Factory Operating Flow Notice */}
            <div style={{ padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '11.5px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>ℹ️</span>
              <div>
                <strong>PO Allocation:</strong> Captured from buyer pack sheet; verified against ex-factory packing list.
              </div>
            </div>

            {/* Size Breakdown Matrix */}
            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>Size-Wise Breakdown Matrix (From PO Pack Sheet)</strong>
                <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857', fontWeight: 800 }}>Pack Ratio: 1 : 2 : 3 : 3 : 2 : 1 : 0.5</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Measurement / Specification</th>
                      {profile.sizeBreakdown.map(s => (
                        <th key={s.size} style={{ textAlign: 'center', fontWeight: 800 }}>{s.size}</th>
                      ))}
                      <th style={{ textAlign: 'right', fontWeight: 900 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#334155' }}>Order Pack Ratio</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', color: '#475569', fontWeight: 700 }}>{s.ratio}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>12.5</td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ fontWeight: 800, color: '#1e40af' }}>Order Quantity (pcs)</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', fontWeight: 900, color: '#0f172a', fontSize: '13px' }}>{n(s.orderQty)}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 900, color: '#2563eb', fontSize: '14px' }}>{n(job.orderQty)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#047857' }}>Ex-Factory Shipped / Audit Qty</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{n(s.shippedQty)}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: '14px' }}>{n(job.orderQty)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overall Stage Production Totals (How the factory actually tracks intermediate stages) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>OVERALL CUTTING BATCH</span>
                <strong style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  {n(job.cutting?.cuttingQty || Math.round(job.orderQty * 1.025))} <span style={{ fontSize: '13px', fontWeight: 700 }}>pcs</span>
                </strong>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>102.5% Marker lay ratio</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #93c5fd', background: '#f8fafc' }}>
                <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>OVERALL SEWING OUTPUT</span>
                <strong style={{ fontSize: '22px', fontWeight: 900, color: '#2563eb', display: 'block', marginTop: '2px' }}>
                  {n(job.sewing?.sewingActualQty || job.orderQty)} <span style={{ fontSize: '13px', fontWeight: 700 }}>pcs</span>
                </strong>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, display: 'block', marginTop: '3px' }}>Line {job.lineAllocation?.line || '16B'} cumulative run</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>EXPORT PACKED CARTONS</span>
                <strong style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  {n(Math.ceil(job.orderQty / 24))} <span style={{ fontSize: '13px', fontWeight: 700 }}>cartons</span>
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginTop: '3px' }}>24 pcs per carton packing spec</span>
              </div>
            </div>

            {/* PO Number & Destination Country Allocation */}
            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>PO Number & Destination Country Allocation</strong>
                <span className="status-pill" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 800 }}>5 Destination Ports</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Destination Country</th>
                      <th style={{ fontWeight: 800 }}>PO Number</th>
                      <th style={{ fontWeight: 800 }}>Discharge Port</th>
                      <th style={{ fontWeight: 800 }}>Delivery Terms</th>
                      <th style={{ fontWeight: 800 }}>Packaging Ratio</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>Cartons</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>PO Qty</th>
                      <th style={{ textAlign: 'center', fontWeight: 800 }}>Ship Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.poBreakdown.map((po, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ marginRight: '6px' }}>{po.flag}</span> {po.country}
                        </td>
                        <td style={{ fontWeight: 800, color: '#2563eb' }}>{po.poNo}</td>
                        <td style={{ fontWeight: 600 }}>{po.port}</td>
                        <td><span className="register-status-badge neutral" style={{ fontWeight: 700 }}>{po.terms}</span></td>
                        <td style={{ fontWeight: 600 }}>{po.packType}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{po.cartons} ctn</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>{n(po.qty)} pcs</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="register-status-badge ok" style={{ fontWeight: 800 }}>{po.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FABRIC & TRIMS (COMPREHENSIVE MATERIAL MANAGEMENT) */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || activeTab === 'material') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                  🧵 Fabric, Yarn & Trims Bill of Materials (BOM)
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Raw material in-house status, yarn lot tracking, dyeing recipe & trims approval records
                </span>
              </div>
              <span className="status-pill ok" style={{ fontWeight: 800 }}>Material 100% In-House</span>
            </div>

            {/* Fabric & Dyeing Technical Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div className="panel" style={{ padding: '18px', border: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '14px', fontWeight: 900, color: '#1e40af', display: 'block', marginBottom: '12px' }}>
                  Fabric & Yarn Technical Specification
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Fabric Structure:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>{profile.fabricSpec.type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Fiber Composition:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>{profile.fabricSpec.comp}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Yarn Count:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>{profile.fabricSpec.count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Fabric Weight (GSM):</span>
                    <strong style={{ fontWeight: 900, color: '#0f172a' }}>{profile.fabricSpec.gsm}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Cuttable Width:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>{profile.fabricSpec.width}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Spinning Mill:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>{profile.yarnMill}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Yarn Lot Number:</span>
                    <strong style={{ fontWeight: 900, color: '#2563eb' }}>Lot #Y-26-{String(job.jobNo || '45000').slice(-4)}</strong>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ padding: '18px', border: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '14px', fontWeight: 900, color: '#1e40af', display: 'block', marginBottom: '12px' }}>
                  Dyeing, Wash & Finishing Recipe
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Approved Shade / Color:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>{profile.colorSpec.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Pantone TPG Ref:</span>
                    <strong style={{ fontWeight: 900, color: '#2563eb' }}>{profile.colorSpec.pantone}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Dyeing Unit / Winch:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>Northern Dyeing Winch #06</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Dye Batch Number:</span>
                    <strong style={{ fontWeight: 900, color: '#0f172a' }}>BD-26-{String(job.jobNo || '45000').slice(-3)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Finishing Treatment:</span>
                    <strong style={{ fontWeight: 800, color: '#0f172a' }}>Stenter Compacting + Bio-Polish</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Print / Embroidery:</span>
                    <strong style={{ fontWeight: 800, color: '#047857' }}>4-Color Pigment Print (Strike-off Pass)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Lab Dip Status:</span>
                    <strong style={{ fontWeight: 900, color: '#16a34a' }}>Option B Approved by Buyer</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Trims & Packaging BOM Table */}
            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>Trims & Accessories Bill of Materials (BOM)</strong>
                <span className="status-pill ok" style={{ fontWeight: 800 }}>All Trims In-House & Passed</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Trim Item</th>
                      <th style={{ fontWeight: 800 }}>Detailed Technical Specification</th>
                      <th style={{ fontWeight: 800 }}>Approved Supplier</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>Required Qty</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>In-House Qty</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>Balance</th>
                      <th style={{ textAlign: 'center', fontWeight: 800 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.trimsBOM.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#1e40af' }}>{t.item}</td>
                        <td style={{ fontWeight: 600 }}>{t.spec}</td>
                        <td style={{ fontWeight: 600, color: '#475569' }}>{t.supplier}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{t.required}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>{t.received}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{t.balance}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="register-status-badge ok" style={{ fontWeight: 800 }}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STAGE PRODUCTION & IE ENGINEERING */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || activeTab === 'production') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                  🏭 Stage Production & Industrial Engineering (IE)
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Floor line allocation, SMV parameters, daily output targets & line balancing metrics
                </span>
              </div>
              <span className="status-pill ok" style={{ fontWeight: 800 }}>Efficiency: {job.ie?.efficiencyPct || 82}%</span>
            </div>

            {/* IE Top KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>STANDARD SMV</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  {job.ie?.smv || 7.5} <span style={{ fontSize: '13px', fontWeight: 700 }}>min</span>
                </strong>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>GSD motion study verified</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #93c5fd', background: '#f8fafc' }}>
                <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>DAILY LINE TARGET</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb', display: 'block', marginTop: '2px' }}>
                  {n(job.ie?.dailyTarget || 2000)} <span style={{ fontSize: '13px', fontWeight: 700 }}>pcs/day</span>
                </strong>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, display: 'block', marginTop: '3px' }}>Hourly target: {Math.round((job.ie?.dailyTarget || 2000) / 8)} pcs/hr</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>ALLOCATED MANPOWER</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  {job.ie?.manpower || 30} <span style={{ fontSize: '13px', fontWeight: 700 }}>ops</span>
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginTop: '3px' }}>+ 6 Helpers, 2 Line QIs</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>LINE EFFICIENCY</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', display: 'block', marginTop: '2px' }}>
                  {job.ie?.efficiencyPct || 82}%
                </strong>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>Benchmark: 78% target</span>
              </div>
            </div>

            {/* 4-Stage Production Tracking Table */}
            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>Departmental Stage-Wise Execution Progress</strong>
                <span className="status-pill ok" style={{ fontWeight: 800 }}>Allocated: Line {job.lineAllocation?.line || '16B'} ({floorLabel})</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Production Department</th>
                      <th style={{ fontWeight: 800 }}>Operating Floor & Machine</th>
                      <th style={{ fontWeight: 800 }}>Execution Dates</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>Target Qty</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>Achieved Qty</th>
                      <th style={{ textAlign: 'right', fontWeight: 800 }}>Balance</th>
                      <th style={{ textAlign: 'center', fontWeight: 800 }}>Floor Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dept: '1. Automated Cutting Floor', floor: 'Cutting Floor 1 · Auto Cutter #02', dates: `${d2(job.dates?.cuttingStart)} to ${d2(job.dates?.cuttingEnd)}`, target: `${n(job.orderQty)} pcs`, achieved: `${n(job.cutting?.cuttingQty || job.orderQty)} pcs`, bal: '0 pcs', st: 'COMPLETED' },
                      { dept: '2. Printing & Heat Transfer', floor: 'Print Unit 1 · 8-Color Oval MHM', dates: `${d2(job.dates?.cuttingEnd)} to ${d2(job.dates?.sewingStart)}`, target: `${n(job.orderQty)} pcs`, achieved: `${n(job.orderQty)} pcs`, bal: '0 pcs', st: 'COMPLETED' },
                      { dept: '3. Sewing Production Floor', floor: `${floorLabel} · Line ${job.lineAllocation?.line || '16B'}`, dates: `${d2(job.dates?.sewingStart)} to ${d2(job.dates?.sewingEnd)}`, target: `${n(job.orderQty)} pcs`, achieved: `${n(job.sewing?.sewingActualQty || job.orderQty)} pcs`, bal: `${n(Math.max(0, job.orderQty - (job.sewing?.sewingActualQty || job.orderQty)))} pcs`, st: 'RUNNING' },
                      { dept: '4. Finishing & Carton Packing', floor: 'Finishing Floor 1 · Steam Tunnel', dates: `${d2(job.dates?.sewingEnd)} to ${d2(exDate)}`, target: `${n(job.orderQty)} pcs`, achieved: `${n(job.finishing?.packingQty || job.orderQty)} pcs`, bal: '0 pcs', st: 'IN-PROGRESS' },
                    ].map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#1e40af' }}>{s.dept}</td>
                        <td style={{ fontWeight: 600 }}>{s.floor}</td>
                        <td style={{ fontWeight: 600, color: '#475569' }}>{s.dates}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{s.target}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>{s.achieved}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{s.bal}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`register-status-badge ${s.st === 'COMPLETED' ? 'ok' : 'pending'}`} style={{ fontWeight: 800 }}>
                            {s.st}
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

        {/* ========================================================================= */}
        {/* TAB 4: QUALITY & INSPECTION AUDIT LOG */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || activeTab === 'quality') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                  🔍 Quality Assurance, Defect Log & Inspection Audits
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Stage-wise 4-point fabric audits, traffic-light inline checks, needle detector tests & AQL 2.5 final inspection
                </span>
              </div>
              <span className="status-pill ok" style={{ fontWeight: 800 }}>Final QA Passed</span>
            </div>

            {/* Quality KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>AUDIT PASS RATE</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', display: 'block', marginTop: '2px' }}>100%</strong>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>Zero critical failures</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>DEFECT RATE (DHU)</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>1.4%</strong>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>Standard threshold: 2.5% max</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>AQL SAMPLING</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb', display: 'block', marginTop: '2px' }}>Level II</strong>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, display: 'block', marginTop: '3px' }}>AQL 2.5 Major / 4.0 Minor</span>
              </div>

              <div className="panel" style={{ padding: '14px 18px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>NEEDLE DETECTION</span>
                <strong style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', display: 'block', marginTop: '2px' }}>1.0mm 9-PT</strong>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>100% garments calibrated</span>
              </div>
            </div>

            {/* 9-Stage Comprehensive Inspection Log Table */}
            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>Stage-Wise Quality & Root Cause Audit Log</strong>
                <span className="status-pill ok" style={{ fontWeight: 800 }}>Certified Inspector Sign-offs</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Section Process</th>
                      <th style={{ fontWeight: 800 }}>Audit Location</th>
                      <th style={{ fontWeight: 800 }}>Quality Inspector</th>
                      <th style={{ fontWeight: 800 }}>Date</th>
                      <th style={{ fontWeight: 800 }}>Sample Inspected</th>
                      <th style={{ fontWeight: 800 }}>Observation & Corrective Action</th>
                      <th style={{ textAlign: 'center', fontWeight: 800 }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { section: '1. Knitting Greige Audit', root: 'Knitting Shed #1 · Machine #14', qi: 'Md. Rafiqul Islam (QI-KN04)', date: d2(job.dates?.tnaPlan), sample: '2,400 kg inspected', defect: 'Minor Lycra tension variation rectified; loop length ±2% within tolerance.', status: 'PASSED' },
                      { section: '2. Greige Store Roll Check', root: 'Greige Fabric Store Bay 4', qi: 'M. A. Mannan (Store QC Lead)', date: d2(job.dates?.tnaPlan), sample: '100% Roll Barcode & Weight', defect: 'GSM 180 verified, 4-point inspection passed (<18 points/100 sq.yd).', status: 'RELEASED' },
                      { section: '3. Dyeing & Shade Matching', root: 'Dyeing Floor Winch #06', qi: 'Dr. Nazrul Islam (Dyeing Lab Head)', date: d2(job.dates?.cuttingStart), sample: 'Full Batch (2,350 kg)', defect: 'Shade matched vs master swatch under D65 / TL84; batch topping completed.', status: 'PASSED' },
                      { section: '4. Finished Fabric Inspection', root: 'Finished Fabric Store Rack B-12', qi: 'Jashim Uddin (QC Controller)', date: d2(job.dates?.cuttingStart), sample: '2,350 kg delivered', defect: 'Color fastness to wash Grade 4-5, shrinkage within allowable -3%.', status: 'RELEASED' },
                      { section: '5. Cutting Spread & Notch', root: 'Cutting Floor 1 · Auto Spreader #2', qi: 'Aminul Islam (Cutting QI)', date: d2(job.dates?.cuttingStart), sample: `${n(job.orderQty)} Cut Pcs`, defect: 'Pattern grain line & bundle numbering 100% verified; zero marker overlap.', status: 'PASSED' },
                      { section: '6. Print & Embroidery Audit', root: 'Print / Embroidery Unit 1', qi: 'Shahidul Alam (Print QI Officer)', date: d2(job.dates?.sewingStart), sample: '100 Pcs Strike-off + Run Sample', defect: 'Strike-off wash fastness passed, sharp edge registration maintained.', status: 'PASSED' },
                      { section: '7. Sewing In-Line & End-Line', root: `${floorLabel} · Line ${job.lineAllocation?.line || '16B'}`, qi: 'Tariqul Hasan (Senior Sewing QI)', date: d2(job.dates?.sewingStart), sample: `${n(job.orderQty)} Sewing Pcs`, defect: 'SPI 12 maintained; minor skip stitch at sleeve hem corrected during balancing.', status: 'PASSED' },
                      { section: '8. Finishing & Steam Press', root: 'Finishing Floor 1 · Tunnel Steam Press', qi: 'Rezaul Karim (Finishing QC Controller)', date: d2(job.dates?.sewingEnd), sample: `${n(job.orderQty)} Finished Garments`, defect: 'Ironing shine check ok; needle detector 1.0mm ferrous test 100% passed.', status: 'PASSED' },
                      { section: '9. Final Inspection & AQL Audit', root: 'Central QA Audit Room · AQL 2.5', qi: 'Kabir Hossain (QA Manager)', date: d2(exDate), sample: '315 Pcs (AQL Level II Sample)', defect: 'Carton drop test pass, barcode scan pass, final shipment release signed.', status: 'PASSED' }
                    ].map((q, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#1e40af' }}>{q.section}</td>
                        <td style={{ fontWeight: 600 }}>{q.root}</td>
                        <td style={{ fontWeight: 600, color: '#334155' }}>{q.qi}</td>
                        <td style={{ fontWeight: 700 }}>{q.date}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{q.sample}</td>
                        <td style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '11.5px', color: '#475569' }}>{q.defect}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="register-status-badge ok" style={{ fontWeight: 800 }}>{q.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: LEAD TIME & T&A SCHEDULE */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || activeTab === 'leadtime') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                  ⏱️ Time & Action (T&A) Master Milestone Calendar
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Planned vs actual execution schedule, variance tracking & shipment lead time analysis
                </span>
              </div>
              <span className="status-pill ok" style={{ fontWeight: 800 }}>Zero Critical Delays</span>
            </div>

            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>T&A Milestone Planned vs Actual Schedule</strong>
                <span className="status-pill ok" style={{ fontWeight: 800 }}>Ex-Factory: {d2(exDate)} (Week {shipmentWeek})</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Milestone Stage</th>
                      <th style={{ fontWeight: 800 }}>Planned Date</th>
                      <th style={{ fontWeight: 800 }}>Actual Date</th>
                      <th style={{ fontWeight: 800 }}>Lead Time Duration</th>
                      <th style={{ fontWeight: 800 }}>Variance</th>
                      <th style={{ textAlign: 'center', fontWeight: 800 }}>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { milestone: '1. PO Order Confirmation & Import', plan: d2(job.dates?.poReceived), actual: d2(job.dates?.poReceived), lead: 'Day 0', var: '0 Days', st: 'ON TIME' },
                      { milestone: '2. T&A Planning & Routing Release', plan: d2(job.dates?.tnaPlan), actual: d2(job.dates?.tnaPlan), lead: '4 Days', var: '0 Days', st: 'ON TIME' },
                      { milestone: '3. Yarn & Fabric Raw Material In-House', plan: d2(job.dates?.tnaPlan), actual: d2(job.dates?.tnaPlan), lead: '10 Days', var: '0 Days', st: 'ON TIME' },
                      { milestone: '4. PP Sample Approved by Buyer', plan: d2(job.dates?.cuttingStart), actual: d2(job.dates?.cuttingStart), lead: '14 Days', var: '0 Days', st: 'ON TIME' },
                      { milestone: '5. Automated Cutting Execution', plan: d2(job.dates?.cuttingStart), actual: d2(job.dates?.cuttingEnd), lead: '4 Days', var: '0 Days', st: 'ON TIME' },
                      { milestone: '6. Sewing Production Line Output', plan: d2(job.dates?.sewingStart), actual: d2(job.dates?.sewingEnd), lead: '13 Days', var: '0 Days', st: 'ON TIME' },
                      { milestone: '7. Final Inspection & QA Release', plan: d2(exDate), actual: d2(exDate), lead: '48 Days Total', var: '0 Days', st: 'ON TIME' },
                      { milestone: '8. Port Cargo Closing & Feeder Vessel', plan: d2(job.dates?.cargoClosing), actual: d2(job.dates?.cargoClosing), lead: '52 Days Total', var: '0 Days', st: 'ON TIME' }
                    ].map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#1e40af' }}>{m.milestone}</td>
                        <td style={{ fontWeight: 600 }}>{m.plan}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{m.actual}</td>
                        <td style={{ fontWeight: 700 }}>{m.lead}</td>
                        <td style={{ color: '#16a34a', fontWeight: 800 }}>{m.var}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="register-status-badge ok" style={{ fontWeight: 800 }}>{m.st}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CERTIFIED TESTING LAB REPORTS */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || activeTab === 'reports') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                  🧪 Certified Physical & Chemical Testing Lab Reports
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  ISO / ASTM accredited laboratory certificates for color fastness, shrinkage, tensile strength & chemical safety
                </span>
              </div>
              <span className="status-pill ok" style={{ fontWeight: 800 }}>All Tests Passed</span>
            </div>

            <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>Accredited Buyer & In-House Lab Test Certificates</strong>
                <span className="status-pill ok" style={{ fontWeight: 800 }}>100% Conforming to Buyer Spec</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 800 }}>Test Standard & Method</th>
                      <th style={{ fontWeight: 800 }}>Certificate Ref</th>
                      <th style={{ fontWeight: 800 }}>Test Result</th>
                      <th style={{ fontWeight: 800 }}>Buyer Requirement</th>
                      <th style={{ fontWeight: 800 }}>Testing Lab</th>
                      <th style={{ fontWeight: 800 }}>Chemist / Analyst</th>
                      <th style={{ textAlign: 'center', fontWeight: 800 }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.testReports.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#1e40af' }}>{t.test}</td>
                        <td style={{ fontWeight: 800, color: '#2563eb' }}>{t.certNo}</td>
                        <td style={{ fontWeight: 900, color: '#16a34a' }}>{t.result}</td>
                        <td style={{ fontWeight: 700, color: '#475569' }}>{t.std}</td>
                        <td style={{ fontWeight: 600 }}>{t.lab}</td>
                        <td style={{ fontWeight: 600, color: '#334155' }}>{t.analyst}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="register-status-badge ok" style={{ fontWeight: 900 }}>PASSED</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </section>
    </Shell>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', fontWeight: 800 }}>Loading Job Manufacturing Profile...</div>}>
      <JobDetailContent />
    </Suspense>
  );
}
