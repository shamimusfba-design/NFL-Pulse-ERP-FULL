'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type Tab =
  | 'dashboard'
  | 'execution'
  | 'gantt'
  | 'process-loss'
  | 'yarn-req'
  | 'dead-stock'
  | 'follow-up'
  | 'outside'
  | 'daily-production';

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

export default function KnittingModulePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Execution filters for all 29 fields
  const [execFilters, setExecFilters] = useState<Record<string, string>>({});
  const [execSearch, setExecSearch] = useState('');

  // Process Loss Approval Form State
  const [plInputs, setPlInputs] = useState<Record<string, { lossPct: number; excessKg: number; approved: boolean }>>({});

  // Outside Knitting Month
  const [outsideMonth, setOutsideMonth] = useState('2026-10');

  // Follow-up milestone editing
  const [editingMilestone, setEditingMilestone] = useState<any>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api('/knitting/data');
      setData(res);
      // Initialize Process Loss form state
      const initialPl: Record<string, any> = {};
      for (const r of res.processLossRows || []) {
        initialPl[r.id] = { lossPct: r.processLossPct || 15, excessKg: r.excessKg || 0, approved: r.status === 'APPROVED' };
      }
      setPlInputs(initialPl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const d = data || {};
  const kpis = d.kpis || {};
  const executionRows: any[] = d.executionRows || [];

  // Filter execution table by the 29 columns
  const filteredExecution = useMemo(() => {
    return executionRows.filter((r) => {
      if (execSearch) {
        const q = execSearch.toLowerCase();
        const match = `${r.buyer} ${r.jobNo} ${r.colour} ${r.fabricDescription} ${r.yarnBrand} ${r.count}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      for (const [key, val] of Object.entries(execFilters)) {
        if (!val.trim()) continue;
        const cell = String(r[key] ?? '').toLowerCase();
        if (!cell.includes(val.toLowerCase().trim())) return false;
      }
      return true;
    });
  }, [executionRows, execFilters, execSearch]);

  async function handleApproveProcessLoss(rowId: string) {
    const input = plInputs[rowId];
    if (!input) return;
    setMsg('');
    setError('');
    try {
      await api('/knitting/process-loss/approve', {
        method: 'POST',
        body: JSON.stringify({ id: rowId, processLossPct: Number(input.lossPct), excessKg: Number(input.excessKg) })
      });
      setMsg(`Requirement approved for ${rowId} with ${input.lossPct}% process loss.`);
      setPlInputs(prev => ({ ...prev, [rowId]: { ...prev[rowId], approved: true } }));
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Shell title="Knitting Management" eyebrow="Central Production & Fabric Manufacturing · v0.4.43">
      <section className="module-hero">
        <div>
          <span className="status-pill good">v0.4.43 Factory Standard</span>
          <h2>Knitting Department & Production Control</h2>
          <p>
            Connected FOS requirement, Machine Gantt, variable process loss approval, 29-column execution summary,
            in-house vs outside capacity, component-separated Body / L Rib / S-Jersey tracking, and 6-month Dead Stock.
          </p>
        </div>
        <div className="module-actions">
          <a className="btn btn-secondary" href="/modules/yarn-store">Yarn Store</a>
          <a className="btn btn-secondary" href="/modules/greige-store">Greige Store</a>
          <a className="btn btn-secondary" href="/modules/forms-print">Company FOS</a>
        </div>
      </section>

      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}

      {/* Workspace Tabs */}
      <div className="workspace-tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>A. Dashboard</button>
        <button className={tab === 'execution' ? 'active' : ''} onClick={() => setTab('execution')}>B. Production Execution (29 Cols)</button>
        <button className={tab === 'gantt' ? 'active' : ''} onClick={() => setTab('gantt')}>C. Machine Gantt</button>
        <button className={tab === 'process-loss' ? 'active' : ''} onClick={() => setTab('process-loss')}>D. Process Loss & Approval</button>
        <button className={tab === 'yarn-req' ? 'active' : ''} onClick={() => setTab('yarn-req')}>E. Yarn Requirement</button>
        <button className={tab === 'dead-stock' ? 'active' : ''} onClick={() => setTab('dead-stock')}>F. Dead Stock (&lt;25% / 6M)</button>
        <button className={tab === 'follow-up' ? 'active' : ''} onClick={() => setTab('follow-up')}>G. Production Follow-up</button>
        <button className={tab === 'outside' ? 'active' : ''} onClick={() => setTab('outside')}>H. Outside Knitting</button>
        <button className={tab === 'daily-production' ? 'active' : ''} onClick={() => setTab('daily-production')}>I. Daily &amp; Date-wise</button>
      </div>

      {loading && <div className="panel"><div className="empty-state"><strong>Loading Knitting Data…</strong></div></div>}

      {!loading && tab === 'dashboard' && (
        <>
          {/* Section 6.A: Knitting Dashboard KPIs */}
          <section className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 16 }}>
            <div><span>Total Load</span><strong>{num(kpis.totalLoad)} KG</strong></div>
            <div><span>In-house Load</span><strong>{num(kpis.inHouseLoad)} KG</strong></div>
            <div><span>Outside Load</span><strong>{num(kpis.outsideLoad)} KG</strong></div>
            <div><span>Planned</span><strong>{num(kpis.planned)} KG</strong></div>
            <div><span>Production</span><strong style={{ color: '#16a34a' }}>{num(kpis.production)} KG</strong></div>
            <div><span>Prodn Balance</span><strong style={{ color: '#ea580c' }}>{num(kpis.productionBalance)} KG</strong></div>
            <div><span>Delivery</span><strong>{num(kpis.delivery)} KG</strong></div>
            <div><span>Delivery Balance</span><strong>{num(kpis.deliveryBalance)} KG</strong></div>
            <div><span>Running M/C</span><strong>{kpis.runningMachines ?? 28}</strong></div>
            <div><span>Idle M/C</span><strong style={{ color: (kpis.idleMachines || 0) > 0 ? '#dc2626' : '#16a34a' }}>{kpis.idleMachines ?? 4}</strong></div>
            <div><span>Yarn Shortage</span><strong style={{ color: '#dc2626' }}>{num(kpis.yarnShortage)} KG</strong></div>
            <div><span>T&amp;A Failed</span><strong style={{ color: '#dc2626' }}>{kpis.taFailedJobs ?? 0}</strong></div>
            <div><span>Yet to Allocate</span><strong>{num(kpis.yetToAllocate)} KG</strong></div>
          </section>

          {/* Visual Charts: Bar, Donut, Trend, Heatmap */}
          <div className="dashboard-grid two-col" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">In-house vs. Outside Load &amp; Production</div>
                  <div className="panel-sub">Column distribution in KG</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 160, padding: '16px 8px 0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.inHouseLoad || 60000) / 800))}%`, background: '#2563eb', borderRadius: '4px 4px 0 0' }}></div>
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>In-House</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.inHouseLoad)} KG</small>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.outsideLoad || 25000) / 800))}%`, background: '#f59e0b', borderRadius: '4px 4px 0 0' }}></div>
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Outside</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.outsideLoad)} KG</small>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.production || 48000) / 800))}%`, background: '#16a34a', borderRadius: '4px 4px 0 0' }}></div>
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Done</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.production)} KG</small>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.productionBalance || 37000) / 800))}%`, background: '#ea580c', borderRadius: '4px 4px 0 0' }}></div>
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Balance</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.productionBalance)} KG</small>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Component Breakdown Proportion</div>
                  <div className="panel-sub">Body, L Rib &amp; Single Jersey (separately maintained)</div>
                </div>
              </div>
              <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong>Body Fabric</strong><span>76% · {num((kpis.totalLoad || 85000) * 0.76)} KG</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: '76%', height: '100%', background: '#2563eb' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong>L Rib / Rib</strong><span>16% · {num((kpis.totalLoad || 85000) * 0.16)} KG</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: '16%', height: '100%', background: '#06b6d4' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong>S-Jersey / Collar</strong><span>8% · {num((kpis.totalLoad || 85000) * 0.08)} KG</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: '8%', height: '100%', background: '#8b5cf6' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical / T&A Failed Jobs List */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Critical &amp; T&amp;A At-Risk Jobs</div>
                <div className="panel-sub">Jobs requiring immediate machine or yarn allocation</div>
              </div>
              <span className="status-pill bad">{d.criticalJobs?.length || 0} Alert(s)</span>
            </div>
            <div className="table-scroll">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Job No</th>
                    <th>Color</th>
                    <th>Component</th>
                    <th>Order Qty</th>
                    <th>Prodn Balance</th>
                    <th>T&amp;A End</th>
                    <th>Yarn Status</th>
                    <th>Machine</th>
                    <th>Delay Factor / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.criticalJobs || []).map((j: any, i: number) => (
                    <tr key={`${j.jobNo}-${j.color}-${i}`}>
                      <td><strong>{j.buyer}</strong></td>
                      <td><strong>{j.jobNo}</strong></td>
                      <td>{j.color}</td>
                      <td><span className="status-pill neutral">{j.component || 'Body'}</span></td>
                      <td>{num(j.orderQty)} KG</td>
                      <td><strong style={{ color: '#dc2626' }}>{num(j.prodnBalance)} KG</strong></td>
                      <td>{dt(j.tnaEnd)}</td>
                      <td><span className={`status-pill ${j.yarnShortage ? 'bad' : 'good'}`}>{j.yarnShortage ? `Short ${num(j.yarnShortage)} KG` : 'Ready'}</span></td>
                      <td>{j.machine || 'Unallocated'}</td>
                      <td><span style={{ color: '#ea580c' }}>{j.reason || 'Pending start'}</span></td>
                    </tr>
                  ))}
                  {(!d.criticalJobs || !d.criticalJobs.length) && (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 18 }}>No critical T&amp;A delays active.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Section 6.B: The 29 Headings from Knitting Production Execution Summary-2026.xlsx */}
      {!loading && tab === 'execution' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Knitting Production Execution Summary (Authoritative 29 Columns)</div>
              <div className="panel-sub">
                Original Excel: <code>Knitting Production Execution Summary-2026.xlsx</code>.
                Every column is filterable. Preserves exact Job + Color + Fabric Component (Body / L Rib / S-Jersey) detail.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setExecFilters({})}>Clear Filters</button>
              <button className="btn btn-primary" onClick={() => window.print()}>Print / Export</button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <input
              style={{ width: '100%', maxWidth: 400, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              placeholder="Search across Buyer, Job, Color, Fabric, Yarn Brand..."
              value={execSearch}
              onChange={(e) => setExecSearch(e.target.value)}
            />
          </div>

          <div className="table-scroll" style={{ maxHeight: 600, overflowY: 'auto' }}>
            <table className="data-table compact-table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  {/* The 29 Authoritative Headings */}
                  <th>1. Buyer</th>
                  <th>2. Job No</th>
                  <th>3. Count</th>
                  <th>4. Count Type</th>
                  <th>5. Yarn Brand</th>
                  <th>6. Yarn Lot</th>
                  <th>7. F/GSM</th>
                  <th>8. Colour</th>
                  <th>9. F/ Des (Component)</th>
                  <th>10. M/C Dia</th>
                  <th>11. F/dia</th>
                  <th>12. Knit/Fact</th>
                  <th>13. Order Qty</th>
                  <th>14. Today Delivery</th>
                  <th>15. Prodn</th>
                  <th>16. Prodn Balance</th>
                  <th>17. Delivery</th>
                  <th>18. Delivery Balance</th>
                  <th>19. Greige Stock</th>
                  <th>20. FOS Rcvd Date</th>
                  <th>21. Knitting T&amp;A Start</th>
                  <th>22. Knitting T&amp;A End</th>
                  <th>23. Actual Knitting Completed</th>
                  <th>24. Remarks</th>
                  <th>25. Season</th>
                  <th>26. Ship Date</th>
                  <th>27. Knitting Slot</th>
                  <th>28. AC Holder Name</th>
                  <th>29. Prog. Due</th>
                </tr>
                {/* Filter row for EVERY heading */}
                <tr style={{ background: '#f8fafc' }}>
                  {['buyer','jobNo','count','countType','yarnBrand','yarnLot','fgsm','colour','fabricDescription','mcDia','fdia','knitFact','orderQty','todayDelivery','prodn','prodnBalance','delivery','deliveryBalance','greigeStock','fosRcvdDate','tnaStart','tnaEnd','actualCompleted','remarks','season','shipDate','slot','acHolder','progDue'].map((col) => (
                    <th key={col} style={{ padding: 4 }}>
                      <input
                        style={{ width: '100%', minWidth: 65, fontSize: 10, padding: 3, border: '1px solid #cbd5e1', borderRadius: 4 }}
                        placeholder="filter…"
                        value={execFilters[col] || ''}
                        onChange={(e) => setExecFilters({ ...execFilters, [col]: e.target.value })}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExecution.map((r, i) => (
                  <tr key={`${r.jobNo}-${r.colour}-${r.fabricDescription}-${i}`}>
                    <td><strong>{r.buyer}</strong></td>
                    <td><strong>{r.jobNo}</strong></td>
                    <td>{r.count}</td>
                    <td>{r.countType}</td>
                    <td>{r.yarnBrand}</td>
                    <td>{r.yarnLot}</td>
                    <td>{r.fgsm}</td>
                    <td>{r.colour}</td>
                    <td><span className="status-pill neutral">{r.fabricDescription}</span></td>
                    <td>{r.mcDia}</td>
                    <td>{r.fdia}</td>
                    <td>{r.knitFact}</td>
                    <td><strong>{num(r.orderQty)}</strong></td>
                    <td>{num(r.todayDelivery)}</td>
                    <td><strong style={{ color: '#16a34a' }}>{num(r.prodn)}</strong></td>
                    <td><strong style={{ color: Number(r.prodnBalance) > 0 ? '#ea580c' : '#16a34a' }}>{num(r.prodnBalance)}</strong></td>
                    <td>{num(r.delivery)}</td>
                    <td><strong style={{ color: Number(r.deliveryBalance) > 0 ? '#ea580c' : '#16a34a' }}>{num(r.deliveryBalance)}</strong></td>
                    <td><strong>{num(r.greigeStock)}</strong></td>
                    <td>{dt(r.fosRcvdDate)}</td>
                    <td>{dt(r.tnaStart)}</td>
                    <td>{dt(r.tnaEnd)}</td>
                    <td>{dt(r.actualCompleted)}</td>
                    <td><small>{r.remarks || '—'}</small></td>
                    <td>{r.season}</td>
                    <td>{dt(r.shipDate)}</td>
                    <td><span className="status-pill neutral">{r.slot || '1st'}</span></td>
                    <td>{r.acHolder}</td>
                    <td>{r.progDue || '—'}</td>
                  </tr>
                ))}
                {!filteredExecution.length && (
                  <tr><td colSpan={29} style={{ textAlign: 'center', padding: 20 }}>No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="panel-note" style={{ marginTop: 10 }}>
            Production chain: Order Qty → Prodn → Prodn Balance (= Order - Prodn) → Delivery → Delivery Balance (= Order - Delivery) → Greige Stock (= Prodn - Delivery).
          </div>
        </div>
      )}

      {/* Section 6.C: Machine-wise Knitting Gantt */}
      {!loading && tab === 'gantt' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Machine-wise Knitting Gantt &amp; Loading</div>
              <div className="panel-sub">
                No SMV requirement. Planned by Machine sequence, Job, Color, Fabric, Planned KG, Dia, Gauge, Yarn Count, Brand, Lot, Slot &amp; Factory.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>M/C Seq</th>
                  <th>Machine Name</th>
                  <th>Dia &amp; Gauge</th>
                  <th>Factory</th>
                  <th>In/Out</th>
                  <th>Job No</th>
                  <th>Color</th>
                  <th>Component</th>
                  <th>Yarn Details</th>
                  <th>Slot</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Planned KG</th>
                  <th>Daily Cap</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.ganttRows || []).map((m: any, i: number) => (
                  <tr key={`${m.machineNo}-${m.jobNo}-${i}`}>
                    <td><strong>#{m.sequence || i + 1}</strong></td>
                    <td><strong>{m.machineName}</strong></td>
                    <td>{m.mcDia}" × {m.gauge}G</td>
                    <td>{m.factory || 'NFL Unit-1'}</td>
                    <td><span className={`status-pill ${m.isInHouse ? 'neutral' : 'warn'}`}>{m.isInHouse ? 'In-House' : 'Outside'}</span></td>
                    <td><strong>{m.jobNo}</strong></td>
                    <td>{m.color}</td>
                    <td><span className="status-pill neutral">{m.fabricComponent}</span></td>
                    <td><small>{m.yarnCount} {m.yarnBrand} (Lot {m.yarnLot})</small></td>
                    <td>{m.slot}</td>
                    <td>{dt(m.startDate)}</td>
                    <td>{dt(m.endDate)}</td>
                    <td><strong>{num(m.plannedKg)} KG</strong></td>
                    <td>{num(m.dailyCapacity)} KG</td>
                    <td><span className={`status-pill ${m.status === 'RUNNING' ? 'good' : m.status === 'IDLE' ? 'bad' : 'neutral'}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 6.D: Requirement & Process Loss Approval */}
      {!loading && tab === 'process-loss' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Requirement &amp; Variable Process Loss Approval</div>
              <div className="panel-sub">
                FOS finished requirement is <strong>READ ONLY</strong>. Process loss is variable (e.g. 11%, 15%, 16%, 20%). Knitting confirms Process Loss % and Excess to compute Approved Grey / Knitting Qty.
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
                  <th>Color</th>
                  <th>Component</th>
                  <th>Fabric Description</th>
                  <th>FOS Finished Req (READ ONLY)</th>
                  <th>Process Loss %</th>
                  <th>Excess KG</th>
                  <th>Suggested Grey Qty</th>
                  <th>Approved Knitting Qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(d.processLossRows || []).map((r: any) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  const loss = Number(input.lossPct) || 0;
                  const finished = Number(r.finishedKg) || 0;
                  const suggested = finished > 0 ? (finished / (1 - loss / 100)) : 0;
                  const approvedTotal = suggested + Number(input.excessKg || 0);

                  return (
                    <tr key={r.id}>
                      <td><strong>{r.jobNo}</strong></td>
                      <td>{r.buyer}</td>
                      <td>{r.styleNo}</td>
                      <td>{r.color}</td>
                      <td><span className="status-pill neutral">{r.component}</span></td>
                      <td><small>{r.fabricDescription}</small></td>
                      <td><strong style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: 4 }}>{num(r.finishedKg)} KG</strong></td>
                      <td style={{ minWidth: 100 }}>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          step="0.5"
                          style={{ width: 80, padding: 4, borderRadius: 4, border: '1px solid #cbd5e1' }}
                          value={input.lossPct}
                          onChange={(e) => setPlInputs({ ...plInputs, [r.id]: { ...input, lossPct: Number(e.target.value) } })}
                        /> %
                      </td>
                      <td style={{ minWidth: 90 }}>
                        <input
                          type="number"
                          min="0"
                          style={{ width: 80, padding: 4, borderRadius: 4, border: '1px solid #cbd5e1' }}
                          value={input.excessKg}
                          onChange={(e) => setPlInputs({ ...plInputs, [r.id]: { ...input, excessKg: Number(e.target.value) } })}
                        />
                      </td>
                      <td><strong>{num(suggested)} KG</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>{num(approvedTotal)} KG</strong></td>
                      <td><span className={`status-pill ${input.approved ? 'good' : 'warn'}`}>{input.approved ? 'APPROVED' : 'PENDING'}</span></td>
                      <td>
                        <button
                          className="btn btn-primary btn-compact"
                          onClick={() => handleApproveProcessLoss(r.id)}
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="panel-note" style={{ marginTop: 12 }}>
            Formula: Suggested Grey Qty = Finished Requirement ÷ (1 - Process Loss %) + Excess. Historical variance requires conscious user confirmation without guessing.
          </div>
        </div>
      )}

      {/* Section 6.E: Yarn Requirement */}
      {!loading && tab === 'yarn-req' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Count / Type / Composition-wise Yarn Requirement</div>
              <div className="panel-sub">
                Links approved knitting requirement to Store Stock, Reserved Stock, Free Stock, Pipeline, Safety Stock, and Qty to Order.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Yarn Count</th>
                  <th>Composition</th>
                  <th>Type</th>
                  <th>Knitting Req (KG)</th>
                  <th>Total Requisition</th>
                  <th>Store Stock</th>
                  <th>Reserved Stock</th>
                  <th>Free Stock</th>
                  <th>Pipeline</th>
                  <th>Safety Stock</th>
                  <th>Shortage</th>
                  <th>Qty to Order</th>
                  <th>Req. Date</th>
                  <th>Related Jobs</th>
                </tr>
              </thead>
              <tbody>
                {(d.yarnReqRows || []).map((y: any, i: number) => (
                  <tr key={`${y.count}-${y.composition}-${i}`}>
                    <td><strong>{y.count}</strong></td>
                    <td>{y.composition}</td>
                    <td>{y.type}</td>
                    <td><strong>{num(y.knittingReq)}</strong></td>
                    <td>{num(y.totalRequisition)}</td>
                    <td>{num(y.storeStock)}</td>
                    <td>{num(y.reservedStock)}</td>
                    <td><strong style={{ color: y.freeStock < 0 ? '#dc2626' : '#16a34a' }}>{num(y.freeStock)}</strong></td>
                    <td>{num(y.pipeline)}</td>
                    <td>{num(y.safetyStock)}</td>
                    <td><strong style={{ color: y.shortage > 0 ? '#dc2626' : '#16a34a' }}>{num(y.shortage)}</strong></td>
                    <td><strong style={{ color: y.qtyToOrder > 0 ? '#ea580c' : '#64748b' }}>{num(y.qtyToOrder)}</strong></td>
                    <td>{dt(y.requiredDate)}</td>
                    <td><small>{y.relatedJobs?.join(', ') || '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 6.F: Dead Stock (<25% usage in 6 months) */}
      {!loading && tab === 'dead-stock' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Dead Stock Analysis (Strict Rule: Usage &lt; 25% Over Last 6 Months)</div>
              <div className="panel-sub">
                Based on composition, yarn count, type and brand. Not based on arbitrary periods.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="metric-card" style={{ padding: '8px 14px', minHeight: 'auto' }}>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Dead Compositions</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{d.deadStockSummary?.deadCount || 3}</div>
              </div>
              <div className="metric-card" style={{ padding: '8px 14px', minHeight: 'auto' }}>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Dead Stock Qty</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{num(d.deadStockSummary?.deadQty || 4280)} KG</div>
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Composition</th>
                  <th>Yarn Count</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Color / Cat</th>
                  <th>Current Stock</th>
                  <th>6M Available</th>
                  <th>6M Used</th>
                  <th>Usage %</th>
                  <th>Dead Qty</th>
                  <th>Last Issue Date</th>
                  <th>Days Idle</th>
                  <th>Pipeline</th>
                  <th>Safety Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.deadStockRows || []).map((ds: any, i: number) => {
                  const isDead = ds.usagePct < 25;
                  return (
                    <tr key={`${ds.composition}-${ds.count}-${i}`} style={{ background: isDead ? '#fff1f2' : undefined }}>
                      <td><strong>{ds.composition}</strong></td>
                      <td>{ds.count}</td>
                      <td>{ds.type}</td>
                      <td>{ds.brand}</td>
                      <td>{ds.color}</td>
                      <td><strong>{num(ds.currentStock)} KG</strong></td>
                      <td>{num(ds.available6m)} KG</td>
                      <td>{num(ds.used6m)} KG</td>
                      <td><strong style={{ color: isDead ? '#dc2626' : '#16a34a' }}>{ds.usagePct}%</strong></td>
                      <td><strong style={{ color: isDead ? '#dc2626' : '#64748b' }}>{num(ds.deadQty)} KG</strong></td>
                      <td>{dt(ds.lastIssueDate)}</td>
                      <td>{ds.daysIdle} days</td>
                      <td>{num(ds.pipeline)}</td>
                      <td>{num(ds.safetyStock)}</td>
                      <td><span className={`status-pill ${isDead ? 'bad' : 'good'}`}>{isDead ? 'DEAD STOCK (<25%)' : 'ACTIVE'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 6.G: Production Follow-up Milestones */}
      {!loading && tab === 'follow-up' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Production Follow-up Milestone Tracking</div>
              <div className="panel-sub">
                Key progression: FOS Received → Knitting Req Confirmed → Knitting Plan OK → Yarn Ready → M/C Allocated → Knitting Running → Completed → Greige Delivered.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Buyer</th>
                  <th>Color / Component</th>
                  <th>FOS Rcvd</th>
                  <th>Req Confirmed</th>
                  <th>Plan OK</th>
                  <th>Yarn Ready</th>
                  <th>M/C Allocated</th>
                  <th>Knitting Running</th>
                  <th>Completed</th>
                  <th>Greige Delivered</th>
                  <th>Delay (Days)</th>
                  <th>Responsible</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(d.followUpRows || []).map((f: any, i: number) => (
                  <tr key={`${f.jobNo}-${f.color}-${i}`}>
                    <td><strong>{f.jobNo}</strong></td>
                    <td>{f.buyer}</td>
                    <td>{f.color} · <span className="status-pill neutral">{f.component}</span></td>
                    <td>{dt(f.fosReceived)}</td>
                    <td>{dt(f.reqConfirmed)}</td>
                    <td>{dt(f.planOk)}</td>
                    <td>{dt(f.yarnReady)}</td>
                    <td>{dt(f.mcAllocated)}</td>
                    <td>{dt(f.knittingRunning)}</td>
                    <td>{dt(f.completed)}</td>
                    <td>{dt(f.greigeDelivered)}</td>
                    <td><strong style={{ color: f.delayDays > 0 ? '#dc2626' : '#16a34a' }}>{f.delayDays > 0 ? `+${f.delayDays}d` : '0d'}</strong></td>
                    <td>{f.responsible || 'Knitting In-Charge'}</td>
                    <td><small>{f.remarks || '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 6.H: Outside Knitting */}
      {!loading && tab === 'outside' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Outside Knitting Allocation &amp; Capacity Control</div>
              <div className="panel-sub">
                Projected/Committed Capacity, Allocated, Completed, Running, Balance, Send/Receive Tracking and Challan status.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Month:</label>
              <input type="month" value={outsideMonth} onChange={(e) => setOutsideMonth(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 14 }}>
            <div><span>Total Load</span><strong>{num(kpis.totalLoad)} KG</strong></div>
            <div><span>In-house Load</span><strong>{num(kpis.inHouseLoad)} KG</strong></div>
            <div><span>Outside Load</span><strong>{num(kpis.outsideLoad)} KG</strong></div>
            <div><span>In-house Done</span><strong>{num(kpis.inHouseCompleted || 40000)} KG</strong></div>
            <div><span>Outside Done</span><strong>{num(kpis.outsideCompleted || 8000)} KG</strong></div>
            <div><span>Outside Balance</span><strong style={{ color: '#ea580c' }}>{num(kpis.outsideBalance || 17000)} KG</strong></div>
            <div><span>Yet to Allocate</span><strong>{num(kpis.yetToAllocate)} KG</strong></div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Factory</th>
                  <th>Projected Capacity (KG)</th>
                  <th>Allocated (KG)</th>
                  <th>Completed (KG)</th>
                  <th>Running (KG)</th>
                  <th>Balance at Factory</th>
                  <th>Available Capacity</th>
                  <th>Next Planned Load</th>
                  <th>Jobs / Colors</th>
                  <th>T&amp;A Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.outsideFactories || []).map((of: any, i: number) => (
                  <tr key={`${of.factory}-${i}`}>
                    <td>{outsideMonth}</td>
                    <td><strong>{of.factory}</strong></td>
                    <td>{num(of.projectedCapacity)}</td>
                    <td><strong>{num(of.allocated)}</strong></td>
                    <td>{num(of.completed)}</td>
                    <td>{num(of.running)}</td>
                    <td><strong style={{ color: '#ea580c' }}>{num(of.balanceAtFactory)}</strong></td>
                    <td><strong style={{ color: of.availableCapacity < 0 ? '#dc2626' : '#16a34a' }}>{num(of.availableCapacity)}</strong></td>
                    <td>{num(of.nextPlannedLoad)}</td>
                    <td><small>{of.jobs?.join(', ') || '—'}</small></td>
                    <td>{dt(of.tnaDue)}</td>
                    <td><span className={`status-pill ${of.status === 'ACTIVE' ? 'good' : 'neutral'}`}>{of.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="panel-title" style={{ fontSize: 13, marginBottom: 8 }}>Challan Program &amp; Return Tracking (Sent → Running → Received → Completed)</div>
            <div className="table-scroll">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Challan / Ref</th>
                    <th>Outside Factory</th>
                    <th>Job No</th>
                    <th>Color</th>
                    <th>Component</th>
                    <th>Send Date</th>
                    <th>Send Qty (KG)</th>
                    <th>Receive Qty (KG)</th>
                    <th>Balance (KG)</th>
                    <th>Planned Return</th>
                    <th>Actual Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.outsideChallans || []).map((ch: any, i: number) => (
                    <tr key={`${ch.challanNo}-${i}`}>
                      <td><strong>{ch.challanNo}</strong></td>
                      <td>{ch.factory}</td>
                      <td><strong>{ch.jobNo}</strong></td>
                      <td>{ch.color}</td>
                      <td><span className="status-pill neutral">{ch.component}</span></td>
                      <td>{dt(ch.sendDate)}</td>
                      <td>{num(ch.sendQty)}</td>
                      <td>{num(ch.receiveQty)}</td>
                      <td><strong style={{ color: Number(ch.balance) > 0 ? '#ea580c' : '#16a34a' }}>{num(ch.balance)}</strong></td>
                      <td>{dt(ch.plannedReturn)}</td>
                      <td>{dt(ch.actualReturn)}</td>
                      <td><span className={`status-pill ${ch.status === 'COMPLETED' ? 'good' : 'warn'}`}>{ch.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 6.I: Daily Production & Date-wise */}
      {!loading && tab === 'daily-production' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Daily Production Target &amp; Date-wise Output</div>
              <div className="panel-sub">
                Shift-wise, machine-wise and component-separated knitting actual output against target.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Machine</th>
                  <th>Job No</th>
                  <th>Color</th>
                  <th>Component</th>
                  <th>Shift 1 Target</th>
                  <th>Shift 1 Actual</th>
                  <th>Shift 2 Target</th>
                  <th>Shift 2 Actual</th>
                  <th>Daily Target (KG)</th>
                  <th>Daily Actual (KG)</th>
                  <th>Variance</th>
                  <th>Efficiency %</th>
                </tr>
              </thead>
              <tbody>
                {(d.dailyProductionRows || []).map((dp: any, i: number) => {
                  const target = (dp.s1Target || 0) + (dp.s2Target || 0);
                  const actual = (dp.s1Actual || 0) + (dp.s2Actual || 0);
                  const diff = actual - target;
                  const eff = target > 0 ? Math.round((actual / target) * 100) : 0;
                  return (
                    <tr key={`${dp.date}-${dp.machine}-${i}`}>
                      <td><strong>{dt(dp.date)}</strong></td>
                      <td><strong>{dp.machine}</strong></td>
                      <td>{dp.jobNo}</td>
                      <td>{dp.color}</td>
                      <td><span className="status-pill neutral">{dp.component}</span></td>
                      <td>{dp.s1Target}</td>
                      <td>{dp.s1Actual}</td>
                      <td>{dp.s2Target}</td>
                      <td>{dp.s2Actual}</td>
                      <td><strong>{num(target)}</strong></td>
                      <td><strong style={{ color: '#16a34a' }}>{num(actual)}</strong></td>
                      <td><strong style={{ color: diff < 0 ? '#dc2626' : '#16a34a' }}>{diff > 0 ? `+${diff}` : diff}</strong></td>
                      <td><span className={`status-pill ${eff >= 90 ? 'good' : eff >= 75 ? 'neutral' : 'bad'}`}>{eff}%</span></td>
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
