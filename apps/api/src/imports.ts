import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';
import * as XLSX from 'xlsx';
import { detectReportType, extractWorkbook, REPORT_TYPE_LABELS, ReportType, text } from './report-profiles';
import { cleanBuyer } from './master-cleaner';

type FieldDef = { key: string; label: string; aliases: string[]; required?: boolean };
type ImportDef = { slug: string; name: string; group: string; fields: FieldDef[] };
const json = (v:any) => JSON.parse(JSON.stringify(v ?? {})) as Prisma.InputJsonValue;
const normalizedKey = (v:any) => text(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const safeInt = (v:any, fallback=0) => { const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.round(n)):fallback; };

const commonJobFields:FieldDef[]=[
  {key:'jobNo',label:'Job No',aliases:['job no','job','job number','job#'],required:true},{key:'buyer',label:'Buyer',aliases:['buyer','buyer name','brand']},{key:'styleNo',label:'Style No',aliases:['style','style no','style number']},{key:'itemDescription',label:'Item Description',aliases:['item','item description','description']},{key:'orderQty',label:'Order Qty',aliases:['order qty','qty','quantity']},{key:'color',label:'Color',aliases:['color','colour']},{key:'status',label:'Status',aliases:['status','present status']},{key:'remarks',label:'Remarks',aliases:['remarks','remark','comments']}
];
const IMPORT_CATALOG:ImportDef[]=[{slug:'order-running',name:'Generic Order / Running Data',group:'Manual fallback',fields:commonJobFields}];
function clean(v:any){return String(v??'').trim().toLowerCase().replace(/[_\-./]+/g,' ').replace(/\s+/g,' ')}
function autoMapping(headers:string[],fields:FieldDef[]){const result:Record<string,string>={};for(const f of fields){const aliases=[f.label,...f.aliases].map(clean);const exact=headers.find(h=>aliases.includes(clean(h)));if(exact)result[f.key]=exact;else{const fuzzy=headers.find(h=>aliases.some(a=>clean(h).includes(a)||a.includes(clean(h))));if(fuzzy)result[f.key]=fuzzy}}return result}
function normalize(raw:any,mapping:Record<string,string>){const out:any={};for(const [key,col] of Object.entries(mapping||{}))if(col)out[key]=raw?.[col]??'';return out}
function validate(normalized:any,fields:FieldDef[]){return fields.filter(f=>f.required&&!String(normalized?.[f.key]??'').trim()).map(f=>`${f.label} is required`)}

async function ensureReference(prisma:PrismaService,category:string,value:any,batchId?:string){
  const val=text(value); if(!val||val==='0'||val.startsWith('#')) return;
  const normalized=normalizedKey(val); if(!normalized) return;
  await prisma.referenceValue.upsert({where:{category_normalized:{category,normalized}},update:{active:true,value:val},create:{category,value:val,normalized,source:'FACTORY_REPORT_IMPORT',sourceBatchId:batchId}});
}
async function ensureFactory(prisma:PrismaService,code='NFL',name?:string){return prisma.factory.upsert({where:{code},update:{active:true,name:name||code},create:{code,name:name||code,active:true}})}
async function ensureBuyer(prisma:PrismaService,buyerValue:any){
  const cleaned=cleanBuyer(buyerValue);
  if(!cleaned.value){
    return prisma.buyer.upsert({where:{code:'UNMAPPED'},update:{name:'Pending Buyer Review',active:false},create:{code:'UNMAPPED',name:'Pending Buyer Review',active:false}});
  }
  const name=cleaned.value; const code=name.slice(0,80);
  return prisma.buyer.upsert({where:{code},update:{name,active:true},create:{code,name,active:true}});
}
const NFL_FLOOR_BY_LINE:Record<string,string>={
  A1:'Sewing-01',A2:'Sewing-01',B:'Sewing-01',B2:'Sewing-01',C:'Sewing-01',C2:'Sewing-01',D1:'Sewing-01',D2:'Sewing-01',E1:'Sewing-01',E2:'Sewing-01',F:'Sewing-01',G1:'Sewing-01',G2:'Sewing-01',H1:'Sewing-01',H2:'Sewing-01',
  J1:'Sewing-02',J2:'Sewing-02',K1:'Sewing-02',K2:'Sewing-02',L1:'Sewing-02',L2:'Sewing-02',M1:'Sewing-02',M2:'Sewing-02',N1:'Sewing-02',N2:'Sewing-02',O1:'Sewing-02',O2:'Sewing-02',P1:'Sewing-02',P2:'Sewing-02',Q1:'Sewing-02',Q2:'Sewing-02',R1:'Sewing-02',R2:'Sewing-02',R3:'Sewing-02',
  S1:'Sewing-03',S2:'Sewing-03',T1:'Sewing-03',T2:'Sewing-03',U1:'Sewing-03',U2:'Sewing-03',X1:'Sewing-03',Y1:'Sewing-03',Y2:'Sewing-03',Z1:'Sewing-03',Z2:'Sewing-03',U:'Sewing-03',V1:'Sewing-03',V2:'Sewing-03',W1:'Sewing-03',W2:'Sewing-03',ZA1:'Sewing-03',ZA2:'Sewing-03'
};
function nclFloorForLine(line:string){
  if(/^[1-7]$/.test(line))return 'S-01';
  const m=line.match(/^(\d{1,2})[AB]$/); if(!m)return null; const no=Number(m[1]);
  if(no>=8&&no<=15)return 'S-02'; if(no>=16&&no<=23)return 'S-03'; return null;
}
function floorIdentity(n:any){
  const line=text(n.line).toUpperCase(); const rawFloor=text(n.floor||n.sewingFloor); const f=rawFloor.toUpperCase(); const explicit=text(n.factory||n.factoryCode).toUpperCase();
  const factory=(explicit==='NCL'||f==='NCL'||/^S-?0?[123]$/.test(f))?'NCL':'NFL';
  if(factory==='NCL'){
    const aliases:Record<string,string>={'S1':'S-01','S-1':'S-01','S-01':'S-01','S2':'S-02','S-2':'S-02','S-02':'S-02','S3':'S-03','S-3':'S-03','S-03':'S-03'};
    const floorCode=aliases[f]||nclFloorForLine(line)||'S-UNASSIGNED'; return {factory,floorCode,floorName:floorCode};
  }
  const aliases:Record<string,string>={'NFL1':'Sewing-01','SEWING-1':'Sewing-01','SEWING-01':'Sewing-01','NFL2':'Sewing-02','SEWING-2':'Sewing-02','SEWING-02':'Sewing-02','NFL3':'Sewing-03','SEWING-3':'Sewing-03','SEWING-03':'Sewing-03'};
  const floorCode=aliases[f]||NFL_FLOOR_BY_LINE[line]||'Sewing-Unassigned'; return {factory:'NFL',floorCode,floorName:floorCode};
}
async function ensureLine(prisma:PrismaService,n:any){
  const lineValue=text(n.line); if(!lineValue) return null;
  const fi=floorIdentity(n); const factory=await ensureFactory(prisma,fi.factory,fi.factory==='NCL'?'Northern Clothing Limited':'Northern Fashions Limited');
  let floor=await prisma.floor.findFirst({where:{code:fi.floorCode,section:{factoryId:factory.id}}});
  if(!floor){
    const sectionCode=fi.floorCode.toUpperCase();
    const section=await prisma.section.upsert({where:{factoryId_code:{factoryId:factory.id,code:sectionCode}},update:{active:true,name:fi.floorName},create:{factoryId:factory.id,code:sectionCode,name:fi.floorName,active:true}});
    floor=await prisma.floor.upsert({where:{sectionId_code:{sectionId:section.id,code:fi.floorCode}},update:{active:true,name:fi.floorName},create:{sectionId:section.id,code:fi.floorCode,name:fi.floorName,active:true}});
  }
  return prisma.line.upsert({where:{floorId_code:{floorId:floor.id,code:lineValue}},update:{name:lineValue,active:true},create:{floorId:floor.id,code:lineValue,name:lineValue,active:true},include:{floor:{include:{section:{include:{factory:true}}}},machinePools:true}});
}
async function setMachineCount(prisma:PrismaService,line:any,machineQty:any){
  // IE/T&A No of M/C is the JOB requirement, not the physical line capacity.
  // Never inflate a seeded line's machine pool from an imported job. Only create a fallback pool
  // for an otherwise-unconfigured custom line; approved NFL/NCL lines are seeded by master-cleanup.
  const qty=safeInt(machineQty); if(!line||!qty)return;
  const pool=await prisma.machinePool.findFirst({where:{lineId:line.id,active:true}}); if(pool)return;
  await prisma.machinePool.create({data:{lineId:line.id,name:'Fallback Machine Pool',machineCount:Math.max(1,qty),active:true,capability:{source:'IMPORT_FALLBACK_ONLY'}}});
}
async function mutation(prisma:PrismaService,batchId:string,entityType:string,entityId:string,action:string,before:any,after:any){await prisma.importMutation.create({data:{batchId,entityType,entityId,action,before:before===undefined?undefined:json(before),after:after===undefined?undefined:json(after)}})}

