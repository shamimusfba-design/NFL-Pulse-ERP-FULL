'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { displayJobNo } from '../../../lib/display';

type AllocationRow={purchaseOrderId:string;color:string;colorCode?:string|null;size:string;qty:number;remainingQty:number;reference:string};
function n(v:any){return Number(v||0).toLocaleString();}
function d(v:any){if(!v)return 'No date';const dt=new Date(v+'T00:00:00');return Number.isNaN(dt.getTime())?String(v):dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}

function matrix(rows:AllocationRow[]){
  const map=new Map<string,{color:string;colorCode?:string|null;sizes:Record<string,number>;totalQty:number}>();
  const sizes:string[]=[];
  for(const r of rows){
    if(r.qty<=0)continue;
    if(!sizes.includes(r.size))sizes.push(r.size);
    const key=`${r.color}|||${r.colorCode||''}`;
    const x=map.get(key)||{color:r.color,colorCode:r.colorCode,sizes:{},totalQty:0};
    x.sizes[r.size]=(x.sizes[r.size]||0)+r.qty;x.totalQty+=r.qty;map.set(key,x);
  }
  const colors=[...map.values()];
  return {sizes,colors,totalQty:colors.reduce((s,x)=>s+x.totalQty,0)};
}

function ReferenceSizeMatrix({rows}:{rows:any[]}){
  const normalized=(rows||[]).map((r:any)=>({purchaseOrderId:r.purchaseOrderId||'',color:r.color,colorCode:r.colorCode,size:r.size,qty:Number(r.qty||0),remainingQty:Number(r.remainingQty??r.qty??0),reference:''}));
  const m=matrix(normalized);
  if(!m.colors.length)return <div className="muted" style={{marginTop:6,fontSize:12}}>No size-wise breakdown stored.</div>;
  return <div className="wide-table-wrap" style={{marginTop:8}}><table className="table lot-matrix compact-matrix"><thead><tr><th>Color</th>{m.sizes.map(s=><th key={s}>{s}</th>)}<th>Total</th></tr></thead><tbody>{m.colors.map(c=><tr key={`${c.color}-${c.colorCode||''}`}><td>{c.colorCode?`${c.colorCode} · `:''}{c.color}</td>{m.sizes.map(size=><td key={size}>{n(c.sizes[size]||0)}</td>)}<td><strong>{n(c.totalQty)}</strong></td></tr>)}</tbody></table></div>;
}

