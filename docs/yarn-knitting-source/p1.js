function mountYK(root,TODAY){
'use strict';
const G=id=>root.querySelector('#'+id);
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const n=x=>Math.round(num(x)).toLocaleString('en-US');
const t1=x=>(num(x)/1000).toLocaleString('en-US',{maximumFractionDigits:1})+' t';
const fmt=d=>!d?'—':d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(2,4);
const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const addDays=(d,k)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+k);return x.toISOString().slice(0,10)};
const uniq=(a,f)=>[...new Set(a.map(f).filter(x=>x!==undefined&&x!==null&&x!==''))].sort((x,y)=>String(x).localeCompare(String(y),undefined,{numeric:true}));
const pill=(k,t)=>`<span class="st ${k}">${esc(t)}</span>`;
const pct=(a,b)=>b?Math.round(a/b*100):0;
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const mlab=m=>m?MON[+m.slice(5,7)-1]+' '+m.slice(2,4):'';
function toast(m){const t=G('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3400)}
const KEY='nos-yk-v6';
const MACHINES0=(()=>{const D=[['36X24',4],['34X24',3],['30X18',3],['44X18',3],['30X20',2],['34X20',2],['40X18',1],['30X24',1],['28X24',1]];let i=0;return D.flatMap(([d,k])=>Array.from({length:k},()=>({id:'M-'+String(++i).padStart(2,'0'),dia:d,cap:425})))})();
const DEF={req:[],pipe:[],rcv:[],iss:[],ret:[],jobs:[],lines:[],asg:{},outAlloc:{},daily:[],remarks:{},dead:{},cap:{},machines:MACHINES0,loss:{'S/J':8,'Rib':10,'Fleece':12,'Terry':11,'Pique':9,'Other':10}};
let S=JSON.parse(JSON.stringify(DEF));try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)S=Object.assign(S,x)}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const ROLES=[['store','Yarn store'],['merch','Merchandiser'],['proc','Purchase'],['plan','Knitting planner'],['rep','Knitting reporter'],['pic','Knitting production incharge'],['qc','Knitting quality'],['mgmt','Management (view)']];
let ROLE='store';const can=(...r)=>r.includes(ROLE);const roleName=()=>ROLES.find(r=>r[0]===ROLE)[1];
// ---------- buyer / job codes ----------
function bcode(b){b=String(b||'').toUpperCase();if(/^BS-?NMT|NAME/.test(b))return'BS-NMT';if(/^BS-?ONS|SONS/.test(b))return'BS-ONS';if(/^BS-?ONL|ONLY/.test(b))return'BS-ONL';if(/OVS/.test(b))return'OVS';if(/UTG|^UT\b/.test(b))return'UT';if(/GBX/.test(b))return'GBX';return b.split(/[\s-]/)[0]||'JOB'}
const jcode=l=>/^[A-Z]/.test(String(l.job||''))?l.job:bcode(l.buyer)+' '+l.job;
// ---------- yarn parsing ----------
function parseCount(code){const t=String(code||'').toUpperCase().trim();const cnt=(t.match(/^(\d+D|\d+\/\d+|\d+S)/)||[''])[0];const shade=/\bC$/.test(t)?'Colour':/\bW$/.test(t)?'White':'';
 const comp=/^\d+D/.test(t)?'Spandex':/BCI/.test(t)?'BCI cotton':/ORG/.test(t)?'Organic cotton':/CVC/.test(t)?'CVC '+((t.match(/\d+\/\d+(?!.*\d+\/\d+)/)||[''])[0]!==cnt?(t.match(/(\d+\/\d+)$/)||['',''])[1]:''):/\bPC\b/.test(t)?'PC':/GM/.test(t)?'Grey melange '+((t.match(/\d+%/)||[''])[0]):/VIS/.test(t)?'Viscose':/SLUB/.test(t)?'Slub cotton':'Cotton';return{cnt,comp:comp.trim(),shade}}
