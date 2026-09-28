'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../../lib/api';

function fmt(v:any){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}).replace(/ /g,'-');}
function n(v:any){const x=Number(v);return Number.isFinite(x)&&v!==''?x.toLocaleString():'';}
function sum(rows:any[],key:string){return rows.reduce((s,r)=>s+Number(r?.[key]||0),0);}

export default function CompanyFormPrint(){
  const p=useParams<{styleId:string;formId:string}>();const [payload,setPayload]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{api(`/documents/styles/${p.styleId}/forms/${p.formId}`).then(setPayload).catch(e=>setError(e.message));},[p.styleId,p.formId]);
  if(error)return <div className="print-loading">{error}</div>;if(!payload)return <div className="print-loading">Loading company form…</div>;
  const {form}=payload;const data=form.data||{};
  return <><div className="print-toolbar no-print"><button onClick={()=>window.print()}>Print A4</button><button onClick={()=>window.close()}>Close</button></div>
    {form.type==='SMS_SAMPLE_ORDER'&&<SmsPrint data={data} form={form}/>} 
    {form.type==='TNA_PLAN'&&<TnaPrint data={data} form={form}/>} 
    {form.type==='BULK_FABRIC_ORDER'&&<BulkPrint data={data} form={form}/>} 
  </>;
}

function Header({title}:{title:string}){return <><div className="cf-brand"><img src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions Limited"/><div className="cf-company">NORTHERN FASHIONS LIMITED</div></div><div className="cf-title">{title}</div></>}
function DocStamp({form}:{form:any}){return <div className="cf-doc-stamp no-print">{form.templateVersion} · {form.status.replace(/_/g,' ')} · Rev {form.revision}</div>}

function SmsPrint({data,form}:{data:any;form:any}){
 const orders=data.buyerSampleOrders||[],rows=data.fabricRows||[],ta=data.sampleTa||[];
 const orderQty=orders.reduce((s:number,r:any)=>s+Number(r.qty||0),0),kg=rows.reduce((s:number,r:any)=>s+Number(r.totalKgs||0),0),sampleQty=rows.reduce((s:number,r:any)=>s+Number(r.sampleQty||0),0);
 return <main className="company-form-print cf-sms"><DocStamp form={form}/><Header title="SAMPLE FABRIC & SAMPLE GARMENT ORDER SHEET"/>
   <div className="cf-sms-top"><div className="cf-meta-lines"><div><b>Date of Issue :</b><span>{fmt(data.dateOfIssue)}</span></div><div><b>Buyer :</b><span>{data.buyer}</span></div><div><b>Job No. :</b><span>{data.jobNo}</span></div><div><b>Sample Type:</b><span>{data.sampleType}</span></div><div><b>Coll #</b><span>{data.collection||data.collNo}</span></div></div>
   <table className="cf-mini-table"><thead><tr><th>Ord. Rcvd Dt.</th><th>Buyer Sample Order No</th><th>Qty in Pcs</th></tr></thead><tbody>{orders.map((r:any,i:number)=><tr key={i}><td>{fmt(r.receivedDate)}</td><td>{r.orderNo}</td><td>{n(r.qty)}</td></tr>)}<tr><td></td><th>Total</th><th>{n(orderQty)}</th></tr></tbody></table><div className="cf-received">Received By<br/><br/>{data.receivedBy||''}</div></div>
   <div className="cf-route-labels"><span>Knitting</span><span>Dyeing-Finishing</span><span>Sample</span></div>
   <table className="cf-grid cf-sms-main"><thead><tr><th>Sl No</th><th>Style/Ref. No./<br/>Style Name</th><th>Part</th><th>GSM & Fabric<br/>Description</th><th>Fabric Composition</th><th>Color/Code</th><th>Garment Description</th><th>Body<br/>Fabric</th><th>Total<br/>Kgs</th><th>Size</th><th>Qty in<br/>Pcs</th><th>Ex-Fcty.<br/>Delivery Dt.</th><th>Remarks</th></tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={i}><td>{i+1}</td><td><b>{r.styleRef||data.styleNo}</b><br/>{r.styleName||data.styleName}</td><td>{r.part}</td><td>{r.gsmFabricDescription}</td><td>{r.composition}</td><td>{r.colorCode}</td><td>{r.garmentDescription||data.garmentDescription}</td><td>{r.bodyFabricQty}</td><td>{r.totalKgs}</td><td>{r.size}</td><td>{r.sampleQty}</td><td>{fmt(r.exFactoryDate)}</td><td>{r.remarks}</td></tr>)}</tbody><tfoot><tr><td colSpan={7}></td><th>Total</th><th>{n(kg)}</th><td></td><th>{n(sampleQty)}</th><td colSpan={2}></td></tr></tfoot></table>
   <div className="cf-instructions"><b>Specific Instructions:</b><br/>{data.specificInstructions}</div>
   <div className="cf-bottom-grid"><table className="cf-grid cf-sample-ta"><thead><tr><th colSpan={ta.length}>Sample T&A</th></tr><tr>{ta.map((x:any)=><th key={x.activity}>{x.activity}</th>)}</tr></thead><tbody><tr><th>Start</th>{ta.slice(1).map((x:any)=><td key={x.activity}>{fmt(x.start)}</td>)}</tr><tr><th>End</th>{ta.slice(1).map((x:any)=><td key={x.activity}>{fmt(x.end)}</td>)}</tr></tbody></table><div className="cf-signatures"><div><span>Prepared By</span><b>{data.preparedBy||data.merchandiser||''}</b><small>Merchandising</small></div><div><span>Checked By</span><b>{data.checkedBy||''}</b><small>Team Leader</small></div><div><span>Authorised By</span><b>{data.authorisedBy||''}</b><small>DGM (IE&P)</small></div></div></div>
 </main>;
}

