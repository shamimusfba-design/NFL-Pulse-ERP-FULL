'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type FormState = {
  sampleCollected: boolean;
  sampleRemarks: string;
  operationNotes: string;
  smv: string;
  manpower: string;
  machineQty: string;
  achievableEfficiency: string;
  dailyTarget: string;
  remarks: string;
};

const emptyForm: FormState = { sampleCollected:false, sampleRemarks:'', operationNotes:'', smv:'', manpower:'', machineQty:'', achievableEfficiency:'', dailyTarget:'', remarks:'' };

function firstCcd(style:any){ return (style?.purchaseOrders||[]).map((p:any)=>p.ccd).filter(Boolean).sort()[0] || null; }
function fmtDate(v:any){ if(!v) return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}); }
function num(v:any){ return Number(v||0).toLocaleString(); }

export default function IeBulletinPage(){
  const [rows,setRows]=useState<any[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [filter,setFilter]=useState<'PENDING'|'COMPLETED'|'ALL'>('PENDING');
  const [form,setForm]=useState<FormState>(emptyForm);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  async function load(preferred?:string){
    setLoading(true); setError('');
    try{
      const data=await api('/ie/workqueue');
      setRows(data);
      const next=preferred || selectedId || data.find((x:any)=>x.status!=='COMPLETED')?.style?.id || data[0]?.style?.id || '';
      setSelectedId(next);
      const selected=data.find((x:any)=>x.style?.id===next);
      if(selected) hydrate(selected);
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  }

  function hydrate(row:any){
    const b=row?.style?.ieBulletin || {};
    setForm({
      sampleCollected:Boolean(b.sampleCollected), sampleRemarks:b.sampleRemarks||'', operationNotes:b.operationNotes||'',
      smv:b.smv?String(b.smv):'', manpower:b.manpower?String(b.manpower):'', machineQty:b.machineQty?String(b.machineQty):'',
      achievableEfficiency:b.achievableEfficiency?String(b.achievableEfficiency):'', dailyTarget:b.dailyTarget?String(b.dailyTarget):'', remarks:b.remarks||'',
    });
  }
  useEffect(()=>{load()},[]);

  const selected=useMemo(()=>rows.find((x:any)=>x.style?.id===selectedId)||null,[rows,selectedId]);
  const visible=useMemo(()=>rows.filter((x:any)=>filter==='ALL'||(filter==='COMPLETED'?x.status==='COMPLETED':x.status!=='COMPLETED')),[rows,filter]);
  function choose(row:any){setSelectedId(row.style.id);hydrate(row);setMessage('');setError('')}
  function set<K extends keyof FormState>(key:K,value:FormState[K]){setForm(prev=>({...prev,[key]:value}))}

  async function save(){
    if(!selected) return;
    setSaving(true);setMessage('');setError('');
    try{
      const body:any={
        sampleCollected:form.sampleCollected, sampleRemarks:form.sampleRemarks, operationNotes:form.operationNotes,
        smv:Number(form.smv), manpower:Number(form.manpower), machineQty:Number(form.machineQty), achievableEfficiency:Number(form.achievableEfficiency),
        remarks:form.remarks,
      };
      if(form.dailyTarget) body.dailyTarget=Number(form.dailyTarget);
      const result=await api(`/ie/styles/${selected.style.id}/bulletin`,{method:'PUT',body:JSON.stringify(body)});
      setMessage(result.message||'IE Bulletin saved');
      await load(selected.style.id);
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  return <Shell title="IE / Operation Bulletin" eyebrow="Industrial Production Engineering · confirmed order creates IE pending work">
    <section className="module-hero ie-hero">
      <div><span className="status-pill">Working foundation</span><h2>IE Bulletin Work Queue</h2><p>Confirmed Order হলে Style-wise IE task automatically আসে। Merchandiser-এর item image দেখবে; image না থাকলে physical sample collect করে bulletin complete করবে.</p></div>
      <div className="module-actions"><a className="btn btn-secondary" href="/tasks">My Pending Tasks</a></div>
    </section>
    {message&&<div className="notice success-notice">{message}</div>}{error&&<div className="notice">{error}</div>}

    <section className="ta-layout ie-layout">
      <div className="panel ta-queue-panel">
        <div className="panel-head"><div><div className="panel-title">IE Pending Jobs</div><div className="panel-sub">Job / Style based work queue</div></div><span className="status-pill neutral">{loading?'Loading…':rows.length}</span></div>
        <div className="ta-filter-row"><button className={filter==='PENDING'?'mini-tab active':'mini-tab'} onClick={()=>setFilter('PENDING')}>Pending</button><button className={filter==='COMPLETED'?'mini-tab active':'mini-tab'} onClick={()=>setFilter('COMPLETED')}>Completed</button><button className={filter==='ALL'?'mini-tab active':'mini-tab'} onClick={()=>setFilter('ALL')}>All</button></div>
        <div className="ta-job-list">
          {visible.map((row:any)=><button key={row.style.id} className={`ta-job-card ${selectedId===row.style.id?'active':''}`} onClick={()=>choose(row)}>
            <div><strong>{row.jobNo} · {row.style.styleNo}</strong><span>{row.buyer?.name||'—'} · {row.style.itemDescription||'—'}</span></div>
            <small>{num(row.style.quantity)} pcs · CCD {fmtDate(firstCcd(row.style))}</small><i className={`ta-state ${row.status==='COMPLETED'?'approved':'pending'}`}>{row.status}</i>
          </button>)}
          {!loading&&!visible.length&&<div className="empty-state compact"><strong>No IE jobs in this view</strong><span>New confirmed orders will appear automatically.</span></div>}
        </div>
      </div>

      <div className="panel ta-editor-panel">
        {!selected?<div className="workspace-empty"><div className="workspace-symbol">IE</div><div><strong>Select a Job / Style</strong><span>Item reference and bulletin fields will open here.</span></div></div>:<>
          <div className="panel-head"><div><div className="panel-title">{selected.jobNo} · {selected.style.styleNo}</div><div className="panel-sub">{selected.buyer?.name} · {selected.style.itemDescription||'—'} · {num(selected.style.quantity)} pcs</div></div><span className={`status-pill ${selected.status==='COMPLETED'?'good':'neutral'}`}>{selected.status}</span></div>

          <div className="ie-reference-grid">
            <div className="ie-image-card">
              <div className="field-label">Merchandiser Item Reference</div>
              {selected.style.itemImageUrl?<img src={selected.style.itemImageUrl} alt={selected.style.itemDescription||selected.style.styleNo}/>:<div className="ie-no-image">No item image uploaded</div>}
              <div className="ie-reference-note">Image থাকলে IE এই reference ব্যবহার করবে। Image না থাকলে নিচে Physical Sample Collected mark করতে হবে.</div>
            </div>
            <div className="ie-sample-card">
              <label className="check-row"><input type="checkbox" checked={form.sampleCollected} onChange={e=>set('sampleCollected',e.target.checked)}/><span>Physical Sample Collected</span></label>
              <label><span>Sample / Reference Note</span><textarea value={form.sampleRemarks} onChange={e=>set('sampleRemarks',e.target.value)} placeholder="Sample collected from / reference detail"/></label>
              <label><span>Operation / Bulletin Note</span><textarea value={form.operationNotes} onChange={e=>set('operationNotes',e.target.value)} placeholder="Operation bulletin preparation note"/></label>
            </div>
          </div>

          <div className="ie-form-grid">
            <label><span>SMV</span><input type="number" step="0.01" min="0" value={form.smv} onChange={e=>set('smv',e.target.value)}/></label>
            <label><span>Manpower</span><input type="number" min="1" value={form.manpower} onChange={e=>set('manpower',e.target.value)}/></label>
            <label><span>Machine Qty</span><input type="number" min="1" value={form.machineQty} onChange={e=>set('machineQty',e.target.value)}/></label>
            <label><span>Est. Achievable Efficiency %</span><input type="number" min="1" max="100" step="0.1" value={form.achievableEfficiency} onChange={e=>set('achievableEfficiency',e.target.value)}/></label>
            <label><span>Daily Target (optional now)</span><input type="number" min="1" value={form.dailyTarget} onChange={e=>set('dailyTarget',e.target.value)}/></label>
            <label className="span-2"><span>IE Remarks</span><input value={form.remarks} onChange={e=>set('remarks',e.target.value)} placeholder="Relevant IE remark"/></label>
          </div>
          <div className="ta-rule-note"><strong>Current foundation:</strong> SMV, manpower, machine, achievable efficiency and optional daily target are saved style-wise. Exact operation-by-operation bulletin columns will be mapped from your actual IE Bulletin report without inventing extra fields.</div>
          <div className="form-actions"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?'Saving…':'Complete IE Bulletin'}</button></div>
        </>}
      </div>
    </section>
  </Shell>
}