function yarnType(desc){const t=String(desc||'').toUpperCase();if(/SPANDEX|\b\d+D\b/.test(t))return'Spandex';if(/VORTEX/.test(t))return'Vortex';if(/OPEN END|\bOE\b/.test(t))return'Open end';if(/COMPACT/.test(t))return'Combed compact';if(/COMB|\bCOM\b/.test(t))return'Combed';if(/CARD|\bKD\b|\bCD\b/.test(t))return'Carded';if(/RING/.test(t))return'Ring';if(/POLY|FDY|DTY/.test(t))return'Filament';return'Other'}
function groupOf(t){t=String(t).toUpperCase();if(/SPANDEX|\b\d+D\b|LYCRA/.test(t))return'Spandex';if(/LUREX/.test(t))return'Lurex';if(/MEL|\bGM\b/.test(t))return'Melange';if(/CVC/.test(t))return'CVC';if(/\bPC\b|P\/C/.test(t))return'PC';if(/VIS|MODAL|TENCEL/.test(t))return'Viscose / Modal';if(/POLY|\d+D\/\d+F/.test(t))return'Polyester';if(/SLUB/.test(t))return'Slub';if(/ORG/.test(t))return'Organic cotton';if(/BCI/.test(t))return'BCI cotton';return'Cotton'}
function guessCount(yarn){const t=String(yarn).toUpperCase();let m=t.match(/(\d+)\s*D\b/);if(m){const c=SAF.find(s=>s.count.toUpperCase()===m[1]+'D');if(c)return c.count}
 m=t.match(/(\d+)\s*(?:S\b|\/1|'S)/);if(!m)return'';const base=m[1]+'/1';const tag=/ORG/.test(t)?'ORG':/BCI/.test(t)?'BCI':/CVC/.test(t)?'CVC':/MEL|GM/.test(t)?'GM':/VIS/.test(t)?'VIS':'';const c=SAF.filter(s=>s.count.toUpperCase().startsWith(base));const b=c.find(s=>tag&&s.count.toUpperCase().includes(tag))||c.find(s=>/\bW\b/.test(s.count.toUpperCase()))||c[0];return b?b.count:''}
const lotKey=l=>l.yarn+'|'+l.lot+'|'+(l.lp||'');
let LCACHE=null,KCACHE=null;
function lotRows(){if(LCACHE)return LCACHE;const add={},sub={},qc={};S.rcv.forEach(r=>{add[r.key]=(add[r.key]||0)+num(r.kg);qc[r.key]=r.qc});S.iss.forEach(r=>{sub[r.key]=(sub[r.key]||0)+num(r.kg)});S.ret.forEach(r=>{add[r.key]=(add[r.key]||0)+num(r.kg)});
 const nl=S.rcv.filter(r=>r.newLot).map(r=>({yarn:r.yarn,mfr:r.mfr,lot:r.lot,rcvd:r.date,lc:r.lcNo,open:0,rcv:0,issue:0,close:0,lp:r.lp,loc:r.loc}));const seen=new Set();
 LCACHE=LOTS.concat(nl).filter(l=>{const k=lotKey(l);if(seen.has(k))return false;seen.add(k);return true}).map(l=>{const k=lotKey(l);const cur=Math.max(0,num(l.close)+(add[k]||0)-(sub[k]||0));const age=l.rcvd?days(l.rcvd,TODAY):null;
  const last=S.iss.filter(i=>i.key===k).map(i=>i.date).sort().pop();const idle=last?days(last,TODAY):num(l.issue)>0?0:age;const count=guessCount(l.yarn);const pc=parseCount(count);
  return Object.assign({},l,{key:k,cur,age,idle,qc:qc[k]||'Passed',group:groupOf(l.yarn),count,cnt:pc.cnt||(String(l.yarn).match(/^\d+\s*[sD]/i)||[''])[0],type:yarnType(l.yarn),comp:pc.comp,issuedMonth:num(l.issue)+(sub[k]||0)})});return LCACHE}
function pipeOpen(){return S.pipe.filter(p=>p.status!=='Cancelled'&&num(p.kg)>num(p.rcvd)).map(p=>Object.assign({},p,{bal:num(p.kg)-num(p.rcvd)}))}
function countRows(){const delta={};S.rcv.forEach(r=>{if(r.count)delta[r.count]=(delta[r.count]||0)+num(r.kg)});S.iss.forEach(r=>{if(r.count)delta[r.count]=(delta[r.count]||0)-num(r.kg)});S.ret.forEach(r=>{if(r.count)delta[r.count]=(delta[r.count]||0)+num(r.kg)});
 const pipe={},od={};pipeOpen().forEach(p=>{pipe[p.count]=(pipe[p.count]||0)+p.bal;if(p.eta&&p.eta<TODAY)od[p.count]=(od[p.count]||0)+p.bal});
 const need={};knitRows().forEach(l=>{if(l.bal>0&&l.ctype)need[l.ctype]=(need[l.ctype]||0)+l.bal});const L=lotRows();const tp={};L.forEach(l=>{if(l.count&&l.cur>0){(tp[l.count]=tp[l.count]||{})[l.type]=((tp[l.count]||{})[l.type]||0)+l.cur}});
 return SAF.map(s=>{const pc=parseCount(s.count);const phys=Math.max(0,num(s.phys)+(delta[s.count]||0)),moq=num(s.safety),pp=pipe[s.count]||0,o=od[s.count]||0,nd=need[s.count]||0;const types=tp[s.count]?Object.entries(tp[s.count]).sort((a,b)=>b[1]-a[1])[0][0]:'';
  return{code:s.count,cnt:pc.cnt,comp:pc.comp,shade:pc.shade,type:types||(pc.comp==='Spandex'?'Spandex':''),group:groupOf(s.count),phys,moq,pipe:pp,overdue:o,need:nd,gap:phys-moq,
   below:moq>0&&phys<moq,pipeLow:moq>0&&phys+pp<moq,urgent:Math.max(0,nd+moq-phys-(pp-o)),status:!moq?'No MOQ':phys+pp<moq?'Pipeline low':phys<moq?'Below MOQ · covered':'OK'}})}
// ---------- knitting ----------
const lk=l=>l.job+'|'+l.ctype+'|'+l.colour+'|'+l.dia+'|'+(l.gsm||'');
function fabType(d){d=String(d||'').toUpperCase();if(/RIB/.test(d))return'Rib';if(/FLEECE/.test(d))return'Fleece';if(/TERRY/.test(d))return'Terry';if(/PIQUE|LACOSTE/.test(d))return'Pique';if(/S\/J|JERSEY/.test(d))return'S/J';return'Other'}
const DELAY=['Yarn not in-house','Yarn dyeing delay','Program not issued','Machine not free','Outside party delay','Quality issue / hold','Fabric approval pending','Other'];
const lossOf=f=>num(S.loss[f]!=null?S.loss[f]:S.loss.Other);
const sugOf=x=>Math.ceil(num(x.finish)/(1-lossOf(x.fabric)/100));
function knitRows(){if(KCACHE)return KCACHE;const dl={};S.daily.forEach(d=>{const o=dl[d.key]||(dl[d.key]={p:0,d:0,r:0});o.p+=num(d.prod);o.d+=num(d.deliv);o.r+=num(d.rej)});
 const NL=S.lines.map(x=>Object.assign({},x,{order:x.stage==='Active'?num(x.final):sugOf(x)}));
 KCACHE=KNIT.concat(NL).map(l=>{const k=l.key||lk(l);const e=dl[k]||{p:0,d:0,r:0};const oa=S.outAlloc[k]||{};const a=S.asg[k];const fac=l.mode==='In-house'||a?'NFL (in-house)':(oa.fac||l.fac||'Not assigned');
  const prod=num(l.prod)+e.p,deliv=num(l.deliv)+e.d;const bal=Math.max(0,num(l.order)-prod),dbal=Math.max(0,prod-deliv);const sc=a?schedOf(k,num(l.order)):null;const taS=sc?sc.start:(oa.start||l.taS||''),taE=sc?sc.finish:(oa.end||l.taE||'');
  const late=!!(taE&&taE<TODAY&&bal>0);const r=(S.remarks[k]||[]).filter(x=>x.type==='Delay reason').pop();
  return Object.assign({},l,{key:k,code:jcode(l),fac,facType:/NFL/.test(fac)?'In-house':fac==='Greige stock'?'Greige stock':fac==='Not assigned'?'Not assigned':'Outside',prog:oa.prog||l.prog||'',mc:a?a.mc:'',prod,deliv,bal,dbal,taS,taE,late,delay:r?r.reason:'',rem:(S.remarks[k]||[]).length,
   finishReq:l.finish!=null?num(l.finish):null,knitReq:num(l.order),stageTxt:l.stage?({Report:'Report completion',Qty:'Qty approval',Active:'Active'})[l.stage]:'Active',
   status:bal===0&&num(l.order)>0?'Done':late?'Late':prod>0?'Running':'Not started',fabType:fabType(l.des)})});return KCACHE}
function schedOf(k,kg){const a=S.asg[k];if(!a)return null;const mc=S.machines.find(m=>m.id===a.mc)||{cap:425};const d=Math.max(1,Math.ceil(kg/Math.max(1,num(mc.cap))));return{start:a.start,finish:addDays(a.start,d-1),days:d,cap:num(mc.cap)}}
function machineLoad(){const L={};const K=knitRows();Object.entries(S.asg).forEach(([k,a])=>{const l=K.find(x=>x.key===k);if(!l)return;const sc=schedOf(k,num(l.order));for(let i=0;i<sc.days;i++){const d=addDays(sc.start,i);const key=a.mc+'|'+d;(L[key]=L[key]||[]).push(k)}});return L}
const PARTIES=()=>uniq(KNIT.map(l=>l.fac).concat(YDEL.flatMap(j=>j.progs.map(p=>p.party))).filter(f=>f&&/^[A-Za-z][A-Za-z .&-]{1,40}$/.test(f)&&!['Not assigned','Greige stock','NFL (in-house)','NFL','Stock'].includes(f)),x=>x).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
// ---------- UI components ----------
function cards(list,cls){return `<div class="kc ${cls||''}">${list.map(([v,l,k,q])=>`<${q?'button':'div'} class="kpi ${k||''} ${q&&QUICK===q?'on':''}" ${q?`data-qk="${q}"`:''}><div class="n">${v}</div><div class="l">${esc(l)}</div></${q?'button':'div'}>`).join('')}</div>`}
function hbars(list,unit){const mx=Math.max(1,...list.map(x=>x.v));return list.map(x=>`<div class="hrow"><span class="hn">${esc(x.k)}</span><span class="hb"><span style="width:${Math.max(2,x.v/mx*100)}%"></span></span><span class="hv">${x.t||n(x.v)}</span></div>`).join('')||'<div class="muted sm">No data</div>'}
function pairbars(list){const mx=Math.max(1,...list.flatMap(x=>[x.a,x.b]));return `<div class="vb2">${list.map(x=>`<div class="vb2c" title="${esc(x.k)}: ${n(x.a)} / ${n(x.b)}"><div class="vb2b"><span class="pa" style="height:${x.a/mx*100}%"></span><span class="pb" style="height:${x.b/mx*100}%"></span></div><div class="vl">${esc(x.k)}</div></div>`).join('')}</div>`}
function chart(title,body,legend){return `<div class="panel pad ch"><div class="ptitle">${esc(title)}</div>${body}${legend?`<div class="lg">${legend}</div>`:''}</div>`}
const legend2=(a,b)=>`<span class="la"></span>${esc(a)} <span class="lb"></span>${esc(b)}`;
function combo(id,opts,val,ph){const has=val&&opts.includes(val);return `<span class="combo"><select id="${id}" data-combo="1"><option value="__c" ${val&&!has?'selected':''}>✎ Custom…</option>${!val?'<option value="" selected>Choose</option>':''}${opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select><input type="text" id="${id}_c" placeholder="${esc(ph||'Type a new name')}" value="${val&&!has?esc(val):''}" style="${val&&!has?'':'display:none'}"></span>`}
function cv(id){const s=G(id);if(!s)return'';return s.value==='__c'?(G(id+'_c').value||'').trim():s.value}
function bindCombos(){root.querySelectorAll('select[data-combo]').forEach(s=>{if(s.__cb)return;s.__cb=1;s.addEventListener('change',()=>{const i=G(s.id+'_c');if(i){i.style.display=s.value==='__c'?'':'none';if(s.value==='__c')i.focus()}})})}
function printDoc(title,html){const a=document.getElementById('printArea');if(!a){toast('Printing is not available here');return}a.innerHTML=`<div class="ps"><h2>NORTHERN FASHION LTD.</h2><h3>${esc(title)}</h3><p>Date: ${fmt(TODAY)}</p>${html}</div>`;try{window.print()}catch(e){toast('Printing is blocked here. Open the page in a full browser tab.')}}
// Data table: filter on every column, sort by header, paging, totals, Excel copy
const TS={};
function dtable(id,cols,rows,opt){opt=opt||{};const st=TS[id]||(TS[id]={f:{},s:null,d:1,p:0});
 let R=rows.filter(r=>cols.every(c=>{const fv=st.f[c.k];if(!fv)return true;const v=c.v?c.v(r):r[c.k];if(c.fsel)return String(v)===fv;return String(v==null?'':v).toLowerCase().includes(fv.toLowerCase())}));
 if(st.s){const c=cols.find(x=>x.k===st.s);if(c){const g=r=>{const v=c.v?c.v(r):r[c.k];return c.num?num(v):String(v==null?'':v)};R=R.slice().sort((a,b)=>{const x=g(a),y=g(b);return(typeof x==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*st.d})}}
 const per=opt.per||50,pages=Math.max(1,Math.ceil(R.length/per));if(st.p>=pages)st.p=pages-1;const sl=R.slice(st.p*per,st.p*per+per);
 const cell=(c,r)=>{const v=c.v?c.v(r):r[c.k];return c.h?c.h(r):c.num?(v==null||v===''?'—':n(v)):(v==null||v===''?'—':esc(v))};
 const html=`<div class="panel dt">${opt.title?`<div class="pad"><div class="ptitle">${esc(opt.title)}</div></div>`:''}<div class="tablewrap"><table class="noband"><thead><tr class="hdr">${cols.map((c,i)=>`<th class="${c.num?'num':''} ${i===0?'sk sk0':''}" data-ts="${id}|${c.k}">${esc(c.l)}${st.s===c.k?(st.d>0?' ▲':' ▼'):''}</th>`).join('')}</tr>
 <tr class="frow">${cols.map((c,i)=>{const vals=c.fsel?uniq(rows,r=>c.v?c.v(r):r[c.k]):null;return `<th class="${i===0?'sk sk0':''}">${c.nofilter?'':vals?`<select data-tf="${id}|${c.k}" aria-label="Filter ${esc(c.l)}"><option value="">All</option>${vals.map(x=>`<option ${String(x)===st.f[c.k]?'selected':''}>${esc(x)}</option>`).join('')}</select>`:`<input type="search" id="tf_${id}_${c.k}" data-tf="${id}|${c.k}" value="${esc(st.f[c.k]||'')}" placeholder="Filter" aria-label="Filter ${esc(c.l)}">`}</th>`}).join('')}</tr></thead>
 <tbody>${sl.map(r=>`<tr ${opt.rowAttr?opt.rowAttr(r):''}>${cols.map((c,i)=>`<td class="${c.num?'num':''} ${i===0?'sk sk0':''} ${c.cls?c.cls(r):''}">${cell(c,r)}</td>`).join('')}</tr>`).join('')}</tbody>
 ${cols.some(c=>c.total)?`<tfoot><tr>${cols.map((c,i)=>`<td class="${c.num?'num':''} ${i===0?'sk sk0':''}">${i===0?`<b>${n(R.length)} ${esc(opt.unit||'rows')}</b>`:c.total?`<b>${n(R.reduce((a,r)=>a+num(c.v?c.v(r):r[c.k]),0))}</b>`:''}</td>`).join('')}</tr></tfoot>`:''}</table>${R.length?'':'<div class="empty">Nothing to show</div>'}</div>
 <div class="pager"><span>${R.length?st.p*per+1:0}–${Math.min(R.length,(st.p+1)*per)} of ${n(R.length)}</span><span><button class="btn sm" data-tp="${id}|-1" ${st.p?'':'disabled'}>Previous</button> <button class="btn sm" data-tp="${id}|1" ${st.p<pages-1?'':'disabled'}>Next</button> <button class="btn sm" data-tx="${id}">Copy for Excel</button></span></div></div>`;
 TS[id].last={cols,R};return html}
function bindTables(m){m.querySelectorAll('[data-ts]').forEach(th=>th.onclick=()=>{const [id,k]=th.dataset.ts.split('|');const st=TS[id];if(st.s===k)st.d=-st.d;else{st.s=k;st.d=1}render()});
 m.querySelectorAll('input[data-tf]').forEach(i=>i.oninput=()=>{const [id,k]=i.dataset.tf.split('|');TS[id].f[k]=i.value;TS[id].p=0;clearTimeout(bindTables.t);bindTables.t=setTimeout(render,250)});
 m.querySelectorAll('select[data-tf]').forEach(s=>s.onchange=()=>{const [id,k]=s.dataset.tf.split('|');TS[id].f[k]=s.value;TS[id].p=0;render()});
 m.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>{const [id,d]=b.dataset.tp.split('|');TS[id].p+=+d;render()});
 m.querySelectorAll('[data-tx]').forEach(b=>b.onclick=()=>{const {cols,R}=TS[b.dataset.tx].last;const t=[cols.map(c=>c.l).join('\t')].concat(R.map(r=>cols.map(c=>{const v=c.v?c.v(r):r[c.k];return v==null?'':v}).join('\t'))).join('\n');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copied. Paste into Excel.'),()=>toast('This browser does not allow copying'))})}
const resetTable=id=>{if(TS[id]){TS[id].f={};TS[id].p=0}};
function setTableFilter(id,k,v){const st=TS[id]||(TS[id]={f:{},s:null,d:1,p:0});st.f={};if(k)st.f[k]=v;st.p=0}
// Work queue: pending list on the left, form on the right
function queue(items,sel,panel,empty){return `<div class="qlay"><div class="qlist panel">${items.length?items.map(it=>`<button class="qi ${it.id===sel?'on':''}" data-qi="${esc(it.id)}"><b>${esc(it.title)}</b><span>${esc(it.sub||'')}</span>${it.tag?`<span class="qt">${it.tag}</span>`:''}</button>`).join(''):`<div class="muted sm" style="padding:10px">${esc(empty||'Nothing pending')}</div>`}</div><div class="qpanel">${panel||`<div class="panel pad muted sm">${items.length?'Select a job on the left.':'All done.'}</div>`}</div></div>`}
let QUICK='';
