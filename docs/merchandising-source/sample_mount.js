function mountSample(root,RAW,PO){
'use strict';
const G=id=>root.querySelector('#'+id)||document.getElementById(id);
const XKEY='nos-xtasks-v1';const xget=()=>{try{return JSON.parse(localStorage.getItem(XKEY)||'[]')}catch(e){return[]}};const xset=a=>{try{localStorage.setItem(XKEY,JSON.stringify(a))}catch(e){}};
'use strict';
const TODAY='2026-10-09',QMONTH='2026-10';
const mobile=()=>window.matchMedia&&window.matchMedia('(max-width:1000px)').matches&&!document.documentElement.classList.contains('desk');
// ---------- masters ----------
const STAGES=['Pattern due','Fabric due','Trims due','Fabric ok','Need cut','Ready for sewing','Print / Emb out','Sewing running','Sewing ok','Comments due','Approved','Revised','In stock','Cancelled'];
const OD=['Offer','Development','Proto'];
const TYPE_ORDER=['Offer','Development','Proto','Fit','SMS','PP','APP','Photo','BPS','Test','AR','AD','Color ref.','Size set','Shipment'];
const MS=['Order sheet sent','In sample room','Sent to buyer','Waiting buyer comments','Revise requested','Approved','Dropped'];
const MSTONE={'Order sheet sent':'none','In sample room':'run','Sent to buyer':'wait','Waiting buyer comments':'wait','Revise requested':'late','Approved':'done','Dropped':'none'};
const MSC=['var(--ink-2)','var(--indigo-2)','var(--thread)','var(--warn)','var(--bad)','var(--good)','var(--line)'];
const LAB=['Not started','Submitted','Approved','Rejected – resubmit'],LABST={'Approved':'done','Submitted':'wait','Rejected – resubmit':'late','Not started':'none'};
const COST=['Not started','Draft','Done'],COSTST={'Done':'done','Draft':'run','Not started':'wait'};
const YARN=['Not started','Sent to purchase'],YARNST={'Sent to purchase':'done','Not started':'wait'};
const TRIMO=['Not started','Ordering','Ordered','Not needed'],TRIMOST={'Ordered':'done','Ordering':'run','Not started':'wait','Not needed':'none'};
const TRIMIST={'All received':'done','Partly received':'wait','Not received':'late','Not needed':'none'};
const BS=['ONLY','ONLY & SONS','NAME IT'];const hasSmsBuyer=b=>BS.includes(b);
const CORE_TYPES=['Offer','Development','Proto','Fit','SMS','PP','APP','Photo','BPS','Test'];
const FINISH=['Print','Solid','Emb.','Print+Emb.'];
const DSTAT=['Delivered','Partly delivered','Pending','Overdue','Cancelled'];
const DTONE={Delivered:'good','Partly delivered':'warn',Pending:'info',Overdue:'bad',Cancelled:''};
const TONE={'Pattern due':'warn','Fabric due':'bad','Trims due':'warn','Fabric ok':'info','Need cut':'info','Ready for sewing':'info','Print / Emb out':'info','Sewing running':'info','Sewing ok':'good','Comments due':'warn','Approved':'good','Revised':'warn','In stock':'good','All sent':'good','TNA pending':'warn','Returned':'bad','Cancelled':''};
const stTone=s=>TONE[s]!==undefined?TONE[s]:'good';
const DEMO_BOTH=['Shovon','Hashi'];
const QUOTA=[
 {line:'ONLY – Carmakoma, Maternity',codes:['Carmakoma','ONL-Maternity'],od:10},{line:'ONLY – OSB',codes:['ONL-OSB'],od:20},{line:'ONLY – Play',codes:['ONL-Play','ONL-Play 7 Zone'],od:10},
 {line:'ONLY – Jersey & Sweat',codes:['ONL-JRSY','ONL-JRSY Main','ONL-SWT'],od:60},{line:'ONLY – NOOS',codes:['ONL-JRSY Noos'],od:20},{line:'ONLY – CS, Express',codes:['ONL-JRSY Exp.','ONL-SWT Exp.'],od:20},
 {line:'ONLY – Kids',codes:['ONL-JRSY Kids','ONL-SWT Kids'],od:10},{line:'NAME IT – Basic Needs',codes:['NMT-Main'],od:10},{line:'NAME IT – LMTD, Boy',codes:['NMT-Kids'],od:15},
 {line:'NAME IT – Express + Campaign',codes:['NMT-Exp.'],od:20},{line:'NAME IT – NOOS',codes:['NMT-Noos'],od:15},{line:'NAME IT – Baby + Girl + Guppy',codes:['NMT-Baby','NMT-Mini','NMT-Guppy'],od:55},
 {line:'ONLY & SONS – Main lines',codes:['ONS'],od:30},{line:'ONLY & SONS – Junior',codes:['ONS-Junior'],od:5},{line:'New Look',codes:['New Look'],od:20}];
// ---------- helpers ----------
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=x=>Number(x).toLocaleString('en-US');
const fmt=d=>!d?'—':d==='N/A'?'N/A':d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(2,4);
const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const addDays=(d,k)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+k);return x.toISOString().slice(0,10)};
const uniq=(arr,f)=>[...new Set(arr.map(f).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
const chip=(t,c)=>`<span class="chip ${c||''}">${esc(t)}</span>`;
const cap=s=>String(s||'').trim().replace(/\s+/g,' ').replace(/^./,c=>c.toUpperCase());
const monthLabel=m=>{const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return M[+m.slice(5,7)-1]+' '+m.slice(0,4)};
function hash(s){let h=11;for(const c of String(s))h=(h*37+c.charCodeAt(0))%9973;return h/9973}
function toast(m){const t=G('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2800)}
const norm=s=>String(s==null?'':s).trim().replace(/\.0$/,'');
function prepRow(r){r.style=norm(r.style);r.buyerName=r.group==='Bestseller'?r.brand:r.group;r.due=r.plannedDue||r.sewClose;if(r.q0==null)r.q0=r.qty;return r}
RAW.forEach(prepRow);
const NKEY='nos-merch-new-v1';
function seedNew(){const mk=(sid,brand,sub,merch,style,name,type,colors,fab,d_,req)=>colors.map(([c,q],i)=>({id:sid+'-'+i,sheetId:sid,group:'Bestseller',brand,buyer:sub,merch,style,types:[type],color:c,qty:q,rcvd:addDays(TODAY,-d_),coll:'6',sewDone:0,dyeClose:null,sewStart:null,sewClose:null,sewActual:null,delQty:0,delActual:null,reqDate:req,approval:'Pending',statusRaw:'',stage:fab?'Fabric due':'Ready for sewing',loc:'Sample room',finish:'Print',reason:'',note:'',history:[[addDays(TODAY,-d_),'Order sheet submitted by '+merch+' to Sample Planning']],
  os:{bso:'2204'+style.slice(-4),styleName:name,garment:'',size:type==='SMS'?'S':'146/152',instructions:'Fabric quality should be as per buyer quality requirement.',ta:null,fabric:fab?[['Body + Sleeve','Single Jersey 180 GSM','100% Cotton',String(Math.round(q*0.3))],['Neck','1x1 Rib 300 GSM F/F','95% Cotton, 5% Elastane','3']]:[]}}));
 return [].concat(mk('SD1','ONLY','ONL-JRSY','Faisal','15402210','ONLMAY LS TOP JRS','SMS',[['Cloud Dancer',60],['Black',60]],true,2,addDays(TODAY,16)),mk('SD2','NAME IT','NMT-Baby','Hashi','13261190','NBFKATE SS DRESS','Development',[['Pink Lady',2]],false,1,addDays(TODAY,6)),mk('SD3','ONLY & SONS','ONS','Rowson','22040118','ONSKANE RLX SS TEE','PP',[['Jet Black',3],['Navy Blazer',3]],true,0,addDays(TODAY,9)))}
let NEWR=null;try{NEWR=JSON.parse(localStorage.getItem(NKEY)||'null')}catch(e){}
if(!Array.isArray(NEWR)){NEWR=seedNew();try{localStorage.setItem(NKEY,JSON.stringify(NEWR))}catch(e){}}
NEWR.forEach(r=>{r.isNew=true;RAW.push(prepRow(r))});
const saveNew=()=>{try{localStorage.setItem(NKEY,JSON.stringify(RAW.filter(r=>r.isNew)))}catch(e){}};
const grpRow=t=>(t||[]).includes('SMS')?'sms':((t||[]).includes('PP')||(t||[]).includes('APP'))?'pp':'od';
const rowKey=r=>[r.buyerName,r.style,(r.types||[]).join('+'),r.rcvd||''].join('|');
const sewBal=r=>Math.max(0,r.qty-r.sewDone),delBal=r=>Math.max(0,r.qty-r.delQty);
function dstat(r){if(r.stage==='Cancelled')return'Cancelled';if(delBal(r)===0||['Comments due','Approved','Revised'].includes(r.stage))return'Delivered';if(r.delQty>0)return'Partly delivered';if(r.due&&r.due<TODAY)return'Overdue';return'Pending'}
// ---------- users and teams ----------
const cnt={};RAW.forEach(r=>{if(r.merch){const o=cnt[r.merch]||(cnt[r.merch]={n:0,b:{}});o.n++;o.b[r.buyerName]=(o.b[r.buyerName]||0)+1}});
const topKey=o=>(Object.entries(o).sort((a,b)=>b[1]-a[1])[0]||[''])[0];
const MERCH=Object.entries(cnt).filter(([k,o])=>o.n>=30).map(([name,o])=>({id:'m:'+name,kind:'m',name,team:topKey(o.b),type:DEMO_BOTH.includes(name)?'Sample + Bulk':'Sample'})).sort((a,b)=>a.name.localeCompare(b.name));
const TLS=['ONLY','NAME IT','ONLY & SONS','OVS'].map(g=>({id:'t:'+g,kind:'t',name:'Team leader – '+g,team:g,type:'Sample + Bulk'}));
const HEAD={id:'h',kind:'h',name:'Head of Merchandising',type:'Sample + Bulk'};
const PLAN={id:'p',kind:'p',name:'Sample Planning',type:'Sample',team:''};
const USERS=[].concat(MERCH,TLS,[PLAN,HEAD]);
let me=USERS.find(u=>u.id==='m:Faisal')||USERS[0];
G('whoSel').innerHTML=`<optgroup label="Merchandisers">${MERCH.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} (${esc(u.team)} team)</option>`).join('')}</optgroup><optgroup label="Team leaders">${TLS.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</optgroup><optgroup label="Sample Planning"><option value="p">${PLAN.name}</option></optgroup><optgroup label="Management (view only)"><option value="h">${HEAD.name}</option></optgroup>`;
G('whoSel').value=me.id;
const inScope=(r,u)=>u.kind==='h'||u.kind==='p'||r.buyerName===u.team||(u.kind==='m'&&r.merch===u.name);
// ---------- merchandiser-owned data (kept in this browser for the demo) ----------
const KEY='nos-merch-follow-v2';let OWN={};try{OWN=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const saveOwn=()=>{try{localStorage.setItem(KEY,JSON.stringify(OWN))}catch(e){}};
const own=k=>OWN[k]||(OWN[k]={});
// ---------- sample-row model: one row = style + sample type + order sheet ----------
function stateOf(rows){rows=rows.filter(r=>r.stage!=='Cancelled');if(!rows.length)return{st:'Cancelled',dst:'Cancelled',open:[],act:[]};
 const act=rows,open=act.filter(r=>dstat(r)!=='Delivered');const ds=act.map(dstat);
 const st=open.length?open.reduce((a,r)=>STAGES.indexOf(r.stage)<STAGES.indexOf(a)?r.stage:a,open[0].stage):(act.every(r=>['Approved','In stock'].includes(r.stage))?'Approved':act.some(r=>r.stage==='Comments due')?'Comments due':act.some(r=>r.stage==='Revised')?'Revised':'All sent');
 const done=ds.filter(x=>x==='Delivered').length;
 const dst=done===act.length?'Delivered':ds.includes('Overdue')?'Overdue':(done>0||ds.includes('Partly delivered'))?'Partly delivered':'Pending';
 return{st,dst,open,act}}
function decorate(g){
 g.sub=topKey(g.subC);g.merch=topKey(g.merC);g.main=g.types[0];g.cat=grpRow(g.types);
 const o=OWN[g.key]||{};
 g.coll=o.coll!=null?o.coll:g.rows[0].coll;g.finish=o.finish!=null?o.finish:g.rows[0].finish;g.req=o.req||'';
 const S=stateOf(g.rows);Object.assign(g,S);g.apr=g.rows[0].approval||'Approved';if(g.apr!=='Approved'){g.st=g.apr==='Pending'?'TNA pending':'Returned';g.dst='Pending';g.open=[]}
 g.nextDue=g.open.map(r=>r.due).filter(Boolean).sort()[0]||'';
 g.qty=g.act.reduce((a,r)=>a+r.qty,0);g.sewn=g.act.reduce((a,r)=>a+Math.min(r.sewDone,r.qty),0);g.delv=g.act.reduce((a,r)=>a+Math.min(r.delQty,r.qty),0);g.cols=g.act.length;
 g.lateN=g.open.filter(r=>dstat(r)==='Overdue').length;g.reason=topKey(g.act.reduce((m,r)=>{if(r.reason&&r.reason!=='On time')m[r.reason]=(m[r.reason]||0)+1;return m},{}));
 const dm=g.apr!=='Approved'?'Order sheet sent':g.st==='Approved'||g.st==='In stock'?'Approved':g.st==='Comments due'?'Waiting buyer comments':g.st==='Revised'?'Revise requested':g.dst==='Delivered'?'Sent to buyer':'In sample room';
 g.msV=o.ms||dm;g.msDefault=!o.ms;
 const h1=hash('l'+g.key),h2=hash('c'+g.key),h3=hash('y'+g.key);const isSMS=g.cat==='sms';const bs=hasSmsBuyer(g.buyerName);g.bs=bs;
 g.labApp=g.cat!=='pp';g.costApp=bs?isSMS:true;g.yarnApp=bs?isSMS:true;g.trimApp=true;
 g.labV=o.lab||(h1<.55?'Approved':h1<.8?'Submitted':'Not started');g.costV=o.cost||(h2<.5?'Done':h2<.8?'Draft':'Not started');g.yarnV=o.yarn||(h3<.5?'Sent to purchase':'Not started');const h4=hash('t'+g.key);g.trimOV=o.trimO||(h4<.5?'Ordered':h4<.75?'Ordering':'Not started');g.trimIV=g.trimOV==='Not needed'?'Not needed':g.trimOV==='Ordered'?(hash('i'+g.key)<.6?'All received':'Partly received'):'Not received';g.fob=o.fob||'';g.note=o.note||'';g.yarnNo=(YR.filter(r=>r.key===g.key).slice(-1)[0]||{}).no||'';
 g.fl={late:g.lateN>0,fab:g.open.some(r=>r.stage==='Fabric due'),cmt:g.act.some(r=>r.stage==='Comments due'),lab:g.labApp&&g.labV!=='Approved',cost:g.costApp&&g.costV!=='Done',yarn:g.yarnApp&&g.yarnV!=='Sent to purchase',ms:g.msV!=='Approved'&&g.msV!=='Dropped'&&g.dst==='Delivered',tna:g.apr==='Pending'};
 g.next=g.apr==='Pending'?'Waiting for Sample Planning to give the TNA':g.apr==='Returned'?'Planning returned it: '+(g.rows[0].returnReason||'')+'. Fix and resubmit':g.msV==='Dropped'?'Dropped':g.lateN?`Chase sample room: ${g.lateN} colour${g.lateN>1?'s':''} past date`:g.fl.fab?'Chase fabric from knitting and dyeing':g.fl.cmt?'Get buyer comments':g.labV==='Rejected – resubmit'&&g.labApp?'Resubmit lab dip':g.fl.cost&&g.costV!=='Done'?'Fill the cost sheet':g.fl.lab?'Follow lab dip approval':g.fl.yarn?'Send the yarn requisition to Purchase':g.trimOV==='Not started'?'Order trims and accessories':g.msV==='Approved'?'Approved, nothing pending':g.open.length?'Follow sample room':'Update merchandising status';
 return g}
let GROUPS=[],STYLEMAP=new Map();
function buildGroups(){
 RAW.forEach(r=>{const o=OWN[rowKey(r)];r.qty=o&&o.qty&&o.qty[r.id]!=null?o.qty[r.id]:r.q0});
 const map=new Map();RAW.forEach(r=>{if(!inScope(r,me))return;const k=rowKey(r);let g=map.get(k);if(!g){g={key:k,style:r.style,buyerName:r.buyerName,types:r.types||[],rcvd:r.rcvd||'',rows:[],subC:{},merC:{}};map.set(k,g)}g.rows.push(r);g.subC[r.buyer]=(g.subC[r.buyer]||0)+1;if(r.merch)g.merC[r.merch]=(g.merC[r.merch]||0)+1});
 GROUPS=[...map.values()].map(decorate);
 STYLEMAP=new Map();GROUPS.forEach(g=>{const k=g.buyerName+'|'+g.style;(STYLEMAP.get(k)||STYLEMAP.set(k,[]).get(k)).push(g)});
 GROUPS.forEach(g=>{g.sib=STYLEMAP.get(g.buyerName+'|'+g.style).slice().sort((a,b)=>String(a.rcvd).localeCompare(String(b.rcvd)));g.po=(PO[g.style]||[])[0]||null;g.poN=(PO[g.style]||[]).length})}
const canEdit=g=>me.kind==='t'||(me.kind==='m'&&g.merch===me.name);
const canNew=()=>me.kind==='m'||me.kind==='t';
// ---------- state ----------
let railMode='tna',railOpen=false,PREFILL=null;
let VIEW='followup';let PAGE='sample',TYPE='all',selKey=null,pageN=0,sort={k:'nextDue',dir:1},mine=true;const PER=50;
const F={q:'',buyer:'',sub:'',merch:'',coll:'',month:'',ms:'',stage:'',dst:'',quick:''};
const QUICK={costNS:{l:'Costing required',f:g=>g.costApp&&g.costV==='Not started'},costDraft:{l:'Costing draft',f:g=>g.costApp&&g.costV==='Draft'},costDone:{l:'Costing done',f:g=>g.costApp&&g.costV==='Done'},yarnNS:{l:'Yarn requisition required',f:g=>g.yarnApp&&g.yarnV==='Not started'},yarnDone:{l:'Yarn requisition sent',f:g=>g.yarnApp&&g.yarnV==='Sent to purchase'},tna:{l:'TNA pending',f:g=>g.fl.tna},late:{l:'Delivery date passed',f:g=>g.fl.late},fab:{l:'Fabric due',f:g=>g.fl.fab},cmt:{l:'Buyer comments due',f:g=>g.fl.cmt},lab:{l:'Lab dip pending',f:g=>g.fl.lab},cost:{l:'Costing required',f:g=>g.fl.cost},yarn:{l:'Yarn requisition required',f:g=>g.fl.yarn}};
const viewOk=g=>VIEW==='costing'?g.costApp:VIEW==='yarn'?g.yarnApp:true;
const typeOk=g=>TYPE==='all'||g.types.includes(TYPE);
const mineOk=g=>!(me.kind==='m'&&mine)||g.merch===me.name;
function match(g,skip){const q=F.q.toLowerCase();return typeOk(g)&&mineOk(g)&&viewOk(g)&&(!q||(g.style+' '+g.sub+' '+g.merch+' '+g.buyerName).toLowerCase().includes(q))&&(skip==='buyer'||!F.buyer||g.buyerName===F.buyer)&&(!F.sub||g.sub===F.sub)&&(!F.merch||g.merch===F.merch)&&(!F.coll||String(g.coll)===F.coll)&&(!F.month||g.nextDue.slice(0,7)===F.month)&&(skip==='ms'||!F.ms||g.msV===F.ms)&&(skip==='stage'||!F.stage||g.st===F.stage)&&(!F.dst||g.dst===F.dst)&&(skip==='quick'||!F.quick||QUICK[F.quick].f(g))}
function sel(id,label,opts,val,labf){return `<select id="${id}" aria-label="${label}"><option value="">${label}</option>${opts.map(o=>`<option value="${esc(o)}" ${o===val?'selected':''}>${esc(labf?labf(o):o)}</option>`).join('')}</select>`}
function pill(k,t){if(k==='na')return '<span class="st na">—</span>';return `<span class="st ${k}">${esc(t)}</span>`}
// ---------- tabs ----------
function renderTabs(){}
function render(){const ae=document.activeElement;const keep=ae&&ae.tagName==='INPUT'&&ae.type==='search'&&ae.id&&root.contains(ae)?ae:null;const tw=root.querySelector('.tablewrap');const sx=tw?tw.scrollLeft:0,sy=tw?tw.scrollTop:0;
 const m=G('main');if(VIEW==='entry'){entryView(m)}else if(VIEW==='print'){printView(m)}else samplePage(m);
 const t2=root.querySelector('.tablewrap');if(t2&&(sx||sy)){t2.scrollLeft=sx;t2.scrollTop=sy}
 if(keep){const nw=root.querySelector('#'+keep.id);if(nw&&nw!==keep){const hi=nw.oninput,hc=nw.onchange;keep.oninput=e=>{nw.value=keep.value;if(hi)hi.call(nw,e)};keep.onchange=e=>{nw.value=keep.value;if(hc)hc.call(nw,e)};nw.replaceWith(keep);try{keep.focus({preventScroll:true})}catch(e){}}}}
// ---------- columns: sub-brand, style, sample type first; sample-side columns locked; merchandiser columns editable ----------
const COLS=[
 ['sub','Sub-brand','',0,'0'],['style','Style No.','',0,'0'],['types','Sample type','',0,'0'],
 ['msV','Merchandising status','',0,'m'],['st','Present status','',0,'s'],['dst','Delivery status','',0,'s'],
 ['merch','Merchandiser','',0,'0'],['coll','Coll #','',0,'0'],['cols','Colours','num',1,'0'],['qty','Qty (pcs)','num',1,'0'],['rcvd','Order sheet receive','',0,'0'],['nextDue','Next delivery due','',0,'s'],
 ['sewn','Sewn / Qty','num',1,'s'],['delv','Delivered / Qty','num',1,'s'],
 ['labV','Lab dip','',0,'m'],['costV','Costing','',0,'m'],['yarnV','Yarn requisition','',0,'m'],['trimOV','Trims ordering','',0,'m'],['trimIV','Trims in-house','',0,'t'],['reason','Delay reason','',0,'s'],['next','Next action','',0,'0']];
const COLS_COST=[['sub','Sub-brand','',0,'0'],['style','Style No.','',0,'0'],['types','Sample type','',0,'0'],['merch','Merchandiser','',0,'0'],['coll','Coll #','',0,'0'],['qty','Qty (pcs)','num',1,'0'],['rcvd','Order sheet receive','',0,'0'],['costV','Costing','',0,'m'],['fob','FOB (USD)','',0,'0'],['next','Next action','',0,'0']];
const COLS_YARN=[['sub','Sub-brand','',0,'0'],['style','Style No.','',0,'0'],['types','Sample type','',0,'0'],['merch','Merchandiser','',0,'0'],['coll','Coll #','',0,'0'],['qty','Qty (pcs)','num',1,'0'],['rcvd','Order sheet receive','',0,'0'],['yarnV','Yarn requisition','',0,'m'],['yarnNo','Requisition no.','',0,'0'],['next','Next action','',0,'0']];
const OPTS={msV:[MS,MSTONE,'ms'],labV:[LAB,LABST,'lab'],costV:[COST,COSTST,'cost'],yarnV:[YARN,YARNST,'yarn'],trimOV:[TRIMO,TRIMOST,'trimO']};
const APP={labV:'labApp',costV:'costApp',yarnV:'yarnApp',trimOV:'trimApp',trimIV:'trimApp'};
const DONEST=s=>({'Approved':'done','Comments due':'wait','Revised':'wait','All sent':'done'}[s]||(TONE[s]||'info'));
const rankOf={late:0,wait:1,run:2,done:3,none:4};
const sortVal=(g,k)=>k==='st'?(STAGES.indexOf(g.st)<0?98:STAGES.indexOf(g.st)):k==='dst'?DSTAT.indexOf(g.dst):k==='msV'?MS.indexOf(g.msV):k==='types'?TYPE_ORDER.indexOf(g.main):k==='nextDue'?(g.nextDue||'~'):k==='rcvd'?(g.rcvd||'~'):k==='labV'||k==='costV'||k==='yarnV'||k==='trimOV'?(g[APP[k]]?rankOf[OPTS[k][1][g[k]]]:9):k==='trimIV'?rankOf[TRIMIST[g.trimIV]]:g[k];
function cellHTML(g,k){
 if(k==='costV'||k==='yarnV'){if(!g[APP[k]])return '<span class="st na">—</span>';const tone=OPTS[k][1][g[k]];const lab=canEdit(g)?(k==='costV'?(g.costV==='Not started'?'Fill costing':g.costV==='Draft'?'Draft · continue':'Done'+(g.fob?' $'+g.fob:'')):(g.yarnV==='Not started'?'Send requisition':'Sent to Purchase')):(k==='costV'?(g.costV==='Not started'?'Pending':g.costV==='Draft'?'Draft':'Done'+(g.fob?' $'+g.fob:'')):(g.yarnV==='Not started'?'Not sent':'Sent to Purchase'));return canEdit(g)?`<button class="st ${tone} lnk" data-open="${k==='costV'?'cost':'yarn'}" data-g="${esc(g.key)}">${lab}</button>`:pill(tone,lab)}
 if(k==='trimIV'){if(!g.trimApp)return '<span class="st na">—</span>';return pill(TRIMIST[g.trimIV],g.trimIV)}
 if(k==='msV'||k==='labV'||k==='trimOV'){const [list,tone,f]=OPTS[k];if(APP[k]&&!g[APP[k]])return '<span class="st na">—</span>';
  if(canEdit(g))return `<select class="inl ${tone[g[k]]}" data-g="${esc(g.key)}" data-f="${f}" aria-label="${esc(k)}">${list.map(x=>`<option ${x===g[k]?'selected':''}>${x}</option>`).join('')}</select>`;
  return pill(tone[g[k]],g[k])}
 if(k==='st')return chip(g.st,stTone(g.st));
 if(k==='dst')return chip(g.dst,DTONE[g.dst])+(g.dst==='Overdue'?` <span class="muted">${days(g.nextDue,TODAY)} d</span>`:'');
 if(k==='types')return g.types.map(t=>chip(t)).join(' ');
 if(k==='style')return `<b>${esc(g.style)}</b>`;
 if(k==='qty'||k==='cols')return n(g[k]);
 if(k==='sewn'||k==='delv')return `${n(g[k])}/${n(g.qty)}`;
 if(k==='rcvd')return fmt(g.rcvd);
 if(k==='nextDue')return g.nextDue?(g.nextDue<TODAY?`<span style="color:var(--bad)">${fmt(g.nextDue)}</span>`:fmt(g.nextDue)):'—';
 if(k==='reason')return g.reason?chip(g.reason,'warn'):'';
 return esc(g[k]==null?'':g[k])}
const plain=(g,k)=>k==='types'?g.types.join('+'):k==='sewn'||k==='delv'?g[k]+'/'+g.qty:k==='nextDue'?fmt(g.nextDue):k==='rcvd'?fmt(g.rcvd):((APP[k]&&!g[APP[k]])?'':g[k]);
// ---------- page ----------
function donutHTML(entries,total,center,key){let acc=0;const seg=entries.map(([l,v,c])=>{const a=acc/total*360;acc+=v;return `${c} ${a}deg ${acc/total*360}deg`}).join(',');return `<div class="donutwrap"><div class="donut" style="background:${total?`conic-gradient(${seg})`:'var(--chip)'}" role="img" aria-label="${esc(center[1])}"><div class="mid"><b>${center[0]}</b>${center[1]}</div></div><div class="dleg">${entries.map(([l,v,c])=>`<button data-${key}="${esc(l)}" class="${F[key]===l?'on':''}"><i style="background:${c}"></i>${esc(l)} <b>${n(v)}</b></button>`).join('')}</div></div>`}
const usedQ=q=>new Set(RAW.filter(r=>r.approval!=='Returned'&&q.codes.includes(r.buyer)&&r.rcvd&&r.rcvd.slice(0,7)===QMONTH&&(r.types||[]).some(t=>OD.includes(t))).map(r=>r.style)).size;
function quotaRows(){const scopeSubs=new Set(GROUPS.map(g=>g.sub));
 return QUOTA.filter(q=>me.kind==='h'||me.kind==='p'||q.codes.some(c=>scopeSubs.has(c))).map(q=>({...q,used:usedQ(q)})).sort((a,b)=>(b.used/b.od)-(a.used/a.od))}
function matrixHTML(){return ''}
function samplePage(m){
 const VC=VIEW==='costing'?COLS_COST:VIEW==='yarn'?COLS_YARN:COLS;
 const inT=GROUPS.filter(g=>typeOk(g)&&mineOk(g));const scoped=GROUPS.filter(g=>match(g,'quick')),rows=GROUPS.filter(g=>match(g));
 const baseG=GROUPS.filter(g=>mineOk(g)&&(!F.buyer||g.buyerName===F.buyer));
 const buyerCnt={};GROUPS.filter(mineOk).forEach(g=>{buyerCnt[g.buyerName]=(buyerCnt[g.buyerName]||0)+1});const buyerList=Object.keys(buyerCnt).sort((a,b)=>buyerCnt[b]-buyerCnt[a]);
 const buyerSms=F.buyer?hasSmsBuyer(F.buyer):buyerList.some(hasSmsBuyer);
 const tc=t=>baseG.filter(g=>g.types.includes(t)).length;const types=TYPE_ORDER.filter(t=>tc(t)>0||(CORE_TYPES.includes(t)&&(t!=='SMS'||buyerSms)));
 const cn=k=>scoped.filter(QUICK[k].f).length;
 const kp0=[['',n(scoped.length),`Sample rows · ${n(scoped.reduce((a,g)=>a+g.qty,0))} pcs`,''],['tna',n(cn('tna')),'TNA pending','warn'],['late',n(cn('late')),'Delivery date passed','bad'],['fab',n(cn('fab')),'Fabric due','bad'],['cmt',n(cn('cmt')),'Buyer comments due','warn'],['lab',n(cn('lab')),'Lab dip pending','warn'],['cost',n(cn('cost')),'Costing required','warn'],['yarn',n(cn('yarn')),'Yarn requisition required','warn']];
 const kp=VIEW==='costing'?[['',n(scoped.length),'Rows needing costing',''],['costNS',n(cn('costNS')),'Costing required','warn'],['costDraft',n(cn('costDraft')),'Draft','info'],['costDone',n(cn('costDone')),'Costing done','good']]:VIEW==='yarn'?[['',n(scoped.length),'Rows needing yarn',''],['yarnNS',n(cn('yarnNS')),'Yarn requisition required','warn'],['yarnDone',n(cn('yarnDone')),'Sent to Purchase','good']]:kp0;
 const mz=GROUPS.filter(g=>match(g,'ms'));const mE=MS.map((b,i)=>[b,mz.filter(g=>g.msV===b).length,MSC[i]]).filter(e=>e[1]);
 // style journey (style level, from all rounds in scope)
 const styleG=[...STYLEMAP.values()].filter(a=>a.some(mineOk)&&(!F.buyer||a[0].buyerName===F.buyer));const tot=styleG.length||1;const has=(a,c)=>a.some(g=>g.cat===c);
 const wOD=styleG.filter(a=>has(a,'od')).length,wS=styleG.filter(a=>has(a,'sms')).length,wPP=styleG.filter(a=>has(a,'pp')).length,wP=styleG.filter(a=>a[0].po).length,sP=styleG.filter(a=>has(a,'sms')&&a[0].po).length;
 const fun=[['Styles',styleG.length],['Offer / Dev & others',wOD]].concat(buyerSms?[['SMS',wS]]:[],[['PP sample',wPP],['Bulk order received',wP]]);
 const sb={};GROUPS.filter(g=>match(g,'quick')).forEach(g=>{const o=sb[g.sub]||(sb[g.sub]={s:0,o:0,l:0,a:0});o.s++;if(g.open.length)o.o++;if(g.fl.late)o.l++;if(g.msV==='Approved')o.a++});const sbR=Object.entries(sb).sort((a,b)=>b[1].s-a[1].s);
 const qr=quotaRows();
 rows.sort((a,b)=>{const x=sortVal(a,sort.k),y=sortVal(b,sort.k);const c=(typeof x==='number'&&typeof y==='number')?x-y:String(x==null?'':x).localeCompare(String(y==null?'':y),undefined,{numeric:true});return (c||String(a.style).localeCompare(String(b.style),undefined,{numeric:true})||String(a.rcvd).localeCompare(String(b.rcvd)))*sort.dir});
 const pages=Math.max(1,Math.ceil(rows.length/PER));if(pageN>=pages)pageN=pages-1;const slice=rows.slice(pageN*PER,pageN*PER+PER);
 const active=Object.entries(F).filter(([k,v])=>v&&k!=='q').map(([k,v])=>`<button class="achip" data-clr="${k}">${k==='quick'?QUICK[v].l:k==='month'?monthLabel(v):esc(v)} ✕</button>`).join('');
 const roleTxt=me.kind==='p'?'Sees every team. Gives the TNA and approves new order sheets. Present status and delivery are updated in the Sample Room.':me.kind==='h'?'Sees every team. View only.':me.kind==='t'?`Sees the whole ${esc(me.team)} team, can update all of its merchandising fields`:`${esc(me.team)} team · you can update your own styles`;
 const cur=selKey&&GROUPS.find(g=>g.key===selKey);
 m.innerHTML=`<div class="rolebar"><button class="btn sm primary" id="rbTna">TNA pending (${pendingGroups().length})</button>${myPP().length?'<button class="btn sm primary" id="rbPP">PP sample requests ('+myPP().length+')</button>':''}${canNew()?'<button class="btn sm primary" id="rbYarn">＋ Projection yarn requisition</button>':''}${me.kind==='m'?`<button class="btn sm" id="mineBtn">${mine?'Showing only my styles · show my team':'Showing my team · show only mine'}</button>`:''}</div>
 ${matrixHTML()}
 <div class="typebar" role="group" aria-label="Buyer"><button class="tbtn ${!F.buyer?'on':''}" data-b=""><b>All buyers</b><span>${n(GROUPS.filter(mineOk).length)}</span></button>${buyerList.map(b=>`<button class="tbtn ${F.buyer===b?'on':''}" data-b="${esc(b)}"><b>${esc(b)}</b><span>${buyerCnt[b]}${hasSmsBuyer(b)?' · SMS':''}</span></button>`).join('')}</div>
 ${F.buyer?`<div class="muted" style="font-size:12.5px;margin:-4px 0 8px">${hasSmsBuyer(F.buyer)?esc(F.buyer)+': Offer / Development → SMS → bulk PO → PP. Costing and yarn requisition are done at the SMS stage.':esc(F.buyer)+': no SMS stage. Costing and yarn requisition are needed before the sample is made.'}</div>`:''}
 <div class="typebar" role="group" aria-label="Sample type"><button class="tbtn ${TYPE==='all'?'on':''}" data-t="all"><b>All samples</b><span>${n(baseG.length)}</span></button>${types.map(t=>`<button class="tbtn ${TYPE===t?'on':''}" data-t="${esc(t)}"><b>${esc(t)}</b><span>${n(tc(t))}</span></button>`).join('')}</div>
 <div class="fbar"><input type="search" id="fq" placeholder="Search style, sub-brand, merchandiser" value="${esc(F.q)}" aria-label="Search">
 ${sel('fsub','All sub-brands',uniq(inT.filter(g=>!F.buyer||g.buyerName===F.buyer),g=>g.sub),F.sub)}${sel('fmerch','All merchandisers',uniq(GROUPS.filter(typeOk),g=>g.merch),F.merch)}
 ${sel('fcoll','All collections',uniq(inT,g=>String(g.coll||'')),F.coll,c=>'Coll # '+c)}${sel('fmonth','All delivery months',uniq(inT,g=>g.nextDue.slice(0,7)),F.month,monthLabel)}${sel('fms','All merchandising status',MS,F.ms)}${sel('fstage','All present status',STAGES.concat(['All sent','TNA pending','Returned']),F.stage)}${sel('fdst','All delivery status',DSTAT,F.dst)}
 <button class="btn sm" id="fclear">Clear filters</button></div>
 ${active?`<div class="achips">${active}</div>`:''}
 <div class="layout"><div style="min-width:0">
 <div class="kpis">${kp.map(([k,v,l,t])=>`<button class="kpi ${t} ${k&&F.quick===k?'on':''}" data-q="${k}"><div class="n">${v}</div><div class="l">${l}</div></button>`).join('')}</div>
 ${VIEW==='followup'?`<div class="minis">
  <div class="panel mini"><div class="ptitle">Merchandising status</div>${donutHTML(mE,mz.length,[n(mz.length),'sample rows'],'ms')}</div>
  <div class="panel mini funnel"><div class="ptitle">Style journey</div>${fun.map(([l,v])=>`<div class="fb"><span>${l}</span><div class="tr"><div style="width:${v/tot*100}%"></div></div><span class="num">${n(v)}</span></div>`).join('')}${buyerSms?`<div class="muted" style="font-size:12px;margin-top:6px">SMS → order: ${wS?Math.round(sP/wS*100):0}% (${sP} of ${wS} SMS styles)</div>`:''}</div>
  <div class="panel mini"><div class="ptitle">Sub-brand-wise</div><div class="scrollbox"><table class="btab"><thead><tr><th>Sub-brand</th><th class="num">Rows</th><th class="num">Open</th><th class="num">Late</th><th class="num">Approved</th></tr></thead><tbody>${sbR.map(([b,o])=>`<tr data-fsub="${esc(b)}" class="${F.sub===b?'sel':''}"><td>${esc(b)}</td><td class="num">${o.s}</td><td class="num">${o.o}</td><td class="num" style="color:var(--bad)">${o.l||''}</td><td class="num">${o.a}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel mini"><div class="ptitle">Offer / Dev quota, ${monthLabel(QMONTH)}</div><div class="scrollbox">${qr.map(q=>{const p=q.od?q.used/q.od:1;const col=p>1?'var(--bad)':p>=.8?'var(--warn)':'var(--good)';const lab=q.used>q.od?chip('Over by '+(q.used-q.od),'bad'):q.used===q.od?chip('Full','warn'):chip((q.od-q.used)+' left','good');return `<div class="qrow"><span class="nm">${esc(q.line)} <span class="muted">${q.used}/${q.od}</span></span><div class="tr"><div style="width:${Math.min(100,p*100)}%;background:${col}"></div></div><span>${lab}</span></div>`}).join('')||'<div class="empty">No quota line</div>'}</div></div>
 </div>`:''}
 <div class="panel"><div class="tablewrap"><table class="${VIEW==='followup'?'':'noband'}"><thead>
  ${VIEW==='followup'?`<tr class="grpband"><th class="g0" colspan="3">Sample</th><th class="gm" colspan="1">Merchandiser</th><th class="gs" colspan="2">Sample Planning</th><th class="g0" colspan="6"></th><th class="gs" colspan="2">Sample Planning</th><th class="gm" colspan="4">Merchandiser</th><th class="gs">Store</th><th class="gs"></th><th class="g0"></th></tr>`:''}
  <tr class="hdr">${VC.map(([k,l,cl,nm,own])=>`<th class="${cl}" data-sort="${k}">${l}${sort.k===k?`<span class="ar">${sort.dir>0?'▲':'▼'}</span>`:''}</th>`).join('')}</tr></thead>
 <tbody>${slice.map(g=>`<tr data-k="${esc(g.key)}" class="${g.key===selKey?'sel':''} ${g.fl.late?'late':''}">${VC.map(([k,,cl])=>`<td class="${cl} ${k==='next'?'nx':''}">${cellHTML(g,k)}</td>`).join('')}</tr>`).join('')}</tbody>
 ${rows.length&&VIEW==='followup'?`<tfoot><tr><td colspan="8"><b>${n(rows.length)} sample rows</b></td><td class="num"><b>${n(rows.reduce((a,g)=>a+g.cols,0))}</b></td><td class="num"><b>${n(rows.reduce((a,g)=>a+g.qty,0))}</b></td><td colspan="11"></td></tr></tfoot>`:''}</table>
 ${rows.length?'':'<div class="empty">No sample row matches. Clear a filter or pick another sample type.</div>'}</div>
 <div class="pager"><span>${rows.length?pageN*PER+1:0}–${Math.min(rows.length,(pageN+1)*PER)} of ${n(rows.length)}</span><span><button class="btn sm" id="pprev" ${pageN?'':'disabled'}>Previous</button> Page ${pageN+1} of ${pages} <button class="btn sm" id="pnext" ${pageN<pages-1?'':'disabled'}>Next</button> <button class="btn sm" id="fexport">Copy for Excel</button></span></div></div>
 </div><aside class="panel side entry ${railOpen||!mobile()?'open':''}" id="side"></aside></div>`;
 m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{TYPE=b.dataset.t;pageN=0;render()});
 m.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{F.buyer=b.dataset.b;F.sub='';if(TYPE==='SMS'&&F.buyer&&!hasSmsBuyer(F.buyer))TYPE='all';pageN=0;render()});
 const mb=G('mineBtn');if(mb)mb.onclick=()=>{mine=!mine;pageN=0;render()};
 const rt=G('rbTna');if(rt)rt.onclick=()=>openRail('tna');const rn=G('rbNew');if(rn)rn.onclick=()=>openRail('new');const rpp=G('rbPP');if(rpp)rpp.onclick=()=>setView('entry');const ry=G('rbYarn');if(ry)ry.onclick=()=>openRail('yarn');
 const map={fsub:'sub',fmerch:'merch',fcoll:'coll',fmonth:'month',fms:'ms',fstage:'stage',fdst:'dst'};
 Object.entries(map).forEach(([id,k])=>G(id).onchange=e=>{F[k]=e.target.value;if(k==='buyer')F.sub='';pageN=0;render()});
 const q=G('fq');q.oninput=()=>{F.q=q.value;clearTimeout(samplePage.t);samplePage.t=setTimeout(()=>{pageN=0;render();const e=G('fq');e.focus();e.setSelectionRange(e.value.length,e.value.length)},280)};
 G('fclear').onclick=()=>{Object.keys(F).forEach(k=>F[k]='');pageN=0;render()};
 m.querySelectorAll('[data-clr]').forEach(b=>b.onclick=()=>{F[b.dataset.clr]='';render()});
 m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const k=b.dataset.q;F.quick=!k||F.quick===k?'':k;pageN=0;render()});
 const tog=(k,v)=>{F[k]=F[k]===v?'':v;pageN=0;render()};
 m.querySelectorAll('[data-ms]').forEach(e=>e.onclick=()=>tog('ms',e.dataset.ms));m.querySelectorAll('[data-fsub]').forEach(e=>e.onclick=()=>tog('sub',e.dataset.fsub));
 m.querySelectorAll('[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;sort=sort.k===k?{k,dir:-sort.dir}:{k,dir:1};render()});
 m.querySelectorAll('tr[data-k]').forEach(tr=>tr.onclick=e=>{if(e.target.closest('select'))return;selKey=tr.dataset.k;railMode='detail';railOpen=true;render()});
 m.querySelectorAll('[data-open]').forEach(b=>{b.onclick=e=>{e.stopPropagation();openRail(b.dataset.open,b.dataset.g)}});
 m.querySelectorAll('select.inl').forEach(s=>{s.onclick=e=>e.stopPropagation();s.onchange=e=>{const g=GROUPS.find(x=>x.key===s.dataset.g);setField(g,s.dataset.f,s.value)}});
 G('pprev').onclick=()=>{pageN--;render()};G('pnext').onclick=()=>{pageN++;render()};
 G('fexport').onclick=()=>{const t=[VC.map(c=>c[1]).join('\t')].concat(rows.map(g=>VC.map(([k])=>plain(g,k)).join('\t'))).join('\n');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(n(rows.length)+' rows copied. Paste into Excel.'),()=>toast('This browser does not allow copying'))};
 renderRail();
}
// ---------- edits with history ----------
const FN={ms:'Merchandising status',lab:'Lab dip',cost:'Costing',yarn:'Yarn requisition',trimO:'Trims ordering',fob:'FOB',note:'Note',coll:'Coll #',finish:'Print/Solid/Emb',req:'Required date'};
function logChange(g,text){const o=own(g.key);(o.hist=o.hist||[]).push([TODAY,me.name,text])}
function setField(g,f,v,quiet){if(!canEdit(g)){toast('Locked: you cannot change this');return}const old={ms:g.msV,lab:g.labV,cost:g.costV,yarn:g.yarnV,trimO:g.trimOV,fob:g.fob,note:g.note,coll:g.coll,finish:g.finish,req:g.req}[f];if(String(old==null?'':old)===String(v))return;const o=own(g.key);o[f]=v;logChange(g,`${FN[f]}: ${old===''||old==null?'(blank)':old} → ${v===''?'(blank)':v}`);saveOwn();buildGroups();if(!quiet){toast(`${g.style} ${g.main}: ${FN[f]} updated`);render()}}
// ---------- detail ----------
const overlay=G('overlay');
function openRail(mode,key,pre){if(mode==='new'){PREFILL=pre||null;VIEW='entry';railMode='tna';selKey=null;railOpen=false;render();window.scrollTo(0,0);return}
 railMode=mode;selKey=key||null;PREFILL=pre||null;railOpen=true;render()}
