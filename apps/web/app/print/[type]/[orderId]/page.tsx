'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { displayJobNo } from '../../../../lib/display';

const TA_ROWS = [
  { label:'Yarn Dyeing', start:'yarnDyeingStart', end:'yarnDyeingEnd' },
  { label:'Knitting', start:'knittingStart', end:'knittingEnd', core:true },
  { label:'Dyeing / Fabric Finishing', start:'dyeingFinishingStart', end:'dyeingFinishingEnd', core:true },
  { label:'AOP / Brush / Peach', start:'aopStart', end:'aopEnd' },
  { label:'Trims In-house', date:'trimsInhouseDate', core:true },
  { label:'File Handover', date:'fileHandoverDate', core:true },
  { label:'PP Meeting', date:'ppMeetingDate', core:true },
  { label:'Cutting', start:'cuttingStart', end:'cuttingEnd', core:true },
  { label:'Printing', start:'printingStart', end:'printingEnd' },
  { label:'Embroidery', start:'embroideryStart', end:'embroideryEnd' },
  { label:'Sewing', start:'sewingStartDate', end:'sewingEnd', core:true },
  { label:'Garment Wash / Dye', start:'garmentWashStart', end:'garmentWashEnd' },
  { label:'Finishing / Packing', start:'finishingStart', end:'finishingEnd', core:true },
  { label:'Pre-Final Inspection', date:'preFinalInspection', core:true },
  { label:'Final Inspection', date:'finalInspection', core:true },
  { label:'Ex-Factory', date:'exFactoryDate', core:true },
  { label:'CCD / Shipment Date', date:'cargoClosingDate', core:true },
] as const;

function fmtDate(v: any) { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB'); }
function num(v: any) { return Number(v || 0).toLocaleString(); }
function typeTitle(type: string) { return type === 'fabric-order-sheet' ? 'FABRIC ORDER SHEET' : type === 'ta-plan' ? 'TIME & ACTION PLAN' : 'WORK ORDER'; }

export default function PrintableJobDocument() {
  const params = useParams<{ type: string; orderId: string }>();
  const type = String(params.type || '');
  const orderId = String(params.orderId || '');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (orderId) api(`/orders/${orderId}`).then(setOrder).catch(e => setError(e.message)); }, [orderId]);
  const cad = order?.sourceMetadata?.cadConsumption;
  const title = typeTitle(type);
  const poRefs = useMemo(() => (order?.styles || []).flatMap((s: any) => (s.purchaseOrders || []).map((p: any) => p.poNumber)).filter(Boolean).join(', '), [order]);

  if (error) return <div className="print-loading">{error}</div>;
  if (!order) return <div className="print-loading">Loading document…</div>;

  return <main className="print-page">
    <div className="print-toolbar no-print"><button onClick={() => window.print()}>Print</button><button onClick={() => window.close()}>Close</button></div>
    <header className="print-header"><div className="print-brand"><img src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions Limited"/><div><h1>NORTHERN FASHIONS LIMITED</h1><p>Plot 16-18, Dakhin Panishail, EPZ Road, Kashimpur, Gazipur, Bangladesh</p></div></div><div className="print-doc-title">{title}</div></header>

    <section className="print-meta-grid">
      <div><span>Buyer Job No</span><strong>{displayJobNo(order.jobNo, order.buyer)}</strong></div><div><span>Order Qty</span><strong>{num(order.totalQty)} pcs</strong></div><div><span>PO / Order Ref</span><strong>{poRefs || '—'}</strong></div>
    </section>

    {type === 'fabric-order-sheet' && <FabricOrderSheet order={order} cad={cad} />}
    {type === 'ta-plan' && <TaPlan order={order} />}
    {type === 'work-order' && <WorkOrder order={order} />}

    <footer className="print-footer"><div>Prepared By: ____________________</div><div>Checked By: ____________________</div><div>Approved By: ____________________</div></footer>
  </main>;
}

function FabricOrderSheet({ order, cad }: { order: any; cad: any }) {
  if (!cad?.rows?.length) return <div className="print-warning">CAD consumption is still pending. Confirm CAD consumption before printing the Fabric Order Sheet.</div>;
  const styleMap = new Map((order.styles || []).map((s: any) => [s.id, s]));
  return <>
    <table className="print-table"><thead><tr><th>Style</th><th>Item Description</th><th>Color</th><th>Order Qty</th><th>Fabric Description</th><th>Fabric Type</th><th>GSM</th><th>Dia</th><th>Consumption Basis</th><th>Consumption / Total KG</th><th>Wastage %</th><th>Required KG</th><th>Remarks</th></tr></thead><tbody>
      {cad.rows.map((r: any, i: number) => { const s: any = styleMap.get(r.styleId); return <tr key={i}><td>{s?.styleNo || '—'}</td><td>{s?.itemDescription || '—'}</td><td>{r.color}</td><td>{num(r.orderQty)}</td><td>{r.fabricDescription}</td><td>{r.fabricType || ''}</td><td>{r.gsm || ''}</td><td>{r.dia || ''}</td><td>{r.consumptionBasis}</td><td>{r.consumptionValue ?? ''}</td><td>{r.wastagePct ?? ''}</td><td>{Number(r.requiredKg || 0).toFixed(2)}</td><td>{r.remarks || ''}</td></tr>; })}
    </tbody><tfoot><tr><td colSpan={11}><strong>Total Fabric Requirement</strong></td><td><strong>{cad.rows.reduce((sum: number, r: any) => sum + Number(r.requiredKg || 0), 0).toFixed(2)} KG</strong></td><td></td></tr></tfoot></table>
    {cad.remarks && <div className="print-note"><strong>CAD Remarks:</strong> {cad.remarks}</div>}
  </>;
}

