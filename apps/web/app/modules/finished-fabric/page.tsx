'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';

type StoreTab = 'DELIVERY_CHALLAN' | 'STORE_INVENTORY' | 'CUTTING_READINESS' | 'INSPECTION_4POINT';

function num(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })) : String(v);
}

function dt(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function FinishedFabricStorePage() {
  const [tab, setTab] = useState<StoreTab>('DELIVERY_CHALLAN');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('ALL');

  const factoryData: any = factoryDataRaw;
  const deliveryRows = factoryData.deliveryRows || [];
  const executionRows = factoryData.executionRows || [];
  const summary = factoryData.summary || {
    totalGreigeStock: 124500,
    totalKnittingReceived: 971531,
    totalDyeingIssued: 383527.7,
    finishingOutput: 368187,
    deliveryTotal: 290409,
    deliveryBalance: -108131
  };

  const buyers = useMemo<string[]>(() => {
    return (Array.from(new Set(deliveryRows.map((r: any) => String(r.buyer || '')))).filter(Boolean) as string[]).sort();
  }, [deliveryRows]);

  const slots = useMemo<string[]>(() => {
    return (Array.from(new Set(deliveryRows.map((r: any) => String(r.slotNo || '')))).filter(Boolean) as string[]).sort();
  }, [deliveryRows]);

  const filteredDeliveries = useMemo(() => {
    return deliveryRows.filter((r: any) => {
      if (buyerFilter !== 'ALL' && r.buyer !== buyerFilter) return false;
      if (selectedSlot !== 'ALL' && r.slotNo !== selectedSlot) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return `${r.jobNo} ${r.buyer} ${r.challanNo} ${r.slotNo} ${r.merchandiser} ${r.remarks}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [deliveryRows, buyerFilter, selectedSlot, search]);

  // Aggregate delivery totals
  const deliveryStats = useMemo(() => {
    const totalBody = filteredDeliveries.reduce((s: number, r: any) => s + (Number(r.bodyDelivery) || 0), 0);
    const totalRib = filteredDeliveries.reduce((s: number, r: any) => s + (Number(r.lribDelivery) || 0), 0);
    const totalSj = filteredDeliveries.reduce((s: number, r: any) => s + (Number(r.sjerseyDelivery) || 0), 0);
    const totalDelivered = filteredDeliveries.reduce((s: number, r: any) => s + (Number(r.totalDelivery) || 0), 0);
    const totalBalance = filteredDeliveries.reduce((s: number, r: any) => s + (Number(r.totalBalance) || 0), 0);

    return { totalBody, totalRib, totalSj, totalDelivered, totalBalance };
  }, [filteredDeliveries]);

  // 4-point inspection mock lots
  const inspectionLots = useMemo(() => {
    return executionRows.slice(0, 40).map((r: any, idx: number) => {
      const pointScore = 12 + (idx % 16);
      const isPass = pointScore <= 24;
      return {
        rollNo: `R-${r.jobNo}-${String(idx + 1).padStart(3, '0')}`,
        jobNo: r.jobNo,
        buyer: r.buyer,
        color: r.colour,
        fabric: r.fabricDescription || 'Single Jersey 100% Cotton',
        actualGsm: r.gsm ? `${r.gsm} ± 4` : '180 ± 5',
        actualWidth: r.widthDia || '68" / 70"',
        shadeGroup: idx % 3 === 0 ? 'Shade A' : idx % 3 === 1 ? 'Shade B' : 'Shade C',
        pointScore,
        result: isPass ? 'PASS (1st Quality)' : 'HOLD (Minor Barre)',
        inspectedBy: idx % 2 === 0 ? 'M. Hossain (QC)' : 'R. Karim (Sr. QC)'
      };
    });
  }, [executionRows]);

  return (
    <Shell title="Finished Fabric Store & Delivery to Cutting" eyebrow="Northern Fashion Ltd. · Fabric Receiving, 4-Point Inspection & Challan Handover">
      {/* Hero section */}
      <section className="module-hero">
        <div>
          <span className="status-pill good">Live Finished Fabric Store</span>
          <h2>Finished Fabric Inventory &amp; Cutting Delivery Management</h2>
          <p>
            Floor integration: Dyed fabric receipt from Finishing &amp; Compacting → 
            <strong> 4-Point System Quality Inspection</strong> &amp; Shade segregation (A/B/C) → 
            <strong> Delivery Challan</strong> handover to Automated Cutting Floor. Total delivered: <strong>{num(summary.deliveryTotal)} kg</strong>.
          </p>
        </div>
        <div className="module-actions">
          <Link href="/modules/dyeing" className="btn btn-secondary">
            ← Dyeing Floor
          </Link>
          <Link href="/modules/lab" className="btn btn-primary">
            Lab &amp; Testing Releases →
          </Link>
        </div>
      </section>

      {/* TOP KPI CARDS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '14px 0' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Finishing Output Received</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>{num(summary.finishingOutput)} kg</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total dyed &amp; finished in store</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Delivered to Cutting</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{num(summary.deliveryTotal)} kg</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{filteredDeliveries.length} issued challans</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Store Inventory Balance</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {num(Math.max(0, summary.finishingOutput - summary.deliveryTotal))} kg
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Inspected &amp; available for issue</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Inspection Pass Ratio</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>96.8%</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>ASTM 4-Point System (&lt; 28 pts/100 yd²)</div>
        </div>
      </section>

      {/* TABS SELECTOR */}
      <section className="panel" style={{ padding: '10px 14px', margin: '0 0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={tab === 'DELIVERY_CHALLAN' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setTab('DELIVERY_CHALLAN')}
            >
              Delivery Challan &amp; Cutting Handover ({filteredDeliveries.length})
            </button>
            <button
              type="button"
              className={tab === 'INSPECTION_4POINT' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setTab('INSPECTION_4POINT')}
            >
              4-Point Inspection &amp; Shade Rolls ({inspectionLots.length})
            </button>
            <button
              type="button"
              className={tab === 'STORE_INVENTORY' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setTab('STORE_INVENTORY')}
            >
              Store Rack / Bin Inventory
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={buyerFilter}
              onChange={e => setBuyerFilter(e.target.value)}
              style={{ fontSize: '11px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Buyers ({buyers.length})</option>
              {buyers.map((b: string) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={selectedSlot}
              onChange={e => setSelectedSlot(e.target.value)}
              style={{ fontSize: '11px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Slots</option>
              {slots.map((s: string) => (
                <option key={s} value={s}>Slot: {s}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search Job, Challan, Merchandiser…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '11px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '200px' }}
            />
          </div>
        </div>
      </section>

      {/* TAB 1: DELIVERY CHALLAN & CUTTING HANDOVER */}
      {tab === 'DELIVERY_CHALLAN' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Finished Fabric Delivery Challan Sheet to Cutting Floor</div>
              <div className="panel-sub">Official factory challan records showing Body, 1x1 Rib and Single Jersey component breakdown</div>
            </div>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>
              Delivered: {num(deliveryStats.totalDelivered)} kg (Body {num(deliveryStats.totalBody)} kg · Rib {num(deliveryStats.totalRib)} kg · S/J {num(deliveryStats.totalSj)} kg)
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '680px' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Challan No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Job No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Buyer</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Slot</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Dyeing Window</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Body Delivery</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>1x1 Rib</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>S/Jersey</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total Delivered</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Balance / Gap</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Merchandiser</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.slice(0, 100).map((r: any, idx: number) => {
                  const bal = Number(r.totalBalance) || 0;
                  const isShortage = bal < 0;

                  return (
                    <tr key={`${r.challanNo}-${r.jobNo}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{r.challanNo || `CH-${1000 + idx}`}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{r.jobNo}</td>
                      <td style={{ padding: '8px', color: '#475569' }}>{r.buyer}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                          {r.slotNo || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontSize: '10px', color: '#64748b' }}>
                        {r.dyeingStart && r.dyeingEnd ? `${dt(r.dyeingStart)} → ${dt(r.dyeingEnd)}` : 'Completed'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{num(r.bodyDelivery)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{num(r.lribDelivery)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{num(r.sjerseyDelivery)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        {num(r.totalDelivery)} kg
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: isShortage ? '#dc2626' : '#16a34a'
                          }}
                        >
                          {num(r.totalBalance)} {r.balancePct ? `(${r.balancePct}%)` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#475569' }}>{r.merchandiser || 'Merchandising Team'}</td>
                      <td style={{ padding: '8px', fontSize: '10px', color: '#64748b' }}>{r.remarks || 'Standard release'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 14px', background: '#fafafa', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
            Showing top 100 of {filteredDeliveries.length} delivery records. Connects with Greige Store and Cutting Floor CAD bundle ticketing.
          </div>
        </section>
      )}

      {/* TAB 2: 4-POINT INSPECTION & SHADE ROLLS */}
      {tab === 'INSPECTION_4POINT' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Finished Fabric Roll 4-Point System Quality Audit</div>
              <div className="panel-sub">ASTM D5430 4-point inspection point score &amp; shade segregation (A / B / C lot grouping)</div>
            </div>
            <span className="status-pill good">Tolerance: Max 28 pts / 100 yd²</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Roll Barcode</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Job No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Buyer</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Color &amp; Description</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Actual GSM</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Cuttable Width</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Shade Band</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>4-Pt Score</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Quality Grade</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Inspector</th>
                </tr>
              </thead>
              <tbody>
                {inspectionLots.map((roll: any, idx: number) => (
                  <tr key={`${roll.rollNo}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>{roll.rollNo}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#2563eb' }}>{roll.jobNo}</td>
                    <td style={{ padding: '8px', color: '#475569' }}>{roll.buyer}</td>
                    <td style={{ padding: '8px' }}>
                      <strong>{roll.color}</strong>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{roll.fabric}</div>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{roll.actualGsm}</td>
                    <td style={{ padding: '8px', color: '#475569' }}>{roll.actualWidth}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          background: roll.shadeGroup === 'Shade A' ? '#eff6ff' : roll.shadeGroup === 'Shade B' ? '#f0fdf4' : '#fffbeb',
                          color: roll.shadeGroup === 'Shade A' ? '#1e40af' : roll.shadeGroup === 'Shade B' ? '#166534' : '#92400e'
                        }}
                      >
                        {roll.shadeGroup}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: roll.pointScore <= 20 ? '#16a34a' : '#d97706' }}>
                      {roll.pointScore} pts
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          background: roll.result.includes('PASS') ? '#dcfce7' : '#fef3c7',
                          color: roll.result.includes('PASS') ? '#166534' : '#92400e'
                        }}
                      >
                        {roll.result}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontSize: '10px', color: '#64748b' }}>{roll.inspectedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: STORE RACK / BIN INVENTORY */}
      {tab === 'STORE_INVENTORY' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Finished Fabric Rack &amp; Bin Physical Store Layout</div>
              <div className="panel-sub">Roll location mapping, lot staging and cutting issue bays</div>
            </div>
            <span className="status-pill neutral">Floor Space: 14,000 sq ft</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', padding: '8px 0' }}>
            {['Zone A · Single Jersey Rolls (Bestseller)', 'Zone B · Heavyweight Fleece & Terry', 'Zone C · Rib / Lycra / Collar Cuff', 'Zone D · Staging Bay for Cutting Issue'].map((zone, idx) => (
              <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#fafafa' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{zone}</strong>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Capacity: 120 Racks · Current Occupancy: <strong>{75 + idx * 5}%</strong>
                </div>
                <div style={{ marginTop: '10px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${75 + idx * 5}%`, height: '100%', background: '#2563eb' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
                  <span>Available: {25 - idx * 5}%</span>
                  <span>Temperature: 22°C · RH: 60%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
