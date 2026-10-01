'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';

type DyeingTab = 'machine-plan' | 'subcontract' | 'multi-process' | 'finishing-delivery' | 'component-balance';

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

export default function DyeingProductionPage() {
  const [tab, setTab] = useState<DyeingTab>('machine-plan');
  const [selectedProcessFilter, setSelectedProcessFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const factoryData: any = factoryDataRaw;
  const initialMachines = factoryData.machines || [];
  const initialSubcontractors = factoryData.subContractors || [];
  const initialBatches = factoryData.dyeingBatches || [];
  const initialProcesses = factoryData.processMovements || [];
  const initialDeliveries = factoryData.deliveryRows || [];
  const initialExecution = factoryData.executionRows || [];

  // Batch creation form
  const [batchForm, setBatchForm] = useState({
    jobNo: initialExecution[0]?.jobNo || '48085',
    buyer: initialExecution[0]?.buyer || 'BS-NMT',
    color: initialExecution[0]?.colour || 'Nosegay (Lurex)',
    component: 'Body',
    route: 'IN-HOUSE',
    targetMachine: 'WINCH M/C (1050 kg - DILMENLER)',
    plannedQty: initialExecution[0]?.reqBody || 450,
    liquorRatio: '1:6',
    recipeNo: 'REC-48085-BLK',
    remarks: 'HTHP Winch Dyeing'
  });

  const [batches, setBatches] = useState<any[]>(initialBatches);
  const [subcontracts, setSubcontracts] = useState<any[]>(initialSubcontractors);
  const [processes, setProcesses] = useState<any[]>(initialProcesses);
  const [deliveries] = useState<any[]>(initialDeliveries);

  function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    const batchNo = batchForm.route === 'IN-HOUSE' 
      ? `BT-${batchForm.jobNo}-${String(batches.length + 1).padStart(2, '0')}`
      : `SWO-${batchForm.jobNo}-${String(batches.length + 1).padStart(2, '0')}`;

    const newRow = {
      batchNo,
      jobNo: batchForm.jobNo,
      buyer: batchForm.buyer,
      styleNo: '13251506',
      color: batchForm.color,
      component: batchForm.component,
      targetMachine: batchForm.targetMachine,
      route: batchForm.route,
      greigeIssuedQty: Number(batchForm.plannedQty),
      outputQty: 0,
      rft: 'PLANNED',
      status: batchForm.route === 'IN-HOUSE' ? 'ISSUED_TO_DYEING' : 'SENT_TO_MILL',
      date: new Date().toISOString().slice(0, 10),
      remarks: batchForm.remarks
    };

    setBatches(prev => [newRow, ...prev]);

    setMsg(`✓ ${batchNo} created! Greige issued from Greige Store to ${batchForm.targetMachine}.`);
    setTimeout(() => setMsg(''), 6000);
  }

  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      if (selectedProcessFilter !== 'ALL' && p.processName !== selectedProcessFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return `${p.jobNo} ${p.processName} ${p.factory} ${p.color} ${p.component}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [processes, selectedProcessFilter, search]);

  return (
    <Shell title="Dyeing Production & Planning" eyebrow="Northern Fashion Ltd. · Daily Machine Planning, Subcontracting & Multi-Process Execution">
      <section className="module-hero">
        <div>
          <span className="status-pill good">Northern Fashion Ltd. Dyeing Floor</span>
          <h2>Dyeing Production, Machine Allocation &amp; Multi-Process Control</h2>
          <p>
            Connected factory flow: Greige Store issue matching <strong>Daily Machine Plan</strong> (22 in-house winches &amp; finishing lines) → 
            <strong>Subcontract WO dispatch</strong> (15+ external mills) → Multi-Process movements (<strong>AOP, Peach, Brush, Shearing, Singeing</strong>) → 
            Finishing &amp; Delivery to Finished Fabric Store.
          </p>
        </div>
        <div className="module-actions">
          <a className="btn btn-secondary" href="/modules/greige-store">Greige Fabric Store</a>
          <a className="btn btn-secondary" href="/modules/knitting">Knitting Module</a>
          <a className="btn btn-secondary" href="/modules/forms-print">Company FOS</a>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 16 }}>
        <div><span>Total Capacity</span><strong style={{ color: '#2563eb' }}>18,500 KG/d</strong></div>
        <div><span>In-House Winches</span><strong>22 Machines</strong></div>
        <div><span>Subcontract Mills</span><strong>{subcontracts.length} Factories</strong></div>
        <div><span>In Multi-Process</span><strong style={{ color: '#d97706' }}>41,800 KG</strong></div>
        <div><span>RFT Efficiency</span><strong style={{ color: '#16a34a' }}>98.4%</strong></div>
        <div><span>Delivered to Store</span><strong style={{ color: '#16a34a' }}>119,850 KG</strong></div>
        <div><span>Delivery Balance</span><strong style={{ color: '#ea580c' }}>66,550 KG</strong></div>
      </section>

      {/* Tabs */}
      <div className="workspace-tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'machine-plan' ? 'active' : ''} onClick={() => setTab('machine-plan')}>1. Daily Machine Plan &amp; Batching</button>
        <button className={tab === 'subcontract' ? 'active' : ''} onClick={() => setTab('subcontract')}>2. Subcontract Dyeing &amp; Mill Directory</button>
        <button className={tab === 'multi-process' ? 'active' : ''} onClick={() => setTab('multi-process')}>3. Multi-Process (AOP/Peach/Brush/Shearing)</button>
        <button className={tab === 'finishing-delivery' ? 'active' : ''} onClick={() => setTab('finishing-delivery')}>4. Finishing &amp; Finished Store Delivery</button>
        <button className={tab === 'component-balance' ? 'active' : ''} onClick={() => setTab('component-balance')}>5. Component Balance (Body vs Rib)</button>
      </div>

      {msg && <div className="notice" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', marginBottom: 12 }}>{msg}</div>}

      {/* Tab 1: Machine Plan & Batching */}
      {tab === 'machine-plan' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Northern Fashion Ltd In-House Machine Profile */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Northern Fashion Ltd. — Dyeing Floor Machine Profile</div>
                <div className="panel-sub">Plot # 16-18, Dakhin Panishail, Kashimpur, Gazipur · HTHP Winch &amp; Finishing Fleet</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {initialMachines.slice(0, 12).map((m: any) => (
                <div key={m.id} style={{ padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 12 }}>{m.type}</strong>
                    <span className="status-pill good">{m.capacity}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    <div><strong>Brand:</strong> {m.brand} ({m.origin})</div>
                    <div><strong>Qty:</strong> {m.noOfMc} Machine{m.noOfMc > 1 ? 's' : ''} · {m.remarks}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Batch & Issue from Greige Store */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: 16 }}>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Create Dyeing Batch / Assign Work Order</div>
                  <div className="panel-sub">Select staged Greige rolls and issue directly to Dyeing floor or outside mill</div>
                </div>
              </div>

              <form onSubmit={handleCreateBatch} style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Job No</label>
                    <select
                      value={batchForm.jobNo}
                      onChange={e => {
                        const j = e.target.value;
                        const match = initialExecution.find((r: any) => r.jobNo === j);
                        setBatchForm(p => ({
                          ...p,
                          jobNo: j,
                          buyer: match?.buyer || p.buyer,
                          color: match?.colour || p.color,
                          plannedQty: match?.reqBody || 500
                        }));
                      }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      {initialExecution.slice(0, 15).map((r: any) => (
                        <option key={r.jobNo} value={r.jobNo}>Job {r.jobNo} ({r.buyer} - {r.colour})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Component</label>
                    <select
                      value={batchForm.component}
                      onChange={e => setBatchForm(p => ({ ...p, component: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="Body">Body (Main Fabric)</option>
                      <option value="L Rib">L Rib (Separate Line)</option>
                      <option value="S.Jersey">S.Jersey Neckband (Separate Line)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Route</label>
                    <select
                      value={batchForm.route}
                      onChange={e => {
                        const r = e.target.value;
                        setBatchForm(p => ({
                          ...p,
                          route: r,
                          targetMachine: r === 'IN-HOUSE' ? 'WINCH M/C (1050 kg - DILMENLER)' : 'Giant Textile Ltd.'
                        }));
                      }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="IN-HOUSE">In-House Winch (Northern Fashion Ltd.)</option>
                      <option value="SUBCONTRACT">Subcontract Outside Mill</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      {batchForm.route === 'IN-HOUSE' ? 'Machine Nozzle Slot' : 'Subcontract Mill'}
                    </label>
                    <select
                      value={batchForm.targetMachine}
                      onChange={e => setBatchForm(p => ({ ...p, targetMachine: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      {batchForm.route === 'IN-HOUSE' ? (
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
                          {subcontracts.filter((s: any) => s.category === 'Dyeing').map((s: any) => (
                            <option key={s.factory} value={s.factory}>{s.factory} ({s.buyers})</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Batch Quantity (KG)</label>
                    <input
                      type="number"
                      value={batchForm.plannedQty}
                      onChange={e => setBatchForm(p => ({ ...p, plannedQty: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Color / Shade</label>
                    <input
                      type="text"
                      value={batchForm.color}
                      onChange={e => setBatchForm(p => ({ ...p, color: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Remarks / Special Finish Handover</label>
                  <input
                    type="text"
                    value={batchForm.remarks}
                    onChange={e => setBatchForm(p => ({ ...p, remarks: e.target.value }))}
                    placeholder="e.g. Tone match with Rib; Proceed to AOP / Peach after dyeing..."
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="submit" className="btn btn-primary">
                    {batchForm.route === 'IN-HOUSE' ? '✓ Create Batch & Issue Greige' : '✓ Issue Subcontract WO & Challan'}
                  </button>
                </div>
              </form>
            </div>

            {/* Active Batch List */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Active Dyeing Batches &amp; Execution Queue</div>
                  <div className="panel-sub">Real-time status of loaded, running, and unloaded batches</div>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch No</th>
                      <th>Job No</th>
                      <th>Buyer</th>
                      <th>Color</th>
                      <th>Machine / Mill</th>
                      <th>Issued Qty (KG)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.slice(0, 12).map((b: any, i: number) => (
                      <tr key={b.batchNo || i}>
                        <td><strong>{b.batchNo}</strong></td>
                        <td>{b.jobNo}</td>
                        <td>{b.buyer}</td>
                        <td>{b.color}</td>
                        <td><small>{b.targetMachine || b.machine}</small></td>
                        <td><strong>{num(b.greigeIssuedQty || b.greigeQty)}</strong></td>
                        <td>
                          <span className={`status-pill ${b.status === 'COMPLETED' ? 'good' : b.status === 'RUNNING' || b.status === 'DYEING_RUNNING' ? 'warn' : 'neutral'}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Subcontract Directory */}
      {tab === 'subcontract' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Approved Subcontract Mills &amp; Responsible Personnel Directory</div>
              <div className="panel-sub">
                Official Northern Fashion Ltd. subcontract matrix categorized by Dyeing, Finishing, Peach/Brush, and Allover Print.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Factory Name</th>
                  <th>Designated Buyers</th>
                  <th>Supervisors &amp; QC Contacts</th>
                  <th>Department Manager / Leads</th>
                </tr>
              </thead>
              <tbody>
                {subcontracts.map((s: any) => (
                  <tr key={s.id || s.factory}>
                    <td><span className="status-pill neutral">{s.category}</span></td>
                    <td><strong>{s.factory}</strong></td>
                    <td>{s.buyers || 'All Buyers'}</td>
                    <td><small>{s.contact || '—'}</small></td>
                    <td><small><strong>{s.leadPerson || '—'}</strong></small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Multi-Process Movements */}
      {tab === 'multi-process' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Multi-Process Handover: AOP, Peach, Brush, Shearing, Singeing</div>
              <div className="panel-sub">
                Post-dyeing specialized processes tracked by vendor, challan, process loss %, and balance return.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                placeholder="Search Process, Job, Mill..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                value={selectedProcessFilter}
                onChange={e => setSelectedProcessFilter(e.target.value)}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Processes</option>
                <option value="AOP">AOP (All-over Print)</option>
                <option value="Peach">Peach Finish</option>
                <option value="Brush">Brushing</option>
                <option value="Shearing">Shearing</option>
                <option value="Singeing">Singeing</option>
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Process</th>
                  <th>Factory / Mill</th>
                  <th>Challan No</th>
                  <th>Color</th>
                  <th>Send Date</th>
                  <th>Send Qty (KG)</th>
                  <th>Receive Date</th>
                  <th>Received Qty (KG)</th>
                  <th>Balance Qty (KG)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((p: any, i: number) => (
                  <tr key={`${p.jobNo}-${p.processName}-${i}`}>
                    <td><strong>{p.jobNo}</strong></td>
                    <td><span className="status-pill neutral">{p.processName}</span></td>
                    <td><strong>{p.factory}</strong></td>
                    <td>{p.challanNo}</td>
                    <td>{p.color}</td>
                    <td>{dt(p.sendDate)}</td>
                    <td>{num(p.sendQty)}</td>
                    <td>{dt(p.receiveDate)}</td>
                    <td>{num(p.receiveQty)}</td>
                    <td><strong style={{ color: p.balanceQty > 0 ? '#ea580c' : '#16a34a' }}>{num(p.balanceQty)}</strong></td>
                    <td><span className={`status-pill ${p.status === 'COMPLETED' ? 'good' : 'warn'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Finishing & Delivery */}
      {tab === 'finishing-delivery' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Finishing Output &amp; Finished Fabric Store Delivery</div>
              <div className="panel-sub">
                Stenter, Compactor &amp; QC passed rolls delivered to Finished Fabric Store for Cutting section handover.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Buyer</th>
                  <th>Delivery Challan</th>
                  <th>Slot</th>
                  <th>Body Delivered (KG)</th>
                  <th>L Rib Delivered (KG)</th>
                  <th>S.Jersey Delivered (KG)</th>
                  <th>Total Delivered (KG)</th>
                  <th>Total Balance (KG)</th>
                  <th>Balance %</th>
                  <th>Merchandiser</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 30).map((d: any, i: number) => (
                  <tr key={`${d.jobNo}-${d.challanNo}-${i}`}>
                    <td><strong>{d.jobNo}</strong></td>
                    <td>{d.buyer}</td>
                    <td><strong>{d.challanNo}</strong></td>
                    <td><span className="status-pill neutral">{d.slotNo || '1st Slot'}</span></td>
                    <td>{num(d.bodyDelivery)}</td>
                    <td>{num(d.lribDelivery)}</td>
                    <td>{num(d.sjerseyDelivery)}</td>
                    <td><strong style={{ color: '#16a34a' }}>{num(d.totalDelivery)}</strong></td>
                    <td><strong style={{ color: d.totalBalance > 0 ? '#ea580c' : '#16a34a' }}>{num(d.totalBalance)}</strong></td>
                    <td><span className={`status-pill ${d.balancePct > 10 ? 'warn' : 'good'}`}>{d.balancePct}%</span></td>
                    <td>{d.merchandiser || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Component Balance */}
      {tab === 'component-balance' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Component-Level Balance Tracking (Zero Collapse Rule)</div>
              <div className="panel-sub">
                Body, L Rib, and S.Jersey fabric balances are kept strictly separated across all processing stages.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Buyer</th>
                  <th>Color</th>
                  <th>Body Req (KG)</th>
                  <th>Body Grey (KG)</th>
                  <th>Body Dye (KG)</th>
                  <th>L Rib Req (KG)</th>
                  <th>L Rib Grey (KG)</th>
                  <th>L Rib Dye (KG)</th>
                  <th>S.Jersey Req (KG)</th>
                  <th>S.Jersey Grey (KG)</th>
                  <th>Total Require (KG)</th>
                </tr>
              </thead>
              <tbody>
                {initialExecution.slice(0, 20).map((r: any) => (
                  <tr key={`${r.jobNo}-${r.colour}`}>
                    <td><strong>{r.jobNo}</strong></td>
                    <td>{r.buyer}</td>
                    <td>{r.colour}</td>
                    <td><strong>{num(r.reqBody)}</strong></td>
                    <td>{num(r.greyBodyRcvd)}</td>
                    <td><strong style={{ color: '#16a34a' }}>{num(r.dyeingBody)}</strong></td>
                    <td><strong>{num(r.reqLRib)}</strong></td>
                    <td>{num(r.greyLRibRcvd)}</td>
                    <td><strong style={{ color: '#16a34a' }}>{num(r.dyeingLRib)}</strong></td>
                    <td><strong>{num(r.reqSJersey)}</strong></td>
                    <td>{num(r.greySJerseyRcvd)}</td>
                    <td><strong style={{ color: '#2563eb' }}>{num(r.totalRequire)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