function mergeMetadata(current:any,sourceType:ReportType,n:any,line:any){
  const sm={...(current||{})}; const sectionData={...(sm.sectionData||{})};
  if(sourceType==='ERP_MASTER_IMPORT'){
    if(n.item)sm.item=n.item;
    sm.merchandisingFollowUp={...(sm.merchandisingFollowUp||{}),presentStatus:n.presentStatus,merchandiser:n.merchandiser,ppStatus:n.ppStatus,remarks:n.remarks,overallStage:n.overallStage,dataQuality:n.dataQuality};
    sm.production={...(sm.production||{}),fabricRequired:n.fabricRequiredKg,fabricReceived:n.fabricReceived,fabricBalance:n.fabricBalance,cuttingQty:n.cuttingQty,inputQty:n.inputQty,packingQty:n.packingQty,shipQty:n.shipQty};
    sm.fabricProfile={...(sm.fabricProfile||{}),fabricType:n.fabricType,gsm:n.gsm,widthDia:n.widthDia,additionalProcess:n.additionalProcess,dyeingFactory:n.dyeingFactory,batchNo:n.batchNo,colors:n.colors,colorCount:n.colorCount,consumptionKgDozen:n.consumptionKgDozen};
    sm.planning={...(sm.planning||{}),taStatus:'APPROVED',taPlanDate:n.taPlanDate,taApprovedAt:n.tnaApprovedDate,taApprovedByName:n.approvedBy||'Demo ERP Workflow',yarnDyeingStart:n.yarnDyeingStart,yarnDyeingEnd:n.yarnDyeingEnd,knittingStart:n.knittingStart,knittingEnd:n.knittingEnd,dyeingFinishingStart:n.dyeingFinishingStart,dyeingFinishingEnd:n.dyeingFinishingEnd,trimsInhouseDate:n.trimsInhouseDate,fileHandoverDate:n.fileHandoverDate,ppMeetingDate:n.ppMeetingDate,cuttingStart:n.cuttingStart,cuttingEnd:n.cuttingEnd,sewingStartDate:n.sewingStartDate,sewingEnd:n.sewingEnd,garmentWashStart:n.garmentWashStart,garmentWashEnd:n.garmentWashEnd,finishingEnd:n.finishingEnd,preFinalInspection:n.preFinalInspection,finalInspection:n.finalInspection,exFactoryDate:n.exFactoryDate,cargoClosingDate:n.cargoClosingDate,line:n.line,floor:n.floor};
    sm.ieBulletin={...(sm.ieBulletin||{}),status:n.ieBulletinStatus||'RELEASED',smv:n.smv,machineQty:n.machineQty,manpower:n.manpower,achievableEfficiencyPct:n.efficiencyPct,dailyTarget:n.dailyTarget,targetPerHour:n.targetPerHour,releaseDate:n.ieReleaseDate,dataSource:n.ieDataSource,approvedBy:n.approvedBy||'IE'};
    sectionData.yarnStore={requiredKg:n.yarnReqKg,receivedKg:n.yarnReceivedKg,issuedKg:n.yarnIssuedKg,balanceKg:n.yarnBalanceKg,lotNo:n.yarnLotNo,status:n.yarnStoreStatus};
    sectionData.yarnDyeing={requiredKg:n.yarnReqKg,planStart:n.yarnDyeingStart,planEnd:n.yarnDyeingEnd,status:n.yarnStoreStatus};
    sectionData.knitting={requiredKg:n.greyRequiredKg,productionKg:n.greyProducedKg,balanceKg:n.greyBalanceKg,planStart:n.knittingStart,planEnd:n.knittingEnd,status:n.knittingStatus};
    sectionData.dyeing={factory:n.dyeingFactory,batchNo:n.batchNo,requiredKg:n.dyeingRequiredKg,receivedKg:n.dyeingReceivedKg,balanceKg:n.dyeingBalanceKg,planStart:n.dyeingFinishingStart,planEnd:n.dyeingFinishingEnd,status:n.dyeingStatus};
    sectionData.fabricFinishing={processes:n.additionalProcesses||[],finishedKg:n.fabricReceived,status:n.fabricStatus||n.dyeingStatus};
    sectionData.finishedFabricStore={receivedKg:n.fabricReceived,balanceKg:n.fabricBalance,status:n.fabricStatus||'READY'};
    sectionData.trims={inhousePct:n.trimsReadinessPct,status:n.trimsStatus};
    sectionData.cutting={cutQty:n.cuttingQty,productionQty:n.cuttingQty,balanceQty:n.cuttingBalance,planStart:n.cuttingStart,planEnd:n.cuttingEnd,status:n.cuttingStatus};
    sectionData.printing={applicable:String(n.printEmbType||'').includes('Printing'),requiredQty:n.printEmbRequired,sendQty:n.printSend,receiveQty:n.printReceived,balanceQty:n.printReceiveBalance,status:n.printEmbStatus};
    sectionData.embroidery={applicable:String(n.printEmbType||'').includes('Embroidery'),requiredQty:n.printEmbRequired,sendQty:n.printSend,receiveQty:n.printReceived,balanceQty:n.printReceiveBalance,status:n.printEmbStatus};
    sectionData.ie={smv:n.smv,machineQty:n.machineQty,manpower:n.manpower,efficiencyPct:n.efficiencyPct,dailyTarget:n.dailyTarget,bulletinStatus:n.ieBulletinStatus||'RELEASED'};
    sectionData.sewing={readyForInput:n.readyForInput,inputQty:n.inputQty,inputBalance:n.inputBalance,productionQty:n.sewingActualQty,balanceQty:n.sewingBalance,achievementPct:n.achievementPct,machineQty:n.machineQty,manpower:n.manpower,efficiencyPct:n.efficiencyPct,status:n.sewingStatus};
    sectionData.finishing={productionQty:n.finishingQty,balanceQty:n.finishingBalance,packingQty:n.packingQty,packingBalance:n.packingBalance,status:n.finishingStatus||n.packingStatus};
    sectionData.shipment={shipQty:n.shipQty,shipBalance:n.shipBalance,status:n.shipmentStatus,exFactoryDate:n.exFactoryDate,cargoClosingDate:n.cargoClosingDate,inspectionStatus:n.inspectionStatus};
    if(line){sm.ganttPlan={...(sm.ganttPlan||{}),lineId:line.id,lineCode:line.name||line.code,factoryCode:line.floor.section.factory.code,floorCode:line.floor.code,lineType:n.lineType,shiftProfile:n.shiftMode||'GENERAL',workingHours:n.workingHours||8,overtimeHours:n.overtimeHours||0,totalHours:(n.workingHours||8)+(n.overtimeHours||0),smv:n.smv,machineQty:n.machineQty,manpower:n.manpower,efficiencyPct:n.efficiencyPct,dailyTarget:n.dailyTarget,startDate:n.sewingStartDate||n.linePlanStart,finishDate:n.sewingEnd||n.linePlanEnd,status:'APPROVED',planningStatus:n.linePlanStatus||'RELEASED',released:true,approvedAt:n.linePlanApprovedDate||n.tnaApprovedDate,approvedByName:n.approvedBy||'Central Planning',actualQty:n.sewingActualQty,achievementPct:n.achievementPct,risk:n.riskStatus||'ON_TRACK',locked:false,importedFromMasterDemo:true,lineAssignments:[n.line]};}
  } else if(sourceType==='TNA_PLAN_EXECUTION'&&n.__dataset==='line-execution'){
    sectionData.sewing={...(sectionData.sewing||{}),machineQty:n.machineQty,planQty:n.planQty,fabricRequiredKg:n.fabricRequiredKg,fabricDeliveredKg:n.fabricDeliveredKg,fabricBalanceKg:n.fabricBalanceKg,preProductionStatus:n.preProductionStatus,presentStatus:n.presentStatus};
    if(n.machineQty) sm.ieBulletin={...(sm.ieBulletin||{}),machineQty:n.machineQty};
    if(line) sm.ganttPlan={...(sm.ganttPlan||{}),lineId:line.id,lineCode:line.name||line.code,factoryCode:line.floor.section.factory.code,floorCode:line.floor.code,machineQty:n.machineQty??sm.ganttPlan?.machineQty,status:sm.ganttPlan?.status||'DRAFT',lineAssignments:n.lineAssignments||[n.line]};
  } else if(sourceType==='TNA_PLAN_EXECUTION'){
    if(n.item) sm.item=n.item;
    sm.merchandisingFollowUp={...(sm.merchandisingFollowUp||{}),presentStatus:n.presentStatus||sm.merchandisingFollowUp?.presentStatus,merchandiser:n.merchandiser||sm.merchandisingFollowUp?.merchandiser,ppStatus:n.ppStatus||sm.merchandisingFollowUp?.ppStatus,ppSentDate:n.ppSentDate||sm.merchandisingFollowUp?.ppSentDate,remarks:n.remarks||sm.merchandisingFollowUp?.remarks};
    sm.production={...(sm.production||{}),fabricRequired:n.fabricRequiredKg??sm.production?.fabricRequired,fabricReceived:n.fabricReceived??sm.production?.fabricReceived,fabricBalance:n.fabricBalance??sm.production?.fabricBalance,cuttingQty:n.cuttingQty??sm.production?.cuttingQty,inputQty:n.inputQty??sm.production?.inputQty,packingQty:n.packingQty??sm.production?.packingQty,shipQty:n.shipQty??sm.production?.shipQty};
    sectionData.cutting={...(sectionData.cutting||{}),productionQty:n.cuttingQty,balanceQty:n.cuttingBalance,planStart:n.cuttingStart,planEnd:n.cuttingEnd};
    sectionData.printing={...(sectionData.printing||{}),requiredQty:n.printEmbRequired,sendQty:n.printSend,receiveQty:n.printReceived,balanceQty:n.printReceiveBalance,position:n.printPosition,description:n.printEmbDescription,planStart:n.printingStart,planEnd:n.printingEnd};
    sectionData.embroidery={...(sectionData.embroidery||{}),requiredQty:n.printEmbRequired,sendQty:n.printSend,receiveQty:n.printReceived,balanceQty:n.printReceiveBalance,position:n.embroideryPosition,description:n.printEmbDescription,planStart:n.embroideryStart,planEnd:n.embroideryEnd};
    sectionData.sewing={...(sectionData.sewing||{}),inputQty:n.inputQty,inputBalance:n.inputBalance,readyForInput:n.readyForInput};
    sectionData.finishing={...(sectionData.finishing||{}),packingQty:n.packingQty,packingBalance:n.packingBalance,shipQty:n.shipQty,shipBalance:n.shipBalance};
    sm.planning={...(sm.planning||{}),taStatus:'APPROVED',taPlanDate:n.taPlanDate||sm.planning?.taPlanDate,yarnDyeingStart:n.yarnDyeingStart,yarnDyeingEnd:n.yarnDyeingEnd,knittingStart:n.knittingStart,knittingEnd:n.knittingEnd,dyeingFinishingStart:n.dyeingFinishingStart,dyeingFinishingEnd:n.dyeingFinishingEnd,aopStart:n.aopStart,aopEnd:n.aopEnd,trimsInhouseDate:n.trimsInhouseDate,fileHandoverDate:n.fileHandoverDate,ppMeetingDate:n.ppMeetingDate,cuttingStart:n.cuttingStart,cuttingEnd:n.cuttingEnd,printingStart:n.printingStart,printingEnd:n.printingEnd,stoneStart:n.stoneStart,stoneEnd:n.stoneEnd,embroideryStart:n.embroideryStart,embroideryEnd:n.embroideryEnd,sewingStartDate:n.sewingStartDate,sewingEnd:n.sewingEnd,garmentWashStart:n.garmentWashStart,garmentWashEnd:n.garmentWashEnd,finishingEnd:n.finishingEnd,preFinalInspection:n.preFinalInspection,finalInspection:n.finalInspection,exFactoryDate:n.exFactoryDate,cargoClosingDate:n.cargoClosingDate,line:n.line,floor:n.floor,slot:n.slot,week:n.week};
    if(line&&n.sewingStartDate){sm.ganttPlan={...(sm.ganttPlan||{}),status:sm.ganttPlan?.status||'DRAFT',lineId:line.id,lineCode:line.name||line.code,factoryCode:line.floor.section.factory.code,floorCode:line.floor.code,startDate:n.sewingStartDate,finishDate:n.sewingEnd||n.sewingStartDate,workingHours:sm.ganttPlan?.workingHours||8,importedFromTna:true,lineAssignments:n.lineAssignments||[n.line]};}
    if(n.machineQty){sm.ieBulletin={...(sm.ieBulletin||{}),machineQty:n.machineQty};}
  }
  if(sourceType==='CUTTING_PRINT_INPUT'){
    sm.merchandisingFollowUp={...(sm.merchandisingFollowUp||{}),presentStatus:n.presentStatus||sm.merchandisingFollowUp?.presentStatus,remarks:n.remarks||sm.merchandisingFollowUp?.remarks};
    sectionData.cutting={...(sectionData.cutting||{}),todayQty:n.todayCutting,productionQty:n.totalCutting,balanceQty:n.cuttingBalance,cutBalancePct:n.cutBalancePct,shortQty:n.cutBalance};
    sectionData.printing={...(sectionData.printing||{}),firstSentDate:n.firstPrintSentDate,todaySendQty:n.todayPrintSent,sendQty:n.totalPrintSend,todayReceiveQty:n.todayPrintReceived,receiveQty:n.totalPrintReceive,balanceQty:n.printBalance,shortQty:n.printReceiveShort,type:n.printEmbType,factory:n.factoryName};
    sectionData.sewing={...(sectionData.sewing||{}),readyForInput:n.readyForInput,todayInput:n.todayInput,inputQty:n.totalInput,inputBalance:n.inputBalance,inputShort:n.inputShort,sewingFloor:n.sewingFloor};
  }
  if(sourceType==='FINISH_FABRIC_DYEING'){
    sectionData.knitting={...(sectionData.knitting||{}),requiredKg:n.totalRequiredKg,planStart:n.knittingStart,planEnd:n.knittingEnd,greyBodyKg:n.greyBodyKg,greyLRibKg:n.greyLRibKg,greySJerseyKg:n.greySJerseyKg,greyReady:n.greyReady};
    sectionData.dyeing={...(sectionData.dyeing||{}),factory:n.dyeingFactory,batchNo:n.batchNo,dyeingDate:n.dyeingDate,sendDate:n.dyeingSendDate,sendQty:n.dyeingSendQtyKg,receiveDate:n.dyeingReceiveDate,productionQty:n.totalDyeingKg,deliveryPlanStart:n.dyeingDeliveryPlanStart,deliveryPlanEnd:n.dyeingDeliveryPlanEnd,actualDeliveryStart:n.actualDyeingDeliveryStart,actualDeliveryEnd:n.actualDyeingDeliveryEnd};
    sectionData.fabricFinishing={...(sectionData.fabricFinishing||{}),additionalProcess:n.additionalProcess,aop:{factory:n.aopFactory,sendDate:n.aopSendDate,sendQty:n.aopSendQtyKg,receiveDate:n.aopReceiveDate,receiveQty:n.aopReceiveQtyKg,balanceQty:n.aopBalanceKg},peach:{factory:n.peachFactory,sendDate:n.peachSendDate,sendQty:n.peachSendQtyKg,receiveDate:n.peachReceiveDate,receiveQty:n.peachReceiveQtyKg,balanceQty:n.peachBalanceKg},brush:{factory:n.brushFactory,sendDate:n.brushSendDate,sendQty:n.brushSendQtyKg,receiveDate:n.brushReceiveDate,receiveQty:n.brushReceiveQtyKg,balanceQty:n.brushBalanceKg},shearing:{factory:n.shearingFactory,sendDate:n.shearingSendDate,sendQty:n.shearingSendQtyKg,receiveDate:n.shearingReceiveDate,receiveQty:n.shearingReceiveQtyKg,balanceQty:n.shearingBalanceKg},singeing:{factory:n.singeingFactory,sendDate:n.singeingSendDate,sendQty:n.singeingSendQtyKg,receiveDate:n.singeingReceiveDate,receiveQty:n.singeingReceiveQtyKg,balanceQty:n.singeingBalanceKg},finishing:{factory:n.finishingFactory,sendDate:n.finishingSendDate,sendQty:n.finishingSendQtyKg,receiveDate:n.finishingReceiveDate,receiveQty:n.finishingReceiveQtyKg,balanceQty:n.finishingBalanceKg}};
    sectionData.finishedFabric={...(sectionData.finishedFabric||{}),totalDeliveryKg:n.totalDeliveryKg,totalBalanceKg:n.totalBalanceKg,balancePct:n.balancePct,bodyDeliveredKg:n.bodyDeliveredKg,lRibDeliveredKg:n.lRibDeliveredKg,sJerseyDeliveredKg:n.sJerseyDeliveredKg};
    sm.fabricProfile={...(sm.fabricProfile||{}),additionalProcess:n.additionalProcess,gsm:n.gsm,widthDia:n.widthDia,color:n.color,fabricDescription:n.fabricDescription,brand:n.brand,merchandiser:n.merchandiser,slotNo:n.slotNo};
  }
  if(sourceType==='IE_BULLETIN'){
    const previous=sm.ieBulletin||{};
    const operator=n.operator??previous.operator??null, helper=n.helper??previous.helper??null, finishingManpower=n.finishingManpower??previous.finishingManpower??null;
    const calculatedManpower=(Number(operator||0)+Number(helper||0)+Number(finishingManpower||0))||null;
    const manpower=n.manpower??calculatedManpower??previous.manpower??null;
    const machineRequirements=Array.isArray(n.machineRequirements)&&n.machineRequirements.length?n.machineRequirements:(previous.machineRequirements||[]);
    const revision=Number(n.revision??previous.revision??1)||1;
    const now=new Date().toISOString();
    sm.ieBulletin={...previous,status:'RELEASED',smv:n.smv??previous.smv,machineQty:n.machineQty??previous.machineQty,dailyTarget:n.dailyTarget??previous.dailyTarget,operator,helper,finishingManpower,manpower,achievableEfficiency:n.efficiencyPct??previous.achievableEfficiency,achievableEfficiencyPct:n.efficiencyPct??previous.achievableEfficiencyPct,machineRequirements,bulletinDate:n.bulletinDate??previous.bulletinDate??now,revision,releasedRevision:revision,releaseDate:now,releasedAt:now,sourceFileName:n.__sourceFileName||previous.sourceFileName||null,sourceBatchId:n.__batchId||previous.sourceBatchId||null,dataSource:'IE_BULLETIN_IMPORT',cuttingSmv:n.cuttingSmv??previous.cuttingSmv,costingSmv:n.costingSmv??previous.costingSmv,cmPerDozen:n.cmPerDozen??previous.cmPerDozen,costDevPerPcs:n.costDevPerPcs??previous.costDevPerPcs,remarks:n.remarks||previous.remarks,merchandiser:n.merchandiser||previous.merchandiser};
    sm.sectionData={...(sm.sectionData||{}),ie:{...(sm.sectionData?.ie||{}),smv:sm.ieBulletin.smv,machineQty:sm.ieBulletin.machineQty,manpower:sm.ieBulletin.manpower,operator,helper,finishingManpower,dailyTarget:sm.ieBulletin.dailyTarget,efficiencyPct:sm.ieBulletin.achievableEfficiencyPct,machineRequirements,bulletinStatus:'RELEASED',revision}};
    if(line){sm.ganttPlan={...(sm.ganttPlan||{}),lineId:line.id,lineCode:line.name||line.code,factoryCode:line.floor.section.factory.code,floorCode:line.floor.code,startDate:n.sewingStartDate||sm.ganttPlan?.startDate,machineQty:n.machineQty??sm.ganttPlan?.machineQty,smv:n.smv??sm.ganttPlan?.smv,manpower:manpower??sm.ganttPlan?.manpower,dailyTarget:n.dailyTarget??sm.ganttPlan?.dailyTarget,ieStatus:'RELEASED',ieRevision:revision,machineRequirements,status:sm.ganttPlan?.status||'DRAFT',lineAssignments:n.lineAssignments||[n.line]};}
    else {sm.ganttPlan={...(sm.ganttPlan||{}),machineQty:n.machineQty??sm.ganttPlan?.machineQty,smv:n.smv??sm.ganttPlan?.smv,manpower:manpower??sm.ganttPlan?.manpower,dailyTarget:n.dailyTarget??sm.ganttPlan?.dailyTarget,ieStatus:'RELEASED',ieRevision:revision,machineRequirements};}
  }
  sm.sectionData=sectionData; sm.importTrace={...(sm.importTrace||{}),lastReportType:sourceType,lastImportedAt:new Date().toISOString()};
  return sm;
}

