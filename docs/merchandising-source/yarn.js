function mountYarn(root,TODAY){
'use strict';
const G=id=>root.querySelector('#'+id);
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=x=>Math.round(Number(x)||0).toLocaleString('en-US');
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const fmt=d=>!d?'—':d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(2,4);
const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const chip=(t,c)=>`<span class="chip ${c||''}">${esc(t)}</span>`;
const pill=(k,t)=>`<span class="st ${k}">${esc(t)}</span>`;
const uniq=(a,f)=>[...new Set(a.map(f).filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),undefined,{numeric:true}));
function toast(m){const t=G('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3200)}
// ---------- persisted state (store entries, factory assignments, settings) ----------
const KEY='nos-yarn-v1';
let ST={stock:{},log:[],assign:{},set:{cap:8.5,req:25}};
try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)ST=Object.assign(ST,x)}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}};
const yk=y=>y.count+'|'+y.desc;
const jk=l=>l.job+'|'+l.count+'|'+l.colour;
// ---------- roles ----------
const ROLES=[{id:'store',name:'Yarn store',kind:'store'},{id:'plan',name:'Knitting planner',kind:'plan'},{id:'prod',name:'Knitting production',kind:'prod'},{id:'h',name:'Head of Merchandising (view)',kind:'h'}];
let me=ROLES[0];
const canStore=()=>me.kind==='store';const canPlan=()=>me.kind==='plan';
// ---------- state for filters ----------
let VIEW='store',Q='',STF='all',FAC='all',BUY='all',PG=0;
const FACS=['NFL (in-house)','Greige stock','Outside factory','Not assigned'];
// ---------- helpers ----------
function factoryOf(l){const a=ST.assign[jk(l)];return a&&a.fac?a.fac:l.fac}
function isOutside(f){return f&&!['NFL (in-house)','Greige stock','Not assigned'].includes(f)}
function lineBal(l){return Math.max(0,l.order-l.prod)}
function yarnStatus(y){const e=ST.stock[yk(y)];if(!e||e.phys===''||e.phys==null)return{k:'none',t:'Stock not entered'};const phys=num(e.phys),lc=e.lc!==''&&e.lc!=null?num(e.lc):y.lc;
 if(phys<y.safety)return{k:'late',t:'Below safety'};if(phys+lc<y.total)return{k:'wait',t:'Covered, LC short'};return{k:'done',t:'OK'}}
