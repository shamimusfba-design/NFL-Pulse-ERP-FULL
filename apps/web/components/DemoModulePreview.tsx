'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function summary(row: any) {
  const obj = row.sectionData || {};
  const entries = Object.entries(obj).filter(([k, v]) => !['status','latestStatus','overallStatus','reports','history','applicable','processes'].includes(k) && typeof v !== 'object' && v !== null && v !== undefined).slice(0, 3);
  if (!entries.length) return '—';
  return entries.map(([k, v]) => {
    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase());
    const value = typeof v === 'number' ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
    return `${label}: ${value}`;
  }).join(' · ');
}

export default function DemoModulePreview({ slug }: { slug: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api(`/demo/module/${slug}`).then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <div className="empty-state compact"><strong>Loading demo preview…</strong></div>;
  if (!rows.length) return null;
  return <section className="panel span-3 demo-module-preview">
    <div className="panel-head"><div><div className="panel-title">Demo work view</div><div className="panel-sub">Temporary test data only · all 50 jobs now carry connected section data from Yarn through Shipment.</div></div><span className="status-pill neutral">DEMO</span></div>
    <div className="table-scroll"><table className="data-table compact-table"><thead><tr><th>Job</th><th>Buyer</th><th>Style</th><th>Item</th><th>Order Qty</th><th>Section Status</th><th>Section Data</th><th>Pending Action</th></tr></thead>
      <tbody>{rows.slice(0,12).map((r:any)=><tr key={r.orderId}><td><strong>{r.jobNo}</strong><span className="demo-badge">DEMO</span></td><td>{r.buyer||'—'}</td><td>{r.styleNo||'—'}</td><td>{r.itemDescription||'—'}</td><td>{Number(r.orderQty||0).toLocaleString()}</td><td><span className="status-pill neutral">{r.sectionStatus||'—'}</span></td><td className="demo-section-data">{summary(r)}</td><td>{r.pendingAction||'—'}</td></tr>)}</tbody>
    </table></div>
    {rows.length>12&&<div className="panel-note">Showing 12 of {rows.length} demo jobs. Job 360 contains the complete production, testing, quality and lead-time history for each demo job.</div>}
  </section>;
}