async function upsertDomain(prisma:PrismaService,batchId:string,sourceType:ReportType,n:any){
  const jobNo=text(n.jobNo), styleNo=text(n.styleNo)||'UNSPECIFIED'; if(!jobNo)return null;
  const buyer=await ensureBuyer(prisma,n.buyer); const fi=floorIdentity(n); const factory=await ensureFactory(prisma,fi.factory,fi.factory); const user=await prisma.user.findFirst({where:{active:true},orderBy:{createdAt:'asc'}}); if(!user)throw new BadRequestException('No active ERP user exists. Run the base seed first.');
  const lineValues=Array.isArray(n.lineAssignments)&&n.lineAssignments.length?n.lineAssignments:(text(n.line)?[text(n.line)]:[]); const importedLines:any[]=[]; for(const lv of lineValues){const createdLine=await ensureLine(prisma,{...n,line:lv});if(createdLine){importedLines.push(createdLine);await setMachineCount(prisma,createdLine,n.machineQty)}} const line=importedLines[0]||null;
  let orderRecord=await prisma.order.findUnique({where:{jobNo},include:{buyer:true}});
  if(!orderRecord){
    const created=await prisma.order.create({data:{jobNo,factoryId:factory.id,buyerId:buyer.id,source:'IMPORT',totalQty:safeInt(n.orderQty),createdById:user.id,sourceMetadata:{importCreatedByBatch:batchId}},include:{buyer:true}});
    await mutation(prisma,batchId,'ORDER',created.id,'CREATE',{exists:false},{exists:true,jobNo:created.jobNo});
    orderRecord=created;
  } else {
    const before={exists:true,totalQty:orderRecord.totalQty,buyerId:orderRecord.buyerId,factoryId:orderRecord.factoryId,sourceMetadata:orderRecord.sourceMetadata};
    const nextQty=(sourceType==='ERP_MASTER_IMPORT'||sourceType==='TNA_PLAN_EXECUTION'||sourceType==='IE_BULLETIN')&&safeInt(n.orderQty)>0?safeInt(n.orderQty):orderRecord.totalQty;
    const buyerId=(sourceType==='IE_BULLETIN'&&!text(n.buyer))?orderRecord.buyerId:buyer.id;
    const updated=await prisma.order.update({where:{id:orderRecord.id},data:{buyerId,totalQty:nextQty,source:'IMPORT',sourceMetadata:json({...((orderRecord.sourceMetadata||{}) as any),lastImportBatch:batchId})},include:{buyer:true}});
    await mutation(prisma,batchId,'ORDER',updated.id,'UPDATE',before,{exists:true,totalQty:updated.totalQty,buyerId:updated.buyerId,factoryId:updated.factoryId,sourceMetadata:updated.sourceMetadata});
    orderRecord=updated;
  }
  const order=orderRecord;
  let style=await prisma.style.findUnique({where:{orderId_styleNo:{orderId:order.id,styleNo}}});
  if(!style){const q=safeInt(n.orderQty,order.totalQty);const sm=mergeMetadata({},sourceType,n,line);style=await prisma.style.create({data:{orderId:order.id,styleNo,itemDescription:text(n.itemDescription||n.item)||null,quantity:q||order.totalQty||1,sourceMetadata:json(sm)}});await mutation(prisma,batchId,'STYLE',style.id,'CREATE',{exists:false},{exists:true,styleNo});}
  else {const before={exists:true,itemDescription:style.itemDescription,quantity:style.quantity,sourceMetadata:style.sourceMetadata};const sm=mergeMetadata(style.sourceMetadata||{},sourceType,n,line);const q=(sourceType==='ERP_MASTER_IMPORT'||sourceType==='TNA_PLAN_EXECUTION'||sourceType==='IE_BULLETIN')&&safeInt(n.orderQty)>0?safeInt(n.orderQty):style.quantity;style=await prisma.style.update({where:{id:style.id},data:{itemDescription:text(n.itemDescription||n.item)||style.itemDescription,quantity:q,sourceMetadata:json(sm)}});await mutation(prisma,batchId,'STYLE',style.id,'UPDATE',before,{exists:true,itemDescription:style.itemDescription,quantity:style.quantity,sourceMetadata:style.sourceMetadata});}
  if((sourceType==='ERP_MASTER_IMPORT'||sourceType==='TNA_PLAN_EXECUTION')&&(n.cargoClosingDate||n.exFactoryDate)){const poNumber='IMPORT-MASTER';const existing=await prisma.purchaseOrder.findUnique({where:{styleId_poNumber:{styleId:style.id,poNumber}}});if(!existing){const p=await prisma.purchaseOrder.create({data:{styleId:style.id,poNumber,referenceType:'IMPORTED_TNA',totalQty:style.quantity,ccd:n.cargoClosingDate?new Date(n.cargoClosingDate):null,shipmentDate:n.exFactoryDate?new Date(n.exFactoryDate):null,sourceMetadata:{batchId}}});await mutation(prisma,batchId,'PURCHASE_ORDER',p.id,'CREATE',{exists:false},{exists:true,poNumber})}else{const before={exists:true,totalQty:existing.totalQty,ccd:existing.ccd,shipmentDate:existing.shipmentDate,sourceMetadata:existing.sourceMetadata};const p=await prisma.purchaseOrder.update({where:{id:existing.id},data:{totalQty:style.quantity,ccd:n.cargoClosingDate?new Date(n.cargoClosingDate):existing.ccd,shipmentDate:n.exFactoryDate?new Date(n.exFactoryDate):existing.shipmentDate,sourceMetadata:json({...((existing.sourceMetadata||{}) as any),batchId})}});await mutation(prisma,batchId,'PURCHASE_ORDER',p.id,'UPDATE',before,{exists:true,totalQty:p.totalQty,ccd:p.ccd,shipmentDate:p.shipmentDate,sourceMetadata:p.sourceMetadata})}}
  return {order,style,line};
}

