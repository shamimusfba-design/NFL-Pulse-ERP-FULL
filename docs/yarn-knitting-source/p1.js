function mountYK(root,TODAY){
'use strict';
const G=id=>root.querySelector('#'+id);
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const n=x=>Math.round(num(x)).toLocaleString('en-US');
const t1=x=>(num(x)/1000).toLocaleString('en-US',{maximumFractionDigits:1})+' tons';
const fmt=d=>!d?'—':d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(2,4);
const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const addDays=(d,k)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+k);return x.toISOString().slice(0,10)};
const uniq=(a,f)=>[...new Set(a.map(f).filter(x=>x!==undefined&&x!==null&&x!==''))].sort((x,y)=>String(x).localeCompare(String(y),undefined,{numeric:true}));
const pill=(k,t)=>`<span class="st ${k}">${esc(t)}</span>`;
const pct=(a,b)=>b?Math.round(a/b*100):0;
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const mlab=m=>m?MON[+m.slice(5,7)-1]+' '+m.slice(2,4):'';
function toast(m){const t=G('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3400)}
const KEY='nos-yk-v8';
const MACHINES0=[{"id": "M-01", "dia": "44\"18G", "cap": 400}, {"id": "M-02", "dia": "40\"18G", "cap": 350}, {"id": "M-03", "dia": "40\"18G", "cap": 350}, {"id": "M-04", "dia": "36\"18G", "cap": 250}, {"id": "M-05", "dia": "36\"18G", "cap": 250}, {"id": "M-06", "dia": "30\"24G", "cap": 300}, {"id": "M-07", "dia": "30\"20G", "cap": 250}, {"id": "M-08", "dia": "30\"20G", "cap": 300}, {"id": "M-09", "dia": "30\"20G", "cap": 300}, {"id": "M-10", "dia": "30\"20G", "cap": 300}, {"id": "M-11", "dia": "34\"20G", "cap": 350}, {"id": "M-12", "dia": "34\"20G", "cap": 350}, {"id": "M-13", "dia": "34\"20G", "cap": 350}, {"id": "M-14", "dia": "36\"24G", "cap": 300}, {"id": "M-15", "dia": "36\"24G", "cap": 300}, {"id": "M-16", "dia": "30\"24G", "cap": 350}, {"id": "M-17", "dia": "36\"24G", "cap": 400}, {"id": "M-18", "dia": "36\"24G", "cap": 400}, {"id": "M-19", "dia": "36\"24G", "cap": 400}, {"id": "M-20", "dia": "34\"24G", "cap": 400}, {"id": "M-21", "dia": "34\"24G", "cap": 400}, {"id": "M-22", "dia": "34\"24G", "cap": 400}, {"id": "M-23", "dia": "30\"24G", "cap": 350}, {"id": "M-24", "dia": "30\"28G", "cap": 250}, {"id": "M-25", "dia": "30\"28G", "cap": 250}, {"id": "M-26", "dia": "30\"28G", "cap": 250}, {"id": "M-27", "dia": "30\"28G", "cap": 250}, {"id": "M-28", "dia": "34\"24G", "cap": 550}, {"id": "M-29", "dia": "34\"20G", "cap": 550}, {"id": "M-30", "dia": "30\"20G", "cap": 250}, {"id": "M-31", "dia": "28\"24G", "cap": 280}, {"id": "M-32", "dia": "26\"24G", "cap": 250}, {"id": "M-33", "dia": "30\"18G", "cap": 250}, {"id": "M-34", "dia": "44\"18G", "cap": 400}, {"id": "M-35", "dia": "30\"20G", "cap": 280}, {"id": "M-36", "dia": "36\"24G", "cap": 360}];
const DEF={req:[],pipe:[],rcv:[],iss:[],ret:[],jobs:[],lines:[],mq:{},nb:{},hold:{},outAlloc:{},daily:[],remarks:{},dead:{},cap:{},qc:[],lineInfo:{},machines:MACHINES0,loss:{'S/J':8,'Rib':10,'Fleece':12,'Terry':11,'Pique':9,'Other':10}};
let S=JSON.parse(JSON.stringify(DEF));try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)S=Object.assign(S,x)}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const ROLES=[['store','Yarn store'],['merch','Merchandiser'],['proc','Purchase'],['plan','Knitting planner'],['rep','Knitting reporter'],['pic','Knitting production incharge'],['qc','Knitting quality'],['mgmt','Management (view)']];
let ROLE='store';const can=(...r)=>r.includes(ROLE);const roleName=()=>ROLES.find(r=>r[0]===ROLE)[1];
// ---------- buyer / job codes ----------
function bcode(b){const t=String(b||'').toUpperCase().replace(/[\s-]+/g,'');if(/^BSNMT|NAMEIT/.test(t))return'BS-NMT';if(/^BSONS|SONS/.test(t))return'BS-ONS';if(/^BSONL|ONLY/.test(t))return'BS-ONL';if(/OVS/.test(t))return'OVS';if(/^UTG|^UT$/.test(t))return'UT';if(/GBX/.test(t))return'GBX';if(/TMLEWIN|LEWIN/.test(t))return'TML';if(/NEWLOOK/.test(t))return'NL';if(/LAGER/.test(t))return'LAGER';return t.slice(0,6)||'JOB'}
const jcode=l=>/^[A-Z]/.test(String(l.job||''))?String(l.job):bcode(l.buyer)+' '+l.job;
let JOBB=null;function jobBuyer(job){if(!JOBB){JOBB={};KNIT.concat(PLAN).forEach(l=>{const m=String(l.job||'').match(/\d{5}/);if(m&&l.buyer&&!JOBB[m[0]])JOBB[m[0]]=bcode(l.buyer)})}const m=String(job||'').match(/\d{5}/);return m&&JOBB[m[0]]?JOBB[m[0]]+' '+job:job}
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
const PLANKEY=i=>'P|'+i;
function knitRows(){if(KCACHE)return KCACHE;const dl={};S.daily.forEach(d=>{const o=dl[d.key]||(dl[d.key]={p:0,d:0,r:0});o.p+=num(d.prod);o.d+=num(d.deliv);o.r+=num(d.rej)});
 const PL=PLAN.map((p,i)=>({key:PLANKEY(i),src:'Machine program',buyer:p.buyer,job:p.job,count:p.count,ctype:guessCount(p.count),brand:p.brand,lot:p.lot,gsm:p.gsm,colour:p.colour,des:p.fabric,dia:p.dia,fdia:p.fwid,sl:p.sl,fac:'NFL (in-house)',mode:'In-house',order:p.order,prod:p.prod,deliv:p.prod,taE0:p.ta,ship:p.ship,slot:'',merch:'',remark:p.remark,prog:p.prog,progRcv:p.progRcv,pos0:p.pos,today:p.today,mc0:p.mc}));
 const NL=S.lines.map(x=>Object.assign({},x,{src:'Central planning',order:x.stage==='Active'?num(x.final):sugOf(x)}));
 KCACHE=KNIT.map(x=>Object.assign({src:'Knitting report (Aug)'},x)).concat(PL,NL).map(l0=>{const k=l0.key||lk(l0);const l=Object.assign({},l0,S.lineInfo[k]||{});const e=dl[k]||{p:0,d:0,r:0};const oa=S.outAlloc[k]||{};const sc=SCHED?SCHED[k]:null;const hold=S.hold[k];
  const inh=l.mode==='In-house'||!!sc||l.fac==='NFL (in-house)';const fac=inh?'NFL (in-house)':(oa.fac||l.fac||'Not assigned');
  const prod=num(l.prod)+e.p,deliv=num(l.deliv)+e.d;const bal=Math.max(0,num(l.order)-prod),dbal=Math.max(0,prod-deliv);
  const taS=sc?sc.startDate:(oa.start||l.taS||''),taE=sc?sc.finishDate:(oa.end||l.taE||'');const due=l.taE0||'';const late=!!(bal>0&&((taE&&taE<TODAY)||(sc&&due&&sc.finishDate>due)));
  const r=(S.remarks[k]||[]).filter(x=>x.type==='Delay reason').pop();
  return Object.assign({},l,{key:k,code:jcode(l),fac,facType:inh?'In-house':fac==='Greige stock'?'Greige stock':fac==='Not assigned'?'Not assigned':'Outside',prog:oa.prog||l.prog||'',mc:sc?sc.mc:(hold?hold.mc:''),pos:sc?sc.pos:(hold?hold.why:''),prod,deliv,bal,dbal,taS,taE,due,late,delay:r?r.reason:'',rem:(S.remarks[k]||[]).length,
   finishReq:l.finish!=null?num(l.finish):null,knitReq:num(l.order),stageTxt:l.stage?({Report:'Report completion',Qty:'Qty approval',Active:'Active'})[l.stage]:'Active',
   status:bal===0&&num(l.order)>0?'Done':hold?'On hold':late?'Late':prod>0?'Running':'Not started',fabType:fabType(l.des)})});return KCACHE}
