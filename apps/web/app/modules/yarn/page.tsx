'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import yarnMasterRaw from '../../../data/yarn-stock-master.json';

const yarnData = (yarnMasterRaw as any) || {};

interface YarnStockItem {
  id: string;
  lotNo: string;
  count: string;
  type: 'WHITE' | 'COLOR' | 'MELANGE';
  spinningMill: string;
  composition: string;
  godown: 'Godown A' | 'Godown B';
  stockKg: number;
  safetyBufferKg: number;
  allocatedKg: number;
  availableKg: number;
  status: 'SUFFICIENT' | 'LOW' | 'CRITICAL' | 'DEAD_STOCK';
  daysAging: number;
}

const INITIAL_STOCK: YarnStockItem[] = [
  { id: 'YS-101', lotNo: 'LOT-SQ-402', count: '30/1 Combed Cotton', type: 'WHITE', spinningMill: 'Square Textiles', composition: '100% Cotton', godown: 'Godown A', stockKg: 85400, safetyBufferKg: 40000, allocatedKg: 52000, availableKg: 33400, status: 'SUFFICIENT', daysAging: 22 },
  { id: 'YS-102', lotNo: 'LOT-BD-210', count: '28/1 Cotton Melange', type: 'MELANGE', spinningMill: 'Badsha Textiles', composition: '95% Cotton / 5% Poly', godown: 'Godown A', stockKg: 1200, safetyBufferKg: 8000, allocatedKg: 1200, availableKg: 0, status: 'CRITICAL', daysAging: 14 },
  { id: 'YS-103', lotNo: 'LOT-SH-119', count: '34/1 Combed Cotton', type: 'WHITE', spinningMill: 'Shurwid Spinning', composition: '100% Combed', godown: 'Godown B', stockKg: 2100, safetyBufferKg: 10000, allocatedKg: 2100, availableKg: 0, status: 'CRITICAL', daysAging: 18 },
  { id: 'YS-104', lotNo: 'LOT-MT-804', count: '26/1 CVC 60/40', type: 'COLOR', spinningMill: 'Matin Spinning', composition: '60% Cotton / 40% Poly', godown: 'Godown A', stockKg: 950, safetyBufferKg: 6000, allocatedKg: 950, availableKg: 0, status: 'CRITICAL', daysAging: 35 },
  { id: 'YS-105', lotNo: 'LOT-NV-503', count: '30/1 Lycra 5%', type: 'COLOR', spinningMill: 'Novotex Mills', composition: '95% Cotton / 5% Spandex', godown: 'Godown B', stockKg: 400, safetyBufferKg: 3500, allocatedKg: 400, availableKg: 0, status: 'CRITICAL', daysAging: 28 },
  { id: 'YS-106', lotNo: 'LOT-AK-911', count: '20/1 Carded Cotton', type: 'WHITE', spinningMill: 'Akij Textiles', composition: '100% Carded', godown: 'Godown A', stockKg: 142000, safetyBufferKg: 60000, allocatedKg: 88000, availableKg: 54000, status: 'SUFFICIENT', daysAging: 19 },
  { id: 'YS-107', lotNo: 'LOT-SL-308', count: '24/1 Organic Cotton', type: 'COLOR', spinningMill: 'Salek Textiles', composition: '100% Organic GOTS', godown: 'Godown B', stockKg: 3200, safetyBufferKg: 9000, allocatedKg: 3200, availableKg: 0, status: 'LOW', daysAging: 42 },
  { id: 'YS-108', lotNo: 'LOT-IS-440', count: '32/2 Dyed Yarn Red', type: 'COLOR', spinningMill: 'Ispahani Mills', composition: '100% Dyed Ring', godown: 'Godown A', stockKg: 600, safetyBufferKg: 2500, allocatedKg: 600, availableKg: 0, status: 'LOW', daysAging: 56 },
  { id: 'YS-109', lotNo: 'LOT-BD-188', count: '20/1 Slub Yarn', type: 'MELANGE', spinningMill: 'Badsha Textiles', composition: '100% Slub Cotton', godown: 'Godown B', stockKg: 1800, safetyBufferKg: 5000, allocatedKg: 1800, availableKg: 0, status: 'LOW', daysAging: 30 },
  { id: 'YS-110', lotNo: 'LOT-SQ-102', count: '40/1 Modal Cotton', type: 'COLOR', spinningMill: 'Square Textiles', composition: '50% Modal / 50% Cotton', godown: 'Godown A', stockKg: 850, safetyBufferKg: 3000, allocatedKg: 850, availableKg: 0, status: 'LOW', daysAging: 48 },
  { id: 'YS-111', lotNo: 'LOT-OLD-01', count: '16/1 O/E Grey Waste', type: 'COLOR', spinningMill: 'Rahim Spinning', composition: 'Recycled Poly Cotton', godown: 'Godown B', stockKg: 5400, safetyBufferKg: 0, allocatedKg: 0, availableKg: 5400, status: 'DEAD_STOCK', daysAging: 124 },
  { id: 'YS-112', lotNo: 'LOT-OLD-02', count: '24/1 Slub Navy Scrap', type: 'COLOR', spinningMill: 'Viyellatex', composition: '100% Cotton Dyed', godown: 'Godown B', stockKg: 4200, safetyBufferKg: 0, allocatedKg: 0, availableKg: 4200, status: 'DEAD_STOCK', daysAging: 110 }
];