export default function ProductionLotsPage(){
  const [styleRows,setStyleRows]=useState<any[]>([]),[selectedStyle,setSelectedStyle]=useState<any|null>(null),[overview,setOverview]=useState<any|null>(null);
  const [query,setQuery]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
  const [selected,setSelected]=useState<string[]>([]),[partial,setPartial]=useState(false),[allocations,setAllocations]=useState<AllocationRow[]>([]);
  const [lotName,setLotName]=useState(''),[shipDate,setShipDate]=useState(''),[notes,setNotes]=useState(''),[saving,setSaving]=useState(false);
  const [user,setUser]=useState<any>(null);
  useEffect(()=>{try{setUser(JSON.parse(localStorage.getItem('nfl_user')||'null'))}catch{}},[]);
  const canEdit=Boolean(user?.roles?.some((r:string)=>['ADMIN','MERCH_BULK','MERCH_BOTH','MERCH_HEAD'].includes(r)));
  useEffect(()=>{const timer=setTimeout(()=>{api(`/production-lots/styles?q=${encodeURIComponent(query.trim())}`).then(setStyleRows).catch((e:any)=>setMessage(e.message));},250);return()=>clearTimeout(timer);},[query]);
  const visible=styleRows;

  async function openStyle(row:any){setSelectedStyle(row);setSelected([]);setAllocations([]);setMessage('');setLoading(true);try{const data=await api(`/production-lots/styles/${row.style.id}/overview`);setOverview(data);}catch(e:any){setMessage(e.message)}finally{setLoading(false)}}
  async function refresh(){if(!selectedStyle)return;const data=await api(`/production-lots/styles/${selectedStyle.style.id}/overview`);setOverview(data);setSelected([]);setAllocations([]);}
  function toggleRef(ref:any){
    const next=selected.includes(ref.id)?selected.filter(x=>x!==ref.id):[...selected,ref.id];setSelected(next);
    const rows=(overview?.references||[]).filter((r:any)=>next.includes(r.id)).flatMap((r:any)=>(r.breakdown||[]).filter((b:any)=>b.remainingQty>0).map((b:any)=>({purchaseOrderId:r.id,color:b.color,colorCode:b.colorCode,size:b.size,qty:b.remainingQty,remainingQty:b.remainingQty,reference:r.reference})));
    setAllocations(rows);
    const dates=Array.from(new Set((overview?.references||[]).filter((r:any)=>next.includes(r.id)).map((r:any)=>r.shipmentDate).filter(Boolean)));
    setShipDate(dates.length===1?String(dates[0]):'');
  }
  function selectDate(date:string){
    const ids=(overview?.references||[]).filter((r:any)=>r.shipmentDate===date&&r.remainingQty>0).map((r:any)=>r.id);setSelected(ids);
    setAllocations((overview?.references||[]).filter((r:any)=>ids.includes(r.id)).flatMap((r:any)=>(r.breakdown||[]).filter((b:any)=>b.remainingQty>0).map((b:any)=>({purchaseOrderId:r.id,color:b.color,colorCode:b.colorCode,size:b.size,qty:b.remainingQty,remainingQty:b.remainingQty,reference:r.reference}))));
    setShipDate(date||'');
  }
  const combined=useMemo(()=>matrix(allocations),[allocations]);
  const byDate=useMemo(()=>{const m=new Map<string,any[]>();for(const r of overview?.references||[]){const k=r.shipmentDate||'';m.set(k,[...(m.get(k)||[]),r]);}return [...m.entries()];},[overview]);
  async function createLot(){
    if(!canEdit){setMessage('Read-only view. Merchandising creates and releases Production Lots.');return;}
    if(!selected.length){setMessage(`Select at least one ${overview?.selectorLabel||'reference'}`);return;}
    setSaving(true);setMessage('');
    try{
      const body:any={name:lotName||undefined,shipmentDate:shipDate||undefined,notes:notes||undefined,purchaseOrderIds:selected};
      if(partial)body.allocations=allocations.filter(x=>Number(x.qty)>0).map(x=>({purchaseOrderId:x.purchaseOrderId,color:x.color,size:x.size,qty:Number(x.qty)}));
      const lot=await api(`/production-lots/styles/${selectedStyle.style.id}`,{method:'POST',body:JSON.stringify(body)});
      setMessage(`${lot.code} created · ${n(lot.totalQty)} pcs`);setLotName('');setShipDate('');setNotes('');setPartial(false);await refresh();
    }catch(e:any){setMessage(e.message)}finally{setSaving(false)}
  }
  async function setStatus(lot:any,status:string){if(!canEdit){setMessage('Read-only view. Merchandising controls Production Lot status.');return;}try{await api(`/production-lots/${lot.id}/status`,{method:'PATCH',body:JSON.stringify({status})});setMessage(`${lot.code} → ${status}`);await refresh();}catch(e:any){setMessage(e.message)}}

  return <Shell title="PO / Market Production Lots" eyebrow="Merchandising · Group 1 order foundation">
    <section className="module-hero lot-hero"><div><span className="status-pill">Group 1 · Live</span><h2>Select shipment scope before Planning / IE / Cutting</h2><p>Select only the POs or OVS markets you want to produce now. The ERP combines their exact Color × Size quantities and protects already allocated quantity from being used twice. IE and Planning can use this same screen as a read-only scope view.</p></div><div className="module-actions">{canEdit&&<a className="btn btn-secondary" href="/orders/new">Order Entry / Import</a>}{canEdit&&<a className="btn btn-secondary" href="/modules/forms-print">Company Forms</a>}{!canEdit&&<span className="status-pill neutral">Read-only scope view</span>}</div></section>
    {message&&<div className="notice">{message}</div>}
    <div className="lot-layout">
      <aside className="card lot-jobs"><div className="panel-title">Jobs / Styles</div><input className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Job, Style, Buyer"/><div className="lot-job-list">{visible.map((r:any)=><button key={r.style.id} className={`lot-job ${selectedStyle?.style.id===r.style.id?'active':''}`} onClick={()=>openStyle(r)}><strong>{displayJobNo(r.order.jobNo,r.order.buyer)}</strong><span>{r.style.styleNo}</span><small>{r.order.buyer?.name} · {n(r.style.quantity)} pcs</small></button>)}</div></aside>
      <main className="lot-main">
        {!selectedStyle&&<div className="card empty-state"><strong>Select a Job / Style</strong><span>Then choose PO / Market references and build a production lot.</span></div>}
        {loading&&<div className="card">Loading allocation position…</div>}
        {overview&&!loading&&<>
          <section className="card"><div className="lot-summary-head"><div><div className="eyebrow">{overview.style.buyer?.name} · {overview.style.jobNo}</div><h3>{overview.style.styleNo} — {overview.style.itemDescription||'Style'}</h3></div><div className="lot-kpis"><div><span>Style Qty</span><strong>{n(overview.style.quantity)}</strong></div><div><span>Allocated</span><strong>{n(overview.allocatedQty)}</strong></div><div><span>Remaining</span><strong>{n(overview.remainingQty)}</strong></div></div></div></section>

          <section className="card"><div className="panel-head"><div><div className="panel-title">1. Select {overview.selectorLabel}</div><div className="panel-sub">OVS uses Country/Market. Other supported buyers use PO / Order references.</div></div></div>
            {byDate.map(([date,refs])=><div className="lot-date-group" key={date||'nodate'}><div className="lot-date-head"><strong>{date?d(date):'Shipment date not available'}</strong><button className="btn btn-secondary btn-compact" onClick={()=>selectDate(date)}>Select available on this date</button></div><div className="reference-grid">{refs.map((ref:any)=><div className={`reference-card reference-card-detailed ${selected.includes(ref.id)?'selected':''} ${ref.remainingQty<=0?'used':''}`} key={ref.id}><label className="reference-select-row"><input type="checkbox" disabled={ref.remainingQty<=0||ref.breakdownSource==='MISSING'} checked={selected.includes(ref.id)} onChange={()=>toggleRef(ref)}/><div><strong>{ref.reference}</strong><span>{ref.referenceType}{ref.market?` · ${ref.market}`:''}</span><small>{n(ref.totalQty)} total · {n(ref.allocatedQty)} allocated · <b>{n(ref.remainingQty)} remaining</b></small></div></label>{ref.breakdownSource==='MISSING'?<em>Color × Size missing — re-import with latest parser</em>:<details className="reference-breakdown-details"><summary>View size-wise breakdown</summary><ReferenceSizeMatrix rows={ref.breakdown||[]}/></details>}</div>)}</div></div>)}
          </section>

          <section className="card"><div className="panel-head"><div><div className="panel-title">2. Combined Color × Size</div><div className="panel-sub">This is exactly what the selected references will feed to IE, Planning and later Cutting.</div></div>{canEdit&&<label className="inline-check"><input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)}/> Partial allocation / edit quantities</label>}</div>
            {!selected.length?<div className="empty-state compact"><span>Select references above to calculate the combined breakdown.</span></div>:<>
              <div className="wide-table-wrap"><table className="table lot-matrix"><thead><tr><th>Color</th><th>Code</th>{combined.sizes.map(s=><th key={s}>{s}</th>)}<th>Total</th></tr></thead><tbody>{combined.colors.map(c=><tr key={`${c.color}-${c.colorCode||''}`}><td>{c.color}</td><td>{c.colorCode||'—'}</td>{combined.sizes.map(s=><td key={s}>{n(c.sizes[s]||0)}</td>)}<td><strong>{n(c.totalQty)}</strong></td></tr>)}<tr><td colSpan={2}><strong>Selected Total</strong></td>{combined.sizes.map(s=><td key={s}><strong>{n(combined.colors.reduce((sum,c)=>sum+(c.sizes[s]||0),0))}</strong></td>)}<td><strong>{n(combined.totalQty)}</strong></td></tr></tbody></table></div>
              {partial&&<details className="partial-allocation" open><summary>Edit reference/color/size allocation</summary><div className="wide-table-wrap"><table className="table"><thead><tr><th>PO / Market</th><th>Color</th><th>Size</th><th>Available</th><th>Allocate</th></tr></thead><tbody>{allocations.map((r,i)=><tr key={`${r.purchaseOrderId}-${r.color}-${r.size}`}><td>{r.reference}</td><td>{r.color}</td><td>{r.size}</td><td>{n(r.remainingQty)}</td><td><input className="qty-input" type="number" min="0" max={r.remainingQty} value={r.qty} onChange={e=>setAllocations(a=>a.map((x,j)=>j===i?{...x,qty:Math.max(0,Math.min(x.remainingQty,Number(e.target.value||0)))}:x))}/></td></tr>)}</tbody></table></div></details>}
            </>}
          </section>

          {canEdit&&<section className="card"><div className="panel-title">3. Create Production Lot</div><div className="forms-grid lot-create-grid"><label className="field"><span>Lot Name / Purpose</span><input value={lotName} onChange={e=>setLotName(e.target.value)} placeholder="e.g. 15-Oct shipment / First cut"/></label><label className="field"><span>Shipment Date</span><input type="date" value={shipDate} onChange={e=>setShipDate(e.target.value)}/></label><label className="field wide"><span>Notes</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional instruction"/></label></div><div className="lot-create-actions"><div><strong>{n(combined.totalQty)} pcs</strong><span> will be reserved in this lot</span></div><button className="btn btn-primary" disabled={saving||!selected.length||combined.totalQty<=0} onClick={createLot}>{saving?'Creating…':'Create & Reserve Production Lot'}</button></div></section>}

          <section className="card"><div className="panel-title">Existing Production Lots</div>{!overview.lots?.length?<div className="empty-state compact"><span>No production lot yet.</span></div>:<div className="lot-list">{overview.lots.map((lot:any)=><div className={`lot-row status-${String(lot.status).toLowerCase()}`} key={lot.id}><div><strong>{lot.code}{lot.name?` · ${lot.name}`:''}</strong><span>{n(lot.totalQty)} pcs · {lot.shipmentDate?d(lot.shipmentDate):'No shipment date'} · {lot.referenceIds?.length||0} reference(s)</span></div><span className="status-pill neutral">{lot.status}</span><div className="lot-row-actions">{canEdit&&lot.status==='DRAFT'&&<button className="btn btn-secondary btn-compact" onClick={()=>setStatus(lot,'APPROVED')}>Approve</button>}{canEdit&&lot.status==='APPROVED'&&<button className="btn btn-primary btn-compact" onClick={()=>setStatus(lot,'RELEASED')}>Release</button>}{canEdit&&!['CANCELLED','CLOSED','RELEASED'].includes(lot.status)&&<button className="btn btn-secondary btn-compact" onClick={()=>setStatus(lot,'CANCELLED')}>Cancel</button>}</div></div>)}</div>}</section>
        </>}
      </main>
    </div>
  </Shell>;
}
