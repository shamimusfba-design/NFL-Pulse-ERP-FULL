'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';

export default function EmbroideryModulePage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INHOUSE' | 'OUTSOURCE' | 'DISPATCH'>('OVERVIEW');
  const [vendorFilter, setVendorFilter] = useState('ALL');

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

  return (
    <Shell title="Embroidery Operations" eyebrow="In-House Floor & Outsource / Sub-Contract Tracking">
      {/* Module Hero */}
      <section className="dashboard-hero">
        <div>
          <div className="hero-kicker">Garment Production · Embroidery Division</div>
          <h2>In-House &amp; Outsource Embroidery Management</h2>
          <p>
            Track in-house 88-head embroidery machines, multi-vendor outsource challans, daily stitch counters, and quality rejection.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn btn-primary">
            Executive KPI Board
          </Link>
          <Link href="/modules/cad" className="btn btn-ghost">
            Cutting &amp; Panels
          </Link>
        </div>
      </section>

      {/* KPI Highlight Strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '16px 0' }}>
        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Total Panels</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            410,000 <span style={{ fontSize: '12px', color: '#64748b' }}>Panels</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>284 Million Stitches</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>In-House Production</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
            268,000 <span style={{ fontSize: '12px' }}>(65.4%)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>4 Tajima/Barudan Machines (88 Heads) · 88.4% Eff</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
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

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Challan No</th>
                  <th>Vendor</th>
                  <th>Job No</th>
                  <th>Style</th>
                  <th>Buyer</th>
                  <th>Sent (Pcs)</th>
                  <th>Received (Pcs)</th>
                  <th>Balance</th>
                  <th>Rejection</th>
                  <th>Rate/1K</th>
                  <th>Return ETA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.map((c) => {
                  const balance = c.sentPanels - c.rcvdPanels;
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.id}</strong></td>
                      <td>{c.vendor}</td>
                      <td><strong>#{c.jobNo}</strong></td>
                      <td>{c.styleNo}</td>
                      <td>{c.buyer}</td>
                      <td>{c.sentPanels.toLocaleString()}</td>
                      <td>{c.rcvdPanels.toLocaleString()}</td>
                      <td style={{ color: balance > 0 ? '#b45309' : '#15803d', fontWeight: 700 }}>
                        {balance.toLocaleString()}
                      </td>
                      <td style={{ color: c.rejPanels > 0 ? '#dc2626' : '#64748b' }}>
                        {c.rejPanels} pcs
                      </td>
                      <td>${c.ratePerK.toFixed(2)}</td>
                      <td>{c.returnDate}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            background: c.status === 'RECEIVED' ? '#dcfce7' : c.status === 'IN_PROCESS' ? '#fef3c7' : '#e0f2fe',
                            color: c.status === 'RECEIVED' ? '#166534' : c.status === 'IN_PROCESS' ? '#b45309' : '#0369a1'
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
