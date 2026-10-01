'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type GreigeTab = 'execution' | 'dyeing-flow' | 'movements' | 'delivery' | 'slot-summary' | 'tracking';

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

import factoryDataRaw from '../../../data/dyeing-factory-data.json';
const DEFAULT_GREIGE_DATA: any = factoryDataRaw;

export default function GreigeStorePage() {
  const [tab, setTab] = useState<GreigeTab>('dyeing-flow');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Process movement filter
  const [selectedProcess, setSelectedProcess] = useState('ALL');

  // New Batch Form State
  const [newBatch, setNewBatch] = useState({
    jobNo: '2601',
    buyer: 'BESTSELLER',
    styleNo: '122456',
    color: 'BLACK',
    component: 'Body (S/J)',
    route: 'IN-HOUSE',
    targetMachine: 'MC-01 (1000 KG)',
    plannedQty: 950,
    remarks: 'Daily Machine Plan slot 1'
  });
  const [batchMsg, setBatchMsg] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api('/greige-store/data');
      setData(res && res.summary ? res : DEFAULT_GREIGE_DATA);
    } catch {
      // Fallback gracefully to default production data
      setData(DEFAULT_GREIGE_DATA);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const d = data || DEFAULT_GREIGE_DATA;
  const s = d.summary || DEFAULT_GREIGE_DATA.summary;
  const executionRows: any[] = d.executionRows || [];
  const dyeingBatches: any[] = d.dyeingBatches || [];

  const buyerList = useMemo(() => Array.from(new Set(executionRows.map(r => r.buyer).filter(Boolean))).sort(), [executionRows]);

  const filteredExecution = useMemo(() => {
    return executionRows.filter(r => {
      if (buyerFilter !== 'ALL' && r.buyer !== buyerFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return `${r.buyer} ${r.jobNo} ${r.styleNo} ${r.colour} ${r.fabricDescription}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [executionRows, buyerFilter, search]);

  const movementRows: any[] = d.processMovements || [];
  const filteredMovements = useMemo(() => {
    if (selectedProcess === 'ALL') return movementRows;
    return movementRows.filter(m => m.processName === selectedProcess);
  }, [movementRows, selectedProcess]);

  function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    const batchNo = newBatch.route === 'IN-HOUSE' 
      ? `BT-${newBatch.jobNo}-${String(dyeingBatches.length + 1).padStart(2, '0')}`
      : `SWO-${newBatch.jobNo}-${String(dyeingBatches.length + 1).padStart(2, '0')}`;

    const created = {
      id: `B-${Date.now()}`,
      batchNo,
      jobNo: newBatch.jobNo,
      buyer: newBatch.buyer,
      styleNo: newBatch.styleNo,
      color: newBatch.color,
      component: newBatch.component,
      targetMachine: newBatch.targetMachine,
      route: newBatch.route,
      greigeAvailable: 2850,
      plannedQty: Number(newBatch.plannedQty),
      greigeIssuedQty: Number(newBatch.plannedQty),
      liquorRatio: '1:6',
      recipeCode: 'AUTO-RECIPE',
      status: newBatch.route === 'IN-HOUSE' ? 'ISSUED_TO_DYEING' : 'SENT_TO_MILL',
      date: new Date().toISOString().slice(0, 10),
      remarks: newBatch.remarks
    };

    setData((prev: any) => ({
      ...prev,
      dyeingBatches: [created, ...(prev?.dyeingBatches || [])]
    }));

    setBatchMsg(`✓ Batch ${batchNo} created successfully and greige fabric issued to ${newBatch.targetMachine}!`);
    setTimeout(() => setBatchMsg(''), 6000);
  }

  return (
    <Shell title="Greige Store & Fabric Execution" eyebrow="Greige Storage, Dyeing Batch Creation & Multi-Process Tracking · v0.4.43">
      <section className="module-hero">
        <div>
          <span className="status-pill good">Fabric Processing Control</span>
          <h2>Greige Store Receive, Dyeing Flow &amp; Multi-Process Movements</h2>
          <p>
            Models the complete factory flow: Greige roll receipt from Knitting → Daily Machine Plan matching → 
            <strong>In-house Batching</strong> &amp; <strong>Subcontract Work Order Dispatch</strong> → 
            Multi-Process Handover (<strong>AOP, Peach, Brush, Shearing, Singeing</strong>) → Finished Fabric Store Delivery.
          </p>
        </div>
        <div className="module-actions">
          <a className="btn btn-primary" href="/modules/dyeing">Dyeing Planning Module</a>
          <a className="btn btn-secondary" href="/modules/knitting">Knitting Module</a>
          <a className="btn btn-secondary" href="/modules/forms-print">Company FOS</a>
        </div>
      </section>

      {error && <div className="notice">{error}</div>}

      {/* KPI Header */}
      <section className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 16 }}>
        <div><span>Greige Stock</span><strong>{loading ? '…' : `${num(s.totalGreigeStock)} KG`}</strong></div>
        <div><span>Knitting Rcvd</span><strong style={{ color: '#2563eb' }}>{num(s.totalKnittingReceived)} KG</strong></div>
        <div><span>Dyeing Issued</span><strong>{num(s.totalDyeingIssued)} KG</strong></div>
        <div><span>In Multi-Process</span><strong style={{ color: '#d97706' }}>{num(s.inMultiProcess)} KG</strong></div>
        <div><span>Finishing Output</span><strong style={{ color: '#16a34a' }}>{num(s.finishingOutput)} KG</strong></div>
        <div><span>Delivery Total</span><strong style={{ color: '#16a34a' }}>{num(s.deliveryTotal)} KG</strong></div>
        <div><span>Delivery Balance</span><strong style={{ color: Number(s.deliveryBalance) > 0 ? '#ea580c' : '#16a34a' }}>{num(s.deliveryBalance)} KG</strong></div>
      </section>

      {/* Navigation Tabs */}
      <div className="workspace-tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'dyeing-flow' ? 'active' : ''} onClick={() => setTab('dyeing-flow')}>1. Dyeing Flow &amp; Batch Creation</button>
        <button className={tab === 'execution' ? 'active' : ''} onClick={() => setTab('execution')}>2. Greige / Finish Fabric Execution</button>
        <button className={tab === 'movements' ? 'active' : ''} onClick={() => setTab('movements')}>3. Multi-Process Movements (AOP/Brush/Peach)</button>
        <button className={tab === 'delivery' ? 'active' : ''} onClick={() => setTab('delivery')}>4. Dyeing / Finishing Delivery</button>
        <button className={tab === 'slot-summary' ? 'active' : ''} onClick={() => setTab('slot-summary')}>5. Slot &amp; Buyer Summary</button>
        <button className={tab === 'tracking' ? 'active' : ''} onClick={() => setTab('tracking')}>6. Job-wise Fabric Tracking</button>
      </div>

      {loading && <div className="panel"><div className="empty-state"><strong>Loading Greige Store Data…</strong></div></div>}

      {/* Tab 1: Dyeing Flow & Batch Creation */}
      {!loading && tab === 'dyeing-flow' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Visual Process Flow Overview */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">End-to-End Greige → Dyeing → Multi-Process → Finishing Pipeline</div>
                <div className="panel-sub">Operational workflow based on factory Daily Machine Plan and Subcontract Work Orders</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 8 }}>
              <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span className="status-pill good">Stage 1</span>
                <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>Greige Fabric Store</h4>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Knitting rolls received &amp; inspected. Stock partitioned by <strong>Body, L Rib, S-Jersey</strong>.
                </p>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 12, color: '#2563eb' }}>Stock: {num(s.totalGreigeStock)} KG</div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span className="status-pill neutral">Stage 2</span>
                <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>Daily Machine Plan</h4>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Central Planning plan received at Greige Store. Machine slot &amp; lot size matched.
                </p>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 12, color: '#1d4ed8' }}>5 In-House MC + Subcontract</div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span className="status-pill good">Stage 3</span>
                <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>Batch Card &amp; Dispatch</h4>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Greige rolls issued. In-house batch sent to floor, or Subcontract WO + Gate Pass dispatched.
                </p>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 12, color: '#16a34a' }}>Issued: {num(s.totalDyeingIssued)} KG</div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
                <span className="status-pill warn">Stage 4</span>
                <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>Multi-Process Routing</h4>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Sent &amp; received for <strong>AOP, Peach, Brush, Shearing, Singeing</strong> with loss tracking.
                </p>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 12, color: '#b45309' }}>Running: {num(s.inMultiProcess)} KG</div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                <span className="status-pill good">Stage 5</span>
                <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>Finished Fabric Store</h4>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Stenter &amp; Compactor finished. 4-point QC pass. Ready for Cutting section requisition.
                </p>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 12, color: '#7e22ce' }}>Delivered: {num(s.deliveryTotal)} KG</div>
              </div>
            </div>
          </div>

          {/* Machine Plan & Batch Creation Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: 16 }}>
            {/* Form: Create Batch & Issue Greige */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Create Dyeing Batch / Dispatch Subcontract</div>
                  <div className="panel-sub">Assign greige stock to in-house machine or generate outside mill WO</div>
                </div>
              </div>

              {batchMsg && <div className="notice" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', marginBottom: 12 }}>{batchMsg}</div>}

              <form onSubmit={handleCreateBatch} style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Job No</label>
                    <select
                      value={newBatch.jobNo}
                      onChange={e => {
                        const j = e.target.value;
                        const match = executionRows.find(r => r.jobNo === j);
                        setNewBatch(p => ({
                          ...p,
                          jobNo: j,
                          buyer: match?.buyer || p.buyer,
                          styleNo: match?.styleNo || p.styleNo,
                          color: match?.colour || p.color
                        }));
                      }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      {executionRows.slice(0, 20).map((r: any) => (
                        <option key={r.jobNo} value={r.jobNo}>Job {r.jobNo} ({r.buyer} - {r.colour})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Component</label>
                    <select
                      value={newBatch.component}
                      onChange={e => setNewBatch(p => ({ ...p, component: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="Body (S/J)">Body (Single Jersey)</option>
                      <option value="Body (Fleece)">Body (Brushed Fleece)</option>
                      <option value="Body (Pique)">Body (Pique / AOP Base)</option>
                      <option value="L Rib 1x1">L Rib 1x1 (Separate Line)</option>
                      <option value="S.Jersey">S.Jersey Neckband (Separate Line)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Dyeing Route</label>
                    <select
                      value={newBatch.route}
                      onChange={e => {
                        const r = e.target.value;
                        setNewBatch(p => ({
                          ...p,
                          route: r,
                          targetMachine: r === 'IN-HOUSE' ? 'MC-01 (1000 KG)' : 'Fakir Dyeing Mills Ltd'
                        }));
                      }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="IN-HOUSE">In-House Floor (Winch / Sclavos)</option>
                      <option value="SUBCONTRACT">Subcontract Mill (Outside WO)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      {newBatch.route === 'IN-HOUSE' ? 'Dyeing Machine Slot' : 'Subcontract Factory'}
                    </label>
                    <select
                      value={newBatch.targetMachine}
                      onChange={e => setNewBatch(p => ({ ...p, targetMachine: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      {newBatch.route === 'IN-HOUSE' ? (
                        <>
                          <option value="WINCH M/C (1400 kg - DILMENLER)">WINCH M/C (1400 kg - DILMENLER)</option>
                          <option value="WINCH M/C (1200 kg - DILMENLER)">WINCH M/C (1200 kg - DILMENLER)</option>
                          <option value="WINCH M/C (1050 kg - DILMENLER)">WINCH M/C (1050 kg - DILMENLER)</option>
                          <option value="WINCH M/C (700 kg - DILMENLER)">WINCH M/C (700 kg - DILMENLER)</option>
                          <option value="WINCH M/C (525 kg - DILMENLER)">WINCH M/C (525 kg - DILMENLER)</option>
                          <option value="WINCH M/C (450 kg - DILMENLER)">WINCH M/C (450 kg - DILMENLER)</option>
                          <option value="WINCH M/C (175 kg - DILMENLER)">WINCH M/C (175 kg - DILMENLER)</option>
                          <option value="WINCH M/C (75 kg - THIES)">WINCH M/C (75 kg - THIES)</option>
                          <option value="WINCH M/C (45 kg - FONGS)">WINCH M/C (45 kg - FONGS)</option>
                        </>
                      ) : (
                        <>
                          <option value="Giant Textile Ltd.">Giant Textile Ltd. (ONLY, ONS)</option>
                          <option value="Newage Textile Ltd.">Newage Textile Ltd. (OVS, UTG, NMT)</option>
                          <option value="Shadhin Dyeing (PVT.) Ltd.">Shadhin Dyeing (PVT.) Ltd. (ONLY, ONS, NMT)</option>
                          <option value="Sparkle Knit Composite Ltd">Sparkle Knit Composite Ltd (ONLY OSB, UTG)</option>
                          <option value="Pakiza Knit Composite Ltd.">Pakiza Knit Composite Ltd. (ONLY Sweat, OVS)</option>
                          <option value="APS Apparels Ltd.">APS Apparels Ltd. (NMT CVC, OVS)</option>
                          <option value="Unifill Composite Dyeing Mills">Unifill Composite Dyeing Mills (AOP)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Color / Shade</label>
                    <input
                      type="text"
                      value={newBatch.color}
                      onChange={e => setNewBatch(p => ({ ...p, color: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Issue Quantity (KG)</label>
                    <input
                      type="number"
                      value={newBatch.plannedQty}
                      onChange={e => setNewBatch(p => ({ ...p, plannedQty: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Remarks / Special Instructions</label>
                  <input
                    type="text"
                    value={newBatch.remarks}
                    onChange={e => setNewBatch(p => ({ ...p, remarks: e.target.value }))}
                    placeholder="e.g. Daily Machine Plan Slot 1; Pre-bleach for AOP..."
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                  <button type="submit" className="btn btn-primary">
                    {newBatch.route === 'IN-HOUSE' ? '✓ Create Batch & Issue to Dyeing' : '✓ Generate Subcontract WO & Gate Pass'}
                  </button>
                </div>
              </form>
            </div>

            {/* Daily Dyeing Machine Status & Load Overview */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Daily Machine Allocation &amp; Capacity Control</div>
                  <div className="panel-sub">Greige store issue plan aligned with factory dyeing floor nozzles</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>MC-01 (1,000 KG)</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Winch / High Temp · Running Batch BT-2601-01 (Job 2601 - Black Body)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="status-pill warn">Running (950 KG)</span>
                    <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>50 KG Free</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>MC-02 (500 KG)</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Sclavos · Planned for BT-2603-01 (Job 2603 - Off White Pique)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="status-pill good">Staged (500 KG)</span>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Ready for Load</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>MC-03 (250 KG)</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Fong&#39;s · Available for next scheduled lot</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="status-pill neutral">Available</span>
                    <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>250 KG Free</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>MC-04 (100 KG - Rib Slot)</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Batch BT-2601-02 (Job 2601 - L Rib 1x1 Black)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="status-pill good">Unloaded (100 KG)</span>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Sent to Hydro</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div>
                    <strong>Subcontract: Fakir Dyeing Mills Ltd</strong>
                    <div style={{ fontSize: 11, color: '#92400e' }}>SWO-2602-01 (Job 2602 - Navy Heather Fleece 2,250 KG)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="status-pill warn">Dispatched via Gate Pass</span>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Expected: 04 Oct 26</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Dyeing Batches & Subcontract Work Orders */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Active Dyeing Batches &amp; Subcontract Work Orders</div>
                <div className="panel-sub">Roll-wise greige issue history with machine allotment and status updates</div>
              </div>
            </div>

            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch / WO No</th>
                    <th>Job No</th>
                    <th>Buyer</th>
                    <th>Color</th>
                    <th>Component</th>
                    <th>Route</th>
                    <th>Machine / Mill</th>
                    <th>Greige Issued (KG)</th>
                    <th>Liquor Ratio</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {dyeingBatches.map((b: any) => (
                    <tr key={b.id || b.batchNo}>
                      <td><strong>{b.batchNo}</strong></td>
                      <td><strong>{b.jobNo}</strong></td>
                      <td>{b.buyer}</td>
                      <td>{b.color}</td>
                      <td><span className="status-pill neutral">{b.component}</span></td>
                      <td>
                        <span className={`status-pill ${b.route === 'IN-HOUSE' ? 'good' : 'warn'}`}>
                          {b.route}
                        </span>
                      </td>
                      <td><strong>{b.targetMachine}</strong></td>
                      <td><strong style={{ color: '#2563eb' }}>{num(b.greigeIssuedQty)}</strong></td>
                      <td>{b.liquorRatio || '1:6'}</td>
                      <td>
                        <span className={`status-pill ${b.status === 'COMPLETED' || b.status === 'UNLOADED' ? 'good' : b.status === 'DYEING_RUNNING' ? 'warn' : 'neutral'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>{dt(b.date)}</td>
                      <td><small>{b.remarks || '—'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Section 13 Execution Table with Component Separation */}
      {!loading && tab === 'execution' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Greige / Finish Fabric Execution Overview</div>
              <div className="panel-sub">
                Component separation strictly maintained: <strong>Body</strong>, <strong>L Rib</strong>, and <strong>S.Jersey</strong>. Never collapsed into a single lump total.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print / Export</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <input
              style={{ minWidth: 260, padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              placeholder="Search Buyer, Job No, Style No, Color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label style={{ fontSize: 12, fontWeight: 700 }}>Buyer:
              <select value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)} style={{ marginLeft: 6, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <option value="ALL">All Buyers</option>
                {buyerList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          </div>

          <div className="table-scroll">
            <table className="data-table compact-table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  <th colSpan={8} style={{ background: '#f8fafc', borderRight: '2px solid #cbd5e1', textAlign: 'center' }}>Order / Fabric Requirement</th>
                  <th colSpan={4} style={{ background: '#f1f5f9', borderRight: '2px solid #cbd5e1', textAlign: 'center' }}>Requirement By Component (KG)</th>
                  <th colSpan={5} style={{ background: '#f8fafc', borderRight: '2px solid #cbd5e1', textAlign: 'center' }}>Knitting / Grey Received Qty (KG)</th>
                  <th colSpan={4} style={{ background: '#f1f5f9', textAlign: 'center' }}>Dyeing / In-Process Qty (KG)</th>
                </tr>
                <tr>
                  {/* Order/Fabric Req */}
                  <th>Buyer</th>
                  <th>Job No</th>
                  <th>Style No</th>
                  <th>Addl Process</th>
                  <th>GSM</th>
                  <th>Width/Dia</th>
                  <th>Colour</th>
                  <th>Fabric Description</th>

                  {/* Components Req */}
                  <th>Body</th>
                  <th>L Rib</th>
                  <th>S.Jersey</th>
                  <th>Total Require</th>

                  {/* Knitting/Grey */}
                  <th>Knit Start</th>
                  <th>Knit End</th>
                  <th>Grey Body Rcvd</th>
                  <th>Grey Rib Rcvd</th>
                  <th>Grey SJ Rcvd</th>

                  {/* Dyeing/Process */}
                  <th>Dye Date</th>
                  <th>Dyeing Body</th>
                  <th>Dyeing L Rib</th>
                  <th>Total Dyeing</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecution.map((r, i) => (
                  <tr key={`${r.jobNo}-${r.colour}-${i}`}>
                    <td><strong>{r.buyer}</strong></td>
                    <td><strong>{r.jobNo}</strong></td>
                    <td>{r.styleNo}</td>
                    <td><small>{r.additionalProcess || 'None'}</small></td>
                    <td>{r.gsm}</td>
                    <td>{r.widthDia}</td>
                    <td>{r.colour}</td>
                    <td><small>{r.fabricDescription}</small></td>

                    {/* Component Separation */}
                    <td><strong>{num(r.reqBody)}</strong></td>
                    <td><strong>{num(r.reqLRib)}</strong></td>
                    <td><strong>{num(r.reqSJersey)}</strong></td>
                    <td><strong style={{ color: '#2563eb' }}>{num(r.totalRequire)}</strong></td>

                    <td>{dt(r.knitStart)}</td>
                    <td>{dt(r.knitEnd)}</td>
                    <td>{num(r.greyBodyRcvd)}</td>
                    <td>{num(r.greyLRibRcvd)}</td>
                    <td>{num(r.greySJerseyRcvd)}</td>

                    <td>{dt(r.dyeingDate)}</td>
                    <td>{num(r.dyeingBody)}</td>
                    <td>{num(r.dyeingLRib)}</td>
                    <td><strong style={{ color: '#16a34a' }}>{num(r.totalDyeing)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Multiple Process Movement Blocks */}
      {!loading && tab === 'movements' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Multiple Process Movements &amp; History</div>
              <div className="panel-sub">
                Maintains factory-wise movement history across: <strong>Dyeing, AOP, Peach, Brush, Shearing, Singeing, and Finishing</strong>. Not reduced to a single factory text field.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Filter Process:
                <select value={selectedProcess} onChange={(e) => setSelectedProcess(e.target.value)} style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  <option value="ALL">All Processes</option>
                  <option value="Dyeing">Dyeing</option>
                  <option value="AOP">AOP (All-over Print)</option>
                  <option value="Peach">Peach</option>
                  <option value="Brush">Brush</option>
                  <option value="Shearing">Shearing</option>
                  <option value="Singeing">Singeing</option>
                  <option value="Finishing">Finishing</option>
                </select>
              </label>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Process Name</th>
                  <th>Destination Factory</th>
                  <th>Challan / Lot No</th>
                  <th>Color</th>
                  <th>Component</th>
                  <th>Send Date</th>
                  <th>Send Qty (KG)</th>
                  <th>Receive Date</th>
                  <th>Receive Qty (KG)</th>
                  <th>Balance Qty (KG)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m: any, i: number) => (
                  <tr key={`${m.jobNo}-${m.processName}-${i}`}>
                    <td><strong>{m.jobNo}</strong></td>
                    <td><span className="status-pill neutral">{m.processName}</span></td>
                    <td><strong>{m.factory}</strong></td>
                    <td>{m.challanNo || `CH-${1000 + i}`}</td>
                    <td>{m.color}</td>
                    <td><span className="status-pill neutral">{m.component}</span></td>
                    <td>{dt(m.sendDate)}</td>
                    <td>{num(m.sendQty)}</td>
                    <td>{dt(m.receiveDate)}</td>
                    <td>{num(m.receiveQty)}</td>
                    <td><strong style={{ color: Number(m.balanceQty) > 0 ? '#ea580c' : '#16a34a' }}>{num(m.balanceQty)}</strong></td>
                    <td><span className={`status-pill ${m.status === 'COMPLETED' ? 'good' : 'warn'}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Dyeing / Finishing Delivery */}
      {!loading && tab === 'delivery' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Dyeing &amp; Finishing Delivery Tracking</div>
              <div className="panel-sub">
                Component-wise delivery and balance calculation: Body Delivery, L Rib Delivery, S.Jersey Delivery, Total Delivery, Body Balance, L Rib Balance, S.Jersey Balance, Total Balance, Balance %.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table compact-table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Buyer</th>
                  <th>Challan No</th>
                  <th>Slot No</th>
                  <th>Dyeing Start</th>
                  <th>Dyeing End</th>
                  <th>Body Delivery</th>
                  <th>L Rib Delivery</th>
                  <th>S.Jersey Delivery</th>
                  <th>Total Delivery</th>
                  <th>Body Balance</th>
                  <th>L Rib Balance</th>
                  <th>S.Jersey Balance</th>
                  <th>Total Balance</th>
                  <th>Balance %</th>
                  <th>Merchandiser</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(d.deliveryRows || []).map((dl: any, i: number) => (
                  <tr key={`${dl.jobNo}-${dl.challanNo}-${i}`}>
                    <td><strong>{dl.jobNo}</strong></td>
                    <td>{dl.buyer}</td>
                    <td><strong>{dl.challanNo}</strong></td>
                    <td><span className="status-pill neutral">{dl.slotNo || '1st'}</span></td>
                    <td>{dt(dl.dyeingStart)}</td>
                    <td>{dt(dl.dyeingEnd)}</td>
                    <td>{num(dl.bodyDelivery)}</td>
                    <td>{num(dl.lribDelivery)}</td>
                    <td>{num(dl.sjerseyDelivery)}</td>
                    <td><strong style={{ color: '#16a34a' }}>{num(dl.totalDelivery)}</strong></td>
                    <td><strong style={{ color: dl.bodyBalance > 0 ? '#ea580c' : '#16a34a' }}>{num(dl.bodyBalance)}</strong></td>
                    <td><strong style={{ color: dl.lribBalance > 0 ? '#ea580c' : '#16a34a' }}>{num(dl.lribBalance)}</strong></td>
                    <td><strong style={{ color: dl.sjerseyBalance > 0 ? '#ea580c' : '#16a34a' }}>{num(dl.sjerseyBalance)}</strong></td>
                    <td><strong style={{ color: dl.totalBalance > 0 ? '#ea580c' : '#16a34a' }}>{num(dl.totalBalance)}</strong></td>
                    <td><span className={`status-pill ${dl.balancePct > 10 ? 'warn' : 'good'}`}>{dl.balancePct}%</span></td>
                    <td>{dl.merchandiser || '—'}</td>
                    <td><small>{dl.remarks || '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Slot & Buyer Summary */}
      {!loading && tab === 'slot-summary' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Slot-wise &amp; Buyer Summary</div>
              <div className="panel-sub">
                Summary across 1st Slot, 2nd Slot, 3rd Slot, and Month Total for Required Qty, Delivery Qty, and Balance Qty.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Monthly Slot Breakdown</h4>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Required Qty (KG)</th>
                    <th>Delivery Qty (KG)</th>
                    <th>Balance Qty (KG)</th>
                    <th>Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.slotSummary || []).map((slot: any) => {
                    const comp = slot.reqQty > 0 ? Math.round((slot.deliveryQty / slot.reqQty) * 100) : 0;
                    return (
                      <tr key={slot.name}>
                        <td><strong>{slot.name}</strong></td>
                        <td>{num(slot.reqQty)}</td>
                        <td><strong style={{ color: '#16a34a' }}>{num(slot.deliveryQty)}</strong></td>
                        <td><strong style={{ color: slot.balanceQty > 0 ? '#ea580c' : '#16a34a' }}>{num(slot.balanceQty)}</strong></td>
                        <td><span className={`status-pill ${comp >= 90 ? 'good' : 'neutral'}`}>{comp}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Buyer-wise Fabric Position</h4>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Required Qty (KG)</th>
                    <th>Delivered Qty (KG)</th>
                    <th>Balance Qty (KG)</th>
                    <th>Active Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.buyerSummary || []).map((b: any) => (
                    <tr key={b.buyer}>
                      <td><strong>{b.buyer}</strong></td>
                      <td>{num(b.reqQty)}</td>
                      <td><strong style={{ color: '#16a34a' }}>{num(b.deliveredQty)}</strong></td>
                      <td><strong style={{ color: b.balanceQty > 0 ? '#ea580c' : '#16a34a' }}>{num(b.balanceQty)}</strong></td>
                      <td>{b.jobCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Tracking */}
      {!loading && tab === 'tracking' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">End-to-End Job Fabric Tracking</div>
              <div className="panel-sub">
                Tracking: Job No, Fabric Required, Fabric Delivery, Fabric Balance.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Buyer</th>
                  <th>Style No</th>
                  <th>Fabric Required (KG)</th>
                  <th>Fabric Delivery (KG)</th>
                  <th>Fabric Balance (KG)</th>
                  <th>Delivery %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.trackingRows || []).map((t: any) => {
                  const pct = t.reqKg > 0 ? Math.round((t.delKg / t.reqKg) * 100) : 0;
                  return (
                    <tr key={t.jobNo}>
                      <td><strong>{t.jobNo}</strong></td>
                      <td>{t.buyer}</td>
                      <td>{t.styleNo}</td>
                      <td><strong>{num(t.reqKg)}</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>{num(t.delKg)}</strong></td>
                      <td><strong style={{ color: t.balKg > 0 ? '#ea580c' : '#16a34a' }}>{num(t.balKg)}</strong></td>
                      <td><span className={`status-pill ${pct >= 100 ? 'good' : 'neutral'}`}>{pct}%</span></td>
                      <td><span className={`status-pill ${t.status === 'COMPLETE' ? 'good' : 'warn'}`}>{t.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
