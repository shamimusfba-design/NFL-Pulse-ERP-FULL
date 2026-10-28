window.NOSCost=(function(){
'use strict';
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const f2=x=>(Math.round(num(x)*100)/100).toFixed(2);
const fmt=d=>!d?'':d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(2,4);
const SECTIONS=[['yarn','Yarn','$/kg'],['knit','Knitting','Tk/kg'],['yd','Yarn dyeing','Tk/kg'],['dye','Dyeing & finishing','Tk/kg'],['aop','AOP / oil dye','$/kg'],['brush','Brushed','$/kg'],
 ['collar','Collar & cuff','$/dz'],['cm','Cutting & making (CM)','$/dz'],['sp','Screen print','$/dz'],['pearl','Pearl','$/dz'],['emb','Embroidery / sequin / stone','$/dz'],['wash','Garment wash','$/dz'],['sms','SMS','$/dz'],
 ['ml','Main label','$/dz'],['cl','Care label','$/dz'],['ht','Hang tag','$/dz'],['pt','Price tag','$/dz'],['bp','Blister poly','$/dz'],['st','Sewing thread','$/dz'],['ct','Carton','$/dz'],['el','Eyelet / lace','$/dz'],['ds','Doisting','$/dz'],['bl','Badge label','$/dz'],['chem','Chemical test','$/pc']];
const ACC=[['ml','Main label'],['cl','Care label'],['ht','Hang tag'],['pt','Price tag'],['bp','Blister poly'],['st','Sewing thread'],['ct','Carton'],['el','Eyelet / lace'],['ds','Doisting'],['bl','Badge label']];
const PARAMS=[['rate','Exchange rate (Tk per $)',115],['cw','Consumption waste %',12],['wp','Wastage & P/L knitting, dyeing %',12],['ex','Accessories excess %',10],['com','Commercial, overhead & financial %',3],['profit','Profit %',2],['buy','Buying commission %',5]];
const DEF={items:{yarn:[['34/S Cotton',3.6],['20/D Spandex',9],['40/D Spandex',8]],knit:[['Flat rib 3x2',60],['Rib 2x2',30]],yd:[['Yarn dyeing',170]],dye:[['Dyeing & finishing',90]],aop:[['AOP / oil dye',2.5]],brush:[],collar:[],cm:[['CM',8.5]],sp:[['Screen print',0.5]],pearl:[],emb:[],wash:[],sms:[['SMS',0.5]],ml:[],cl:[['Care label',0.5]],ht:[['Hang tag',0.52]],pt:[['Price tag',0.25]],bp:[['Blister poly',0.2]],st:[['Sewing thread',0.3]],ct:[['Carton',0.3]],el:[],ds:[],bl:[],chem:[['Chemical test',0.05]]},params:{rate:115,cw:12,wp:12,ex:10,com:3,profit:2,buy:5}};
const RKEY='nos-rates-v1';
function rates(){try{const r=JSON.parse(localStorage.getItem(RKEY)||'null');if(r&&r.items)return r}catch(e){}return JSON.parse(JSON.stringify(DEF))}
function saveRates(r){try{localStorage.setItem(RKEY,JSON.stringify(r))}catch(e){}}
function defaults(ctx){const p=rates().params;return{qty:(ctx&&ctx.qty)||'',deliv:'',rate:p.rate,fabs:[0,1,2].map(()=>({d:'',cons:'',cw:p.cw,yarns:[{c:'',p:'',pc:''},{c:'',p:'',pc:''},{c:'',p:'',pc:''}],knit:'',aop:'',yd:'',dye:'',brush:'',wp:p.wp})),collar:'',cm:'',sp:'',pearl:'',emb:'',wash:'',sms:'',ml:'',cl:'',ht:'',pt:'',bp:'',st:'',ct:'',el:'',ds:'',bl:'',ex:p.ex,com:p.com,profit:p.profit,buy:p.buy,chem:''}}
function calc(v){const rate=num(v.rate)||115;const out={fabs:[],fabTotal:0};
 (v.fabs||[]).forEach(f=>{const ys=(f.yarns||[]).map(y=>num(y.p)*num(y.pc)/100);const yarn=ys.reduce((a,b)=>a+b,0);
  const knit=num(f.knit)/rate,yd=num(f.yd)/rate,dye=num(f.dye)/rate,aop=num(f.aop);const base=yarn+knit+aop+yd+dye,waste=base*num(f.wp)/100,perKg=base+waste+num(f.brush);
  const c0=num(f.cons),cw=c0*num(f.cw)/100,cons=c0+cw;out.fabs.push({ys,knit,yd,dye,aop,waste,perKg,c0,cw,cons,perDz:perKg*cons});out.fabTotal+=perKg*cons});
 out.fabTotal+=num(v.collar);const acc0=ACC.reduce((a,[k])=>a+num(v[k]),0);out.acc0=acc0;out.exV=acc0*num(v.ex)/100;out.acc=acc0+out.exV;
 out.dozen=out.fabTotal+num(v.cm)+num(v.sp)+num(v.pearl)+num(v.emb)+num(v.wash)+out.acc+num(v.sms);
 out.pc=out.dozen/12;out.com=out.pc*num(v.com)/100;out.prod=out.pc+out.com;out.profit=out.prod*num(v.profit)/100;out.buy=out.prod*num(v.buy)/100;out.fob=out.prod+out.profit+out.buy+num(v.chem);return out}
function setPath(o,p,v){const ks=p.split('.');let c=o;for(let i=0;i<ks.length-1;i++)c=c[ks[i]];c[ks[ks.length-1]]=v}
function getPath(o,p){return p.split('.').reduce((c,k)=>c==null?c:c[k],o)}
// form: el, sheet, {ed, head:{buyer,sub,style,coll,garment,date}, onSave(sheet,res,submit), onBack, toast}
function form(el,sheet,o){const R=rates();const ed=!!o.ed;const cs=JSON.parse(JSON.stringify(sheet||defaults({qty:o.head.qty})));
 const sel=(path,sec,val)=>{const L=R.items[sec]||[];const k=L.findIndex(x=>num(x[1])===num(val)&&val!==''&&val!=null);const cur=val===''||val==null?'':k>=0?String(k):'c';
  return `<span class="rf"><select data-rs="${path}" data-sec="${sec}" ${ed?'':'disabled'} aria-label="Rate"><option value="" ${cur===''?'selected':''}>—</option>${L.map((x,i)=>`<option value="${i}" ${cur===String(i)?'selected':''}>${esc(x[0])} · ${x[1]}</option>`).join('')}<option value="c" ${cur==='c'?'selected':''}>Custom</option></select><input type="number" step="any" inputmode="decimal" data-p="${path}" value="${val==null?'':esc(val)}" ${ed?'':'disabled'} aria-label="Value"></span>`};
 const inp=(path,val,type)=>`<input type="${type||'number'}" ${type==='text'?'':'step="any" inputmode="decimal"'} data-p="${path}" value="${val==null?'':esc(val)}" ${ed?'':'disabled'}>`;
 const fab=i=>{const f=cs.fabs[i];return `<details class="cfab" ${i===0||f.d||f.cons?'open':''}><summary><b>Fabric ${'ABC'[i]}</b> <span class="muted" id="cfs${i}"></span></summary>
  <div class="cgrid"><label class="wide2">Fabric description${inp('fabs.'+i+'.d',f.d,'text')}</label><label>Consumption kg/dz${inp('fabs.'+i+'.cons',f.cons)}</label><label>Waste %${inp('fabs.'+i+'.cw',f.cw)}</label></div>
  <table class="ctab"><thead><tr><th>Yarn · $/kg</th><th>Count</th><th style="width:70px">%</th></tr></thead><tbody>${f.yarns.map((y,j)=>`<tr><td>${sel('fabs.'+i+'.yarns.'+j+'.p','yarn',y.p)}</td><td>${inp('fabs.'+i+'.yarns.'+j+'.c',y.c,'text')}</td><td>${inp('fabs.'+i+'.yarns.'+j+'.pc',y.pc)}</td></tr>`).join('')}</tbody></table>
  <table class="ctab"><tbody><tr><td>Knitting (Tk/kg)</td><td>${sel('fabs.'+i+'.knit','knit',f.knit)}</td></tr><tr><td>Yarn dyeing (Tk/kg)</td><td>${sel('fabs.'+i+'.yd','yd',f.yd)}</td></tr><tr><td>Dyeing &amp; finishing (Tk/kg)</td><td>${sel('fabs.'+i+'.dye','dye',f.dye)}</td></tr><tr><td>AOP / oil dye ($/kg)</td><td>${sel('fabs.'+i+'.aop','aop',f.aop)}</td></tr><tr><td>Brushed ($/kg)</td><td>${sel('fabs.'+i+'.brush','brush',f.brush)}</td></tr><tr><td>Wastage &amp; P/L %</td><td>${inp('fabs.'+i+'.wp',f.wp)}</td></tr></tbody></table></details>`};
 const line=(k,l)=>`<tr><td>${l}</td><td>${sel(k,k,cs[k])}</td></tr>`;
 el.innerHTML=`<header><div><div class="muted" style="font-size:12.5px">Cost Sheet – Pre order</div><h3>${esc(o.head.style)}${o.head.garment?' · '+esc(o.head.garment):''}</h3></div><button class="btn sm" data-cback="1">Back</button></header>
 <div class="body">${ed?'':'<div class="lockbox">View only</div>'}
 <div class="kv"><div><span>Buyer</span>${esc(o.head.buyer)}</div><div><span>Div / Group</span>${esc(o.head.sub||'')}</div><div><span>Style ref</span>${esc(o.head.style)}</div><div><span>Coll</span>${esc(o.head.coll||'')}</div></div>
 <div class="cgrid"><label>Order qty / style${inp('qty',cs.qty)}</label><label>Delivery${inp('deliv',cs.deliv,'text')}</label><label>Tk per $${inp('rate',cs.rate)}</label></div>
 ${[0,1,2].map(fab).join('')}
 <div class="secttl">Other costs ($/dz)</div><table class="ctab"><tbody>${line('collar','Collar &amp; cuff')}${line('cm','Cutting &amp; making (CM)')}${line('sp','Screen print')}${line('pearl','Pearl')}${line('emb','Embroidery / sequin / stone')}${line('wash','Garment wash')}${line('sms','SMS')}</tbody></table>
 <div class="secttl">Accessories ($/dz)</div><table class="ctab"><tbody>${ACC.map(([k,l])=>line(k,l)).join('')}<tr><td>Excess %</td><td>${inp('ex',cs.ex)}</td></tr></tbody></table>
 <div class="secttl">Margins</div><table class="ctab"><tbody><tr><td>Commercial, overhead &amp; financial %</td><td>${inp('com',cs.com)}</td></tr><tr><td>Profit %</td><td>${inp('profit',cs.profit)}</td></tr><tr><td>Buying commission %</td><td>${inp('buy',cs.buy)}</td></tr><tr><td>Chemical test ($/pc)</td><td>${sel('chem','chem',cs.chem)}</td></tr></tbody></table>
 <div class="lockbox" data-cres="1" style="margin-top:10px"></div></div>
 <div class="foot"><button class="btn" data-cprint="1">Print</button>${ed?'<button class="btn" data-cdraft="1">Save draft</button><button class="btn primary" data-csub="1">Submit cost sheet</button>':''}</div>`;
 const read=()=>{const v=JSON.parse(JSON.stringify(cs));el.querySelectorAll('[data-p]').forEach(i=>setPath(v,i.dataset.p,i.value));return v};
 const upd=()=>{const v=read(),r=calc(v);r.fabs.forEach((x,i)=>{const s=el.querySelector('#cfs'+i);if(s)s.textContent=x.perKg?'$'+f2(x.perKg)+'/kg · $'+f2(x.perDz)+'/dz':''});
  el.querySelector('[data-cres]').innerHTML=`Fabric $${f2(r.fabTotal)}/dz · Accessories $${f2(r.acc)}/dz · Cost $${f2(r.dozen)}/dz<br>Production cost $${f2(r.prod)}/pc · Profit $${f2(r.profit)} · Buying com. $${f2(r.buy)}<br><span style="font-size:16px">FOB <b>$${f2(r.fob)}</b> / pc</span>`;return r};
 el.querySelectorAll('[data-rs]').forEach(s=>s.onchange=()=>{const p=s.dataset.rs,L=R.items[s.dataset.sec]||[];const i=el.querySelector(`[data-p="${p}"]`);
  if(s.value==='c'){i.focus();return}if(s.value===''){i.value='';if(s.dataset.sec==='yarn'){const c=el.querySelector(`[data-p="${p.replace(/\.p$/,'.c')}"]`);if(c)c.value=''}}else{const it=L[+s.value];i.value=it[1];if(s.dataset.sec==='yarn'){const c=el.querySelector(`[data-p="${p.replace(/\.p$/,'.c')}"]`);if(c)c.value=it[0]}}upd()});
 el.querySelectorAll('[data-p]').forEach(i=>i.oninput=()=>{const s=el.querySelector(`[data-rs="${i.dataset.p}"]`);if(s){const L=R.items[s.dataset.sec]||[];const k=L.findIndex(x=>num(x[1])===num(i.value));s.value=i.value===''?'':k>=0?String(k):'c'}upd()});
 upd();
 el.querySelector('[data-cback]').onclick=()=>o.onBack&&o.onBack();
 el.querySelector('[data-cprint]').onclick=()=>o.print(printHTML(ed?read():cs,o.head));
 const sv=submit=>{const v=read(),r=calc(v);if(submit&&!(r.fob>0)){o.toast('Fill the consumption and costs first');return}o.onSave(v,r,submit)};
 const d=el.querySelector('[data-cdraft]');if(d)d.onclick=()=>sv(false);const sb=el.querySelector('[data-csub]');if(sb)sb.onclick=()=>sv(true)}
function printHTML(v,h){const r=calc(v);const rate=num(v.rate)||115;const tr=(a,b,c,d,e,f,g,hh)=>`<tr><td>${a}</td><td>${b==null?'':b}</td><td>${c==null?'':c}</td><td>${d==null?'':d}</td><td>${e==null?'':e}</td><td>${f==null?'':f}</td><td>${g==null?'':g}</td><td>${hh==null?'':hh}</td></tr>`;
 const z=x=>num(x)?f2(x):'';const fabRows=v.fabs.map((f,i)=>{const x=r.fabs[i];if(!f.d&&!num(f.cons)&&!x.perKg)return '';return tr(`<b>Fabric ${'ABC'[i]}</b>`)
  +f.yarns.filter(y=>num(y.p)).map((y,j)=>tr('Yarn Price','',esc(y.c),f2(y.p),num(y.pc)+'%',f2(num(y.p)*num(y.pc)/100))).join('')
  +(num(f.knit)?tr('Knitting cost',num(f.knit),'','','',f2(num(f.knit)/rate)):'')+(num(f.aop)?tr('AOP/Oil dye','','','','',f2(f.aop)):'')+(num(f.yd)?tr('Yarn dyeing',num(f.yd),'','','',f2(num(f.yd)/rate)):'')+(num(f.dye)?tr('Dyeing & Finishing',num(f.dye),'','','',f2(num(f.dye)/rate)):'')+(num(f.brush)?tr('Brushed','','','','',f2(f.brush)):'')
  +tr('Wastage & P/L-Knitting, Dyeing','','','',num(f.wp)+'%',f2(x.waste))+tr(`<b>Total Cost Fab. ${'ABC'[i]}</b>`,'','','','',`<b>${f2(x.perKg)}</b>`,`<b>${f2(x.perDz)}</b>`)}).join('');
 const accRows=ACC.filter(([k])=>num(v[k])).map(([k,l])=>tr(l,'','','','','',f2(v[k]))).join('');
 return `<div class="ps"><h2>NORTHERN FASHION LTD.</h2><h3>Cost Sheet – Pre order</h3>
 <table><tr><td>Garment Des: ${esc(h.garment||'')}</td><td>${esc(h.coll||'')}</td><td>Buyer: ${esc(h.buyer||'')}</td><td>Div/Group: ${esc(h.sub||'')}</td></tr><tr><td colspan="2">Order Qty/ Style: ${esc(v.qty||'')} Pcs ${v.deliv?'(Delivery - '+esc(v.deliv)+')':''}</td><td>Style Ref: ${esc(h.style||'')}</td><td>Dt: ${fmt(h.date||'')}</td></tr></table>
 <table><tr><th></th><th>Consmp, kg</th><th>Waste</th><th>Total Cnsm, kg</th></tr>${v.fabs.map((f,i)=>f.d||num(f.cons)?`<tr><td>Fab ${'ABC'[i]}. ${esc(f.d)}</td><td>${f2(f.cons)}</td><td>${f2(r.fabs[i].cw)} (${num(f.cw)}%)</td><td>${r.fabs[i].cons.toFixed(3)}</td></tr>`:'').join('')}</table>
 <table><tr><th>Description</th><th>Tk</th><th>Y / T</th><th>Y / P</th><th>Perc</th><th>Total</th><th>Total F. Cost</th><th>Total Cost $</th></tr>${fabRows}
 ${num(v.collar)?tr('Collar & Cuff','','','','','',f2(v.collar)):''}${tr('<b>Total Fab Cost (A+B+C+Coll&amp;Cuff)</b>','','','','','',`<b>${f2(r.fabTotal)}</b>`,`<b>${f2(r.fabTotal)}</b>`)}
 ${tr('Cutting & Making - CM','','','','','','',z(v.cm))}${num(v.sp)?tr('Screen print','','','','','','',f2(v.sp)):''}${num(v.pearl)?tr('Pearl','','','','','','',f2(v.pearl)):''}${num(v.emb)?tr('Embroidery/Sequin/Stone','','','','','','',f2(v.emb)):''}${num(v.wash)?tr('Garment Wash','','','','','','',f2(v.wash)):''}
 ${tr('<b>Accessories</b>')}${accRows}${tr('Excess','','','',num(v.ex)+'%','',f2(r.exV))}${tr('<b>Ttl Accessories/Trimmings cost</b>','','','','','',`<b>${f2(r.acc)}</b>`,`<b>${f2(r.acc)}</b>`)}
 ${num(v.sms)?tr('SMS','','','','','','',f2(v.sms)):''}${tr('<b>Cost / Dzn</b>','','','','','','',`<b>${f2(r.dozen)}</b>`)}${tr('Commercial, Overhead & Financial Expenses/pc','','','',num(v.com)+'%','','',r.com.toFixed(4))}
 ${tr('<b>Total Production Cost/Pc</b>','','','','','','',`<b>${r.prod.toFixed(4)}</b>`)}${tr('Profit','','','',num(v.profit)+'%','','',r.profit.toFixed(4))}${tr('Buying com','','','',num(v.buy)+'%','','',r.buy.toFixed(4))}${num(v.chem)?tr('Chemical Test','','','','','','',num(v.chem).toFixed(4)):''}
 ${tr('<b>Total Garment Price/ Pc FOB</b>','','','','','','',`<b>$${f2(r.fob)}</b>`)}</table>
 <div class="sig"><div>Prepared By<br>Merchandiser</div><div>Checked By<br>Team Leader</div><div>Approved By<br>Management</div></div></div>`}
function ratesView(el,ed,toast){const R=rates();
 el.innerHTML=`${ed?'':'<div class="lockbox">View only. Admin updates the rates.</div>'}<div class="cgrid">${PARAMS.map(([k,l])=>`<label>${l}<input type="number" step="any" data-rp="${k}" value="${esc(R.params[k])}" ${ed?'':'disabled'}></label>`).join('')}</div>
 <div class="rgrid">${SECTIONS.map(([k,l,u])=>`<div class="panel pad"><div class="ptitle">${l} <span class="muted" style="font-weight:400">${u}</span></div><table class="ctab"><tbody>${(R.items[k]||[]).map((x,i)=>`<tr><td><input type="text" data-rn="${k}|${i}" value="${esc(x[0])}" ${ed?'':'disabled'}></td><td style="width:96px"><input type="number" step="any" data-rv="${k}|${i}" value="${esc(x[1])}" ${ed?'':'disabled'}></td><td style="width:36px">${ed?`<button class="btn sm" data-rdel="${k}|${i}" aria-label="Remove">✕</button>`:''}</td></tr>`).join('')||'<tr><td class="muted">No rate</td></tr>'}</tbody></table>${ed?`<button class="btn sm" data-radd="${k}">Add</button>`:''}</div>`).join('')}</div>
 ${ed?'<div style="margin-top:10px"><button class="btn primary" data-rsave="1">Save rates</button></div>':''}`;
 const read=()=>{el.querySelectorAll('[data-rp]').forEach(i=>R.params[i.dataset.rp]=num(i.value));el.querySelectorAll('[data-rn]').forEach(i=>{const [k,ix]=i.dataset.rn.split('|');R.items[k][+ix][0]=i.value});el.querySelectorAll('[data-rv]').forEach(i=>{const [k,ix]=i.dataset.rv.split('|');R.items[k][+ix][1]=num(i.value)})};
 el.querySelectorAll('[data-radd]').forEach(b=>b.onclick=()=>{read();(R.items[b.dataset.radd]=R.items[b.dataset.radd]||[]).push(['',0]);saveRates(R);ratesView(el,ed,toast)});
 el.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{read();const [k,ix]=b.dataset.rdel.split('|');R.items[k].splice(+ix,1);saveRates(R);ratesView(el,ed,toast)});
 const s=el.querySelector('[data-rsave]');if(s)s.onclick=()=>{read();saveRates(R);toast('Rates saved')}}
return{defaults,calc,form,printHTML,ratesView,rates,f2,ACC};
})();
