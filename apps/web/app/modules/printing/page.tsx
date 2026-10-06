'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';

export default function PrintingModulePage() {
  const [activeTab, setActiveTab] = useState<'INHOUSE' | 'OUTSOURCE' | 'DISPATCH' | 'QUALITY'>('INHOUSE');
  const [vendorFilter, setVendorFilter] = useState('ALL');

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

  return (
    <Shell title="Printing Operations" eyebrow="In-House Print Floor & Outsource / Sub-Contract Tracking">
      {/* Module Hero */}
      <section className="dashboard-hero">
        <div>
          <div className="hero-kicker">Garment Production · Printing Division</div>
          <h2>In-House &amp; Outsource Printing Management</h2>
          <p>
            Track in-house automatic oval carousels and manual printing tables alongside multi-vendor outsource print challans,
            strike-off lab approvals, and defect/rejection rates.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn btn-primary">
            Executive KPI Board
          </Link>
          <Link href="/modules/embroidery" className="btn btn-ghost">
            Embroidery Operations &rarr;
          </Link>
        </div>
      </section>

      {/* KPI Highlight Strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '16px 0' }}>
        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Total Panels</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            826,632 <span style={{ fontSize: '12px', color: '#64748b' }}>Panels</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>Avg. 31,793 Panels/Day</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>In-House Production</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
            681,145 <span style={{ fontSize: '12px' }}>(82.4%)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>2 Automatic Ovals + 4 Tables · 91.7% Eff</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
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

          {/* Challans Table */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Challan No</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Vendor</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Job / Style</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Print Technique</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Sent &rarr; Return</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Sent Panels</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Received</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Rejections</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.map((c) => {
                  const balance = c.sentPanels - c.rcvdPanels;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{c.id}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>{c.vendor}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>#{c.jobNo}</strong> <br />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{c.styleNo} ({c.buyer})</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{c.printType}</td>
                      <td style={{ padding: '12px 14px', fontSize: '11px', color: '#475569' }}>
                        {c.sentDate} &rarr; <strong style={{ color: '#0f172a' }}>{c.returnDate}</strong>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>{c.sentPanels.toLocaleString()}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: c.rcvdPanels > 0 ? '#166534' : '#64748b' }}>
                        {c.rcvdPanels.toLocaleString()}
                        {balance > 0 && c.rcvdPanels > 0 && <div style={{ fontSize: '10px', color: '#d97706' }}>Bal: {balance.toLocaleString()}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: c.rejPanels > 0 ? '#dc2626' : '#64748b' }}>
                        {c.rejPanels}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: 800,
                            background: c.status === 'RECEIVED' ? '#dcfce7' : c.status === 'IN_PROCESS' ? '#fef3c7' : '#e0e7ff',
                            color: c.status === 'RECEIVED' ? '#166534' : c.status === 'IN_PROCESS' ? '#b45309' : '#3730a3'
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
