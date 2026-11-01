'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import { displayJobNo } from '../../../lib/display';
import { api } from '../../../lib/api';

// Strict Color Standard
const COLORS = {
  navy: '#14243A',
  blue: '#2563EB',
  cyan: '#0891B2',
  green: '#16A34A',
  lightGreen: '#86EFAC',
  amber: '#F59E0B',
  orange: '#EA580C',
  red: '#DC2626',
  purple: '#7C3AED',
  teal: '#0F766E',
  grey: '#64748B',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0'
};

function fmt(num: any, decimals = 0): string {
  if (num === null || num === undefined || isNaN(num) || num === '') return 'N/A';
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function d2(dateStr: any) {
  if (!dateStr || dateStr === '—') return 'N/A';
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

export type Job360TabId =
  | 'overview'
  | 'po'
  | 'merch'
  | 'tna'
  | 'sample'
  | 'yarn'
  | 'knitting'
  | 'dyeing'
  | 'fabric'
  | 'trims'
  | 'cutting'
  | 'printing'
  | 'embroidery'
  | 'sewing'
  | 'washing'
  | 'finishing'
  | 'quality'
  | 'packing'
  | 'shipment'
  | 'documents'
  | 'history';

const TAB_DEFS: { id: Job360TabId; num: string; label: string; icon: string }[] = [
  { id: 'overview', num: '01', label: 'Order Overview', icon: '📋' },
  { id: 'po', num: '02', label: 'PO Breakdown', icon: '📦' },
  { id: 'merch', num: '03', label: 'Merchandising', icon: '👔' },
  { id: 'tna', num: '04', label: 'TNA', icon: '⏱️' },
  { id: 'sample', num: '05', label: 'Sample', icon: '👗' },
  { id: 'yarn', num: '06', label: 'Yarn', icon: '🧶' },
  { id: 'knitting', num: '07', label: 'Knitting', icon: '⚙️' },
  { id: 'dyeing', num: '08', label: 'Dyeing', icon: '🧪' },
  { id: 'fabric', num: '09', label: 'Fabric', icon: '🧵' },
  { id: 'trims', num: '10', label: 'Trims', icon: '🔘' },
  { id: 'cutting', num: '11', label: 'Cutting', icon: '✂️' },
  { id: 'printing', num: '12', label: 'Printing', icon: '🎨' },
  { id: 'embroidery', num: '13', label: 'Embroidery', icon: '🪡' },
  { id: 'sewing', num: '14', label: 'Sewing', icon: '👕' },
  { id: 'washing', num: '15', label: 'Washing', icon: '🧼' },
  { id: 'finishing', num: '16', label: 'Finishing', icon: '♨️' },
  { id: 'quality', num: '17', label: 'Quality', icon: '✅' },
  { id: 'packing', num: '18', label: 'Packing', icon: '📫' },
  { id: 'shipment', num: '19', label: 'Shipment', icon: '🚢' },
  { id: 'documents', num: '20', label: 'Documents', icon: '📑' },
  { id: 'history', num: '21', label: 'Activity History', icon: '📜' }
];

export default function Job360Page() {
  const params = useParams();
  const router = useRouter();
  const idParam = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const [activeTab, setActiveTab] = useState<Job360TabId>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nfl_user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const masterJobs: any[] = useMemo(() => (demo2000DataRaw as any)?.jobs || [], []);

  // Match Job
  const job = useMemo(() => {
    if (!idParam) return masterJobs[0] || null;
    const cleanId = decodeURIComponent(idParam).toLowerCase().trim();
    const strippedId = cleanId.replace(/^job\s*(#|no\.?|num\.?)?\s*/i, '').replace(/^#\s*/, '').trim();
    return masterJobs.find((j: any) => {
      const jNo = String(j.jobNo || '').toLowerCase().trim();
      const sNo = String(j.styleNo || '').toLowerCase().trim();
      return jNo === cleanId || jNo === strippedId || jNo.includes(strippedId) || sNo === cleanId;
    }) || masterJobs[0];
  }, [idParam, masterJobs]);

  if (!job) {
    return (
      <Shell title="Job 360" eyebrow="Order Intelligence">
        <div style={{ padding: '40px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px' }}>
          <h3>Order not found</h3>
          <button onClick={() => router.push('/jobs')} className="btn btn-primary" style={{ marginTop: '12px' }}>
            ← Back to All Jobs
          </button>
        </div>
      </Shell>
    );
  }

  const oq = Number(job.orderQty) || 0;
  const sewQty = Number(job.sewing?.sewingActualQty) || (job.presentStatus === 'Shipped' ? oq : Math.round(oq * 0.85));
  const cutQty = Number(job.cutting?.cutQty || job.cutting?.cutDone) || Math.round(oq * 1.02);
  const prodPct = oq > 0 ? Math.min(100, Math.round((sewQty / oq) * 100)) : 0;
  const tnaPct = job.presentStatus === 'Shipped' ? 100 : prodPct > 50 ? 92 : 75;
  const matPct = job.fabric?.fabricStatus?.includes('100%') ? 100 : 96;
  const sampleStatus = job.overallStage === 'SAMPLE' ? 'In Progress' : 'PP Approved';
  const shipPct = job.presentStatus === 'Shipped' ? 100 : Math.round(prodPct * 0.95);
  const delRisk = job.riskStatus === 'CRITICAL' ? 'High Risk' : 'On-Time / Low Risk';

  const printEmbStr = typeof job.printEmb === 'string' ? job.printEmb : JSON.stringify(job.printEmb || '');
  const hasPrint = Boolean(printEmbStr.includes('P') || String(job.itemDescription || '').toLowerCase().includes('print'));
  const hasEmb = Boolean(printEmbStr.includes('E') || String(job.itemDescription || '').toLowerCase().includes('emb'));
  const hasWash = Boolean(String(job.itemDescription || '').toLowerCase().includes('wash') || String(job.itemDescription || '').toLowerCase().includes('pant') || String(job.itemDescription || '').toLowerCase().includes('fleece'));

  return (
    <Shell
      title={`Job 360 · ${displayJobNo(job.jobNo, job.buyer)} · ${job.styleNo}`}
      eyebrow={`Comprehensive 21-Process Manufacturing Profile · ${job.buyer} · Assigned Floor: ${job.lineAllocation?.floor || 'Floor 1'}`}
    >
      <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '0 0 30px' }}>
        
        {/* Navigation & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => router.push('/jobs')}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: COLORS.navy,
                cursor: 'pointer'
              }}
            >
              ← Back to Jobs Register
            </button>
            <span style={{ fontSize: '11px', color: COLORS.grey }}>
              Job ID: <strong style={{ color: COLORS.navy }}>{job.jobNo}</strong> · PO Recv: {d2(job.dates?.poReceived)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '6px',
              background: delRisk === 'High Risk' ? '#FEE2E2' : '#DCFCE7',
              color: delRisk === 'High Risk' ? COLORS.red : COLORS.green
            }}>
              {delRisk}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: COLORS.navy,
                color: '#FFFFFF',
                border: 'none',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🖨️ Export Spec Sheet
            </button>
          </div>
        </div>

        {/* 7 HEADER KPIS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          background: COLORS.cardBg,
          padding: '12px 14px',
          borderRadius: '10px',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          marginBottom: '14px'
        }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Order Quantity</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>
              {fmt(oq)} <span style={{ fontSize: '11px', color: COLORS.grey }}>pcs</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Production Completion</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: prodPct >= 90 ? COLORS.green : COLORS.blue, marginTop: '2px' }}>
              {prodPct}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Material Readiness</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: matPct === 100 ? COLORS.green : COLORS.amber, marginTop: '2px' }}>
              {matPct}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Sample Status</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: COLORS.purple, marginTop: '4px' }}>
              {sampleStatus}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>TNA Completion</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: tnaPct >= 90 ? COLORS.green : COLORS.amber, marginTop: '2px' }}>
              {tnaPct}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Shipment Readiness</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: shipPct >= 90 ? COLORS.green : COLORS.cyan, marginTop: '2px' }}>
              {shipPct}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Delivery Risk</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: delRisk === 'High Risk' ? COLORS.red : COLORS.green, marginTop: '4px' }}>
              {delRisk}
            </div>
          </div>
        </div>

        {/* 21 TABS HORIZONTAL SCROLLBAR */}
        <div style={{
          display: 'flex',
          gap: '3px',
          overflowX: 'auto',
          background: '#FFFFFF',
          padding: '6px 8px',
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
          marginBottom: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {TAB_DEFS.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isSelected ? COLORS.navy : 'transparent',
                  color: isSelected ? '#FFFFFF' : COLORS.navy,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 11px',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.1s ease'
                }}
              >
                <span style={{ fontSize: '10px', opacity: isSelected ? 0.8 : 0.5, fontWeight: 700 }}>{t.num}</span>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div style={{
          background: COLORS.cardBg,
          borderRadius: '10px',
          border: `1px solid ${COLORS.border}`,
          padding: '20px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {/* TAB 01: ORDER OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                01 · Order Master Overview &amp; Specifications
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ color: COLORS.grey, fontSize: '10.5px', fontWeight: 700 }}>BUYER &amp; STYLE</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>{job.buyer}</div>
                  <div style={{ color: COLORS.blue, fontWeight: 700, marginTop: '2px' }}>Style: {job.styleNo}</div>
                  <div style={{ color: '#475569', marginTop: '4px' }}>{job.itemDescription || 'Garment Item'}</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ color: COLORS.grey, fontSize: '10.5px', fontWeight: 700 }}>ORDER QUANTITIES</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>{fmt(oq)} pcs</div>
                  <div style={{ color: COLORS.green, fontWeight: 700, marginTop: '2px' }}>Sewing Finished: {fmt(sewQty)} pcs</div>
                  <div style={{ color: COLORS.amber, fontWeight: 700, marginTop: '2px' }}>Sewing Balance: {fmt(Math.max(0, oq - sewQty))} pcs</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ color: COLORS.grey, fontSize: '10.5px', fontWeight: 700 }}>KEY TIMELINE MILESTONES</div>
                  <div style={{ marginTop: '4px' }}>PO Received: <strong>{d2(job.dates?.poReceived)}</strong></div>
                  <div style={{ marginTop: '2px' }}>Cutting Start: <strong>{d2(job.dates?.cuttingStart)}</strong></div>
                  <div style={{ marginTop: '2px' }}>Sewing Start: <strong>{d2(job.dates?.sewingStart)}</strong></div>
                  <div style={{ marginTop: '2px', color: COLORS.blue }}>Ex-Factory Cargo: <strong>{d2(job.dates?.exFactory)}</strong></div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ color: COLORS.grey, fontSize: '10.5px', fontWeight: 700 }}>PLANT ALLOCATION</div>
                  <div style={{ marginTop: '4px' }}>Factory: <strong>{job.lineAllocation?.factory || 'NFL Plant 1'}</strong></div>
                  <div style={{ marginTop: '2px' }}>Floor: <strong>{job.lineAllocation?.floor || 'Floor 2'}</strong></div>
                  <div style={{ marginTop: '2px' }}>Sewing Line: <strong style={{ color: COLORS.orange }}>{job.lineAllocation?.line || 'Line 14B'}</strong></div>
                  <div style={{ marginTop: '2px' }}>Merchandiser: <strong>{job.merchandiser || 'Md. Imran'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 02: PO BREAKDOWN */}
          {activeTab === 'po' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                02 · Purchase Order Breakdown &amp; Destination Country Splits
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: '8px 10px' }}>PO Number</th>
                    <th style={{ padding: '8px 10px' }}>Destination Market</th>
                    <th style={{ padding: '8px 10px' }}>Delivery Port</th>
                    <th style={{ padding: '8px 10px' }}>Terms</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>PO Quantity</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cartons</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { po: `PO-${job.jobNo}-DE`, country: 'Germany 🇩🇪', port: 'Hamburg', terms: 'FOB Chittagong', qty: Math.round(oq * 0.45), cartons: Math.ceil((oq * 0.45) / 24) },
                    { po: `PO-${job.jobNo}-FR`, country: 'France 🇫🇷', port: 'Le Havre', terms: 'FOB Chittagong', qty: Math.round(oq * 0.30), cartons: Math.ceil((oq * 0.30) / 24) },
                    { po: `PO-${job.jobNo}-UK`, country: 'United Kingdom 🇬🇧', port: 'Felixstowe', terms: 'FOB Chittagong', qty: Math.round(oq * 0.25), cartons: Math.ceil((oq * 0.25) / 24) },
                  ].map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.blue }}>{p.po}</td>
                      <td style={{ padding: '8px 10px' }}>{p.country}</td>
                      <td style={{ padding: '8px 10px' }}>{p.port}</td>
                      <td style={{ padding: '8px 10px' }}>{p.terms}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(p.qty)} pcs</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(p.cartons)} ctn</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                          Production Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 03: MERCHANDISING */}
          {activeTab === 'merch' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                03 · Merchandising Account &amp; Cost Sheet Control
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', fontSize: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>Merchandising Team Contacts</div>
                  <div>Account Lead: <strong>{job.merchandiser || 'Md. Imran'}</strong></div>
                  <div>Department: <strong>Team {job.buyer} (Bulk Division)</strong></div>
                  <div>Email: <span style={{ color: COLORS.blue }}>{job.merchandiser?.toLowerCase().replace(/\s+/g, '.') || 'merch'}@northernfashions.com</span></div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>Cost Sheet &amp; Consumption Reference</div>
                  <div>CAD Consumption: <strong>210 GSM Single Jersey · 2.45 kg / dzn</strong></div>
                  <div>Sewing SMV: <strong>{job.ie?.smv || '7.5'} min</strong></div>
                  <div>Fabric Requirement: <strong>{fmt(Math.round(oq * 0.22))} kg</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 04: TNA */}
          {activeTab === 'tna' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                04 · Time &amp; Action (TNA) Critical Path Engine
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: '7px 10px' }}>Milestone Event</th>
                    <th style={{ padding: '7px 10px' }}>Department</th>
                    <th style={{ padding: '7px 10px' }}>Target Plan Date</th>
                    <th style={{ padding: '7px 10px' }}>Actual Date</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center' }}>Variance</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { event: 'Order Confirmation & PO Receipt', dept: 'Merchandising', plan: d2(job.dates?.poReceived), actual: d2(job.dates?.poReceived), diff: '0d', status: 'OK' },
                    { event: 'Lab Dip & Shade Approval', dept: 'Testing Lab', plan: '10-Feb-26', actual: '08-Feb-26', diff: '-2d', status: 'OK' },
                    { event: 'Yarn In-House Godown', dept: 'Yarn Store', plan: '25-Feb-26', actual: '24-Feb-26', diff: '-1d', status: 'OK' },
                    { event: 'Knitting Greige Output', dept: 'Knitting', plan: '15-Mar-26', actual: '16-Mar-26', diff: '+1d', status: 'OK' },
                    { event: 'Dyeing Batch Release', dept: 'Dyeing', plan: '05-Apr-26', actual: '05-Apr-26', diff: '0d', status: 'OK' },
                    { event: 'PP Sample Buyer Sign-off', dept: 'Sample Room', plan: '20-Apr-26', actual: '18-Apr-26', diff: '-2d', status: 'OK' },
                    { event: 'Bulk Fabric In-House', dept: 'Fabric Store', plan: '02-May-26', actual: '02-May-26', diff: '0d', status: 'OK' },
                    { event: 'Cutting Lay & Cut Out', dept: 'Cutting', plan: d2(job.dates?.cuttingStart), actual: d2(job.dates?.cuttingStart), diff: '0d', status: 'OK' },
                    { event: 'Sewing Line Input', dept: 'Sewing', plan: d2(job.dates?.sewingStart), actual: d2(job.dates?.sewingStart), diff: '0d', status: 'RUNNING' },
                    { event: 'Ex-Factory Cargo Handover', dept: 'Commercial', plan: d2(job.dates?.exFactory), actual: 'Pending', diff: '0d', status: 'PENDING' }
                  ].map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 700, color: COLORS.navy }}>{m.event}</td>
                      <td style={{ padding: '7px 10px' }}>{m.dept}</td>
                      <td style={{ padding: '7px 10px' }}>{m.plan}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 600 }}>{m.actual}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: m.diff.includes('+') ? COLORS.red : COLORS.green, fontWeight: 700 }}>{m.diff}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: m.status === 'OK' ? '#DCFCE7' : m.status === 'RUNNING' ? '#EFF6FF' : '#F1F5F9', color: m.status === 'OK' ? COLORS.green : m.status === 'RUNNING' ? COLORS.blue : COLORS.grey }}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 05: SAMPLE */}
          {activeTab === 'sample' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                05 · Sample Development &amp; Buyer Sign-off
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {[
                  { name: 'Proto Sample', status: 'Approved', date: '14-Feb-26', comment: 'Fit approved without amendment' },
                  { name: 'Fit Sample', status: 'Approved', date: '28-Feb-26', comment: 'Armhole adjusted +0.5cm' },
                  { name: 'Size-Set Sample', status: 'Approved', date: '15-Mar-26', comment: 'Grading verified S-XXL' },
                  { name: 'PP (Pre-Production)', status: 'Approved', date: '18-Apr-26', comment: 'Buyer sealed gold seal' },
                  { name: 'SMS (Salesman)', status: 'Delivered', date: '02-May-26', comment: '14 sets dispatched' }
                ].map((s, i) => (
                  <div key={i} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 700, margin: '3px 0' }}>✓ {s.status} ({s.date})</div>
                    <div style={{ fontSize: '11px', color: COLORS.grey }}>{s.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 06: YARN */}
          {activeTab === 'yarn' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                06 · Yarn Procurement, Lot Numbers &amp; Physical Stock
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ color: COLORS.grey, fontSize: '10.5px', fontWeight: 700 }}>YARN SPECIFICATION</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>30/1 Carded Cotton 100%</div>
                  <div>Spinning Mill: <strong>Badsha Spinning Ltd</strong></div>
                  <div>Lot No: <strong style={{ color: COLORS.blue }}>BS-2026-889</strong></div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ color: COLORS.grey, fontSize: '10.5px', fontWeight: 700 }}>QUANTITY TRACKER</div>
                  <div>Required: <strong>{fmt(Math.round(oq * 0.23))} kg</strong></div>
                  <div>Received in Godown: <strong style={{ color: COLORS.green }}>{fmt(Math.round(oq * 0.23))} kg (100%)</strong></div>
                  <div>Issued to Knitting: <strong>{fmt(Math.round(oq * 0.22))} kg</strong></div>
                  <div>Balance in Store: <strong>{fmt(Math.round(oq * 0.01))} kg</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 07: KNITTING */}
          {activeTab === 'knitting' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                07 · Knitting Operations &amp; Greige Output
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Machine Type: <strong>Circular Knitting (Terrot 30&quot; x 24GG)</strong></div>
                  <div>Greige Roll Output: <strong>148 Rolls ({fmt(Math.round(oq * 0.22))} kg)</strong></div>
                  <div>Quality 4-point inspection: <strong style={{ color: COLORS.green }}>Pass (1.2 pts/100m)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 08: DYEING */}
          {activeTab === 'dyeing' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                08 · Dyeing Batch Processing &amp; Shade Approvals
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Batch No: <strong style={{ color: COLORS.blue }}>DYE-{job.jobNo}-01</strong></div>
                  <div>Winch Allocated: <strong>HTHP Winch #12 (Fong&apos;s 1000kg)</strong></div>
                  <div>RFT %: <strong style={{ color: COLORS.green }}>98.2% (First Time Right)</strong></div>
                  <div>Shade OK: <strong style={{ color: COLORS.green }}>✓ Lab Head Approved</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 09: FABRIC */}
          {activeTab === 'fabric' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                09 · Finished Fabric Store &amp; Roll Release
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Available Finish Fabric: <strong style={{ color: COLORS.green }}>{fmt(Math.round(oq * 0.21))} kg</strong></div>
                  <div>Relaxation Time: <strong>24 hrs completed</strong></div>
                  <div>Width &amp; GSM: <strong>68&quot; Open Width · 180 GSM (Spec 180 ± 5)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: TRIMS */}
          {activeTab === 'trims' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                10 · Trims &amp; Accessories Store Readiness
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: '6px 8px' }}>Item</th>
                    <th style={{ padding: '6px 8px' }}>Specification</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Required</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Received</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { item: 'Main Label', spec: 'Woven Heat-cut', req: oq, recv: oq },
                    { item: 'Care Label', spec: 'Satin Printed Barcode', req: oq, recv: oq },
                    { item: 'Sewing Thread', spec: '40/2 Poly Green Lily', req: `${Math.ceil(oq / 200)} cones`, recv: `${Math.ceil(oq / 200)} cones` },
                    { item: 'Poly Bag', spec: 'Self Adhesive Recycled', req: oq, recv: oq }
                  ].map((tr, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{tr.item}</td>
                      <td style={{ padding: '6px 8px' }}>{tr.spec}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{typeof tr.req === 'number' ? fmt(tr.req) : tr.req}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: COLORS.green, fontWeight: 700 }}>{typeof tr.recv === 'number' ? fmt(tr.recv) : tr.recv}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9.5px', background: '#DCFCE7', color: COLORS.green, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          100% OK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 11: CUTTING */}
          {activeTab === 'cutting' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                11 · Cutting Floor &amp; CAD Marker Execution
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>CAD Marker Efficiency: <strong>84.2%</strong></div>
                  <div>Cut Target: <strong>{fmt(cutQty)} pcs</strong></div>
                  <div>Cut Actual: <strong style={{ color: COLORS.green }}>{fmt(cutQty)} pcs</strong></div>
                  <div>Cut Balance: <strong style={{ color: COLORS.green }}>0 pcs (Completed)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: PRINTING */}
          {activeTab === 'printing' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                12 · Printing Section &amp; Strike-off Follow-up
              </h3>
              {hasPrint ? (
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Print Technique: <strong>Rubber &amp; High-Density Puff Print</strong></div>
                  <div>Location: <strong>Front Chest &amp; Back Neck</strong></div>
                  <div>Strike-off Approval: <strong style={{ color: COLORS.green }}>✓ Approved by Buyer</strong></div>
                  <div>Delivered from Print: <strong>{fmt(cutQty)} pcs (100%)</strong></div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: COLORS.grey, background: '#F8FAFC', borderRadius: '8px' }}>
                  <strong>N/A</strong> — No printing operation applicable for this solid style.
                </div>
              )}
            </div>
          )}

          {/* TAB 13: EMBROIDERY */}
          {activeTab === 'embroidery' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                13 · Embroidery Operations &amp; Swatches
              </h3>
              {hasEmb ? (
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Stitch Count: <strong>6,400 Stitches</strong></div>
                  <div>Position: <strong>Left Chest Monogram</strong></div>
                  <div>Machine: <strong>Tajima 20-Head Embroidery</strong></div>
                  <div>Approved Swatch: <strong style={{ color: COLORS.green }}>✓ Sealed</strong></div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: COLORS.grey, background: '#F8FAFC', borderRadius: '8px' }}>
                  <strong>N/A</strong> — No embroidery operation specified in Buyer Tech Pack.
                </div>
              )}
            </div>
          )}

          {/* TAB 14: SEWING */}
          {activeTab === 'sewing' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                14 · Sewing Line Output &amp; Hourly Efficiency
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Allocated Line: <strong style={{ color: COLORS.blue }}>{job.lineAllocation?.line || 'Line 14B'}</strong></div>
                  <div>Daily Target: <strong>1,800 pcs / day</strong></div>
                  <div>Cumulative Produced: <strong style={{ color: COLORS.green }}>{fmt(sewQty)} pcs</strong></div>
                  <div>Sewing DHU: <strong>1.4% (Within AQL)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 15: WASHING */}
          {activeTab === 'washing' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                15 · Garment Washing &amp; Softener Finish
              </h3>
              {hasWash ? (
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Wash Formula: <strong>Enzyme Silicon Wash with Peach Hand-feel</strong></div>
                  <div>Wash Plant: <strong>NFL In-house Eco Wash</strong></div>
                  <div>Washed Output: <strong>{fmt(sewQty)} pcs</strong></div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: COLORS.grey, background: '#F8FAFC', borderRadius: '8px' }}>
                  <strong>N/A</strong> — Garment wash not required for this knit order.
                </div>
              )}
            </div>
          )}

          {/* TAB 16: FINISHING */}
          {activeTab === 'finishing' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                16 · Finishing, Thread Trimming &amp; Ironing
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Ironed &amp; Trimmed: <strong style={{ color: COLORS.green }}>{fmt(sewQty)} pcs</strong></div>
                  <div>Metal Detector Scan: <strong style={{ color: COLORS.green }}>✓ 100% Passed (9-point needle safe)</strong></div>
                  <div>Hangtag Attached: <strong>{fmt(sewQty)} pcs</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 17: QUALITY */}
          {activeTab === 'quality' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                17 · Quality Assurance &amp; Final AQL Audit
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Inspection Standard: <strong>AQL 1.5 Major / 2.5 Minor</strong></div>
                  <div>Sample Inspected: <strong>315 pcs</strong></div>
                  <div>Major Defects: <strong>1 pc (Accepted &lt;= 7)</strong></div>
                  <div>Minor Defects: <strong>3 pcs (Accepted &lt;= 14)</strong></div>
                  <div>Audit Result: <strong style={{ color: COLORS.green }}>PASSED ✓</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 18: PACKING */}
          {activeTab === 'packing' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                18 · Packing List, Carton Markings &amp; Barcode Verification
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Total Cartons Packed: <strong>{fmt(Math.ceil(oq / 24))} Cartons</strong></div>
                  <div>Packing Method: <strong>Single Poly · 24 pcs / Solid Size Assorted Ratio</strong></div>
                  <div>Carton Dimensions: <strong>60cm x 40cm x 30cm (7-ply heavy board)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 19: SHIPMENT */}
          {activeTab === 'shipment' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                19 · Shipment, Forwarder Handover &amp; Export Challan
              </h3>
              <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div>Designated Forwarder: <strong>Kuehne + Nagel Logistics</strong></div>
                  <div>Port of Loading: <strong>Chittagong Seaport, Bangladesh</strong></div>
                  <div>Scheduled Ex-Factory: <strong style={{ color: COLORS.blue }}>{d2(job.dates?.exFactory)}</strong></div>
                  <div>Commercial Invoice: <strong>NFL/EXP/2026/0488</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 20: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                20 · Official Documents &amp; Technical Archives
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', fontSize: '11.5px' }}>
                {[
                  { name: `Buyer Purchase Order PO-${job.jobNo}.pdf`, type: 'Commercial PO', size: '1.2 MB' },
                  { name: `Approved Tech Pack - ${job.styleNo}.pdf`, type: 'Technical Spec', size: '3.8 MB' },
                  { name: `Signed Backward T&A Schedule.pdf`, type: 'Planning', size: '640 KB' },
                  { name: `Lab Dip Shade Approval Card.pdf`, type: 'Testing Lab', size: '1.4 MB' },
                  { name: `CAD Marker Layout & Consumption.dxf`, type: 'CAD File', size: '5.2 MB' }
                ].map((doc, i) => (
                  <div key={i} style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: COLORS.navy }}>{doc.name}</div>
                      <div style={{ fontSize: '10px', color: COLORS.grey }}>{doc.type} · {doc.size}</div>
                    </div>
                    <button type="button" onClick={() => alert(`Downloading ${doc.name}`)} style={{ fontSize: '10px', background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 21: ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, margin: '0 0 14px' }}>
                21 · System Audit Trail &amp; Production Stage Transitions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
                {[
                  { user: 'Tariqul Islam (Head)', role: 'ADMIN', action: 'Approved Planning Release Draft to Knitting & Dyeing', time: '18-Apr-2026 14:32' },
                  { user: 'Md. Imran', role: 'MERCHANDISER', action: 'Uploaded Final Sealed PP Comments from Buyer', time: '18-Apr-2026 11:15' },
                  { user: 'Dr. Nazrul Islam', role: 'LAB_HEAD', action: 'Certified Lab Dip Shade OK (Delta-E: 0.42)', time: '08-Feb-2026 16:45' },
                  { user: 'Md. Rafiqul Islam', role: 'CAD_SPECIALIST', action: 'Generated Marker Efficiency (84.2%) and color consumption', time: '28-Jan-2026 10:20' },
                  { user: 'Md. Imran', role: 'MERCHANDISER', action: 'Created Job Order from Official Buyer PO', time: '21-Jan-2026 09:00' }
                ].map((h, i) => (
                  <div key={i} style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', borderLeft: `3px solid ${COLORS.blue}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: COLORS.navy }}>{h.user}</strong> <span style={{ fontSize: '10px', color: COLORS.grey }}>({h.role})</span>: {h.action}
                    </div>
                    <div style={{ fontSize: '10px', color: COLORS.grey, whiteSpace: 'nowrap', marginLeft: '12px' }}>{h.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </Shell>
  );
}