const REQUISITIONS_DATA = [
  { id: 'REQ-48085', jobNo: '48085', buyer: 'BS-NMT', styleNo: '13251506', count: '30/1 Combed Cotton', reqKg: 4850, allocatedKg: 4850, status: 'ALLOCATED', date: '2026-09-22' },
  { id: 'REQ-48002', jobNo: '48002', buyer: 'ONLY', styleNo: '13251512', count: '34/1 Combed Cotton', reqKg: 4200, allocatedKg: 2100, status: 'SHORTAGE', date: '2026-09-23' },
  { id: 'REQ-46755', jobNo: '46755', buyer: 'OVS', styleNo: '13251480', count: '26/1 CVC 60/40', reqKg: 2800, allocatedKg: 950, status: 'SHORTAGE', date: '2026-09-24' },
  { id: 'REQ-46758', jobNo: '46758', buyer: 'UTG', styleNo: '13251495', count: '30/1 Lycra 5%', reqKg: 1950, allocatedKg: 400, status: 'SHORTAGE', date: '2026-09-24' },
  { id: 'REQ-48061', jobNo: '48061', buyer: 'Name It', styleNo: '13251509', count: '24/1 Organic Cotton', reqKg: 5100, allocatedKg: 3200, status: 'SHORTAGE', date: '2026-09-25' },
  { id: 'REQ-48110', jobNo: '48110', buyer: 'Only&Sons', styleNo: '13251532', count: '32/2 Dyed Yarn Red', reqKg: 2350, allocatedKg: 600, status: 'SHORTAGE', date: '2026-09-26' }
];

