'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type Breakdown={color:string;size:string;qty:number};
type Row={
  styleNo:string; itemDescription:string; itemImageUrl:string; itemImageName:string; fobPrice:number;
  quantity:number; breakdowns:Breakdown[]; poNumber:string; poQty:number; ccd:string;
};
const empty=():Row=>({styleNo:'',itemDescription:'',itemImageUrl:'',itemImageName:'',fobPrice:0,quantity:0,breakdowns:[],poNumber:'',poQty:0,ccd:''});

export default function NewOrder(){
  const [buyers,setBuyers]=useState<any[]>([]),[buyerId,setBuyerId]=useState('');
  const [orders,setOrders]=useState<any[]>([]),[sequence,setSequence]=useState<any>(null),[sequenceInput,setSequenceInput]=useState('');
  const [jobType,setJobType]=useState<'NEW'|'REPEAT'>('NEW'),[repeatBaseJobNo,setRepeatBaseJobNo]=useState(''),[repeatLotNo,setRepeatLotNo]=useState('1st');
  const [rows,setRows]=useState<Row[]>([empty()]);
  const [mode,setMode]=useState<'manual'|'import'>('manual');
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<any>(null),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(''); const [warnings,setWarnings]=useState<string[]>([]); const [createdJobNo,setCreatedJobNo]=useState('');
  const [uploadingRow,setUploadingRow]=useState<number|null>(null);
  const [sizeEditor,setSizeEditor]=useState<{rowIndex:number;sizes:string[];colors:{name:string;qtys:Record<string,number>}[]}|null>(null);
  const [newSizeLabel,setNewSizeLabel]=useState('');
  const [user,setUser]=useState<any>(null);
  useEffect(()=>{try{setUser(JSON.parse(localStorage.getItem('nfl_user')||'null'))}catch{}},[]);
  const isAdmin=user?.roles?.includes('ADMIN');

  const refreshSequence=()=>api('/orders/job-sequence').then(setSequence).catch(()=>{});
  useEffect(()=>{
    Promise.all([api('/masters/buyers'),api('/orders')]).then(([b,o])=>{setBuyers(b);setBuyerId(b[0]?.id||'');setOrders(o)}).catch(e=>setMessage(e.message));
    refreshSequence();
  },[]);
  const buyer=useMemo(()=>buyers.find(x=>x.id===buyerId),[buyers,buyerId]);
  const baseJobOptions=useMemo(()=>Array.from(new Set(orders.map((o:any)=>String(o.jobNo||'').split(' ')[0]).filter((x:string)=>/^\d+$/.test(x)))),[orders]);
  const update=(i:number,k:keyof Row,v:any)=>setRows(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x));
  const jobPreview=jobType==='NEW' ? (sequence?.nextJobNo ? String(sequence.nextJobNo) : 'Set current running Job No') : `${repeatBaseJobNo||'Base Job'} ${repeatLotNo||'Lot'}`;

  function openSizeEditor(i:number){
    const row=rows[i];
    const sizes=Array.from(new Set(row.breakdowns.map(x=>x.size).filter(Boolean)));
    const colorNames=Array.from(new Set(row.breakdowns.map(x=>x.color).filter(Boolean)));
    const selectedSizes=sizes.length?sizes:['XS','S','M','L','XL'];
    const selectedColors=(colorNames.length?colorNames:['']).map(name=>{
      const qtys:Record<string,number>={};
      selectedSizes.forEach(size=>{ qtys[size]=row.breakdowns.find(x=>x.color===name&&x.size===size)?.qty||0; });
      return {name,qtys};
    });
    setNewSizeLabel('');
    setSizeEditor({rowIndex:i,sizes:selectedSizes,colors:selectedColors});
  }
  function applySizeTemplate(sizes:string[]){
    setSizeEditor(ed=>ed?{...ed,sizes,colors:ed.colors.map(c=>({name:c.name,qtys:Object.fromEntries(sizes.map(sz=>[sz,c.qtys[sz]||0]))}))}:ed);
  }
  function addCustomSize(){
    const label=newSizeLabel.trim(); if(!label||!sizeEditor||sizeEditor.sizes.includes(label))return;
    setSizeEditor({...sizeEditor,sizes:[...sizeEditor.sizes,label],colors:sizeEditor.colors.map(c=>({name:c.name,qtys:{...c.qtys,[label]:0}}))});
    setNewSizeLabel('');
  }
  function saveSizeBreakdown(){
    if(!sizeEditor)return;
    const breakdowns:Breakdown[]=[];
    sizeEditor.colors.forEach(c=>sizeEditor.sizes.forEach(size=>{
      const qty=Number(c.qtys[size]||0);
      if(c.name.trim()&&qty>0) breakdowns.push({color:c.name.trim(),size,qty});
    }));
    update(sizeEditor.rowIndex,'breakdowns',breakdowns);
    setSizeEditor(null);
  }

  async function setCurrentSequence(){
    const n=Number(sequenceInput); if(!n){setMessage('Enter the current actual last Job No');return;}
    try{const data=await api('/orders/job-sequence',{method:'POST',body:JSON.stringify({lastJobNo:n})});setSequence(data);setSequenceInput('');setMessage(`Current last Job No set to ${data.lastJobNo}. Next new Job will be ${data.nextJobNo}.`)}catch(e:any){setMessage(e.message)}
  }

  async function uploadImage(i:number, selected?:File){
    if(!selected)return; setUploadingRow(i); setMessage('');
    try{const form=new FormData();form.append('file',selected);const data=await api('/uploads/item-image',{method:'POST',body:form});update(i,'itemImageUrl',data.url);update(i,'itemImageName',selected.name)}catch(e:any){setMessage(e.message)}finally{setUploadingRow(null)}
  }

  async function saveManual(){
    setMessage('');setWarnings([]);
    if(jobType==='REPEAT'&&(!repeatBaseJobNo||!repeatLotNo)){setMessage('Repeat Job requires Base Job No and Lot No');return;}
    try{
      const styles=rows.map(r=>({styleNo:r.styleNo,itemDescription:r.itemDescription,itemImageUrl:r.itemImageUrl||undefined,fobPrice:r.fobPrice||undefined,quantity:Number(r.quantity),breakdowns:r.breakdowns,pos:[{poNumber:r.poNumber,totalQty:Number(r.poQty),ccd:r.ccd}]}));
      const data=await api('/orders',{method:'POST',body:JSON.stringify({buyerId,jobType,repeatBaseJobNo:jobType==='REPEAT'?repeatBaseJobNo:undefined,repeatLotNo:jobType==='REPEAT'?repeatLotNo:undefined,styles})});
      setCreatedJobNo(data.order.jobNo); setMessage(`Created Job ${data.order.jobNo}. CAD consumption and IE tasks were generated.`); setWarnings(data.warnings||[]); setRows([empty()]);
      const latest=await api('/orders');setOrders(latest);refreshSequence();
    }catch(e:any){setMessage(e.message)}
  }

  async function parsePdf(){
    if(!file){setMessage('Select a PDF first');return;}
    setBusy(true);setMessage('');setWarnings([]);setPreview(null);
    try{const form=new FormData();form.append('file',file);if(buyer?.name)form.append('buyerCode',buyer.name);const data=await api('/orders/import/preview',{method:'POST',body:form});setPreview(data);setWarnings(data.warnings||[])}catch(e:any){setMessage(e.message)}finally{setBusy(false)}
  }

  async function confirmImport(){
    if(!preview)return;
    if(jobType==='REPEAT'&&(!repeatBaseJobNo||!repeatLotNo)){setMessage('Repeat Job requires Base Job No and Lot No');return;}
    setBusy(true);setMessage('');
    try{const data=await api('/orders/import/confirm',{method:'POST',body:JSON.stringify({buyerId,preview,approveNeedReview:true,jobType,repeatBaseJobNo:jobType==='REPEAT'?repeatBaseJobNo:undefined,repeatLotNo:jobType==='REPEAT'?repeatLotNo:undefined})});setCreatedJobNo(data.jobNo);setMessage(`Imported and created Job ${data.jobNo}. CAD consumption and IE tasks were generated.`);setPreview(null);setFile(null);const latest=await api('/orders');setOrders(latest);refreshSequence()}catch(e:any){setMessage(e.message)}finally{setBusy(false)}
  }

  return <Shell title="Order Entry / PO Import" eyebrow="Bulk merchandising · confirmed order">
    <div className="card">
      <div className="form-grid order-head-grid">
        <div className="field"><label>Buyer / Brand</label><select value={buyerId} onChange={e=>{setBuyerId(e.target.value);setPreview(null);setCreatedJobNo('')}}>{buyers.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></div>
        <div className="field"><label>Job Type</label><select value={jobType} onChange={e=>{setJobType(e.target.value as any);setCreatedJobNo('')}}><option value="NEW">New Job</option><option value="REPEAT">Repeat Job / Lot</option></select></div>
        {jobType==='NEW' ? <div className="field"><label>Internal Job No</label><input value={createdJobNo||jobPreview} readOnly className="read-only-strong"/></div> : <>
          <div className="field"><label>Base Job No</label><input list="base-job-options" value={repeatBaseJobNo} onChange={e=>setRepeatBaseJobNo(e.target.value.replace(/\D/g,''))} placeholder="e.g. 48515"/><datalist id="base-job-options">{baseJobOptions.map(x=><option key={x} value={x}/>)}</datalist></div>
          <div className="field"><label>Lot No</label><input list="lot-options" value={repeatLotNo} onChange={e=>setRepeatLotNo(e.target.value)} placeholder="e.g. 1st"/><datalist id="lot-options">{['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'].map(x=><option value={x} key={x}/>)}</datalist></div>
          <div className="field"><label>Display Job No</label><input value={createdJobNo||jobPreview} readOnly className="read-only-strong"/></div>
        </>}
      </div>

      {isAdmin&&jobType==='NEW'&&<details className="sequence-box"><summary>Job number setup (go-live / admin only)</summary><div className="sequence-inner"><div><strong>Current last Job:</strong> {sequence?.lastJobNo||'Not set'} &nbsp; <strong>Next:</strong> {sequence?.nextJobNo||'—'}</div><div className="sequence-actions"><input type="number" value={sequenceInput} onChange={e=>setSequenceInput(e.target.value)} placeholder="Actual current last Job No"/><button className="btn btn-secondary" onClick={setCurrentSequence}>Set Current Last Job</button></div><p className="muted">Set this to the real running Job No before go-live. The ERP will continue from the next number; it is not fixed at 49000.</p></div></details>}

      <div className="entry-mode-row"><button className={mode==='manual'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setMode('manual')}>Manual Entry</button><button className={mode==='import'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setMode('import')}>Import PO Sheet</button></div>

      {mode==='manual' ? <>
        <div className="wide-table-wrap" style={{marginTop:18}}><table className="table order-entry-table"><thead><tr><th>Style</th><th>Item Description</th><th>Item Picture</th><th>FOB Price</th><th>Qty</th><th>Color × Size Breakdown</th><th>PO / Order Ref</th><th>PO Qty</th><th>CCD</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}>
          <td><input value={r.styleNo} onChange={e=>update(i,'styleNo',e.target.value)}/></td>
          <td><input value={r.itemDescription} onChange={e=>update(i,'itemDescription',e.target.value)}/></td>
          <td><div className="image-entry">{r.itemImageUrl?<img src={r.itemImageUrl} alt="Item" className="item-thumb"/>:<div className="item-thumb placeholder">IMG</div>}<label className="mini-upload">{uploadingRow===i?'Uploading...':'Upload'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadImage(i,e.target.files?.[0])}/></label></div></td>
          <td><input type="number" step="0.01" value={r.fobPrice||''} onChange={e=>update(i,'fobPrice',Number(e.target.value))}/></td>
          <td><input type="number" value={r.quantity||''} onChange={e=>update(i,'quantity',Number(e.target.value))}/></td>
          <td><button type="button" className="size-breakdown-btn" onClick={()=>openSizeEditor(i)}><span>{r.breakdowns.length?'Edit Breakdown':'Add Breakdown'}</span><small>{r.breakdowns.length?`${new Set(r.breakdowns.map(x=>x.color)).size} color · ${new Set(r.breakdowns.map(x=>x.size)).size} size · ${r.breakdowns.reduce((s,x)=>s+x.qty,0).toLocaleString()} pcs`:'Color-wise + size-wise qty'}</small></button></td>
          <td><input value={r.poNumber} onChange={e=>update(i,'poNumber',e.target.value)}/></td>
          <td><input type="number" value={r.poQty||''} onChange={e=>update(i,'poQty',Number(e.target.value))}/></td>
          <td><input type="date" value={r.ccd} onChange={e=>update(i,'ccd',e.target.value)}/></td>
        </tr>)}</tbody></table></div>
        <div className="entry-actions"><button className="btn btn-secondary" onClick={()=>setRows(r=>[...r,empty()])}>+ Add Style</button><button className="btn btn-primary" onClick={saveManual}>Save & Create Job</button></div>
      </> : <>
        <div className="field" style={{marginTop:18,maxWidth:560}}><label>Full Buyer PO PDF</label><input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></div>
        <div style={{marginTop:12}}><button className="btn btn-primary" disabled={busy||!file} onClick={parsePdf}>{busy?'Reading PDF...':'Upload & Auto Populate'}</button></div>
        {preview&&<div style={{marginTop:18}}><div className="notice"><b>{preview.parserFamily}</b> parser {preview.parserVersion} — <b>{preview.validation.status}</b></div>{preview.styles.map((s:any)=><div key={s.styleNo} style={{marginTop:18}}><h3 style={{marginBottom:6}}>{s.styleNo} {s.styleDescription?`— ${s.styleDescription}`:''}</h3><div className="muted">Style Total: {Number(s.totalQty).toLocaleString()} {s.collection?` | Collection: ${s.collection}`:''} {s.season?` | Season: ${s.season}`:''}</div><div className="wide-table-wrap" style={{marginTop:10}}><table className="table"><thead><tr><th>PO / Order Ref</th><th>Qty</th><th>CCD</th><th>Shipment Date</th><th>Destination</th></tr></thead><tbody>{s.orderReferences.map((p:any)=><tr key={`${p.referenceType}-${p.reference}`}><td>{p.reference}<div className="muted" style={{fontSize:11}}>{p.referenceType}</div></td><td>{p.totalQty}</td><td>{p.ccd||'—'}</td><td>{p.shipmentDate||'—'}</td><td>{p.destination||'—'}</td></tr>)}</tbody></table></div></div>)}<button className="btn btn-primary" style={{marginTop:16}} disabled={busy} onClick={confirmImport}>Confirm Import & Create Job</button></div>}
      </>}

      {sizeEditor&&<div className="size-modal-backdrop" role="dialog" aria-modal="true" aria-label="Color and size breakdown">
        <div className="size-modal">
          <div className="size-modal-head"><div><h3>Color × Size Breakdown</h3><p className="muted">Use buyer size labels exactly as used in the PO. Add custom labels when needed.</p></div><button type="button" className="icon-close" onClick={()=>setSizeEditor(null)}>×</button></div>
          <div className="size-template-row">
            <span className="size-template-label">Quick size set:</span>
            <button type="button" className="btn btn-secondary" onClick={()=>applySizeTemplate(['XS','S','M','L','XL','XXL','XXXL'])}>XS–XXXL</button>
            <button type="button" className="btn btn-secondary" onClick={()=>applySizeTemplate(['92-96','98-102','104-110','116-122','128-134','140-146','152-158'])}>Kids numeric</button>
            <button type="button" className="btn btn-secondary" onClick={()=>applySizeTemplate(['2-3Y','3-4Y','4-5Y','5-6Y','7-8Y','9-10Y','11-12Y','13-14Y'])}>Age</button>
            <div className="custom-size-add"><input value={newSizeLabel} onChange={e=>setNewSizeLabel(e.target.value)} placeholder="Custom size e.g. 86/92"/><button type="button" className="btn btn-secondary" onClick={addCustomSize}>+ Size</button></div>
          </div>
          <div className="size-grid-wrap"><table className="table size-grid"><thead><tr><th>Color</th>{sizeEditor.sizes.map(size=><th key={size}>{size}<button type="button" className="remove-size" aria-label={`Remove ${size}`} onClick={()=>setSizeEditor(ed=>ed?{...ed,sizes:ed.sizes.filter(s=>s!==size),colors:ed.colors.map(c=>{const q={...c.qtys};delete q[size];return {...c,qtys:q}})}:ed)}>×</button></th>)}<th>Total</th><th></th></tr></thead><tbody>{sizeEditor.colors.map((c,ci)=><tr key={ci}><td><input value={c.name} placeholder="Color name" onChange={e=>setSizeEditor(ed=>{if(!ed)return ed;const colors=[...ed.colors];colors[ci]={...colors[ci],name:e.target.value};return {...ed,colors}})}/></td>{sizeEditor.sizes.map(size=><td key={size}><input type="number" min="0" value={c.qtys[size]||''} onChange={e=>setSizeEditor(ed=>{if(!ed)return ed;const colors=[...ed.colors];colors[ci]={...colors[ci],qtys:{...colors[ci].qtys,[size]:Number(e.target.value)}};return {...ed,colors}})}/></td>)}<td className="size-row-total">{Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0).toLocaleString()}</td><td><button type="button" className="remove-row" onClick={()=>setSizeEditor(ed=>ed?{...ed,colors:ed.colors.filter((_,n)=>n!==ci)}:ed)}>Remove</button></td></tr>)}</tbody></table></div>
          <div className="size-modal-footer"><div className="breakdown-total"><span>Breakdown Total</span><strong>{sizeEditor.colors.reduce((total,c)=>total+Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0),0).toLocaleString()} pcs</strong>{rows[sizeEditor.rowIndex]?.quantity>0&&<small className={sizeEditor.colors.reduce((total,c)=>total+Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0),0)===rows[sizeEditor.rowIndex].quantity?'match-ok':'match-warn'}>{sizeEditor.colors.reduce((total,c)=>total+Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0),0)===rows[sizeEditor.rowIndex].quantity?'Matches style quantity':`Style Qty: ${rows[sizeEditor.rowIndex].quantity.toLocaleString()}`}</small>}</div><div className="size-modal-actions"><button type="button" className="btn btn-secondary" onClick={()=>setSizeEditor(ed=>ed?{...ed,colors:[...ed.colors,{name:'',qtys:Object.fromEntries(ed.sizes.map(s=>[s,0]))}]}:ed)}>+ Add Color</button><button type="button" className="btn btn-secondary" onClick={()=>setSizeEditor(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveSizeBreakdown}>Save Breakdown</button></div></div>
        </div>
      </div>}
      {message&&<div className="notice">{message}</div>}{warnings.map((w,i)=><div className="notice" key={i}>Need Review: {w}</div>)}
      <p className="muted" style={{fontSize:13,marginTop:16}}>Factory is not entered here. Customer orders are received in NFL's name; NFL/NCL production allocation belongs to Central Planning.</p>
    </div>
  </Shell>;
}