function TnaPrint({data,form}:{data:any;form:any}){
 const pos=data.poRows||[],rows=data.planRows||[];const totalPo=pos.reduce((s:number,r:any)=>s+Number(r.qty||0),0);
 return <main className="company-form-print cf-tna"><DocStamp form={form}/><Header title="Time & Action Plan (T & A)"/>
   <div className="cf-tna-meta"><div><b>Date of Issue :</b><span>{fmt(data.dateOfIssue)}</span></div><div className="wide"><b>Garment Description :</b><span>{data.garmentDescription}</span></div><div><b>Buyer :</b><span>{data.buyer}</span></div><div><b>Coll#</b><span>{data.collection||data.collNo}</span></div><div className="wide"><b>Print/EMB:</b><span>{data.printEmb}</span></div><div><b>PO Rcvd Dt. :</b><span>{fmt(data.poReceivedDate)}</span></div><div className="wide"><b>Fabric description :</b><span>{data.fabricDescription}</span></div><div><b>Job Number :</b><span>{data.jobNo}{data.orderBasis==='STOCK_FABRIC'?' - Stock Fabric':' - Finished Goods'}</span></div><div className="wide"><b>Total Gmt. Order Qty (in pcs) :</b><span>{n(data.totalOrderQty)}</span></div><div><b>Buyer Style/Ref. :</b><span>{data.styleNo}</span></div><div className="wide"><b>Total Fab Qty (in Kgs) :</b><span>{n(data.totalFabricQtyKg)}</span></div><div><b>Style Name :</b><span>{data.styleName}</span></div></div>
   <table className="cf-grid cf-po-table"><thead><tr><th>Buyer P.O No. / Market</th><th>Qty in Pc</th><th>S/Dt.</th></tr></thead><tbody>{pos.map((r:any,i:number)=><tr key={i}><td>{r.reference||r.poNumber||r.market}</td><td>{n(r.qty)}</td><td>{fmt(r.shipDate)}</td></tr>)}<tr><th>Total</th><th>{n(totalPo||data.totalOrderQty)}</th><td></td></tr></tbody></table>
   <div className="cf-tna-space"></div>
   <table className="cf-grid cf-plan-table"><thead><tr><th rowSpan={2}>Activity / Work</th><th colSpan={2}>Time/Date to be Completed</th><th rowSpan={2}>Processing<br/>Time<br/>(Days)</th><th rowSpan={2}>Slack<br/>Time</th></tr><tr><th>Start</th><th>End</th></tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={i}><td>{r.activity}</td><td>{fmt(r.start)}</td><td>{fmt(r.end)}</td><td>{r.processingDays}</td><td>{r.slackDays}</td></tr>)}</tbody><tfoot><tr><td colSpan={3} className="right"><b>Total Production Time</b></td><td>{rows.reduce((s:number,r:any)=>s+Number(r.processingDays||0),0)||''}</td><td></td></tr></tfoot></table>
   <div className="cf-tna-sign"><span>Planning Department<br/><b>{data.planningDepartment||''}</b></span><span>Merchandiser<br/><b>{data.merchandiserSign||data.merchandiser||''}</b></span></div>
 </main>;
}

