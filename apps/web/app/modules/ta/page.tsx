'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { buyerShortCode, displayJobNo } from '../../../lib/display';

type ProcessRow = { key:string; label:string; start?:string; end?:string; date?:string; core?:boolean; fixed?:boolean };
const PROCESS_ROWS: ProcessRow[] = [
  {key:'yarnDyeing',label:'Yarn Dyeing',start:'yarnDyeingStart',end:'yarnDyeingEnd'},
  {key:'knitting',label:'Knitting',start:'knittingStart',end:'knittingEnd',core:true},
  {key:'dyeing',label:'Dyeing / Fabric Finishing',start:'dyeingFinishingStart',end:'dyeingFinishingEnd',core:true},
  {key:'aop',label:'AOP / Brush / Peach',start:'aopStart',end:'aopEnd'},
  {key:'trims',label:'Trims In-house',date:'trimsInhouseDate',core:true},
  {key:'file',label:'File Handover',date:'fileHandoverDate',core:true},
  {key:'pp',label:'PP Meeting',date:'ppMeetingDate',core:true},
  {key:'cutting',label:'Cutting',start:'cuttingStart',end:'cuttingEnd',core:true},
  {key:'printing',label:'Printing',start:'printingStart',end:'printingEnd'},
  {key:'embroidery',label:'Embroidery',start:'embroideryStart',end:'embroideryEnd'},
  {key:'sewing',label:'Sewing',start:'sewingStartDate',end:'sewingEnd',core:true},
  {key:'garmentWash',label:'Garment Wash / Dye',start:'garmentWashStart',end:'garmentWashEnd'},
  {key:'finishing',label:'Finishing / Packing',start:'finishingStart',end:'finishingEnd',core:true},
  {key:'preFinal',label:'Pre-Final Inspection',date:'preFinalInspection',core:true},
  {key:'final',label:'Final Inspection',date:'finalInspection',core:true},
  {key:'exFactory',label:'Ex-Factory',date:'exFactoryDate',core:true},
  {key:'ccd',label:'CCD / Shipment Date',date:'cargoClosingDate',core:true,fixed:true},
];
const DATE_FIELDS = Array.from(new Set(PROCESS_ROWS.flatMap(r=>[r.start,r.end,r.date]).filter(Boolean))) as string[];