function aggregateNormalized(reportType:ReportType, rows:any[]){
  const nonempty=(v:any)=>v!==null&&v!==undefined&&v!=='';
  const base:any={};
  const ordered=reportType==='TNA_PLAN_EXECUTION'?[...rows].sort((a,b)=>String(a.__dataset).localeCompare(String(b.__dataset))):rows;
  for(const n of ordered) for(const [k,v] of Object.entries(n)) if(nonempty(v) && (base[k]===undefined || base[k]===null || base[k]==='')) base[k]=v;
  const sums:Record<string,string[]>={
    CUTTING_PRINT_INPUT:['orderQty','todayCutting','totalCutting','cuttingBalance','todayPrintSent','totalPrintSend','todayPrintReceived','totalPrintReceive','printBalance','readyForInput','todayInput','totalInput','inputBalance','cutBalance','printReceiveShort','inputShort'],
    FINISH_FABRIC_DYEING:['bodyRequiredKg','lRibRequiredKg','sJerseyRequiredKg','totalRequiredKg','greyBodyKg','greyLRibKg','greySJerseyKg','dyeingSendQtyKg','dyeingBodyKg','dyeingLRibKg','dyeingSJerseyKg','totalDyeingKg','aopSendQtyKg','aopReceiveQtyKg','aopBalanceKg','peachSendQtyKg','peachReceiveQtyKg','peachBalanceKg','brushSendQtyKg','brushReceiveQtyKg','brushBalanceKg','shearingSendQtyKg','shearingReceiveQtyKg','shearingBalanceKg','singeingSendQtyKg','singeingReceiveQtyKg','singeingBalanceKg','finishingSendQtyKg','finishingReceiveQtyKg','finishingBalanceKg','deliveryPendingKg','bodyDeliveredKg','lRibDeliveredKg','sJerseyDeliveredKg','totalDeliveryKg','bodyBalanceKg','lRibBalanceKg','sJerseyBalanceKg','totalBalanceKg'],
  };
  for(const k of sums[reportType]||[]){const vals=rows.map(x=>Number(x[k])).filter(Number.isFinite);if(vals.length)base[k]=vals.reduce((a,b)=>a+b,0)}
  if(reportType==='TNA_PLAN_EXECUTION'){
    const central=rows.find(x=>x.__dataset==='central-report'); const line=rows.find(x=>x.__dataset==='line-execution');
    if(central)Object.assign(base,Object.fromEntries(Object.entries(central).filter(([,v])=>nonempty(v))));
    if(line){for(const k of ['line','machineQty','planQty','preProductionStatus','presentStatus'])if(nonempty(line[k]))base[k]=line[k]}
  }
  return base;
}

