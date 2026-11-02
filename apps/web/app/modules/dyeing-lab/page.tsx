'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';

interface LabDipRecord {
  id: string;
  dipNo: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  colorName: string;
  pantoneRef: string;
  fabricType: string;
  stage: 'SMS_SAMPLE' | 'BULK_PENDING' | 'BULK_APPROVED';
  optionCode: 'A' | 'B' | 'C' | 'D';
  recipe: string;
  deltaE: number;
  d65Match: string;
  tl84Match: string;
  cwfMatch: string;
  status: 'APPROVED' | 'PENDING_BUYER' | 'RE_DIP_REQUIRED' | 'SUBMITTED';
  submissionDate: string;
  feedbackDate?: string;
  technician: string;
  comments: string;
}

const INITIAL_LAB_DIPS: LabDipRecord[] = [
  {
    id: 'DIP-2026-001',
    dipNo: 'LD-48085-01',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    colorName: 'Nosegay Pink',
    pantoneRef: 'TCX 14-1911',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    stage: 'SMS_SAMPLE',
    optionCode: 'A',
    recipe: 'Novacron Red FN-2BL (0.42%) + Yellow FN-2R (0.12%)',
    deltaE: 0.42,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.0',
    status: 'APPROVED',
    submissionDate: '2026-08-01',
    feedbackDate: '2026-08-04',
    technician: 'S. K. Paul (Dyeing Chemist)',
    comments: 'Buyer confirmed Option A for SMS & Bulk master standard.'
  },
  {
    id: 'DIP-2026-002',
    dipNo: 'LD-48002-02',
    jobNo: '48002',
    buyer: 'ONLY',
    styleNo: '13251512',
    colorName: 'Estate Blue',
    pantoneRef: 'TCX 19-4027',
    fabricType: '100% Combed Cotton 160 GSM',
    stage: 'BULK_PENDING',
    optionCode: 'B',
    recipe: 'Remazol Navy RGB (1.85%) + Blue RGB (0.64%)',
    deltaE: 0.78,
    d65Match: 'Grade 3.5 (Redder)',
    tl84Match: 'Grade 3.0',
    cwfMatch: 'Grade 3.5',
    status: 'RE_DIP_REQUIRED',
    submissionDate: '2026-08-10',
    feedbackDate: '2026-08-14',
    technician: 'Kamrul Hasan',
    comments: 'Buyer rejected Option B. Need to decrease red tone by 15%. Re-dip C & D dispatched.'
  },
  {
    id: 'DIP-2026-003',
    dipNo: 'LD-48002-03',
    jobNo: '48002',
    buyer: 'ONLY',
    styleNo: '13251512',
    colorName: 'Estate Blue (Re-dip)',
    pantoneRef: 'TCX 19-4027',
    fabricType: '100% Combed Cotton 160 GSM',
    stage: 'BULK_PENDING',
    optionCode: 'C',
    recipe: 'Remazol Navy RGB (1.92%) + Turquoise G (0.35%)',
    deltaE: 0.38,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.5',
    status: 'SUBMITTED',
    submissionDate: '2026-08-18',
    technician: 'Kamrul Hasan',
    comments: 'Revised dip sent via DHL to buyer office. Urgent follow-up for bulk dyeing slot.'
  },
  {
    id: 'DIP-2026-004',
    dipNo: 'LD-46755-01',
    jobNo: '46755',
    buyer: 'OVS',
    styleNo: '13251480',
    colorName: 'Sage Green',
    pantoneRef: 'TCX 15-0318',
    fabricType: 'CVC 60/40 190 GSM',
    stage: 'SMS_SAMPLE',
    optionCode: 'A',
    recipe: 'Disperse Yellow SE-6G (0.8%) + Reactive Green (1.1%)',
    deltaE: 0.51,
    d65Match: 'Grade 4.0',
    tl84Match: 'Grade 4.0',
    cwfMatch: 'Grade 4.0',
    status: 'APPROVED',
    submissionDate: '2026-08-05',
    feedbackDate: '2026-08-09',
    technician: 'F. Rahman',
    comments: 'Two-bath dyeing recipe finalized. Cotton & Poly cross-match approved.'
  },
  {
    id: 'DIP-2026-005',
    dipNo: 'LD-46758-01',
    jobNo: '46758',
    buyer: 'UTG',
    styleNo: '13251495',
    colorName: 'Charcoal Melange Overdye',
    pantoneRef: 'TCX 18-0601',
    fabricType: '95% Cotton / 5% Lycra 200 GSM',
    stage: 'SMS_SAMPLE',
    optionCode: 'B',
    recipe: 'Black B (1.2%) + Violet 5R (0.08%)',
    deltaE: 0.44,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.0',
    cwfMatch: 'Grade 4.5',
    status: 'APPROVED',
    submissionDate: '2026-08-08',
    feedbackDate: '2026-08-12',
    technician: 'S. K. Paul',
    comments: 'Spandex low-temp dyeing profile used (60°C fixing).'
  },
  {
    id: 'DIP-2026-006',
    dipNo: 'LD-48061-01',
    jobNo: '48061',
    buyer: 'Name It',
    styleNo: '13251509',
    colorName: 'Buttercup Yellow',
    pantoneRef: 'TCX 12-0752',
    fabricType: '100% Organic Cotton GOTS 175 GSM',
    stage: 'BULK_PENDING',
    optionCode: 'A',
    recipe: 'GOTS Certified Reactive Yellow 3FL (0.65%)',
    deltaE: 0.65,
    d65Match: 'Grade 4.0',
    tl84Match: 'Grade 3.5',
    cwfMatch: 'Grade 4.0',
    status: 'PENDING_BUYER',
    submissionDate: '2026-08-20',
    technician: 'M. Ali',
    comments: 'Eco-passport dyes used. Courier tracking #DHL-8890123. Awaiting Merchandiser approval update.'
  },
  {
    id: 'DIP-2026-007',
    dipNo: 'LD-48110-01',
    jobNo: '48110',
    buyer: 'Only&Sons',
    styleNo: '13251532',
    colorName: 'Crimson Red (Yarn Dye)',
    pantoneRef: 'TCX 19-1762',
    fabricType: 'Package Yarn Dyeing 32/2',
    stage: 'SMS_SAMPLE',
    optionCode: 'A',
    recipe: 'Novacron Red Super (3.2%)',
    deltaE: 0.35,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.5',
    status: 'APPROVED',
    submissionDate: '2026-08-11',
    feedbackDate: '2026-08-15',
    technician: 'F. Rahman',
    comments: 'Yarn package carrier batch recipe validated. Ready for bulk package dye.'
  }
];

