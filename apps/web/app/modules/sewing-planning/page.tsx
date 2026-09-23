'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type LineMaster = {
  id:string; code:string; name:string;
  floor:{code:string;name:string;section:{code:string;name:string;factory:{code:string;name:string}}};
  machinePools?:{id:string;name:string;machineCount:number;capability?:any;active:boolean}[];
};

const DAY_MS=86400000;

const NFL_LINE_NAMES=['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','ZA'];
const FLOOR_MACHINE_CAPACITY:Record<string,number>={
 'NFL|SEW-1':450,
 'NFL|SEW-2':330,
 'NFL|SEW-3':450,
};

function d(v:any){
 if(!v)return null;
 const x=v instanceof Date?new Date(v.getTime()):new Date(v);
 return Number.isNaN(x.getTime())?null:x;
}
function dateInput(v:any){
 const x=d(v); if(!x)return '';
 const y=x.getFullYear(); const m=String(x.getMonth()+1).padStart(2,'0'); const day=String(x.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}
function fmt(v:any){const x=d(v);return x?x.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—'}
function fmtFull(v:any){const x=d(v);return x?x.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function n(v:any){return Number(v||0).toLocaleString()}
function riskClass(r:string){return r==='CRITICAL'?'gantt-critical':r==='RISK'?'gantt-risk':r==='ON_TRACK'?'gantt-ok':'gantt-normal'}
function addDays(v:Date,days:number){const x=new Date(v);x.setDate(x.getDate()+days);return x}
function daysBetween(a:Date,b:Date){return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/DAY_MS)}
function lineNo(v:string){return Number(String(v||'').match(/(\d+)/)?.[1]||999)}
function masterFactory(l:LineMaster){return l.floor.section.factory.code}
function nflLineIndex(v:string){
 const raw=String(v||'').trim().toUpperCase();
 const exact=NFL_LINE_NAMES.indexOf(raw);
 if(exact>=0)return exact+1;
 const n=lineNo(raw); return Number.isFinite(n)&&n!==999?n:999;
}
function masterLineIndex(l:LineMaster){return lineNo(l.code)!==999?lineNo(l.code):masterFactory(l)==='NFL'?nflLineIndex(l.name):lineNo(l.name)}
function displayLineName(l:LineMaster){
 const idx=masterLineIndex(l);
 if(masterFactory(l)==='NFL'&&idx>=1&&idx<=NFL_LINE_NAMES.length)return NFL_LINE_NAMES[idx-1];
 if(masterFactory(l)==='NCL'&&idx!==999)return `Line ${idx}`;
 return l.name;
}
function lineLabel(l:LineMaster){return `${masterFactory(l)} · ${l.floor.name} · ${displayLineName(l)}`}
function plannedLineMatch(r:any,l:LineMaster){
 const g=r.ganttPlan||{};
 if(g.lineId) return g.lineId===l.id;
 const f=g.factoryCode||'NFL';
 const idx=f==='NFL'?nflLineIndex(g.lineCode):lineNo(g.lineCode);
 return f===masterFactory(l)&&idx===masterLineIndex(l);
}
function floorKey(l:LineMaster){return `${masterFactory(l)}|${l.floor.code}`}
function floorCapacity(factoryCode:string,floorCode:string){return FLOOR_MACHINE_CAPACITY[`${factoryCode}|${floorCode}`]||0}

export default function SewingPlanningPage(){
 const [rows,setRows]=useState<any[]>([]);
 const [lines,setLines]=useState<LineMaster[]>([]);
 const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(''); const [error,setError]=useState('');
 const [view,setView]=useState('JOB'); const [selected,setSelected]=useState<any>(null); const [dragId,setDragId]=useState(''); const [pendingMove,setPendingMove]=useState<{row:any;line:LineMaster}|null>(null);
 const [factory,setFactory]=useState('ALL'); const [floor,setFloor]=useState('ALL'); const [risk,setRisk]=useState('ALL'); const [planStatus,setPlanStatus]=useState('ALL'); const [query,setQuery]=useState('');
 const [windowDays,setWindowDays]=useState(60); const [windowStart,setWindowStart]=useState(dateInput(new Date()));
 const [simHours,setSimHours]=useState(8); const [customHours,setCustomHours]=useState(9);
 const initializedWindow=useRef(false);
 async function load(){try{setError('');const [g,l]=await Promise.all([api('/planning/gantt'),api('/masters/lines')]);setRows(g);setLines((l||[]).filter((x:LineMaster)=>x.floor?.section?.code?.startsWith('SEW')).sort((a:LineMaster,b:LineMaster)=>masterFactory(a).localeCompare(masterFactory(b))||a.floor.code.localeCompare(b.floor.code)||masterLineIndex(a)-masterLineIndex(b)));}catch(e:any){setError(e.message)}}
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(initializedWindow.current||!rows.length)return;const dates=rows.map(r=>d(r.ganttPlan?.startDate)).filter(Boolean) as Date[];if(dates.length){const min=new Date(Math.min(...dates.map(x=>x.getTime())));setWindowStart(dateInput(addDays(min,-2)));}initializedWindow.current=true;},[rows]);
 async function generate(){setBusy(true);try{const r=await api('/planning/gantt/generate',{method:'POST'});setMsg(r.message);await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function update(styleId:string,patch:any){setBusy(true);try{await api(`/planning/gantt/styles/${styleId}`,{method:'PUT',body:JSON.stringify(patch)});setMsg('Gantt draft reviewed and saved.');const data=await api('/planning/gantt');setRows(data);const fresh=data.find((x:any)=>x.styleId===styleId);if(fresh)setSelected(fresh);}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function approve(ids?:string[]){setBusy(true);try{const r=await api('/planning/gantt/approve',{method:'POST',body:JSON.stringify(ids?.length?{styleIds:ids}:{})});setMsg(r.message);await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}

 const planned=rows.filter(r=>r.ganttPlan?.lineCode&&r.ganttPlan?.startDate&&r.ganttPlan?.finishDate);
 const factories=useMemo(()=>Array.from(new Set(lines.map(masterFactory))),[lines]);
 const floors=useMemo(()=>Array.from(new Set(lines.filter(l=>factory==='ALL'||masterFactory(l)===factory).map(l=>`${masterFactory(l)}|${l.floor.code}|${l.floor.name}`))),[lines,factory]);
 const visibleLines=useMemo(()=>lines.filter(l=>(factory==='ALL'||masterFactory(l)===factory)&&(floor==='ALL'||`${masterFactory(l)}|${l.floor.code}|${l.floor.name}`===floor)),[lines,factory,floor]);
 const filteredRows=useMemo(()=>planned.filter(r=>(factory==='ALL'||(r.ganttPlan?.factoryCode||'NFL')===factory)&&(risk==='ALL'||r.ganttPlan?.risk===risk)&&(planStatus==='ALL'||r.ganttPlan?.status===planStatus)&&(!query.trim()||`${r.jobNo} ${r.buyer} ${r.styleNo} ${r.itemDescription}`.toLowerCase().includes(query.trim().toLowerCase()))),[planned,factory,risk,planStatus,query]);
 const wStart=useMemo(()=>d(windowStart)||new Date(),[windowStart]);
 const dates=useMemo(()=>Array.from({length:windowDays},(_,i)=>addDays(wStart,i)),[wStart,windowDays]);
 const DAY_W=50; const timelineWidth=dates.length*DAY_W;
 function machineNeed(r:any){return Math.max(0,Number(r.ieBulletin?.machineQty||r.sectionData?.sewing?.machineQty||r.ganttPlan?.machineQty||0))}
 function activeOnDate(r:any,dt:Date){const s=d(r.ganttPlan?.startDate),f=d(r.ganttPlan?.finishDate);if(!s||!f)return false;const x=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate());const ss=new Date(s.getFullYear(),s.getMonth(),s.getDate());const ff=new Date(f.getFullYear(),f.getMonth(),f.getDate());return x>=ss&&x<=ff}
 function floorUsedOnDate(factoryCode:string,floorCode:string,dt:Date){return planned.filter(r=>(r.ganttPlan?.factoryCode||'NFL')===factoryCode&&r.ganttPlan?.floorCode===floorCode&&activeOnDate(r,dt)).reduce((sum,r)=>sum+machineNeed(r),0)}
 function isFirstFloorLine(line:LineMaster,index:number){return index===0||floorKey(visibleLines[index-1])!==floorKey(line)}
 function isVisible(r:any){const s=d(r.ganttPlan?.startDate),f=d(r.ganttPlan?.finishDate);if(!s||!f)return false;return f>=wStart&&s<=addDays(wStart,windowDays-1)}
 function barStyle(r:any){const s=d(r.ganttPlan.startDate)!,f=d(r.ganttPlan.finishDate)!;const startIndex=daysBetween(wStart,s);const endIndex=daysBetween(wStart,f);const visibleStart=Math.max(0,startIndex);const visibleEnd=Math.min(windowDays-1,endIndex);const left=visibleStart*DAY_W;const width=Math.max(DAY_W,(visibleEnd-visibleStart+1)*DAY_W);return{left:`${left}px`,width:`${width}px`}}
 function label(r:any){if(view==='ITEM')return `${r.itemDescription||'Item'} · ${r.jobNo}`; if(view==='STATUS')return `${r.presentStatus||'Status'} · ${r.jobNo}`; if(view==='BUYER')return `${r.buyer} · ${r.jobNo}`; if(view==='STYLE')return `${r.styleNo} · ${r.jobNo}`; if(view==='RISK')return `${r.ganttPlan?.risk||'—'} · ${r.jobNo}`; if(view==='LINE')return `${r.ganttPlan?.factoryCode||'NFL'} · ${r.ganttPlan?.lineCode||'—'} · ${r.jobNo}`; if(view==='ACTUAL')return `${r.jobNo} · ${n(r.sectionData?.sewing?.productionQty||0)}/${n(r.orderQty)}`; return `${r.jobNo} · ${r.buyer} · ${n(r.orderQty)}`}
 function hoursFor(r:any){return Number(r.ganttPlan?.workingHours||8)}
 function simulate(r:any,hours:number){const base=Math.max(1,Number(r.ganttPlan?.baseDailyTarget||r.ganttPlan?.dailyTarget||1400));const target=Math.max(1,Math.round(base*hours/8));const start=d(r.ganttPlan?.startDate)||new Date();const prodDays=Math.max(1,Math.ceil(Number(r.orderQty||0)/target));const finish=addDays(start,prodDays-1);const ccd=d(r.ccd);const buffer=ccd?daysBetween(finish,ccd):null;return{target,finish,buffer,risk:buffer===null?'UNKNOWN':buffer<0?'CRITICAL':buffer<=2?'RISK':'ON_TRACK'}}
 function effectiveSimHours(){return simHours===99?Math.max(1,Math.min(24,Number(customHours||8))):simHours}
 function drop(line:LineMaster){if(!dragId)return;const row=rows.find(r=>r.styleId===dragId);if(row)setPendingMove({row,line});setDragId('')}
 async function confirmMove(){if(!pendingMove)return;const h=effectiveSimHours();const sim=simulate(pendingMove.row,h);await update(pendingMove.row.styleId,{lineId:pendingMove.line.id,lineCode:displayLineName(pendingMove.line),factoryCode:masterFactory(pendingMove.line),floorCode:pendingMove.line.floor.code,workingHours:h,startDate:dateInput(pendingMove.row.ganttPlan.startDate),finishDate:dateInput(sim.finish),status:'REVIEWED'});setPendingMove(null)}
 const reviewed=planned.filter(r=>['DRAFT','REVIEWED'].includes(r.ganttPlan?.status));
 const unplanned=rows.filter(r=>!r.ganttPlan?.lineCode);
 const summary={draft:planned.filter(r=>r.ganttPlan?.status==='DRAFT').length,reviewed:planned.filter(r=>r.ganttPlan?.status==='REVIEWED').length,approved:planned.filter(r=>r.ganttPlan?.status==='APPROVED').length,risk:planned.filter(r=>r.ganttPlan?.risk==='RISK').length,critical:planned.filter(r=>r.ganttPlan?.risk==='CRITICAL').length};
 const counts=useMemo(()=>({NFL:lines.filter(l=>masterFactory(l)==='NFL').length,NCL:lines.filter(l=>masterFactory(l)==='NCL').length}),[lines]);

 return <Shell title="Sewing Line Planning" eyebrow="Central Planning · T&A approved jobs auto-load here for review">
  <section className="module-hero"><div><span className="status-pill">Central Planning authority</span><h2>Factory-wise Sewing Gantt</h2><p>NFL and NCL use their own master lines. Timeline shows every calendar day, working-hours are simulated before applying, and draft plans require Central Planning approval.</p></div><div className="module-actions"><button className="btn btn-secondary" onClick={()=>document.documentElement.requestFullscreen?.()}>Full Screen</button><button className="btn btn-secondary" disabled={busy} onClick={generate}>Auto Load Approved T&A</button><button className="btn btn-primary" disabled={busy||!reviewed.length} onClick={()=>approve(reviewed.map(r=>r.styleId))}>Approve All Draft / Reviewed</button></div></section>
  {msg&&<div className="notice success-notice">{msg}</div>}{error&&<div className="notice">{error}</div>}

  <section className="gantt-summary-grid">
   <div><span>T&A approved, not loaded</span><strong>{unplanned.length}</strong></div><div><span>Draft</span><strong>{summary.draft}</strong></div><div><span>Reviewed</span><strong>{summary.reviewed}</strong></div><div><span>Approved Official</span><strong>{summary.approved}</strong></div><div><span>Risk</span><strong>{summary.risk}</strong></div><div><span>Critical</span><strong>{summary.critical}</strong></div>
  </section>

  <section className="gantt-control-panel panel">
   <div className="gantt-filter-row">
    <label><span>Factory</span><select value={factory} onChange={e=>{setFactory(e.target.value);setFloor('ALL')}}><option value="ALL">All Factories ({counts.NFL+counts.NCL} lines)</option><option value="NFL">NFL · Northern Fashion Limited ({counts.NFL})</option><option value="NCL">NCL · Northern Clothing Limited ({counts.NCL})</option></select></label>
    <label><span>Floor / Section</span><select value={floor} onChange={e=>setFloor(e.target.value)}><option value="ALL">All Sewing Floors</option>{floors.map(x=>{const [f,,name]=x.split('|');return <option key={x} value={x}>{f} · {name}</option>})}</select></label>
    <label><span>Risk</span><select value={risk} onChange={e=>setRisk(e.target.value)}><option value="ALL">All</option><option value="ON_TRACK">On Track</option><option value="RISK">Risk</option><option value="CRITICAL">Critical</option><option value="UNKNOWN">Unknown</option></select></label>
    <label><span>Plan Status</span><select value={planStatus} onChange={e=>setPlanStatus(e.target.value)}><option value="ALL">All</option><option value="DRAFT">Draft</option><option value="REVIEWED">Reviewed</option><option value="APPROVED">Approved</option></select></label>
    <label className="gantt-search"><span>Job / Buyer / Style</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></label>
    <label><span>Start Date</span><input type="date" value={windowStart} onChange={e=>setWindowStart(e.target.value)}/></label>
    <label><span>Timeline</span><select value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></label>
   </div>
   <div className="gantt-filter-row compact">
    <div className="sim-hours"><b>Working Hours Simulation</b>{[8,10,11,13].map(h=><button key={h} className={simHours===h?'mini-tab active':'mini-tab'} onClick={()=>setSimHours(h)}>{h}H</button>)}<button className={simHours===99?'mini-tab active':'mini-tab'} onClick={()=>setSimHours(99)}>Custom</button>{simHours===99&&<input className="hours-input" type="number" min={1} max={24} step="0.5" value={customHours} onChange={e=>setCustomHours(Number(e.target.value))}/>}<small>Simulation only — never silently changes an approved plan.</small></div>
    <div className="timeline-nav"><button className="btn btn-secondary" onClick={()=>setWindowStart(dateInput(addDays(wStart,-windowDays)))}>← Previous</button><button className="btn btn-secondary" onClick={()=>setWindowStart(dateInput(new Date()))}>Today</button><button className="btn btn-secondary" onClick={()=>setWindowStart(dateInput(addDays(wStart,windowDays)))}>Next →</button></div>
   </div>
  </section>

  <section className="gantt-toolbar panel"><div className="view-switch"><b>View By</b>{[['JOB','Job'],['ITEM','Item'],['STATUS','Present Status'],['BUYER','Buyer'],['STYLE','Style'],['RISK','Risk'],['LINE','Line'],['ACTUAL','Plan vs Actual']].map(([k,l])=><button key={k} className={view===k?'mini-tab active':'mini-tab'} onClick={()=>setView(k)}>{l}</button>)}</div><div className="gantt-legend"><span className="dot planned"></span>Draft <span className="dot ok"></span>On track <span className="dot warn"></span>Risk <span className="dot bad"></span>Critical</div></section>

  <section className="gantt-shell gantt-daily-grid panel">
   <div className="gantt-axis daily" style={{gridTemplateColumns:`210px ${timelineWidth}px`}}><div className="gantt-line-label sticky-head">Factory / Floor / Line</div><div className="gantt-date-axis daily" style={{gridTemplateColumns:`repeat(${dates.length},${DAY_W}px)`}}>{dates.map(dt=><div key={dateInput(dt)} className={dt.getDay()===0?'gantt-day sunday':'gantt-day'}><strong>{dt.getDate()}</strong><span>{dt.toLocaleDateString('en-GB',{month:'short'})}</span><small>{dt.toLocaleDateString('en-GB',{weekday:'short'})}</small></div>)}</div></div>
   {visibleLines.map((line,lineIndex)=><Fragment key={line.id}>
    {isFirstFloorLine(line,lineIndex)&&<div className="gantt-floor-load-row daily" style={{gridTemplateColumns:`210px ${timelineWidth}px`}}><div className="gantt-floor-label"><strong>{masterFactory(line)} · {line.floor.name}</strong><span>Machine load · Max {floorCapacity(masterFactory(line),line.floor.code)||'not configured'}</span></div><div className="gantt-floor-load-cells" style={{gridTemplateColumns:`repeat(${dates.length},${DAY_W}px)`}}>{dates.map(dt=>{const used=floorUsedOnDate(masterFactory(line),line.floor.code,dt);const cap=floorCapacity(masterFactory(line),line.floor.code);const pct=cap?used/cap*100:0;const cls=!cap?'unknown':pct>100?'over':pct>=90?'near':'ok';return <div key={`${floorKey(line)}-${dateInput(dt)}`} className={`floor-machine-cell ${cls}`} title={`${line.floor.name} · ${fmtFull(dt)} · ${used}${cap?` / ${cap}`:''} machines`}><strong>{used}</strong><small>{cap?`/${cap}`:'/—'}</small></div>})}</div></div>}
    <div className="gantt-line-row daily" style={{gridTemplateColumns:`210px ${timelineWidth}px`}} onDragOver={e=>e.preventDefault()} onDrop={()=>drop(line)}><div className="gantt-line-label daily-label"><strong>{displayLineName(line)}</strong><span>{masterFactory(line)} · {line.floor.name}{line.machinePools?.length?` · Config ${line.machinePools.filter(x=>x.active).reduce((s,x)=>s+Number(x.machineCount||0),0)} M/C`:''}</span></div><div className="gantt-lane daily-lane" style={{width:timelineWidth,backgroundSize:`${DAY_W}px 100%`}}>{filteredRows.filter(r=>plannedLineMatch(r,line)&&isVisible(r)).map(r=>{const progress=Math.max(0,Math.min(100,Number(r.sectionData?.sewing?.productionQty||0)/Math.max(1,Number(r.orderQty||0))*100));const machine=machineNeed(r);const remark=r.ganttPlan?.remark||r.sectionData?.sewing?.remark||'—';return <button draggable key={r.styleId} onDragStart={()=>setDragId(r.styleId)} onClick={()=>setSelected(r)} style={barStyle(r)} className={`gantt-bar ${riskClass(r.ganttPlan.risk)} ${r.ganttPlan.status==='APPROVED'?'approved':''}`} title={`${r.jobNo} · ${r.buyer} · ${r.styleNo}
${r.itemDescription||''}
Qty ${n(r.orderQty)} · Machine ${machine||'—'} · ${hoursFor(r)}H
${fmtFull(r.ganttPlan.startDate)}–${fmtFull(r.ganttPlan.finishDate)} · CCD ${fmtFull(r.ccd)}
Status ${r.presentStatus||'—'} · Remark ${remark}`}><div className="actual-overlay" style={{width:`${progress}%`}}></div>{r.itemImageUrl&&<img src={r.itemImageUrl} alt="Item"/>}<span className="gantt-bar-copy">{label(r)}<em>{machine?`${machine} M/C · `:''}{hoursFor(r)}H · {fmt(r.ganttPlan.startDate)}–{fmt(r.ganttPlan.finishDate)}{r.colors?.length?` · ${r.colors.slice(0,3).join(', ')}${r.colors.length>3?' +'+(r.colors.length-3):''}`:''}</em></span><i>{r.ganttPlan.status}</i><span className="gantt-hover-card"><b>{r.jobNo} · {r.buyer}</b><span>{r.styleNo} · {r.itemDescription||'—'}</span><span>Qty: {n(r.orderQty)} pcs</span><span>Machine: {machine||'—'} · Hours: {hoursFor(r)}H</span><span>Plan: {fmtFull(r.ganttPlan.startDate)} → {fmtFull(r.ganttPlan.finishDate)}</span><span>CCD: {fmtFull(r.ccd)} · {r.presentStatus||'—'}</span><span>Remark: {remark}</span><small>Click to review / edit planning detail</small></span></button>})}</div></div>
   </Fragment>)}
  </section>
  {!planned.length&&<div className="empty-state"><strong>No Gantt drafts yet</strong><span>Approve T&A first, then use Auto Load Approved T&A.</span></div>}

  {pendingMove&&<div className="gantt-move-preview panel"><div><span className="status-pill">Move preview</span><h3>{pendingMove.row.jobNo} → {lineLabel(pendingMove.line)}</h3><p>Central Planning must confirm before the line move is saved.</p></div>{(()=>{const s=simulate(pendingMove.row,effectiveSimHours());return <div className="move-preview-grid"><div><span>Hours</span><strong>{effectiveSimHours()}H</strong></div><div><span>Daily Target</span><strong>{n(s.target)}</strong></div><div><span>Expected Finish</span><strong>{fmtFull(s.finish)}</strong></div><div><span>CCD</span><strong>{fmtFull(pendingMove.row.ccd)}</strong></div><div><span>Buffer</span><strong>{s.buffer===null?'—':`${s.buffer} days`}</strong></div><div><span>Risk</span><strong>{s.risk}</strong></div></div>})()}<div className="gantt-drawer-actions"><button className="btn btn-secondary" onClick={()=>setPendingMove(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={confirmMove}>Confirm Move</button></div></div>}

  {selected&&<div className="gantt-drawer panel"><div className="panel-head"><div><div className="panel-title">{selected.jobNo} · {selected.styleNo}</div><div className="panel-sub">{selected.buyer} · {selected.itemDescription} · {n(selected.orderQty)} pcs</div></div><button className="btn btn-secondary" onClick={()=>setSelected(null)}>Close</button></div><div className="gantt-detail-grid">
   <label><span>Factory</span><select value={selected.ganttPlan?.factoryCode||'NFL'} onChange={e=>{const targetFactory=e.target.value;const first=lines.find(l=>masterFactory(l)===targetFactory);setSelected({...selected,ganttPlan:{...selected.ganttPlan,factoryCode:targetFactory,lineId:first?.id||'',lineCode:first?displayLineName(first):'',floorCode:first?.floor.code||''}})}}>{factories.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
   <label><span>Line</span><select value={selected.ganttPlan?.lineId||''} onChange={e=>{const l=lines.find(x=>x.id===e.target.value);if(l)setSelected({...selected,ganttPlan:{...selected.ganttPlan,lineId:l.id,lineCode:displayLineName(l),factoryCode:masterFactory(l),floorCode:l.floor.code}})}}>{lines.filter(l=>masterFactory(l)===(selected.ganttPlan?.factoryCode||'NFL')).map(l=><option key={l.id} value={l.id}>{l.floor.name} · {displayLineName(l)}</option>)}</select></label>
   <label><span>Working Hours</span><select value={Number(selected.ganttPlan?.workingHours||8)} onChange={e=>{const h=Number(e.target.value);const sim=simulate(selected,h);setSelected({...selected,ganttPlan:{...selected.ganttPlan,workingHours:h,dailyTarget:sim.target,finishDate:dateInput(sim.finish),bufferDays:sim.buffer,risk:sim.risk}})}}>{[8,10,11,13].map(h=><option key={h} value={h}>{h}H</option>)}</select></label>
   <label><span>Start</span><input type="date" value={dateInput(selected.ganttPlan?.startDate)} onChange={e=>setSelected({...selected,ganttPlan:{...selected.ganttPlan,startDate:e.target.value}})}/></label>
   <label><span>Finish</span><input type="date" value={dateInput(selected.ganttPlan?.finishDate)} onChange={e=>setSelected({...selected,ganttPlan:{...selected.ganttPlan,finishDate:e.target.value}})}/></label>
   <label className="gantt-remark-field"><span>Planner Remark</span><textarea value={selected.ganttPlan?.remark||''} onChange={e=>setSelected({...selected,ganttPlan:{...selected.ganttPlan,remark:e.target.value}})} placeholder="Planning remark / change reason"/></label>
   <div><span>CCD</span><strong>{fmtFull(selected.ccd)}</strong></div><div><span>Daily Target</span><strong>{n(selected.ganttPlan?.dailyTarget)}</strong></div><div><span>Buffer</span><strong>{selected.ganttPlan?.bufferDays??'—'} days</strong></div><div><span>Risk</span><strong>{selected.ganttPlan?.risk||'—'}</strong></div><div><span>Status</span><strong>{selected.ganttPlan?.status}</strong></div><div><span>IE SMV</span><strong>{selected.ieBulletin?.smv??'—'}</strong></div><div><span>Machine Need</span><strong>{selected.ieBulletin?.machineQty??'—'}</strong></div>
  </div><div className="gantt-drawer-actions"><button className="btn btn-secondary" disabled={busy} onClick={()=>update(selected.styleId,{lineId:selected.ganttPlan.lineId,lineCode:selected.ganttPlan.lineCode,factoryCode:selected.ganttPlan.factoryCode,floorCode:selected.ganttPlan.floorCode,workingHours:Number(selected.ganttPlan.workingHours||8),startDate:dateInput(selected.ganttPlan.startDate),finishDate:dateInput(selected.ganttPlan.finishDate),remark:selected.ganttPlan?.remark||'',status:'REVIEWED'})}>Save Review</button>{selected.ganttPlan?.status!=='APPROVED'&&<button className="btn btn-primary" disabled={busy} onClick={()=>approve([selected.styleId])}>Approve Official Plan</button>}</div></div>}
 </Shell>
}