function BulkPrint({data,form}:{data:any;form:any}){
 const pos=data.poRows||[],rows=data.fabricRows||[];const sizes=(data.sizeColumns?.length?data.sizeColumns:['Size']);const breakdown=(data.sizeBreakdown?.length?data.sizeBreakdown:[{colorCode:'',sizes:{Size:''},total:'',packingAssort:''}]);const totalPo=pos.reduce((s:number,r:any)=>s+Number(r.qty||0),0);const totalFabric=rows.reduce((s:number,r:any)=>s+Number(r.totalKg||0),0);
 const legacyCols=[{key:'LEG72',width:'72”',cm:'182.88 cm',requirement:'Body Fabric Req. (Kgs)',legacy:'width72Kg'},{key:'LEG64',width:'64”',cm:'162.56 cm',requirement:'Body Fabric Req. (Kgs)',legacy:'width64Kg'},{key:'LEG56',width:'56”',cm:'',requirement:'Rib Req. (Kgs)',legacy:'rib56Kg'}].filter(c=>rows.some((r:any)=>r[c.legacy]!==undefined&&r[c.legacy]!==''));
 const widthCols=(data.fabricWidthColumns?.length?data.fabricWidthColumns:(legacyCols.length?legacyCols:[{key:'W1',width:'',cm:'',requirement:'Fabric Req. (Kgs)'}]));
 const widthVal=(r:any,c:any)=>r.widthQty?.[c.key]??(c.legacy?r[c.legacy]:'')??'';
 const widthTotals=Object.fromEntries(widthCols.map((c:any)=>[c.key,rows.reduce((a:number,r:any)=>a+Number(widthVal(r,c)||0),0)]));
 const sizeTotals=Object.fromEntries(sizes.map((sz:string)=>[sz,breakdown.reduce((a:number,r:any)=>a+Number(r.sizes?.[sz]||0),0)]));
 return <main className="company-form-print cf-bulk"><DocStamp form={form}/>
   <div className="cf-bulk-top"><div className="cf-meta-lines"><div><b>Date of Issue :</b><span>{fmt(data.dateOfIssue)}</span></div><div><b>Buyer :</b><span>{data.buyer}</span><b>COLL:</b><span>{data.collection||data.collNo}</span></div><div><b>Job Number :</b><span>{data.jobNo}{data.orderBasis==='STOCK_FABRIC'?' - Stock Fabric':data.orderBasis==='FINISHED_GOODS'?' - Finished Goods':''}</span></div><div><b>Buyer Style/Ref. :</b><span>{data.styleNo}</span></div><div><b>Style Name :</b><span>{data.styleName}</span></div></div><div className="cf-meta-lines"><div><b>Garment Description :</b><span>{data.garmentDescription}</span></div><div><b>Delivery Closing Date :</b><span>{fmt(data.deliveryClosingDate)}</span></div><div><b>PO Rcvd. Date :</b><span>{fmt(data.poReceivedDate)}</span></div></div></div>
   <div className="cf-to">To : {data.toDepartment||'Knitting & Dyeing'}</div>
   <table className="cf-grid cf-po-table"><thead><tr><th>Buyer P.O No. / Market</th><th>Qty in Pcs</th><th>S/Dt.</th></tr></thead><tbody>{pos.map((r:any,i:number)=><tr key={i}><td>{r.reference||r.poNumber||r.market}</td><td>{n(r.qty)}</td><td>{fmt(r.shipDate)}</td></tr>)}<tr><th>Total</th><th>{n(totalPo||data.totalOrderQty)}</th><td></td></tr></tbody></table>
   <div className="cf-bulk-note"></div>
   <table className="cf-grid cf-fabric-table dynamic"><thead><tr><th>Part</th><th>GSM & Fabric<br/>Description</th><th>Composition</th><th>Color / Code</th>{widthCols.map((c:any)=><th key={c.key}>{c.width?<>Open Width finish : {c.width}<br/>{c.cm&&<small>({c.cm})</small>}<br/></>:<>Finish Width<br/></>}{c.requirement||'Fabric Req. (Kgs)'}</th>)}<th>Total Fabric Qty<br/>(in Kgs)</th></tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={i}><td>{r.part}</td><td>{r.gsmFabricDescription}</td><td>{r.composition}</td><td>{r.colorCode}</td>{widthCols.map((c:any)=><td key={c.key}>{n(widthVal(r,c))}</td>)}<td>{n(r.totalKg)}</td></tr>)}</tbody><tfoot><tr><td colSpan={4} className="right"><b>Total</b></td>{widthCols.map((c:any)=><td key={c.key}>{n(widthTotals[c.key])}</td>)}<td>{n(totalFabric)}</td></tr></tfoot></table>
   <table className="cf-grid cf-size-table"><thead><tr><th rowSpan={2}>Color / Code</th><th colSpan={sizes.length}>Size</th><th rowSpan={2}>Total</th><th rowSpan={2}>Packing Assort</th></tr><tr>{sizes.map((sz:string)=><th key={sz}>{sz}</th>)}</tr></thead><tbody>{breakdown.map((r:any,i:number)=><tr key={i}><td>{r.colorCode}</td>{sizes.map((sz:string)=><td key={sz}>{n(r.sizes?.[sz])}</td>)}<td>{n(r.total)}</td><td>{r.packingAssort}</td></tr>)}<tr><th>Grand Total</th>{sizes.map((sz:string)=><th key={sz}>{sizeTotals[sz]?n(sizeTotals[sz]):''}</th>)}<th>{breakdown.some((r:any)=>r.total!==''&&r.total!==undefined)?n(breakdown.reduce((a:number,r:any)=>a+Number(r.total||0),0)):''}</th><th></th></tr></tbody></table>
   <table className="cf-grid cf-consumption"><thead><tr><th>Consumption in<br/>Kg / Dz</th><th>All Body</th><th>Neck Tape</th><th>Neck binding</th><th>Avg. Consumpt.</th></tr></thead><tbody><tr><td></td><td>{data.consumption?.allBody}</td><td>{data.consumption?.neckTape}</td><td>{data.consumption?.neckBinding}</td><td>{data.consumption?.avgConsumption}</td></tr></tbody></table>
   <div className="cf-signatures cf-bulk-sign"><div><span>Prepared By</span><b>{data.preparedBy||data.merchandiser||''}</b><small>Merchandising</small></div><div><span>Checked By</span><b>{data.checkedBy||''}</b><small>Team Leader</small></div><div><span>Authorised By</span><b>{data.authorisedBy||''}</b><small>DGM (P&IE/S&M)</small></div><div><span></span><b></b><small>Knitting</small></div></div>
 </main>;
}