export default function YarnModulePage() {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'SAFETY' | 'REQUISITIONS' | 'DEAD_STOCK'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [godownFilter, setGodownFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredStock = INITIAL_STOCK.filter((item) => {
    const matchesSearch = `${item.count} ${item.lotNo} ${item.spinningMill}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGodown = godownFilter === 'ALL' || item.godown === godownFilter;
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    return matchesSearch && matchesGodown && matchesType;
  });

  const safetyAlerts = (yarnData.safetyStockAlerts as any[]) || INITIAL_STOCK.filter((s) => s.status === 'CRITICAL' || s.status === 'LOW');
  const deadStockItems = INITIAL_STOCK.filter((s) => s.status === 'DEAD_STOCK');

  return (
    <Shell title="Yarn Management & Stock" eyebrow="Warehouse Inventory · Safety Buffers · Pipeline">
      {/* Header Banner */}
      <section className="dashboard-hero">
        <div>
          <div className="hero-kicker">Raw Material &amp; Inventory</div>
          <h2>Yarn Store &amp; Inventory Management</h2>
          <p>
            Real-time godown stock ledger, automated safety stock deficit tracking, spinning mill purchase pipeline, and knitting allocation.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/" className="btn btn-primary">
            Executive KPI Board
          </Link>
          <Link href="/modules/knitting" className="btn btn-ghost">
            Knitting Floor
          </Link>
        </div>
      </section>

      {/* Primary KPI Summary Strip (Real 988.97 Tons Report Data) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0' }}>
        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total In Stock</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            988.97 <span style={{ fontSize: '12px', color: '#64748b' }}>Tons</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            White: <strong>157.65 T</strong> | Color: <strong>831.32 T</strong>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #fecaca', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Safety Stock Deficit</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', margin: '2px 0' }}>
            8 Counts Alert
          </div>
          <div style={{ fontSize: '11px', color: '#b91c1c' }}>Immediate Spinning Mill PO Required</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pipeline (LC Open)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            119.53 <span style={{ fontSize: '12px', color: '#64748b' }}>Tons</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>ETA: 7 to 14 days delivery</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Open Requisitions</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
            342.50 <span style={{ fontSize: '12px', color: '#64748b' }}>Tons</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>From Merchandising Orders</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dead Stock (&gt;90 Days)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
            18.40 <span style={{ fontSize: '12px', color: '#64748b' }}>Tons</span>
          </div>
          <div style={{ fontSize: '11px', color: '#92400e' }}>14 idle lots awaiting clearance</div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Avg Daily Issue Rate</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
            38.20 <span style={{ fontSize: '12px', color: '#64748b' }}>T/day</span>
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>25.8 days warehouse coverage</div>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '14px 0 18px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('STOCK')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'STOCK' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'STOCK' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          📦 Godown Stock Ledger ({filteredStock.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SAFETY')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'SAFETY' ? '#dc2626' : '#fef2f2',
            color: activeTab === 'SAFETY' ? '#fff' : '#b91c1c',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🚨 Safety Stock Alerts ({safetyAlerts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('REQUISITIONS')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'REQUISITIONS' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'REQUISITIONS' ? '#fff' : '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          📋 Merchandising Requisitions ({REQUISITIONS_DATA.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DEAD_STOCK')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'DEAD_STOCK' ? '#b45309' : '#fffbeb',
            color: activeTab === 'DEAD_STOCK' ? '#fff' : '#92400e',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ⚠️ Dead Stock ({deadStockItems.length})
        </button>
      </div>

      {/* TAB 1: GODOWN STOCK LEDGER */}
      {activeTab === 'STOCK' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search count, lot, spinning mill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '220px' }}
              />
              <select
                value={godownFilter}
                onChange={(e) => setGodownFilter(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Godowns</option>
                <option value="Godown A">Godown A</option>
                <option value="Godown B">Godown B</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Types</option>
                <option value="WHITE">White / Grey</option>
                <option value="COLOR">Dyed Solid</option>
                <option value="MELANGE">Melange</option>
              </select>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredStock.length} items
            </span>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Lot No</th>
                  <th>Yarn Count</th>
                  <th>Composition</th>
                  <th>Spinning Mill</th>
                  <th>Location</th>
                  <th>In-Stock (Kg)</th>
                  <th>Buffer (Kg)</th>
                  <th>Allocated</th>
                  <th>Available (Kg)</th>
                  <th>Aging</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.lotNo}</strong></td>
                    <td><strong>{s.count}</strong></td>
                    <td>{s.composition}</td>
                    <td>{s.spinningMill}</td>
                    <td>{s.godown}</td>
                    <td style={{ fontWeight: 700 }}>{s.stockKg.toLocaleString()}</td>
                    <td>{s.safetyBufferKg.toLocaleString()}</td>
                    <td>{s.allocatedKg.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: s.availableKg <= 0 ? '#dc2626' : '#15803d' }}>
                      {s.availableKg.toLocaleString()}
                    </td>
                    <td>{s.daysAging}d</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          background:
                            s.status === 'SUFFICIENT'
                              ? '#dcfce7'
                              : s.status === 'CRITICAL'
                              ? '#fee2e2'
                              : s.status === 'DEAD_STOCK'
                              ? '#fef3c7'
                              : '#f1f5f9',
                          color:
                            s.status === 'SUFFICIENT'
                              ? '#166534'
                              : s.status === 'CRITICAL'
                              ? '#991b1b'
                              : s.status === 'DEAD_STOCK'
                              ? '#92400e'
                              : '#475569'
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: SAFETY STOCK ALERTS */}
      {activeTab === 'SAFETY' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#991b1b' }}>
            <strong>Action Required:</strong> 8 yarn counts have dropped below mandatory factory safety buffers. Immediate spinning mill purchase orders must be issued to avoid knitting machine stoppages.
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Yarn Count</th>
                  <th>Current Stock</th>
                  <th>Required Safety Buffer</th>
                  <th>Deficit Qty (Kg)</th>
                  <th>Severity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {safetyAlerts.map((a: any, i: number) => {
                  const count = a.count;
                  const current = a.currentStockKg || a.stockKg || 0;
                  const buffer = a.safetyBufferKg || 0;
                  const deficit = a.deficitKg || (buffer - current);
                  return (
                    <tr key={i}>
                      <td><strong>{count}</strong></td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{current.toLocaleString()} Kg</td>
                      <td>{buffer.toLocaleString()} Kg</td>
                      <td style={{ color: '#b91c1c', fontWeight: 800 }}>-{deficit.toLocaleString()} Kg</td>
                      <td>
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                          CRITICAL BUFFER DEFICIT
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => alert(`Spinning mill PO draft initiated for ${count} (${deficit} Kg)`)}
                        >
                          + Create Mill PO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: MERCHANDISING REQUISITIONS */}
      {activeTab === 'REQUISITIONS' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Buyer</th>
                  <th>Style</th>
                  <th>Yarn Count</th>
                  <th>Required (Kg)</th>
                  <th>Allocated (Kg)</th>
                  <th>Shortage (Kg)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {REQUISITIONS_DATA.map((r) => {
                  const shortage = r.reqKg - r.allocatedKg;
                  return (
                    <tr key={r.id}>
                      <td><strong>#{r.jobNo}</strong></td>
                      <td>{r.buyer}</td>
                      <td>{r.styleNo}</td>
                      <td>{r.count}</td>
                      <td>{r.reqKg.toLocaleString()}</td>
                      <td>{r.allocatedKg.toLocaleString()}</td>
                      <td style={{ color: shortage > 0 ? '#dc2626' : '#166534', fontWeight: 700 }}>
                        {shortage > 0 ? `-${shortage.toLocaleString()}` : '0'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            background: r.status === 'ALLOCATED' ? '#dcfce7' : '#fee2e2',
                            color: r.status === 'ALLOCATED' ? '#166534' : '#991b1b'
                          }}
                        >
                          {r.status}
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

      {/* TAB 4: DEAD STOCK */}
      {activeTab === 'DEAD_STOCK' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fffbeb', borderLeft: '4px solid #b45309', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
            <strong>Dead Stock Review:</strong> 18.40 Tons (14 lots) have remained idle for &gt;90 days without requisition allocation. Recommended for sample production or yarn broker discount clearance.
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Lot No</th>
                  <th>Yarn Count</th>
                  <th>Spinning Mill</th>
                  <th>Location</th>
                  <th>Dead Qty (Kg)</th>
                  <th>Aging (Days)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deadStockItems.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.lotNo}</strong></td>
                    <td>{d.count}</td>
                    <td>{d.spinningMill}</td>
                    <td>{d.godown}</td>
                    <td style={{ fontWeight: 700, color: '#b45309' }}>{d.stockKg.toLocaleString()}</td>
                    <td>{d.daysAging} days idle</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => alert(`Marked ${d.lotNo} for sample reallocation`)}
                      >
                        Reallocate to Sample
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Shell>
  );
}
