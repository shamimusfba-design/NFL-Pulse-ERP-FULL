'use client';

import React, { useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid, GridColumn, DrillPopup, DrillTarget } from '../../../components/ui';
import { fmtDate, fmtNum } from '../../../lib/format';

export default function PrintingModulePage() {
  const [activeTab, setActiveTab] = useState<'INHOUSE' | 'OUTSOURCE' | 'DISPATCH' | 'QUALITY'>('INHOUSE');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // In-House Printing Floor Machines & Tables
  const [machines] = useState([
    {
      id: 'PRN-01',
      name: 'MHM Synchroprint Oval (16-Color)',
      type: 'Automatic Carousel / Oval',
      technique: 'Rubber & Plastisol',
      jobNo: '48085',
      styleNo: '13251506',
      buyer: 'BS-NMT',
      colors: 4,
      targetPanels: 6500,
      donePanels: 4920,
      operator: 'Md. Shahidul Islam',
      status: 'RUNNING',
      strikeOffStatus: 'APPROVED'
    },
    {
      id: 'PRN-02',
      name: 'Hephzibah Automatic Oval (14-Color)',
      type: 'Automatic Oval Screen',
      technique: 'High Density (HD) & Puff',
      jobNo: '48061',
      styleNo: '13251509',
      buyer: 'Name It',
      colors: 3,
      targetPanels: 5800,
      donePanels: 4100,
      operator: 'Abdur Rahim',
      status: 'RUNNING',
      strikeOffStatus: 'APPROVED'
    },
    {
      id: 'PRN-03',
      name: 'Manual Printing Table #1 (120 ft)',
      type: 'Flatbed Table Screen',
      technique: 'Discharge & Pigment Print',
      jobNo: '48002',
      styleNo: '13251512',
      buyer: 'ONLY',
      colors: 2,
      targetPanels: 3500,
      donePanels: 2850,
      operator: 'Kabir Hossain',
      status: 'RUNNING',
      strikeOffStatus: 'APPROVED'
    },
    {
      id: 'PRN-04',
      name: 'Digital DTF & Heat Transfer Unit',
      type: 'Digital / Heat Transfer',
      technique: 'Full Color Photographic DTF',
      jobNo: '46755',
      styleNo: '13251480',
      buyer: 'OVS',
      colors: 6,
      targetPanels: 2200,
      donePanels: 480,
      operator: 'Sohel Rana',
      status: 'SETUP / CHANGEOVER',
      strikeOffStatus: 'PENDING_APPROVAL'
    }
  ]);

  // Outsource Print Challans
  const [challans, setChallans] = useState([
    {
      id: 'CH-PRN-901',
      vendor: 'ColorTex Screen Prints Ltd.',
      jobNo: '48092',
      styleNo: '13251520',
      buyer: 'ONLY',
      printType: 'All-Over & Rotary',
      sentDate: '2026-10-02',
      returnDate: '2026-10-06',
      sentPanels: 14500,
      rcvdPanels: 14380,
      rejPanels: 42,
      ratePerPanel: 4.5,
      status: 'RECEIVED'
    },
    {
      id: 'CH-PRN-902',
      vendor: 'Apex Digital & Graphics Ltd.',
      jobNo: '48061',
      styleNo: '13251509',
      buyer: 'Name It',
      printType: 'Glitter & Foil Print',
      sentDate: '2026-10-03',
      returnDate: '2026-10-07',
      sentPanels: 9800,
      rcvdPanels: 6200,
      rejPanels: 28,
      ratePerPanel: 5.2,
      status: 'IN_PROCESS'
    },
    {
      id: 'CH-PRN-903',
      vendor: 'GreenLine Screen Works',
      jobNo: '46758',
      styleNo: '13251495',
      buyer: 'UTG',
      printType: 'Plastisol Chest Print',
      sentDate: '2026-10-04',
      returnDate: '2026-10-08',
      sentPanels: 8200,
      rcvdPanels: 3100,
      rejPanels: 15,
      ratePerPanel: 3.8,
      status: 'IN_PROCESS'
    },
    {
      id: 'CH-PRN-904',
      vendor: 'ColorTex Screen Prints Ltd.',
      jobNo: '48110',
      styleNo: '13251532',
      buyer: 'Only&Sons',
      printType: 'Sublimation Print',
      sentDate: '2026-10-05',
      returnDate: '2026-10-09',
      sentPanels: 11000,
      rcvdPanels: 0,
      rejPanels: 0,
      ratePerPanel: 4.8,
      status: 'SENT'
    }
  ]);

  // Dispatch Form State
  const [newDispatch, setNewDispatch] = useState({
    vendor: 'ColorTex Screen Prints Ltd.',
    jobNo: '',
    styleNo: '',
    buyer: 'ONLY',
    printType: 'Plastisol Chest Print',
    sentPanels: '',
    ratePerPanel: '4.50',
    returnDate: ''
  });
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const filteredChallans = challans.filter((c) => vendorFilter === 'ALL' || c.vendor === vendorFilter);

  function handleAddDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!newDispatch.jobNo || !newDispatch.sentPanels) return;

    const newRow = {
      id: `CH-PRN-${Math.floor(905 + Math.random() * 100)}`,
      vendor: newDispatch.vendor,
      jobNo: newDispatch.jobNo,
      styleNo: newDispatch.styleNo || '13251550',
      buyer: newDispatch.buyer,
      printType: newDispatch.printType,
      sentDate: new Date().toISOString().split('T')[0],
      returnDate: newDispatch.returnDate || '2026-10-12',
      sentPanels: Number(newDispatch.sentPanels),
      rcvdPanels: 0,
      rejPanels: 0,
      ratePerPanel: Number(newDispatch.ratePerPanel),
      status: 'SENT'
    };

    setChallans([newRow, ...challans]);
    setFeedbackMsg(`✓ Outsource Challan ${newRow.id} created and dispatched to ${newRow.vendor}!`);
    setNewDispatch({
      vendor: 'ColorTex Screen Prints Ltd.',
      jobNo: '',
      styleNo: '',
      buyer: 'ONLY',
      printType: 'Plastisol Chest Print',
      sentPanels: '',
      ratePerPanel: '4.50',
      returnDate: ''
    });
    setTimeout(() => setFeedbackMsg(''), 4000);
  }

  const openPrintingDrill = (ev: React.MouseEvent, mode: 'load' | 'delivered' | 'balance') => {
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
        key: 'In-House Printing Floor',
        label: 'In-House Printing Floor',
        value: inhouseVal,
        jobs: new Set(machines.map((m) => m.jobNo)).size,
        tone,
        filter: { key: 'tab', label: 'Source', value: 'INHOUSE' },
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
      title: `Printing ${mode === 'load' ? 'Total Load' : mode === 'delivered' ? 'Delivered Panels' : 'Balance Panels'} — In-House vs Sub-Contract`,
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
    <Shell title="Printing Operations" eyebrow="In-House Print Floor & Outsource / Sub-Contract Tracking">
      <DrillPopup
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onApplyFilter={(f) => {
          if (f.value === 'INHOUSE' || f.value === 'OUTSOURCE') setActiveTab(f.value);
        }}
        onShowJobsInTable={() => setActiveTab('OUTSOURCE')}
      />

      {/* KPI Highlight Strip (Double-click for In-House vs Sub-Contract Donut) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '0 0 16px' }}>
        <div
          onDoubleClick={(ev) => openPrintingDrill(ev, 'load')}
          title="Double-click to drill down Load: In-House vs Sub-Contract (Donut)"
          style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Total Panels (Load)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            826,632 <span style={{ fontSize: '12px', color: '#64748b' }}>Panels</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>Avg. 31,793 Panels/Day · Double-click drill</div>
        </div>

        <div
          onDoubleClick={(ev) => openPrintingDrill(ev, 'delivered')}
          title="Double-click to drill down Delivered: In-House vs Sub-Contract (Donut)"
          style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>In-House Production (Delivered)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
            681,145 <span style={{ fontSize: '12px' }}>(82.4%)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>2 Automatic Ovals + 4 Tables · 91.7% Eff</div>
        </div>

        <div
          onDoubleClick={(ev) => openPrintingDrill(ev, 'balance')}
          title="Double-click to drill down Balance: In-House vs Sub-Contract (Donut)"
          style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Outsource / Sub-Contract</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
            145,487 <span style={{ fontSize: '12px' }}>(17.6%)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>3 Approved Vendors · 96.5% On-Time Delivery</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Quality &amp; Rejection</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
            0.71% <span style={{ fontSize: '12px' }}>DHU</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>In-House 0.58% | Outsource 0.94%</div>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '14px 0 18px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('INHOUSE')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'INHOUSE' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'INHOUSE' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🎨 In-House Printing Floor
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
        <button
          type="button"
          onClick={() => setActiveTab('QUALITY')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'QUALITY' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'QUALITY' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔬 Strike-Off Approvals &amp; Defect Analysis
        </button>
      </div>

      {feedbackMsg && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
          {feedbackMsg}
        </div>
      )}

      {/* TAB 1: IN-HOUSE MACHINES */}
      {activeTab === 'INHOUSE' && (
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
                        {m.technique}
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
                      {m.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    {m.name}
                  </div>

                  <div style={{ fontSize: '12px', color: '#334155', marginBottom: '6px' }}>
                    <strong>Job #{m.jobNo}</strong> · Style {m.styleNo} ({m.buyer}) · {m.colors} Colors
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Operator: <strong>{m.operator}</strong></span>
                    <span style={{ color: m.strikeOffStatus === 'APPROVED' ? '#166534' : '#b45309', fontWeight: 700 }}>
                      Strike-Off: {m.strikeOffStatus}
                    </span>
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

      {/* TAB 2: OUTSOURCE VENDORS & CHALLANS */}
      {activeTab === 'OUTSOURCE' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Vendor Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Filter Vendor:</span>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
              >
                <option value="ALL">All Print Vendors (3)</option>
                <option value="ColorTex Screen Prints Ltd.">ColorTex Screen Prints Ltd.</option>
                <option value="Apex Digital & Graphics Ltd.">Apex Digital & Graphics Ltd.</option>
                <option value="GreenLine Screen Works">GreenLine Screen Works</option>
              </select>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredChallans.length} of {challans.length} Challans
            </div>
          </div>

          {/* Challans DataGrid */}
          <DataGrid
            storageKey="printing-outsource-challans"
            exportName="printing-outsource-challans"
            rows={filteredChallans}
            rowKey={(c) => c.id}
            frozenColumns={2}
            emptyText="No outsource print challans match filter"
            columns={[
              { key: 'id', header: 'Challan No', width: 120, value: (c) => c.id, render: (c) => <strong>{c.id}</strong> },
              { key: 'vendor', header: 'Vendor', width: 190, value: (c) => c.vendor },
              {
                key: 'jobStyle',
                header: 'Job / Style',
                width: 150,
                value: (c) => `${c.jobNo} ${c.styleNo} ${c.buyer}`,
                render: (c) => (
                  <div>
                    <strong>#{c.jobNo}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{c.styleNo} ({c.buyer})</div>
                  </div>
                ),
              },
              { key: 'printType', header: 'Print Technique', width: 165, value: (c) => c.printType },
              {
                key: 'dates',
                header: 'Sent → Return',
                width: 185,
                value: (c) => `${c.sentDate} ${c.returnDate}`,
                render: (c) => (
                  <span>
                    {fmtDate(c.sentDate)} → <strong>{fmtDate(c.returnDate)}</strong>
                  </span>
                ),
              },
              {
                key: 'sentPanels',
                header: 'Sent Panels (pcs)',
                width: 135,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => c.sentPanels,
                render: (c) => <strong>{fmtNum(c.sentPanels)}</strong>,
              },
              {
                key: 'rcvdPanels',
                header: 'Received (pcs)',
                width: 135,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => c.rcvdPanels,
                render: (c) => <strong style={{ color: c.rcvdPanels > 0 ? '#166534' : '#64748b' }}>{fmtNum(c.rcvdPanels)}</strong>,
              },
              {
                key: 'balance',
                header: 'Balance (pcs)',
                width: 125,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => Math.max(0, c.sentPanels - c.rcvdPanels),
                render: (c) => {
                  const bal = Math.max(0, c.sentPanels - c.rcvdPanels);
                  return <strong style={{ color: bal > 0 ? '#dc2626' : '#166534' }}>{fmtNum(bal)}</strong>;
                },
              },
              {
                key: 'rejPanels',
                header: 'Rejections (pcs)',
                width: 125,
                numeric: true,
                total: true,
                unit: 'pcs',
                value: (c) => c.rejPanels,
              },
              {
                key: 'status',
                header: 'Status',
                width: 115,
                value: (c) => c.status,
              },
            ] satisfies GridColumn<(typeof challans)[number]>[]}
          />
        </section>
      )}

      {/* TAB 3: NEW OUTSOURCE DISPATCH */}
      {activeTab === 'DISPATCH' && (
        <section style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px', maxWidth: '700px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            Dispatch Panels to Outsource Print House
          </h3>
          <form onSubmit={handleAddDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Select Approved Vendor
                </label>
                <select
                  value={newDispatch.vendor}
                  onChange={(e) => setNewDispatch({ ...newDispatch, vendor: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                >
                  <option value="ColorTex Screen Prints Ltd.">ColorTex Screen Prints Ltd.</option>
                  <option value="Apex Digital & Graphics Ltd.">Apex Digital & Graphics Ltd.</option>
                  <option value="GreenLine Screen Works">GreenLine Screen Works</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Print Technique / Type
                </label>
                <select
                  value={newDispatch.printType}
                  onChange={(e) => setNewDispatch({ ...newDispatch, printType: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                >
                  <option value="Plastisol Chest Print">Plastisol Chest Print</option>
                  <option value="All-Over & Rotary Print">All-Over & Rotary Print</option>
                  <option value="High Density (HD) & Puff">High Density (HD) & Puff</option>
                  <option value="Discharge & Pigment Print">Discharge & Pigment Print</option>
                  <option value="Glitter & Foil Print">Glitter & Foil Print</option>
                  <option value="Full Color Photographic DTF">Full Color Photographic DTF</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Job No *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 48120"
                  value={newDispatch.jobNo}
                  onChange={(e) => setNewDispatch({ ...newDispatch, jobNo: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Style No
                </label>
                <input
                  type="text"
                  placeholder="e.g. 13251545"
                  value={newDispatch.styleNo}
                  onChange={(e) => setNewDispatch({ ...newDispatch, styleNo: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Buyer
                </label>
                <input
                  type="text"
                  value={newDispatch.buyer}
                  onChange={(e) => setNewDispatch({ ...newDispatch, buyer: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Sent Panels Qty *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={newDispatch.sentPanels}
                  onChange={(e) => setNewDispatch({ ...newDispatch, sentPanels: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Negotiated Rate/Panel (BDT)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newDispatch.ratePerPanel}
                  onChange={(e) => setNewDispatch({ ...newDispatch, ratePerPanel: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Target Return Date
                </label>
                <input
                  type="date"
                  value={newDispatch.returnDate}
                  onChange={(e) => setNewDispatch({ ...newDispatch, returnDate: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Generate Outsource Challan &amp; Dispatch
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 4: QUALITY & DEFECTS */}
      {activeTab === 'QUALITY' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Printing Defect Breakdown (DHU: 0.71%)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { defect: 'Misprint / Alignment Shift', pct: 36, color: '#ef4444' },
                { defect: 'Color Bleeding / Migration', pct: 24, color: '#f59e0b' },
                { defect: 'Color Off-Shade vs Strike-Off', pct: 18, color: '#3b82f6' },
                { defect: 'Pinholes / Screen Mesh Mark', pct: 14, color: '#8b5cf6' },
                { defect: 'Peel Off / Rubbing Fastness Fail', pct: 8, color: '#10b981' }
              ].map((d) => (
                <div key={d.defect}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>
                    <span>{d.defect}</span>
                    <span>{d.pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Buyer Strike-Off &amp; Lab Sign-Off
            </h4>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px' }}>
                All bulk printing (both in-house tables and outsource vendors) requires a signed <strong>1st Strike-Off sample</strong> approved by IE/Quality &amp; Merchandising before cutting panels are loaded onto tables.
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Color fastness to washing (40°C wash test certified)</li>
                <li>Rub fastness (Wet &amp; Dry 4-5 grade)</li>
                <li>Phthalate-free &amp; OEKO-TEX Eco-Passport ink certificate</li>
                <li>Stretch recovery test for Lycra single jersey fabrics</li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </Shell>
  );
}
