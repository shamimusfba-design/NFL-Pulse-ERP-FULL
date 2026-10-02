'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import { displayJobNo } from '../../../lib/display';

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
    const sewingSizeQty = Math.round(orderSizeQty * (job.sewing?.achievementPct ? job.sewing.achievementPct / 100 : 1));
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

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = decodeURIComponent(String(params?.id || ''));

  const [activeTab, setActiveTab] = useState<'sizes' | 'material' | 'production' | 'quality' | 'leadtime' | 'reports'>('sizes');
  const [viewMode, setViewMode] = useState<'tab' | 'all'>('tab');

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
          <h3>Job Not Found</h3>
          <p style={{ color: '#64748b' }}>No record matching &quot;{idParam}&quot; was found in the ERP database.</p>
          <button onClick={() => router.back()} className="btn btn-primary" style={{ marginTop: '12px' }}>
            ← Go Back
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
            style={{ height: '32px', padding: '0 12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Back to Table
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>Management Overview</Link>
            <span>/</span>
            <Link href="/modules/central-planning" style={{ color: '#2563eb', textDecoration: 'none' }}>Central Planning</Link>
            <span>/</span>
            <strong style={{ color: '#0f172a' }}>{formattedJob}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '6px 12px' }}
          >
            🖨️ Print Spec Sheet
          </button>
          <Link
            href="/modules/job-360"
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '6px 12px' }}
          >
            Full 360 Workspace ↗
          </Link>
        </div>
      </div>

      {/* 2. COMPREHENSIVE JOB HERO HEADER */}
      <section className="panel" style={{ padding: '18px 22px', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="status-pill" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: 700 }}>
                {job.buyer}
              </span>
              <span className="status-pill" style={{ background: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: 600 }}>
                Week {shipmentWeek} · {floorLabel}
              </span>
              <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 700 }}>
                Status: {job.presentStatus || 'Cut OK'}
              </span>
            </div>

            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {formattedJob} · <span style={{ color: '#2563eb' }}>{job.styleNo}</span>
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
              {job.itemDescription || 'Garment Production Item'} · Assigned Line: <strong>{job.lineAllocation?.line || '16B'}</strong> ({floorLabel}) · Merchandiser: <strong>{job.merchandiser || 'Md. Jahidul Islam'}</strong>
            </p>
          </div>

          {/* Quick Metrics Badge Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>TOTAL ORDER</span>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>{n(job.orderQty)} pcs</strong>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>EX-FACTORY DATE</span>
              <strong style={{ fontSize: '16px', color: '#2563eb' }}>{d2(exDate)}</strong>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>SEWING OUTPUT</span>
              <strong style={{ fontSize: '16px', color: '#16a34a' }}>{n(job.sewing?.sewingActualQty || job.orderQty)} pcs</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 3. END-TO-END FACTORY PIPELINE TRACKER */}
      <section className="panel" style={{ padding: '14px 20px' }}>
        <div className="panel-title" style={{ fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>End-to-End Production Process Milestone Tracking</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>Connected factory logs</span>
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
              <span style={{ fontSize: '9px', fontWeight: 800, color: p.status === 'OK' ? '#047857' : p.status === 'RUNNING' ? '#1d4ed8' : '#94a3b8' }}>
                STEP {idx + 1}
              </span>
              <strong style={{ display: 'block', fontSize: '10.5px', color: '#0f172a', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.title}
              </strong>
              <span style={{ fontSize: '9.5px', color: '#64748b', display: 'block' }}>{p.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DETAIL TABS NAVIGATION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flexWrap: 'wrap' }}>
          {[
            { id: 'sizes', label: '📏 Size & PO Allocation' },
            { id: 'material', label: '🧵 Fabric & Trims' },
            { id: 'production', label: '🏭 Stage Production & IE' },
            { id: 'quality', label: '🔍 Quality & Inspection' },
            { id: 'leadtime', label: '⏱️ T&A Schedule' },
            { id: 'reports', label: '🧪 Lab Test Reports' },
          ].map(t => {
            const isActive = viewMode === 'tab' && activeTab === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => {
                  setViewMode('tab');
                  setActiveTab(t.id as any);
                }}
                style={{
                  padding: '7px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isActive ? '#2563eb' : '#ffffff',
                  color: isActive ? '#ffffff' : '#1e293b',
                  boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all .15s ease'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* View All Sections Toggle */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'all' ? 'tab' : 'all')}
          style={{
            padding: '7px 12px',
            fontSize: '11.5px',
            fontWeight: 700,
            borderRadius: '6px',
            cursor: 'pointer',
            border: viewMode === 'all' ? '2px solid #059669' : '1px solid #94a3b8',
            background: viewMode === 'all' ? '#ecfdf5' : '#f8fafc',
            color: viewMode === 'all' ? '#047857' : '#475569'
          }}
          title="Toggle viewing all 6 sections at once"
        >
          {viewMode === 'all' ? '✓ Showing All 6 Sections' : '📑 View All Sections (Full View)'}
        </button>
      </div>

      {/* 5. TAB DETAILS CONTENT */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* TAB 1: SIZE-WISE & PO COUNTRY BREAKDOWN */}
        {(viewMode === 'all' || activeTab === 'sizes') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>Size-Wise Breakdown Matrix (Total Order: {n(job.orderQty)} pcs)</strong>
                <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857' }}>Ratio: 1:2:3:3:2:1:0.5</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th>Measurement / Step</th>
                      {profile.sizeBreakdown.map(s => (
                        <th key={s.size} style={{ textAlign: 'center' }}>{s.size}</th>
                      ))}
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Order Ratio</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', color: '#64748b' }}>{s.ratio}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>12.5</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Order Qty (pcs)</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{n(s.orderQty)}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>{n(job.orderQty)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Actual Cut (pcs)</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', color: '#475569' }}>{n(s.cutQty)}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{n(Math.round(job.orderQty * 1.025))}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Sewing Output</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{n(s.sewingQty)}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{n(job.orderQty)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Carton Packed</td>
                      {profile.sizeBreakdown.map(s => (
                        <td key={s.size} style={{ textAlign: 'center', color: '#2563eb', fontWeight: 700 }}>{n(s.packedQty)}</td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>{n(job.orderQty)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>PO Number & Destination Country Allocation</strong>
                <span className="status-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>5 Destination Ports</span>
              </div>
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th>PO Number</th>
                      <th>Discharge Port</th>
                      <th>Delivery Terms</th>
                      <th>Packaging</th>
                      <th style={{ textAlign: 'right' }}>Cartons</th>
                      <th style={{ textAlign: 'right' }}>PO Qty</th>
                      <th style={{ textAlign: 'center' }}>Ship Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.poBreakdown.map((po, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          <span style={{ marginRight: '6px' }}>{po.flag}</span> {po.country}
                        </td>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{po.poNo}</td>
                        <td>{po.port}</td>
                        <td><span className="register-status-badge neutral">{po.terms}</span></td>
                        <td>{po.packType}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{po.cartons} ctn</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{n(po.qty)} pcs</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="register-status-badge ok">{po.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FABRIC & MATERIAL SPECIFICATION */}
        {(viewMode === 'all' || activeTab === 'material') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div className="panel" style={{ padding: '16px' }}>
              <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '10px' }}>Fabric & Yarn Specification</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#334155' }}>
                <div><strong>Fabric Type:</strong> {profile.fabricSpec.type}</div>
                <div><strong>Fiber Composition:</strong> {profile.fabricSpec.comp}</div>
                <div><strong>Yarn Count:</strong> {profile.fabricSpec.count}</div>
                <div><strong>Fabric Weight / GSM:</strong> {profile.fabricSpec.gsm}</div>
                <div><strong>Cuttable Width:</strong> {profile.fabricSpec.width}</div>
                <div><strong>Yarn Spinning Mill:</strong> {profile.yarnMill}</div>
                <div><strong>Yarn Lot Number:</strong> Lot #Y-26-{String(job.jobNo || '45000').slice(-4)}</div>
              </div>
            </div>

            <div className="panel" style={{ padding: '16px' }}>
              <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '10px' }}>Dyeing & Trims Specification</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#334155' }}>
                <div><strong>Approved Color:</strong> {profile.colorSpec.name}</div>
                <div><strong>Pantone TPG Ref:</strong> {profile.colorSpec.pantone}</div>
                <div><strong>Dyeing Factory & Winch:</strong> Northern Dyeing & Finishing (Winch #06)</div>
                <div><strong>Dye Batch No:</strong> BD-26-{String(job.jobNo || '45000').slice(-3)}</div>
                <div><strong>Finishing Treatment:</strong> Stenter Compacting + Bio-Polish Wash</div>
                <div><strong>Print / Embroidery:</strong> Chest Logo Pigment Print (4-Color Strike-off Pass)</div>
                <div><strong>Accessories / Trims:</strong> Oeko-Tex 100 Woven Label, YKK Zipper, Recycled Polybag</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STAGE PRODUCTION & IE PARAMETERS */}
        {(viewMode === 'all' || activeTab === 'production') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Order Quantity</span>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>{n(job.orderQty)} pcs</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Sewing Actual Output</span>
                <strong style={{ fontSize: '16px', color: '#16a34a' }}>{n(job.sewing?.sewingActualQty || job.orderQty)} pcs</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Carton Packed Qty</span>
                <strong style={{ fontSize: '16px', color: '#2563eb' }}>{n(job.finishing?.packingQty || job.orderQty)} pcs</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Line Efficiency</span>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>{job.ie?.efficiencyPct || 80}%</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
              <div className="panel" style={{ padding: '14px' }}>
                <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Yarn & Fabric Flow</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#475569' }}>
                  <div><strong>Yarn Required:</strong> {n(job.yarn?.yarnReqKg || 2500)} kg</div>
                  <div><strong>Yarn Received:</strong> {n(job.yarn?.yarnReceivedKg || 2500)} kg</div>
                  <div><strong>Grey Produced:</strong> {n(job.knitting?.greyProducedKg || 2400)} kg</div>
                  <div><strong>Finish Fabric:</strong> {n(job.fabric?.fabricReceivedKg || 2350)} kg</div>
                </div>
              </div>

              <div className="panel" style={{ padding: '14px' }}>
                <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Cutting & Print Flow</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#475569' }}>
                  <div><strong>Cuttable Pcs:</strong> {n(job.orderQty)} pcs</div>
                  <div><strong>Actual Cut:</strong> {n(job.cutting?.cuttingQty || job.orderQty)} pcs</div>
                  <div><strong>Cutting Ratio:</strong> 102.5%</div>
                  <div><strong>Print/Emb Output:</strong> {n(job.orderQty)} pcs</div>
                </div>
              </div>

              <div className="panel" style={{ padding: '14px' }}>
                <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>Sewing Line & IE Metrics</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#475569' }}>
                  <div><strong>Allocated Line:</strong> Line {job.lineAllocation?.line || '16B'} ({floorLabel})</div>
                  <div><strong>Standard SMV:</strong> {job.ie?.smv || 7.5} min</div>
                  <div><strong>Daily Target:</strong> {n(job.ie?.dailyTarget || 2000)} pcs/day</div>
                  <div><strong>Line Manpower:</strong> {job.ie?.manpower || 30} operators</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QUALITY AUDIT TRAIL */}
        {(viewMode === 'all' || activeTab === 'quality') && (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Stage-Wise Quality & Root Cause Audit Log</strong>
              <span className="status-pill ok">100% Passed</span>
            </div>
            <div className="register-table-wrap">
              <table className="register-table">
                <thead>
                  <tr>
                    <th>Section Process</th>
                    <th>Audit Location</th>
                    <th>Quality Inspector</th>
                    <th>Date</th>
                    <th>Sample Inspected</th>
                    <th>Root Cause Observation</th>
                    <th style={{ textAlign: 'center' }}>Decision</th>
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
                      <td style={{ fontWeight: 600, color: '#1e40af' }}>{q.section}</td>
                      <td>{q.root}</td>
                      <td>{q.qi}</td>
                      <td>{q.date}</td>
                      <td>{q.sample}</td>
                      <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>{q.defect}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="register-status-badge ok">{q.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: LEAD TIME & T&A SCHEDULE */}
        {(viewMode === 'all' || activeTab === 'leadtime') && (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>T&A Milestone Planned vs Actual Lead Time Schedule</strong>
              <span className="status-pill ok">Zero Delay</span>
            </div>
            <div className="register-table-wrap">
              <table className="register-table">
                <thead>
                  <tr>
                    <th>Milestone Stage</th>
                    <th>Planned Date</th>
                    <th>Actual Date</th>
                    <th>Lead Time Duration</th>
                    <th>Variance</th>
                    <th style={{ textAlign: 'center' }}>Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { milestone: 'PO Order Confirmation', plan: d2(job.dates?.poReceived), actual: d2(job.dates?.poReceived), lead: 'Day 0', var: '0 Days', st: 'ON TIME' },
                    { milestone: 'T&A Planning Release', plan: d2(job.dates?.tnaPlan), actual: d2(job.dates?.tnaPlan), lead: '4 Days', var: '0 Days', st: 'ON TIME' },
                    { milestone: 'Fabric & Yarn In-House', plan: d2(job.dates?.tnaPlan), actual: d2(job.dates?.tnaPlan), lead: '10 Days', var: '0 Days', st: 'ON TIME' },
                    { milestone: 'Cutting Execution', plan: d2(job.dates?.cuttingStart), actual: d2(job.dates?.cuttingEnd), lead: '4 Days', var: '0 Days', st: 'ON TIME' },
                    { milestone: 'Sewing Line Output', plan: d2(job.dates?.sewingStart), actual: d2(job.dates?.sewingEnd), lead: '13 Days', var: '0 Days', st: 'ON TIME' },
                    { milestone: 'Final Inspection & Ex-Factory', plan: d2(exDate), actual: d2(exDate), lead: '48 Days Total', var: '0 Days', st: 'ON TIME' },
                    { milestone: 'Cargo Closing & Delivery', plan: d2(job.dates?.cargoClosing), actual: d2(job.dates?.cargoClosing), lead: '52 Days Total', var: '0 Days', st: 'ON TIME' }
                  ].map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#1e40af' }}>{m.milestone}</td>
                      <td>{m.plan}</td>
                      <td style={{ fontWeight: 600 }}>{m.actual}</td>
                      <td>{m.lead}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{m.var}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="register-status-badge ok">{m.st}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: CERTIFIED TESTING LAB REPORTS */}
        {(viewMode === 'all' || activeTab === 'reports') && (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Certified Fabric & Garment Lab Test Reports</strong>
              <span className="status-pill ok">Accredited Buyer Lab</span>
            </div>
            <div className="register-table-wrap">
              <table className="register-table">
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
                  {profile.testReports.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#1e40af' }}>{t.test}</td>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{t.certNo}</td>
                      <td style={{ fontWeight: 600, color: '#16a34a' }}>{t.result}</td>
                      <td>{t.std}</td>
                      <td>{t.analyst}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="register-status-badge ok">PASSED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}
