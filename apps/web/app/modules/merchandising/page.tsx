'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { buyerShortCode, displayJobNo } from '../../../lib/display';
import ReferenceSelect from '../../../components/ReferenceSelect';

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
  merchandiser: string;
  remarks: string;
};

const DEFAULT_FORM: FollowUpForm = {
  fabricOrderSheetStatus:'PENDING', fabricOrderSheetActualDate:'',
  labDipStatus:'PENDING', labDipActualDate:'',
  printStrikeOffStatus:'PENDING', printStrikeOffActualDate:'',
  trimsOrderingStatus:'PENDING', trimsOrderingActualDate:'',
  fileHandoverStatus:'PENDING', fileHandoverActualDate:'',
  workOrderStatus:'NA', workOrderActualDate:'',
  presentStatus:'Order Confirmed', merchandiser:'', remarks:'',
};

function ActionDot({label,state}:{label:string;state:ActionState}){
  const cls=state==='DONE'?'done':state==='OVERDUE'?'overdue':state==='PENDING'?'pending':'na';
  const text=state==='DONE'?'OK':state==='OVERDUE'?'Late':state==='PENDING'?'Pending':'N/A';
  return <span className="action-chip" title={`${label}: ${text}`}><i className={`action-dot ${cls}`}/><span>{label}</span></span>;
}
function fmtDate(v:any){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'});}
function inputDate(v:any){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);}
function num(v:any){return v===null||v===undefined||v===''?'—':Number(v).toLocaleString();}

function matrixFromRows(rows:any[]){
  const sizes:string[]=[];const colors=new Map<string,{color:string;colorCode:string;sizes:Record<string,number>;total:number}>();
  for(const r of rows||[]){const size=String(r.size||'').trim(),color=String(r.color||'').trim()||'Unspecified';if(!size)continue;if(!sizes.includes(size))sizes.push(size);const code=String(r.colorCode||'');const key=`${color}|||${code}`;const x=colors.get(key)||{color,colorCode:code,sizes:{},total:0};x.sizes[size]=(x.sizes[size]||0)+Number(r.qty||0);x.total+=Number(r.qty||0);colors.set(key,x)}
  return {sizes,colors:[...colors.values()]};
}
function BreakdownMatrix({rows}:{rows:any[]}){const m=matrixFromRows(rows);if(!m.colors.length)return <div className="notice">No Color × Size breakdown stored for this scope.</div>;return <div className="wide-table-wrap"><table className="table lot-matrix"><thead><tr><th>Color</th><th>Code</th>{m.sizes.map(s=><th key={s}>{s}</th>)}<th>Total</th></tr></thead><tbody>{m.colors.map(c=><tr key={`${c.color}-${c.colorCode}`}><td>{c.color}</td><td>{c.colorCode||'—'}</td>{m.sizes.map(size=><td key={size}>{num(c.sizes[size]||0)}</td>)}<td><strong>{num(c.total)}</strong></td></tr>)}</tbody></table></div>}

function StatusSelect({value,onChange}:{value:ActionState;onChange:(v:ActionState)=>void}){
  return <select className="form-control" value={value||'PENDING'} onChange={e=>onChange(e.target.value as ActionState)}>
    <option value="PENDING">Pending</option><option value="DONE">Done / OK</option><option value="OVERDUE">Overdue / Issue</option><option value="NA">N/A</option>
  </select>;
}

