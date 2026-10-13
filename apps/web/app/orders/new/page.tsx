'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type Breakdown={color:string;size:string;qty:number};
type RefRow={
  poNumber:string; totalQty:number; ccd:string; shipmentDate:string; referenceType:string;
  destination:string; market:string; breakdowns:Breakdown[];
};
type Row={
  styleNo:string; itemDescription:string; itemImageUrl:string; itemImageName:string; fobPrice:number;
  quantity:number; breakdowns:Breakdown[]; pos:RefRow[];
};
const emptyRef=(market=false):RefRow=>({poNumber:'',totalQty:0,ccd:'',shipmentDate:'',referenceType:market?'MARKET':'PO',destination:'',market:'',breakdowns:[]});
const empty=():Row=>({styleNo:'',itemDescription:'',itemImageUrl:'',itemImageName:'',fobPrice:0,quantity:0,breakdowns:[],pos:[]});

function flattenImportedColors(colors:any[]):Breakdown[]{
  return (colors||[]).flatMap((c:any)=>(c.sizes||[]).map((s:any)=>({color:String(c.color||''),size:String(s.size||''),qty:Number(s.qty||0)}))).filter((x:Breakdown)=>x.color&&x.size&&x.qty>0);
}
function aggregateBreakdowns(rows:Breakdown[]):Breakdown[]{
  const map=new Map<string,Breakdown>();
  rows.forEach(r=>{const key=`${r.color}|||${r.size}`;const cur=map.get(key)||{color:r.color,size:r.size,qty:0};cur.qty+=Number(r.qty||0);map.set(key,cur)});
  return [...map.values()];
}
function breakdownSummary(rows:Breakdown[]){
  return `${new Set(rows.map(x=>x.color)).size} color · ${new Set(rows.map(x=>x.size)).size} size · ${rows.reduce((s,x)=>s+Number(x.qty||0),0).toLocaleString()} pcs`;
}
function importedColorTotal(color:any){return (color?.sizes||[]).reduce((s:number,x:any)=>s+Number(x?.qty||0),0)}
function importedGrand(colors:any[]){return (colors||[]).reduce((s:number,c:any)=>s+importedColorTotal(c),0)}
function normalizeImportedColors(colors:any[]){return (colors||[]).map((c:any)=>({...c,totalQty:importedColorTotal(c),sizes:(c.sizes||[]).map((s:any)=>({...s,qty:Number(s.qty||0)}))}))}
function aggregateImportedColors(colors:any[]){
  const byColor=new Map<string,any>();
  for(const raw of colors||[]){
    const c={...raw,totalQty:importedColorTotal(raw),sizes:(raw.sizes||[]).map((s:any)=>({...s,qty:Number(s.qty||0)}))};
    const key=`${String(c.color||'')}|||${String(c.colorCode||'')}`;
    const target=byColor.get(key)||{color:c.color,colorCode:c.colorCode,totalQty:0,sizes:[],metadata:c.metadata};
    const bySize=new Map((target.sizes||[]).map((x:any)=>[String(x.size),x]));
    for(const size of c.sizes||[]){const existing:any=bySize.get(String(size.size));if(existing){existing.qty=Number(existing.qty||0)+Number(size.qty||0);if(!existing.ean&&size.ean)existing.ean=size.ean}else{const next={...size};target.sizes.push(next);bySize.set(String(next.size),next)}}
    target.totalQty=importedColorTotal(target);byColor.set(key,target);
  }
  return [...byColor.values()];
}
function recalcPreviewValidation(source:any){
  if(!source)return source;
  const styles=(source.styles||[]).map((style:any)=>({...style,colors:normalizeImportedColors(style.colors||[]),orderReferences:(style.orderReferences||[]).map((ref:any)=>({...ref,colors:normalizeImportedColors(ref.colors||[])}))}));
  const checks:any[]=[];
  for(const style of styles){
    const styleColorTotal=importedGrand(style.colors||[]);checks.push({code:'STYLE_COLOR_TOTAL',ok:styleColorTotal===Number(style.totalQty||0),message:`${style.styleNo}: color total ${styleColorTotal} ${styleColorTotal===Number(style.totalQty||0)?'=':'≠'} style total ${Number(style.totalQty||0)}`});
    for(const color of style.colors||[]){const sizeTotal=importedColorTotal(color);checks.push({code:'COLOR_SIZE_TOTAL',ok:sizeTotal===Number(color.totalQty||0),message:`${style.styleNo} / ${color.color}: size total ${sizeTotal} ${sizeTotal===Number(color.totalQty||0)?'=':'≠'} color total ${Number(color.totalQty||0)}`})}
    const refs=style.orderReferences||[];const refTotal=refs.reduce((s:number,r:any)=>s+Number(r.totalQty||0),0);if(refs.length){checks.push({code:'ORDER_REFERENCE_TOTAL',ok:refTotal===Number(style.totalQty||0),message:`${style.styleNo}: order-reference total ${refTotal} ${refTotal===Number(style.totalQty||0)?'=':'≠'} style total ${Number(style.totalQty||0)}`});for(const ref of refs){const refBreakdown=importedGrand(ref.colors||[]);checks.push({code:'ORDER_REFERENCE_BREAKDOWN_TOTAL',ok:refBreakdown===Number(ref.totalQty||0),message:`${style.styleNo} / ${ref.reference}: Color × Size total ${refBreakdown} ${refBreakdown===Number(ref.totalQty||0)?'=':'≠'} reference total ${Number(ref.totalQty||0)}`})}}
  }
  if((source.warnings||[]).length)checks.push({code:'PARSER_WARNINGS',ok:false,message:`${source.warnings.length} parser warning(s) require review`});
  return {...source,styles,validation:{status:checks.every((x:any)=>x.ok)?'VALIDATED':'NEED_REVIEW',checks}};
}
function ImportedMatrix({colors,totalQty,editable=false,onQtyChange}:{colors:any[];totalQty:number;editable?:boolean;onQtyChange?:(colorIndex:number,sizeIndex:number,qty:number)=>void}){
  const sizes:string[]=[];
  (colors||[]).forEach((c:any)=>(c.sizes||[]).forEach((s:any)=>{if(s?.size&&!sizes.includes(s.size))sizes.push(s.size)}));
  const grand=importedGrand(colors||[]);
  if(!colors?.length)return <div className="notice" style={{marginTop:10}}>Color × Size breakdown could not be read automatically. Review is required before confirming.</div>;
  return <div className="wide-table-wrap" style={{marginTop:8}}><table className="table"><thead><tr><th>Color</th><th>Color Code</th>{sizes.map(s=><th key={s}>{s}</th>)}<th>Total</th></tr></thead><tbody>
    {colors.map((c:any,ci:number)=><tr key={`${c.color}-${c.colorCode||''}`}><td>{c.color}</td><td>{c.colorCode||'—'}</td>{sizes.map(s=>{const si=(c.sizes||[]).findIndex((x:any)=>x.size===s);const val=si>=0?Number(c.sizes[si]?.qty||0):0;return <td key={s}>{editable&&si>=0?<input className="qty-input" type="number" min="0" value={val||''} onChange={e=>onQtyChange?.(ci,si,Math.max(0,Number(e.target.value||0)))}/>:val.toLocaleString()}</td>})}<td><strong>{importedColorTotal(c).toLocaleString()}</strong></td></tr>)}
    <tr><td colSpan={2}><strong>Total</strong></td>{sizes.map(s=><td key={s}><strong>{colors.reduce((n:number,c:any)=>n+Number((c.sizes||[]).find((x:any)=>x.size===s)?.qty||0),0).toLocaleString()}</strong></td>)}<td><strong>{grand.toLocaleString()}</strong></td></tr>
  </tbody></table><div className={grand===Number(totalQty||0)?'match-ok':'match-warn'} style={{marginTop:6,fontSize:12}}>{grand===Number(totalQty||0)?`Breakdown total ${grand.toLocaleString()} = reference/style total ✓`:`Breakdown total ${grand.toLocaleString()} ≠ total ${Number(totalQty||0).toLocaleString()}`}</div></div>;
}