function closeRail(){selKey=null;railMode='tna';PREFILL=null;railOpen=false;render()}
overlay.onclick=closeRail;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(selKey||railOpen))closeRail()});
const pendingGroups=()=>GROUPS.filter(g=>g.apr==='Pending').sort((a,b)=>String(a.rcvd).localeCompare(String(b.rcvd)));
const returnedGroups=()=>GROUPS.filter(g=>g.apr==='Returned');
function renderRail(){
 const el=G('side');if(!el)return;const mob=mobile();overlay.classList.toggle('open',mob&&railOpen);
 const cur=selKey&&GROUPS.find(g=>g.key===selKey);let mode=railMode;if((mode==='detail'||mode==='tnaform'||mode==='cost')&&!cur)mode='tna';
 const pc=pendingGroups().length;
 el.innerHTML=`<div class="rtabs"><button class="rtab ${mode==='tna'?'on':''}" data-rm="tna">TNA pending<span class="rcnt">${pc}</span></button>${canNew()?`<button class="rtab ${mode==='yarn'?'on':''}" data-rm="yarn">Yarn requisition</button>`:''}${cur&&mode==='cost'?'<button class="rtab on">Cost sheet</button>':''}${cur&&mode==='detail'?'<button class="rtab on">Style detail</button>':''}${cur&&mode==='tnaform'?'<button class="rtab on">Give TNA</button>':''}${mob?'<button class="rtab" data-rm="close" style="margin-left:auto">Close</button>':''}</div><div class="rpane" id="rpane"></div>`;
 el.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const m=b.dataset.rm;if(m==='close'){closeRail();return}selKey=null;PREFILL=null;railMode=m;render()});
 const p=G('rpane');
 if(mode==='tna')tnaList(p);else if(mode==='new')newForm(p);else if(mode==='tnaform')tnaForm(p,cur);else if(mode==='cost')costForm(p,cur);else if(mode==='yarn')yarnForm(p,cur||null);else detail(p,cur);
}
function tnaList(el){const pg=pendingGroups(),rg=returnedGroups();const planner=me.kind==='p';
 el.innerHTML=`<div class="body"><div class="phint" style="margin-bottom:8px">${planner?'Order sheets sent by merchandisers. Click one to give the TNA and approve it.':'Order sheets waiting for Sample Planning to give the TNA. After approval they join the follow-up list.'}</div>
 ${pg.map(g=>`<div class="tnaitem" data-tna="${esc(g.key)}"><div><b>${esc(g.style)}</b> ${g.types.map(t=>chip(t)).join(' ')}</div><div class="muted" style="font-size:12.5px">${esc(g.sub)} · ${esc(g.merch)} · ${g.cols} colour${g.cols>1?'s':''} · ${n(g.qty)} pcs</div><div style="font-size:12.5px;margin-top:2px">Waiting ${days(g.rcvd,TODAY)} day${days(g.rcvd,TODAY)===1?'':'s'}${g.rows[0].reqDate?' · buyer date '+fmt(g.rows[0].reqDate):''}</div></div>`).join('')||'<div class="empty">No order sheet is waiting for a TNA.</div>'}
 ${rg.length?`<div class="secttl">Returned by Sample Planning</div>${rg.map(g=>`<div class="tnaitem" data-ret="${esc(g.key)}"><div><b>${esc(g.style)}</b> ${g.types.map(t=>chip(t)).join(' ')} ${chip(g.rows[0].returnReason||'Returned','bad')}</div><div class="muted" style="font-size:12.5px">${esc(g.sub)} · ${esc(g.merch)}</div></div>`).join('')}`:''}</div>`;
 el.querySelectorAll('[data-tna]').forEach(x=>x.onclick=()=>openRail('tnaform',x.dataset.tna));el.querySelectorAll('[data-ret]').forEach(x=>x.onclick=()=>openRail('detail',x.dataset.ret))}