function TaPlan({ order }: { order: any }) {
  return <div className="ta-print-stack">{(order.styles || []).map((style: any) => {
    const sm = style.sourceMetadata || {}; const planning = sm.planning || {}; const pos = style.purchaseOrders || [];
    const ccd = pos.map((p: any) => p.ccd || p.shipmentDate).filter(Boolean).sort()[0];
    return <section className="ta-style-sheet" key={style.id}>
      <div className="ta-info-grid"><div><span>Style</span><strong>{style.styleNo}</strong></div><div><span>Item Description</span><strong>{style.itemDescription || '—'}</strong></div><div><span>Order Qty</span><strong>{num(style.quantity)} pcs</strong></div><div><span>CCD / Shipment</span><strong>{fmtDate(ccd) || '—'}</strong></div><div><span>Fabric Req. (KG)</span><strong>{sm.production?.fabricRequired ? Number(sm.production.fabricRequired).toFixed(2) : ''}</strong></div><div><span>T&A Status</span><strong>{planning.taStatus || 'DRAFT / NOT APPROVED'}</strong></div><div><span>T&A Plan Date</span><strong>{fmtDate(planning.taPlanDate)}</strong></div><div><span>Approved By</span><strong>{planning.taApprovedByName || ''}</strong></div></div>
      <table className="print-table ta-table"><thead><tr><th>Process</th><th>Start Date</th><th>End Date</th><th>Lead Time</th><th>Slack Time</th></tr></thead><tbody>{TA_ROWS.filter((r:any)=>r.core || (r.date ? planning[r.date] : planning[r.start] || planning[r.end])).map((r:any,i:number,arr:any[])=>{ const start=r.date?planning[r.date]:planning[r.start]; const end=r.date?planning[r.date]:planning[r.end]; const lead=!r.date&&start&&end?`${Math.max(1,Math.round((new Date(end).getTime()-new Date(start).getTime())/86400000)+1)} d`:'Milestone'; const next=arr[i+1]; const nextStart=next?(next.date?planning[next.date]:planning[next.start]):null; let slack='—'; if(end&&nextStart){const gap=Math.round((new Date(nextStart).getTime()-new Date(end).getTime())/86400000)-1;slack=gap<0?`Overlap ${Math.abs(gap)} d`:`${gap} d`;} return <tr key={r.label}><td>{r.label}</td>{r.date?<td colSpan={2}>{fmtDate(start)}</td>:<><td>{fmtDate(start)}</td><td>{fmtDate(end)}</td></>}<td>{lead}</td><td>{slack}</td></tr>;})}</tbody></table>
      <div className="print-note">Draft dates may be previewed here, but only APPROVED T&A dates are released to Merchandising. The exact company print layout will be replaced from the approved Excel template.</div>
    </section>;
  })}</div>;
}

function WorkOrder({ order }: { order: any }) {
  return <div className="ta-print-stack">{(order.styles || []).map((style: any) => {
    const sm = style.sourceMetadata || {}; const planning = sm.planning || {}; const outside = planning.outsideProcess || {};
    return <section className="ta-style-sheet" key={style.id}>
      <div className="ta-info-grid"><div><span>Style</span><strong>{style.styleNo}</strong></div><div><span>Item</span><strong>{style.itemDescription || '—'}</strong></div><div><span>Order Qty</span><strong>{num(style.quantity)} pcs</strong></div><div><span>Process</span><strong>{outside.process || planning.outsideProcessType || 'Print / Embroidery / Outside Process'}</strong></div></div>
      <table className="print-table"><tbody><tr><th>Vendor / Factory</th><td>{outside.vendor || ''}</td><th>Work Order Date</th><td>{fmtDate(outside.workOrderDate)}</td></tr><tr><th>Send Qty</th><td>{outside.sendQty || ''}</td><th>Required Return Date</th><td>{fmtDate(outside.requiredReturnDate)}</td></tr><tr><th>Print / Emb Description</th><td colSpan={3}>{outside.description || planning.printEmbDescription || ''}</td></tr><tr><th>Remarks</th><td colSpan={3}>{outside.remarks || ''}</td></tr></tbody></table>
    </section>;
  })}</div>;
}