// Machine queues: jobs run one after another on each machine. Start = previous job's finish, or a "not before" date.
let SCHED=null;const dOff=d=>(Date.parse(d)-Date.parse(TODAY))/864e5;const offDate=o=>addDays(TODAY,Math.floor(o+1e-9));
function baseOf(){const base={};PLAN.forEach((p,i)=>{base[PLANKEY(i)]={order:p.order,prod:p.prod}});S.lines.forEach(x=>{base[x.key]={order:x.stage==='Active'?num(x.final):sugOf(x),prod:0}});return base}
function buildSched(){SCHED={};const base=baseOf();const before={};S.daily.forEach(d=>{if(d.date<TODAY)before[d.key]=(before[d.key]||0)+num(d.prod)});
 S.machines.forEach(mc=>{let t=0;(S.mq[mc.id]||[]).forEach((k,i)=>{const b=base[k];if(!b)return;const bal=Math.max(0,b.order-b.prod-(before[k]||0));const nb=S.nb[k]?Math.max(0,dOff(S.nb[k])):0;const s=Math.max(t,nb);const e=s+bal/Math.max(1,num(mc.cap));
  SCHED[k]={mc:mc.id,s,e,startDate:offDate(s),finishDate:offDate(Math.max(s,e-1e-6)),days:e-s,pos:i===0?'RUN':String(i+1),kg:bal,idx:i};t=e})})}