// ---------- root ----------
function render(){const ae=document.activeElement;const keep=ae&&ae.tagName==='INPUT'&&ae.type==='search'&&ae.id&&root.contains(ae)?ae:null;const m=G('ymain');if(VIEW==='store')storeView(m);else if(VIEW==='plan')planView(m);else if(VIEW==='prod')prodView(m);else meetView(m);if(keep){const nw=root.querySelector('#'+keep.id);if(nw&&nw!==keep){const hi=nw.oninput;keep.oninput=e=>{nw.value=keep.value;if(hi)hi.call(nw,e)};nw.replaceWith(keep);try{keep.focus({preventScroll:true})}catch(e){}}}}
function bar(){return `<div class="rolebar"><span><b>${esc(me.name)}</b></span><span>${me.kind==='store'?'Enter physical yarn stock and receipts / issues':me.kind==='plan'?'Assign each knitting line to a factory and program':me.kind==='prod'?'Knitting production summary (read only)':'View only'}</span><span>Report date ${fmt(TODAY)}</span></div>`}
// ---------- 1. Yarn store ----------
function storeView(m){
 const rows=YARNS.filter(y=>{const q=Q.toLowerCase();if(q&&!(y.count+' '+y.desc).toLowerCase().includes(q))return false;const st=yarnStatus(y).k;return STF==='all'||(STF==='below'&&st==='late')||(STF==='none'&&st==='none')||(STF==='ok'&&st==='done')});
 const all=YARNS.map(y=>({y,s:yarnStatus(y)}));
 const cnt=k=>all.filter(x=>x.s.k===k).length;
 const safety=YARNS.reduce((a,y)=>a+y.safety,0),lcT=YARNS.reduce((a,y)=>a+y.lc,0),avgT=YARNS.reduce((a,y)=>a+y.avg,0);
 const pages=Math.max(1,Math.ceil(rows.length/50));if(PG>=pages)PG=pages-1;const sl=rows.slice(PG*50,PG*50+50);
 m.innerHTML=bar()+`<div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
  <button class="kpi bad ${STF==='below'?'on':''}" data-stf="below"><div class="n">${cnt('late')}</div><div class="l">Below safety</div></button>
  <button class="kpi warn ${STF==='none'?'on':''}" data-stf="none"><div class="n">${cnt('none')}</div><div class="l">Stock not entered</div></button>
  <button class="kpi ${STF==='ok'?'on':''}" data-stf="ok"><div class="n">${cnt('done')}</div><div class="l">OK</div></button>
  <button class="kpi" data-stf="all"><div class="n">${n(safety)} kg</div><div class="l">Safety stock (all counts)</div></button></div>
 <div class="fbar"><input type="search" id="yq" placeholder="Search count or yarn" value="${esc(Q)}" aria-label="Search"><button class="btn sm" id="yclear">Clear</button></div>
 <div class="panel"><div class="tablewrap" style="min-height:0"><table class="noband"><thead><tr class="hdr"><th class="sk sk0">Count</th><th>Yarn</th><th class="num">Avg use / month (kg)</th><th class="num">Safety stock (kg)</th><th class="num">LC / pipeline (kg)</th><th class="num">Physical at factory (kg)</th><th class="num">Available (kg)</th><th>Status</th></tr></thead><tbody>${sl.map(y=>{const e=ST.stock[yk(y)]||{};const s=yarnStatus(y);const lc=e.lc!==undefined&&e.lc!==''?e.lc:y.lc;const av=e.phys!==undefined&&e.phys!==''?num(e.phys)+num(lc):null;
   return `<tr><td class="sk sk0"><b>${esc(y.count)}</b></td><td>${esc(y.desc)}</td><td class="num">${n(y.avg)}</td><td class="num">${n(y.safety)}</td><td class="num">${canStore()?`<input type="number" class="ynum" data-lc="${esc(yk(y))}" value="${esc(lc)}" aria-label="LC pipeline">`:n(lc)}</td><td class="num">${canStore()?`<input type="number" class="ynum" data-ph="${esc(yk(y))}" value="${esc(e.phys??'')}" placeholder="enter" aria-label="Physical stock">`:(e.phys!==undefined&&e.phys!==''?n(e.phys):'—')}</td><td class="num">${av==null?'—':n(av)}</td><td>${pill(s.k,s.t)}</td></tr>`}).join('')}</tbody></table>${rows.length?'':'<div class="empty">No count</div>'}</div>
 <div class="pager"><span>${rows.length?PG*50+1:0}–${Math.min(rows.length,(PG+1)*50)} of ${rows.length}</span><span><button class="btn sm" id="ypv" ${PG?'':'disabled'}>Previous</button> <button class="btn sm" id="ynx" ${PG<pages-1?'':'disabled'}>Next</button></span></div></div>
 ${canStore()?`<div class="panel pad" style="margin-top:12px"><div class="ptitle">Receive / issue</div><div class="form" style="grid-template-columns:repeat(4,minmax(0,1fr));align-items:end"><label>Count<select id="rcCount">${YARNS.map(y=>`<option value="${esc(yk(y))}">${esc(y.count)} ${esc(y.desc)}</option>`).join('')}</select></label><label>Type<select id="rcType"><option>Receive</option><option>Issue to knitting</option></select></label><label>Kg<input type="number" id="rcKg" min="0" step="any"></label><label>Lot / program no.<input type="text" id="rcRef" placeholder="e.g. lot 4013"></label><label>Date<input type="date" id="rcDate" value="${TODAY}"></label><div><button class="btn primary" id="rcSave">Save entry</button></div></div></div>`:''}
 ${ST.log.length?`<div class="panel pad" style="margin-top:12px"><div class="ptitle">Recent entries</div><table class="btab"><thead><tr><th>Date</th><th>Count</th><th>Type</th><th class="num">Kg</th><th>Reference</th><th>By</th></tr></thead><tbody>${ST.log.slice(-15).reverse().map(l=>`<tr><td>${fmt(l.date)}</td><td>${esc(l.count)}</td><td>${esc(l.type)}</td><td class="num">${n(l.kg)}</td><td>${esc(l.ref)}</td><td>${esc(l.by)}</td></tr>`).join('')}</tbody></table></div>`:''}`;
 const yq=G('yq');yq.oninput=()=>{Q=yq.value;PG=0;clearTimeout(storeView.t);storeView.t=setTimeout(()=>{render();const e=G('yq');e.focus();e.setSelectionRange(e.value.length,e.value.length)},280)};
 G('yclear').onclick=()=>{Q='';STF='all';PG=0;render()};
 m.querySelectorAll('[data-stf]').forEach(b=>b.onclick=()=>{STF=b.dataset.stf;PG=0;render()});
 const pv=G('ypv');if(pv)pv.onclick=()=>{PG--;render()};const nx=G('ynx');if(nx)nx.onclick=()=>{PG++;render()};
 m.querySelectorAll('[data-ph]').forEach(i=>i.onchange=()=>{const k=i.dataset.ph;ST.stock[k]=Object.assign({},ST.stock[k],{phys:i.value});save();toast('Physical stock saved');render()});
 m.querySelectorAll('[data-lc]').forEach(i=>i.onchange=()=>{const k=i.dataset.lc;ST.stock[k]=Object.assign({},ST.stock[k],{lc:i.value});save();toast('LC / pipeline saved');render()});
 const rs=G('rcSave');if(rs)rs.onclick=()=>{const kg=num(G('rcKg').value);if(!kg){toast('Enter kg');return}const k=G('rcCount').value;const y=YARNS.find(x=>yk(x)===k);const type=G('rcType').value;
  const e=ST.stock[k]||{};const cur=num(e.phys);const nv=type==='Receive'?cur+kg:Math.max(0,cur-kg);ST.stock[k]=Object.assign({},e,{phys:String(nv)});
  ST.log.push({date:G('rcDate').value||TODAY,count:y.count+' '+y.desc,type,kg,ref:G('rcRef').value.trim(),by:me.name});save();toast(`${type}: ${n(kg)} kg. Physical now ${n(nv)} kg`);render()};
}
// ---------- 2. Knitting planning ----------
function planView(m){
 const q=Q.toLowerCase();const rows=KNIT.filter(l=>{const f=factoryOf(l);if(q&&!(l.job+' '+l.buyer+' '+l.count+' '+l.colour).toLowerCase().includes(q))return false;if(FAC!=='all'&&(FAC==='Outside factory'?!isOutside(f):f!==FAC))return false;if(BUY!=='all'&&l.buyer!==BUY)return false;return true});
 const inHouse=KNIT.filter(l=>factoryOf(l)==='NFL (in-house)');const outside=KNIT.filter(l=>isOutside(factoryOf(l)));const notA=KNIT.filter(l=>factoryOf(l)==='Not assigned');
 const inKg=inHouse.reduce((a,l)=>a+lineBal(l),0);const days=30;const cap=ST.set.cap,req=ST.set.req;const gap=Math.max(0,req-cap);
 const pages=Math.max(1,Math.ceil(rows.length/50));if(PG>=pages)PG=pages-1;const sl=rows.slice(PG*50,PG*50+50);
 const facOpts=uniq(KNIT,l=>factoryOf(l)).filter(x=>!['Not assigned'].includes(x));
 m.innerHTML=bar()+`<div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
  <button class="kpi bad ${FAC==='Not assigned'?'on':''}" data-fac="Not assigned"><div class="n">${n(notA.length)}</div><div class="l">Lines not assigned</div></button>
  <button class="kpi ${FAC==='NFL (in-house)'?'on':''}" data-fac="NFL (in-house)"><div class="n">${n(inHouse.length)}</div><div class="l">In-house lines</div></button>
  <button class="kpi warn ${FAC==='Outside factory'?'on':''}" data-fac="Outside factory"><div class="n">${n(outside.length)}</div><div class="l">Outside lines</div></button>
  <button class="kpi" data-fac="all"><div class="n">${n(KNIT.length)}</div><div class="l">All lines</div></button></div>
 <div class="panel pad" style="margin-bottom:12px"><div class="ptitle">Machine capacity (tonnes per day)</div><div class="form" style="grid-template-columns:repeat(3,minmax(0,1fr));align-items:end">
   <label>In-house capacity / day${canPlan()?`<input type="number" step="0.1" id="sCap" value="${cap}">`:`<b>${cap} t</b>`}</label>
   <label>Average requirement / day${canPlan()?`<input type="number" step="0.1" id="sReq" value="${req}">`:`<b>${req} t</b>`}</label>
   <div class="fabnote">Needs outside knitting about <b>${(gap).toFixed(1)} t / day</b>. The planner assigns outside factories below. Lines still open: ${n(inKg/1000)} t in-house balance.</div></div></div>
 <div class="fbar"><input type="search" id="pq" placeholder="Search job, buyer, count, colour" value="${esc(Q)}" aria-label="Search"><select id="pfac" aria-label="Factory"><option value="all">All factories</option>${FACS.map(f=>`<option ${FAC===f?'selected':''}>${f}</option>`).join('')}</select><select id="pbuy" aria-label="Buyer"><option value="all">All buyers</option>${uniq(KNIT,l=>l.buyer).map(b=>`<option ${BUY===b?'selected':''}>${esc(b)}</option>`).join('')}</select><button class="btn sm" id="pclear">Clear</button></div>
 <div class="panel"><div class="tablewrap"><table class="noband"><thead><tr class="hdr"><th class="sk sk0">Buyer · Job</th><th>Count</th><th>Colour</th><th class="num">GSM</th><th>Dia</th><th class="num">Order kg</th><th class="num">Balance kg</th><th>Knitting factory</th><th>Program no.</th><th>Knitting end</th></tr></thead><tbody>${sl.map(l=>{const f=factoryOf(l);const a=ST.assign[jk(l)]||{};const late=l.taE&&l.taE<TODAY&&lineBal(l)>0;
   return `<tr class="${late?'late':''}"><td class="sk sk0"><b>${esc(l.buyer)}</b><div class="muted" style="font-size:12px">${esc(l.job)}</div></td><td>${esc(l.count)}</td><td>${esc(l.colour)}</td><td class="num">${esc(l.gsm)}</td><td>${esc(l.dia)}</td><td class="num">${n(l.order)}</td><td class="num">${n(lineBal(l))}</td><td>${canPlan()?`<select class="inl" data-fa="${esc(jk(l))}" aria-label="Factory"><option value="">${esc(f||'Not assigned')}</option>${['NFL (in-house)','Greige stock'].concat(['Outside factory']).map(x=>`<option ${f===x?'selected':''}>${x}</option>`).join('')}<option value="__named">Name the factory…</option></select>${isOutside(f)?`<div class="muted" style="font-size:12px">${esc(f)}</div>`:''}`:esc(f)}</td><td>${canPlan()?`<input type="text" style="width:96px" data-pn="${esc(jk(l))}" value="${esc(a.prog||'')}" placeholder="program">`:esc(a.prog||'—')}</td><td>${fmt(l.taE)}${late?' '+chip('late','bad'):''}</td></tr>`}).join('')}</tbody></table>${rows.length?'':'<div class="empty">No line</div>'}</div>
 <div class="pager"><span>${rows.length?PG*50+1:0}–${Math.min(rows.length,(PG+1)*50)} of ${n(rows.length)} lines · knitting lines from the August 2026 knitting execution report</span><span><button class="btn sm" id="ppv" ${PG?'':'disabled'}>Previous</button> <button class="btn sm" id="pnx" ${PG<pages-1?'':'disabled'}>Next</button></span></div></div>`;
 const pq=G('pq');pq.oninput=()=>{Q=pq.value;PG=0;clearTimeout(planView.t);planView.t=setTimeout(()=>{render();const e=G('pq');e.focus();e.setSelectionRange(e.value.length,e.value.length)},280)};
 G('pfac').onchange=e=>{FAC=e.target.value;PG=0;render()};G('pbuy').onchange=e=>{BUY=e.target.value;PG=0;render()};G('pclear').onclick=()=>{Q='';FAC='all';BUY='all';PG=0;render()};
 m.querySelectorAll('[data-fac]').forEach(b=>b.onclick=()=>{FAC=b.dataset.fac;PG=0;render()});
 const pv=G('ppv');if(pv)pv.onclick=()=>{PG--;render()};const nx=G('pnx');if(nx)nx.onclick=()=>{PG++;render()};
 const sc=G('sCap');if(sc)sc.onchange=()=>{ST.set.cap=num(sc.value);save();render()};const sr=G('sReq');if(sr)sr.onchange=()=>{ST.set.req=num(sr.value);save();render()};
 m.querySelectorAll('[data-fa]').forEach(s=>s.onchange=()=>{const k=s.dataset.fa;let v=s.value;if(v==='__named'){const nm=prompt('Factory name (as in the knitting report)');if(!nm)return;v='Outside: '+nm.trim()}
  const l=KNIT.find(x=>jk(x)===k);ST.assign[k]=Object.assign({},ST.assign[k],{fac:v==='Outside factory'?'Outside factory':v});if(v.startsWith('Outside: '))ST.assign[k].fac=v.slice(9);save();toast(`${l.job}: assigned to ${ST.assign[k].fac}`);render()});
 m.querySelectorAll('[data-pn]').forEach(i=>i.onchange=()=>{const k=i.dataset.pn;ST.assign[k]=Object.assign({},ST.assign[k],{prog:i.value.trim()});save();toast('Program saved')});
}
// ---------- 3. Knitting production (summary of the report) ----------
function prodView(m){
 const tot=KNIT.reduce((a,l)=>({o:a.o+l.order,p:a.p+l.prod,d:a.d+l.deliv,b:a.b+lineBal(l)}),{o:0,p:0,d:0,b:0});
 const byF={};KNIT.forEach(l=>{const f=factoryOf(l);const g=byF[f]||(byF[f]={f,n:0,o:0,p:0,d:0,b:0});g.n++;g.o+=l.order;g.p+=l.prod;g.d+=l.deliv;g.b+=lineBal(l)});
 const fl=Object.values(byF).sort((a,b)=>b.o-a.o);
 m.innerHTML=bar()+`<div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
  <div class="kpi"><div class="n">${n(tot.o)} kg</div><div class="l">Knitting order</div></div>
  <div class="kpi good"><div class="n">${tot.o?Math.round(tot.p/tot.o*100):0}%</div><div class="l">Knitted</div></div>
  <div class="kpi"><div class="n">${n(tot.d)} kg</div><div class="l">Delivered to greige store</div></div>
  <div class="kpi warn"><div class="n">${n(tot.b)} kg</div><div class="l">Still to knit</div></div></div>
 <div class="panel"><div class="tablewrap" style="min-height:0"><table class="noband"><thead><tr class="hdr"><th class="sk sk0">Knitting factory</th><th class="num">Lines</th><th class="num">Order kg</th><th class="num">Knitted kg</th><th class="num">Delivered kg</th><th class="num">Balance kg</th><th class="num">Knitted %</th></tr></thead><tbody>${fl.map(g=>`<tr><td class="sk sk0"><b>${esc(g.f)}</b></td><td class="num">${n(g.n)}</td><td class="num">${n(g.o)}</td><td class="num">${n(g.p)}</td><td class="num">${n(g.d)}</td><td class="num">${n(g.b)}</td><td class="num">${g.o?Math.round(g.p/g.o*100):0}%</td></tr>`).join('')}</tbody></table></div></div>
 <div class="fabnote" style="margin-top:8px">Knitted and delivered kg come from the knitting execution report. “Greige stock” means the job was taken from stock, not knitted now. Lines with no factory are shown as Not assigned.</div>`;
}
// ---------- 4. Production meeting ----------
function meetView(m){
 const late=KNIT.filter(l=>l.taE&&l.taE<TODAY&&lineBal(l)>0);const soon=KNIT.filter(l=>l.taE&&l.taE>=TODAY&&days(TODAY,l.taE)<=7&&lineBal(l)>0);const un=KNIT.filter(l=>factoryOf(l)==='Not assigned'&&lineBal(l)>0);
 const row=l=>`<tr><td><b>${esc(l.buyer)}</b> · ${esc(l.job)}</td><td>${esc(l.count)}</td><td>${esc(l.colour)}</td><td class="num">${n(lineBal(l))}</td><td>${esc(factoryOf(l))}</td><td>${fmt(l.taE)}</td></tr>`;
 m.innerHTML=bar()+`<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi bad"><div class="n">${n(late.length)}</div><div class="l">Past knitting end date</div></div><div class="kpi warn"><div class="n">${n(soon.length)}</div><div class="l">Due in 7 days</div></div><div class="kpi"><div class="n">${n(un.length)}</div><div class="l">Open lines, no factory</div></div></div>
 <div class="ms" style="margin:8px 0"><button class="btn primary" id="mPrint">Print meeting sheet</button></div>
 <div class="panel pad"><div class="ptitle">Past knitting end date (${late.length})</div><table class="btab"><thead><tr><th>Buyer · Job</th><th>Count</th><th>Colour</th><th class="num">Balance kg</th><th>Factory</th><th>Knitting end</th></tr></thead><tbody>${late.slice(0,80).map(row).join('')||'<tr><td colspan="6" class="muted">None</td></tr>'}</tbody></table>${late.length>80?`<div class="muted" style="font-size:12.5px">Showing 80 of ${late.length}. Use the planning view for the rest.</div>`:''}</div>
 <div class="panel pad" style="margin-top:12px"><div class="ptitle">Due in the next 7 days (${soon.length})</div><table class="btab"><thead><tr><th>Buyer · Job</th><th>Count</th><th>Colour</th><th class="num">Balance kg</th><th>Factory</th><th>Knitting end</th></tr></thead><tbody>${soon.slice(0,80).map(row).join('')||'<tr><td colspan="6" class="muted">None</td></tr>'}</tbody></table></div>`;
 G('mPrint').onclick=()=>{const html=`<div class="ps"><h2>NORTHERN FASHION LTD.</h2><h3>Knitting Production Meeting</h3><p>Date: ${fmt(TODAY)}</p><h4>Past knitting end date (${late.length})</h4><table><tr><th>Buyer · Job</th><th>Count</th><th>Colour</th><th>Balance kg</th><th>Factory</th><th>End</th></tr>${late.slice(0,200).map(l=>`<tr><td>${esc(l.buyer)} · ${esc(l.job)}</td><td>${esc(l.count)}</td><td>${esc(l.colour)}</td><td>${n(lineBal(l))}</td><td>${esc(factoryOf(l))}</td><td>${fmt(l.taE)}</td></tr>`).join('')}</table><h4>Open lines with no factory (${un.length})</h4><table><tr><th>Buyer · Job</th><th>Count</th><th>Balance kg</th></tr>${un.slice(0,200).map(l=>`<tr><td>${esc(l.buyer)} · ${esc(l.job)}</td><td>${esc(l.count)}</td><td>${n(lineBal(l))}</td></tr>`).join('')}</table><div class="sig"><div>Knitting Planner</div><div>Knitting Manager</div><div>Head of Merchandising</div></div></div>`;const a=document.getElementById('printArea');if(a){a.innerHTML=html;window.print()}}}
// ---------- events ----------
function setView(v){VIEW=v;PG=0;render()}
const roleSel=G('ysel');roleSel.innerHTML=ROLES.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
roleSel.onchange=()=>{me=ROLES.find(r=>r.id===roleSel.value);render()};
render();
return{views:[['store','Yarn store'],['plan','Knitting planning'],['prod','Knitting production'],['meet','Production meeting']],get view(){return VIEW},setView,rerender:render,reset:()=>{ST={stock:{},log:[],assign:{},set:{cap:8.5,req:25}};save();render()}};
}