async function upsertColorDetails(prisma:PrismaService,batchId:string,styleId:string,rows:any[]){
  const byColor=new Map<string,number>();
  for(const n of rows){
    const color=text(n.color); if(color){const qty=safeInt(n.orderQty);byColor.set(color,(byColor.get(color)||0)+qty);continue;}
    const colors=text(n.colors).split(/\s*[,;|]\s*/).map((x:string)=>x.trim()).filter(Boolean); if(!colors.length)continue;
    const total=Math.max(1,safeInt(n.orderQty)); const base=Math.floor(total/colors.length); let remaining=total;
    colors.forEach((c:string,idx:number)=>{const qty=idx===colors.length-1?remaining:base;remaining-=qty;byColor.set(c,(byColor.get(c)||0)+qty)});
  }
  for(const [color,qty] of byColor){const existing=await prisma.styleBreakdown.findUnique({where:{styleId_color_size:{styleId,color,size:'ALL'}}});if(!existing){const b=await prisma.styleBreakdown.create({data:{styleId,color,size:'ALL',qty}});await mutation(prisma,batchId,'STYLE_BREAKDOWN',b.id,'CREATE',{exists:false},{exists:true,color,size:'ALL',qty})}else if(qty&&qty!==existing.qty){const before={exists:true,qty:existing.qty};const b=await prisma.styleBreakdown.update({where:{id:existing.id},data:{qty}});await mutation(prisma,batchId,'STYLE_BREAKDOWN',b.id,'UPDATE',before,{exists:true,qty:b.qty})}}
}

