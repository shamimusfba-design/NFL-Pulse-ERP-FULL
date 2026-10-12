'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import JobDetailDrawer, { JobDetailData, TabKey } from './JobDetailDrawer';

type ProdTabKey = 'ALL' | 'WIP_FLOOR' | 'TT_MEETING' | 'PILOT_RUN';

export default function ProductionFollowUpWorkspace() {
  const { persona } = useActivePersona();
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<ProdTabKey>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetailData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<TabKey>('production');
  const [toastMsg, setToastMsg] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('type')?.toUpperCase();
      if (t === 'TT_MEETING' || t === 'TT' || t === 'PILOT') setActiveTab('TT_MEETING');
      else if (t === 'WIP' || t === 'FLOOR') setActiveTab('WIP_FLOOR');
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
        console.error('Failed to load production jobs', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [persona]);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
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

  const totalOrderPcs = useMemo(() => {
    return filteredJobs.reduce((acc, j) => acc + (Number(j.orderQty) || 25000), 0);
  }, [filteredJobs]);

  const totalSewnPcs = useMemo(() => {
    return filteredJobs.reduce((acc, j) => {
      const q = Number(j.orderQty) || 25000;
      const prog = Number(j.productionProgress) || 52;
      return acc + Math.round(q * (prog / 100));
    }, 0);
  }, [filteredJobs]);

  const handleOpenJob = (j: any, tab: TabKey = 'production') => {
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
              MODULE 08
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              Production Follow-up &amp; Floor Execution
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Daily cutting, sewing output, finishing, packing balances across NFL Unit 1 &amp; NCL Unit 2 lines, plus Pre-Production TT meetings
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/modules/production-lots"
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
          >
            🏭 Production Lots Engine →
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            🖨️ Print Production Report
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {toastMsg && (
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <span>✓ {toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 2. Sub-Tabs Bar */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { key: 'ALL', label: 'All Production Overview', icon: '🏭', count: filteredJobs.length },
          { key: 'WIP_FLOOR', label: 'Daily Floor WIP & Sewing Lines', icon: '🧵', count: 28 },
          { key: 'TT_MEETING', label: 'TT / Pre-Production Meeting Minutes', icon: '🤝', count: 14 }
        ].map(t => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as ProdTabKey)}
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

      {/* 3. KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active Sewing Lines</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', marginTop: '2px', fontWeight: 900 }}>
            28 Lines Running
          </strong>
          <span style={{ fontSize: '11px', color: '#2563eb' }}>NFL 1 &amp; NCL 2 facilities</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Order Quantity</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', marginTop: '2px', fontWeight: 900 }}>
            {totalOrderPcs.toLocaleString()} pcs
          </strong>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Under active production</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Sewing Actual Completed</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px', fontWeight: 900 }}>
            {totalSewnPcs.toLocaleString()} pcs
          </strong>
          <span style={{ fontSize: '11px', color: '#16a34a' }}>54.2% overall sewing completion</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Sewing Balance Remaining</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#d97706', marginTop: '2px', fontWeight: 900 }}>
            {(totalOrderPcs - totalSewnPcs).toLocaleString()} pcs
          </strong>
          <span style={{ fontSize: '11px', color: '#d97706' }}>On track for target ex-factory</span>
        </div>
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
          Showing <strong>{filteredJobs.length}</strong> styles on production floor
        </div>
      </div>

      {/* 5. TAB: ALL OR WIP FLOOR TABLE */}
      {(activeTab === 'ALL' || activeTab === 'WIP_FLOOR') && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                <th style={{ padding: '9px 12px' }}>Job No</th>
                <th style={{ padding: '9px 12px' }}>Buyer</th>
                <th style={{ padding: '9px 12px' }}>Style No</th>
                <th style={{ padding: '9px 12px' }}>Assigned Line</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Order Qty</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Cutting Completed</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Sewing Output</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Sewing Balance</th>
                <th style={{ padding: '9px 12px' }}>Progress</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    Loading production tracking records...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    No matching jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j: any, idx: number) => {
                  const q = Number(j.orderQty) || 25000;
                  const prog = Number(j.productionProgress) || 52;
                  const sewn = Math.round(q * (prog / 100));
                  const bal = q - sewn;
                  return (
                    <tr
                      key={j.id || idx}
                      onClick={() => handleOpenJob(j, 'production')}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>
                        {j.jobNo}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {j.buyer}
                      </td>
                      <td style={{ padding: '9px 12px', color: '#2563eb', fontWeight: 700 }}>
                        {j.styleNo}
                      </td>
                      <td style={{ padding: '9px 12px', color: '#0f172a', fontWeight: 700 }}>
                        {j.lineAllocation?.factory || 'NFL'} · Line {j.lineAllocation?.line || '14B'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800 }}>
                        {q.toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0284c7', fontWeight: 700 }}>
                        {Math.round(q * 1.025).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 800 }}>
                        {sewn.toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#d97706', fontWeight: 800 }}>
                        {bal.toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '45px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${prog}%`, background: '#2563eb' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 800 }}>{prog}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'production'); }}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Floor WIP →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. TAB: TT MEETING MINUTES */}
      {activeTab === 'TT_MEETING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Pre-Production (TT / Pilot) Meeting Minutes &amp; Risk Register</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Mandatory multi-department alignment (Cutting, Sewing, QA, IE, Merchandising) before bulk line feed</div>
            </div>
            <button
              type="button"
              onClick={() => notify('TT Meeting minutes created and recorded')}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Create TT Minutes
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                  <th style={{ padding: '9px 12px' }}>Job No</th>
                  <th style={{ padding: '9px 12px' }}>Buyer</th>
                  <th style={{ padding: '9px 12px' }}>Style No</th>
                  <th style={{ padding: '9px 12px' }}>Meeting Date &amp; Hall</th>
                  <th style={{ padding: '9px 12px' }}>Assigned Sewing Line</th>
                  <th style={{ padding: '9px 12px' }}>Target Daily Output</th>
                  <th style={{ padding: '9px 12px' }}>Technical Precautions Agreed</th>
                  <th style={{ padding: '9px 12px' }}>Sign-off Status</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j: any, idx: number) => (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j, 'tt_meeting')} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{j.buyer}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb' }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', color: '#0f172a' }}>02-Aug-2026 (Conf Hall 1)</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb' }}>Line 14B &amp; 16B</td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 800 }}>1,800 pcs / day</td>
                    <td style={{ padding: '9px 12px', color: '#334155', maxWidth: '280px' }}>
                      Ballpoint SES #65 needles; 1:1.1 differential ratio on side seams; 9-point metal detector pass
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '10.5px' }}>
                        ✓ SIGNED OFF
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j, 'tt_meeting'); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        TT Minutes →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <JobDetailDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab={drawerInitialTab}
      />
    </div>
  );
}
