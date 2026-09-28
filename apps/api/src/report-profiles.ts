import * as XLSX from 'xlsx';
import { approvedReferenceValues, isValidJobNo, jobBaseNo, normalizeJobNo, normalizeReportMasters } from './master-cleaner';

export type ReportType = 'ERP_MASTER_IMPORT'|'TNA_PLAN_EXECUTION'|'CUTTING_PRINT_INPUT'|'FINISH_FABRIC_DYEING'|'IE_BULLETIN'|'GENERIC';
export type ExtractedReportRow = {
  sourceType: ReportType;
  dataset: string;
  sheetName: string;
  rowNumber: number;
  rawData: Record<string, any>;
  normalizedData: Record<string, any>;
  targetModules: string[];
  references: { category: string; value: string }[];
};

const clean = (v:any) => String(v ?? '').trim().toLowerCase().replace(/[_\-./]+/g,' ').replace(/\s+/g,' ');
export const text = (v:any) => String(v ?? '').replace(/\s+/g,' ').trim();
export function num(v:any){
  if(v===null||v===undefined||v==='') return null;
  if(typeof v==='number' && Number.isFinite(v)) return v;
  const s=String(v).replace(/,/g,'').replace(/%/g,'').trim();
  const n=Number(s); return Number.isFinite(n)?n:null;
}
export function int(v:any){ const n=num(v); return n===null?null:Math.round(n); }
export function dateIso(v:any){
  if(v===null||v===undefined||v==='') return null;
  // Factory workbooks contain calendar dates, not instants. XLSX cellDates creates a local Date;
  // calling toISOString() directly can shift Bangladesh midnight to the previous UTC day.
  if(v instanceof Date && !Number.isNaN(v.getTime())){
    return new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())).toISOString();
  }
  if(typeof v==='number'){
    const p=XLSX.SSF.parse_date_code(v); if(p) return new Date(Date.UTC(p.y,p.m-1,p.d)).toISOString();
  }
  const s=text(v); if(!s) return null;
  const iso=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(iso) return new Date(Date.UTC(Number(iso[1]),Number(iso[2])-1,Number(iso[3]))).toISOString();
  const m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if(m){ let y=Number(m[3]); if(y<100)y+=2000; return new Date(Date.UTC(y,Number(m[2])-1,Number(m[1]))).toISOString(); }
  const mon=s.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/);
  if(mon){ const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; const mi=months.indexOf(mon[2].toUpperCase()); if(mi>=0) return new Date(Date.UTC(Number(mon[3]),mi,Number(mon[1]))).toISOString(); }
  const d=new Date(s);
  if(Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())).toISOString();
}
function isDataJob(v:any){ return isValidJobNo(v); }
function canonicalJob(v:any){ return normalizeJobNo(v); }
function refsFromNormalized(n:any,categories:string[]) { return categories.flatMap(category=>approvedReferenceValues(category,n).map(value=>({category,value}))); }
function sheetMatrix(ws:XLSX.WorkSheet){ return XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:'',raw:true,blankrows:false}); }
function headerObject(row:any[]){ const out:Record<string,number>={}; row.forEach((v,i)=>{const k=clean(v);if(k&&!out[k])out[k]=i}); return out; }
function at(row:any[], h:Record<string,number>, aliases:string[]){ for(const a of aliases){const idx=h[clean(a)]; if(idx!==undefined) return row[idx];} return ''; }
function rawFromHeaders(row:any[], headers:any[]){ const out:Record<string,any>={}; headers.forEach((h,i)=>{const k=text(h)||`Column ${i+1}`; if(row[i]!==''&&row[i]!==null&&row[i]!==undefined) out[k]=row[i];}); return out; }

