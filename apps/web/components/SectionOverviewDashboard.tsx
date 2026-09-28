'use client';

import Link from 'next/link';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { MODULE_GROUPS, SectionOverview } from '../lib/modules';
import { displayJobNo } from '../lib/display';

function n(v:any){return Number(v||0).toLocaleString(undefined,{maximumFractionDigits:1});}
function pct(a:number,b:number){return b?Math.round(a/b*100):0;}
function scalar(v:any){return typeof v==='number'?v:Number(v||0);}
function statusCount(rows:any[]){const m=new Map<string,number>();for(const r of rows){const k=String(r.sectionStatus||'Unknown');m.set(k,(m.get(k)||0)+1)}return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);}

export default function SectionOverviewDashboard({overview}:{overview:SectionOverview}){
  const [orders,setOrders]=useState<any[]>([]),[tasks,setTasks]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[ta,setTa]=useState<any[]>([]),[heat,setHeat]=useState<any>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{
    const base=await Promise.all([api('/orders').catch(()=>[]),api('/tasks/my').catch(()=>[]),api(`/demo/module/${overview.representativeSlug}`).catch(()=>[])]);setOrders(base[0]);setTasks(base[1]);setRows(base[2]);
    if(['central-planning','management'].includes(overview.slug))setHeat(await api('/planning/capacity/heatmap').catch(()=>null));
    if(overview.slug==='central-planning')setTa(await api('/planning/ta/workqueue').catch(()=>[]));
  }finally{setLoading(false)}})()},[overview.slug,overview.representativeSlug]);

  const group=MODULE_GROUPS.find(g=>g.overviewSlug===overview.slug);
  const facts=useMemo(()=>{
    const totalQty=orders.reduce((s,o)=>s+scalar(o.totalQty),0);
    const critical=tasks.filter(t=>['HIGH','CRITICAL'].includes(String(t.priority).toUpperCase())).length;
    const attention=rows.filter(r=>!/complete|ready|released|shipped|n\/a|pass/i.test(String(r.sectionStatus||''))).length;
    if(overview.slug==='management')return {cards:[['Confirmed Jobs',orders.length,'Order book'],['Order Qty',n(totalQty),'pcs'],['Pending Tasks',tasks.length,'Role relevant'],['High / Critical',critical,'Needs attention']],progress:[rows.filter(r=>/shipped|ready/i.test(String(r.sectionStatus))).length,rows.length,'Shipment / readiness']};
    if(overview.slug==='merchandising-overview'){let overdue=0;for(const o of orders)for(const s of o.styles||[]){const f=s.sourceMetadata?.merchandisingFollowUp||{};if(Object.values(f).some(v=>v==='OVERDUE'))overdue+=1}return {cards:[['Active Jobs',orders.length,'Bulk order source'],['Order Qty',n(totalQty),'pcs'],['Overdue Actions',overdue,'Merch follow-up'],['My Pending Tasks',tasks.length,'Assigned']],progress:[Math.max(0,orders.length-overdue),orders.length,'Jobs without overdue action']};}
    if(overview.slug==='sample-cad-technical'){const making=rows.reduce((s,r)=>s+scalar(r.sectionData?.makingStyles||r.sectionData?.styles||0),0);const capacityAttention=rows.filter(r=>/attention|late|pending/i.test(String(r.sectionStatus))).length;return {cards:[['Jobs / Samples',rows.length,'Current workload'],['Sample Styles',n(making||rows.length),'Recorded'],['Capacity Attention',capacityAttention,'Needs review'],['Pending Tasks',tasks.filter(t=>/CAD|SAMPLE|TECH/i.test(String(t.module))).length,'Related']],progress:[Math.max(0,rows.length-capacityAttention),rows.length,'On-track sample / technical']};}
    if(overview.slug==='central-planning'){const approved=ta.filter(x=>x.taStatus==='APPROVED').length;const draft=ta.filter(x=>x.taStatus==='DRAFT').length;const maxLoad=heat?Math.max(0,...heat.rows.flatMap((r:any)=>r.slots.map((s:any)=>Number(s.loadPct||0)))):0;return {cards:[['T&A Queue',ta.length,'Confirmed jobs'],['Approved T&A',approved,'Released'],['Draft / Pending',ta.length-approved,'Planning work'],['Max Capacity Load',heat?`${maxLoad}%`:'—','Current heatmap']],progress:[approved,ta.length,'T&A approval']};}
    if(overview.slug==='ie-overview'){const smv=rows.filter(r=>scalar(r.sectionData?.smv)>0);const avgSmv=smv.length?smv.reduce((s,r)=>s+scalar(r.sectionData.smv),0)/smv.length:0;const machines=rows.reduce((s,r)=>s+scalar(r.sectionData?.machineQty),0);return {cards:[['IE Jobs',rows.length,'Bulletin workload'],['Avg SMV',n(avgSmv),'Minutes'],['Machine Requirement',n(machines),'Configured jobs'],['Pending / Gap',attention,'Needs IE action']],progress:[Math.max(0,rows.length-attention),rows.length,'IE ready / clear']};}
    if(overview.slug==='yarn-fabric'){const req=rows.reduce((s,r)=>s+scalar(r.sectionData?.requiredKg),0);const avail=rows.reduce((s,r)=>s+scalar(r.sectionData?.availableKg||r.sectionData?.producedKg||r.sectionData?.deliveredKg),0);return {cards:[['Tracked Jobs',rows.length,'Yarn / fabric'],['Required',`${n(req)} KG`,'Current requirement'],['Available / Done',`${n(avail)} KG`,'Current section data'],['Short / Attention',attention,'Needs follow-up']],progress:[Math.min(avail,req),req,'Material readiness']};}
    if(overview.slug==='garment-production'){const order=rows.reduce((s,r)=>s+scalar(r.orderQty),0);const sewn=rows.reduce((s,r)=>s+scalar(r.sectionData?.productionQty||r.production?.sewingQty),0);const cut=rows.reduce((s,r)=>s+scalar(r.production?.cuttingQty),0);const packed=rows.reduce((s,r)=>s+scalar(r.production?.packedQty),0);return {cards:[['Order Qty',n(order),'pcs'],['Cutting',n(cut),'pcs'],['Sewing',n(sewn),'pcs'],['Packed',n(packed),'pcs']],progress:[sewn,order,'Sewing achievement']};}
    if(overview.slug==='quality-stores'){const holds=rows.filter(r=>/hold|attention|fail|retest/i.test(String(r.sectionStatus))).length;return {cards:[['Jobs Monitored',rows.length,'Quality / store'],['Released / Clear',Math.max(0,rows.length-holds),'Current status'],['Hold / Attention',holds,'Needs action'],['Pending Tasks',tasks.filter(t=>/QUALITY|TRIMS|STORE/i.test(String(t.module))).length,'Related']],progress:[Math.max(0,rows.length-holds),rows.length,'Release rate']};}
    const shipped=rows.reduce((s,r)=>s+scalar(r.sectionData?.shippedQty||r.production?.shippedQty),0);const order=rows.reduce((s,r)=>s+scalar(r.orderQty),0);const ready=rows.filter(r=>/shipped|ready|preparing/i.test(String(r.sectionStatus))).length;return {cards:[['Shipment Jobs',rows.length,'Current schedule'],['Order Qty',n(order),'pcs'],['Shipped Qty',n(shipped),'pcs'],['Ready / Preparing',ready,'Jobs']],progress:[shipped,order,'Shipment completion']};
  },[overview.slug,orders,tasks,rows,ta,heat]);

  const status=statusCount(rows);const maxStatus=Math.max(1,...status.map(x=>x[1]));const [done,total,progressLabel]=facts.progress as [number,number,string];const progress=Math.max(0,Math.min(100,pct(done,total)));
  return <>
    <section className="section-overview-kpis">{facts.cards.map((c:any)=><div className="metric-card compact-metric" key={c[0]}><div className="metric-label">{c[0]}</div><div className="metric-value">{loading?'…':c[1]}</div><div className="metric-foot">{c[2]}</div></div>)}</section>
    <section className="section-overview-grid">
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Current status mix</div><div className="panel-sub">Relevant records from this section; bar view is used for status comparison.</div></div></div><div className="overview-bars">{status.map(([name,value])=><div className="overview-bar-row" key={name}><span>{name}</span><div><i style={{width:`${value/maxStatus*100}%`}}/></div><strong>{value}</strong></div>)}{!status.length&&<div className="empty-state compact"><strong>No section records yet</strong></div>}</div></div>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">{progressLabel}</div><div className="panel-sub">Donut is used only for a meaningful completed-vs-total measure.</div></div></div><div className="overview-donut-wrap"><div className="overview-donut" style={{'--pct':`${progress}%`} as CSSProperties}><div><strong>{progress}%</strong><span>{n(done)} / {n(total)}</span></div></div></div></div>
    </section>
    {heat&&<section className="panel overview-heat"><div className="panel-head"><div><div className="panel-title">Capacity load</div><div className="panel-sub">Section-wise heatmap is shown here because it is relevant to {overview.label}.</div></div></div><div className="overview-heat-grid">{heat.rows.slice(0,8).map((r:any)=><div key={r.section}><strong>{r.label}</strong><span>{Math.max(...r.slots.map((s:any)=>Number(s.loadPct||0)))}%</span></div>)}</div></section>}
    <section className="panel section-overview-links"><div className="panel-head"><div><div className="panel-title">Work areas</div><div className="panel-sub">Open a specific operational part only when you need it.</div></div></div><div className="quick-grid">{group?.items.map(item=><Link href={`/modules/${item.slug}`} className="quick-card" key={item.slug}><span className="quick-icon">{item.short}</span><div><strong>{item.name}</strong><span>{item.description}</span></div></Link>)}</div></section>
    {rows.length>0&&<section className="panel overview-attention"><div className="panel-head"><div><div className="panel-title">Recent section records</div><div className="panel-sub">Compact job identity; buyer full-name column is not repeated.</div></div></div><div className="overview-job-strip">{rows.slice(0,6).map(r=><div key={r.orderId}><strong>{displayJobNo(r.jobNo,r.buyerCode||r.buyer)}</strong><span>{r.styleNo||'—'} · {r.sectionStatus||'—'}</span></div>)}</div></section>}
  </>;
}
