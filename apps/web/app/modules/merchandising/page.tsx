'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type ActionState='DONE'|'PENDING'|'OVERDUE'|'NA'|undefined;
type FollowUpForm = {
  fabricOrderSheetStatus: ActionState;
  fabricOrderSheetActualDate: string;
  labDipStatus: ActionState;
  labDipActualDate: string;
  printStrikeOffStatus: ActionState;
  printStrikeOffActualDate: string;
  trimsOrderingStatus: ActionState;
  trimsOrderingActualDate: string;
  fileHandoverStatus: ActionState;
  fileHandoverActualDate: string;
  workOrderStatus: ActionState;
  workOrderActualDate: string;
  presentStatus: string;
  remarks: string;
};

const DEFAULT_FORM: FollowUpForm = {
  fabricOrderSheetStatus:'PENDING', fabricOrderSheetActualDate:'',
  labDipStatus:'PENDING', labDipActualDate:'',
  printStrikeOffStatus:'PENDING', printStrikeOffActualDate:'',
  trimsOrderingStatus:'PENDING', trimsOrderingActualDate:'',
  fileHandoverStatus:'PENDING', fileHandoverActualDate:'',
  workOrderStatus:'NA', workOrderActualDate:'',
  presentStatus:'Order Confirmed', remarks:'',
};

function ActionDot({label,state}:{label:string;state:ActionState}){
  const cls=state==='DONE'?'done':state==='OVERDUE'?'overdue':state==='PENDING'?'pending':'na';
  const text=state==='DONE'?'OK':state==='OVERDUE'?'Late':state==='PENDING'?'Pending':'N/A';
  return <span className="action-chip" title={`${label}: ${text}`}><i className={`action-dot ${cls}`}/><span>{label}</span></span>;
}
function fmtDate(v:any){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'});}
function inputDate(v:any){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);}
function num(v:any){return v===null||v===undefined||v===''?'—':Number(v).toLocaleString();}

function StatusSelect({value,onChange}:{value:ActionState;onChange:(v:ActionState)=>void}){
  return <select className="form-control" value={value||'PENDING'} onChange={e=>onChange(e.target.value as ActionState)}>
    <option value="PENDING">Pending</option><option value="DONE">Done / OK</option><option value="OVERDUE">Overdue / Issue</option><option value="NA">N/A</option>
  </select>;
}

