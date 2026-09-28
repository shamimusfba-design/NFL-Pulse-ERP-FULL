'use client';
import {useEffect,useMemo,useState} from 'react';
import Shell from '../../../components/Shell';
import {api} from '../../../lib/api';
import {displayJobNo} from '../../../lib/display';
function tone(s:string){return s==='READY'?'good':s==='BLOCKED'?'bad':s==='NA'?'neutral':'warn'}
export default function IeReadinessPage(){
  const [rows,setRows]=useState<any[]>([]),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{api('/ie/workqueue').then(setRows).catch((e:any)=>setError(e.message)).finally(()=>setLoading(false))},[]);
  const shown=useMemo(()=>{const k=q.trim().toLowerCase();return rows.filter(x=>!k||`${x.jobNo} ${x.buyer?.name||''} ${x.style?.styleNo||''} ${x.style?.itemDescription||''}`.toLowerCase().includes(k))},[rows,q]);
  const blockers=shown.filter(x=>(x.style?.readiness||[]).some((r:any)=>['PENDING','BLOCKED'].includes(r.status))).length;
  return <Shell title="Pre-Production Readiness" eyebrow="IE gate · Production Lot, Color×Size, Sample, File, PP, Fabric and Trims">
    <section className="module-hero"><div><span className="status-pill">Group 2 Working</span><h2>Pre-Production Readiness Board</h2><p>IE release-এর আগে কোন Job/Style কোথায় pending বা blocked আছে এক view-তে দেখা যাবে.</p></div><div className="module-actions"><a className="btn btn-secondary" href="/modules/ie-bulletin">Open IE Bulletin</a></div></section>
    {error&&<div className="notice">{error}</div>}
    <section className="ie-kpi-row"><div><span>Styles</span><strong>{loading?'…':shown.length}</strong></div><div><span>Ready for Release</span><strong>{shown.length-blockers}</strong></div><div><span>Needs Attention</span><strong>{blockers}</strong></div><div><span>Released IE</span><strong>{shown.filter(x=>x.status==='RELEASED').length}</strong></div></section>
    <section className="panel"><div className="panel-head"><div><div className="panel-title">Readiness Matrix</div><div className="panel-sub">Auto source + IE verified overrides</div></div><input className="ie-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search job / buyer / style"/></div><div className="wide-table-wrap"><table className="table"><thead><tr><th>Job</th><th>Buyer</th><th>Style</th><th>IE Status</th><th>Lot</th><th>Color×Size</th><th>Sample</th><th>File</th><th>PP</th><th>Fabric</th><th>Trims</th><th>Blocker</th></tr></thead><tbody>{shown.map((x:any)=>{const map=new Map((x.style?.readiness||[]).map((r:any)=>[r.key,r]));const keys=['PRODUCTION_LOT','COLOR_SIZE','SAMPLE','FILE','PP','FABRIC','TRIMS'];const bad=keys.map(k=>map.get(k) as any).filter(r=>r&&['PENDING','BLOCKED'].includes(r.status));return <tr key={x.style.id}><td><strong>{displayJobNo(x.jobNo,x.buyer)}</strong></td><td>{x.buyer?.name||x.buyer?.code||'—'}</td><td>{x.style.styleNo}</td><td><span className={`status-pill ${x.status==='RELEASED'?'good':'neutral'}`}>{x.status}</span></td>{keys.map(k=>{const r:any=map.get(k);return <td key={k}><span className={`status-pill ${tone(r?.status||'PENDING')}`} title={r?.note||''}>{r?.status||'PENDING'}</span></td>})}<td>{bad.length?bad.map((r:any)=>r.label).join(', '):'—'}</td></tr>})}</tbody></table></div></section>
  </Shell>
}