export default function NewOrder(){
  const [buyers,setBuyers]=useState<any[]>([]),[buyerId,setBuyerId]=useState('');
  const [baseJobOptions,setBaseJobOptions]=useState<string[]>([]),[sequence,setSequence]=useState<any>(null),[sequenceInput,setSequenceInput]=useState('');
  const [jobType,setJobType]=useState<'NEW'|'REPEAT'>('NEW'),[repeatBaseJobNo,setRepeatBaseJobNo]=useState(''),[repeatLotNo,setRepeatLotNo]=useState('1st');
  const [rows,setRows]=useState<Row[]>([empty()]);
  const [mode,setMode]=useState<'manual'|'import'>('manual');
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<any>(null),[busy,setBusy]=useState(false),[reviewApproved,setReviewApproved]=useState(false);
  const [previewSelection,setPreviewSelection]=useState<Record<string,boolean>>({});
  const [message,setMessage]=useState(''); const [warnings,setWarnings]=useState<string[]>([]); const [createdJobNo,setCreatedJobNo]=useState('');
  const [uploadingRow,setUploadingRow]=useState<number|null>(null);
  const [breakEditor,setBreakEditor]=useState<{rowIndex:number;refIndex?:number;sizes:string[];colors:{name:string;qtys:Record<string,number>}[]}|null>(null);
  const [refEditor,setRefEditor]=useState<{rowIndex:number}|null>(null);
  const [newSizeLabel,setNewSizeLabel]=useState('');
  const [user,setUser]=useState<any>(null);
  useEffect(()=>{try{setUser(JSON.parse(localStorage.getItem('nfl_user')||'null'))}catch{}},[]);
  const isAdmin=user?.roles?.includes('ADMIN');

  const refreshSequence=()=>api('/orders/job-sequence').then(setSequence).catch(()=>{});
  const refreshBaseJobs=()=>api('/orders/repeat-bases').then(setBaseJobOptions).catch(()=>{});
  useEffect(()=>{api('/masters/buyers').then((b:any[])=>{setBuyers(b);setBuyerId(b[0]?.id||'')}).catch(e=>setMessage(e.message));refreshSequence();refreshBaseJobs()},[]);
  const buyer=useMemo(()=>buyers.find(x=>x.id===buyerId),[buyers,buyerId]);
  const isOvs=/\bOVS\b/i.test(String(buyer?.name||''));
  const selectorLabel=isOvs?'Country / Market':'PO / Order Reference';
  const update=(i:number,k:keyof Row,v:any)=>setRows(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x));
  const jobPreview=jobType==='NEW'?(sequence?.nextJobNo?String(sequence.nextJobNo):'Set current running Job No'):`${repeatBaseJobNo||'Base Job'} ${repeatLotNo||'Lot'}`;

  function targetBreakdowns(rowIndex:number,refIndex?:number){return refIndex===undefined?rows[rowIndex].breakdowns:(rows[rowIndex].pos[refIndex]?.breakdowns||[])}
  function targetQty(rowIndex:number,refIndex?:number){return refIndex===undefined?rows[rowIndex].quantity:(rows[rowIndex].pos[refIndex]?.totalQty||0)}
  function openBreakEditor(rowIndex:number,refIndex?:number){
    const source=targetBreakdowns(rowIndex,refIndex); const sizes=Array.from(new Set(source.map(x=>x.size).filter(Boolean))); const colors=Array.from(new Set(source.map(x=>x.color).filter(Boolean)));
    const selectedSizes=sizes.length?sizes:['XS','S','M','L','XL'];
    setNewSizeLabel(''); setBreakEditor({rowIndex,refIndex,sizes:selectedSizes,colors:(colors.length?colors:['']).map(name=>({name,qtys:Object.fromEntries(selectedSizes.map(s=>[s,source.find(x=>x.color===name&&x.size===s)?.qty||0]))}))});
  }
  function applySizeTemplate(sizes:string[]){setBreakEditor(ed=>ed?{...ed,sizes,colors:ed.colors.map(c=>({name:c.name,qtys:Object.fromEntries(sizes.map(sz=>[sz,c.qtys[sz]||0]))}))}:ed)}
  function addCustomSize(){const label=newSizeLabel.trim();if(!label||!breakEditor||breakEditor.sizes.includes(label))return;setBreakEditor({...breakEditor,sizes:[...breakEditor.sizes,label],colors:breakEditor.colors.map(c=>({name:c.name,qtys:{...c.qtys,[label]:0}}))});setNewSizeLabel('')}
  function saveBreakdown(){
    if(!breakEditor)return; const data:Breakdown[]=[];breakEditor.colors.forEach(c=>breakEditor.sizes.forEach(size=>{const qty=Number(c.qtys[size]||0);if(c.name.trim()&&qty>0)data.push({color:c.name.trim(),size,qty})}));
    setRows(current=>current.map((row,ri)=>{if(ri!==breakEditor.rowIndex)return row;if(breakEditor.refIndex===undefined)return {...row,breakdowns:data};const pos=row.pos.map((p,pi)=>pi===breakEditor.refIndex?{...p,breakdowns:data}:p);const allRefRows=pos.flatMap(p=>p.breakdowns);return {...row,pos,breakdowns:allRefRows.length?aggregateBreakdowns(allRefRows):row.breakdowns}}));setBreakEditor(null);
  }
  function updateRef(rowIndex:number,refIndex:number,key:keyof RefRow,value:any){setRows(cur=>cur.map((r,ri)=>ri===rowIndex?{...r,pos:r.pos.map((p,pi)=>pi===refIndex?{...p,[key]:value}:p)}:r))}
  function addRef(rowIndex:number){setRows(cur=>cur.map((r,ri)=>ri===rowIndex?{...r,pos:[...r.pos,emptyRef(isOvs)]}:r))}
  function removeRef(rowIndex:number,refIndex:number){setRows(cur=>cur.map((r,ri)=>{if(ri!==rowIndex)return r;const pos=r.pos.filter((_,pi)=>pi!==refIndex);const all=pos.flatMap(p=>p.breakdowns);return {...r,pos,breakdowns:all.length?aggregateBreakdowns(all):r.breakdowns}}))}

  function previewRefKey(styleIndex:number,refIndex:number){return `${styleIndex}:${refIndex}`}
  function setPreviewReviewed(next:any){next.sourceMetadata={...(next.sourceMetadata||{}),manualReviewEdited:true};setPreview(recalcPreviewValidation(next));setReviewApproved(false)}
  function updatePreviewStyleTotal(styleIndex:number,totalQty:number){
    if(!preview)return;const next=structuredClone(preview);next.styles[styleIndex].totalQty=Math.max(0,Number(totalQty||0));setPreviewReviewed(next);
  }
  function updatePreviewRefTotal(styleIndex:number,refIndex:number,totalQty:number){
    if(!preview)return;const next=structuredClone(preview);next.styles[styleIndex].orderReferences[refIndex].totalQty=Math.max(0,Number(totalQty||0));setPreviewReviewed(next);
  }
  function updatePreviewRefSize(styleIndex:number,refIndex:number,colorIndex:number,sizeIndex:number,qty:number){
    if(!preview)return;const next=structuredClone(preview);const style=next.styles[styleIndex];const ref=style.orderReferences[refIndex];ref.colors[colorIndex].sizes[sizeIndex].qty=Math.max(0,Number(qty||0));ref.colors=normalizeImportedColors(ref.colors||[]);style.colors=aggregateImportedColors((style.orderReferences||[]).flatMap((r:any)=>r.colors||[]));setPreviewReviewed(next);
  }
  function usePreviewRefBreakdownTotal(styleIndex:number,refIndex:number){
    if(!preview)return;const next=structuredClone(preview);const ref=next.styles[styleIndex].orderReferences[refIndex];ref.colors=normalizeImportedColors(ref.colors||[]);ref.totalQty=importedGrand(ref.colors||[]);next.styles[styleIndex].colors=aggregateImportedColors((next.styles[styleIndex].orderReferences||[]).flatMap((r:any)=>r.colors||[]));setPreviewReviewed(next);
  }
  function usePreviewReferenceSum(styleIndex:number){
    if(!preview)return;const next=structuredClone(preview);const style=next.styles[styleIndex];style.totalQty=(style.orderReferences||[]).reduce((s:number,r:any)=>s+Number(r.totalQty||0),0);style.colors=aggregateImportedColors((style.orderReferences||[]).flatMap((r:any)=>r.colors||[]));setPreviewReviewed(next);
  }
  function togglePreviewReference(styleIndex:number,refIndex:number){const key=previewRefKey(styleIndex,refIndex);setPreviewSelection(cur=>({...cur,[key]:!cur[key]}))}
  function selectPreviewDate(styleIndex:number,date:string){
    if(!preview)return;const next={...previewSelection};(preview.styles[styleIndex]?.orderReferences||[]).forEach((ref:any,ri:number)=>{next[previewRefKey(styleIndex,ri)]=(ref.ccd||ref.shipmentDate||'')===date});setPreviewSelection(next);
  }
  function clearPreviewSelection(styleIndex:number){
    if(!preview)return;const next={...previewSelection};(preview.styles[styleIndex]?.orderReferences||[]).forEach((_:any,ri:number)=>{delete next[previewRefKey(styleIndex,ri)]});setPreviewSelection(next);
  }

  async function setCurrentSequence(){const n=Number(sequenceInput);if(!n){setMessage('Enter the current actual last Job No');return}try{const data=await api('/orders/job-sequence',{method:'POST',body:JSON.stringify({lastJobNo:n})});setSequence(data);setSequenceInput('');setMessage(`Current last Job No set to ${data.lastJobNo}. Next new Job will be ${data.nextJobNo}.`)}catch(e:any){setMessage(e.message)}}
  async function uploadImage(i:number,selected?:File){if(!selected)return;setUploadingRow(i);setMessage('');try{const form=new FormData();form.append('file',selected);const data=await api('/uploads/item-image',{method:'POST',body:form});update(i,'itemImageUrl',data.url);update(i,'itemImageName',selected.name)}catch(e:any){setMessage(e.message)}finally{setUploadingRow(null)}}

  async function saveManual(){
    setMessage('');setWarnings([]);if(jobType==='REPEAT'&&(!repeatBaseJobNo||!repeatLotNo)){setMessage('Repeat Job requires Base Job No and Lot No');return}
    try{
      const defaultShipDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const styles=rows.map((r, idx)=>{
        let pos=r.pos.filter(p=>p.poNumber.trim()&&p.totalQty>0).map(p=>({
          ...p,
          poNumber:p.poNumber.trim(),
          market:p.referenceType==='MARKET'?(p.market||p.poNumber):p.market||undefined,
          ccd:p.ccd||defaultShipDate,
          shipmentDate:p.shipmentDate||p.ccd||defaultShipDate
        }));

        // If no explicit references were entered, auto-synthesize default reference from style details
        if (!pos.length) {
          const qty = Number(r.quantity) || 5000;
          pos = [{
            poNumber: isOvs ? `MKT-${r.styleNo || idx + 1}` : `PO-${r.styleNo || idx + 1}-MAIN`,
            totalQty: qty,
            ccd: defaultShipDate,
            shipmentDate: defaultShipDate,
            referenceType: isOvs ? 'MARKET' : 'PO',
            destination: isOvs ? 'ITALY' : 'EU CENTRAL',
            market: isOvs ? 'ITALY' : 'GERMANY',
            breakdowns: r.breakdowns.length ? r.breakdowns : [
              { color: 'Standard', size: 'M', qty }
            ]
          }];
        }

        const fromRefs=pos.flatMap(p=>p.breakdowns);
        const breakdowns=fromRefs.length?aggregateBreakdowns(fromRefs):(r.breakdowns.length?r.breakdowns:[{ color: 'Standard', size: 'M', qty: Number(r.quantity)||5000 }]);
        return {
          styleNo:r.styleNo.trim() || `ST-${Date.now().toString().slice(-5)}`,
          itemDescription:r.itemDescription.trim() || 'Knit Garment',
          itemImageUrl:r.itemImageUrl||undefined,
          fobPrice:r.fobPrice||undefined,
          quantity:Number(r.quantity) || 5000,
          breakdowns,
          pos
        };
      });

      const data=await api('/orders',{method:'POST',body:JSON.stringify({buyerId,jobType,repeatBaseJobNo:jobType==='REPEAT'?repeatBaseJobNo:undefined,repeatLotNo:jobType==='REPEAT'?repeatLotNo:undefined,styles})});
      setCreatedJobNo(data.order.jobNo);
      setMessage(`Created Job ${data.order.jobNo}. PO/Market breakdown is ready for Production Lot selection.`);
      setWarnings(data.warnings||[]);
      setRows([empty()]);
      refreshBaseJobs();
      refreshSequence();
    }catch(e:any){setMessage(e.message)}
  }
  async function parsePdf(){if(!file){setMessage('Select a PDF first');return}setBusy(true);setMessage('');setWarnings([]);setPreview(null);try{const form=new FormData();form.append('file',file);if(buyer?.name)form.append('buyerCode',buyer.name);const data=await api('/orders/import/preview',{method:'POST',body:form});setPreview(recalcPreviewValidation(data));setPreviewSelection({});setReviewApproved(false);setWarnings(data.warnings||[])}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
  async function confirmImport(){if(!preview)return;if(preview?.validation?.status!=='VALIDATED'&&!reviewApproved){setMessage('Review the parser warnings/checks and tick the approval box before confirming this import.');return;}if(jobType==='REPEAT'&&(!repeatBaseJobNo||!repeatLotNo)){setMessage('Repeat Job requires Base Job No and Lot No');return}setBusy(true);setMessage('');try{const data=await api('/orders/import/confirm',{method:'POST',body:JSON.stringify({buyerId,preview,approveNeedReview:preview?.validation?.status==='VALIDATED'?false:reviewApproved,jobType,repeatBaseJobNo:jobType==='REPEAT'?repeatBaseJobNo:undefined,repeatLotNo:jobType==='REPEAT'?repeatLotNo:undefined})});setCreatedJobNo(data.jobNo);setMessage(`Imported Job ${data.jobNo}. Open PO / Market Production Lots to select shipment scope and reserve quantities.`);setPreview(null);setPreviewSelection({});setFile(null);refreshBaseJobs();refreshSequence()}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}

  return <Shell title="Order Entry & Buyer PO / Market Import" eyebrow="Merchandising · Order Foundation"><div className="page-card">
    <div className="page-heading"><div><p className="eyebrow">MERCHANDISING · ORDER FOUNDATION</p><h1>Order Entry & Buyer PO / Market Import</h1><p className="muted">One canonical structure: Job → Style → Shipment → PO/Market → Color → Size → Qty. Exact reference breakdown feeds Production Lots without double allocation.</p></div></div>
    <div className="form-grid form-grid-4"><div className="field"><label>Buyer / Brand</label><select value={buyerId} onChange={e=>{setBuyerId(e.target.value);setPreview(null);setPreviewSelection({})}}>{buyers.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="field"><label>Job Type</label><select value={jobType} onChange={e=>setJobType(e.target.value as any)}><option value="NEW">New Job</option><option value="REPEAT">Repeat / Lot Job</option></select></div>{jobType==='REPEAT'?<><div className="field"><label>Base Job No</label><input list="base-jobs" value={repeatBaseJobNo} onChange={e=>setRepeatBaseJobNo(e.target.value)}/><datalist id="base-jobs">{baseJobOptions.map(x=><option key={x} value={x}/>)}</datalist></div><div className="field"><label>Repeat Lot</label><input value={repeatLotNo} onChange={e=>setRepeatLotNo(e.target.value)} placeholder="1st / 2nd / 49th"/></div></>:<div className="field"><label>Display Job No</label><input value={createdJobNo||jobPreview} readOnly className="read-only-strong"/></div>}</div>
    {isAdmin&&jobType==='NEW'&&<details className="sequence-box"><summary>Job number setup (go-live / admin only)</summary><div className="sequence-inner"><div><strong>Current last Job:</strong> {sequence?.lastJobNo||'Not set'} &nbsp; <strong>Next:</strong> {sequence?.nextJobNo||'—'}</div><div className="sequence-actions"><input type="number" value={sequenceInput} onChange={e=>setSequenceInput(e.target.value)} placeholder="Actual current last Job No"/><button className="btn btn-secondary" onClick={setCurrentSequence}>Set Current Last Job</button></div></div></details>}
    <div className="entry-mode-row"><button className={mode==='manual'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setMode('manual')}>Manual Entry</button><button className={mode==='import'?'btn btn-primary':'btn btn-secondary'} onClick={()=>setMode('import')}>Import Buyer PDF</button><a className="btn btn-secondary" href="/modules/production-lots">PO / Market Production Lots</a></div>

    {mode==='manual'?<><div className="notice" style={{marginTop:14}}><strong>{isOvs?'OVS rule:':'Manual order rule:'}</strong> {isOvs?'No traditional PO number. Add each Country / Market as a separate reference, with its own shipment quantity and Color × Size breakdown.':'Add every PO / Order reference separately. Reference-level Color × Size breakdown enables exact shipment grouping later.'}</div><div className="wide-table-wrap" style={{marginTop:18}}><table className="table order-entry-table"><thead><tr><th>Style</th><th>Item Description</th><th>Picture</th><th>FOB</th><th>Style Qty</th><th>Overall Color × Size</th><th>{selectorLabel}</th></tr></thead><tbody>{rows.map((r,i)=>{const refTotal=r.pos.reduce((s,p)=>s+Number(p.totalQty||0),0);return <tr key={i}><td><input value={r.styleNo} onChange={e=>update(i,'styleNo',e.target.value)}/></td><td><input value={r.itemDescription} onChange={e=>update(i,'itemDescription',e.target.value)}/></td><td><div className="image-entry">{r.itemImageUrl?<img src={r.itemImageUrl} alt="Item" className="item-thumb"/>:<div className="item-thumb placeholder">IMG</div>}<label className="mini-upload">{uploadingRow===i?'Uploading...':'Upload'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadImage(i,e.target.files?.[0])}/></label></div></td><td><input type="number" step="0.01" value={r.fobPrice||''} onChange={e=>update(i,'fobPrice',Number(e.target.value))}/></td><td><input type="number" value={r.quantity||''} onChange={e=>update(i,'quantity',Number(e.target.value))}/></td><td><button type="button" className="size-breakdown-btn" onClick={()=>openBreakEditor(i)}><span>{r.breakdowns.length?'Review Overall':'Add Overall'}</span><small>{r.breakdowns.length?breakdownSummary(r.breakdowns):'Can auto-build from reference breakdowns'}</small></button></td><td><button type="button" className="size-breakdown-btn" onClick={()=>{if(!r.pos.length)addRef(i);setRefEditor({rowIndex:i})}}><span>{r.pos.length?`Manage ${r.pos.length} reference${r.pos.length>1?'s':''}`:`Add ${selectorLabel}`}</span><small>{r.pos.length?`${refTotal.toLocaleString()} pcs · ${refTotal===r.quantity?'matches style qty':'review total'}`:'Shipment-wise PO/Market scope'}</small></button></td></tr>})}</tbody></table></div><div className="entry-actions"><button className="btn btn-secondary" onClick={()=>setRows(r=>[...r,empty()])}>Add Style</button><button className="btn btn-primary" onClick={saveManual}>Save & Create Job</button></div></>:<><div className="field" style={{marginTop:18,maxWidth:620}}><label>Buyer PO / Product Brief PDF</label><input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{isOvs?'OVS Product Brief: Style + Country/Market allocation is parsed; no PO No is invented.':'Bestseller and UTG buyer formats are parsed into canonical PO/Order reference + Color × Size.'}</small></div><div style={{marginTop:12}}><button className="btn btn-primary" disabled={busy||!file} onClick={parsePdf}>{busy?'Reading PDF...':'Review Import'}</button></div>
      {preview&&<div style={{marginTop:18}}>
        <div className="notice"><b>{preview.parserFamily}</b> parser {preview.parserVersion} — <b>{preview.validation.status}</b>. Review quantities before creating the Job; nothing is saved until Confirm.</div>
        {preview.validation?.checks?.length>0&&<div className="page-card" style={{marginTop:10,padding:12}}><strong>Import validation</strong><div style={{display:'grid',gap:5,marginTop:7}}>{preview.validation.checks.map((c:any,i:number)=><div key={i} className={c.ok?'match-ok':'match-warn'}>{c.ok?'✓':'⚠'} {c.message}</div>)}</div>{preview.validation?.checks?.some((c:any)=>!c.ok&&c.code!=='PARSER_WARNINGS')&&<div className="match-warn" style={{marginTop:8}}>Quantity mismatches cannot be overridden. Edit Style Qty / PO-Market Qty / Color × Size until they reconcile.</div>}{preview.validation?.checks?.some((c:any)=>!c.ok&&c.code==='PARSER_WARNINGS')&&<label className="inline-check" style={{marginTop:10}}><input type="checkbox" checked={reviewApproved} onChange={e=>setReviewApproved(e.target.checked)}/> I reviewed the parser warnings and approve them</label>}</div>}
        {preview.styles.map((s:any,si:number)=>{const refs=s.orderReferences||[];const dates=Array.from(new Set(refs.map((r:any)=>String(r.ccd||r.shipmentDate||'')).filter(Boolean))) as string[];const ccdGroups=dates.map((date:string)=>({date,refs:refs.map((r:any,ri:number)=>({...r,__index:ri})).filter((r:any)=>(r.ccd||r.shipmentDate||'')===date)}));const selectedRefs=refs.filter((_:any,ri:number)=>previewSelection[previewRefKey(si,ri)]);const combinedColors=aggregateImportedColors(selectedRefs.flatMap((r:any)=>r.colors||[]));const selectedTotal=selectedRefs.reduce((sum:number,r:any)=>sum+Number(r.totalQty||0),0);return <div key={`${s.styleNo}-${si}`} className="page-card" style={{marginTop:14,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}><div><h3 style={{marginBottom:4}}>{s.styleNo} {s.styleDescription?`— ${s.styleDescription}`:''}</h3><div className="muted">{s.collection?`Collection: ${s.collection} · `:''}{s.season?`Season: ${s.season}`:''}</div></div><div style={{display:'flex',gap:8,alignItems:'end',flexWrap:'wrap'}}><label className="field" style={{minWidth:150}}><span>Style / Job Qty</span><input type="number" min="0" value={Number(s.totalQty||0)} onChange={e=>updatePreviewStyleTotal(si,Number(e.target.value||0))}/></label><button type="button" className="btn btn-secondary btn-compact" onClick={()=>usePreviewReferenceSum(si)}>Use PO/Market Sum</button></div></div>
          <div style={{marginTop:12}}><strong>Overall Color × Size</strong><ImportedMatrix colors={s.colors||[]} totalQty={s.totalQty}/></div>
          <div style={{marginTop:18,display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><strong>{preview.parserFamily==='OVS'?'Country / Market Allocation':'PO / Order Reference Allocation'}</strong><div className="muted" style={{fontSize:12}}>Tick any 2–3 (or more) references below; combined Color × Size is calculated automatically.</div></div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{ccdGroups.map(group=>{const groupQty=group.refs.reduce((n:number,r:any)=>n+Number(r.totalQty||0),0);const groupSelected=group.refs.filter((r:any)=>previewSelection[previewRefKey(si,r.__index)]).length;return <button type="button" key={group.date} className="btn btn-secondary btn-compact" onClick={()=>selectPreviewDate(si,group.date)}>{preview.parserFamily==='OVS'?'Select Ship Date':'Select CCD'} {group.date} · {group.refs.length} {preview.parserFamily==='OVS'?'market':'PO'} · {groupQty.toLocaleString()} pcs · {groupSelected} selected</button>})}<button type="button" className="btn btn-secondary btn-compact" onClick={()=>clearPreviewSelection(si)}>Reset Selection</button></div></div>
          <div style={{display:'grid',gap:8,marginTop:8}}>{refs.map((p:any,ri:number)=>{const key=previewRefKey(si,ri);const refBreakdownTotal=importedGrand(p.colors||[]);return <div key={`${p.referenceType}-${p.reference}-${ri}`} className="sequence-box" style={{padding:10}}><div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}><label className="inline-check" style={{fontWeight:700}}><input type="checkbox" checked={Boolean(previewSelection[key])} onChange={()=>togglePreviewReference(si,ri)}/> Combine</label><div style={{flex:'1 1 260px'}}><strong>{p.reference}</strong> <span className="muted">({p.referenceType})</span><div className="muted" style={{fontSize:12}}>{p.market||p.destination||'—'} · CCD: {p.ccd||'Not found'} · Ship: {p.shipmentDate||'—'}</div></div><label className="field" style={{minWidth:145}}><span>PO / Market Qty</span><input type="number" min="0" value={Number(p.totalQty||0)} onChange={e=>updatePreviewRefTotal(si,ri,Number(e.target.value||0))}/></label><button type="button" className="btn btn-secondary btn-compact" onClick={()=>usePreviewRefBreakdownTotal(si,ri)}>Use breakdown {refBreakdownTotal.toLocaleString()}</button></div><details style={{marginTop:8}}><summary style={{cursor:'pointer',fontWeight:700}}>Review / edit Color × Size</summary><div className="muted" style={{fontSize:12,marginTop:6}}>Edit any wrong parsed size quantity here. The overall style matrix is rebuilt automatically from all references.</div><ImportedMatrix colors={p.colors||[]} totalQty={p.totalQty} editable onQtyChange={(ci,sizei,qty)=>updatePreviewRefSize(si,ri,ci,sizei,qty)}/></details></div>})}</div>
          <div className="page-card" style={{marginTop:16,padding:12,background:'var(--surface-soft, #f8fafc)'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><strong>Selected PO / Market — Combined Color × Size</strong><div className="muted" style={{fontSize:12}}>{selectedRefs.length?`${selectedRefs.length} reference(s) · ${selectedTotal.toLocaleString()} pcs`:'Select references above. No manual addition is needed.'}</div></div></div>{selectedRefs.length?<ImportedMatrix colors={combinedColors} totalQty={selectedTotal}/>:<div className="muted" style={{marginTop:8}}>Example: select PO-1 + PO-2 + PO-3 (or OVS markets) and this table becomes their combined production scope. Different shipment-date POs can remain unselected.</div>}</div>
        </div>})}
        <button className="btn btn-primary" style={{marginTop:16}} disabled={busy||Boolean(preview.validation?.checks?.some((c:any)=>!c.ok&&c.code!=='PARSER_WARNINGS'))||(preview.validation?.checks?.some((c:any)=>!c.ok&&c.code==='PARSER_WARNINGS')&&!reviewApproved)} onClick={confirmImport}>Confirm Import & Create Job</button>
      </div>}
    </>}

    {refEditor&&(()=>{const r=rows[refEditor.rowIndex];const total=r.pos.reduce((s,p)=>s+Number(p.totalQty||0),0);return <div className="size-modal-backdrop" role="dialog" aria-modal="true"><div className="size-modal" style={{maxWidth:1180}}><div className="size-modal-head"><div><h3>{selectorLabel} Breakdown</h3><p className="muted">One row per shipment PO/order or OVS country/market. Add Color × Size per reference for exact Production Lot allocation.</p></div><button className="icon-close" onClick={()=>setRefEditor(null)}>×</button></div><div className="wide-table-wrap"><table className="table"><thead><tr><th>{isOvs?'Country / Market':'Reference'}</th><th>Type</th><th>Qty</th><th>Shipment / CCD</th><th>Destination</th><th>Color × Size</th><th></th></tr></thead><tbody>{r.pos.map((p,pi)=><tr key={pi}><td><input value={p.poNumber} placeholder={isOvs?'e.g. ITALY':'PO / Order No'} onChange={e=>{updateRef(refEditor.rowIndex,pi,'poNumber',e.target.value);if(isOvs)updateRef(refEditor.rowIndex,pi,'market',e.target.value)}}/></td><td>{isOvs?<input value="MARKET" readOnly/>:<select value={p.referenceType} onChange={e=>updateRef(refEditor.rowIndex,pi,'referenceType',e.target.value)}><option value="PO">PO</option><option value="ORDER">Order</option><option value="CUSTOMER_ORDER">Customer Order</option></select>}</td><td><input type="number" min="0" value={p.totalQty||''} onChange={e=>updateRef(refEditor.rowIndex,pi,'totalQty',Number(e.target.value))}/></td><td><input type="date" value={p.ccd} onChange={e=>{updateRef(refEditor.rowIndex,pi,'ccd',e.target.value);updateRef(refEditor.rowIndex,pi,'shipmentDate',e.target.value)}}/></td><td><input value={p.destination} onChange={e=>updateRef(refEditor.rowIndex,pi,'destination',e.target.value)}/></td><td><button className="size-breakdown-btn" onClick={()=>openBreakEditor(refEditor.rowIndex,pi)}><span>{p.breakdowns.length?'Edit Breakdown':'Add Breakdown'}</span><small>{p.breakdowns.length?breakdownSummary(p.breakdowns):'Required for exact partial allocation'}</small></button></td><td><button className="remove-row" onClick={()=>removeRef(refEditor.rowIndex,pi)}>Remove</button></td></tr>)}</tbody></table></div><div className="size-modal-footer"><div className="breakdown-total"><span>Reference Total</span><strong>{total.toLocaleString()} / {r.quantity.toLocaleString()} pcs</strong><small className={total===r.quantity?'match-ok':'match-warn'}>{total===r.quantity?'Matches style quantity':'Review reference quantities'}</small></div><div className="size-modal-actions"><button className="btn btn-secondary" onClick={()=>addRef(refEditor.rowIndex)}>+ Add {isOvs?'Market':'Reference'}</button><button className="btn btn-primary" onClick={()=>setRefEditor(null)}>Done</button></div></div></div></div>})()}

    {breakEditor&&<div className="size-modal-backdrop" role="dialog" aria-modal="true"><div className="size-modal"><div className="size-modal-head"><div><h3>Color × Size Breakdown</h3><p className="muted">{breakEditor.refIndex===undefined?'Overall style matrix. Reference matrices will automatically aggregate here when available.':'This exact matrix becomes selectable/allocatable in a Production Lot.'}</p></div><button className="icon-close" onClick={()=>setBreakEditor(null)}>×</button></div><div className="size-template-row"><span className="size-template-label">Quick size set:</span><button className="btn btn-secondary" onClick={()=>applySizeTemplate(['XS','S','M','L','XL','XXL','XXXL'])}>XS–XXXL</button><button className="btn btn-secondary" onClick={()=>applySizeTemplate(['92-96','98-102','104-110','116-122','128-134','140-146','152-158'])}>Kids numeric</button><button className="btn btn-secondary" onClick={()=>applySizeTemplate(['2-3Y','3-4Y','4-5Y','5-6Y','7-8Y','9-10Y','11-12Y','13-14Y'])}>Age</button><div className="custom-size-add"><input value={newSizeLabel} onChange={e=>setNewSizeLabel(e.target.value)} placeholder="Custom size"/><button className="btn btn-secondary" onClick={addCustomSize}>+ Size</button></div></div><div className="size-grid-wrap"><table className="table size-grid"><thead><tr><th>Color</th>{breakEditor.sizes.map(size=><th key={size}>{size}<button className="remove-size" onClick={()=>setBreakEditor(ed=>ed?{...ed,sizes:ed.sizes.filter(s=>s!==size),colors:ed.colors.map(c=>{const q={...c.qtys};delete q[size];return {...c,qtys:q}})}:ed)}>×</button></th>)}<th>Total</th><th></th></tr></thead><tbody>{breakEditor.colors.map((c,ci)=><tr key={ci}><td><input value={c.name} placeholder="Color" onChange={e=>setBreakEditor(ed=>{if(!ed)return ed;const colors=[...ed.colors];colors[ci]={...colors[ci],name:e.target.value};return {...ed,colors}})}/></td>{breakEditor.sizes.map(size=><td key={size}><input type="number" min="0" value={c.qtys[size]||''} onChange={e=>setBreakEditor(ed=>{if(!ed)return ed;const colors=[...ed.colors];colors[ci]={...colors[ci],qtys:{...colors[ci].qtys,[size]:Number(e.target.value)}};return {...ed,colors}})}/></td>)}<td>{Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0).toLocaleString()}</td><td><button className="remove-row" onClick={()=>setBreakEditor(ed=>ed?{...ed,colors:ed.colors.filter((_,n)=>n!==ci)}:ed)}>Remove</button></td></tr>)}</tbody></table></div><div className="size-modal-footer"><div className="breakdown-total"><span>Breakdown Total</span><strong>{breakEditor.colors.reduce((t,c)=>t+Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0),0).toLocaleString()} pcs</strong><small className={breakEditor.colors.reduce((t,c)=>t+Object.values(c.qtys).reduce((s,n)=>s+Number(n||0),0),0)===targetQty(breakEditor.rowIndex,breakEditor.refIndex)?'match-ok':'match-warn'}>Target: {targetQty(breakEditor.rowIndex,breakEditor.refIndex).toLocaleString()}</small></div><div className="size-modal-actions"><button className="btn btn-secondary" onClick={()=>setBreakEditor(ed=>ed?{...ed,colors:[...ed.colors,{name:'',qtys:Object.fromEntries(ed.sizes.map(s=>[s,0]))}]}:ed)}>Add Color</button><button className="btn btn-secondary" onClick={()=>setBreakEditor(null)}>Cancel</button><button className="btn btn-primary" onClick={saveBreakdown}>Save Breakdown</button></div></div></div></div>}
    {message&&<div className="notice" style={{marginTop:14}}>{message}</div>}{warnings.map((w,i)=><div className="notice" key={i}>Need Review: {w}</div>)}
    <p className="muted" style={{fontSize:13,marginTop:16}}>Factory allocation is not entered here. Customer order ownership is Merchandising; NFL/NCL floor/line allocation stays in Central Planning.</p>
  </div></Shell>;
}
