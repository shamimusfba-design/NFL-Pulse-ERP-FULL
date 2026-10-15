'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { buyerShortCode, compactDate, displayJobNo, matchesJobSearch } from '../lib/display';

function label(key:string){return key.replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase()).replace(/Pct$/,' %');}
function value(v:any,key:string){if(v===null||v===undefined||v==='')return '—';if(/date|eta|etd|ccd|start|end/i.test(key))return compactDate(v);if(typeof v==='number')return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});if(typeof v==='boolean')return v?'Yes':'No';if(Array.isArray(v))return v.join(', ');return String(v);}
function usefulKeys(rows:any[]){
  const score=(k:string)=>/required|available|short|balance|produced|delivered|cut|send|receive|production|packed|shipped|smv|machine|target|efficiency|line|floor|count|type|process|supplier|batches|rft|status/i.test(k)?2:1;
  const set=new Set<string>();for(const r of rows)for(const [k,v] of Object.entries(r.sectionData||{}))if(v!==null&&v!==undefined&&typeof v!=='object'&&!['status','latestStatus','overallStatus'].includes(k))set.add(k);
  return [...set].sort((a,b)=>score(b)-score(a)).slice(0,4);
}

export default function DemoModulePreview({ slug }: { slug: string }) {
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');
  const [buyer,setBuyer]=useState('ALL');
  const [status,setStatus]=useState('ALL');
  const [detail,setDetail]=useState('ALL');

  useEffect(() => {
    setLoading(true);
    const qParam = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const timer = setTimeout(() => {
      api(`/demo/module/${slug}${qParam}`)
        .then((data: any) => setRows(Array.isArray(data) ? data : []))
        .catch(() => setRows([]))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(timer);
  }, [slug, query]);

  const keys=useMemo(()=>usefulKeys(rows),[rows]);
  const buyerOptions=useMemo(()=>Array.from(new Set(rows.map(r=>r.buyerCode||buyerShortCode(r.buyer)))).sort(),[rows]);
  const statusOptions=useMemo(()=>Array.from(new Set(rows.map(r=>String(r.sectionStatus||'—')))).sort(),[rows]);
  const detailKey=useMemo(()=>keys.find(k=>{const vals=Array.from(new Set(rows.map(r=>r.sectionData?.[k]).filter(v=>typeof v==='string'&&v&&!/\d{4}-\d{2}-\d{2}/.test(String(v)))));return vals.length>1&&vals.length<=15;})||'',[keys,rows]);
  const detailOptions=useMemo(()=>detailKey?Array.from(new Set(rows.map(r=>String(r.sectionData?.[detailKey]||'')).filter(Boolean))).sort():[],[detailKey,rows]);
  const visible=useMemo(()=>rows.filter(r=>{
    const bc=r.buyerCode||buyerShortCode(r.buyer);if(buyer!=='ALL'&&bc!==buyer)return false;if(status!=='ALL'&&String(r.sectionStatus)!==status)return false;if(detailKey&&detail!=='ALL'&&String(r.sectionData?.[detailKey])!==detail)return false;
    return matchesJobSearch(r, query);
  }),[rows,buyer,status,detail,detailKey,query]);

  return <section className="panel span-3 demo-module-preview">
    <div className="panel-head">
      <div>
        <div className="panel-title">Job work view</div>
        <div className="panel-sub">Live job search across all 2,000 factory jobs & imported POs. Type any Job # to inspect section status.</div>
      </div>
      <span className="status-pill neutral">{loading ? 'Searching…' : `${visible.length} Jobs`}</span>
    </div>
    <div className="section-filter-bar">
      <label><span>Buyer</span><select value={buyer} onChange={e=>setBuyer(e.target.value)}><option value="ALL">All</option>{buyerOptions.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
      <label className="filter-grow"><span>Job / Style / Item</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type Job # (e.g. 22041, 48093) or Style…"/></label>
      <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All</option>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></label>
      {detailKey&&<label><span>{label(detailKey)}</span><select value={detail} onChange={e=>setDetail(e.target.value)}><option value="ALL">All</option>{detailOptions.map(x=><option key={x}>{x}</option>)}</select></label>}
    </div>
    {loading && <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Searching across all factory jobs…</div>}
    <div className="table-scroll"><table className="data-table compact-table job-table"><thead><tr><th>Buyer Job No</th><th>Style</th><th>Item</th><th>Order Qty</th>{keys.map(k=><th key={k}>{label(k)}</th>)}<th>Status</th><th>Action</th></tr></thead><tbody>{visible.slice(0,50).map((r:any)=><tr key={r.orderId || r.jobNo}><td><Link href={`/jobs/${encodeURIComponent(r.jobNo)}`} style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none' }}>{displayJobNo(r.jobNo,r.buyerCode||r.buyer)}</Link>{String(r.jobNo).includes('990')&&<span className="demo-badge">DEMO</span>}</td><td>{r.styleNo||'—'}</td><td className="compact-item-cell" title={r.itemDescription||''}>{r.itemDescription||'—'}</td><td className="num-cell">{Number(r.orderQty||0).toLocaleString()}</td>{keys.map(k=><td key={k}>{value(r.sectionData?.[k],k)}</td>)}<td><span className="status-pill neutral">{r.sectionStatus||'—'}</span></td><td><Link href={`/jobs/${encodeURIComponent(r.jobNo)}`} className="btn btn-secondary btn-tiny" style={{ padding: '2px 8px', fontSize: '10.5px', textDecoration: 'none', fontWeight: 800 }}>Open Job →</Link></td></tr>)}
    {!loading && !visible.length && <tr><td colSpan={6 + keys.length} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No jobs match the search query &quot;{query}&quot;. Try searching with another Job # or Style #.</td></tr>}
    </tbody></table></div>
    <div className="panel-note">Showing {Math.min(visible.length,50)} of {visible.length} matching rows. Clicking any Job opens its connected 7-department profile.</div>
  </section>;
}
