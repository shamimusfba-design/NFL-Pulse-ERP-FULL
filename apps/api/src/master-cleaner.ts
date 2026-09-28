export type CleanResult<T=string>={value:T|null; raw:string; corrected:boolean; rejected?:boolean; reason?:string};

const text=(v:any)=>String(v??'').replace(/\s+/g,' ').trim();
const key=(v:any)=>text(v).toLowerCase().replace(/[’`]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const lineKey=(v:any)=>text(v).toUpperCase().replace(/\s+/g,'').replace(/\\/g,'/');

export const APPROVED_BUYERS=[
  'Name It','ONLY','Only & Sons','OVS','UTG','New Look','T.M Lewin','Maurices','Miss Selfridge',"Sainsbury's","Anthony's",'Guess'
] as const;

const BUYER_ALIASES:Record<string,string>={
  'bs nmt':'Name It','nmt':'Name It','name it':'Name It','bestseller name it':'Name It',
  'bs onl':'ONLY','onl':'ONLY','only':'ONLY','bs onl main':'ONLY','bs onl sub':'ONLY','onl only':'ONLY',
  'bs ons':'Only & Sons','ons':'Only & Sons','only sons':'Only & Sons','only and sons':'Only & Sons','bestseller only sons':'Only & Sons',
  'ovs':'OVS','ovs spa':'OVS',
  'utg':'UTG','utg af':'UTG','utg even odd':'UTG','utg bonprix':'UTG',
  'new look':'New Look','gbx new look':'New Look','gt new look':'New Look',
  't m lewin':'T.M Lewin','tm lewin':'T.M Lewin','gbx tm lewin':'T.M Lewin','gt t m lewin':'T.M Lewin','gt tm lewin':'T.M Lewin',
  'maurices':'Maurices','gbx maurices':'Maurices','gt maurices':'Maurices','maurice':'Maurices',
  'miss selfridge':'Miss Selfridge','mis selfridge':'Miss Selfridge','miss shelfridge':'Miss Selfridge','gbx miss shelfridge':'Miss Selfridge','gt miss selfridge':'Miss Selfridge',
  'sainsbury s':"Sainsbury's",'sainsburys':"Sainsbury's",'sainsburry s':"Sainsbury's",'sainsburry':"Sainsbury's",'saisburry':"Sainsbury's",'sainsburru s':"Sainsbury's",'gbx sainsbury s':"Sainsbury's",'gbx sainsburry s':"Sainsbury's",'gt sainsbury s':"Sainsbury's",
  'anthony s':"Anthony's",'anthonys':"Anthony's",'gbx anthony s':"Anthony's",'gt anthony s':"Anthony's",
  'guess':'Guess','gbx guess':'Guess','gt guess':'Guess'
};

export const APPROVED_MERCHANDISERS=[
  'Abid','Afroza Jannati','Basir','Bashir','Dalim','G.Sarwar','Hadia','Haider','Ifrat','Imran','Jafar','Jannati','Kamruzzaman','Khairul','Khalid','Mainul','Mannan','Masud Rana','Morad','Mosaddik','Rana','Rony','Sabikun','Salam','Sanaul','Sanaulla','Shakel','Shaker','Shaker Imran','Shamoly','Shofi','Shohag','Shovon','Sifat','Sirajul','Tomal','Zahirul'
] as const;
const MERCH_MAP=new Map(APPROVED_MERCHANDISERS.map(x=>[key(x),x]));

export const APPROVED_LINES=[
  'A1','A2','B','B2','C','C2','D1','D2','E1','E2','F','G1','G2','H1','H2','J1','J2','K1','K2','L1','L2','M1','M2','N1','N2','O1','O2','P1','P2','Q1','Q2','R1','R2','R3','S1','S2','T1','T2','U1','U2','X1','Y1','Y2','Z1','Z2','U','V1','V2','W1','W2','ZA1','ZA2','1','2','3','4','5','6','7','8A','8B','9A','9B','10A','10B','11A','11B','12A','12B','13A','13B','14A','14B','15A','15B','16A','16B','17A','17B','18A','18B','19A','19B','20A','20B','21A','21B','22A','22B','23A','23B'
] as const;
const LINE_ALIASES:Record<string,string>={
  'CB':'C2',
  'D1A':'D1','D1B':'D1','D2A':'D2','D2B':'D2',
  'E1A':'E1','E1B':'E1','E2A':'E2','E2B':'E2',
  'FA':'F','FB':'F','G1A':'G1','G1B':'G1','G2A':'G2','G2B':'G2','H1A':'H1','H1B':'H1','H2A':'H2','H2B':'H2',
  'UA':'U','UB':'U','V1A':'V1','V1B':'V1','V2A':'V2','V2B':'V2','W1A':'W1','W1B':'W1','W2A':'W2','W2B':'W2',
  'ZA1A':'ZA1','ZA1B':'ZA1','ZA2A':'ZA2','ZA2B':'ZA2'
};
const LINE_MAP=new Map<string,string>();
for(const x of APPROVED_LINES) LINE_MAP.set(lineKey(x),x);
for(const [raw,value] of Object.entries(LINE_ALIASES)) LINE_MAP.set(lineKey(raw),value);

export const APPROVED_STATUSES=[
  'Cut OK','File Due','Ready Test Cut','PO Sheet Due','Need Test Cut','Need Cut','Cut Run','CAD','Size Set Run','PPM Due','Need Cut FB','Size Set Run PC','Size Set Run Emb','Size Set Run Print','Rib Due','Fab Due'
] as const;
const STATUS_MAP=new Map(APPROVED_STATUSES.map(x=>[key(x),x]));

export const APPROVED_FLOORS=['Sewing-01','Sewing-02','Sewing-03','S-01','S-02','S-03','NCL'] as const;
const FLOOR_ALIASES:Record<string,string>={
  'NFL1':'Sewing-01','NFL2':'Sewing-02','NFL3':'Sewing-03',
  'SEWING-1':'Sewing-01','SEWING-2':'Sewing-02','SEWING-3':'Sewing-03',
  'S1':'S-01','S2':'S-02','S3':'S-03','S-1':'S-01','S-2':'S-02','S-3':'S-03',
  'NCL':'NCL'
};
const FLOOR_MAP=new Map<string,string>();
for(const x of APPROVED_FLOORS) FLOOR_MAP.set(lineKey(x),x);
for(const [raw,value] of Object.entries(FLOOR_ALIASES)) FLOOR_MAP.set(lineKey(raw),value);

export const APPROVED_FACTORIES=['NFL','Newage','Pakiza','Giant-Tex','Rupa','Knitex','Knit Plus','Taqwa','U-02','Ceylon','Unifill','DB Tex','JB Tex','GTA'] as const;
const FACTORY_ALIASES:Record<string,string>={
  'nfl':'NFL','northern fashion':'NFL','northern fashion limited':'NFL','northern fashion ltd':'NFL',
  'newage':'Newage','new age':'Newage',
  'pakiza':'Pakiza','pakiza knit':'Pakiza',
  'giant tex':'Giant-Tex','gianttex':'Giant-Tex','giant tex ltd':'Giant-Tex',
  'rupa':'Rupa','knitex':'Knitex','knit plus':'Knit Plus','taqwa':'Taqwa','u 02':'U-02','u02':'U-02',
  'ceylon':'Ceylon','unifill':'Unifill','db tex':'DB Tex','db tec':'DB Tex','jb tex':'JB Tex','gta':'GTA'
};

export const APPROVED_PROCESSES=['AOP','Y/D','Brush','Light Brush','Mid Brush','Full Brush','Outside Brush','Peach Finish','GMT Dyeing','Acid Wash'] as const;
const PROCESS_ALIASES:Record<string,string>={
  'aop':'AOP','y d':'Y/D','yd':'Y/D','brush':'Brush','lt brush':'Light Brush','light brush':'Light Brush','mid brush':'Mid Brush','full brush':'Full Brush','outside brush':'Outside Brush','peach':'Peach Finish','peach finish':'Peach Finish','gmt dyeing':'GMT Dyeing','garment dyeing':'GMT Dyeing','acid wash':'Acid Wash'
};

export const APPROVED_PRINT_EMB=['Printing','Embroidery'] as const;

export function cleanBuyer(v:any):CleanResult{
  const raw=text(v); if(!raw)return{value:null,raw,corrected:false,rejected:true,reason:'blank'};
  const k=key(raw.replace(/^[-]+/,'')); const value=BUYER_ALIASES[k]||null;
  return value?{value,raw,corrected:value!==raw}:{value:null,raw,corrected:false,rejected:true,reason:'not approved buyer'};
}

export function cleanMerchandiser(v:any):CleanResult{
  const raw=text(v); if(!raw)return{value:null,raw,corrected:false,rejected:true,reason:'blank'};
  const value=MERCH_MAP.get(key(raw))||null;
  return value?{value,raw,corrected:value!==raw}:{value:null,raw,corrected:false,rejected:true,reason:'not approved merchandiser'};
}

export function cleanStatus(v:any):CleanResult{
  const raw=text(v); if(!raw)return{value:null,raw,corrected:false,rejected:true,reason:'blank'};
  const value=STATUS_MAP.get(key(raw))||null;
  return value?{value,raw,corrected:value!==raw}:{value:null,raw,corrected:false,rejected:true,reason:'not approved present status'};
}

export function cleanFloor(v:any):CleanResult{
  const raw=text(v); if(!raw)return{value:null,raw,corrected:false,rejected:true,reason:'blank'};
  const value=FLOOR_MAP.get(lineKey(raw))||null;
  return value?{value,raw,corrected:value!==raw}:{value:null,raw,corrected:false,rejected:true,reason:'not approved floor'};
}

function splitMulti(raw:string){
  return raw.split(/\s*(?:\+|,|;|\s\/\s)\s*/g).map(x=>x.trim()).filter(Boolean);
}
export function cleanLines(v:any){
  const raw=text(v); const approved:string[]=[]; const rejected:string[]=[];
  for(const part of splitMulti(raw)){const value=LINE_MAP.get(lineKey(part)); if(value&&!approved.includes(value))approved.push(value); else if(part)rejected.push(part)}
  return {raw,values:approved,primary:approved[0]||null,rejected,corrected:approved.join(' + ')!==raw};
}

export function cleanFactories(v:any){
  const raw=text(v); const values:string[]=[]; const rejected:string[]=[];
  for(const part of splitMulti(raw)){const value=FACTORY_ALIASES[key(part)]||null;if(value&&!values.includes(value))values.push(value);else if(part)rejected.push(part)}
  return {raw,values,primary:values[0]||null,rejected,corrected:values.join(' + ')!==raw};
}

export function cleanProcesses(v:any){
  const raw=text(v); if(!raw)return{raw,values:[] as string[],rejected:[] as string[],corrected:false};
  const parts=raw.split(/\s*(?:&|,|\+)\s*/g).map(x=>x.trim()).filter(Boolean); const values:string[]=[];const rejected:string[]=[];
  for(const part of parts){const value=PROCESS_ALIASES[key(part)]||null;if(value&&!values.includes(value))values.push(value);else rejected.push(part)}
  return {raw,values,rejected,corrected:values.join(' + ')!==raw};
}

export function cleanPrintEmb(v:any){
  const raw=text(v); const k=raw.toUpperCase().replace(/\s+/g,''); const values:string[]=[];
  if(k.includes('P')||/PRINT/i.test(raw))values.push('Printing'); if(k.includes('E')||/EMB/i.test(raw))values.push('Embroidery');
  return {raw,values,primary:values.length===2?'Printing + Embroidery':values[0]||null,corrected:true};
}

export function normalizeJobNo(v:any){
  // Preserve factory short form / ordinal suffix such as "48551 1st". Only normalize whitespace.
  return text(v);
}
export function jobBaseNo(v:any){const raw=text(v);const m=raw.match(/^(\d{4,8})/);return m?m[1]:raw;}
export function isValidJobNo(v:any){return /^\d{4,8}(?:\s|$)/.test(text(v));}

export function normalizeReportMasters(n:any){
  const audit:any={};
  if('buyer' in n){const r=cleanBuyer(n.buyer);audit.buyer={raw:r.raw,clean:r.value,status:r.value?(r.corrected?'CORRECTED':'OK'):'REJECTED'};n.buyerRaw=r.raw;n.buyer=r.value||'';}
  if('merchandiser' in n){const r=cleanMerchandiser(n.merchandiser);audit.merchandiser={raw:r.raw,clean:r.value,status:r.value?(r.corrected?'CORRECTED':'OK'):'REVIEW'};n.merchandiserRaw=r.raw;n.merchandiser=r.value||'';}
  if('presentStatus' in n){const r=cleanStatus(n.presentStatus);audit.presentStatus={raw:r.raw,clean:r.value,status:r.value?(r.corrected?'CORRECTED':'OK'):'REVIEW'};n.presentStatusRaw=r.raw;n.presentStatus=r.value||r.raw;}
  if('line' in n){const r=cleanLines(n.line);audit.line={raw:r.raw,clean:r.values,status:r.rejected.length?'PARTIAL':'OK',rejected:r.rejected};n.lineRaw=r.raw;n.lineAssignments=r.values;n.line=r.primary||'';}
  if('floor' in n){const r=cleanFloor(n.floor);audit.floor={raw:r.raw,clean:r.value,status:r.value?'OK':'REVIEW'};n.floorRaw=r.raw;n.floor=r.value||'';}
  if('sewingFloor' in n){const r=cleanFloor(n.sewingFloor);audit.sewingFloor={raw:r.raw,clean:r.value,status:r.value?'OK':'REVIEW'};n.sewingFloorRaw=r.raw;n.sewingFloor=r.value||'';}
  if('factoryName' in n){const r=cleanFactories(n.factoryName);audit.factoryName={raw:r.raw,clean:r.values,status:r.rejected.length?'PARTIAL':'OK',rejected:r.rejected};n.factoryNameRaw=r.raw;n.factoryAssignments=r.values;n.factoryName=r.primary||'';}
  for(const f of ['dyeingFactory','aopFactory','peachFactory','brushFactory','shearingFactory','singeingFactory','finishingFactory']){
    if(f in n){const r=cleanFactories(n[f]);audit[f]={raw:r.raw,clean:r.values,status:r.rejected.length?'PARTIAL':'OK',rejected:r.rejected};n[`${f}Raw`]=r.raw;n[`${f}Assignments`]=r.values;n[f]=r.primary||'';}
  }
  if('additionalProcess' in n){const r=cleanProcesses(n.additionalProcess);audit.additionalProcess={raw:r.raw,clean:r.values,status:r.rejected.length?'PARTIAL':'OK',rejected:r.rejected};n.additionalProcessRaw=r.raw;n.additionalProcesses=r.values;n.additionalProcess=r.values.join(' + ');}
  if('printEmbType' in n){const r=cleanPrintEmb(n.printEmbType);audit.printEmbType={raw:r.raw,clean:r.values,status:r.values.length?'OK':'REVIEW'};n.printEmbTypeRaw=r.raw;n.printEmbTypes=r.values;n.printEmbType=r.primary||'';}
  n.__normalization=audit;
  return n;
}

export const CONTROLLED_REFERENCE_CATEGORIES=new Set([
  'BUYER','SEWING_LINE','MERCHANDISER','FLOOR','SEWING_FLOOR','PRESENT_STATUS','PRINT_EMB_TYPE','PROCESS_FACTORY','DYEING_FACTORY','AOP_FACTORY','PEACH_FACTORY','BRUSH_FACTORY','SHEARING_FACTORY','SINGEING_FACTORY','FINISHING_FACTORY','ADDITIONAL_PROCESS'
]);

export function approvedReferenceValues(category:string,n:any):string[]{
  switch(category){
    case 'BUYER': return n.buyer?[n.buyer]:[];
    case 'SEWING_LINE': return Array.isArray(n.lineAssignments)?n.lineAssignments:(n.line?[n.line]:[]);
    case 'MERCHANDISER': return n.merchandiser?[n.merchandiser]:[];
    case 'FLOOR': return n.floor?[n.floor]:[];
    case 'SEWING_FLOOR': return n.sewingFloor?[n.sewingFloor]:[];
    case 'PRESENT_STATUS': return APPROVED_STATUSES.includes(n.presentStatus as any)?[n.presentStatus]:[];
    case 'PRINT_EMB_TYPE': return Array.isArray(n.printEmbTypes)?n.printEmbTypes:[];
    case 'PROCESS_FACTORY': return Array.isArray(n.factoryAssignments)?n.factoryAssignments:(n.factoryName?[n.factoryName]:[]);
    case 'ADDITIONAL_PROCESS': return Array.isArray(n.additionalProcesses)?n.additionalProcesses:[];
    case 'DYEING_FACTORY': return Array.isArray(n.dyeingFactoryAssignments)?n.dyeingFactoryAssignments:(n.dyeingFactory?[n.dyeingFactory]:[]);
    case 'AOP_FACTORY': return Array.isArray(n.aopFactoryAssignments)?n.aopFactoryAssignments:(n.aopFactory?[n.aopFactory]:[]);
    case 'PEACH_FACTORY': return Array.isArray(n.peachFactoryAssignments)?n.peachFactoryAssignments:(n.peachFactory?[n.peachFactory]:[]);
    case 'BRUSH_FACTORY': return Array.isArray(n.brushFactoryAssignments)?n.brushFactoryAssignments:(n.brushFactory?[n.brushFactory]:[]);
    case 'SHEARING_FACTORY': return Array.isArray(n.shearingFactoryAssignments)?n.shearingFactoryAssignments:(n.shearingFactory?[n.shearingFactory]:[]);
    case 'SINGEING_FACTORY': return Array.isArray(n.singeingFactoryAssignments)?n.singeingFactoryAssignments:(n.singeingFactory?[n.singeingFactory]:[]);
    case 'FINISHING_FACTORY': return Array.isArray(n.finishingFactoryAssignments)?n.finishingFactoryAssignments:(n.finishingFactory?[n.finishingFactory]:[]);
    default:return [];
  }
}