export default function DyeingLabPage() {
  const [selectedStage, setSelectedStage] = useState<'ALL' | 'SMS_SAMPLE' | 'BULK_PENDING' | 'BULK_APPROVED'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<LabDipRecord[]>(INITIAL_LAB_DIPS);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Lab Dip Form State
  const [newDip, setNewDip] = useState({
    jobNo: '48093',
    buyer: 'ONLY',
    styleNo: '22041',
    colorName: '',
    pantoneRef: '',
    fabricType: '100% Cotton Single Jersey',
    stage: 'SMS_SAMPLE' as const,
    optionCode: 'A' as const,
    recipe: '',
    deltaE: '0.45',
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.0',
    cwfMatch: 'Grade 4.5',
    technician: 'S. K. Paul (Sr. Chemist)',
    comments: ''
  });

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStage = selectedStage === 'ALL' || r.stage === selectedStage;
      const matchStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        r.dipNo.toLowerCase().includes(q) ||
        r.jobNo.includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.styleNo.toLowerCase().includes(q) ||
        r.colorName.toLowerCase().includes(q);
      return matchStage && matchStatus && matchSearch;
    });
  }, [records, selectedStage, selectedStatus, searchQuery]);

  // Statistics
  const totalDips = records.length;
  const approvedDips = records.filter(r => r.status === 'APPROVED').length;
  const pendingBuyerDips = records.filter(r => r.status === 'PENDING_BUYER' || r.status === 'SUBMITTED').length;
  const reDipRequired = records.filter(r => r.status === 'RE_DIP_REQUIRED').length;
  const approvalRate = Math.round((approvedDips / totalDips) * 100);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created: LabDipRecord = {
      id: `DIP-${Date.now()}`,
      dipNo: `LD-${newDip.jobNo}-${Math.floor(10 + Math.random() * 89)}`,
      jobNo: newDip.jobNo,
      buyer: newDip.buyer,
      styleNo: newDip.styleNo,
      colorName: newDip.colorName || 'New Shade',
      pantoneRef: newDip.pantoneRef || 'TCX 19-0000',
      fabricType: newDip.fabricType,
      stage: newDip.stage,
      optionCode: newDip.optionCode,
      recipe: newDip.recipe || 'Standard Reactive Dosing Formula',
      deltaE: parseFloat(newDip.deltaE) || 0.45,
      d65Match: newDip.d65Match,
      tl84Match: newDip.tl84Match,
      cwfMatch: newDip.cwfMatch,
      status: 'SUBMITTED',
      submissionDate: new Date().toISOString().split('T')[0],
      technician: newDip.technician,
      comments: newDip.comments || 'Prepared and submitted for buyer approval.'
    };
    setRecords([created, ...records]);
    setShowAddModal(false);
  };

  return (
    <Shell
      title="Dyeing Lab (ডাইং ল্যাব)"
      eyebrow="SMS / Sample Stage Shade Approvals, Lab Dip Formulations & Bulk Order Shade Clearance"
    >
      {/* =========================================================================
          DEPARTMENT HERO BANNER
         ========================================================================= */}
      <section className="module-hero" style={{ marginBottom: 16 }}>
        <div>
          <span className="status-pill" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            Pre-Dyeing Color Development Desk
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            Dyeing Laboratory &amp; Lab Dip Management
          </h2>
          <p style={{ fontSize: 13.5, color: '#475569', maxWidth: 880 }}>
            Centralized shade matching starting from SMS (Sales Sample) stage through bulk order receipt. Formulates recipe options (A, B, C, D), checks spectrophotometer ΔE color tolerance, tracks buyer approvals, and fast-tracks revised strike-offs for pending bulk orders.
          </p>
        </div>
        <div className="module-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/modules/testing-lab"
            style={{
              fontSize: 13,
              fontWeight: 750,
              padding: '8px 14px',
              background: '#F0FDF4',
              color: '#15803D',
              border: '1px solid #86EFAC',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            🧪 Testing Lab &amp; Delivery Gate →
          </Link>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: 13.5, fontWeight: 700, padding: '9px 16px', background: '#0F274E', color: '#FFFFFF', borderRadius: 8 }}
          >
            + Develop New Lab Dip
          </button>
        </div>
      </section>

      {/* =========================================================================
          KEY KPI TILES
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #2563EB', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>Total Lab Dips</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{totalDips} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>shades</span></div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>SMS &amp; Bulk combined</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #16A34A', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#166534', textTransform: 'uppercase' }}>Approved Shades</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#15803D', marginTop: 4 }}>{approvedDips} <span style={{ fontSize: 13, fontWeight: 600 }}>({approvalRate}%)</span></div>
          <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Ready for bulk dyeing</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #D97706', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#B45309', textTransform: 'uppercase' }}>Pending Buyer Review</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#B45309', marginTop: 4 }}>{pendingBuyerDips} <span style={{ fontSize: 13, fontWeight: 600 }}>batches</span></div>
          <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Samples dispatched via courier</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #DC2626', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#991B1B', textTransform: 'uppercase' }}>Re-Dip Required</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626', marginTop: 4 }}>{reDipRequired} <span style={{ fontSize: 13, fontWeight: 600 }}>shades</span></div>
          <div style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>Shade correction in progress</div>
        </div>
      </div>

      {/* =========================================================================
          SMS & BULK APPROVAL WORKFLOW BANNER
         ========================================================================= */}
      <div style={{
        background: 'linear-gradient(90deg, #0B1E3B 0%, #17325C 100%)',
        color: '#FFFFFF',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 24 }}>🎨</span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>Standard Laboratory Operating Protocol</div>
            <div style={{ fontSize: 12.5, color: '#CBD5E1', marginTop: 2 }}>
              SMS samples are formulated on 4 options (A, B, C, D) using Datacolor 800 spectrophotometer. Any rejected shade triggers an immediate priority re-dip dispatched within 48 hours to prevent bulk production delay.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            Spectro Tolerance: ΔE &lt; 0.60
          </span>
          <span style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            Light Sources: D65 / TL84 / CWF
          </span>
        </div>
      </div>

      {/* =========================================================================
          FILTER & SEARCH RIBBON
         ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Stage Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Lab Dips' },
            { key: 'SMS_SAMPLE', label: 'SMS Sample Stage' },
            { key: 'BULK_PENDING', label: 'Bulk Order Pending' },
            { key: 'BULK_APPROVED', label: 'Bulk Approved Standard' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStage(tab.key as any)}
              style={{
                fontSize: 13,
                fontWeight: 750,
                padding: '6px 14px',
                borderRadius: 6,
                border: selectedStage === tab.key ? '1px solid #0F274E' : '1px solid #CBD5E1',
                background: selectedStage === tab.key ? '#0F274E' : '#F8FAFC',
                color: selectedStage === tab.key ? '#FFFFFF' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown & Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ fontSize: 13, fontWeight: 650, padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved (Green)</option>
            <option value="SUBMITTED">Submitted to Buyer</option>
            <option value="PENDING_BUYER">Pending Buyer Review</option>
            <option value="RE_DIP_REQUIRED">Re-Dip Required (Red)</option>
          </select>

          <input
            type="text"
            placeholder="Search by Job, Buyer, Color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', width: 220, outline: 'none' }}
          />
        </div>
      </div>

      {/* =========================================================================
          LAB DIP MASTER REGISTER TABLE
         ========================================================================= */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14.5, color: '#0F172A' }}>
            Dyeing Lab Dip &amp; Shade Approval Master Register ({filteredRecords.length} records)
          </strong>
          <span style={{ fontSize: 12.5, color: '#64748B' }}>
            Auto-linked with Sales &amp; Merchandising and Dyeing Production
          </span>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '540px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#F1F5F9', zIndex: 10 }}>
              <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Dip No / Ref</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Job / Style</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Buyer</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Color Name / Pantone</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Fabric Quality</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Option</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>ΔE (CMC)</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>D65 / TL84</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Comments &amp; Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => {
                const isApproved = r.status === 'APPROVED';
                const isReDip = r.status === 'RE_DIP_REQUIRED';
                const isPending = r.status === 'PENDING_BUYER' || r.status === 'SUBMITTED';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#0F274E' }}>{r.dipNo}</strong>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#64748B' }}>Sub: {r.submissionDate}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 750, color: '#0F172A' }}>Job #{r.jobNo}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#475569' }}>Style: {r.styleNo}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B' }}>
                      {r.buyer}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#0F172A' }}>{r.colorName}</strong>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#64748B' }}>{r.pantoneRef}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, color: '#334155' }}>
                      {r.fabricType}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontWeight: 800, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                        Option {r.optionCode}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontWeight: 800, color: r.deltaE <= 0.5 ? '#15803D' : '#B45309' }}>
                        {r.deltaE.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#475569' }}>
                      <div>{r.d65Match}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{r.tl84Match}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 750,
                        background: isApproved ? '#DCFCE7' : isReDip ? '#FEE2E2' : '#FEF3C7',
                        color: isApproved ? '#15803D' : isReDip ? '#B91C1C' : '#B45309',
                        letterSpacing: '0.02em'
                      }}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, color: '#334155', maxWidth: 280 }}>
                      <div>{r.comments}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Chemist: {r.technician}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD NEW LAB DIP / SHADE SAMPLE
         ========================================================================= */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            maxWidth: 620,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>+ Develop New Lab Dip Formulation</h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Job No *</label>
                  <input
                    type="text"
                    required
                    value={newDip.jobNo}
                    onChange={e => setNewDip({ ...newDip, jobNo: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Buyer *</label>
                  <input
                    type="text"
                    required
                    value={newDip.buyer}
                    onChange={e => setNewDip({ ...newDip, buyer: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Color Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vintage Navy"
                    value={newDip.colorName}
                    onChange={e => setNewDip({ ...newDip, colorName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Pantone Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. TCX 19-3921"
                    value={newDip.pantoneRef}
                    onChange={e => setNewDip({ ...newDip, pantoneRef: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Stage</label>
                  <select
                    value={newDip.stage}
                    onChange={e => setNewDip({ ...newDip, stage: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6, background: '#F8FAFC' }}
                  >
                    <option value="SMS_SAMPLE">SMS Sample</option>
                    <option value="BULK_PENDING">Bulk Pending</option>
                    <option value="BULK_APPROVED">Bulk Approved</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Option Code</label>
                  <select
                    value={newDip.optionCode}
                    onChange={e => setNewDip({ ...newDip, optionCode: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6, background: '#F8FAFC' }}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ΔE (CMC 2:1)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDip.deltaE}
                    onChange={e => setNewDip({ ...newDip, deltaE: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Recipe Dyes &amp; Chemical Formulation</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Reactive Yellow 3RL (1.2%) + Reactive Blue 2GL (0.45%), Soda Ash 20g/L"
                  value={newDip.recipe}
                  onChange={e => setNewDip({ ...newDip, recipe: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Comments / Merchandiser Follow-up Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched to buyer local office for immediate bulk clearance"
                  value={newDip.comments}
                  onChange={e => setNewDip({ ...newDip, comments: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0F274E', color: '#FFFFFF', fontWeight: 750, fontSize: 13.5, cursor: 'pointer' }}
                >
                  Save &amp; Submit Lab Dip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