const TA=['Knitting','Dyeing','AOP','Cutting','Print','Sewing'];
function tnaForm(el,g){const r=g.rows[0],os=r.os||{};const planner=me.kind==='p';const needs=(os.fabric||[]).length>0||['SMS','PP','APP'].includes(g.main);
 const def=TA.map((k,i)=>{const skip=!needs&&(k==='Knitting'||k==='Dyeing');const st=addDays(TODAY,i*2+1);return skip?{s:'',e:''}:{s:st,e:addDays(st,1)}});
 const ql=QUOTA.find(q=>q.codes.includes(g.sub));const odT=OD.some(t=>g.types.includes(t));const used=ql?usedQ(ql):0;
 el.innerHTML=`<header><div><div class="muted" style="font-size:12.5px">${esc(g.buyerName)} · ${esc(g.sub)} · ${esc(g.merch)} · sent ${fmt(g.rcvd)}</div><h3>${esc(g.style)}${os.styleName?' · '+esc(os.styleName):''}</h3><div style="margin-top:4px">${g.types.map(t=>chip(t)).join(' ')} ${chip('TNA pending','warn')} ${odT&&ql?(used>ql.od?chip('Quota over '+used+'/'+ql.od,'bad'):chip('Quota '+used+'/'+ql.od,'good')):''}</div></div><button class="btn sm" id="tBack">Back to list</button></header>
 <div class="body">${planner?'':`<div class="lockbox">Only Sample Planning gives the TNA.</div>`}
 <div class="secttl" style="margin-top:0">From the merchandiser (read only)</div>
 <div class="kv"><div><span>Coll #</span>${esc(g.coll)||'—'}</div><div><span>Buyer sample order no</span>${esc(os.bso)||'—'}</div><div><span>Garment / size</span>${esc(os.garment)||'—'} ${esc(os.size)||''}</div><div><span>Print / Solid / Emb</span>${esc(g.finish)}</div><div><span>Required (buyer)</span>${fmt(r.reqDate)}</div><div><span>Instructions</span>${esc(os.instructions)||'—'}</div></div>
 <table class="btab"><thead><tr><th>Colour</th><th class="num">Qty</th></tr></thead><tbody>${g.rows.map(x=>`<tr><td>${esc(x.color)}</td><td class="num">${x.qty}</td></tr>`).join('')}</tbody></table>
 ${(os.fabric||[]).length?`<table class="btab" style="margin-top:6px"><thead><tr><th>Part</th><th>GSM & fabric</th><th>Composition</th><th class="num">Kg</th></tr></thead><tbody>${os.fabric.map(f=>`<tr><td>${esc(f[0])}</td><td>${esc(f[1])}</td><td>${esc(f[2])}</td><td class="num">${esc(f[3])}</td></tr>`).join('')}</tbody></table>`:''}
 <div class="secttl">Sample T&A (Sample Planning)</div>
 <div style="overflow-x:auto"><table class="colorrows"><thead><tr><th></th>${TA.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>
 <tr><td>Start</td>${TA.map((k,i)=>`<td><input type="date" id="pt-s-${i}" value="${def[i].s}" ${planner?'':'disabled'}></td>`).join('')}</tr><tr><td>End</td>${TA.map((k,i)=>`<td><input type="date" id="pt-e-${i}" value="${def[i].e}" ${planner?'':'disabled'}></td>`).join('')}</tr></tbody></table></div>
 <div class="form" style="margin-top:8px"><label>Planned delivery date<input type="date" id="pDue" ${planner?'':'disabled'}></label><label>Sewing place<select id="pLoc" ${planner?'':'disabled'}>${['Sample room','Line','Line B','NCL'].map(x=>`<option>${x}</option>`).join('')}</select></label><div class="full" id="pGap"></div></div>
 ${planner?`<div class="secttl">Return instead</div><div class="form"><label>Reason<select id="pRsn"><option>Quota full</option><option>Information missing</option><option>Sample capacity full</option><option>Fabric not possible in time</option><option>Other</option></select></label><label>Note<input type="text" id="pNote" placeholder="What the merchandiser should fix"></label></div>`:''}</div>
 ${planner?'<div class="foot"><button class="btn primary" id="pApprove">Approve with this TNA</button><button class="btn" id="pReturn">Return to merchandiser</button></div>':''}`;
 const $=id=>G(id);$('tBack').onclick=()=>{selKey=null;railMode='tna';render()};
 const sync=()=>{const se=$('pt-e-5').value;if(planner&&se&&!$('pDue').dataset.touched)$('pDue').value=addDays(se,1);const d=$('pDue').value;const gp=d&&r.reqDate?days(r.reqDate,d):null;$('pGap').innerHTML=gp==null?'':gp>0?chip(gp+' days later than the buyer date','bad'):chip('Meets the buyer date','good')};
 if(planner){$('pt-e-5').onchange=sync;$('pDue').oninput=()=>{$('pDue').dataset.touched='1';sync()};sync();
  $('pApprove').onclick=()=>{const ta={};TA.forEach((k,i)=>ta[k]={s:$('pt-s-'+i).value,e:$('pt-e-'+i).value});if(!ta.Sewing.s||!ta.Sewing.e){toast('Give the sewing start and end dates');return}if(!$('pDue').value){toast('Give the planned delivery date');return}
   g.rows.forEach(x=>{x.approval='Approved';x.os=Object.assign({},x.os,{ta});x.sewStart=ta.Sewing.s;x.sewClose=ta.Sewing.e;x.plannedDue=$('pDue').value;x.due=$('pDue').value;x.loc=$('pLoc').value;x.history.push([TODAY,'TNA given and approved by Sample Planning'])});
   saveNew();buildGroups();toast(g.style+' approved. It is now in the follow-up list.');selKey=null;railMode='tna';render()};
  $('pReturn').onclick=()=>{const why=$('pRsn').value,note=$('pNote').value.trim();g.rows.forEach(x=>{x.approval='Returned';x.returnReason=why;x.returnNote=note;x.history.push([TODAY,'Returned by Sample Planning: '+why+(note?' ('+note+')':'')])});saveNew();buildGroups();toast(g.style+' returned to '+g.merch);selKey=null;railMode='tna';render()}}
 else sync();
}
const FIN=['Print','Solid','Emb.','Print+Emb.'];
function newForm(el){
 const pre=PREFILL||{};const isTL=me.kind==='t';
 const buyers=isTL?[me.team]:uniq(RAW,r=>r.buyerName);const bDef=pre.buyerName||me.team||buyers[0];
 const mlist=isTL?MERCH.filter(u=>u.team===me.team).map(u=>u.name):[me.name];
 const nextT=pre.type?pre.type:pre.sib?(pre.sib.some(x=>x.cat==='sms'||x.cat==='pp')?'PP':pre.sib.some(x=>x.cat==='od')?'SMS':'Development'):'Development';
 el.innerHTML=`<header><div><div class="muted" style="font-size:12.5px">Sample Fabric & Sample Garment Order Sheet</div><h3>New style entry</h3>${pre.style?`<div class="muted" style="font-size:12.5px">Next sample for style ${esc(pre.style)}</div>`:''}</div></header>
 <div class="body"><div class="form">
  <label>Sample type<select id="nG"></select></label>
  <label>Order sheet date<input type="date" id="nRcvd" value="${TODAY}"></label>
  <div class="full"><div class="muted" style="font-size:12.5px;margin-bottom:4px">Same garment also used for (counted as its own type)</div><div class="ms" id="nAlso"></div></div>
  <label>Buyer<select id="nBuyer">${buyers.map(b=>`<option ${b===bDef?'selected':''}>${esc(b)}</option>`).join('')}</select></label>
  <label>Sub-brand<select id="nSub"></select></label>
  <label>Merchandiser<select id="nMerch" ${mlist.length===1?'disabled':''}>${mlist.map(x=>`<option ${x===(pre.merch||me.name)?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
  <label>Style No.<input type="text" id="nStyle" value="${esc(pre.style||'')}" placeholder="e.g. 15400558"></label>
  <label>Style name<input type="text" id="nName" value="${esc(pre.name||'')}" placeholder="e.g. ONLMAY LS TOP"></label>
  <label>Coll #<input type="text" id="nColl" value="${esc(pre.coll||'')}"></label>
  <label>Buyer sample order no<input type="text" id="nBso"></label>
  <label>Garment description<input type="text" id="nGar" placeholder="e.g. Girls L/S dress"></label>
  <label>Size<input type="text" id="nSize" placeholder="e.g. 146/152"></label>
  <label>Print / Solid / Emb<select id="nFin">${FIN.map(x=>`<option>${x}</option>`).join('')}</select></label>
  <label>Required delivery date (buyer)<input type="date" id="nReq" value="${addDays(TODAY,14)}"></label>
  <div class="full"><div class="qnote" id="qNote"></div><label id="qOkBox" style="display:none;flex-direction:row;align-items:center;gap:6px;color:var(--bad)"><input type="checkbox" id="qOk"> Quota is full. Submit anyway for Sample Planning to decide</label></div>
  <div class="full"><div class="secttl">Colours and quantity <span class="muted" style="font-weight:400">(each colour becomes one row)</span></div><table class="colorrows" id="cRows"><thead><tr><th>Color / Pantone</th><th style="width:84px">Qty pcs</th><th style="width:34px"></th></tr></thead><tbody></tbody></table><button class="btn sm" id="addC" style="margin-top:6px">Add colour</button></div>
  <div class="full" id="fabBox"></div>
  <label class="full">Specific instructions<input type="text" id="nInst" value="Fabric quality should be as per buyer quality requirement."></label>
  
 </div></div>
 <div class="foot"><button class="btn primary" id="nSave">Submit to Sample Planning</button><button class="btn" id="nClear">Clear</button></div>`;
 const $=id=>G(id);
 const needsFab=()=>['SMS','PP','APP'].includes($('nG').value);
 const fillAlso=()=>{const t=$('nG').value;$('nAlso').innerHTML=['Photo','BPS','Test','AR','AD','Color ref.','Size set','Shipment','Fit'].filter(x=>x!==t&&t!=='SMS').map(x=>`<label><input type="checkbox" value="${x}">${x}</label>`).join('')||'<span class="muted" style="font-size:12.5px">Not used for salesman samples</span>'};
 const addF=(p,d,c,k)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><input value="${esc(p||'')}"></td><td><input value="${esc(d||'')}"></td><td><input value="${esc(c||'')}"></td><td><input type="number" step="0.1" value="${k||''}"></td>`;$('fRows').tBodies[0].appendChild(tr)};
 const fillFab=()=>{if(needsFab()){$('fabBox').innerHTML=`<div class="secttl">Fabric to knit and dye</div><table class="colorrows" id="fRows"><thead><tr><th>Part</th><th>GSM & fabric</th><th>Composition</th><th style="width:70px">Kgs</th></tr></thead><tbody></tbody></table><button class="btn sm" id="addF" style="margin-top:6px">Add fabric part</button>`;addF('Body + Sleeve','Single Jersey 180 GSM','100% Cotton',15);addF('Neck','1x1 Rib 300 GSM F/F','95% Cotton, 5% Elastane',4);$('addF').onclick=()=>addF()}else $('fabBox').innerHTML=`<div class="secttl">Fabric</div><div class="fabnote">${esc($('nG').value)} samples are made from available fabric. No knitting or dyeing order is created.</div>`};
 const mySub=(()=>{const c={};RAW.forEach(r=>{if(r.merch===(pre.merch||me.name)&&r.buyerName===$('nBuyer').value)c[r.buyer]=(c[r.buyer]||0)+1});return pre.sub||topKey(c)})();
 const fillSub=()=>{const subs=uniq(RAW.filter(r=>r.buyerName===$('nBuyer').value),r=>r.buyer);$('nSub').innerHTML=subs.map(b=>`<option ${b===mySub?'selected':''}>${esc(b)}</option>`).join('');qNote()};
 const qNote=()=>{const t=$('nG').value,sub=$('nSub').value;const ql=QUOTA.find(q=>q.codes.includes(sub));const box=$('qNote');$('qOkBox').style.display='none';
  if(!OD.includes(t)){box.innerHTML='<span class="muted">Quota is checked for Offer, Development and Proto only.</span>';return false}
  if(!ql){box.innerHTML=chip('No quota line for this sub-brand','warn');return false}
  const style=$('nStyle').value.trim();const existing=style&&RAW.some(r=>r.approval!=='Returned'&&ql.codes.includes(r.buyer)&&r.style===norm(style)&&r.rcvd&&r.rcvd.slice(0,7)===QMONTH&&(r.types||[]).some(x=>OD.includes(x)));
  const used=usedQ(ql);const full=!existing&&used>=ql.od;
  box.innerHTML=`${esc(ql.line)} · ${monthLabel(QMONTH)}: <b>${used}</b> of <b>${ql.od}</b> styles used · ${full?chip('Full','bad'):chip((ql.od-used)+' left','good')}${existing?' · this style already counted':''}`;
  if(full)$('qOkBox').style.display='flex';return full};
 const addC=(c,q)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><input placeholder="e.g. Jet Black 19-0303 TCX" value="${esc(c||'')}"></td><td><input type="number" min="1" value="${q||2}"></td><td><button class="btn sm" aria-label="Remove colour">✕</button></td>`;tr.querySelector('button').onclick=()=>tr.remove();$('cRows').tBodies[0].appendChild(tr)};
 const fillTypes=()=>{const b=$('nBuyer').value;const keep=$('nG').value;const list=TYPE_ORDER.filter(t=>t!=='SMS'||hasSmsBuyer(b));const want=keep&&list.includes(keep)?keep:(list.includes(nextT)?nextT:list[0]);$('nG').innerHTML=list.map(t=>`<option ${t===want?'selected':''}>${t}</option>`).join('')};
 $('nG').onchange=()=>{fillAlso();fillFab();qNote()};$('nBuyer').onchange=()=>{fillTypes();fillAlso();fillFab();fillSub()};$('nSub').onchange=qNote;$('nStyle').oninput=qNote;
 fillTypes();fillAlso();fillFab();fillSub();addC();$('addC').onclick=()=>addC();$('nClear').onclick=()=>{PREFILL=null;render()};
 $('nSave').onclick=()=>{const v=id=>$(id).value.trim();
  if(!v('nStyle')){toast('Enter the style no');$('nStyle').focus();return}
  const colors=[...$('cRows').tBodies[0].rows].map(tr=>{const i=tr.querySelectorAll('input');return {c:i[0].value.trim(),q:+i[1].value||0}}).filter(x=>x.c&&x.q>0);
  if(!colors.length){toast('Add at least one colour with a quantity');return}
  const full=qNote();if(full&&!$('qOk').checked){toast('Quota is full. Tick “Submit anyway” to send it to planning');return}
  const t=v('nG');const types=[t].concat([...root.querySelectorAll('#nAlso input:checked')].map(i=>i.value));
  const fab=$('fRows')?[...$('fRows').tBodies[0].rows].map(tr=>[...tr.querySelectorAll('input')].map(i=>i.value)):[];
  const bn=v('nBuyer');const smp=RAW.find(r=>r.buyerName===bn)||{};const base=Date.now();const merch=v('nMerch');const style=norm(v('nStyle'));const rcvd=v('nRcvd')||TODAY;
  const rows=colors.map((x,i)=>prepRow({id:'N'+base+'-'+i,isNew:true,sheetId:'S'+base,group:smp.group||bn,brand:smp.brand||bn,buyer:v('nSub'),merch,style,types,color:x.c,qty:x.q,rcvd,coll:v('nColl'),sewDone:0,dyeClose:null,sewStart:null,sewClose:null,sewActual:null,delQty:0,delActual:null,reqDate:v('nReq')||null,approval:'Pending',statusRaw:'',stage:needsFab()?'Fabric due':'Ready for sewing',loc:'Sample room',finish:v('nFin'),reason:'',note:'',history:[[rcvd,'Order sheet submitted by '+me.name+' to Sample Planning']],os:{bso:v('nBso'),styleName:v('nName'),garment:v('nGar'),size:v('nSize'),instructions:v('nInst'),ta:null,fabric:fab}}));
  rows.forEach(r=>RAW.push(r));saveNew();if(pre.ppTask){const xa=xget();const xt=xa.find(y=>y.id===pre.ppTask);if(xt){xt.done=true;xset(xa)}}const tk=[];{const o=own(rowKey(rows[0]));o.ms='Order sheet sent';if(hasSmsBuyer(bn)?t==='SMS':true){o.cost='Not started';o.yarn='Not started';tk.push('Costing','Yarn requisition')}if(!['PP','APP'].includes(t)){o.lab='Not started';tk.push('Lab dip')}o.trimO='Not started';tk.push('Trims ordering');saveOwn()}
  buildGroups();Object.keys(F).forEach(k=>F[k]='');F.q=style;TYPE='all';pageN=0;PREFILL=null;selKey=null;railMode='tna';railOpen=!mobile();
  toast(`Style ${style} sent to Sample Planning (TNA pending). Tasks created for you: ${tk.join(', ')}.`);render()};
}

function detail(el,g){
 const ed=canEdit(g);const sib=g.sib;
 const hist=[];g.rows.forEach(r=>(r.history||[]).forEach(e=>hist.push([e[0],'Sample Room',e[1]+' ('+r.color+')'])));((OWN[g.key]||{}).hist||[]).forEach(e=>hist.push(e));hist.sort((a,b)=>b[0].localeCompare(a[0]));
 el.innerHTML=`<header><div><div class="muted" style="font-size:12.5px">${esc(g.sub)} · ${esc(g.buyerName)} · ${esc(g.merch)}</div><h3>${esc(g.style)}</h3><div style="margin-top:4px">${g.types.map(t=>chip(t)).join(' ')} ${chip(g.st,stTone(g.st))} ${chip(g.dst,DTONE[g.dst])}</div></div><button class="btn sm" id="sclose">Back</button></header>
 <div class="body">
 ${ed?'':`<div class="lockbox">${me.kind==='h'?'View only':me.kind==='p'?'Sample Planning view':'Owner: '+esc(g.merch)+'. View only'}</div>`}
 ${g.apr==='Pending'?`<div class="lockbox" style="background:var(--warn-bg)"><b>TNA pending.</b> Waiting ${days(g.rcvd,TODAY)} day(s) for Sample Planning.${me.kind==='p'?' <button class="btn sm primary" id="oTna">Give TNA</button>':''}</div>`:''}${g.apr==='Returned'?`<div class="lockbox" style="background:var(--bad-bg)"><b>Returned by Sample Planning:</b> ${esc(g.rows[0].returnReason||'')} ${esc(g.rows[0].returnNote||'')}${ed?' <button class="btn sm primary" id="oResub">Resubmit to Sample Planning</button>':''}</div>`:''}<div class="fabnote" style="margin-bottom:10px"><b>Next action:</b> ${esc(g.next)}</div>
 <div class="secttl" style="margin-top:0">This style’s sample rounds</div>${sib.map(x=>`<div class="rnd ${x.key===g.key?'on':''}" data-r="${esc(x.key)}"><span>${x.types.map(t=>chip(t)).join(' ')}</span><span class="muted">${fmt(x.rcvd)} · ${x.cols} colour${x.cols>1?'s':''} · ${esc(x.st)}</span><span>${chip(x.msV,({done:'good',wait:'warn',late:'bad',run:'info',none:''})[MSTONE[x.msV]])}</span></div>`).join('')}
 ${g.po?`<div class="muted" style="font-size:12.5px;margin:6px 0">Bulk order: Job ${esc(g.po.job)} · ${g.po.qty?n(g.po.qty)+' pcs':'qty —'} · cargo ${fmt(g.po.cargo)} · PP ${esc(g.po.pp||'—')}${g.poN>1?' · +'+(g.poN-1)+' more job':''}</div>`:'<div class="muted" style="font-size:12.5px;margin:6px 0">No bulk order yet</div>'}
 <div class="secttl">Merchandiser updates</div><div class="form">
  <label>Merchandising status<select id="oMs" ${ed?'':'disabled'}>${MS.map(x=>`<option ${x===g.msV?'selected':''}>${x}</option>`).join('')}</select></label>
  <label>Lab dip (colour approval)<select id="oLab" ${ed&&g.labApp?'':'disabled'}>${LAB.map(x=>`<option ${x===g.labV?'selected':''}>${x}</option>`).join('')}</select></label>
  <label>Trims & accessories ordering<select id="oTrimO" ${ed?'':'disabled'}>${TRIMO.map(x=>`<option ${x===g.trimOV?'selected':''}>${x}</option>`).join('')}</select></label>
  <label>Trims in-house 🔒 <span class="muted">(Store updates)</span><div style="padding-top:4px">${pill(TRIMIST[g.trimIV],g.trimIV)}</div></label>
  ${g.costApp?`<div class="full"><div class="jrow"><span>Costing</span>${pill(COSTST[g.costV],g.costV)}<span>${g.fob?'FOB $'+esc(g.fob)+' · ':''}${ed?'<button class="btn sm" id="oCostBtn">Open cost sheet</button>':''}</span></div><div class="jrow"><span>Yarn requisition</span>${pill(YARNST[g.yarnV],g.yarnV==='Sent to purchase'?'Sent to Purchase':'Not sent')}<span>${ed?'<button class="btn sm" id="oYarnBtn">Yarn requisition</button>':''}</span></div></div>`:`<div class="full muted" style="font-size:12.5px">Costing and yarn requisition are done at the SMS stage for this buyer.</div>`}
  <label>Note<input type="text" id="oNote" value="${esc(g.note)}" ${ed?'':'disabled'}></label>
  <div class="full">${ed?'<button class="btn primary" id="oSave">Save updates</button> ':''}${canNew()?'<button class="btn" id="oNewFor">New sample entry for this style</button>':''}</div></div>
 <div class="secttl">Order sheet info</div><div class="form">
  <label>Coll #<input type="text" id="oColl" value="${esc(g.coll||'')}" ${ed?'':'disabled'}></label>
  <label>Print / Solid / Emb<select id="oFin" ${ed?'':'disabled'}>${FINISH.map(x=>`<option ${x===g.finish?'selected':''}>${x}</option>`).join('')}</select></label>
  <label>Required date (buyer)<input type="date" id="oReq" value="${esc(g.req)}" ${ed?'':'disabled'}></label>
  <div class="full"><table class="btab"><thead><tr><th>Colour</th><th class="num">Qty (pcs)</th></tr></thead><tbody>${g.rows.map(r=>`<tr><td>${esc(r.color)}</td><td class="num"><input type="number" min="0" style="width:84px" data-qid="${r.id}" value="${r.qty}" ${ed?'':'disabled'}></td></tr>`).join('')}</tbody></table></div>
  ${ed?'<div class="full"><button class="btn" id="oSave2">Save order sheet changes</button></div>':''}</div>
 <div class="secttl">Sample Room progress</div>
 <div style="overflow-x:auto"><table class="btab"><thead><tr><th>Colour</th><th class="num">Qty</th><th class="num">Sewn</th><th class="num">Delivered</th><th>Due</th><th>Present status</th><th>Delivery</th></tr></thead><tbody>${g.rows.slice().sort((a,b)=>String(a.due||'~').localeCompare(String(b.due||'~'))).map(r=>`<tr><td>${esc(r.color)}</td><td class="num">${r.qty}</td><td class="num">${r.sewDone}</td><td class="num">${r.delQty}</td><td>${fmt(r.due)}</td><td>${chip(r.stage,TONE[r.stage])}</td><td>${chip(dstat(r),DTONE[dstat(r)])}</td></tr>`).join('')}</tbody></table></div>
 <div class="secttl">History</div><div class="tl">${hist.slice(0,14).map(e=>`<div><b>${fmt(e[0])}</b> · <span class="muted">${esc(e[1])}</span> · ${esc(e[2])}</div>`).join('')||'<span class="muted">No changes yet.</span>'}</div></div>`;
 const $=id=>G(id);$('sclose').onclick=closeRail;
 if($('oNewFor'))$('oNewFor').onclick=()=>openRail('new',null,{style:g.style,buyerName:g.buyerName,sub:g.sub,merch:g.merch,coll:g.coll,sib:g.sib});
 if($('oResub'))$('oResub').onclick=()=>{g.rows.forEach(x=>{x.approval='Pending';x.history.push([TODAY,'Resubmitted to Sample Planning by '+me.name])});saveNew();buildGroups();toast('Resubmitted '+g.style);closeRail()};
 if($('oTna'))$('oTna').onclick=()=>openRail('tnaform',g.key);
 if($('oCostBtn'))$('oCostBtn').onclick=()=>openRail('cost',g.key);if($('oYarnBtn'))$('oYarnBtn').onclick=()=>openRail('yarn',g.key);
 el.querySelectorAll('[data-r]').forEach(x=>x.onclick=()=>{selKey=x.dataset.r;render()});
 if($('oSave'))$('oSave').onclick=()=>{const before=JSON.stringify(OWN);setField(g,'ms',$('oMs').value,1);const g2=()=>GROUPS.find(x=>x.key===g.key);if(g.labApp)setField(g2(),'lab',$('oLab').value,1);setField(g2(),'trimO',$('oTrimO').value,1);setField(g2(),'note',$('oNote').value.trim(),1);toast(JSON.stringify(OWN)===before?'Nothing changed':'Saved for '+g.style+' '+g.main);render()};
 if($('oSave2'))$('oSave2').onclick=()=>{const before=JSON.stringify(OWN);setField(g,'coll',$('oColl').value.trim(),1);setField(GROUPS.find(x=>x.key===g.key),'finish',$('oFin').value,1);setField(GROUPS.find(x=>x.key===g.key),'req',$('oReq').value,1);
  el.querySelectorAll('[data-qid]').forEach(i=>{const r=g.rows.find(x=>String(x.id)===i.dataset.qid);const v=Math.max(0,+i.value||0);if(r&&v!==r.qty){const o=own(g.key);o.qty=o.qty||{};o.qty[r.id]=v;logChange(g,`Qty (${r.color}): ${r.qty} → ${v}`)}});saveOwn();buildGroups();toast(JSON.stringify(OWN)===before?'Nothing changed':'Order sheet changes saved and logged');render()};
}
// ---------- yarn requisitions sent to Purchase (demo store) ----------
const YKEY='nos-merch-yr-v1';let YR=[];try{YR=JSON.parse(localStorage.getItem(YKEY)||'[]')}catch(e){}
const saveYR=()=>{try{localStorage.setItem(YKEY,JSON.stringify(YR))}catch(e){}};
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const f2=x=>(Math.round(x*100)/100).toFixed(2);
// ---------- costing: company format "Cost Sheet – Pre order" ----------
const ACC=[['ml','Main label'],['cl','Care label'],['ht','Hang tag'],['pt','Price tag'],['bp','Blister poly'],['st','Sewing thread'],['ct','Carton'],['el','Eyelet / Lace'],['ds','Doisting'],['bl','Badge label']];
function calcCost(v){
 const rate=num(v.rate)||115;const out={fabs:[],fabTotal:0};
 (v.fabs||[]).forEach(f=>{
  const yarn=(f.yarns||[]).reduce((a,y)=>a+num(y.p)*num(y.pc)/100,0);
  const knit=num(f.knit)/rate,yd=num(f.yd)/rate,dye=num(f.dye)/rate,aop=num(f.aop);
  const base=yarn+knit+aop+yd+dye,waste=base*num(f.wp)/100,perKg=base+waste+num(f.brush),cons=num(f.cons)*(1+num(f.cw)/100);
  out.fabs.push({perKg,cons,perDz:perKg*cons});out.fabTotal+=perKg*cons});
 out.fabTotal+=num(v.collar);
 const acc=ACC.reduce((a,[k])=>a+num(v[k]),0);out.acc=acc+acc*num(v.ex)/100;
 out.dozen=out.fabTotal+num(v.cm)+num(v.sp)+num(v.pearl)+num(v.emb)+num(v.wash)+out.acc+num(v.sms);
 out.pc=out.dozen/12;out.com=out.pc*num(v.com)/100;out.prod=out.pc+out.com;
 out.profit=out.prod*num(v.profit)/100;out.buy=out.prod*num(v.buy)/100;out.fob=out.prod+out.profit+out.buy+num(v.chem);
 return out}
function costDefaults(g){return{qty:g.qty,deliv:'',rate:115,fabs:[0,1,2].map(()=>({d:'',cons:'',cw:12,yarns:[{c:'',p:'',pc:''},{c:'',p:'',pc:''},{c:'',p:'',pc:''}],knit:'',aop:'',yd:'',dye:'',brush:'',wp:12})),collar:'',cm:'',sp:'',pearl:'',emb:'',wash:'',sms:'',ml:'',cl:'',ht:'',pt:'',bp:'',st:'',ct:'',el:'',ds:'',bl:'',ex:10,com:3,profit:2,buy:5,chem:''}}
function setPath(o,p,v){const ks=p.split('.');let c=o;for(let i=0;i<ks.length-1;i++)c=c[ks[i]];c[ks[ks.length-1]]=v}
function printSheetS(html){const a=document.getElementById('printArea');if(!a){toast('Printing is not available here');return}a.innerHTML=html;try{window.print()}catch(e){toast('Printing is blocked here. Open the page in a full browser tab.')}}
function costForm(el,g){const os=g.rows[0].os||{};const saved=(OWN[g.key]||{}).cs;
 NOSCost.form(el,saved||costDefaults(g),{ed:canEdit(g),head:{buyer:g.buyerName,sub:g.sub,style:g.style,coll:g.coll,garment:os.styleName||os.garment||'',date:TODAY,qty:g.qty},onBack:()=>openRail('detail',g.key),print:printSheetS,toast,
  onSave:(v,r,submit)=>{const o=own(g.key);o.cs=v;saveOwn();const g1=()=>GROUPS.find(x=>x.key===g.key);const fob=NOSCost.f2(r.fob);
   if(submit){setField(g1(),'fob',fob,1);setField(g1(),'cost','Done',1);logChange(g1(),'Cost sheet submitted, FOB $'+fob);saveOwn();buildGroups();toast(`Cost sheet submitted. FOB $${fob}.`)}
   else{if(g.costV==='Not started')setField(g1(),'cost','Draft',1);logChange(g1(),'Cost sheet draft saved');saveOwn();buildGroups();toast('Draft saved')}openRail('detail',g.key)}})}

// ---------- yarn requisition: goes to the Purchase department ----------
function yarnForm(el,g){
 const proj=!g;const ed=proj?canNew():canEdit(g);const cs=g&&(OWN[g.key]||{}).cs;
 const buyers=me.kind==='t'?[me.team]:uniq(RAW,r=>r.buyerName);
 const purposes=proj?['Projection (no sample yet)']:(g.bs?['SMS forecast','Projection']:['Before the sample is made','Projection']);
 let lines=[];if(cs){const q=num(cs.qty)||g.qty;const acc={};cs.fabs.forEach(f=>{const tot=num(f.cons)*(1+num(f.cw)/100);f.yarns.forEach(y=>{if(y.c&&num(y.pc)>0&&tot>0){const kg=q/12*tot*num(y.pc)/100;acc[y.c]=(acc[y.c]||0)+kg}})});lines=Object.entries(acc).map(([c,kg])=>({c,comp:'',brand:'',kg:Math.round(kg)}))}
 if(!lines.length)lines=[{c:'',comp:'',brand:'',kg:''}];
 const mine=YR.filter(r=>r.by===me.name||me.kind==='t'||me.kind==='h'||me.kind==='p').slice(-6).reverse();
 el.innerHTML=`<header><div><div class="muted" style="font-size:12.5px">Goes to the Purchase department</div><h3>Yarn requisition</h3><div class="muted" style="font-size:12.5px">${g?'Style '+esc(g.style)+' · '+esc(g.sub):'Projection, no sample yet'}</div></div>${g?'<button class="btn sm" id="yBack">Back</button>':''}</header>
 <div class="body">${ed?'':'<div class="lockbox">View only</div>'}
 
 <div class="form">
  <label>Purpose<select id="yPur" ${ed?'':'disabled'}>${purposes.map(p=>`<option>${p}</option>`).join('')}</select></label>
  <label>Required in-house by<input type="date" id="yReq" value="${addDays(TODAY,60)}" ${ed?'':'disabled'}></label>
  ${proj?`<label>Buyer<select id="yBuyer">${buyers.map(b=>`<option ${b===me.team?'selected':''}>${esc(b)}</option>`).join('')}</select></label><label>Sub-brand<select id="ySub"></select></label><label>Style No. (optional)<input type="text" id="yStyle"></label>`:`<label>Buyer<input type="text" value="${esc(g.buyerName)}" disabled></label><label>Sub-brand<input type="text" value="${esc(g.sub)}" disabled></label><label>Style No.<input type="text" value="${esc(g.style)}" disabled></label>`}
  <div class="full"><div class="secttl" style="margin-top:4px">Yarn needed${cs?' <span class="muted" style="font-weight:400">(from your cost sheet)</span>':''}</div>
   <table class="colorrows" id="yRows"><thead><tr><th>Count / type</th><th>Composition</th><th>Brand</th><th style="width:78px">Qty kg</th><th style="width:30px"></th></tr></thead><tbody></tbody></table><button class="btn sm" id="yAdd" style="margin-top:6px" ${ed?'':'disabled'}>Add yarn</button></div>
  <label class="full">Remarks<input type="text" id="yRem" ${ed?'':'disabled'} placeholder="e.g. 60+ days lead time, buyer approved colour"></label></div>
 ${mine.length?`<div class="secttl">Sent to Purchase</div>${mine.map(r=>`<div style="font-size:12.5px;padding:3px 0"><b>${esc(r.no)}</b> · ${fmt(r.date)} · ${esc(r.style||'Projection')} · ${n(r.total)} kg · ${esc(r.by)} ${chip('Sent to Purchase','good')}</div>`).join('')}`:''}</div>
 ${ed?'<div class="foot"><button class="btn primary" id="ySubmit">Submit to Purchase</button></div>':''}`;
 const $=id=>G(id);
 const addL=l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><input value="${esc(l.c)}" ${ed?'':'disabled'}></td><td><input value="${esc(l.comp)}" ${ed?'':'disabled'}></td><td><input value="${esc(l.brand)}" ${ed?'':'disabled'}></td><td><input type="number" min="0" value="${l.kg}" ${ed?'':'disabled'}></td><td><button class="btn sm" aria-label="Remove">✕</button></td>`;tr.querySelector('button').onclick=()=>tr.remove();$('yRows').tBodies[0].appendChild(tr)};
 lines.forEach(addL);$('yAdd').onclick=()=>addL({c:'',comp:'',brand:'',kg:''});
 if(proj){const fs=()=>{$('ySub').innerHTML=uniq(RAW.filter(r=>r.buyerName===$('yBuyer').value),r=>r.buyer).map(b=>`<option>${esc(b)}</option>`).join('')};$('yBuyer').onchange=fs;fs()}
 if($('yBack'))$('yBack').onclick=()=>openRail('detail',g.key);
 if(ed)$('ySubmit').onclick=()=>{const ls=[...$('yRows').tBodies[0].rows].map(tr=>{const i=tr.querySelectorAll('input');return{c:i[0].value.trim(),comp:i[1].value.trim(),brand:i[2].value.trim(),kg:num(i[3].value)}}).filter(x=>x.c&&x.kg>0);
  if(!ls.length){toast('Add at least one yarn with a quantity');return}
  const total=ls.reduce((a,x)=>a+x.kg,0);const no='YR-'+String(YR.length+1).padStart(4,'0');
  YR.push({no,date:TODAY,by:me.name,buyer:g?g.buyerName:$('yBuyer').value,sub:g?g.sub:$('ySub').value,style:g?g.style:$('yStyle').value.trim(),key:g?g.key:null,purpose:$('yPur').value,req:$('yReq').value,lines:ls,remarks:$('yRem').value.trim(),total});saveYR();
  if(g){const g1=()=>GROUPS.find(x=>x.key===g.key);setField(g1(),'yarn','Sent to purchase',1);logChange(g1(),`Yarn requisition ${no} sent to Purchase (${n(total)} kg)`);saveOwn();buildGroups()}
  toast(`Requisition ${no} sent to Purchase (${n(total)} kg)`);if(g)openRail('detail',g.key);else render()};
}