function dayLoad(D){const d=dOff(D);const out=[];Object.entries(SCHED).forEach(([k,sc])=>{const ov=Math.min(sc.e,d+1)-Math.max(sc.s,d);if(ov>1e-6){const mc=S.machines.find(x=>x.id===sc.mc);out.push({k,mc,kg:ov*num(mc.cap)})}});return out}
function qEnd(mcId,excl){const L=(S.mq[mcId]||[]).filter(k=>k!==excl&&SCHED[k]);return L.length?Math.max(...L.map(k=>SCHED[k].e)):0}
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
// Data table: Excel-style filter in the header (▾), sort, paging, totals, Excel copy and download
const TS={};
function dtable(id,cols,rows,opt){opt=opt||{};const st=TS[id]||(TS[id]={f:{},s:null,d:1,p:0});const gv=(c,r)=>{const v=c.v?c.v(r):r[c.k];return v==null?'':String(v)};
 let R=rows.filter(r=>cols.every(c=>{const fv=st.f[c.k];return !fv||fv.includes(gv(c,r))}));
 if(st.s){const c=cols.find(x=>x.k===st.s);if(c){const g=r=>{const v=c.v?c.v(r):r[c.k];return c.num?num(v):String(v==null?'':v)};R=R.slice().sort((a,b)=>{const x=g(a),y=g(b);return(typeof x==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*st.d})}}
 const per=opt.per||50,pages=Math.max(1,Math.ceil(R.length/per));if(st.p>=pages)st.p=pages-1;const sl=R.slice(st.p*per,st.p*per+per);
 const cell=(c,r)=>{const v=c.v?c.v(r):r[c.k];return c.h?c.h(r):c.num?(v==null||v===''?'—':n(v)):(v==null||v===''?'—':esc(v))};
 TS[id].src={cols,rows,gv};TS[id].last={cols,R};const nf=Object.keys(st.f).length;
 return `<div class="panel dt">${opt.title||nf?`<div class="pad dth"><div class="ptitle">${esc(opt.title||'')}</div>${nf?`<button class="btn sm" data-tclr="${id}">Clear ${nf} filter${nf>1?'s':''}</button>`:''}</div>`:''}<div class="tablewrap"><table class="noband"><thead><tr class="hdr">${cols.map((c,i)=>`<th class="${c.num?'num':''} ${i===0?'sk sk0':''}"><span class="thw"><span class="thl">${esc(c.l)}${st.s===c.k?(st.d>0?' ↑':' ↓'):''}</span>${c.nofilter?'':`<button class="tfb ${st.f[c.k]?'on':''}" data-tfb="${id}|${c.k}" aria-label="Filter ${esc(c.l)}">▾</button>`}</span></th>`).join('')}</tr></thead>
 <tbody>${sl.map(r=>`<tr ${opt.rowAttr?opt.rowAttr(r):''}>${cols.map((c,i)=>`<td class="${c.num?'num':''} ${i===0?'sk sk0':''} ${c.cls?c.cls(r):''}">${cell(c,r)}</td>`).join('')}</tr>`).join('')}</tbody>
 ${cols.some(c=>c.total)?`<tfoot><tr>${cols.map((c,i)=>`<td class="${c.num?'num':''} ${i===0?'sk sk0':''}">${i===0?`<b>${n(R.length)} ${esc(opt.unit||'rows')}</b>`:c.total?`<b>${n(R.reduce((a,r)=>a+num(c.v?c.v(r):r[c.k]),0))}</b>`:''}</td>`).join('')}</tr></tfoot>`:''}</table>${R.length?'':'<div class="empty">Nothing to show</div>'}</div>
 <div class="pager"><span>${R.length?st.p*per+1:0}–${Math.min(R.length,(st.p+1)*per)} of ${n(R.length)}</span><span><button class="btn sm" data-tp="${id}|-1" ${st.p?'':'disabled'}>Previous</button> <button class="btn sm" data-tp="${id}|1" ${st.p<pages-1?'':'disabled'}>Next</button> <button class="btn sm" data-tx="${id}">Copy for Excel</button> <button class="btn sm" data-txl="${id}">Download Excel</button></span></div></div>`}
let FPOP=null;
function closeFpop(){const p=root.querySelector('#fpop');if(p)p.remove();FPOP=null}
function openFpop(btn,id,k){closeFpop();const st=TS[id];const {cols,rows,gv}=st.src;const c=cols.find(x=>x.k===k);const vals=uniq(rows,r=>gv(c,r)||'(blank)');const cur=st.f[k]?new Set(st.f[k].map(v=>v||'(blank)')):null;
 const p=document.createElement('div');p.id='fpop';p.className='fpop';p.innerHTML=`<div class="fpb"><button class="btn sm" data-fs="1">Sort A → Z</button><button class="btn sm" data-fs="-1">Sort Z → A</button></div><input type="search" id="fpq" placeholder="Search values"><label class="fpall"><input type="checkbox" id="fpAll" ${cur?'':'checked'}> Select all</label><div class="fpl">${vals.slice(0,400).map(v=>`<label><input type="checkbox" value="${esc(v)}" ${!cur||cur.has(v)?'checked':''}> ${esc(v)}</label>`).join('')}${vals.length>400?`<div class="muted sm">${vals.length-400} more: use search</div>`:''}</div><div class="fpb"><button class="btn sm" data-fc="1">Clear</button><button class="btn sm primary" data-fo="1">OK</button></div>`;
 root.appendChild(p);const r=btn.getBoundingClientRect();p.style.top=Math.max(8,Math.min(window.innerHeight-330,r.bottom+4))+'px';p.style.left=Math.max(8,Math.min(window.innerWidth-268,r.right-250))+'px';FPOP={id,k};
 const boxes=()=>[...p.querySelectorAll('.fpl input[type=checkbox]')];
 p.querySelector('#fpq').oninput=e=>{const q=e.target.value.toLowerCase();boxes().forEach(b=>{b.parentNode.style.display=b.value.toLowerCase().includes(q)?'':'none'})};
 p.querySelector('#fpAll').onchange=e=>{boxes().forEach(b=>{if(b.parentNode.style.display!=='none')b.checked=e.target.checked})};
 p.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>{st.s=k;st.d=+b.dataset.fs;closeFpop();render()});
 p.querySelector('[data-fc]').onclick=()=>{delete st.f[k];st.p=0;closeFpop();render()};
 p.querySelector('[data-fo]').onclick=()=>{const q=p.querySelector('#fpq').value.trim();const on=boxes().filter(b=>b.checked&&(!q||b.parentNode.style.display!=='none')).map(b=>b.value==='(blank)'?'':b.value);if(!q&&on.length===vals.length)delete st.f[k];else st.f[k]=on;st.p=0;closeFpop();render()}}
