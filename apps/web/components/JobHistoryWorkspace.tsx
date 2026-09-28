'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { displayJobNo } from '../lib/display';

type Mode = 'job360' | 'quality' | 'leadtime';

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
}

function date(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(v: any) {
  const s = String(v || '').toLowerCase();
  if (s.includes('complete') || s.includes('released') || s.includes('ready') || s.includes('pass') || s.includes('shipped') || s.includes('on time')) return 'good';
  if (s.includes('hold') || s.includes('fail') || s.includes('critical') || s.includes('late') || s.includes('overdue')) return 'bad';
  if (s.includes('running') || s.includes('progress') || s.includes('low') || s.includes('review') || s.includes('pending')) return 'warn';
  return 'neutral';
}

const productionSections = [
  ['yarn', 'Yarn'], ['procurement', 'Procurement'], ['yarnStore', 'Yarn Store'], ['yarnDyeing', 'Yarn Dyeing'],
  ['knitting', 'Knitting'], ['greigeStore', 'Greige Store'], ['dyeing', 'Dyeing'], ['labTesting', 'Lab / Testing'],
  ['fabricFinishing', 'Fabric Finishing'], ['finishedFabricStore', 'Finished Fabric Store'], ['cutting', 'Cutting'],
  ['printing', 'Printing'], ['embroidery', 'Embroidery'], ['sewing', 'Sewing'], ['finishing', 'Finishing'], ['shipment', 'Shipment'],
] as const;

export default function JobHistoryWorkspace({ mode = 'job360' }: { mode?: Mode }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(mode === 'quality' ? 'quality' : mode === 'leadtime' ? 'leadtime' : 'production');

  useEffect(() => {
    api('/demo/job360').then((rows) => {
      setJobs(rows);
      if (rows[0]) setSelected(rows[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    api(`/demo/job360/${selected}`).then(setDetail).catch(() => setDetail(null));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => `${displayJobNo(j.jobNo,j.buyerCode||j.buyer)} ${j.styleNo} ${j.itemDescription}`.toLowerCase().includes(q));
  }, [jobs, query]);

  const title = mode === 'quality' ? 'Job Quality History' : mode === 'leadtime' ? 'Lead Time & Delivery History' : 'Job 360';

  if (loading) return <section className="panel"><div className="empty-state"><strong>Loading demo jobs…</strong></div></section>;
  if (!jobs.length) return <section className="panel"><div className="empty-state"><strong>No jobs available</strong><span>Import or create real job data first.</span></div></section>;

  return <div className="history-workspace">
    <section className="history-picker panel">
      <div className="panel-head"><div><div className="panel-title">{title}</div><div className="panel-sub">50 removable demo jobs · choose any job to inspect connected section data.</div></div><span className="status-pill neutral">DEMO</span></div>
      <div className="history-picker-row">
        <input className="history-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Buyer Job No / Style / Item…" />
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {filtered.map((j) => <option value={j.id} key={j.id}>{displayJobNo(j.jobNo,j.buyerCode||j.buyer)} · {j.styleNo}</option>)}
        </select>
      </div>
    </section>

    {detail && <>
      <section className="job360-head panel">
        <div className="job360-title"><div className="job360-image">{detail.order.itemImageUrl ? <img src={detail.order.itemImageUrl} alt="Item" /> : <span>ITEM</span>}</div><div><div className="page-eyebrow">Buyer Job No</div><h2>{displayJobNo(detail.order.jobNo,detail.order.buyerCode||detail.order.buyer)} · {detail.order.styleNo}</h2><p>{detail.order.itemDescription || '—'}</p></div></div>
        <div className="job360-facts">
          <div><span>Order Qty</span><strong>{fmt(detail.order.orderQty)} pcs</strong></div><div><span>FOB</span><strong>{detail.order.fobPrice ? `$${fmt(detail.order.fobPrice)}` : '—'}</strong></div><div><span>CCD / Ship</span><strong>{date(detail.order.ccd)}</strong></div><div><span>PO</span><strong>{fmt(detail.order.poNo)}</strong></div>
        </div>
      </section>

      {mode === 'job360' && <div className="workspace-tabs history-tabs">
        <button className={tab === 'production' ? 'active' : ''} onClick={() => setTab('production')}>Production 360</button>
        <button className={tab === 'tests' ? 'active' : ''} onClick={() => setTab('tests')}>Test Reports</button>
        <button className={tab === 'quality' ? 'active' : ''} onClick={() => setTab('quality')}>Quality History</button>
        <button className={tab === 'leadtime' ? 'active' : ''} onClick={() => setTab('leadtime')}>Lead Time History</button>
      </div>}

      {(tab === 'production' && mode === 'job360') && <section className="panel">
        <div className="panel-head"><div><div className="panel-title">End-to-end production position</div><div className="panel-sub">Every demo job has Yarn → Shipment data so every section can be tested.</div></div></div>
        <div className="section360-grid">
          {productionSections.map(([key, label]) => {
            const row = detail.sectionData?.[key] || {};
            const st = row.status || row.latestStatus || row.overallStatus || (row.applicable === false ? 'N/A' : 'Demo');
            const entries = Object.entries(row).filter(([k, v]) => !['status','latestStatus','overallStatus','reports','history','applicable'].includes(k) && typeof v !== 'object').slice(0, 4);
            return <div className="section360-card" key={key}><div className="section360-card-head"><strong>{label}</strong><span className={`history-status ${statusClass(st)}`}>{st}</span></div>{entries.map(([k,v]) => <div className="section360-line" key={k}><span>{k.replace(/([A-Z])/g,' $1')}</span><b>{k.toLowerCase().includes('date') || k.toLowerCase().includes('eta') || k.toLowerCase().includes('start') ? date(v) : fmt(v)}</b></div>)}</div>;
          })}
        </div>
      </section>}

      {(tab === 'tests' && mode === 'job360') && <section className="panel"><div className="panel-head"><div><div className="panel-title">Testing Lab Reports</div><div className="panel-sub">Demo follows the regular Testing Lab report source: CF Test and Inhouse Pilling Test.</div></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Test</th><th>Report Ref</th><th>Date</th><th>Result</th><th>Retest</th><th>Remarks</th><th>Attachment</th></tr></thead><tbody>{(detail.testReports || []).map((r:any)=><tr key={r.reportRef}><td><strong>{r.reportType}</strong></td><td>{r.reportRef}</td><td>{date(r.testDate)}</td><td><span className={`history-status ${statusClass(r.result)}`}>{r.result}</span></td><td>{r.retest ? `${r.retest.reportRef} · ${r.retest.result}` : '—'}</td><td>{r.remarks || '—'}</td><td>{r.attachmentName || '—'}</td></tr>)}</tbody></table></div></section>}

      {(tab === 'quality' || mode === 'quality') && <section className="panel"><div className="panel-head"><div><div className="panel-title">Section / Floor Quality History</div><div className="panel-sub">Pass is inferred from release to the next process. Authorized section/floor responsible users record only observations, holds or remarks.</div></div></div><div className="quality-timeline">{(detail.qualityHistory || []).map((q:any)=><div className="quality-history-row" key={q.section}><div className={`quality-marker ${statusClass(q.releaseStatus)}`}>{q.releaseStatus === 'RELEASED' ? '✓' : q.releaseStatus === 'HOLD' ? '!' : '·'}</div><div><strong>{q.section}</strong><span>{q.enteredBy}</span></div><span className={`history-status ${statusClass(q.releaseStatus)}`}>{q.releaseStatus}</span><div><span className="muted-label">Release</span><strong>{date(q.releasedAt)}</strong></div><div className="quality-remark">{q.remark || 'No exception remark'}</div></div>)}</div><div className="lab-link-note"><strong>Testing Lab remains the detailed regular report source.</strong> Its test reports are available in Job 360 → Test Reports.</div></section>}

      {(tab === 'leadtime' || mode === 'leadtime') && <section className="panel"><div className="panel-head"><div><div className="panel-title">Planned vs Actual Lead Time</div><div className="panel-sub">Planning view: milestone timing, production delivery, delay days and delay reason — not full QC detail.</div></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Section / Milestone</th><th>Planned Start</th><th>Actual Start</th><th>Planned Finish</th><th>Actual Finish</th><th>Variance</th><th>Status</th><th>Reason</th></tr></thead><tbody>{(detail.leadTimeHistory || []).map((r:any)=><tr key={r.section}><td><strong>{r.section}</strong></td><td>{date(r.plannedStart)}</td><td>{date(r.actualStart)}</td><td>{date(r.plannedFinish)}</td><td>{date(r.actualFinish)}</td><td>{r.varianceDays === null || r.varianceDays === undefined ? '—' : `${r.varianceDays > 0 ? '+' : ''}${r.varianceDays} day`}</td><td><span className={`history-status ${statusClass(r.status)}`}>{r.status}</span></td><td>{r.reason || '—'}</td></tr>)}</tbody></table></div></section>}
    </>}
  </div>;
}