export default function MerchandisingFollowUp(){
  const [orders,setOrders]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<any|null>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState('');
  const [revising,setRevising]=useState<any|null>(null),[revisionQty,setRevisionQty]=useState(''),[revisionReason,setRevisionReason]=useState(''),[revisionSaving,setRevisionSaving]=useState(false);
  const [form,setForm]=useState<FollowUpForm>(DEFAULT_FORM);
  const load=()=>{setLoading(true);api('/orders').then(setOrders).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const rows=useMemo(()=>orders.flatMap((order:any)=>order.styles.map((style:any)=>{
    const sm=style.sourceMetadata||{}; const f=sm.merchandisingFollowUp||{}; const p=sm.production||{}; const planningRaw=sm.planning||{};
    const planning=planningRaw.taStatus==='APPROVED'?planningRaw:{};
    const pos=style.purchaseOrders||[]; const ccd=pos.map((x:any)=>x.ccd).filter(Boolean).sort()[0];
    const outside=Boolean(planning.printOutsidePlan||planning.embroideryOutsidePlan||planning.outsidePlan||planning.outsideProcess?.required);
    return {order,style,sm,f,p,planning,planningRaw,ccd,outside};
  })),[orders]);

  function openEdit(row:any){
    const f=row.f||{};
    setSaved(''); setEditing(row);
    setForm({
      fabricOrderSheetStatus:f.fabricOrderSheetStatus||'PENDING', fabricOrderSheetActualDate:inputDate(f.fabricOrderSheetActualDate),
      labDipStatus:f.labDipStatus||'PENDING', labDipActualDate:inputDate(f.labDipActualDate),
      printStrikeOffStatus:f.printStrikeOffStatus||'PENDING', printStrikeOffActualDate:inputDate(f.printStrikeOffActualDate),
      trimsOrderingStatus:f.trimsOrderingStatus||'PENDING', trimsOrderingActualDate:inputDate(f.trimsOrderingActualDate),
      fileHandoverStatus:f.fileHandoverStatus||'PENDING', fileHandoverActualDate:inputDate(f.fileHandoverActualDate),
      workOrderStatus:row.outside?(f.workOrderStatus||'PENDING'):'NA', workOrderActualDate:inputDate(f.workOrderActualDate),
      presentStatus:f.presentStatus||'Order Confirmed', remarks:f.remarks||'',
    });
  }
  function closeEdit(){if(!saving)setEditing(null);}
  function setField<K extends keyof FollowUpForm>(key:K,value:FollowUpForm[K]){setForm(prev=>({...prev,[key]:value}));}
  async function saveFollowUp(){
    if(!editing)return; setSaving(true); setError(''); setSaved('');
    try{
      const body:any={...form};
      Object.keys(body).forEach(k=>{if(body[k]==='')delete body[k];});
      await api(`/orders/styles/${editing.style.id}/merchandising-followup`,{method:'PATCH',body:JSON.stringify(body)});
      setSaved('Follow-up saved'); await load(); setEditing(null);
    }catch(e:any){setError(e.message);}finally{setSaving(false);}
  }

  function openRevision(row:any){
    setSaved(''); setError(''); setRevising(row); setRevisionQty(String(row.style.quantity)); setRevisionReason('');
  }
  function closeRevision(){if(!revisionSaving)setRevising(null);}
  async function saveRevision(){
    if(!revising)return;
    const newQuantity=Number(revisionQty);
    if(!Number.isInteger(newQuantity)||newQuantity<=0){setError('Revised quantity must be a positive whole number');return;}
    if(!revisionReason.trim()){setError('Revision reason is required');return;}
    setRevisionSaving(true); setError(''); setSaved('');
    try{
      const result=await api(`/orders/styles/${revising.style.id}/quantity`,{method:'PATCH',body:JSON.stringify({newQuantity,reason:revisionReason.trim()})});
      setSaved(result.warning?`Quantity revised. CAD re-check task created. ${result.warning}`:'Quantity revised. CAD re-check task created.');
      await load(); setRevising(null);
    }catch(e:any){setError(e.message);}finally{setRevisionSaving(false);}
  }

  return <Shell title="Bulk Merchandising Follow-up" eyebrow="One follow-up sheet · merchandising actions + production progress">
    <section className="module-hero merchandising-hero"><div><span className="status-pill">Live foundation</span><h2>My Job Follow-up</h2><p>Merchandising checkpoints, approved planning dates and section-wise production quantities stay in one sheet. Merchandising updates only its own action fields; production quantities come from source sections.</p></div><div className="module-actions"><a className="btn btn-primary" href="/orders/new">+ Order Entry / PO Import</a><a className="btn btn-secondary" href="/tasks">My Pending Tasks</a></div></section>

    <div className="followup-legend"><span><i className="action-dot done"/> Done / OK</span><span><i className="action-dot pending"/> Pending</span><span><i className="action-dot overdue"/> Overdue / Issue</span><span><i className="action-dot na"/> N/A</span><strong>File Handover, Trims In-house and Sewing Start plan dates will auto-flow from approved Time & Action.</strong></div>
    {saved&&<div className="notice success-notice">{saved}</div>}{error&&<div className="notice">{error}</div>}

    <section className="panel followup-panel">
      <div className="panel-head"><div><div className="panel-title">Merchandising Follow-up Sheet</div><div className="panel-sub">Buyer → Job → Style → Item Picture first. Use Edit Actions to update only merchandising-owned checkpoints.</div></div><span className="status-pill neutral">{loading?'Loading…':`${rows.length} style rows`}</span></div>
      <div className="wide-table-wrap merch-followup-wrap">
        <table className="table merch-followup-table">
          <thead><tr>
            <th className="sticky-col c1">Buyer Name</th><th className="sticky-col c2">Job No</th><th className="sticky-col c3">Style No</th><th className="sticky-col c4">Item Picture</th>
            <th>Order Qty</th><th>FOB Price</th><th>CCD / Shipment</th>
            <th>File Handover Date</th><th>Trims In-house Date</th><th>Sewing Start Date</th>
            <th>Merchandising Actions</th><th>Documents / Print</th><th>Actions</th>
            <th>Fabric Required</th><th>Knitting Qty</th><th>Knitting Balance</th><th>Dyeing Qty</th><th>Dyeing Balance</th><th>Cutting Qty</th><th>Cutting Balance</th><th>Print Qty</th><th>Print Balance</th><th>Embroidery Qty</th><th>Embroidery Balance</th><th>Input Qty</th><th>Input Balance</th><th>Sewing Qty</th><th>Sewing Balance</th>
            <th>Present Status</th><th>Remarks</th>
          </tr></thead>
          <tbody>{rows.map((row:any)=>{const {order,style,sm,f,p,planning,planningRaw,ccd,outside}=row;return <tr key={`${order.id}-${style.id}`}>
            <td className="sticky-col c1"><strong>{order.buyer?.name||'—'}</strong></td>
            <td className="sticky-col c2"><strong>{order.jobNo}</strong>{order.sourceMetadata?.demoData&&<span className="demo-badge">DEMO</span>}</td>
            <td className="sticky-col c3">{style.styleNo}</td>
            <td className="sticky-col c4">{sm.itemImageUrl?<img className="followup-thumb" src={sm.itemImageUrl} alt={style.itemDescription||style.styleNo}/>:<div className="followup-thumb empty">No image</div>}</td>
            <td><div className="qty-cell"><strong>{num(style.quantity)}</strong>{sm.qtyRevisionHistory?.length?<span className="qty-revised-badge">Revised {sm.qtyRevisionHistory.length}×</span>:null}{sm.qtyRevisionReviewRequired?<span className="qty-review-badge">Review PO / Size</span>:null}</div></td><td>{sm.fobPrice!==null&&sm.fobPrice!==undefined?Number(sm.fobPrice).toFixed(2):'—'}</td><td>{fmtDate(ccd)}</td>
            <td>{fmtDate(planning.fileHandoverDate)}</td><td>{fmtDate(planning.trimsInhouseDate)}</td><td>{fmtDate(planning.sewingStartDate)}</td>
            <td><div className="action-stack"><ActionDot label="Fabric Order Sheet" state={f.fabricOrderSheetStatus}/><ActionDot label="Lab Dip" state={f.labDipStatus}/><ActionDot label="Print Strike-off" state={f.printStrikeOffStatus}/><ActionDot label="Trims Ordering" state={f.trimsOrderingStatus}/><ActionDot label="File Handover" state={f.fileHandoverStatus}/><ActionDot label="Work Order" state={outside?(f.workOrderStatus||'PENDING'):'NA'}/></div></td>
            <td><div className="document-stack"><a className={`doc-link ${planningRaw?.taStatus==='APPROVED'?'ready':''}`} target="_blank" href={`/print/ta-plan/${order.id}`}>T&A Plan{planningRaw?.taStatus==='APPROVED'?' · Approved':' · Draft'}</a>{order.sourceMetadata?.cadConsumption?.status==='CONFIRMED'?<a className="doc-link ready" target="_blank" href={`/print/fabric-order-sheet/${order.id}`}>Fabric Order Sheet</a>:<span className="doc-link disabled" title="CAD consumption pending">Fabric Order Sheet · CAD Pending</span>}{outside?<a className="doc-link" target="_blank" href={`/print/work-order/${order.id}`}>Work Order</a>:<span className="doc-link disabled">Work Order · N/A</span>}</div></td>
            <td><div className="row-actions"><button className="btn btn-secondary btn-compact" onClick={()=>openEdit(row)}>Edit Actions</button><button className="btn btn-secondary btn-compact" onClick={()=>openRevision(row)}>Revise Qty</button></div></td>
            <td>{num(p.fabricRequired)}</td><td>{num(p.knittingQty)}</td><td>{num(p.knittingBalance)}</td><td>{num(p.dyeingQty)}</td><td>{num(p.dyeingBalance)}</td><td>{num(p.cuttingQty)}</td><td>{num(p.cuttingBalance)}</td><td>{num(p.printQty)}</td><td>{num(p.printBalance)}</td><td>{num(p.embroideryQty)}</td><td>{num(p.embroideryBalance)}</td><td>{num(p.inputQty)}</td><td>{num(p.inputBalance)}</td><td>{num(p.sewingQty)}</td><td>{num(p.sewingBalance)}</td>
            <td><span className="status-pill neutral">{f.presentStatus||'Order Confirmed'}</span></td><td>{f.remarks||'—'}</td>
          </tr>})}</tbody>
        </table>
        {!loading&&!rows.length&&!error&&<div className="empty-state compact"><strong>No assigned jobs yet</strong><span>Confirmed jobs will appear here automatically.</span></div>}
      </div>
    </section>

    {editing&&<div className="drawer-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)closeEdit();}}>
      <aside className="followup-drawer" role="dialog" aria-modal="true" aria-label="Edit merchandising follow-up">
        <div className="drawer-head"><div><div className="eyebrow">{editing.order.buyer?.name} · Job {editing.order.jobNo}</div><h3>{editing.style.styleNo} — Merchandising Actions</h3></div><button className="drawer-close" onClick={closeEdit} aria-label="Close">×</button></div>
        <div className="drawer-note">Planning dates are read-only here. Update only merchandising-owned actions and remarks.</div>
        <div className="drawer-grid planning-readonly"><div><label>File Handover Plan</label><strong>{fmtDate(editing.planning.fileHandoverDate)}</strong></div><div><label>Trims In-house Plan</label><strong>{fmtDate(editing.planning.trimsInhouseDate)}</strong></div><div><label>Sewing Start Plan</label><strong>{fmtDate(editing.planning.sewingStartDate)}</strong></div></div>
        <div className="action-edit-list">
          <ActionEditor label="Fabric Order Sheet" status={form.fabricOrderSheetStatus} date={form.fabricOrderSheetActualDate} setStatus={v=>setField('fabricOrderSheetStatus',v)} setDate={v=>setField('fabricOrderSheetActualDate',v)}/>
          <ActionEditor label="Lab Dip" status={form.labDipStatus} date={form.labDipActualDate} setStatus={v=>setField('labDipStatus',v)} setDate={v=>setField('labDipActualDate',v)}/>
          <ActionEditor label="Print Strike-off" status={form.printStrikeOffStatus} date={form.printStrikeOffActualDate} setStatus={v=>setField('printStrikeOffStatus',v)} setDate={v=>setField('printStrikeOffActualDate',v)}/>
          <ActionEditor label="Trims Ordering" status={form.trimsOrderingStatus} date={form.trimsOrderingActualDate} setStatus={v=>setField('trimsOrderingStatus',v)} setDate={v=>setField('trimsOrderingActualDate',v)}/>
          <ActionEditor label="File Handover" status={form.fileHandoverStatus} date={form.fileHandoverActualDate} setStatus={v=>setField('fileHandoverStatus',v)} setDate={v=>setField('fileHandoverActualDate',v)}/>
          <ActionEditor label="Outside Work Order" disabled={!editing.outside} status={editing.outside?form.workOrderStatus:'NA'} date={form.workOrderActualDate} setStatus={v=>setField('workOrderStatus',v)} setDate={v=>setField('workOrderActualDate',v)}/>
        </div>
        <div className="drawer-form-row"><label>Present Status</label><input className="form-control" value={form.presentStatus} onChange={e=>setField('presentStatus',e.target.value)} placeholder="e.g. Bulk file ready / approval pending"/></div>
        <div className="drawer-form-row"><label>Remarks</label><textarea className="form-control textarea" value={form.remarks} onChange={e=>setField('remarks',e.target.value)} placeholder="Only useful follow-up remarks"/></div>
        <div className="drawer-actions"><button className="btn btn-secondary" onClick={closeEdit} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={saveFollowUp} disabled={saving}>{saving?'Saving…':'Save Follow-up'}</button></div>
      </aside>
    </div>}

    {revising&&<div className="drawer-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)closeRevision();}}>
      <aside className="followup-drawer qty-revision-drawer" role="dialog" aria-modal="true" aria-label="Revise order quantity">
        <div className="drawer-head"><div><div className="eyebrow">{revising.order.buyer?.name} · Job {revising.order.jobNo}</div><h3>{revising.style.styleNo} — Revise Order Qty</h3></div><button className="drawer-close" onClick={closeRevision} aria-label="Close">×</button></div>
        <div className="drawer-note">Quantity revision keeps the old value in history and automatically creates a CAD consumption re-check task. It does not silently redistribute PO or color-size quantities.</div>
        <div className="revision-summary-grid">
          <div><label>Current Order Qty</label><strong>{num(revising.style.quantity)}</strong></div>
          <div><label>Color × Size Total</label><strong>{num((revising.style.breakdowns||[]).reduce((sum:number,x:any)=>sum+Number(x.qty||0),0))}</strong></div>
          <div><label>PO Total</label><strong>{num((revising.style.purchaseOrders||[]).reduce((sum:number,x:any)=>sum+Number(x.totalQty||0),0))}</strong></div>
        </div>
        <div className="drawer-form-row"><label>Revised Order Qty</label><input className="form-control" type="number" min="1" step="1" value={revisionQty} onChange={e=>setRevisionQty(e.target.value)}/></div>
        <div className="drawer-form-row"><label>Reason / Buyer Revision Reference</label><textarea className="form-control textarea" value={revisionReason} onChange={e=>setRevisionReason(e.target.value)} placeholder="e.g. Buyer revised PO qty on 23-Sep"/></div>
        {(revising.sm.qtyRevisionHistory||[]).length>0&&<div className="revision-history"><div className="revision-history-title">Revision History</div>{[...(revising.sm.qtyRevisionHistory||[])].reverse().map((h:any,i:number)=><div className="revision-history-row" key={`${h.revisedAt||i}-${i}`}><strong>{num(h.oldQuantity)} → {num(h.newQuantity)}</strong><span>{h.reason||'—'}</span><small>{h.revisedAt?fmtDate(h.revisedAt):'—'} · {h.revisedByName||'User'}</small></div>)}</div>}
        <div className="drawer-actions"><button className="btn btn-secondary" onClick={closeRevision} disabled={revisionSaving}>Cancel</button><button className="btn btn-primary" onClick={saveRevision} disabled={revisionSaving}>{revisionSaving?'Revising…':'Confirm Revision'}</button></div>
      </aside>
    </div>}
  </Shell>;
}

function ActionEditor({label,status,date,setStatus,setDate,disabled=false}:{label:string;status:ActionState;date:string;setStatus:(v:ActionState)=>void;setDate:(v:string)=>void;disabled?:boolean}){
  return <div className={`action-editor ${disabled?'disabled':''}`}><div className="action-editor-title"><strong>{label}</strong>{disabled&&<span className="status-pill neutral">Not outside planned</span>}</div><div className="action-editor-fields"><StatusSelect value={disabled?'NA':status} onChange={setStatus}/><input className="form-control" type="date" value={date} onChange={e=>setDate(e.target.value)} disabled={disabled}/></div></div>;
}
