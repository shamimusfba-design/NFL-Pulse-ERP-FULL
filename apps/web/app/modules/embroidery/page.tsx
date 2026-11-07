'use client';

import React, { useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid, GridColumn, DrillPopup, DrillTarget } from '../../../components/ui';
import { fmtDate, fmtNum } from '../../../lib/format';

export default function EmbroideryModulePage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INHOUSE' | 'OUTSOURCE' | 'DISPATCH'>('OVERVIEW');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // In-House Machines
  const [machines] = useState([
    { id: 'M-01', brand: 'Tajima', heads: 20, rpm: 850, jobNo: '48085', styleNo: '13251506', buyer: 'BS-NMT', stitches: 8400, targetPanels: 3200, donePanels: 2150, operator: 'Md. Alamgir', status: 'RUNNING' },
    { id: 'M-02', brand: 'Tajima', heads: 20, rpm: 820, jobNo: '48002', styleNo: '13251512', buyer: 'ONLY', stitches: 12500, targetPanels: 2800, donePanels: 1940, operator: 'Shahidul Islam', status: 'RUNNING' },
    { id: 'M-03', brand: 'Barudan', heads: 24, rpm: 900, jobNo: '48061', styleNo: '13251509', buyer: 'Name It', stitches: 6200, targetPanels: 4500, donePanels: 3820, operator: 'Rabiul Hossain', status: 'RUNNING' },
    { id: 'M-04', brand: 'Barudan', heads: 24, rpm: 0, jobNo: '46755', styleNo: '13251480', buyer: 'OVS', stitches: 9800, targetPanels: 2200, donePanels: 450, operator: 'Kamrul Hasan', status: 'CHANGEOVER' }
  ]);

  // Outsource Challans
  const [challans, setChallans] = useState([
    { id: 'CH-EMB-842', vendor: 'Alpha Embroidery Ltd.', jobNo: '48092', styleNo: '13251520', buyer: 'ONLY', sentDate: '2026-10-02', returnDate: '2026-10-05', sentPanels: 8500, rcvdPanels: 8420, rejPanels: 35, stitches: 9200, ratePerK: 0.22, status: 'RECEIVED' },
    { id: 'CH-EMB-843', vendor: 'GreenTex Crafts', jobNo: '48061', styleNo: '13251509', buyer: 'Name It', sentDate: '2026-10-03', returnDate: '2026-10-07', sentPanels: 12000, rcvdPanels: 7500, rejPanels: 48, stitches: 6200, ratePerK: 0.20, status: 'IN_PROCESS' },
    { id: 'CH-EMB-844', vendor: 'Prime Embroidery Works', jobNo: '46758', styleNo: '13251495', buyer: 'UTG', sentDate: '2026-10-04', returnDate: '2026-10-08', sentPanels: 6200, rcvdPanels: 2100, rejPanels: 12, stitches: 14500, ratePerK: 0.25, status: 'IN_PROCESS' },
    { id: 'CH-EMB-845', vendor: 'Alpha Embroidery Ltd.', jobNo: '48110', styleNo: '13251532', buyer: 'Only&Sons', sentDate: '2026-10-05', returnDate: '2026-10-09', sentPanels: 9400, rcvdPanels: 0, rejPanels: 0, stitches: 7800, ratePerK: 0.21, status: 'SENT' }
  ]);

  // Dispatch Form State
  const [newDispatch, setNewDispatch] = useState({
    vendor: 'Alpha Embroidery Ltd.',
    jobNo: '',
    styleNo: '',
    buyer: 'ONLY',
    sentPanels: '',
    stitches: '',
    ratePerK: '0.22',
    returnDate: ''
  });
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const filteredChallans = challans.filter((c) => vendorFilter === 'ALL' || c.vendor === vendorFilter);

  function handleAddDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!newDispatch.jobNo || !newDispatch.sentPanels) return;

    const newRow = {
      id: `CH-EMB-${Math.floor(846 + Math.random() * 100)}`,
      vendor: newDispatch.vendor,
      jobNo: newDispatch.jobNo,
      styleNo: newDispatch.styleNo || '13251550',
      buyer: newDispatch.buyer,
      sentDate: new Date().toISOString().split('T')[0],
      returnDate: newDispatch.returnDate || '2026-10-12',
      sentPanels: Number(newDispatch.sentPanels),
      rcvdPanels: 0,
      rejPanels: 0,
      stitches: Number(newDispatch.stitches || 8000),
      ratePerK: Number(newDispatch.ratePerK),
      status: 'SENT'
    };

    setChallans([newRow, ...challans]);
    setFeedbackMsg(`✓ Challan ${newRow.id} created and dispatched to ${newRow.vendor}!`);
    setNewDispatch({
      vendor: 'Alpha Embroidery Ltd.',
      jobNo: '',
      styleNo: '',
      buyer: 'ONLY',
      sentPanels: '',
      stitches: '',
      ratePerK: '0.22',
      returnDate: ''
    });
    setTimeout(() => setFeedbackMsg(''), 4000);
  }

  const openEmbroideryDrill = (ev: React.MouseEvent, mode: 'load' | 'delivered' | 'balance') => {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const inhouseLoad = machines.reduce((s, m) => s + m.targetPanels, 0);
    const inhouseDone = machines.reduce((s, m) => s + m.donePanels, 0);
    const inhouseBal = Math.max(0, inhouseLoad - inhouseDone);

    const outLoad = challans.reduce((s, c) => s + c.sentPanels, 0);
    const outDone = challans.reduce((s, c) => s + c.rcvdPanels, 0);
    const outBal = Math.max(0, outLoad - outDone);

    const inhouseVal = mode === 'load' ? inhouseLoad : mode === 'delivered' ? inhouseDone : inhouseBal;
    const outVal = mode === 'load' ? outLoad : mode === 'delivered' ? outDone : outBal;
    const tone: 'req' | 'done' | 'balance' = mode === 'load' ? 'req' : mode === 'delivered' ? 'done' : 'balance';

    const byFactory = [
      {
        key: 'In-House Embroidery Floor',
        label: 'In-House Embroidery Floor',
        value: inhouseVal,
        jobs: new Set(machines.map((m) => m.jobNo)).size,
        tone,
        filter: { key: 'tab', label: 'Source', value: 'OVERVIEW' },
      },
      {
        key: 'Sub-Contract (Outsource)',
        label: 'Sub-Contract (Outsource)',
        value: outVal,
        jobs: new Set(challans.map((c) => c.jobNo)).size,
        tone,
        filter: { key: 'tab', label: 'Source', value: 'OUTSOURCE' },
      },
    ];

    const buyerMap = new Map<string, { value: number; jobs: Set<string> }>();
    machines.forEach((m) => {
      const val = mode === 'load' ? m.targetPanels : mode === 'delivered' ? m.donePanels : Math.max(0, m.targetPanels - m.donePanels);
      const b = buyerMap.get(m.buyer) || { value: 0, jobs: new Set<string>() };
      b.value += val;
      b.jobs.add(m.jobNo);
      buyerMap.set(m.buyer, b);
    });
    challans.forEach((c) => {
      const val = mode === 'load' ? c.sentPanels : mode === 'delivered' ? c.rcvdPanels : Math.max(0, c.sentPanels - c.rcvdPanels);
      const b = buyerMap.get(c.buyer) || { value: 0, jobs: new Set<string>() };
      b.value += val;
      b.jobs.add(c.jobNo);
      buyerMap.set(c.buyer, b);
    });

    const byBuyer = Array.from(buyerMap.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .map(([key, v]) => ({
        key,
        label: key,
        value: v.value,
        jobs: v.jobs.size,
        tone,
      }));

    const jobs = [
      ...machines.map((m) => ({
        jobNo: m.jobNo,
        buyer: m.buyer,
        style: `${m.styleNo} · In-House (${m.id})`,
        qty: mode === 'load' ? m.targetPanels : mode === 'delivered' ? m.donePanels : Math.max(0, m.targetPanels - m.donePanels),
        unit: 'pcs' as const,
        status: m.status,
      })),
      ...challans.map((c) => ({
        jobNo: c.jobNo,
        buyer: c.buyer,
        style: `${c.styleNo} · ${c.vendor}`,
        qty: mode === 'load' ? c.sentPanels : mode === 'delivered' ? c.rcvdPanels : Math.max(0, c.sentPanels - c.rcvdPanels),
        unit: 'pcs' as const,
        status: c.status,
      })),
    ];

    setDrillTarget({
      title: `Embroidery ${mode === 'load' ? 'Total Load' : mode === 'delivered' ? 'Delivered Panels' : 'Balance Panels'} — In-House vs Sub-Contract`,
      subtitle: '2-part donut breakdown (In-House vs Sub-Contract)',
      anchorRect: rect,
      total: inhouseVal + outVal,
      unit: 'pcs',
      totalJobs: new Set(jobs.map((j) => j.jobNo)).size,
      tone,
      byFactory,
      byBuyer,
      jobs,
    });
  };

  return (
    <Shell title="Embroidery Operations" eyebrow="In-House Floor & Outsource / Sub-Contract Tracking">
      <DrillPopup
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onApplyFilter={(f) => {
          if (f.value === 'OVERVIEW' || f.value === 'OUTSOURCE') setActiveTab(f.value);
        }}
        onShowJobsInTable={() => setActiveTab('OUTSOURCE')}
      />

      {/* KPI Highlight Strip (Double-click for In-House vs Sub-Contract Donut) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '0 0 16px' }}>
        <div
          onDoubleClick={(ev) => openEmbroideryDrill(ev, 'load')}
          title="Double-click to drill down Load: In-House vs Sub-Contract (Donut)"
          style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Total Panels (Load)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            410,000 <span style={{ fontSize: '12px', color: '#64748b' }}>Panels</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>284 Million Stitches · Double-click drill</div>
        </div>

        <div
          onDoubleClick={(ev) => openEmbroideryDrill(ev, 'delivered')}
          title="Double-click to drill down Delivered: In-House vs Sub-Contract (Donut)"
          style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>In-House Production (Delivered)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
            268,000 <span style={{ fontSize: '12px' }}>(65.4%)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>4 Tajima/Barudan Machines (88 Heads) · 88.4% Eff</div>
        </div>

        <div
          onDoubleClick={(ev) => openEmbroideryDrill(ev, 'balance')}
          title="Double-click to drill down Balance: In-House vs Sub-Contract (Donut)"
          style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Outsource / Sub-Contract</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
            142,000 <span style={{ fontSize: '12px' }}>(34.6%)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>3 Approved Vendors · 94.2% On-Time Delivery</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Quality &amp; Rejection</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
            0.82% <span style={{ fontSize: '12px' }}>DHU</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>In-House 0.65% | Outsource 1.15%</div>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '14px 0 18px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'OVERVIEW' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'OVERVIEW' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🏭 In-House Machine Floor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('OUTSOURCE')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'OUTSOURCE' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'OUTSOURCE' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🚚 Outsource Vendors &amp; Challans
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DISPATCH')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'DISPATCH' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'DISPATCH' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          + New Outsource Dispatch
        </button>
      </div>

      {feedbackMsg && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
          {feedbackMsg}
        </div>
      )}

      {/* TAB 1: IN-HOUSE MACHINES */}
      {activeTab === 'OVERVIEW' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {machines.map((m) => {
              const progressPct = Math.round((m.donePanels / m.targetPanels) * 100);
              return (
                <div
                  key={m.id}
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{m.id}</span>
                      <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {m.brand} · {m.heads} Heads
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: m.status === 'RUNNING' ? '#dcfce7' : '#fef3c7',
                        color: m.status === 'RUNNING' ? '#166534' : '#b45309'
                      }}
                    >
                      {m.status} {m.rpm > 0 ? `(${m.rpm} RPM)` : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#334155', marginBottom: '6px' }}>
                    <strong>Job #{m.jobNo}</strong> · Style {m.styleNo} ({m.buyer})
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                    Stitch Count: <strong>{m.stitches.toLocaleString()}</strong> · Operator: {m.operator}
                  </div>

                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                      <span>Completed Panels</span>
                      <span>
                        {m.donePanels.toLocaleString()} / {m.targetPanels.toLocaleString()} ({progressPct}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPct}%`,
                          backgroundColor: progressPct >= 80 ? '#10b981' : '#2563eb',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: OUTSOURCE CHALLANS */}
      {activeTab === 'OUTSOURCE' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Filter Vendor:</span>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Vendors (3 Vendors)</option>
                <option value="Alpha Embroidery Ltd.">Alpha Embroidery Ltd.</option>
                <option value="GreenTex Crafts">GreenTex Crafts</option>
                <option value="Prime Embroidery Works">Prime Embroidery Works</option>
              </select>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredChallans.length} active challans
            </span>
          </div>

          <DataGrid
            storageKey="embroidery-outsource-challans"
            exportName="embroidery-outsource-challans"
            rows={filteredChallans}
            rowKey={(c) => c.id}
            frozenColumns={2}
            emptyText="No outsource embroidery challans match filter"
            columns={[
              { key: 'id', header: 'Challan No', width: 120, value: (c) => c.id, render: (c) => <strong>{c.id}</strong> },
              { key: 'vendor', header: 'Vendor', width: 190, value: (c) => c.vendor },
              { key: 'jobNo', header: 'Job No', width: 95, value: (c) => c.jobNo, render: (c) => <strong>#{c.jobNo}</strong> },
              { key: 'styleNo', header: 'Style', width: 115, value: (c) => c.styleNo },
              { key: 'buyer', header: 'Buyer', width: 110, value: (c) => c.buyer },
              {
                key: 'sentPanels',
                header: 'Sent (pcs)',
                width: 120,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => c.sentPanels,
                render: (c) => <strong>{fmtNum(c.sentPanels)}</strong>,
              },
              {
                key: 'rcvdPanels',
                header: 'Received (pcs)',
                width: 125,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => c.rcvdPanels,
                render: (c) => <strong style={{ color: c.rcvdPanels > 0 ? '#166534' : '#64748b' }}>{fmtNum(c.rcvdPanels)}</strong>,
              },
              {
                key: 'balance',
                header: 'Balance (pcs)',
                width: 120,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => Math.max(0, c.sentPanels - c.rcvdPanels),
                render: (c) => {
                  const balance = Math.max(0, c.sentPanels - c.rcvdPanels);
                  return <strong style={{ color: balance > 0 ? '#dc2626' : '#15803d' }}>{fmtNum(balance)}</strong>;
                },
              },
              {
                key: 'rejPanels',
                header: 'Rejection (pcs)',
                width: 120,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => c.rejPanels,
              },
              {
                key: 'ratePerK',
                header: 'Rate/1K',
                width: 95,
                numeric: true,
                value: (c) => c.ratePerK,
                render: (c) => `$${c.ratePerK.toFixed(2)}`,
              },
              {
                key: 'returnDate',
                header: 'Return ETA',
                width: 115,
                value: (c) => c.returnDate,
                render: (c) => fmtDate(c.returnDate),
              },
              {
                key: 'status',
                header: 'Status',
                width: 110,
                value: (c) => c.status,
              },
            ] satisfies GridColumn<(typeof challans)[number]>[]}
          />
        </section>
      )}

      {/* TAB 3: DISPATCH FORM */}
      {activeTab === 'DISPATCH' && (
        <section style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px', maxWidth: '640px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
            Dispatch Cut Panels to Outsource Embroidery Vendor
          </h3>
          <form onSubmit={handleAddDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Select Outsource Vendor
              </label>
              <select
                value={newDispatch.vendor}
                onChange={(e) => setNewDispatch({ ...newDispatch, vendor: e.target.value })}
                style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="Alpha Embroidery Ltd.">Alpha Embroidery Ltd. (Gazipur)</option>
                <option value="GreenTex Crafts">GreenTex Crafts (Tongi)</option>
                <option value="Prime Embroidery Works">Prime Embroidery Works (Konabari)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Job No
                </label>
                <input
                  required
                  placeholder="e.g. 48120"
                  value={newDispatch.jobNo}
                  onChange={(e) => setNewDispatch({ ...newDispatch, jobNo: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Buyer
                </label>
                <select
                  value={newDispatch.buyer}
                  onChange={(e) => setNewDispatch({ ...newDispatch, buyer: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="ONLY">ONLY</option>
                  <option value="Name It">Name It</option>
                  <option value="OVS">OVS</option>
                  <option value="UTG">UTG</option>
                  <option value="Only&Sons">Only&Sons</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Cut Panels Qty (Pcs)
                </label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 5000"
                  value={newDispatch.sentPanels}
                  onChange={(e) => setNewDispatch({ ...newDispatch, sentPanels: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Estimated Stitches / Panel
                </label>
                <input
                  type="number"
                  placeholder="e.g. 8500"
                  value={newDispatch.stitches}
                  onChange={(e) => setNewDispatch({ ...newDispatch, stitches: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Agreed Rate per 1,000 Stitches ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newDispatch.ratePerK}
                  onChange={(e) => setNewDispatch({ ...newDispatch, ratePerK: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Required Return Date
                </label>
                <input
                  type="date"
                  value={newDispatch.returnDate}
                  onChange={(e) => setNewDispatch({ ...newDispatch, returnDate: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '10px', padding: '10px', fontSize: '13px', fontWeight: 800 }}
            >
              Issue Outsource Delivery Challan
            </button>
          </form>
        </section>
      )}
    </Shell>
  );
}