G('whoSel').onchange=e=>{VIEW=VIEW;me=USERS.find(u=>u.id===e.target.value);Object.keys(F).forEach(k=>F[k]='');TYPE='all';selKey=null;railMode='tna';railOpen=false;PREFILL=null;pageN=0;PAGE='sample';mine=true;buildGroups();render();toast('Now viewing as '+me.name)};

function entryView(m){
 const qr=quotaRows();
 m.innerHTML=` <div class="panel pad"><div class="ptitle">Offer / Dev quota, ${monthLabel(QMONTH)}</div><div class="qgrid">${qr.map(q=>{const p=q.od?q.used/q.od:1;const col=p>1?'var(--bad)':p>=.8?'var(--warn)':'var(--good)';const lab=q.used>q.od?chip('Over by '+(q.used-q.od),'bad'):q.used===q.od?chip('Full','warn'):chip((q.od-q.used)+' left','good');return `<div class="qrow"><span class="nm">${esc(q.line)} <span class="muted">${q.used}/${q.od}</span></span><div class="tr"><div style="width:${Math.min(100,p*100)}%;background:${col}"></div></div><span>${lab}</span></div>`}).join('')||'<div class="empty">No quota line</div>'}</div></div>
 ${myPP().length?`<div class="panel pad" style="margin-top:12px"><div class="ptitle">PP sample requests from new bulk orders (${myPP().length})</div>${myPP().map(t=>`<div class="tnaitem" data-ppreq="${esc(t.id)}"><div><b>${esc(t.style)}</b> · Job ${esc(t.job)} ${chip(t.buyer)}</div><div class="muted" style="font-size:12.5px">${esc(t.styleName||'')} · ${t.colours.length} colour(s)</div></div>`).join('')}</div>`:''}
 ${canNew()?'<section class="panel wide" id="formBox" style="margin-top:12px"></section>':'<div class="panel pad" style="margin-top:12px">Only merchandisers and team leaders enter new sample orders.</div>'}
 <div class="panel pad" style="margin-top:12px"><div class="ptitle">Waiting for Sample Planning (TNA pending) and returned sheets</div><div id="entryPend" style="max-width:640px"></div></div>`;
 if(canNew())newForm(G('formBox'));
 tnaList(G('entryPend'));
 root.querySelectorAll('[data-ppreq]').forEach(x=>x.onclick=()=>{const t=xget().find(y=>y.id===x.dataset.ppreq);if(!t)return;PREFILL={style:t.style,buyerName:t.buyer,type:'PP',name:t.styleName,ppTask:t.id};render();window.scrollTo(0,0)});
 root.querySelectorAll('[data-tna]').forEach(x=>x.onclick=()=>{VIEW='followup';openRail('tnaform',x.dataset.tna)});root.querySelectorAll('[data-ret]').forEach(x=>x.onclick=()=>{VIEW='followup';openRail('detail',x.dataset.ret)})}