export async function commitReportBatch(prisma:PrismaService,batchId:string){
  const batch=await prisma.importBatch.findUnique({where:{id:batchId},include:{rows:{where:{status:'VALID'},orderBy:{rowNumber:'asc'}}}});
  if(!batch||batch.status!=='STAGED')throw new BadRequestException('Import batch is not staged.');
  const reportType=((batch.mapping||{}) as any).reportType as ReportType|undefined; if(!reportType||reportType==='GENERIC')throw new BadRequestException('Factory report type is missing.');
  const groups=new Map<string,any[]>();
  for(const row of batch.rows){const n=(row.normalizedData||{}) as any;const key=`${text(n.jobNo)}|${text(n.styleNo)||'UNSPECIFIED'}`;if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(row)}
  const projections:any[]=[]; const references=new Map<string,{category:string;value:string}>();
  for(const [entityKey,group] of groups){
    const normals=group.map(r=>(r.normalizedData||{}) as any); const aggregate=aggregateNormalized(reportType,normals); aggregate.__sourceFileName=batch.sourceFileName; aggregate.__batchId=batch.id; const domain=await upsertDomain(prisma,batchId,reportType,aggregate);
    if(domain?.style)await upsertColorDetails(prisma,batchId,domain.style.id,normals);
    const modules=new Set<string>();
    for(const row of group){const raw=(row.rawData||{}) as any;for(const m of (raw.__targetModules||[]))modules.add(String(m));for(const ref of (raw.__references||[])){if(ref?.category&&ref?.value)references.set(`${ref.category}|${normalizedKey(ref.value)}`,{category:ref.category,value:ref.value})}}
    for(const moduleSlug of modules)projections.push({batchId,rowId:group[0].id,moduleSlug,entityKey,data:json({...aggregate,orderId:domain?.order?.id||null,styleId:domain?.style?.id||null})});
  }
  for(const ref of references.values())await ensureReference(prisma,ref.category,ref.value,batchId);
  for(let i=0;i<projections.length;i+=2000)await prisma.importProjection.createMany({data:projections.slice(i,i+2000) as any,skipDuplicates:true});
  await prisma.importRow.updateMany({where:{batchId,status:'VALID'},data:{status:'COMMITTED'}});
  await prisma.importBatch.update({where:{id:batchId},data:{status:'COMMITTED',committedAt:new Date()}});
  return {batchId,groups:groups.size,projections:projections.length};
}

async function rollbackMutation(prisma:PrismaService,m:any){const before=(m.before||{}) as any;try{
  if(m.entityType==='STYLE_BREAKDOWN'){if(m.action==='CREATE')await prisma.styleBreakdown.deleteMany({where:{id:m.entityId}});else if(before.exists)await prisma.styleBreakdown.updateMany({where:{id:m.entityId},data:{qty:before.qty}})}
  else if(m.entityType==='PURCHASE_ORDER'){if(m.action==='CREATE')await prisma.purchaseOrder.deleteMany({where:{id:m.entityId}});else if(before.exists)await prisma.purchaseOrder.update({where:{id:m.entityId},data:{totalQty:before.totalQty,ccd:before.ccd?new Date(before.ccd):null,shipmentDate:before.shipmentDate?new Date(before.shipmentDate):null,sourceMetadata:before.sourceMetadata?json(before.sourceMetadata):undefined}})}
  else if(m.entityType==='STYLE'){if(m.action==='CREATE')await prisma.style.deleteMany({where:{id:m.entityId}});else if(before.exists)await prisma.style.update({where:{id:m.entityId},data:{itemDescription:before.itemDescription,quantity:before.quantity,sourceMetadata:before.sourceMetadata?json(before.sourceMetadata):undefined}})}
  else if(m.entityType==='ORDER'){if(m.action==='CREATE')await prisma.order.deleteMany({where:{id:m.entityId}});else if(before.exists)await prisma.order.update({where:{id:m.entityId},data:{totalQty:before.totalQty,buyerId:before.buyerId,factoryId:before.factoryId,sourceMetadata:before.sourceMetadata?json(before.sourceMetadata):undefined}})}
}catch{/* rollback is best-effort per entity; projections still deactivate */}}

export async function rollbackReportBatch(prisma:PrismaService,batchId:string){
  const batch=await prisma.importBatch.findUnique({where:{id:batchId}});if(!batch||batch.status!=='COMMITTED')throw new BadRequestException('Only committed imports can be rolled back.');
  const mutations=await prisma.importMutation.findMany({where:{batchId},orderBy:{createdAt:'desc'}});for(const m of mutations)await rollbackMutation(prisma,m);
  await prisma.importProjection.updateMany({where:{batchId},data:{active:false}});await prisma.importRow.updateMany({where:{batchId,status:'COMMITTED'},data:{status:'ROLLED_BACK'}});await prisma.importBatch.update({where:{id:batchId},data:{status:'ROLLED_BACK',rolledBackAt:new Date()}});return batchId;
}