export default function MerchandisingFollowUp(){
  const [orders,setOrders]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<any|null>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState('');
  const [revising,setRevising]=useState<any|null>(null),[revisionQty,setRevisionQty]=useState(''),[revisionReason,setRevisionReason]=useState(''),[revisionSaving,setRevisionSaving]=useState(false);
  const [breakdownView,setBreakdownView]=useState<any|null>(null);
  const [form,setForm]=useState<FollowUpForm>(DEFAULT_FORM);
  const [buyerFilter,setBuyerFilter]=useState('ALL'),[jobQuery,setJobQuery]=useState(''),[statusFilter,setStatusFilter]=useState('ALL');
  const load=()=>{setLoading(true);api('/orders').then(setOrders).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const allRows=useMemo(()=>orders.flatMap((order:any)=>order.styles.map((style:any)=>{
    const sm=style.sourceMetadata||{}; const f=sm.merchandisingFollowUp||{}; const p=sm.production||{}; const planningRaw=sm.planning||{};
    const planning=planningRaw.taStatus==='APPROVED'?planningRaw:{};
    const pos=style.purchaseOrders||[]; const ccd=pos.map((x:any)=>x.ccd).filter(Boolean).sort()[0];
    const outside=Boolean(planning.printOutsidePlan||planning.embroideryOutsidePlan||planning.outsidePlan||planning.outsideProcess?.required);
    return {order,style,sm,f,p,planning,planningRaw,ccd,outside};
  })),[orders]);
  const buyerOptions=useMemo(()=>Array.from(new Set(allRows.map((r:any)=>buyerShortCode(r.order.buyer?.code||r.order.buyer?.name)))).sort(),[allRows]);
  const statusOptions=useMemo(()=>Array.from(new Set(allRows.map((r:any)=>String(r.f?.presentStatus||'Order Confirmed')))).sort(),[allRows]);
  const rows=useMemo(()=>allRows.filter((r:any)=>{const bc=buyerShortCode(r.order.buyer?.code||r.order.buyer?.name);if(buyerFilter!=='ALL'&&bc!==buyerFilter)return false;if(statusFilter!=='ALL'&&String(r.f?.presentStatus||'Order Confirmed')!==statusFilter)return false;const q=jobQuery.trim().toLowerCase();return !q||`${displayJobNo(r.order.jobNo,r.order.buyer)} ${r.style.styleNo} ${r.style.itemDescription||''}`.toLowerCase().includes(q)}),[allRows,buyerFilter,statusFilter,jobQuery]);

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
      presentStatus:f.presentStatus||'Order Confirmed', merchandiser:f.merchandiser||row.sm?.ieBulletin?.merchandiser||row.sm?.fabricProfile?.merchandiser||'', remarks:f.remarks||'',
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

  return <Shell title="Bulk Merchandising Follow-up" eyebrow="Merchandising Operations">
    <section className="module-hero merchandising-hero">
      <div>
        <span className="status-pill">Order Execution</span>
        <h2>Bulk Merchandising Follow-up</h2>
        <p>Production milestones, approved T&A dates, and section execution quantities.</p>
      </div>
      <div className="module-actions">
        <a className="btn btn-primary" href="/orders/new">+ Order Entry</a>
        <a className="btn btn-secondary" href="/modules/yarn-store">🧶 Yarn Requisitions</a>
        <a className="btn btn-secondary" href="/modules/production-lots">Production Lots</a>
        <a className="btn btn-secondary" href="/modules/forms-print">Company Forms</a>
        <a className="btn btn-secondary" href="/tasks">Pending Tasks</a>
      </div>
    </section>

    <div className="followup-legend">
      <span><i className="action-dot done"/> Done</span>
      <span><i className="action-dot pending"/> Pending</span>
      <span><i className="action-dot overdue"/> Late</span>
      <span><i className="action-dot na"/> N/A</span>
      <strong>T&A Milestones Auto-Synced</strong>
    </div>
    {saved&&<div className="notice success-notice">{saved}</div>}
    {error&&<div className="notice">{error}</div>}

    <section className="panel followup-panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Bulk Merchandising Sheet</div>
          <div className="panel-sub">Order breakdown & live section balances</div>
        </div>
        <span className="status-pill neutral">{loading?'Loading…':`${rows.length}/${allRows.length} Styles`}</span>
      </div>
      <div className="section-filter-bar merch-filter-bar">
        <label><span>Buyer</span><select value={buyerFilter} onChange={e=>setBuyerFilter(e.target.value)}><option value="ALL">All Buyers</option>{buyerOptions.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="filter-grow"><span>Job / Style / Item</span><input value={jobQuery} onChange={e=>setJobQuery(e.target.value)} placeholder="Search job, style, or item…"/></label>
        <label><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">All Status</option>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></label>
      </div>
      <div className="wide-table-wrap merch-followup-wrap">
        <table className="table merch-followup-table">
          <thead><tr>
            <th className="sticky-col c1">Buyer<br />Job No</th>
            <th className="sticky-col c2">Style<br />No</th>
            <th className="sticky-col c3">Item<br />Image</th>
            <th>Order<br />Qty</th>
            <th>Color ×<br />Size</th>
            <th>FOB<br />Price</th>
            <th>CCD /<br />Shipment</th>
            <th>File Handover<br />Plan</th>
            <th>Trims In-house<br />Plan</th>
            <th>Sewing Start<br />Plan</th>
            <th>Merchandising<br />Actions</th>
            <th>Documents<br />& Forms</th>
            <th>Row<br />Actions</th>
            <th>Fabric<br />Req (kg)</th>
            <th>Knitting<br />Qty</th>
            <th>Knitting<br />Balance</th>
            <th>Dyeing<br />Qty</th>
            <th>Dyeing<br />Balance</th>
            <th>Cutting<br />Qty</th>
            <th>Cutting<br />Balance</th>
            <th>Print<br />Qty</th>
            <th>Print<br />Balance</th>
            <th>Emb.<br />Qty</th>
            <th>Emb.<br />Balance</th>
            <th>Input<br />Qty</th>
            <th>Input<br />Balance</th>
            <th>Sewing<br />Qty</th>
            <th>Sewing<br />Balance</th>
            <th>Present<br />Status</th>
            <th>Remarks</th>
          </tr></thead>
          <tbody>{rows.map((row:any)=>{const {order,style,sm,f,p,planning,planningRaw,ccd,outside}=row;return <tr key={`${order.id}-${style.id}`}>
            <td className="sticky-col c1"><strong>{displayJobNo(order.jobNo,order.buyer)}</strong>{order.sourceMetadata?.demoData&&<span className="demo-badge">DEMO</span>}</td>
            <td className="sticky-col c2">{style.styleNo}</td>
            <td className="sticky-col c3">{sm.itemImageUrl?<img className="followup-thumb" src={sm.itemImageUrl} alt={style.itemDescription||style.styleNo}/>:<div className="followup-thumb empty">No img</div>}</td>
            <td style={{ textAlign: 'right' }}><div className="qty-cell"><strong>{num(style.quantity)}</strong>{sm.qtyRevisionHistory?.length?<span className="qty-revised-badge">Rev {sm.qtyRevisionHistory.length}×</span>:null}{sm.qtyRevisionReviewRequired?<span className="qty-review-badge">Review</span>:null}</div></td>
            <td style={{ textAlign: 'center' }}><button className="btn btn-secondary btn-compact" onClick={()=>setBreakdownView(row)}>Size Breakdown</button></td>
            <td style={{ textAlign: 'right' }}>{sm.fobPrice!==null&&sm.fobPrice!==undefined?`$${Number(sm.fobPrice).toFixed(2)}`:'—'}</td>
            <td style={{ textAlign: 'center' }}>{fmtDate(ccd)}</td>
            <td style={{ textAlign: 'center' }}>{fmtDate(planning.fileHandoverDate)}</td>
            <td style={{ textAlign: 'center' }}>{fmtDate(planning.trimsInhouseDate)}</td>
            <td style={{ textAlign: 'center' }}>{fmtDate(planning.sewingStartDate)}</td>
            <td><div className="action-stack"><ActionDot label="Fabric Sheet" state={f.fabricOrderSheetStatus}/><ActionDot label="Lab Dip" state={f.labDipStatus}/><ActionDot label="Strike-off" state={f.printStrikeOffStatus}/><ActionDot label="Trims Order" state={f.trimsOrderingStatus}/><ActionDot label="File Handover" state={f.fileHandoverStatus}/><ActionDot label="Work Order" state={outside?(f.workOrderStatus||'PENDING'):'NA'}/></div></td>
            <td><div className="document-stack"><a className="doc-link ready" href={`/modules/production-lots`}>Color × Size Lots</a><a className="doc-link ready" href={`/modules/forms-print?job=${encodeURIComponent(order.jobNo)}`}>Print Forms</a>{outside?<a className="doc-link" target="_blank" href={`/print/work-order/${order.id}`}>Work Order</a>:<span className="doc-link disabled">WO: N/A</span>}</div></td>
            <td><div className="row-actions"><button className="btn btn-secondary btn-compact" onClick={()=>openEdit(row)}>Edit Actions</button><button className="btn btn-secondary btn-compact" onClick={()=>openRevision(row)}>Revise Qty</button></div></td>
            <td style={{ textAlign: 'right' }}>{num(p.fabricRequired)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.knittingQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.knittingBalance)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.dyeingQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.dyeingBalance)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.cuttingQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.cuttingBalance)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.printQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.printBalance)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.embroideryQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.embroideryBalance)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.inputQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.inputBalance)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.sewingQty)}</td>
            <td style={{ textAlign: 'right' }}>{num(p.sewingBalance)}</td>
            <td style={{ textAlign: 'center' }}><span className="status-pill neutral">{f.presentStatus||'Confirmed'}</span></td>
            <td>{f.remarks||'—'}</td>
          </tr>})}</tbody>
        </table>
        {!loading&&!rows.length&&!error&&<div className="empty-state compact"><strong>No matching jobs</strong><span>No records match selected filters.</span></div>}
      </div>
    </section>

    {breakdownView&&<div className="size-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setBreakdownView(null);}}><div className="size-modal" style={{maxWidth:1180}}><div className="size-modal-head"><div><div className="eyebrow">{displayJobNo(breakdownView.order.jobNo,breakdownView.order.buyer)}</div><h3>{breakdownView.style.styleNo} — Color × Size Breakdown</h3><p className="muted">Order breakdown and PO market allocations.</p></div><button className="icon-close" onClick={()=>setBreakdownView(null)}>×</button></div><div className="subsection-title">Style Total · {num(breakdownView.style.quantity)} pcs</div><BreakdownMatrix rows={breakdownView.style.breakdowns||[]}/><div style={{marginTop:18}} className="subsection-title">PO / Market Breakdown</div>{!(breakdownView.style.purchaseOrders||[]).length?<div className="notice">No PO references recorded.</div>:(breakdownView.style.purchaseOrders||[]).map((po:any)=><details key={po.id||po.poNumber} className="sequence-box" style={{marginTop:8}} open><summary><strong>{po.poNumber}</strong> · {num(po.totalQty)} pcs {po.market?` · ${po.market}`:''}</summary><div className="sequence-inner"><BreakdownMatrix rows={po.breakdowns||[]}/></div></details>)}</div></div>}

    {editing&&<div className="drawer-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)closeEdit();}}>
      <aside className="followup-drawer" role="dialog" aria-modal="true" aria-label="Edit merchandising follow-up">
        <div className="drawer-head"><div><div className="eyebrow">{displayJobNo(editing.order.jobNo,editing.order.buyer)}</div><h3>{editing.style.styleNo} — Merchandising Actions</h3></div><button className="drawer-close" onClick={closeEdit} aria-label="Close">×</button></div>
        <div className="drawer-note">Update merchandising-owned milestones and order remarks.</div>
        <div className="drawer-grid planning-readonly"><div><label>File Handover Plan</label><strong>{fmtDate(editing.planning.fileHandoverDate)}</strong></div><div><label>Trims In-house Plan</label><strong>{fmtDate(editing.planning.trimsInhouseDate)}</strong></div><div><label>Sewing Start Plan</label><strong>{fmtDate(editing.planning.sewingStartDate)}</strong></div></div>
        <div className="action-edit-list">
          <ActionEditor label="Fabric Order Sheet" status={form.fabricOrderSheetStatus} date={form.fabricOrderSheetActualDate} setStatus={v=>setField('fabricOrderSheetStatus',v)} setDate={v=>setField('fabricOrderSheetActualDate',v)}/>
          <ActionEditor label="Lab Dip" status={form.labDipStatus} date={form.labDipActualDate} setStatus={v=>setField('labDipStatus',v)} setDate={v=>setField('labDipActualDate',v)}/>
          <ActionEditor label="Print Strike-off" status={form.printStrikeOffStatus} date={form.printStrikeOffActualDate} setStatus={v=>setField('printStrikeOffStatus',v)} setDate={v=>setField('printStrikeOffActualDate',v)}/>
          <ActionEditor label="Trims Ordering" status={form.trimsOrderingStatus} date={form.trimsOrderingActualDate} setStatus={v=>setField('trimsOrderingStatus',v)} setDate={v=>setField('trimsOrderingActualDate',v)}/>
          <ActionEditor label="File Handover" status={form.fileHandoverStatus} date={form.fileHandoverActualDate} setStatus={v=>setField('fileHandoverStatus',v)} setDate={v=>setField('fileHandoverActualDate',v)}/>
          <ActionEditor label="Outside Work Order" disabled={!editing.outside} status={editing.outside?form.workOrderStatus:'NA'} date={form.workOrderActualDate} setStatus={v=>setField('workOrderStatus',v)} setDate={v=>setField('workOrderActualDate',v)}/>
        </div>
        <div className="drawer-form-row"><label>Merchandiser</label><ReferenceSelect category="MERCHANDISER" value={form.merchandiser} onChange={v=>setField('merchandiser',v)} placeholder="Select merchandiser"/></div>
        <div className="drawer-form-row"><label>Present Status</label><ReferenceSelect category="PRESENT_STATUS" value={form.presentStatus} onChange={v=>setField('presentStatus',v)} placeholder="Select factory status"/></div>
        <div className="drawer-form-row"><label>Remarks</label><textarea className="form-control textarea" value={form.remarks} onChange={e=>setField('remarks',e.target.value)} placeholder="Enter follow-up remarks"/></div>
        <div className="drawer-actions"><button className="btn btn-secondary" onClick={closeEdit} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={saveFollowUp} disabled={saving}>{saving?'Saving…':'Save Follow-up'}</button></div>
      </aside>
    </div>}

    {revising&&<div className="drawer-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)closeRevision();}}>
      <aside className="followup-drawer qty-revision-drawer" role="dialog" aria-modal="true" aria-label="Revise order quantity">
        <div className="drawer-head"><div><div className="eyebrow">{displayJobNo(revising.order.jobNo,revising.order.buyer)}</div><h3>{revising.style.styleNo} — Revise Order Qty</h3></div><button className="drawer-close" onClick={closeRevision} aria-label="Close">×</button></div>
        <div className="drawer-note">Updates order quantity and logs revision history.</div>
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
