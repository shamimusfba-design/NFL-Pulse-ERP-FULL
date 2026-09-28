'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
export default function RunningDataPreview({slug}:{slug:string}){
  const [rows,setRows]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api(`/imports/running/${slug}`).then(setRows).catch(()=>setRows([])).finally(()=>setLoading(false))},[slug]);
  const keys=useMemo(()=>{const preferred=['jobNo','buyer','styleNo','itemDescription','date','status','productionQty','balanceQty','remarks']; const all=Array.from(new Set(rows.flatMap(r=>Object.keys(r).filter(k=>!['id','batchId','file','sheet','rowNumber'].includes(k))))); return [...preferred.filter(k=>all.includes(k)),...all.filter(k=>!preferred.includes(k))].slice(0,10)},[rows]);
  if(loading||!rows.length)return null;
  return <section className="panel span-3"><div className="panel-head"><div><div className="panel-title">Imported running data</div><div className="panel-sub">Committed from your existing Excel reports · latest {Math.min(rows.length,50)} rows shown.</div></div><span className="status-pill">LIVE IMPORT</span></div><div className="table-scroll"><table className="data-table compact-table"><thead><tr>{keys.map(k=><th key={k}>{k.replace(/([A-Z])/g,' $1')}</th>)}<th>Source</th></tr></thead><tbody>{rows.slice(0,50).map(r=><tr key={r.id}>{keys.map(k=><td key={k}>{String(r[k]??'—')}</td>)}<td><small>{r.file}<br/>{r.sheet} · row {r.rowNumber}</small></td></tr>)}</tbody></table></div></section>
}
