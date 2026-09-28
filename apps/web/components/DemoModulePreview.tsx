'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { buyerShortCode, compactDate, displayJobNo } from '../lib/display';

function label(key:string){return key.replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase()).replace(/Pct$/,' %');}
function value(v:any,key:string){if(v===null||v===undefined||v==='')return '—';if(/date|eta|etd|ccd|start|end/i.test(key))return compactDate(v);if(typeof v==='number')return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});if(typeof v==='boolean')return v?'Yes':'No';if(Array.isArray(v))return v.join(', ');return String(v);}
function usefulKeys(rows:any[]){
  const score=(k:string)=>/required|available|short|balance|produced|delivered|cut|send|receive|production|packed|shipped|smv|machine|target|efficiency|line|floor|count|type|process|supplier|batches|rft|status/i.test(k)?2:1;
  const set=new Set<string>();for(const r of rows)for(const [k,v] of Object.entries(r.sectionData||{}))if(v!==null&&v!==undefined&&typeof v!=='object'&&!['status','latestStatus','overallStatus'].includes(k))set.add(k);
  return [...set].sort((a,b)=>score(b)-score(a)).slice(0,4);
}

export default function DemoModulePreview({ slug }: { slug: string }) {
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true);const [query,setQuery]=useState(''),[buyer,setBuyer]=useState('ALL'),[status,setStatus]=useState('ALL'),[detail,setDetail]=useState('ALL');
  useEffect(()=>{setLoading(true);api(`/demo/module/${slug}`).then(setRows).catch(()=>setRows([])).finally(()=>setLoading(false));},[slug]);
  const keys=useMemo(()=>usefulKeys(rows),[rows]);
  const buyerOptions=useMemo(()=>Array.from(new Set(rows.map(r=>r.buyerCode||buyerShortCode(r.buyer)))).sort(),[rows]);
  const statusOptions=useMemo(()=>Array.from(new Set(rows.map(r=>String(r.sectionStatus||'—')))).sort(),[rows]);
  const detailKey=useMemo(()=>keys.find(k=>{const vals=Array.from(new Set(rows.map(r=>r.sectionData?.[k]).filter(v=>typeof v==='string'&&v&&!/\d{4}-\d{2}-\d{2}/.test(String(v)))));return vals.length>1&&vals.length<=15;})||'',[keys,rows]);
  const detailOptions=useMemo(()=>detailKey?Array.from(new Set(rows.map(r=>String(r.sectionData?.[detailKey]||'')).filter(Boolean))).sort():[],[detailKey,rows]);
  const visible=useMemo(()=>rows.filter(r=>{
    const bc=r.buyerCode||buyerShortCode(r.buyer);if(buyer!=='ALL'&&bc!==buyer)return false;if(status!=='ALL'&&String(r.sectionStatus)!==status)return false;if(detailKey&&detail!=='ALL'&&String(r.sectionData?.[detailKey])!==detail)return false;
    const q=query.trim().toLowerCase();return !q||`${displayJobNo(r.jobNo,bc)} ${r.styleNo||''} ${r.itemDescription||''}`.toLowerCase().includes(q);
  }),[rows,buyer,status,detail,detailKey,query]);
  if(loading)return <div className="empty-state compact"><strong>Loading section preview…</strong></div>;if(!rows.length)return null;
  return <section className="panel span-3 demo-module-preview">
    <div className="panel-head"><div><div className="panel-title">Job work view</div><div className="panel-sub">Compact columns and only filters relevant to this section's data.</div></div><span className="status-pill neutral">DEMO</span></div>
    <div className="section-filter-bar"><label><span>Buyer</span><select value={buyer} onChange={e=>setBuyer(e.target.value)}><option value="ALL">All</option>{buyerOptions.map(x=><option value={x} key={x}>{x}</option>)}</select></label><label className="filter-grow"><span>Job / Style / Item</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></label><label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All</option>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></label>{detailKey&&<label><span>{label(detailKey)}</span><select value={detail} onChange={e=>setDetail(e.target.value)}><option value="ALL">All</option>{detailOptions.map(x=><option key={x}>{x}</option>)}</select></label>}</div>
    <div className="table-scroll"><table className="data-table compact-table job-table"><thead><tr><th>Buyer Job No</th><th>Style</th><th>Item</th><th>Order Qty</th>{keys.map(k=><th key={k}>{label(k)}</th>)}<th>Status</th><th>Pending Action</th></tr></thead><tbody>{visible.slice(0,50).map((r:any)=><tr key={r.orderId}><td><strong>{displayJobNo(r.jobNo,r.buyerCode||r.buyer)}</strong>{String(r.jobNo).includes('990')&&<span className="demo-badge">DEMO</span>}</td><td>{r.styleNo||'—'}</td><td className="compact-item-cell" title={r.itemDescription||''}>{r.itemDescription||'—'}</td><td className="num-cell">{Number(r.orderQty||0).toLocaleString()}</td>{keys.map(k=><td key={k}>{value(r.sectionData?.[k],k)}</td>)}<td><span className="status-pill neutral">{r.sectionStatus||'—'}</span></td><td>{r.pendingAction||'—'}</td></tr>)}</tbody></table></div>
    <div className="panel-note">Showing {Math.min(visible.length,50)} of {visible.length} matching rows. Buyer full name is not repeated because the Job No carries the buyer short code.</div>
  </section>;
}
