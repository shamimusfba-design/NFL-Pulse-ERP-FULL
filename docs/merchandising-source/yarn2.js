function mountYarn(root,TODAY){
'use strict';
const G=id=>root.querySelector('#'+id);
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=x=>Math.round(Number(x)||0).toLocaleString('en-US');
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const fmt=d=>!d?'—':d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(2,4);
const mon=d=>d?d.slice(0,7):'';
const uniq=(a,f)=>[...new Set(a.map(f).filter(x=>x!==undefined&&x!==null&&x!==''))].sort((x,y)=>String(x).localeCompare(String(y),undefined,{numeric:true}));
const pct=(a,b)=>b?Math.round(a/b*100):0;
function toast(m){const t=G('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3000)}
const pill=(k,t)=>`<span class="st ${k}">${esc(t)}</span>`;
const KEY='nos-yk-v2';
let S={rcv:[],plans:[],set:{loss:12,cap:8.5,req:25},ps:{}};
try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)S=Object.assign(S,x)}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
// stock per yarn: physical = 28 Sep summary + receive - issue (entries)
const stockKey=s=>s.count;
const ydesc=s=>s.desc||s.count;
let YV='yarn',YSUB='min',KSUB='exec';
let F={month:'',buyer:'',ctype:'',fac:'',q:'',status:'',stockF:''};
let ROLE='store';
const ROLES=[['store','Yarn store'],['plan','Knitting planner'],['prod','Knitting production'],['h','Head of Merchandising (view)']];
const canStore=()=>ROLE==='store';const canPlan=()=>ROLE==='plan'||ROLE==='prod';
const FAC=l=>l.fac||'Not assigned';
const bal=l=>Math.max(0,l.order-l.prod);
// ---------- yarn helpers ----------
function physOf(y){const base=y.phys;const e=S.rcv.filter(r=>r.cnt===y.count);return e.reduce((a,r)=>a+(r.type==='Receive'?r.kg:-r.kg),base)}
const tok=c=>String(c).trim().split(/\s+/)[0].toUpperCase();
function yarnRows(){const minBy={};YARNS.forEach(y=>{const k=tok(y.count);minBy[k]=minBy[k]||y});return STOCK28.map(s=>{const m=minBy[tok(s.count)]||{safety:0,lc:0,avg:0};const ph=physOf(s);return{name:s.count,desc:s.desc,key:s.count,phys:ph,safety:m.safety,avg:m.avg,gap:ph-m.safety,lc:m.lc}})}
// ---------- header / sub nav ----------
function header(){return `<div class="rolebar"><span><b>${esc(ROLES.find(r=>r[0]===ROLE)[1])}</b></span><span>Report date ${fmt(TODAY)}</span></div>`}
// ---------- YARN STORE ----------
function yarnPage(m){
 const rows=yarnRows();
 const below=rows.filter(r=>r.gap<0).length;const totP=rows.reduce((a,r)=>a+r.phys,0);const totS=rows.reduce((a,r)=>a+r.safety,0);
 const rec=S.rcv.filter(r=>r.type==='Receive').reduce((a,r)=>a+r.kg,0);const iss=S.rcv.filter(r=>r.type!=='Receive').reduce((a,r)=>a+r.kg,0);
 const sub=`<div class="subtabs" style="margin:8px 0">${[['min','Minimum stock'],['pres','Store present status'],['rd','Receive & delivery']].map(([k,l])=>`<button class="${YSUB===k?'on':''}" data-ysub="${k}">${l}</button>`).join('')}</div>`;
 const filt=`<div class="fbar"><input type="search" id="yq" placeholder="Search yarn / count" value="${esc(F.q)}" aria-label="Search"><select id="yst" aria-label="Status"><option value="">All status</option><option value="below">Below minimum</option><option value="ok">OK</option></select><button class="btn sm" id="yclr">Clear</button></div>`;
 const cards=`<div class="kpis kp4"><button class="kpi bad" data-yst="below"><div class="n">${n(below)}</div><div class="l">Below minimum</div></button><div class="kpi"><div class="n">${n(totP)} kg</div><div class="l">Physical stock</div></div><div class="kpi"><div class="n">${n(totS)} kg</div><div class="l">Minimum stock</div></div><div class="kpi good"><div class="n">${n(rec)} kg</div><div class="l">Received (entries)</div></div></div>`;
 let body='';
 const q=F.q.toLowerCase();
 const list=rows.filter(r=>(!q||(r.name+' '+r.desc).toLowerCase().includes(q))&&(F.stockF!=='below'||r.gap<0)&&(F.stockF!=='ok'||r.gap>=0));
 if(YSUB==='min'||YSUB==='pres'){
  body=`<div class="panel"><div class="tablewrap" style="min-height:0"><table class="noband"><thead><tr class="hdr"><th class="sk sk0">Yarn</th><th class="num">Physical (kg)</th><th class="num">Minimum (kg)</th><th class="num">Physical − Minimum</th><th class="num">Avg use / month (kg)</th><th>Status</th></tr></thead><tbody>${list.slice(0,120).map(r=>`<tr><td class="sk sk0"><b>${esc(r.name)}</b></td><td class="num">${n(r.phys)}</td><td class="num">${n(r.safety)}</td><td class="num" style="color:${r.gap<0?'var(--bad)':'inherit'}">${n(r.gap)}</td><td class="num">${n(r.avg)}</td><td>${r.gap<0?pill('late','Below minimum'):r.safety===0?pill('none','No minimum set'):pill('done','OK')}</td></tr>`).join('')}</tbody></table></div>
  <div class="pager"><span>${list.length} yarns · showing ${Math.min(120,list.length)}</span><span>Physical = 28 Sep summary + receive − issue</span></div></div>`;
 } else {
  const r2=S.rcv.slice().reverse();
  body=`<div class="panel pad"><div class="form" style="grid-template-columns:repeat(5,minmax(0,1fr));align-items:end">
   <label>Yarn<select id="rYarn">${rows.map(r=>`<option value="${esc(r.key)}">${esc(r.name)}</option>`).join('')}</select></label>
   <label>Type<select id="rType"><option>Receive</option><option>Delivery (issue)</option></select></label>
   <label>Kg<input type="number" id="rKg" min="0" step="any"></label>
   <label>Lot / challan / job<input type="text" id="rRef"></label>
   <label>Date<input type="date" id="rDate" value="${TODAY}"></label></div>
   <div class="ms" style="margin-top:8px"><button class="btn primary" id="rSave" ${canStore()?'':'disabled'}>Save entry</button><span class="muted" style="font-size:12.5px;align-self:center">Saving updates the physical stock and the minimum report at once.</span></div></div>
  <div class="panel" style="margin-top:12px"><div class="tablewrap" style="min-height:0"><table class="noband"><thead><tr class="hdr"><th>Date</th><th>Yarn</th><th>Type</th><th class="num">Kg</th><th>Lot / job</th><th>By</th></tr></thead><tbody>${r2.slice(0,100).map(r=>`<tr><td>${fmt(r.date)}</td><td>${esc(r.name)}</td><td>${pill(r.type==='Receive'?'done':'wait',r.type)}</td><td class="num">${n(r.kg)}</td><td>${esc(r.ref)}</td><td>${esc(r.by)}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No entry yet</td></tr>'}</tbody></table></div></div>`;
 }
 m.innerHTML=header()+cards+`<div class="tabs2">${sub}</div>`+filt+body;
 G('yq').oninput=e=>{F.q=e.target.value;render()};
 G('yst').value=F.stockF;G('yst').onchange=e=>{F.stockF=e.target.value;render()};
 G('yclr').onclick=()=>{F.q='';F.stockF='';render()};
 m.querySelectorAll('[data-ysub]').forEach(b=>b.onclick=()=>{YSUB=b.dataset.ysub;render()});
 m.querySelectorAll('[data-yst]').forEach(b=>b.onclick=()=>{F.stockF=b.dataset.yst;YSUB='min';render()});
 const sv=G('rSave');if(sv)sv.onclick=()=>{const kg=num(G('rKg').value);if(!kg){toast('Enter kg');return}const key=G('rYarn').value;const type=G('rType').value.startsWith('Receive')?'Receive':'Delivery';
  const y=STOCK28.find(s=>s.count===key);S.rcv.push({cnt:key,name:key,type,kg,ref:G('rRef').value,date:G('rDate').value||TODAY,by:ROLES.find(r=>r[0]===ROLE)[1]});save();toast(`${type} saved: ${n(kg)} kg · physical updated`);render()};
}
// ---------- KNITTING ----------
function knitRows(){return KNIT.map(l=>Object.assign({},l,{fac:S.ps[l.job+'|'+l.count+'|'+l.colour]?.fac||l.fac,prog:S.ps[l.job+'|'+l.count+'|'+l.colour]?.prog||''}))}
function knitPage(m){
 const rows=knitRows();
 const tot=rows.reduce((a,l)=>({o:a.o+l.order,p:a.p+l.prod,b:a.b+bal(l)}),{o:0,p:0,b:0});
 const sub=`<div class="subtabs" style="margin:8px 0">${[['exec','Production execution summary'],['plan','New production plan']].map(([k,l])=>`<button class="${KSUB===k?'on':''}" data-ksub="${k}">${l}</button>`).join('')}</div>`;
 const cards=`<div class="kpis kp4"><div class="kpi"><div class="n">${n(tot.o)} kg</div><div class="l">Total knitting qty</div></div><div class="kpi good"><div class="n">${n(tot.p)} kg</div><div class="l">Done · ${pct(tot.p,tot.o)}%</div></div><div class="kpi warn"><div class="n">${n(tot.b)} kg</div><div class="l">Balance</div></div><div class="kpi"><div class="n">${n(S.plans.length)}</div><div class="l">New plans (entered)</div></div></div>`;
 const f=`<div class="fbar"><input type="search" id="kq" placeholder="Search job, buyer, colour" value="${esc(F.q)}" aria-label="Search">
  <select id="kmon" aria-label="Month"><option value="">All months</option>${uniq(KNIT,l=>mon(l.taS||l.fos)).map(x=>`<option ${F.month===x?'selected':''} value="${x}">${x}</option>`).join('')}</select>
  <select id="kbuy" aria-label="Buyer"><option value="">All buyers</option>${uniq(KNIT,l=>l.buyer).map(x=>`<option ${F.buyer===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
  <select id="kct" aria-label="Count type"><option value="">All count types</option>${uniq(KNIT,l=>l.ctype).map(x=>`<option ${F.ctype===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
  <select id="kfac" aria-label="Knitting factory"><option value="">All factories</option>${uniq(rows,l=>FAC(l)).map(x=>`<option ${F.fac===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
  <button class="btn sm" id="kclr">Clear</button></div>`;
 let body='';
 if(KSUB==='exec'){
  const q=F.q.toLowerCase();
  const list=rows.filter(l=>(!q||(l.job+' '+l.buyer+' '+l.colour+' '+l.count).toLowerCase().includes(q))&&(!F.month||mon(l.taS||l.fos)===F.month)&&(!F.buyer||l.buyer===F.buyer)&&(!F.ctype||l.ctype===F.ctype)&&(!F.fac||FAC(l)===F.fac));
  const lt=list.reduce((a,l)=>({o:a.o+l.order,p:a.p+l.prod,b:a.b+bal(l)}),{o:0,p:0,b:0});
  body=`<div class="panel"><div class="tablewrap"><table class="noband"><thead><tr class="hdr"><th class="sk sk0">Buyer · Job</th><th>Count</th><th>Count type</th><th>Colour</th><th class="num">GSM</th><th>Dia</th><th class="num">Order kg</th><th class="num">Done kg</th><th class="num">Balance kg</th><th>Factory</th><th>Program</th><th>Knit start</th><th>Knit end</th><th>Status</th></tr></thead><tbody>${list.slice(0,300).map(l=>{const b=bal(l);const st=b===0?['done','Done']:l.prod>0?['wait','Partly done']:['none','Not started'];return `<tr><td class="sk sk0"><b>${esc(l.buyer)}</b><div class="muted" style="font-size:12px">${esc(l.job)}</div></td><td>${esc(l.count)}</td><td>${esc(l.ctype)}</td><td>${esc(l.colour)}</td><td class="num">${esc(l.gsm)}</td><td>${esc(l.dia)}</td><td class="num">${n(l.order)}</td><td class="num">${n(l.prod)}</td><td class="num">${n(b)}</td><td>${esc(FAC(l))}</td><td>${esc(l.prog||'')}</td><td>${fmt(l.taS)}</td><td>${fmt(l.taE)}</td><td>${pill(st[0],st[1])}</td></tr>`}).join('')||'<tr><td colspan="14" class="muted">No line</td></tr>'}</tbody><tfoot><tr><td class="sk sk0"><b>${n(list.length)} lines</b></td><td colspan="5"></td><td class="num"><b>${n(lt.o)}</b></td><td class="num"><b>${n(lt.p)}</b></td><td class="num"><b>${n(lt.b)}</b></td><td colspan="5"></td></tr></tfoot></table></div>
  <div class="pager"><span>Showing ${Math.min(300,list.length)} of ${list.length} lines · knitting production execution report (Aug 2026)</span></div></div>`;
 } else {
  const r=S.set;
  body=`<div class="panel pad"><div class="ptitle">New production plan · from fabric order sheet</div>
   <div class="form" style="grid-template-columns:repeat(4,minmax(0,1fr));align-items:end">
    <label>Job no.<input type="text" id="pJob" placeholder="e.g. BS-ONL 49021"></label>
    <label>Buyer<input type="text" id="pBuy" placeholder="e.g. BS-ONL"></label>
    <label>Count / yarn<input type="text" id="pCnt"></label>
    <label>Colour<input type="text" id="pCol"></label>
    <label>Finish fabric required (kg)<input type="number" id="pFin" min="0" step="any"></label>
    <label>Process loss %<input type="number" id="pLoss" value="${r.loss}" step="0.1"></label>
    <label>Knitting qty (kg) — auto<input type="text" id="pKnit" disabled></label>
    <label>Month<input type="month" id="pMon"></label></div>
   <div class="ms" style="margin-top:8px"><button class="btn primary" id="pSave" ${canPlan()?'':'disabled'}>Save & send to knitting review</button></div>
   <div class="fabnote" style="margin-top:8px">Knitting qty = finish fabric ÷ (1 − process loss %). The knitting department reviews this, then confirms the colour-wise final quantity. The final matrix will replace this simple formula when you send it.</div></div>
  <div class="panel" style="margin-top:12px"><div class="tablewrap" style="min-height:0"><table class="noband"><thead><tr class="hdr"><th>Job</th><th>Buyer</th><th>Colour</th><th class="num">Finish kg</th><th class="num">Knitting kg</th><th>Status</th></tr></thead><tbody>${S.plans.slice().reverse().map(p=>`<tr><td>${esc(p.job)}</td><td>${esc(p.buyer)}</td><td>${esc(p.colour)}</td><td class="num">${n(p.fin)}</td><td class="num">${n(p.knit)}</td><td>${pill(p.status==='Confirmed'?'done':'wait',p.status)}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No plan yet</td></tr>'}</tbody></table></div></div>`;
 }
 m.innerHTML=header()+cards+sub+f+body;
 G('kq').oninput=e=>{F.q=e.target.value;render()};
 G('kmon').onchange=e=>{F.month=e.target.value;render()};G('kbuy').onchange=e=>{F.buyer=e.target.value;render()};G('kct').onchange=e=>{F.ctype=e.target.value;render()};G('kfac').onchange=e=>{F.fac=e.target.value;render()};
 G('kclr').onclick=()=>{F={month:'',buyer:'',ctype:'',fac:'',q:'',status:'',stockF:''};render()};
 m.querySelectorAll('[data-ksub]').forEach(b=>b.onclick=()=>{KSUB=b.dataset.ksub;render()});
 const ps=G('pLoss');if(ps){const calc=()=>{const fin=num(G('pFin').value),l=num(ps.value);G('pKnit').value=fin?n(fin/(1-l/100)):''};G('pFin').oninput=calc;ps.oninput=calc;
  G('pSave').onclick=()=>{const fin=num(G('pFin').value);if(!fin){toast('Enter finish fabric kg');return}const knit=Math.round(fin/(1-num(ps.value)/100));S.plans.push({job:G('pJob').value.trim(),buyer:G('pBuy').value.trim(),colour:G('pCol').value.trim(),fin,knit,loss:num(ps.value),status:'Waiting knitting review',by:ROLES.find(r=>r[0]===ROLE)[1]});S.set.loss=num(ps.value);save();toast('Plan sent to knitting review');render()}}
}
// ---------- render ----------
function render(){const ae=document.activeElement;const keep=ae&&ae.tagName==='INPUT'&&ae.type==='search'&&ae.id&&root.contains(ae)?ae:null;const m=G('ymain');
 if(YV==='yarn')yarnPage(m);else knitPage(m);
 if(keep){const nw=root.querySelector('#'+keep.id);if(nw&&nw!==keep){const hi=nw.oninput;keep.oninput=e=>{nw.value=keep.value;if(hi)hi.call(nw,e)};nw.replaceWith(keep);try{keep.focus({preventScroll:true})}catch(e){}}}}
G('ysel').innerHTML=ROLES.map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('');
G('ysel').onchange=e=>{ROLE=e.target.value;render()};
function setTop(v){YV=v;F={month:'',buyer:'',ctype:'',fac:'',q:'',status:'',stockF:''};render();if(window.__yarnNav)window.__yarnNav()}
render();
return{top:[['yarn','Yarn Store'],['knit','Knitting']],get top_(){return YV},setTop,rerender:render};
}