function myPP(){return xget().filter(t=>t.kind==='pp'&&!t.done&&(me.kind==='h'||me.kind==='p'||(!!me.team&&t.buyer===me.team)))}
function sOrderSheetHTML(g){const r=g.rows[0],os=r.os||{};const fab=os.fabric||[];
 return `<div class="ps"><h2>NORTHERN FASHION LTD.</h2><h3>Sample Fabric &amp; Garment Order Sheet</h3><table><tr><td>Date: ${fmt(g.rcvd)}</td><td>Sample type: ${esc(g.types.join(' + '))}</td></tr><tr><td>Buyer: ${esc(g.buyerName)} - ${esc(g.sub)}</td><td>Coll: ${esc(g.coll||'')}</td></tr><tr><td>Style: ${esc(g.style)}</td><td>Style name: ${esc(os.styleName||'')}</td></tr><tr><td>Merchandiser: ${esc(g.merch)}</td><td>Required date: ${fmt(r.reqDate||'')}</td></tr>${os.bso||os.size?`<tr><td>BSO: ${esc(os.bso||'')}</td><td>Sample size: ${esc(os.size||'')}</td></tr>`:''}</table>
 <table><tr><th>Colour</th><th>Qty (pcs)</th></tr>${g.rows.map(x=>`<tr><td>${esc(x.color)}</td><td>${n(x.qty)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${n(g.qty)}</b></td></tr></table>
 ${fab.length?`<p><b>To : Knitting &amp; Dyeing</b></p><table><tr><th>Part</th><th>GSM &amp; Fabric</th><th>Composition</th><th>Kgs</th></tr>${fab.map(f=>`<tr><td>${esc(f[0])}</td><td>${esc(f[1])}</td><td>${esc(f[2])}</td><td>${esc(f[3])}</td></tr>`).join('')}</table>`:''}
 ${os.instructions?`<p><b>Specific Instructions:</b> ${esc(os.instructions)}</p>`:''}<div class="sig"><div>Prepared By<br>Merchandiser</div><div>Checked By<br>Team Leader</div><div>Received By<br>Sample Planning</div></div></div>`}
function sTnaHTML(g){const r=g.rows[0],os=r.os||{};const ta=os.ta||{};const sew=ta.Sewing||{s:r.sewStart||'',e:r.sewClose||''};
 return `<div class="ps"><h2>NORTHERN FASHION LTD.</h2><h3>Sample Time &amp; Action Plan (T &amp; A)</h3><table><tr><td>Buyer: ${esc(g.buyerName)} - ${esc(g.sub)}</td><td>Sample type: ${esc(g.types.join(' + '))}</td></tr><tr><td>Style: ${esc(g.style)} ${esc(os.styleName||'')}</td><td>Qty: ${n(g.qty)} pcs</td></tr><tr><td>Order sheet date: ${fmt(g.rcvd)}</td><td>Required date: ${fmt(r.reqDate||'')}</td></tr></table>
 <table><tr><th>Activity</th><th>Start</th><th>End</th></tr>${TA.map(k=>{const x=k==='Sewing'?sew:(ta[k]||{});return `<tr><td>${k}</td><td>${fmt(x.s||'')}</td><td>${fmt(x.e||'')}</td></tr>`}).join('')}<tr><td><b>Planned delivery</b></td><td></td><td><b>${fmt(r.plannedDue||r.due||'')}</b></td></tr></table>
 <div class="sig"><div>Sample Planning</div><div>Merchandiser</div><div>Team Leader</div></div></div>`}
let PRINTK=null,PRQ='';
function printView(m){const q=PRQ.toLowerCase();const list=GROUPS.filter(g=>mineOk(g)&&(!q||(g.style+' '+g.sub+' '+g.merch).toLowerCase().includes(q))).slice(0,40);const cur=PRINTK&&GROUPS.find(g=>g.key===PRINTK);
 m.innerHTML=`<div class="fbar"><input type="search" id="prq" placeholder="Search style" value="${esc(PRQ)}" aria-label="Search style"></div>
 ${cur?`<div class="panel pad" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><b>${esc(cur.style)}</b> · ${esc(cur.sub)} · ${esc(cur.types.join(' + '))} · ${n(cur.qty)} pcs</div><div class="ms"><button class="btn primary" id="pOS">Fabric &amp; garment order sheet</button><button class="btn primary" id="pTA">TNA</button></div></div></div>`:''}
 <div class="panel"><div class="tablewrap" style="min-height:0"><table class="noband"><thead><tr class="hdr"><th>Style</th><th>Sub-brand</th><th>Sample type</th><th>Merchandiser</th><th class="num">Qty</th><th>Order sheet</th></tr></thead><tbody>${list.map(g=>`<tr data-pk="${esc(g.key)}" class="${g.key===PRINTK?'sel':''}"><td><b>${esc(g.style)}</b></td><td>${esc(g.sub)}</td><td>${esc(g.types.join(' + '))}</td><td>${esc(g.merch)}</td><td class="num">${n(g.qty)}</td><td>${fmt(g.rcvd)}</td></tr>`).join('')}</tbody></table>${list.length?'':'<div class="empty">No style found</div>'}</div></div>`;
 const pq=G('prq');pq.oninput=()=>{PRQ=pq.value;clearTimeout(printView.t);printView.t=setTimeout(()=>{render();const e=G('prq');e.focus();e.setSelectionRange(e.value.length,e.value.length)},280)};
 root.querySelectorAll('[data-pk]').forEach(tr=>tr.onclick=()=>{PRINTK=tr.dataset.pk;render();window.scrollTo(0,0)});
 if(cur){G('pOS').onclick=()=>printSheetS(sOrderSheetHTML(cur));G('pTA').onclick=()=>printSheetS(sTnaHTML(cur))}}
const SVIEWS=[['entry','Sample order entry'],['followup','Sample follow-up'],['costing','Costing'],['yarn','Yarn requisition'],['print','Print']];
function setView(v){VIEW=v;selKey=null;railMode='tna';railOpen=false;pageN=0;PREFILL=null;Object.keys(F).forEach(k=>F[k]='');TYPE='all';sort={k:'nextDue',dir:1};render()}
function resetAll(){
 OWN={};for(let i=RAW.length-1;i>=0;i--)if(RAW[i].isNew)RAW.splice(i,1);try{localStorage.removeItem(KEY);localStorage.removeItem(NKEY)}catch(e){}
 seedNew().forEach(r=>{r.isNew=true;RAW.push(prepRow(r))});saveNew();RAW.forEach(r=>{r.qty=r.q0});Object.keys(F).forEach(k=>F[k]='');selKey=null;railMode='tna';railOpen=false;buildGroups();render();toast('Demo data reset')}
buildGroups();render();
return{views:SVIEWS,get view(){return VIEW},setView,reset:resetAll,rerender:render};

}