export async function stageWorkbook(prisma:PrismaService,fileBuffer:Buffer,fileName:string,forcedReportType?:ReportType){
  const workbook=XLSX.read(fileBuffer,{type:'buffer',cellDates:true}); const extracted=extractWorkbook(workbook,forcedReportType,fileName); if(extracted.reportType==='GENERIC')throw new BadRequestException('Report format is not recognized yet. Use one of the configured factory formats or add a mapping profile.');
  if(extracted.rows.length>30000)throw new BadRequestException('Maximum 30,000 detail rows per workbook.');
  const batch=await prisma.importBatch.create({data:{moduleSlug:`report:${extracted.reportType.toLowerCase()}`,sourceFileName:fileName,sourceSheet:'MULTI-SHEET AUTO',status:'STAGED',totalRows:extracted.rows.length,validRows:extracted.rows.filter(x=>text(x.normalizedData.jobNo)).length,errorRows:extracted.rows.filter(x=>!text(x.normalizedData.jobNo)).length,mapping:{reportType:extracted.reportType,autoDetected:true,label:REPORT_TYPE_LABELS[extracted.reportType]},headers:{sheets:extracted.sheets,datasets:Array.from(new Set(extracted.rows.map(x=>x.dataset))),targetModules:Array.from(new Set(extracted.rows.flatMap(x=>x.targetModules)))}}});
  const staged=extracted.rows.map(x=>({batchId:batch.id,rowNumber:x.rowNumber,rawData:json({...x.rawData,__dataset:x.dataset,__sheet:x.sheetName,__targetModules:x.targetModules,__references:x.references}),normalizedData:json({...x.normalizedData,__dataset:x.dataset,__sourceSheet:x.sheetName}),errors:text(x.normalizedData.jobNo)?[]:['Job No is required'],status:text(x.normalizedData.jobNo)?'VALID':'ERROR',jobNo:text(x.normalizedData.jobNo)||null,styleNo:text(x.normalizedData.styleNo)||null,buyer:text(x.normalizedData.buyer)||null})); if(staged.length)await prisma.importRow.createMany({data:staged as any});
  const auditRows=extracted.rows.map(x=>(x.normalizedData as any).__normalization||{});let corrected=0,review=0;for(const a of auditRows)for(const v of Object.values(a) as any[]){if(v?.status==='CORRECTED'||v?.status==='PARTIAL')corrected++;if(v?.status==='REVIEW'||v?.status==='REJECTED')review++;}
  const datasetCounts=Object.fromEntries(Array.from(new Set(extracted.rows.map(x=>x.dataset))).map(dataset=>[dataset,extracted.rows.filter(x=>x.dataset===dataset).length]));
  const previewRows:any[]=[];
  for(const dataset of Object.keys(datasetCounts)){
    previewRows.push(...extracted.rows.filter(x=>x.dataset===dataset).slice(0,15));
  }
  return {batchId:batch.id,reportType:extracted.reportType,reportLabel:REPORT_TYPE_LABELS[extracted.reportType],sourceFileName:fileName,sheets:extracted.sheets,totalRows:batch.totalRows,validRows:batch.validRows,errorRows:batch.errorRows,targetModules:(batch.headers as any)?.targetModules||[],datasetCounts,normalizationSummary:{corrected,review},preview:previewRows.slice(0,40).map(x=>({rowNumber:x.rowNumber,sheetName:x.sheetName,dataset:x.dataset,normalizedData:{...x.normalizedData,__dataset:x.dataset},normalization:(x.normalizedData as any).__normalization||{},errors:text(x.normalizedData.jobNo)?[]:['Job No is required']}))};
}

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController{
  constructor(private prisma:PrismaService){}
  @Get('catalog') catalog(){return {reportTypes:Object.entries(REPORT_TYPE_LABELS).filter(([k])=>k!=='GENERIC').map(([slug,name])=>({slug,name})),legacyModules:IMPORT_CATALOG.map(x=>({slug:x.slug,name:x.name,group:x.group,fields:x.fields.map(f=>({key:f.key,label:f.label,required:!!f.required}))}))}}
  @Post('preview') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:40*1024*1024}})) async preview(@UploadedFile()file:any,@Body()body:any){if(!file?.buffer)throw new BadRequestException('Excel file is required.');const fileName=text(file.originalname||'workbook.xlsx');const workbook=XLSX.read(file.buffer,{type:'buffer',cellDates:true});const detected=detectReportType(workbook);if(detected!=='GENERIC')return stageWorkbook(this.prisma,file.buffer,fileName,body.reportType||detected);const forcedType=text(body.reportType).toUpperCase() as ReportType; if(forcedType&&forcedType!=='GENERIC'){const forced=extractWorkbook(workbook,forcedType,fileName);if(forced.rows.length)return stageWorkbook(this.prisma,file.buffer,fileName,forcedType);}const canonicalName=/nfl[ _-]*pulse[ _-]*erp|2000[ _-]*job[ _-]*realistic[ _-]*demo/i.test(fileName);if(canonicalName){const forced=extractWorkbook(workbook,'ERP_MASTER_IMPORT',fileName);if(forced.rows.length)return stageWorkbook(this.prisma,file.buffer,fileName,'ERP_MASTER_IMPORT');}const ieBulletinName=/ie[ _-]*bulletin|operation[ _-]*bulletin|job\s*&?\s*style/i.test(fileName);if(ieBulletinName){const forced=extractWorkbook(workbook,'IE_BULLETIN',fileName);if(forced.rows.length)return stageWorkbook(this.prisma,file.buffer,fileName,'IE_BULLETIN');}const def=IMPORT_CATALOG.find(x=>x.slug===body.moduleSlug);if(!def)throw new BadRequestException(`Workbook was not recognized. API v0.4.35 saw sheets: ${workbook.SheetNames.join(', ')}. Re-run START-NFL-PULSE.bat after applying the hotfix.`);const sheetName=body.sheetName&&workbook.SheetNames.includes(body.sheetName)?body.sheetName:workbook.SheetNames[0];const rawRows=XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName],{defval:'',raw:false});const headers:string[]=Array.from(new Set<string>(rawRows.flatMap((r:any)=>Object.keys(r))));const mapping=autoMapping(headers,def.fields);const staged=rawRows.map((raw,i)=>{const normalized=normalize(raw,mapping);const errors=validate(normalized,def.fields);return{rowNumber:i+2,rawData:raw,normalizedData:normalized,errors,status:errors.length?'ERROR':'VALID',jobNo:text(normalized.jobNo)||null,styleNo:text(normalized.styleNo)||null,buyer:text(normalized.buyer)||null}});const batch=await this.prisma.importBatch.create({data:{moduleSlug:def.slug,sourceFileName:file.originalname||'workbook.xlsx',sourceSheet:sheetName,status:'STAGED',totalRows:staged.length,validRows:staged.filter(r=>r.status==='VALID').length,errorRows:staged.filter(r=>r.status==='ERROR').length,mapping,headers}});if(staged.length)await this.prisma.importRow.createMany({data:staged.map(r=>({...r,batchId:batch.id}))as any});return{batchId:batch.id,reportType:'GENERIC',module:def,sourceFileName:batch.sourceFileName,sheetName,sheets:workbook.SheetNames,headers,mapping,totalRows:batch.totalRows,validRows:batch.validRows,errorRows:batch.errorRows,preview:staged.slice(0,20)}}
  @Put(':batchId/mapping') async remap(@Param('batchId')batchId:string,@Body()body:any){const batch=await this.prisma.importBatch.findUnique({where:{id:batchId},include:{rows:true}});if(!batch||batch.status!=='STAGED')throw new BadRequestException('Only staged imports can be remapped.');if(String(batch.moduleSlug).startsWith('report:'))throw new BadRequestException('Factory report profiles are auto-mapped; manual mapping is not required.');const def=IMPORT_CATALOG.find(x=>x.slug===batch.moduleSlug)!;const mapping=(body.mapping||{})as Record<string,string>;let valid=0,errors=0;for(const row of batch.rows){const normalized=normalize(row.rawData,mapping);const rowErrors=validate(normalized,def.fields);if(rowErrors.length)errors++;else valid++;await this.prisma.importRow.update({where:{id:row.id},data:{normalizedData:normalized,errors:rowErrors,status:rowErrors.length?'ERROR':'VALID',jobNo:text(normalized.jobNo)||null,styleNo:text(normalized.styleNo)||null,buyer:text(normalized.buyer)||null}})}await this.prisma.importBatch.update({where:{id:batchId},data:{mapping,validRows:valid,errorRows:errors}});return this.detail(batchId)}
  @Post(':batchId/commit') async commit(@Param('batchId')batchId:string){const batch=await this.prisma.importBatch.findUnique({where:{id:batchId}});if(!batch||batch.status!=='STAGED')throw new BadRequestException('Import batch is not staged.');if(String(batch.moduleSlug).startsWith('report:')){await commitReportBatch(this.prisma,batchId);return this.detail(batchId)}await this.prisma.$transaction([this.prisma.importRow.updateMany({where:{batchId,status:'VALID'},data:{status:'COMMITTED'}}),this.prisma.importBatch.update({where:{id:batchId},data:{status:'COMMITTED',committedAt:new Date()}})]);return this.detail(batchId)}
  @Post(':batchId/rollback') async rollback(@Param('batchId')batchId:string){const batch=await this.prisma.importBatch.findUnique({where:{id:batchId}});if(!batch||batch.status!=='COMMITTED')throw new BadRequestException('Only committed imports can be rolled back.');if(String(batch.moduleSlug).startsWith('report:')){await rollbackReportBatch(this.prisma,batchId);return this.detail(batchId)}await this.prisma.$transaction([this.prisma.importRow.updateMany({where:{batchId,status:'COMMITTED'},data:{status:'ROLLED_BACK'}}),this.prisma.importBatch.update({where:{id:batchId},data:{status:'ROLLED_BACK',rolledBackAt:new Date()}})]);return this.detail(batchId)}
  @Get('batches') batches(){return this.prisma.importBatch.findMany({orderBy:{createdAt:'desc'},take:100})}
  @Get(':batchId/rows') async reviewRows(@Param('batchId')batchId:string,@Query('q')qRaw?:string,@Query('skip')skipRaw?:string,@Query('take')takeRaw?:string){
    const batch=await this.prisma.importBatch.findUnique({where:{id:batchId}});if(!batch)throw new BadRequestException('Import batch not found.');
    const q=text(qRaw).trim();const skip=Math.max(0,Number(skipRaw)||0);const take=Math.min(200,Math.max(20,Number(takeRaw)||100));
    const where:any={batchId};if(q)where.OR=[{jobNo:{contains:q,mode:'insensitive'}},{styleNo:{contains:q,mode:'insensitive'}},{buyer:{contains:q,mode:'insensitive'}}];
    const [total,rows]=await Promise.all([this.prisma.importRow.count({where}),this.prisma.importRow.findMany({where,orderBy:[{rowNumber:'asc'},{id:'asc'}],skip,take})]);
    return{batchId,status:batch.status,total,skip,take,rows};
  }
  @Patch(':batchId/rows/:rowId') async editStagedRow(@Param('batchId')batchId:string,@Param('rowId')rowId:string,@Body()body:any){
    const batch=await this.prisma.importBatch.findUnique({where:{id:batchId}});if(!batch||batch.status!=='STAGED')throw new BadRequestException('Only staged imports can be edited.');
    const row=await this.prisma.importRow.findUnique({where:{id:rowId}});if(!row||row.batchId!==batchId)throw new BadRequestException('Import row not found.');
    const current=(row.normalizedData||{}) as any;const allowed=['jobNo','styleNo','buyer','orderQty','item','itemDescription','line','floor','merchandiser','presentStatus','overallStage','riskStatus','remarks'];const patch=body?.patch||{};const next:any={...current};for(const k of allowed)if(Object.prototype.hasOwnProperty.call(patch,k))next[k]=patch[k];
    const skipped=body?.skip===true;const errors:string[]=skipped?['Skipped by user']:[];if(!skipped&&!text(next.jobNo))errors.push('Job No is required');const status=errors.length?'ERROR':'VALID';
    const updated=await this.prisma.importRow.update({where:{id:rowId},data:{normalizedData:json(next),errors:json(errors),status:status as any,jobNo:text(next.jobNo)||null,styleNo:text(next.styleNo)||null,buyer:text(next.buyer)||null}});
    const [validRows,errorRows]=await Promise.all([this.prisma.importRow.count({where:{batchId,status:'VALID'}}),this.prisma.importRow.count({where:{batchId,status:'ERROR'}})]);await this.prisma.importBatch.update({where:{id:batchId},data:{validRows,errorRows}});return updated;
  }
  @Get('running/:moduleSlug') async running(@Param('moduleSlug')moduleSlug:string){const projections=await this.prisma.importProjection.findMany({where:{moduleSlug,active:true,batch:{status:'COMMITTED'}},include:{batch:true},orderBy:{createdAt:'desc'}});if(projections.length){const seen=new Set<string>();const rows:any[]=[];for(const p of projections){if(seen.has(p.entityKey))continue;seen.add(p.entityKey);rows.push({id:p.id,batchId:p.batchId,file:p.batch.sourceFileName,sheet:p.batch.sourceSheet,...((p.data||{})as any)})}return rows}const legacy=await this.prisma.importRow.findMany({where:{status:'COMMITTED',batch:{moduleSlug,status:'COMMITTED'}},include:{batch:true},orderBy:{createdAt:'desc'}});return legacy.map(r=>({id:r.id,batchId:r.batchId,file:r.batch.sourceFileName,sheet:r.batch.sourceSheet,rowNumber:r.rowNumber,...((r.normalizedData||{})as any)}))}
  @Get('job/:jobNo') async byJob(@Param('jobNo')jobNo:string){const rows=await this.prisma.importRow.findMany({where:{jobNo,status:'COMMITTED',batch:{status:'COMMITTED'}},include:{batch:true},orderBy:{createdAt:'desc'},take:500});return rows.map(r=>({moduleSlug:r.batch.moduleSlug,file:r.batch.sourceFileName,sheet:r.batch.sourceSheet,rowNumber:r.rowNumber,data:r.normalizedData}))}
  @Get(':batchId') async detail(@Param('batchId')batchId:string){const batch=await this.prisma.importBatch.findUnique({where:{id:batchId},include:{rows:{orderBy:{rowNumber:'asc'},take:100}}});if(!batch)throw new BadRequestException('Import batch not found.');return batch}
}