function normalizedSheetName(v:any){
  return text(v).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
function canonicalHeaderTokens(row:any[]){
  return new Set((row||[]).map(v=>clean(v)).filter(Boolean));
}
function looksLikeErpMasterSheet(ws:XLSX.WorkSheet|undefined){
  if(!ws) return false;
  const matrix=sheetMatrix(ws).slice(0,8);
  const has=(headers:Set<string>, aliases:string[])=>Array.from(headers).some(h=>aliases.some(a=>h===a||h.startsWith(a+' ')));
  for(const row of matrix){
    const h=canonicalHeaderTokens(row);
    const required=has(h,['job no'])&&has(h,['buyer'])&&has(h,['style no'])&&has(h,['order qty']);
    const optional=[['primary line'],['factory'],['floor'],['ie smv'],['data quality'],['overall stage'],['source date mode'],['line plan start'],['sewing plan start']];
    if(required && optional.filter(a=>has(h,a)).length>=2) return true;
  }
  return false;
}
function findErpMasterSheetName(workbook:XLSX.WorkBook){
  const exact=workbook.SheetNames.find(x=>normalizedSheetName(x)==='ERP_MASTER_IMPORT');
  if(exact) return exact;
  return workbook.SheetNames.find(x=>looksLikeErpMasterSheet(workbook.Sheets[x]));
}

export function detectReportType(workbook:XLSX.WorkBook):ReportType{
  const names=workbook.SheetNames.map(x=>x.trim());
  if(findErpMasterSheetName(workbook)) return 'ERP_MASTER_IMPORT';
  if(names.some(x=>x.toLowerCase()==='central report') && names.some(x=>x.toLowerCase().includes('line execution'))) return 'TNA_PLAN_EXECUTION';
  if(names.some(x=>x.trim().toLowerCase()==='production') && names.some(x=>x.toLowerCase().includes('tracking'))) return 'CUTTING_PRINT_INPUT';
  if(names.some(x=>/september['-]?26/i.test(x)) && names.some(x=>/june['-]?26/i.test(x))) return 'FINISH_FABRIC_DYEING';
  const summaryName=names.find(x=>x.toLowerCase()==='summary');
  const summary=summaryName?workbook.Sheets[summaryName]:undefined;
  if(summary){ const m=sheetMatrix(summary).slice(0,4).flat().map(clean); if(m.includes('actual smv') && m.some(x=>x.includes('merchant name'))) return 'IE_BULLETIN'; }
  return 'GENERIC';
}

function extractTna(workbook:XLSX.WorkBook):ExtractedReportRow[]{
  const out:ExtractedReportRow[]=[];
  const ws=workbook.Sheets['Central report'];
  if(ws){
    const matrix=sheetMatrix(ws); const headers=matrix[1]||[]; const h=headerObject(headers);
    for(let i=2;i<matrix.length;i++){
      const row=matrix[i]; const jobNo=at(row,h,['Job']); if(!isDataJob(jobNo)) continue;
      const n:any={
        buyer:text(at(row,h,['Buyer'])), jobNo:canonicalJob(jobNo), jobBaseNo:jobBaseNo(jobNo), sourceJobNo:text(jobNo), styleNo:text(at(row,h,['Style'])), orderQty:int(at(row,h,['Order Qty'])), fabricRequiredKg:num(at(row,h,['Fabric Req. (in Kg)'])),
        poReceivedDate:dateIso(at(row,h,['PO Received Date'])), taPlanDate:dateIso(at(row,h,['T & A Plan Date'])), itemDescription:text(at(row,h,['Item Description'])), item:text(at(row,h,['Item'])),
        yarnDyeingStart:dateIso(at(row,h,['Yarn Dyeing T & A Start'])), yarnDyeingEnd:dateIso(at(row,h,['Yarn Dyeing T & A End'])), knittingStart:dateIso(at(row,h,['Knitting T & A Start'])), knittingEnd:dateIso(at(row,h,['Knitting T & A End'])),
        dyeingFinishingStart:dateIso(at(row,h,['Dyeing -Finishing T & A Start'])), dyeingFinishingEnd:dateIso(at(row,h,['Dyeing-Finishing T & A End'])), aopStart:dateIso(at(row,h,['All Over Print T & A Start'])), aopEnd:dateIso(at(row,h,['All Over Print T & A End'])),
        trimsInhouseDate:dateIso(at(row,h,['Trims & Accessories T & A End'])), fileHandoverDate:dateIso(at(row,h,['Production & Other File Handover Date'])), ppMeetingDate:dateIso(at(row,h,['PP Meeting Date'])),
        cuttingStart:dateIso(at(row,h,['Cutting T & A Start'])), cuttingEnd:dateIso(at(row,h,['Cutting T & A End'])), printingStart:dateIso(at(row,h,['Printing T & A Start'])), printingEnd:dateIso(at(row,h,['Printing T & A End'])),
        stoneStart:dateIso(at(row,h,['Stone/Parl Att. T & A Start'])), stoneEnd:dateIso(at(row,h,['Stone/Parl Att. T & A Emd'])), embroideryStart:dateIso(at(row,h,['Emb/Sequins/Arrey Emb T & A Start'])), embroideryEnd:dateIso(at(row,h,['Emb/Sequins/Arrey Emb T & A End'])),
        sewingStartDate:dateIso(at(row,h,['Sewing T & A Start'])), sewingEnd:dateIso(at(row,h,['Sewing T & A End'])), garmentWashStart:dateIso(at(row,h,['Garments Washing/ Dyeing T & A Start'])), garmentWashEnd:dateIso(at(row,h,['Garments Washing/ Dyeing T & A End'])),
        finishingEnd:dateIso(at(row,h,['Iron, Folding,Packing & Finishing T & A End'])), preFinalInspection:dateIso(at(row,h,['Pre-final Inspection Date'])), finalInspection:dateIso(at(row,h,['Final Inspection'])), exFactoryDate:dateIso(at(row,h,['Ex-Factory Date'])), cargoClosingDate:dateIso(at(row,h,['Cargo Closing Date'])),
        totalLeadTimeDays:int(at(row,h,['Total Lead Time (In Days)'])), line:text(at(row,h,['Line'])), merchandiser:text(at(row,h,['Merchandiser Name'])), printPosition:text(at(row,h,['Print Position'])), embroideryPosition:text(at(row,h,['Embriodary Position'])), printEmbDescription:text(at(row,h,['Print & Emb Description'])),
        fabricEmbellishment:text(at(row,h,['Fabric Embllishment'])), remarks:text(at(row,h,['Remarks'])), floor:text(at(row,h,['Floor'])), ppStatus:text(at(row,h,['PP Status'])), ppSentDate:dateIso(at(row,h,['PP sent date'])), presentStatus:text(at(row,h,['PRESENT STATUS'])),
        fabricReceived:num(at(row,h,['Fabric Received','Fabric   Received'])), fabricBalance:num(at(row,h,['Fabric Balance','Fabric  Balance'])), cuttingQty:int(at(row,h,['Cutting Qty'])), cuttingBalance:int(at(row,h,['Cutting Balance'])),
        printEmbRequired:int(at(row,h,['Print/Embr. Require'])), printSend:int(at(row,h,['Print Send'])), printReceived:int(at(row,h,['Print rcvd'])), printReceiveBalance:int(at(row,h,['Recv balance'])), readyForInput:int(at(row,h,['Ready for Input'])), inputQty:int(at(row,h,['Input Qty'])), inputBalance:int(at(row,h,['Input Balance'])),
        packingQty:int(at(row,h,['Packing Qty'])), packingBalance:int(at(row,h,['Packing Balance'])), shipQty:int(at(row,h,['Ship Qty'])), shipBalance:int(at(row,h,['Ship Balance'])), week:text(at(row,h,['Week'])), slot:text(at(row,h,['Slot'])), sewingLeadTimeDays:int(at(row,h,['Sewing lead time'])), garmentLeadTimeDays:int(at(row,h,['GMT Lead time'])), fileReceivedDate:dateIso(at(row,h,['File Rcvd Date'])),
      };
      normalizeReportMasters(n);
      out.push({sourceType:'TNA_PLAN_EXECUTION',dataset:'central-report',sheetName:'Central report',rowNumber:i+1,rawData:rawFromHeaders(row,headers),normalizedData:n,targetModules:['merchandising','ta','capacity','cutting','printing','embroidery','sewing','finishing','shipment','sewing-planning'],references:[...refsFromNormalized(n,['BUYER','SEWING_LINE','MERCHANDISER','FLOOR','PRESENT_STATUS'])]});
    }
  }
  const leName=workbook.SheetNames.find(x=>x.toLowerCase().includes('line execution'));
  const le=leName?workbook.Sheets[leName]:undefined;
  if(le){
    const matrix=sheetMatrix(le); const headers=matrix[1]||[]; const h=headerObject(headers);
    for(let i=2;i<matrix.length;i++){
      const row=matrix[i]; const jobNo=at(row,h,['Job']); if(!isDataJob(jobNo)) continue;
      const n:any={line:text(at(row,h,['Line'])),jobNo:canonicalJob(jobNo),jobBaseNo:jobBaseNo(jobNo),sourceJobNo:text(jobNo),styleNo:text(at(row,h,['Style'])),item:text(at(row,h,['Item'])),machineQty:int(at(row,h,['No of M/C'])),orderQty:int(at(row,h,['O.Qty'])),planQty:int(at(row,h,['Plan qty'])),fabricRequiredKg:num(at(row,h,['Fab Req.'])),fabricDeliveredKg:num(at(row,h,['Fab Del.'])),fabricBalanceKg:num(at(row,h,['Fab Bal.'])),preProductionStatus:text(at(row,h,['Pre Production Status'])),presentStatus:text(at(row,h,['Present Status']))};
      normalizeReportMasters(n);
      out.push({sourceType:'TNA_PLAN_EXECUTION',dataset:'line-execution',sheetName:leName!,rowNumber:i+1,rawData:rawFromHeaders(row,headers),normalizedData:n,targetModules:['sewing','ie-bulletin','sewing-planning'],references:refsFromNormalized(n,['SEWING_LINE','PRESENT_STATUS'])});
    }
  }
  return out;
}

function extractCutting(workbook:XLSX.WorkBook):ExtractedReportRow[]{
  const name=workbook.SheetNames.find(x=>x.trim()==='Production')||workbook.SheetNames.find(x=>x.toLowerCase().includes('production'));
  if(!name) return []; const ws=workbook.Sheets[name]; const matrix=sheetMatrix(ws); const headers=matrix[3]||[]; const h=headerObject(headers); const out:ExtractedReportRow[]=[];
  for(let i=4;i<matrix.length;i++){
    const row=matrix[i]; if(/^(sub\s*total|grand\s*total|total)$/i.test(text(row[0]))) continue; const jobNo=at(row,h,['Job No']); if(!isDataJob(jobNo)) continue;
    const n:any={buyer:text(at(row,h,['Buyer Name'])),jobNo:canonicalJob(jobNo),jobBaseNo:jobBaseNo(jobNo),sourceJobNo:text(jobNo),styleNo:text(at(row,h,['Style'])),color:text(at(row,h,['Color'])),orderQty:int(at(row,h,['Ord . Qty'])),dyeingPlanDate:dateIso(at(row,h,['T& A Plan ( Deying )'])),cuttingPlanDate:dateIso(at(row,h,['Cutting T & A Plan'])),sewingFloor:text(at(row,h,['Sewing Floor'])),shipDate:dateIso(at(row,h,['Ship Date'])),todayCutting:int(at(row,h,['Today Cutting'])),totalCutting:int(at(row,h,['Total Cutting'])),cuttingBalance:int(at(row,h,['Cutting Balance'])),firstPrintSentDate:dateIso(at(row,h,['First Print Sent Date'])),todayPrintSent:int(at(row,h,['Today Print Sent'])),totalPrintSend:int(at(row,h,['Total Print Send'])),todayPrintReceived:int(at(row,h,['Today Print Rcvd'])),totalPrintReceive:int(at(row,h,['Total Print Recv'])),printBalance:int(at(row,h,['Print Balance'])),readyForInput:int(at(row,h,['Total Ready for Input'])),todayInput:int(at(row,h,['Today Input'])),totalInput:int(at(row,h,['Total Inp'])),inputBalance:int(at(row,h,['Inp Balance'])),printEmbType:text(at(row,h,['Print/Emb'])),factoryName:text(at(row,h,['Factory Name'])),scheduleCloseDate:dateIso(at(row,h,['Schedule Close Date'])),remarks:text(at(row,h,['Remarks'])),shortReason:text(at(row,h,['Reason of short'])),presentStatus:text(at(row,h,['Present status'])),cutBalancePct:num(at(row,h,['Cut Bal %'])),cutBalance:int(at(row,h,['Cut Bal'])),printReceiveShort:int(at(row,h,['Print Rcv short'])),inputShort:int(at(row,h,['Inout short']))};
    normalizeReportMasters(n);
    out.push({sourceType:'CUTTING_PRINT_INPUT',dataset:'color-production',sheetName:name,rowNumber:i+1,rawData:rawFromHeaders(row,headers),normalizedData:n,targetModules:['cutting','printing','embroidery','sewing','merchandising'],references:refsFromNormalized(n,['BUYER','SEWING_FLOOR','PRINT_EMB_TYPE','PROCESS_FACTORY','PRESENT_STATUS'])});
  }
  return out;
}

function extractDyeing(workbook:XLSX.WorkBook):ExtractedReportRow[]{
  const out:ExtractedReportRow[]=[];
  for(const name of workbook.SheetNames.filter(x=>x!=='Summary')){
    const matrix=sheetMatrix(workbook.Sheets[name]); if(matrix.length<8) continue;
    const h7=matrix[6]||[]; if(!h7.some((x:any)=>clean(x)==='additional process') || !h7.some((x:any)=>clean(x)==='total require')) continue;
    for(let i=7;i<matrix.length;i++){
      const r=matrix[i]; const jobNo=r[1]; if(!isDataJob(jobNo)) continue;
      const n:any={buyer:text(r[0]),jobNo:canonicalJob(jobNo),jobBaseNo:jobBaseNo(jobNo),sourceJobNo:text(jobNo),styleNo:text(r[2]),additionalProcess:text(r[3]),gsm:text(r[4]),widthDia:text(r[5]),color:text(r[6]),fabricDescription:text(r[7]),bodyRequiredKg:num(r[8]),lRibRequiredKg:num(r[9]),sJerseyRequiredKg:num(r[10]),totalRequiredKg:num(r[11]),knittingStart:dateIso(r[12]),knittingEnd:dateIso(r[13]),greyBodyKg:num(r[14]),greyLRibKg:num(r[15]),greySJerseyKg:num(r[16]),greyReady:text(r[17]),dyeingFactory:text(r[18]),batchNo:text(r[19]),dyeingDate:dateIso(r[20]),dyeingSendDate:dateIso(r[21]),dyeingSendQtyKg:num(r[22]),dyeingReceiveDate:dateIso(r[23]),dyeingBodyKg:num(r[24]),dyeingLRibKg:num(r[25]),dyeingSJerseyKg:num(r[26]),totalDyeingKg:num(r[27]),aopFactory:text(r[28]),aopSendDate:dateIso(r[29]),aopSendQtyKg:num(r[30]),aopReceiveDate:dateIso(r[31]),aopReceiveQtyKg:num(r[32]),aopBalanceKg:num(r[33]),peachFactory:text(r[34]),peachSendDate:dateIso(r[35]),peachSendQtyKg:num(r[36]),peachReceiveDate:dateIso(r[37]),peachReceiveQtyKg:num(r[38]),peachBalanceKg:num(r[39]),brushFactory:text(r[40]),brushSendDate:dateIso(r[41]),brushSendQtyKg:num(r[42]),brushReceiveDate:dateIso(r[43]),brushReceiveQtyKg:num(r[44]),brushBalanceKg:num(r[45]),shearingFactory:text(r[46]),shearingSendDate:dateIso(r[47]),shearingSendQtyKg:num(r[48]),shearingReceiveDate:dateIso(r[49]),shearingReceiveQtyKg:num(r[50]),shearingBalanceKg:num(r[51]),singeingFactory:text(r[52]),singeingSendDate:dateIso(r[53]),singeingSendQtyKg:num(r[54]),singeingReceiveDate:dateIso(r[55]),singeingReceiveQtyKg:num(r[56]),singeingBalanceKg:num(r[57]),finishingFactory:text(r[58]),finishingSendDate:dateIso(r[59]),finishingSendQtyKg:num(r[60]),finishingReceiveDate:dateIso(r[61]),finishingReceiveQtyKg:num(r[62]),finishingBalanceKg:num(r[63]),deliveryPendingKg:num(r[64]),dyeingDeliveryPlanStart:dateIso(r[65]),dyeingDeliveryPlanEnd:dateIso(r[66]),aopPlanStart:dateIso(r[67]),aopPlanEnd:dateIso(r[68]),actualDyeingDeliveryStart:dateIso(r[69]),actualDyeingDeliveryEnd:dateIso(r[70]),bodyChallanNo:text(r[71]),bodyDeliveredKg:num(r[72]),lRibChallanNo:text(r[73]),lRibDeliveredKg:num(r[74]),sJerseyChallanNo:text(r[75]),sJerseyDeliveredKg:num(r[76]),totalDeliveryKg:num(r[77]),bodyBalanceKg:num(r[78]),lRibBalanceKg:num(r[79]),sJerseyBalanceKg:num(r[80]),totalBalanceKg:num(r[81]),balancePct:num(r[82]),brand:text(r[83]),merchandiser:text(r[84]),remarks:text(r[85]),slotNo:text(r[86])};
      const raw:Record<string,any>={}; h7.forEach((x:any,j:number)=>{ if(text(x)&&r[j]!==''&&r[j]!==undefined) raw[`${text(x)} [${j+1}]`]=r[j]; });
      normalizeReportMasters(n);
      if(!n.buyer) continue; // reject summary/total/factory rows that only look numeric in the Job column
      out.push({sourceType:'FINISH_FABRIC_DYEING',dataset:'fabric-execution',sheetName:name,rowNumber:i+1,rawData:raw,normalizedData:n,targetModules:['knitting','greige-store','dyeing','fabric-finishing','finished-fabric','merchandising'],references:refsFromNormalized(n,['BUYER','ADDITIONAL_PROCESS','DYEING_FACTORY','AOP_FACTORY','PEACH_FACTORY','BRUSH_FACTORY','SHEARING_FACTORY','SINGEING_FACTORY','FINISHING_FACTORY','MERCHANDISER'])});
    }
  }
  return out;
}

function ieFileIdentity(fileName:string){
  const base=text(fileName).replace(/\.(xlsx?|xlsm)$/i,'');
  const m=base.match(/job\s*&?\s*style\s*#?\s*([A-Za-z0-9.\/-]+)\s*&\s*([A-Za-z0-9.\/-]+)/i);
  if(m)return {jobNo:canonicalJob(m[1]),styleNo:text(m[2])};
  const j=base.match(/(?:job|job\s*no)\s*#?\s*[:.-]?\s*([A-Za-z0-9.\/-]+)/i);
  const st=base.match(/(?:style|style\s*no)\s*#?\s*[:.-]?\s*([A-Za-z0-9.\/-]+)/i);
  return {jobNo:j?canonicalJob(j[1]):'',styleNo:st?text(st[1]):''};
}
function labeledValue(matrix:any[][],aliases:string[]){
  const aa=aliases.map(clean);
  for(let r=0;r<Math.min(matrix.length,80);r++)for(let c=0;c<Math.min((matrix[r]||[]).length,40);c++){
    const here=clean(matrix[r]?.[c]); if(!here)continue;
    if(!aa.some(a=>here===a||here.startsWith(`${a} `)||here.includes(a)))continue;
    for(let dc=1;dc<=4;dc++){const v=matrix[r]?.[c+dc];if(text(v))return v;}
    for(let dr=1;dr<=2;dr++){const v=matrix[r+dr]?.[c];if(text(v))return v;}
  }
  return '';
}
function looksMachineName(v:any){
  const s=clean(v);
  return /\b(snls|single needle|overlock|o\/l|ol\b|flatlock|flat lock|kansai|bartack|bar tack|button hole|button stitch|feed of arm|foa|zig ?zag|chain stitch|cylinder bed|elastic|eyelet|snap)\b/.test(s);
}
function machineRequirementsFromMatrix(matrix:any[][]){
  const totals=new Map<string,number>();
  const add=(name:any,qty:any)=>{const n=text(name);const q=int(qty);if(!n||!q||q<=0||/^total$/i.test(n))return;totals.set(n,(totals.get(n)||0)+q)};
  for(let r=0;r<Math.min(matrix.length,160);r++){
    const row=matrix[r]||[]; const norm=row.map(clean);
    const mc=norm.findIndex(x=>x==='machine type'||x==='m c type'||x==='m/c type'||x==='machine'||x==='machine name'||x.includes('machine type'));
    let qc=norm.findIndex(x=>['qty','quantity','nos','no','no of m c','no of mc','machine qty','m c qty'].includes(x)||x.includes('machine qty'));
    if(mc<0)continue;
    if(qc<0)qc=mc+1;
    let blanks=0;
    for(let i=r+1;i<Math.min(matrix.length,r+120);i++){
      const name=matrix[i]?.[mc], q=matrix[i]?.[qc];
      if(!text(name)&&!text(q)){if(++blanks>=4)break;continue} blanks=0;
      if(looksMachineName(name)||int(q)!==null)add(name,q);
    }
  }
  return Array.from(totals.entries()).map(([machineType,qty])=>({machineType,qty}));
}
function machineRequirementsFromSummary(headers:any[],row:any[]){
  const out:{machineType:string;qty:number}[]=[];
  headers.forEach((h,i)=>{const q=int(row[i]);if(q&&q>0&&looksMachineName(h))out.push({machineType:text(h),qty:q})});
  return out;
}
function findIeHeaderIndex(matrix:any[][]){
  for(let i=0;i<Math.min(matrix.length,20);i++){
    const tokens=(matrix[i]||[]).map(clean);
    const hasJob=tokens.some(x=>x==='job'||x==='job no'||x==='job number'||x.startsWith('job '));
    const hasIe=tokens.some(x=>x==='actual smv'||x==='smv'||x.includes('no of m c')||x==='tgt'||x==='target');
    if(hasJob&&hasIe)return i;
  }
  return -1;
}
function extractIe(workbook:XLSX.WorkBook,sourceFileName=''):ExtractedReportRow[]{
  const out:ExtractedReportRow[]=[];
  for(const name of workbook.SheetNames){
    const matrix=sheetMatrix(workbook.Sheets[name]); const headerIndex=findIeHeaderIndex(matrix); if(headerIndex<0)continue;
    const headers=matrix[headerIndex]||[]; const h=headerObject(headers);
    for(let i=headerIndex+1;i<matrix.length;i++){
      const row=matrix[i]; const jobNo=at(row,h,['Job','Job No']); if(!isDataJob(jobNo))continue;
      const machineRequirements=machineRequirementsFromSummary(headers,row);
      const operator=int(at(row,h,['Operator','Operator Qty','No of Operator']));
      const helper=int(at(row,h,['Helper','Helper Qty','No of Helper']));
      const finishingManpower=int(at(row,h,['Finishing Manpower','Finishing','Ironman']));
      const explicitManpower=int(at(row,h,['Total Manpower','Manpower','MP']));
      const manpower=explicitManpower??((operator||0)+(helper||0)+(finishingManpower||0)||null);
      const n:any={line:text(at(row,h,['Line'])),buyer:text(at(row,h,['Buyer'])),jobNo:canonicalJob(jobNo),jobBaseNo:jobBaseNo(jobNo),sourceJobNo:text(jobNo),styleNo:text(at(row,h,['Style','Style No'])),item:text(at(row,h,['Item'])),sewingStartDate:dateIso(at(row,h,['Sewing Start Date'])),orderQty:int(at(row,h,['O.Qty','Order Qty'])),machineQty:int(at(row,h,['No of M/C','Machine Qty','Total Machine']))??(machineRequirements.reduce((s,x)=>s+x.qty,0)||null),smv:num(at(row,h,['Actual SMV','SMV'])),dailyTarget:int(at(row,h,['TGT','Target','Daily Target'])),operator,helper,finishingManpower,manpower,efficiencyPct:num(at(row,h,['Efficiency','Efficiency %','Achievable Efficiency'])),revision:int(at(row,h,['Revision','Rev','Revision No'])),bulletinDate:dateIso(at(row,h,['Bulletin Date','IE Date','Date'])),machineRequirements,reducedSmv:num(at(row,h,['After Reduce 5%','After  Reduce 5%'])),revisedTarget:int(at(row,h,['After TGT','After  TGT'])),variancePcs:int(at(row,h,['Varience PCS','Variance PCS'])),remarks:text(at(row,h,['Remarks'])),presentStatus:text(at(row,h,['Remarks'])),merchandiser:text(at(row,h,['Merchant Name','Merchandiser'])),cuttingSmv:num(at(row,h,['Cutting SMV'])),cmPerDozen:num(at(row,h,['CM $/ dzn'])),costingSmv:num(at(row,h,['Costing SMV'])),costDevPerPcs:num(at(row,h,['Cost Dev/ Pcs']))};
      normalizeReportMasters(n);
      out.push({sourceType:'IE_BULLETIN',dataset:'ie-summary',sheetName:name,rowNumber:i+1,rawData:rawFromHeaders(row,headers),normalizedData:n,targetModules:['ie-bulletin','sewing','sewing-planning','maintenance'],references:refsFromNormalized(n,['SEWING_LINE','BUYER','MERCHANDISER','PRESENT_STATUS'])});
    }
  }
  if(out.length)return out;

  // Detailed single-style operation bulletins often do not have the monthly Summary layout.
  // Extract only the operational summary needed by ERP and keep the original workbook in Import Batch audit history.
  const fileId=ieFileIdentity(sourceFileName);
  for(const name of workbook.SheetNames){
    const matrix=sheetMatrix(workbook.Sheets[name]); if(!matrix.length)continue;
    let jobNo=text(labeledValue(matrix,['Job No','Job Number','Job'])); if(!isDataJob(jobNo))jobNo=fileId.jobNo;
    if(!isDataJob(jobNo))continue;
    const styleNo=text(labeledValue(matrix,['Style No','Style Number','Style']))||fileId.styleNo||'UNSPECIFIED';
    const machineRequirements=machineRequirementsFromMatrix(matrix);
    const operator=int(labeledValue(matrix,['Operator','No of Operator','Operator Qty']));
    const helper=int(labeledValue(matrix,['Helper','No of Helper','Helper Qty']));
    const finishingManpower=int(labeledValue(matrix,['Finishing Manpower','Finishing Operator','Ironman']));
    const explicitManpower=int(labeledValue(matrix,['Total Manpower','Total Man Power','Manpower']));
    const manpower=explicitManpower??((operator||0)+(helper||0)+(finishingManpower||0)||null);
    const explicitMachine=int(labeledValue(matrix,['Total Machine','Total M/C','No of M/C','Machine Qty']));
    const machineQty=explicitMachine??(machineRequirements.reduce((s,x)=>s+x.qty,0)||null);
    const n:any={jobNo:canonicalJob(jobNo),jobBaseNo:jobBaseNo(jobNo),sourceJobNo:text(jobNo),styleNo,item:text(labeledValue(matrix,['Item','Item Description'])),line:text(labeledValue(matrix,['Line','Sewing Line'])),buyer:text(labeledValue(matrix,['Buyer','Buyer Name'])),merchandiser:text(labeledValue(matrix,['Merchant Name','Merchandiser'])),smv:num(labeledValue(matrix,['Actual SMV','Total SMV','SMV'])),dailyTarget:int(labeledValue(matrix,['Daily Target','Target','TGT'])),operator,helper,finishingManpower,manpower,machineQty,efficiencyPct:num(labeledValue(matrix,['Achievable Efficiency','Efficiency %','Efficiency'])),revision:int(labeledValue(matrix,['Revision No','Revision','Rev'])),bulletinDate:dateIso(labeledValue(matrix,['Bulletin Date','IE Date','Date'])),machineRequirements,remarks:text(labeledValue(matrix,['Remarks','Remark']))};
    normalizeReportMasters(n);
    out.push({sourceType:'IE_BULLETIN',dataset:'ie-detailed-bulletin',sheetName:name,rowNumber:1,rawData:{sourceFileName,sheet:name},normalizedData:n,targetModules:['ie-bulletin','sewing','sewing-planning','maintenance'],references:refsFromNormalized(n,['SEWING_LINE','BUYER','MERCHANDISER'])});
    break;
  }
  return out;
}


function extractErpMaster(workbook:XLSX.WorkBook):ExtractedReportRow[]{
  const name=findErpMasterSheetName(workbook); if(!name)return[];
  const ws=workbook.Sheets[name]; if(!ws)return[];
  const rows=XLSX.utils.sheet_to_json<Record<string,any>>(ws,{defval:'',raw:true}); const out:ExtractedReportRow[]=[];
  const v=(r:Record<string,any>,k:string)=>r[k];
  for(let i=0;i<rows.length;i++){
    const r=rows[i]; const jobNo=v(r,'Job_No'); if(!isDataJob(jobNo))continue;
    const n:any={
      buyer:text(v(r,'Buyer')),jobNo:canonicalJob(jobNo),jobBaseNo:jobBaseNo(jobNo),sourceJobNo:text(jobNo),styleNo:text(v(r,'Style_No')),orderQty:int(v(r,'Order_Qty_Pcs')),merchandiser:text(v(r,'Merchandiser')),item:text(v(r,'Item')),itemDescription:text(v(r,'Item_Description')),presentStatus:text(v(r,'Present_Status')),remarks:text(v(r,'Remarks')),
      poReceivedDate:dateIso(v(r,'PO_Received_Date')),taPlanDate:dateIso(v(r,'TNA_Plan_Date')),tnaStatus:text(v(r,'TNA_Status')),tnaApprovedDate:dateIso(v(r,'TNA_Approved_Date')),
      fabricRequiredKg:num(v(r,'Fabric_Req_Kg')),fabricReceived:num(v(r,'Fabric_Received_Kg')),fabricBalance:num(v(r,'Fabric_Balance_Kg')),fabricType:text(v(r,'Fabric_Type')),gsm:text(v(r,'GSM')),widthDia:text(v(r,'Width_Dia')),additionalProcess:text(v(r,'Additional_Process')),dyeingFactory:text(v(r,'Dyeing_Factory')),batchNo:text(v(r,'Dye_Batch_No')),colors:text(v(r,'Colors')),colorCount:int(v(r,'Color_Count')),consumptionKgDozen:num(v(r,'Consumption_Kg_Dozen')),
      yarnReqKg:num(v(r,'Yarn_Req_Kg')),yarnReceivedKg:num(v(r,'Yarn_Received_Kg')),yarnIssuedKg:num(v(r,'Yarn_Issued_Kg')),yarnBalanceKg:num(v(r,'Yarn_Balance_Kg')),yarnLotNo:text(v(r,'Yarn_Lot_No')),yarnStoreStatus:text(v(r,'Yarn_Store_Status')),yarnDyeingStart:dateIso(v(r,'Yarn_Dye_Plan_Start')),yarnDyeingEnd:dateIso(v(r,'Yarn_Dye_Plan_End')),
      knittingStart:dateIso(v(r,'Knitting_Plan_Start')),knittingEnd:dateIso(v(r,'Knitting_Plan_End')),greyRequiredKg:num(v(r,'Grey_Req_Kg')),greyProducedKg:num(v(r,'Grey_Produced_Kg')),greyBalanceKg:num(v(r,'Grey_Balance_Kg')),knittingStatus:text(v(r,'Knitting_Status')),
      dyeingFinishingStart:dateIso(v(r,'Dyeing_Plan_Start')),dyeingFinishingEnd:dateIso(v(r,'Dyeing_Plan_End')),dyeingRequiredKg:num(v(r,'Dyeing_Req_Kg')),dyeingReceivedKg:num(v(r,'Dyeing_Received_Kg')),dyeingBalanceKg:num(v(r,'Dyeing_Balance_Kg')),dyeingStatus:text(v(r,'Dyeing_Status')),
      trimsInhouseDate:dateIso(v(r,'Trims_Plan_End')),trimsReadinessPct:num(v(r,'Trims_Readiness_Pct')),trimsStatus:text(v(r,'Trims_Status')),fileHandoverDate:dateIso(v(r,'File_Handover_Date')),ppMeetingDate:dateIso(v(r,'PP_Meeting_Date')),ppStatus:text(v(r,'PP_Status')),
      cuttingStart:dateIso(v(r,'Cutting_Plan_Start')),cuttingEnd:dateIso(v(r,'Cutting_Plan_End')),cuttingQty:int(v(r,'Cutting_Qty')),cuttingBalance:int(v(r,'Cutting_Balance')),cuttingStatus:text(v(r,'Cutting_Status')),
      printEmbType:text(v(r,'Print_Emb_Type')),printEmbRequired:int(v(r,'Print_Emb_Req_Qty')),printSend:int(v(r,'Print_Emb_Send_Qty')),printReceived:int(v(r,'Print_Emb_Recv_Qty')),printReceiveBalance:int(v(r,'Print_Emb_Balance')),printEmbStatus:text(v(r,'Print_Emb_Status')),
      readyForInput:int(v(r,'Ready_For_Input_Qty')),inputQty:int(v(r,'Sewing_Input_Qty')),inputBalance:int(v(r,'Input_Balance')),inputStatus:text(v(r,'Input_Status')),
      ieBulletinStatus:text(v(r,'IE_Bulletin_Status')),ieReleaseDate:dateIso(v(r,'IE_Bulletin_Release_Date')),smv:num(v(r,'IE_SMV')),machineQty:int(v(r,'IE_Machine_Qty')),manpower:int(v(r,'IE_Manpower')),efficiencyPct:num(v(r,'IE_Efficiency_Pct')),targetPerHour:int(v(r,'IE_Target_Pcs_Per_Hour')),dailyTarget:int(v(r,'IE_Daily_Target_Pcs')),ieDataSource:text(v(r,'IE_Data_Source')),
      factory:text(v(r,'Factory')).toUpperCase(),floor:text(v(r,'Floor')),line:text(v(r,'Primary_Line')),secondaryLine:text(v(r,'Secondary_Line')),lineType:text(v(r,'Line_Type')),shiftMode:text(v(r,'Shift_Mode')),shiftAHours:num(v(r,'Shift_A_Hours')),shiftBHours:num(v(r,'Shift_B_Hours')),overtimeHours:num(v(r,'OT_Hours')),workingHours:num(v(r,'Capacity_Hours')),
      linePlanStart:dateIso(v(r,'Line_Plan_Start')),linePlanEnd:dateIso(v(r,'Line_Plan_End')),linePlanStatus:text(v(r,'Line_Plan_Status')),splitRatioPrimary:num(v(r,'Split_Ratio_Primary')),
      sewingStartDate:dateIso(v(r,'Sewing_Plan_Start')),sewingEnd:dateIso(v(r,'Sewing_Plan_End')),sewingActualQty:int(v(r,'Sewing_Actual_Qty')),sewingBalance:int(v(r,'Sewing_Balance')),achievementPct:num(v(r,'Sewing_Achievement_Pct')),sewingStatus:text(v(r,'Sewing_Status')),
      garmentWashStart:dateIso(v(r,'Garment_Wash_Plan_Start')),garmentWashEnd:dateIso(v(r,'Garment_Wash_Plan_End')),finishingEnd:dateIso(v(r,'Finishing_Plan_End')),finishingQty:int(v(r,'Finishing_Qty')),finishingBalance:int(v(r,'Finishing_Balance')),finishingStatus:text(v(r,'Finishing_Status')),packingQty:int(v(r,'Packing_Qty')),packingBalance:int(v(r,'Packing_Balance')),packingStatus:text(v(r,'Packing_Status')),
      preFinalInspection:dateIso(v(r,'Pre_Final_Inspection_Date')),finalInspection:dateIso(v(r,'Final_Inspection_Date')),inspectionStatus:text(v(r,'Inspection_Status')),exFactoryDate:dateIso(v(r,'Ex_Factory_Date')),cargoClosingDate:dateIso(v(r,'Cargo_Closing_Date')),shipQty:int(v(r,'Ship_Qty')),shipBalance:int(v(r,'Ship_Balance')),shipmentStatus:text(v(r,'Shipment_Status')),
      riskStatus:text(v(r,'Risk_Status')),overallStage:text(v(r,'Overall_Stage')),dataQuality:text(v(r,'Data_Quality')),sourceDateMode:text(v(r,'Source_Date_Mode')),linePlanApprovedDate:dateIso(v(r,'Line_Plan_Approved_Date')),approvedBy:text(v(r,'Approved_By')),revisionNo:int(v(r,'Revision_No'))
    };
    normalizeReportMasters(n);
    out.push({sourceType:'ERP_MASTER_IMPORT',dataset:'erp-master',sheetName:name,rowNumber:i+2,rawData:r,normalizedData:n,targetModules:['merchandising','ta','yarn-store','yarn-dyeing','knitting','greige-store','dyeing','fabric-finishing','finished-fabric','cutting','printing','embroidery','ie-bulletin','sewing-planning','sewing','finishing','shipment'],references:refsFromNormalized(n,['BUYER','SEWING_LINE','MERCHANDISER','FLOOR','PRESENT_STATUS','PRINT_EMB_TYPE','DYEING_FACTORY','ADDITIONAL_PROCESS'])});
  }
  return out;
}

export function extractWorkbook(workbook:XLSX.WorkBook, forced?:ReportType, sourceFileName=''):{reportType:ReportType;rows:ExtractedReportRow[];sheets:string[]}{
  const reportType=forced&&forced!=='GENERIC'?forced:detectReportType(workbook);
  let rows:ExtractedReportRow[]=[];
  if(reportType==='ERP_MASTER_IMPORT') rows=extractErpMaster(workbook);
  else if(reportType==='TNA_PLAN_EXECUTION') rows=extractTna(workbook);
  else if(reportType==='CUTTING_PRINT_INPUT') rows=extractCutting(workbook);
  else if(reportType==='FINISH_FABRIC_DYEING') rows=extractDyeing(workbook);
  else if(reportType==='IE_BULLETIN') rows=extractIe(workbook,sourceFileName);
  return {reportType,rows,sheets:workbook.SheetNames};
}

export const REPORT_TYPE_LABELS:Record<ReportType,string>={
  ERP_MASTER_IMPORT:'NFL Pulse ERP Master Demo / Canonical Import', TNA_PLAN_EXECUTION:'T&A Plan & Execution', CUTTING_PRINT_INPUT:'Cutting, Print & Input Summary', FINISH_FABRIC_DYEING:'Finish Fabric / Dyeing Plan & Execution', IE_BULLETIN:'IE Bulletin Summary', GENERIC:'Generic Excel'
};
