'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { displayJobNo } from '../../../lib/display';

type FollowStatus='ALL'|'MISSING'|'PENDING'|'REVISED'|'DONE';
type WeeklyFilter='ALL'|'SHORTAGE';
type MachineRequirement={machineType:string;qty:string};
type FormState={
  bulletinDate:string; revision:string; smv:string; dailyTarget:string; operator:string; helper:string; finishingManpower:string; totalManpower:string;
  machineQty:string; achievableEfficiency:string; remarks:string; machineRequirements:MachineRequirement[];
};
const emptyForm:FormState={bulletinDate:'',revision:'1',smv:'',dailyTarget:'',operator:'',helper:'',finishingManpower:'',totalManpower:'',machineQty:'',achievableEfficiency:'65',remarks:'',machineRequirements:[]};
function dateInput(v:any){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmtDate(v:any){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})}
function n(v:any){return Number(v||0).toLocaleString()}
function tone(status:string){return status==='DONE'?'good':status==='REVISED'?'warn':status==='MISSING'?'bad':'neutral'}
function machineTotal(rows:MachineRequirement[]){return rows.reduce((s,x)=>s+Math.max(0,Number(x.qty||0)),0)}
function mpTotal(f:FormState){const split=Number(f.operator||0)+Number(f.helper||0)+Number(f.finishingManpower||0);return Number(f.totalManpower||0)||split}
function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function weeklyTone(status:string){return status==='SHORTAGE'?'bad':status==='AVAILABLE'?'good':'neutral'}
function affectedJobs(jobs:any[]){const seen=new Set<string>();const parts:string[]=[];for(const j of jobs||[]){const key=`${j.line}|${j.jobNo}|${j.styleNo}`;if(seen.has(key))continue;seen.add(key);parts.push(`${j.line} · ${j.jobNo}/${j.styleNo}`)}return parts.join(' · ')}