function inputDate(v:any){ return v ? String(v).slice(0,10) : ''; }
function num(v:any){ return Number(v||0).toLocaleString(); }
function fmtDate(v:any){ return v ? new Date(v).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'; }
// Same rule as the API: the earliest CCD across all POs of the style is the fixed T&A end date.
function firstCcd(style:any){ const v=(style.purchaseOrders||[]).map((p:any)=>p?.ccd||p?.shipmentDate).filter(Boolean).map((x:any)=>String(x)).sort(); return v[0]||null; }
function heatClass(status:string){ return status==='OVERLOAD'?'heat-red':status==='ATTENTION'?'heat-amber':'heat-green'; }
function day(v:any){const x=v?new Date(`${String(v).slice(0,10)}T00:00:00Z`):null;return x&&!Number.isNaN(x.getTime())?x:null;}
function dayDiff(a:any,b:any){const x=day(a),y=day(b);return x&&y?Math.round((y.getTime()-x.getTime())/86400000):null;}
function leadTime(start:any,end:any){const d=dayDiff(start,end);return d===null?'—':`${Math.max(1,d+1)} d`;}
function rowStart(row:ProcessRow,p:any){return row.date?p[row.date]:row.start?p[row.start]:null;}
function rowEnd(row:ProcessRow,p:any){return row.date?p[row.date]:row.end?p[row.end]:null;}
function slackText(row:ProcessRow,next:ProcessRow|undefined,p:any){if(!next)return '—';const d=dayDiff(rowEnd(row,p),rowStart(next,p));if(d===null)return '—';const slack=d-1;return slack<0?`Overlap ${Math.abs(slack)} d`:`${slack} d`;}

export default function TaPage(){
  const [queue,setQueue]=useState<any[]>([]); const [selectedId,setSelectedId]=useState(''); const [plans,setPlans]=useState<Record<string,any>>({});
  const [remarks,setRemarks]=useState(''); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const [statusFilter,setStatusFilter]=useState<'PENDING'|'APPROVED'|'ALL'>('PENDING'); const [buyerFilter,setBuyerFilter]=useState('ALL'); const [query,setQuery]=useState('');
  const [heat,setHeat]=useState<any>(null); const [capacityCheck,setCapacityCheck]=useState<any>(null);

  async function loadQueue(keep?:string){
    setLoading(true); try{ const data=await api('/planning/ta/workqueue'); setQueue(data); const id=keep||selectedId||data[0]?.id||''; setSelectedId(id); const order=data.find((x:any)=>x.id===id); if(order) hydrate(order); }
    catch(e:any){setError(e.message)} finally{setLoading(false)}
  }
  function hydrate(order:any){
    const next:Record<string,any>={};
    for(const style of order.styles||[]){ const p=style.planning||{}; next[style.id]={styleId:style.id,taGeneration:p.taGeneration||null,printOutsidePlan:Boolean(p.printOutsidePlan),embroideryOutsidePlan:Boolean(p.embroideryOutsidePlan),outsideProcessType:p.outsideProcessType||'',outsideVendor:p.outsideVendor||'',remarks:p.remarks||'',...Object.fromEntries(DATE_FIELDS.map(k=>[k,inputDate(p[k])]))}; }
    setPlans(next); setRemarks(order.sourceMetadata?.taPlan?.remarks||'');
  }
  async function loadHeat(month?:string){ try{setHeat(await api(`/planning/capacity/heatmap${month?`?month=${month}`:''}`));}catch{} }
  async function refreshCapacity(orderId:string){ try{setCapacityCheck(await api(`/planning/ta/orders/${orderId}/capacity-check`));}catch{setCapacityCheck(null)} }
  useEffect(()=>{loadQueue();loadHeat();},[]);
  const selected=useMemo(()=>queue.find((x:any)=>x.id===selectedId)||null,[queue,selectedId]);
  useEffect(()=>{ if(selected){ const m=(selected.styles?.[0]?.planning?.sewingStartDate||selected.styles?.[0]?.purchaseOrders?.[0]?.ccd||'').slice?.(0,7); loadHeat(m||undefined); refreshCapacity(selected.id); } },[selectedId,queue]);
  const buyerOptions=useMemo(()=>Array.from(new Set(queue.map((o:any)=>buyerShortCode(o.buyer?.code||o.buyer?.name)))).sort(),[queue]);
  const visible=useMemo(()=>queue.filter((o:any)=>{
    if(statusFilter!=='ALL'&&(statusFilter==='APPROVED'?o.taStatus!=='APPROVED':o.taStatus==='APPROVED'))return false;
    const bc=buyerShortCode(o.buyer?.code||o.buyer?.name); if(buyerFilter!=='ALL'&&bc!==buyerFilter)return false;
    const q=query.trim().toLowerCase(); if(q&&!`${displayJobNo(o.jobNo,o.buyer)} ${(o.styles||[]).map((s:any)=>`${s.styleNo} ${s.itemDescription||''}`).join(' ')}`.toLowerCase().includes(q))return false;
    return true;
  }),[queue,statusFilter,buyerFilter,query]);
  function choose(o:any){setSelectedId(o.id);hydrate(o);setMessage('');setError('');}
  function update(styleId:string,key:string,value:any){setPlans(p=>({...p,[styleId]:{...(p[styleId]||{styleId}),[key]:value}}));}
  function payload(approve:boolean,override=false){return{styles:(selected?.styles||[]).map((s:any)=>{const p=plans[s.id]||{};const b:any={styleId:s.id,printOutsidePlan:!!p.printOutsidePlan,embroideryOutsidePlan:!!p.embroideryOutsidePlan,outsideProcessType:p.outsideProcessType||undefined,outsideVendor:p.outsideVendor||undefined,remarks:p.remarks||undefined};DATE_FIELDS.forEach(k=>{if(p[k])b[k]=p[k]});Object.keys(b).forEach(k=>{if(b[k]===''||b[k]===undefined)delete b[k]});return b;}),remarks,approve,capacityOverride:override};}
  async function save(approve:boolean,override=false){ if(!selected)return; setSaving(true);setError('');setMessage(''); try{if(approve){await api(`/planning/ta/orders/${selected.id}`,{method:'PUT',body:JSON.stringify(payload(false,false))});const check=await api(`/planning/ta/orders/${selected.id}/capacity-check`);setCapacityCheck(check);if(!check.ok&&!override)throw new Error(`Capacity heatmap is overloaded (max ${check.maxLoadPct}%). Review dates or use Planning override.`);}const r=await api(`/planning/ta/orders/${selected.id}`,{method:'PUT',body:JSON.stringify(payload(approve,override))});setMessage(r.message);await loadQueue(selected.id);await refreshCapacity(selected.id);}catch(e:any){setError(e.message)}finally{setSaving(false)} }
  async function generateOne(){ if(!selected)return; setSaving(true);setError('');try{const r=await api(`/planning/ta/orders/${selected.id}/generate`,{method:'POST'});setMessage(r.message);await loadQueue(selected.id);await refreshCapacity(selected.id);}catch(e:any){setError(e.message)}finally{setSaving(false)} }
  async function generateAll(){ setSaving(true);setError('');try{const r=await api('/planning/ta/generate-pending',{method:'POST'});setMessage(r.message);await loadQueue();await loadHeat();}catch(e:any){setError(e.message)}finally{setSaving(false)} }
  const overload=capacityCheck && !capacityCheck.ok;

  return <Shell title="Time & Action Planning" eyebrow="Central Planning · quantity/process aware backward T&A · fixed CCD">
    <section className="module-hero ta-hero"><div><span className="status-pill">Central Planning authority</span><h2>Backward T&A with fixed CCD</h2><p>CCD stays fixed. Auto-generation uses fabric KG, garment quantity, applicable processes and IE data; if the normal start falls in the past, slack and section lead time are compressed so the first new process starts no earlier than tomorrow.</p></div><div className="module-actions"><button className="btn btn-primary" disabled={saving} onClick={generateAll}>{saving?'Working…':'Auto Generate All Pending T&A'}</button><a className="btn btn-secondary" href="/modules/capacity">Open Heatmap</a><a className="btn btn-secondary" href="/modules/sewing-planning">Open Gantt</a></div></section>
    {message&&<div className="notice success-notice">{message}</div>}{error&&<div className="notice">{error}</div>}

    {heat&&<section className="panel planning-heat-strip"><div className="panel-head"><div><div className="panel-title">Capacity Heatmap · {heat.month}</div><div className="panel-sub">Capacity remains the approval check after quantity/process lead-time calculation.</div></div><a className="text-link" href="/modules/capacity">Customize capacity →</a></div><div className="planning-heat-grid"><div className="ph-head">Section</div>{[1,2,3].map(s=><div className="ph-head" key={s}>Slot {s}</div>)}{heat.rows.map((r:any)=><div className="ph-row" key={r.section}><strong>{r.label}</strong>{r.slots.map((c:any)=><div key={c.slot} className={`ph-cell ${heatClass(c.status)}`}><b>{c.loadPct}%</b><span>{num(c.demand)} / {num(c.capacity)} {r.unit}</span></div>)}</div>)}</div></section>}

    <section className="ta-layout"><div className="panel ta-queue-panel"><div className="panel-head"><div><div className="panel-title">T&A Job Queue</div><div className="panel-sub">Relevant filters only · Buyer short code is part of Job No</div></div><span className="status-pill neutral">{visible.length}/{queue.length}</span></div>
      <div className="section-filter-bar ta-filter-controls"><label><span>Buyer</span><select value={buyerFilter} onChange={e=>setBuyerFilter(e.target.value)}><option value="ALL">All</option>{buyerOptions.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="filter-grow"><span>Job / Style / Item</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></label></div>
      <div className="ta-filter-row"><button className={statusFilter==='PENDING'?'mini-tab active':'mini-tab'} onClick={()=>setStatusFilter('PENDING')}>Pending / Draft</button><button className={statusFilter==='APPROVED'?'mini-tab active':'mini-tab'} onClick={()=>setStatusFilter('APPROVED')}>Approved</button><button className={statusFilter==='ALL'?'mini-tab active':'mini-tab'} onClick={()=>setStatusFilter('ALL')}>All</button></div>
      <div className="ta-job-list">{visible.map((o:any)=><button key={o.id} className={`ta-job-card ${selectedId===o.id?'active':''}`} onClick={()=>choose(o)}><div><strong>{displayJobNo(o.jobNo,o.buyer)}</strong><span>{(o.styles||[])[0]?.styleNo||'—'}</span></div><small>{num(o.totalQty)} pcs · {o.styles?.length||0} style</small><i className={`ta-state ${String(o.taStatus||'PENDING').toLowerCase()}`}>{o.taStatus||'PENDING'}</i></button>)}{!loading&&!visible.length&&<div className="empty-state compact"><strong>No jobs in this view</strong></div>}</div></div>

      <div className="panel ta-editor-panel">{!selected?<div className="workspace-empty"><div className="workspace-symbol">TA</div><div><strong>Select a Job</strong><span>Planning details open here.</span></div></div>:<><div className="panel-head ta-editor-head"><div><div className="panel-title">{displayJobNo(selected.jobNo,selected.buyer)}</div><div className="panel-sub">Order Qty {num(selected.totalQty)} pcs · {selected.taStatus}</div></div><div className="ta-editor-actions">{selected.taStatus!=='APPROVED'&&<button className="btn btn-secondary" disabled={saving} onClick={generateOne}>Regenerate Suggested Dates</button>}<button className="btn btn-secondary" disabled={saving} onClick={()=>save(false)}>Save Draft</button><button className="btn btn-primary" disabled={saving} onClick={()=>save(true,false)}>Approve & Release</button>{overload&&<button className="btn btn-danger" disabled={saving} onClick={()=>{if(confirm(`Capacity is overloaded up to ${capacityCheck.maxLoadPct}%. Approve with Central Planning override?`))save(true,true)}}>Approve with Override</button>}</div></div>
        <div className={`capacity-check-banner ${overload?'bad':'good'}`}><strong>{capacityCheck?overload?`Capacity Risk · Max ${capacityCheck.maxLoadPct}%`:`Capacity Check OK · Max ${capacityCheck.maxLoadPct}%`:'Checking capacity…'}</strong><span>{overload?'Adjust section capacity / dates before normal approval, or use authorized override.':'Calculated dates are within the configured heatmap threshold.'}</span></div>
        <div className="ta-style-stack">{selected.styles?.map((style:any)=>{const p=plans[style.id]||{};const gen=p.taGeneration||style.planning?.taGeneration||{};const basisLabels=new Set((gen.processBasis||[]).map((x:any)=>x.process));const displayRows=PROCESS_ROWS.filter(r=>r.core||basisLabels.has(r.label)||rowStart(r,p)||rowEnd(r,p));return <section className="ta-style-card" key={style.id}><div className="ta-style-head"><div><strong>{style.styleNo}</strong><span>{style.itemDescription||'—'} · {num(style.quantity)} pcs · CCD {fmtDate(firstCcd(style))}</span></div><span className={`status-pill ${style.planning?.taStatus==='APPROVED'?'good':'neutral'}`}>{style.planning?.taStatus||'Pending'}</span></div>
          {gen.engineVersion&&<div className={`ta-compression-strip ${gen.shortageDays>0?'compressed':'standard'}`}><div><span>Fabric</span><strong>{num(gen.fabricRequiredKg)} KG</strong></div><div><span>Order Qty</span><strong>{num(gen.garmentOrderQty)} pcs</strong></div><div><span>Normal Need</span><strong>{gen.baselineRequiredDays} d</strong></div><div><span>Available to CCD</span><strong>{gen.availableDays} d</strong></div><div><span>Lead-time Short</span><strong>{gen.shortageDays||0} d</strong></div><div><span>Mode</span><strong>{String(gen.mode||'STANDARD').replace(/_/g,' ')}</strong></div></div>}
          <div className="wide-table-wrap ta-process-wrap"><table className="table ta-process-table"><thead><tr><th>Process</th><th>Start Date</th><th>End Date</th><th>Lead Time</th><th>Slack Time</th></tr></thead><tbody>{displayRows.map((row,idx)=>{const next=displayRows[idx+1];const basis=(gen.processBasis||[]).find((x:any)=>x.process===row.label)?.basis;return <tr key={row.key}><td><strong>{row.label}</strong>{basis&&<small>{basis}</small>}</td>{row.date?<td colSpan={2} className="milestone-date"><input type="date" disabled={row.fixed} value={p[row.date]||inputDate(row.fixed?firstCcd(style):'')} onChange={e=>update(style.id,row.date!,e.target.value)}/>{row.fixed&&<em>Fixed from PO CCD</em>}</td>:<><td><input type="date" value={p[row.start!]||''} onChange={e=>update(style.id,row.start!,e.target.value)}/></td><td><input type="date" value={p[row.end!]||''} onChange={e=>update(style.id,row.end!,e.target.value)}/></td></>}<td><strong>{row.date?'Milestone':leadTime(p[row.start!],p[row.end!])}</strong></td><td><span className={String(slackText(row,next,p)).startsWith('Overlap')?'overlap-text':''}>{slackText(row,next,p)}</span></td></tr>})}</tbody></table></div>
          <div className="ta-outside-row"><label className="check-row"><input type="checkbox" checked={!!p.printOutsidePlan} onChange={e=>update(style.id,'printOutsidePlan',e.target.checked)}/><span>Printing Outside Plan</span></label><label className="check-row"><input type="checkbox" checked={!!p.embroideryOutsidePlan} onChange={e=>update(style.id,'embroideryOutsidePlan',e.target.checked)}/><span>Embroidery Outside Plan</span></label>{(p.printOutsidePlan||p.embroideryOutsidePlan)&&<><select value={p.outsideProcessType||''} onChange={e=>update(style.id,'outsideProcessType',e.target.value)}><option value="">Process</option><option value="PRINTING">Printing</option><option value="EMBROIDERY">Embroidery</option><option value="BOTH">Both</option></select><input value={p.outsideVendor||''} onChange={e=>update(style.id,'outsideVendor',e.target.value)} placeholder="Outside factory / vendor"/></>}</div>
          {gen.shortageDays>0&&<div className="ta-generation-note"><strong>Compression recovery:</strong> Slack {gen.recovery?.slack||0}d · Lead time {gen.recovery?.leadTime||0}d · Overlap {gen.recovery?.overlap||0}d · Priority {gen.recovery?.priority||0}d. <strong>CCD remains fixed.</strong></div>}
        </section>})}</div><div className="ta-bottom-row"><label><span>Job-level Planning Remark</span><textarea className="form-control textarea" value={remarks} onChange={e=>setRemarks(e.target.value)} /></label><div className="ta-release-box"><strong>{selected.taStatus==='APPROVED'?'Released':'Draft / Pending'}</strong><span>On approval: dates flow to related sections; sewing period loads to the Gantt draft.</span></div></div></>}</div></section>
  </Shell>;
}