document.addEventListener('click',e=>{if(FPOP&&!e.target.closest('#fpop')&&!e.target.closest('[data-tfb]'))closeFpop()});
let XLSX_P=null;function loadXlsx(){if(window.XLSX)return Promise.resolve(window.XLSX);if(!XLSX_P)XLSX_P=new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';sc.onload=()=>res(window.XLSX);sc.onerror=()=>{XLSX_P=null;rej(new Error('load'))};document.head.appendChild(sc)});return XLSX_P}
async function saveXlsx(filename,aoa,sheet,merges){try{const X=await loadXlsx();const wb=X.utils.book_new();const ws=X.utils.aoa_to_sheet(aoa);if(merges)ws['!merges']=merges;X.utils.book_append_sheet(wb,ws,sheet||'Sheet1');const buf=X.write(wb,{type:'array',bookType:'xlsx'});
 const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;if(dl){await dl.save({filename,data:buf});toast('Excel file saved')}else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=filename;document.body.appendChild(a);a.click();a.remove();toast('Excel file downloaded')}}
 catch(e){toast(e&&e.code==='declined'?'Download cancelled':'Download is not available here. Use Copy for Excel.')}}
function bindTables(m){m.querySelectorAll('[data-tfb]').forEach(b=>b.onclick=e=>{e.stopPropagation();const [id,k]=b.dataset.tfb.split('|');if(FPOP&&FPOP.id===id&&FPOP.k===k){closeFpop();return}openFpop(b,id,k)});
 m.querySelectorAll('[data-tclr]').forEach(b=>b.onclick=()=>{TS[b.dataset.tclr].f={};TS[b.dataset.tclr].p=0;render()});
 m.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>{const [id,d]=b.dataset.tp.split('|');TS[id].p+=+d;render()});
 const rowsOf=id=>{const {cols,R}=TS[id].last;return[cols.map(c=>c.l)].concat(R.map(r=>cols.map(c=>{const v=c.v?c.v(r):r[c.k];return v==null?'':v})))};
 m.querySelectorAll('[data-tx]').forEach(b=>b.onclick=()=>{const t=rowsOf(b.dataset.tx).map(r=>r.join('\t')).join('\n');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copied. Paste into Excel.'),()=>toast('This browser does not allow copying'))});
 m.querySelectorAll('[data-txl]').forEach(b=>b.onclick=()=>saveXlsx(b.dataset.txl+'.xlsx',rowsOf(b.dataset.txl)))}
const resetTable=id=>{if(TS[id]){TS[id].f={};TS[id].p=0}};
// Work queue: pending list on the left, form on the right
function queue(items,sel,panel,empty){if(!items.length&&!panel)return `<div class="qnone">${esc(empty||'Nothing pending')}</div>`;return `<div class="qlay"><div class="qlist panel">${items.length?items.map(it=>`<button class="qi ${it.id===sel?'on':''}" data-qi="${esc(it.id)}"><b>${esc(it.title)}</b><span>${esc(it.sub||'')}</span>${it.tag?`<span class="qt">${it.tag}</span>`:''}</button>`).join(''):`<div class="muted sm" style="padding:10px">${esc(empty||'Nothing pending')}</div>`}</div><div class="qpanel">${panel||`<div class="panel pad muted sm">${items.length?'Select a job on the left.':'All done.'}</div>`}</div></div>`}
let QUICK='';
