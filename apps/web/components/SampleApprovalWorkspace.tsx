'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import JobDetailDrawer, { JobDetailData, TabKey } from './JobDetailDrawer';

type ApprovalTabKey =
  | 'ALL'
  | 'PP_SAMPLE'
  | 'PP_COMMENTS'
  | 'CAD_HANDOVER'
  | 'SIZE_SET'
  | 'SHADE_LABDIP';

export default function SampleApprovalWorkspace() {
  const { persona } = useActivePersona();
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<ApprovalTabKey>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetailData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<TabKey>('approval');

  // Interactive mock update states for demo actions
  const [actionNotice, setActionNotice] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('type')?.toUpperCase();
      if (t === 'PP_SAMPLE' || t === 'SAMPLE') setActiveTab('PP_SAMPLE');
      else if (t === 'PP_COMMENTS' || t === 'COMMENTS') setActiveTab('PP_COMMENTS');
      else if (t === 'CAD_HANDOVER' || t === 'CAD') setActiveTab('CAD_HANDOVER');
      else if (t === 'SIZE_SET' || t === 'SIZESET') setActiveTab('SIZE_SET');
      else if (t === 'SHADE' || t === 'LABDIP') setActiveTab('SHADE_LABDIP');
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const buyerParam = persona.assignedBuyer || 'ALL';
        const res = await fetch(`/api/merchandising/dashboard?limit=50&buyer=${buyerParam}`);
        if (res.ok) {
          const json = await res.json();
          setJobs(json.jobs || []);
        }
      } catch (e) {
        console.error('Failed to load sample jobs', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [persona]);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3500);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j: any) => {
      if (buyerFilter !== 'ALL' && j.buyer !== buyerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const jn = String(j.jobNo || '').toLowerCase();
        const sn = String(j.styleNo || '').toLowerCase();
        const pn = String(j.poNo || '').toLowerCase();
        if (!jn.includes(q) && !sn.includes(q) && !pn.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, buyerFilter, searchQuery]);

  const handleOpenJob = (j: any, tab: TabKey = 'approval') => {
    setSelectedJob(j);
    setDrawerInitialTab(tab);
    setIsDrawerOpen(true);
  };

  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              MODULE 07
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              Sample &amp; Approval Management Workspace
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Pre-Production (PP) dispatch, buyer PP comments, CAD handover trigger, Size Set measurement audit, and Lab Dip / Shade matching
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            🖨️ Print Approval Register
          </button>
          <Link
            href="/merchandising/dashboard"
            style={{ background: '#2563eb', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
          >
            Bulk Dashboard →
          </Link>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <span>✓ {actionNotice}</span>
          <button type="button" onClick={() => setActionNotice('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 2. Critical Rule Callout */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #93c5fd',
        borderRadius: '8px',
        padding: '12px 14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <span style={{ fontSize: '22px' }}>🎯</span>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 900, color: '#1e3a8a' }}>
            NOS MERCHANDISING RULE: CAD HANDOVER ACTIVATION TRIGGER
          </div>
          <div style={{ fontSize: '11.5px', color: '#1d4ed8', marginTop: '2px', lineHeight: '1.5' }}>
            Receiving <strong>Buyer PP Comments</strong> automatically triggers <strong>CAD File Handover</strong> and bulk grading release.
            (Note: TT Meeting comments do NOT trigger CAD handover; only buyer PP Comments unlock production pattern release).
          </div>
        </div>
      </div>

      {/* 3. Operational Filter Sub-Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { key: 'ALL', label: 'All Sample & Approvals', icon: '📋', count: filteredJobs.length },
          { key: 'PP_SAMPLE', label: '1. PP Sample & Courier', icon: '👕', count: filteredJobs.length },
          { key: 'PP_COMMENTS', label: '2. Buyer PP Comments', icon: '💬', count: 18 },
          { key: 'CAD_HANDOVER', label: '3. CAD Handover (Triggered)', icon: '📐', count: 18 },
          { key: 'SIZE_SET', label: '4. Size Set & Mockup', icon: '📦', count: 12 },
          { key: 'SHADE_LABDIP', label: '5. Shade / Lab Dip (ΔE)', icon: '🎨', count: 24 }
        ].map(t => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as ApprovalTabKey)}
              style={{
                background: isActive ? '#0f172a' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                padding: '7px 14px',
                borderRadius: '6px 6px 0 0',
                fontSize: '11.5px',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span style={{
                background: isActive ? '#2563eb' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#64748b',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 800
              }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Buyer:</label>
            <select
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', fontWeight: 600 }}
            >
              <option value="ALL">All Buyers (NFL Group)</option>
              <option value="Bestseller">Bestseller (Jack&amp;Jones, Vero Moda)</option>
              <option value="H&M">H&amp;M Group</option>
              <option value="Inditex">Inditex (Zara, Bershka)</option>
              <option value="LPP">LPP (Reserved, Cropp)</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search Job, Style or PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '5px 10px 5px 28px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', width: '220px' }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '12px', color: '#94a3b8' }}>🔍</span>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Showing <strong>{filteredJobs.length}</strong> matching production styles
        </div>
      </div>

      {/* 5. TAB-SPECIFIC VIEWS */}

      {/* TAB 1: ALL APPROVALS (Original High-Level Table) */}
      {activeTab === 'ALL' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                <th style={{ padding: '9px 12px' }}>Job No</th>
                <th style={{ padding: '9px 12px' }}>Buyer</th>
                <th style={{ padding: '9px 12px' }}>Style No</th>
                <th style={{ padding: '9px 12px' }}>PP Sample Dispatched</th>
                <th style={{ padding: '9px 12px' }}>Buyer PP Comments</th>
                <th style={{ padding: '9px 12px' }}>CAD Handover Trigger</th>
                <th style={{ padding: '9px 12px' }}>Lab Dip ΔE</th>
                <th style={{ padding: '9px 12px' }}>Status</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    Loading sample and approval records...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    No matching jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j: any, idx: number) => (
                  <tr
                    key={j.id || idx}
                    onClick={() => handleOpenJob(j, 'approval')}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{j.buyer}</td>
                    <td style={{ padding: '9px 12px', color: '#2563eb', fontWeight: 700 }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>15-Jul (DHL #884920194)</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 700 }}>✓ Approved w/ comments</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 800 }}>⚡ ACTIVATED (20-Jul)</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 700 }}>ΔE = 0.42 (PASS)</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10.5px' }}>
                        APPROVED
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'approval'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PP SAMPLE & COURIER TRACKING */}
      {activeTab === 'PP_SAMPLE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Pre-Production (PP) Sample Room Dispatch &amp; Courier Register</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Track sample sewing completion, packing, DHL/FedEx AWB tracking, and recipient confirmation</div>
            </div>
            <button
              type="button"
              onClick={() => notify('New PP sample dispatch modal opened')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Record Sample Dispatch
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                  <th style={{ padding: '9px 12px' }}>Job No</th>
                  <th style={{ padding: '9px 12px' }}>Buyer &amp; Brand</th>
                  <th style={{ padding: '9px 12px' }}>Style No / Name</th>
                  <th style={{ padding: '9px 12px' }}>Sample Type</th>
                  <th style={{ padding: '9px 12px' }}>Dispatched Date</th>
                  <th style={{ padding: '9px 12px' }}>Courier &amp; AWB No</th>
                  <th style={{ padding: '9px 12px' }}>Destination</th>
                  <th style={{ padding: '9px 12px' }}>Delivery Status</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j: any, idx: number) => (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j, 'sample')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{j.buyer}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb' }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#475569' }}>PP Sample (Size M)</td>
                    <td style={{ padding: '9px 12px', color: '#0f172a' }}>15-Jul-2026</td>
                    <td style={{ padding: '9px 12px', color: '#0284c7', fontWeight: 700 }}>
                      DHL #884920194
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>Copenhagen, Denmark</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}>
                        DELIVERED (18-Jul)
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'sample'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Sample Tab →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BUYER PP COMMENTS */}
      {activeTab === 'PP_COMMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Buyer Pre-Production (PP) Comments Register</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Every buyer approval comment automatically qualifies the style for pattern release</div>
            </div>
            <button
              type="button"
              onClick={() => notify('Buyer PP comment upload recorded')}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Upload Buyer Comments
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                  <th style={{ padding: '9px 12px' }}>Job No</th>
                  <th style={{ padding: '9px 12px' }}>Buyer QA</th>
                  <th style={{ padding: '9px 12px' }}>Style No</th>
                  <th style={{ padding: '9px 12px' }}>Date Received</th>
                  <th style={{ padding: '9px 12px' }}>Approval Result</th>
                  <th style={{ padding: '9px 12px' }}>Technical Directives</th>
                  <th style={{ padding: '9px 12px' }}>CAD Trigger Status</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j: any, idx: number) => (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j, 'pp_comments')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>Clara Jensen (Bestseller)</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb' }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', color: '#0f172a' }}>20-Jul-2026</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}>
                        APPROVED W/ NOTES
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#334155', maxWidth: '300px' }}>
                      &ldquo;Approved for bulk cutting. Ensure neck opening holds 56cm minimum stretch recovery.&rdquo;
                    </td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 800 }}>
                      ⚡ ACTIVATED
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'pp_comments'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View PP PDF →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CAD HANDOVER WORKSPACE */}
      {activeTab === 'CAD_HANDOVER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>CAD File Handover &amp; Grading Ledger (PP Comments Triggered)</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Release bulk pattern files to Gerber/Lectra workstations with verified shrinkage deductions</div>
            </div>
            <button
              type="button"
              onClick={() => notify('CAD files dispatched to Gerber cutting queue')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              ⚡ Release to Auto-Cutter
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                  <th style={{ padding: '9px 12px' }}>Job No</th>
                  <th style={{ padding: '9px 12px' }}>Style No</th>
                  <th style={{ padding: '9px 12px' }}>CAD Operator</th>
                  <th style={{ padding: '9px 12px' }}>Pattern Master Ver</th>
                  <th style={{ padding: '9px 12px' }}>Cuttable Width</th>
                  <th style={{ padding: '9px 12px' }}>Marker Efficiency</th>
                  <th style={{ padding: '9px 12px' }}>Shrinkage Applied</th>
                  <th style={{ padding: '9px 12px' }}>Status</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j: any, idx: number) => (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j, 'cad')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb' }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', color: '#0f172a' }}>Nazmul H. (CAD Team)</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700 }}>VER_3.2_BULK_REV</td>
                    <td style={{ padding: '9px 12px' }}>67.5&quot; Open Width</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 800 }}>86.8%</td>
                    <td style={{ padding: '9px 12px', color: '#64748b' }}>L: -2.5% / W: -1.5%</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}>
                        MARKER READY
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'cad'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        CAD Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SIZE SET & AUDIT */}
      {activeTab === 'SIZE_SET' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Pre-Bulk Size Set &amp; Measurement Validation Register</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Complete size spectrum (XS - 2XL) audit to verify POM specs before bulk sewing starts</div>
            </div>
            <button
              type="button"
              onClick={() => notify('Size set audit signed off')}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              ✓ QA Sign-off Size Set
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                  <th style={{ padding: '9px 12px' }}>Job No</th>
                  <th style={{ padding: '9px 12px' }}>Style No</th>
                  <th style={{ padding: '9px 12px' }}>Size Range</th>
                  <th style={{ padding: '9px 12px' }}>Pieces Cut &amp; Sewn</th>
                  <th style={{ padding: '9px 12px' }}>Key Measurement (M)</th>
                  <th style={{ padding: '9px 12px' }}>Max POM Deviation</th>
                  <th style={{ padding: '9px 12px' }}>Audit Status</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j: any, idx: number) => (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j, 'sizeset')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb' }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', color: '#0f172a' }}>XS, S, M, L, XL, 2XL</td>
                    <td style={{ padding: '9px 12px' }}>12 Pcs (2 / size)</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>Chest: 53.1cm / L: 72.2cm</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 800 }}>+0.2 cm (Within ±1.0)</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}>
                        ✓ PASS QA AUDIT
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'sizeset'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Spec Audit →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SHADE / LAB DIP (ΔE) */}
      {activeTab === 'SHADE_LABDIP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Dyehouse Laboratory Shade &amp; Strike-Off Spectrometer Ledger</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Spectrophotometer readings (ΔE CMC 2:1 &lt; 0.5) under D65 daylight &amp; TL84 light boxes</div>
            </div>
            <button
              type="button"
              onClick={() => notify('Lab dip test result logged')}
              style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Record ΔE Test
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                  <th style={{ padding: '9px 12px' }}>Job No</th>
                  <th style={{ padding: '9px 12px' }}>Color Name / Pantone</th>
                  <th style={{ padding: '9px 12px' }}>Option Submitted</th>
                  <th style={{ padding: '9px 12px' }}>Spectrophotometer ΔE</th>
                  <th style={{ padding: '9px 12px' }}>Primary Light</th>
                  <th style={{ padding: '9px 12px' }}>Metamerism</th>
                  <th style={{ padding: '9px 12px' }}>Approval Status</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j: any, idx: number) => (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j, 'approval')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>Navy Blazer (19-3921 TCX)</td>
                    <td style={{ padding: '9px 12px' }}>Option B (2nd Dip)</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 800 }}>ΔE = 0.42 (PASS)</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>D65 Natural Daylight</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a' }}>None under TL84</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}>
                        ✓ BUYER APPROVED
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'approval'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Color Swatch →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide Drawer connected with deep-linking initialTab */}
      <JobDetailDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab={drawerInitialTab}
      />
    </div>
  );
}