export default function IeBulletinPage(){
  const [rows,setRows]=useState<any[]>([]); const [selectedId,setSelectedId]=useState(''); const [filter,setFilter]=useState<FollowStatus>('ALL'); const [q,setQ]=useState('');
  const [form,setForm]=useState<FormState>(emptyForm); const [files,setFiles]=useState<File[]>([]); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState(''); const [error,setError]=useState('');
  const [weekly,setWeekly]=useState<any>(null); const [weeklyStart,setWeeklyStart]=useState(localToday()); const [weeklyFactory,setWeeklyFactory]=useState('NFL'); const [weeklyFilter,setWeeklyFilter]=useState<WeeklyFilter>('ALL'); const [weeklyLoading,setWeeklyLoading]=useState(false); const [weeklyError,setWeeklyError]=useState('');

  async function load(preferred?:string){setLoading(true);setError('');try{const data=await api('/ie/workqueue');setRows(data||[]);const next=preferred||selectedId||data?.find((x:any)=>x.followUp?.status!=='DONE')?.style?.id||data?.[0]?.style?.id||'';setSelectedId(next);const row=data?.find((x:any)=>x.style?.id===next);if(row)hydrate(row)}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  async function loadWeekly(){setWeeklyLoading(true);setWeeklyError('');try{setWeekly(await api(`/maintenance/weekly-requirement?startDate=${encodeURIComponent(weeklyStart)}&factory=${encodeURIComponent(weeklyFactory)}`))}catch(e:any){setWeeklyError(e.message)}finally{setWeeklyLoading(false)}}
  useEffect(()=>{load()},[]);
  useEffect(()=>{loadWeekly()},[weeklyStart,weeklyFactory]);
  function hydrate(row:any){const b=row?.style?.ieBulletin||{};const req=Array.isArray(b.machineRequirements)?b.machineRequirements:[];setForm({bulletinDate:dateInput(b.bulletinDate||b.releaseDate||b.updatedAt),revision:String(b.revision||1),smv:b.smv?String(b.smv):'',dailyTarget:b.dailyTarget?String(b.dailyTarget):'',operator:b.operator!==undefined&&b.operator!==null?String(b.operator):'',helper:b.helper!==undefined&&b.helper!==null?String(b.helper):'',finishingManpower:b.finishingManpower!==undefined&&b.finishingManpower!==null?String(b.finishingManpower):'',totalManpower:b.manpower?String(b.manpower):'',machineQty:b.machineQty?String(b.machineQty):'',achievableEfficiency:String(b.achievableEfficiencyPct||b.achievableEfficiency||65),remarks:b.remarks||'',machineRequirements:req.map((x:any)=>({machineType:x.machineType||'',qty:String(x.qty??'')}))})}
  const selected=useMemo(()=>rows.find((x:any)=>x.style?.id===selectedId)||null,[rows,selectedId]);
  const visible=useMemo(()=>rows.filter((r:any)=>{const status=r.followUp?.status||'MISSING';if(filter!=='ALL'&&status!==filter)return false;const s=q.trim().toLowerCase();return !s||`${r.jobNo} ${r.style?.styleNo} ${r.style?.itemDescription||''} ${r.followUp?.line||''}`.toLowerCase().includes(s)}),[rows,filter,q]);
  const counts=useMemo(()=>({total:rows.length,done:rows.filter(x=>x.followUp?.status==='DONE').length,pending:rows.filter(x=>x.followUp?.status==='PENDING').length,missing:rows.filter(x=>x.followUp?.status==='MISSING').length,revised:rows.filter(x=>x.followUp?.status==='REVISED').length}),[rows]);
  const weeklyRows=useMemo(()=>{const all=(weekly?.days||[]).flatMap((d:any)=>(d.rows||[]).map((r:any)=>({...r,date:d.date,dayLabel:d.dayLabel,dayShortageQty:d.shortageQty})));return weeklyFilter==='SHORTAGE'?all.filter((r:any)=>Number(r.shortageQty)>0):all},[weekly,weeklyFilter]);
  function choose(row:any){setSelectedId(row.style.id);hydrate(row);setMsg('');setError('')}
  function set<K extends keyof FormState>(key:K,value:FormState[K]){setForm(prev=>({...prev,[key]:value}))}
  function updateMachine(i:number,key:keyof MachineRequirement,value:string){setForm(prev=>({...prev,machineRequirements:prev.machineRequirements.map((x,n)=>n===i?{...x,[key]:value}:x)}))}
  function addMachine(){setForm(prev=>({...prev,machineRequirements:[...prev.machineRequirements,{machineType:'',qty:''}]}))}
  function removeMachine(i:number){setForm(prev=>({...prev,machineRequirements:prev.machineRequirements.filter((_,n)=>n!==i)}))}

  async function save(action:'SAVE_DRAFT'|'RELEASE'){
    if(!selected)return;setBusy(true);setMsg('');setError('');
    try{
      const reqs=form.machineRequirements.filter(x=>x.machineType.trim()&&Number(x.qty)>0).map(x=>({machineType:x.machineType.trim(),qty:Number(x.qty)}));
      const totalMachine=Number(form.machineQty||0)||machineTotal(form.machineRequirements);
      const totalManpower=mpTotal(form);
      if(!Number(form.smv)||!Number(form.dailyTarget)||!totalManpower||!totalMachine)throw new Error('SMV, standard target, required manpower and required machine are required.');
      await api(`/ie/styles/${selected.style.id}/bulletin`,{method:'PUT',body:JSON.stringify({action,bulletinDate:form.bulletinDate||undefined,revision:Number(form.revision||1),smv:Number(form.smv),dailyTarget:Number(form.dailyTarget),operator:Number(form.operator||0),helper:Number(form.helper||0),finishingManpower:Number(form.finishingManpower||0),totalManpower,manpower:totalManpower,machineQty:totalMachine,machineRequirements:reqs,achievableEfficiency:Number(form.achievableEfficiency||65),workingHours:8,remarks:form.remarks})});
      setMsg(action==='RELEASE'?'IE Bulletin released to Planning/Gantt.':'IE Bulletin draft saved.'); await load(selected.style.id);
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  async function bulkImport(){
    if(!files.length)return;setBusy(true);setMsg('');setError('');let ok=0;const failed:string[]=[];
    for(const file of files){
      try{const fd=new FormData();fd.append('file',file);fd.append('reportType','IE_BULLETIN');const preview=await api('/imports/preview',{method:'POST',body:fd});if(preview.reportType!=='IE_BULLETIN'||!preview.validRows)throw new Error('IE Bulletin data not detected');await api(`/imports/${preview.batchId}/commit`,{method:'POST'});ok++}catch(e:any){failed.push(`${file.name}: ${e.message}`)}
    }
    if(ok)setMsg(`${ok} IE Bulletin file(s) imported and released to ERP.`);if(failed.length)setError(failed.join(' · '));setFiles([]);await load();setBusy(false);
  }

  return <Shell title="IE Bulletin" eyebrow="Central IE · Bulk bulletin import, follow-up and operational requirement">
    <section className="module-hero"><div><span className="status-pill">v0.4.35 · Central IE</span><h2>IE Bulletin Import & Follow-up</h2><p>Centralized IE bulletin data for Planning, Sewing, and Maintenance: SMV, standard targets, manpower, and machine requirements across all active styles.</p></div><div className="module-actions"><a className="btn btn-secondary" href="/modules/sewing-planning">Open Sewing Gantt</a><a className="btn btn-secondary" href="/modules/data-import">Import Audit</a></div></section>
    {msg&&<div className="notice success-notice">{msg}</div>}{error&&<div className="notice">{error}</div>}

    <section className="ie-kpi-row"><div><span>Total Jobs</span><strong>{counts.total}</strong></div><div><span>Done</span><strong>{counts.done}</strong></div><div><span>Pending</span><strong>{counts.pending}</strong></div><div><span>Missing</span><strong>{counts.missing}</strong></div><div><span>Revised</span><strong>{counts.revised}</strong></div></section>

    <section className="panel"><div className="panel-head"><div><div className="panel-title">Weekly Machine Requirement Plan · Next 7 Days</div><div className="panel-sub">Gantt running plan + released IE Bulletin machine type requirement + latest Maintenance machine availability. Detailed breakdown of machine type shortages and available status.</div></div><span className={`status-pill ${Number(weekly?.summary?.shortageTypes||0)>0?'bad':'good'}`}>{weeklyLoading?'Loading…':`${weekly?.summary?.shortageTypes||0} shortage type(s)`}</span></div>
      {weeklyError&&<div className="notice">{weeklyError}</div>}
      <div className="ta-filter-row"><label>Start Date <input type="date" value={weeklyStart} onChange={e=>setWeeklyStart(e.target.value)}/></label><label>Factory <select value={weeklyFactory} onChange={e=>setWeeklyFactory(e.target.value)}><option value="NFL">NFL</option><option value="NCL">NCL</option></select></label>{(['ALL','SHORTAGE'] as WeeklyFilter[]).map(x=><button key={x} className={weeklyFilter===x?'mini-tab active':'mini-tab'} onClick={()=>setWeeklyFilter(x)}>{x==='ALL'?'All Required Types':'Shortage Only'}</button>)}<button className="btn btn-secondary" disabled={weeklyLoading} onClick={loadWeekly}>Refresh Data</button></div>
      <section className="ie-kpi-row maintenance-kpi-row"><div><span>Shortage Types</span><strong>{n(weekly?.summary?.shortageTypes)}</strong></div><div><span>Peak Daily Shortage</span><strong>{n(weekly?.summary?.peakShortageQty)}</strong></div><div><span>Days with Shortage</span><strong>{n(weekly?.summary?.daysWithShortage)}</strong></div><div><span>Affected Lines</span><strong>{n(weekly?.summary?.affectedLines)}</strong></div><div><span>Affected Jobs</span><strong>{n(weekly?.summary?.affectedJobs)}</strong></div></section>
      <div className="table-scroll"><table className="data-table compact-table"><thead><tr><th>Date</th><th>Machine Type</th><th>Required</th><th>Factory Total</th><th>Breakdown</th><th>Rent</th><th>Net Available</th><th>Short / Available</th><th>Affected Line / Job</th><th>Maintenance Data</th></tr></thead><tbody>{weeklyRows.map((r:any,i:number)=><tr key={`${r.date}-${r.normalizedKey}-${i}`}><td><strong>{r.dayLabel||r.date}</strong></td><td><strong>{r.machineType}</strong></td><td>{n(r.requiredQty)}</td><td>{n(r.totalQty)}</td><td>{n(r.breakdownQty)}</td><td>{n(r.rentQty)}</td><td><strong>{n(r.netAvailableQty)}</strong></td><td><span className={`status-pill ${weeklyTone(r.status)}`}>{r.shortageQty>0?`Short ${n(r.shortageQty)}`:r.surplusQty>0?`Available ${n(r.surplusQty)}`:'Balanced'}</span></td><td>{affectedJobs(r.jobs)||'—'}</td><td>{r.maintenanceSourceDate||'Machine Master'}</td></tr>)}{!weeklyLoading&&!weeklyRows.length&&<tr><td colSpan={10}>No Gantt machine requirement found for this 7-day window.</td></tr>}</tbody></table></div>
      <div className="panel-note">Availability = Factory Total − Breakdown + Rent. Future-day availability uses the latest Maintenance actual available on or before that date; if no daily report exists, Machine Master total is used.</div>
    </section>

    <section className="panel import-panel"><div className="panel-head"><div><div className="panel-title">Monthly / bulk IE Bulletin upload</div><div className="panel-sub">Select multiple .xls/.xlsx/.xlsm files together. Job & Style named individual bulletins and configured monthly IE summary sheets are supported.</div></div><span className="status-pill neutral">{files.length} file(s)</span></div>
      <div className="import-grid"><label>IE Bulletin files<input type="file" multiple accept=".xls,.xlsx,.xlsm" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><button className="btn btn-primary" disabled={busy||!files.length} onClick={bulkImport}>{busy?'Importing…':'Import Data'}</button></div>
      {!!files.length&&<div className="panel-note">{files.slice(0,6).map(x=>x.name).join(' · ')}{files.length>6?` · +${files.length-6} more`:''}</div>}
    </section>

    <section className="panel"><div className="panel-head"><div><div className="panel-title">Central IE Bulletin Follow-up Tracker</div><div className="panel-sub">Planning job list vs imported/released IE Bulletin.</div></div><span className="status-pill neutral">{loading?'Loading…':visible.length}</span></div>
      <div className="ta-filter-row">{(['ALL','MISSING','PENDING','REVISED','DONE'] as FollowStatus[]).map(x=><button key={x} className={filter===x?'mini-tab active':'mini-tab'} onClick={()=>setFilter(x)}>{x}</button>)}<input style={{minWidth:220}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Job / Style / Line"/></div>
      <div className="table-scroll"><table className="data-table compact-table"><thead><tr><th>Job</th><th>Style</th><th>Line</th><th>Plan Month</th><th>Bulletin Date</th><th>Rev</th><th>SMV</th><th>Std. Target</th><th>Req. MP</th><th>Req. M/C</th><th>Status</th><th>Pending Days</th></tr></thead><tbody>{visible.map((r:any)=><tr key={r.style.id} onClick={()=>choose(r)} style={{cursor:'pointer'}}><td><strong>{displayJobNo(r.jobNo,r.buyer?.code||r.buyer?.name)}</strong></td><td>{r.style.styleNo}</td><td>{r.followUp?.line||'—'}</td><td>{r.followUp?.planMonth||'—'}</td><td>{fmtDate(r.followUp?.bulletinDate)}</td><td>{r.followUp?.revision||1}</td><td>{r.style.ieBulletin?.smv||'—'}</td><td>{n(r.style.ieBulletin?.dailyTarget)||'—'}</td><td>{r.style.ieBulletin?.manpower||'—'}</td><td>{r.style.ieBulletin?.machineQty||'—'}</td><td><span className={`status-pill ${tone(r.followUp?.status)}`}>{r.followUp?.status||'MISSING'}</span></td><td>{r.followUp?.pendingDays??0}</td></tr>)}{!visible.length&&<tr><td colSpan={12}>No matching jobs.</td></tr>}</tbody></table></div>
    </section>

    {selected&&<section className="panel"><div className="panel-head"><div><div className="panel-title">{displayJobNo(selected.jobNo,selected.buyer?.code||selected.buyer?.name)} · {selected.style.styleNo}</div><div className="panel-sub">Operational IE summary · source file: {selected.followUp?.sourceFileName||'manual / legacy'}</div></div><span className={`status-pill ${tone(selected.followUp?.status)}`}>{selected.followUp?.status}</span></div>
      <div className="gantt-detail-grid">
        <label><span>Bulletin Date</span><input type="date" value={form.bulletinDate} onChange={e=>set('bulletinDate',e.target.value)}/></label>
        <label><span>Revision</span><input type="number" min="1" value={form.revision} onChange={e=>set('revision',e.target.value)}/></label>
        <label><span>SMV</span><input type="number" min="0.01" step="0.01" value={form.smv} onChange={e=>set('smv',e.target.value)}/></label>
        <label><span>Standard Daily Target</span><input type="number" min="1" value={form.dailyTarget} onChange={e=>set('dailyTarget',e.target.value)}/></label>
        <label><span>Operator</span><input type="number" min="0" value={form.operator} onChange={e=>set('operator',e.target.value)}/></label>
        <label><span>Helper</span><input type="number" min="0" value={form.helper} onChange={e=>set('helper',e.target.value)}/></label>
        <label><span>Finishing Manpower</span><input type="number" min="0" value={form.finishingManpower} onChange={e=>set('finishingManpower',e.target.value)}/></label>
        <label><span>Total Required Manpower</span><input type="number" min="1" value={form.totalManpower} onChange={e=>set('totalManpower',e.target.value)} placeholder={String(mpTotal(form)||0)}/></label>
        <label><span>Total Required Machine</span><input type="number" min="1" value={form.machineQty} onChange={e=>set('machineQty',e.target.value)} placeholder={String(machineTotal(form.machineRequirements)||0)}/></label>
        <label><span>Benchmark Efficiency %</span><input type="number" min="1" max="100" step="0.1" value={form.achievableEfficiency} onChange={e=>set('achievableEfficiency',e.target.value)}/></label>
        <label className="gantt-remark-field"><span>Remarks</span><textarea value={form.remarks} onChange={e=>set('remarks',e.target.value)} placeholder="IE remarks"/></label>
      </div>
      <div className="planner-popup-section compact-section"><div className="panel-head"><div><div className="panel-title">Machine type-wise requirement</div><div className="panel-sub">Used for maintenance changeover and machine requirement calculations.</div></div><button type="button" className="btn btn-secondary" onClick={addMachine}>Add Machine Type</button></div>
        <div className="table-scroll"><table className="data-table compact-table"><thead><tr><th>Machine Type</th><th>Qty</th><th></th></tr></thead><tbody>{form.machineRequirements.map((x,i)=><tr key={i}><td><input value={x.machineType} onChange={e=>updateMachine(i,'machineType',e.target.value)} placeholder="SNLS / 4T OL / Flatlock…"/></td><td><input type="number" min="0" value={x.qty} onChange={e=>updateMachine(i,'qty',e.target.value)}/></td><td><button className="btn btn-secondary" type="button" onClick={()=>removeMachine(i)}>Remove</button></td></tr>)}{!form.machineRequirements.length&&<tr><td colSpan={3}>No type-wise machine detail imported yet. Total machine can still be saved.</td></tr>}</tbody></table></div>
      </div>
      <div className="module-actions"><button className="btn btn-secondary" disabled={busy} onClick={()=>save('SAVE_DRAFT')}>Save Changes</button><button className="btn btn-primary" disabled={busy} onClick={()=>save('RELEASE')}>Submit for Approval</button></div>
    </section>}
  </Shell>
}
