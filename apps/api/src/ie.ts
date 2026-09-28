import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function text(v:any){ return String(v ?? '').trim(); }
function numberOrNull(v:any){ const n=Number(v); return Number.isFinite(n)?n:null; }
function ymd(v:any){ if(!v)return null; const d=new Date(v); return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10); }
function calcTargetPerHour(smv:number, manpower:number, efficiency:number){
  if(!smv||!manpower||!efficiency)return 0;
  return Math.max(1, Math.floor((manpower*60*(efficiency/100))/smv));
}
function calcDailyTarget(smv:number, manpower:number, efficiency:number, workingHours:number){
  return Math.max(1, Math.floor(calcTargetPerHour(smv,manpower,efficiency)*Math.max(1,workingHours)));
}
function statusFromDate(v:any){
  if(!v)return 'PENDING';
  const d=new Date(v); if(Number.isNaN(d.getTime()))return 'PENDING';
  return d.getTime()<=Date.now()?'READY':'PENDING';
}
function cleanWorkflowStatus(v:any){
  const s=text(v).toUpperCase();
  if(s==='COMPLETED')return 'RELEASED';
  if(['DRAFT','REVIEW','APPROVED','RELEASED'].includes(s))return s;
  return 'PENDING';
}

class OperationRowDto {
  @IsString() operation!: string;
  @IsOptional() @IsString() machineType?: string;
  @Type(() => Number) @IsNumber() @Min(0) smv!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) manpower?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) machineQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) targetPerHour?: number;
  @IsOptional() @IsString() remarks?: string;
}

class ReadinessRowDto {
  @IsString() key!: string;
  @IsIn(['READY','PENDING','BLOCKED','NA']) status!: 'READY'|'PENDING'|'BLOCKED'|'NA';
  @IsOptional() @IsString() note?: string;
}

class MachineRequirementRowDto {
  @IsString() machineType!: string;
  @Type(() => Number) @IsInt() @Min(0) qty!: number;
}

class SaveIeBulletinDto {
  @IsOptional() @IsBoolean() sampleCollected?: boolean;
  @IsOptional() @IsString() sampleRemarks?: string;
  @IsOptional() @IsString() operationNotes?: string;
  @IsOptional() @IsString() bulletinDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) revision?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) operator?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) helper?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) finishingManpower?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalManpower?: number;
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(() => MachineRequirementRowDto) machineRequirements?: MachineRequirementRowDto[];
  @Type(() => Number) @IsNumber() @Min(0.01) smv!: number;
  @Type(() => Number) @IsInt() @Min(1) manpower!: number;
  @Type(() => Number) @IsInt() @Min(1) machineQty!: number;
  @Type(() => Number) @IsNumber() @Min(1) @Max(100) achievableEfficiency!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(24) workingHours?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dailyTarget?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cuttingSmv?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costingSmv?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cmPerDozen?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costDevPerPcs?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) reducedSmv?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) revisedTarget?: number;
  @IsOptional() @Type(() => Number) @IsInt() variancePcs?: number;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsArray() @IsString({ each:true }) productionLotIds?: string[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(() => OperationRowDto) operations?: OperationRowDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(() => ReadinessRowDto) readiness?: ReadinessRowDto[];
  @IsOptional() @IsIn(['SAVE_DRAFT','SUBMIT_REVIEW','APPROVE','RELEASE']) action?: 'SAVE_DRAFT'|'SUBMIT_REVIEW'|'APPROVE'|'RELEASE';
}

type ReadyState = 'READY'|'PENDING'|'BLOCKED'|'NA';
const READY_LABELS: Record<string,string> = {
  PRODUCTION_LOT:'Production Lot / PO Scope',
  COLOR_SIZE:'Color × Size Breakdown',
  SAMPLE:'Item Reference / Physical Sample',
  FILE:'Production File Handover',
  PP:'PP Meeting / PP Approval',
  FABRIC:'Fabric Readiness',
  TRIMS:'Trims & Accessories Readiness',
};

@Controller('ie')
@UseGuards(JwtAuthGuard)
export class IeController {
  constructor(private prisma: PrismaService) {}

  private ensureIe(req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => ['ADMIN', 'IE'].includes(role))) {
      throw new ForbiddenException('Industrial Production Engineering access is required');
    }
  }

  private autoReadiness(style:any, bulletin:any){
    const sm=(style.sourceMetadata||{}) as Record<string,any>;
    const planning=sm.planning||{};
    const sectionData=sm.sectionData||{};
    const production=sm.production||{};
    const activeLots=(style.productionLots||[]).filter((x:any)=>!['CANCELLED','CLOSED'].includes(String(x.status)));
    const approvedLots=activeLots.filter((x:any)=>['APPROVED','RELEASED'].includes(String(x.status)));
    const hasBreakdown=(style.breakdowns||[]).length>0 || (style.purchaseOrders||[]).some((p:any)=>(p.breakdowns||[]).length>0);
    const fabricDelivered=numberOrNull(sectionData?.finishedFabric?.totalDeliveryKg ?? production?.fabricReceived ?? sm?.fabricProfile?.deliveredKg) || 0;
    const fabricRequired=numberOrNull(sm?.fabricProfile?.totalRequiredKg ?? production?.fabricRequired ?? sm?.fabricProfile?.fabricRequiredKg) || 0;
    const ppText=text(sm?.merchandisingFollowUp?.ppStatus || planning?.ppStatus || '').toUpperCase();
    const raw:Record<string,{status:ReadyState; note:string}>={
      PRODUCTION_LOT:{status: activeLots.length? (approvedLots.length?'READY':'PENDING'):'NA', note: activeLots.length?`${approvedLots.length}/${activeLots.length} lot approved/released`:'No production lot on legacy/imported style'},
      COLOR_SIZE:{status:hasBreakdown?'READY':'PENDING',note:hasBreakdown?'Color × Size breakdown available':'Breakdown missing'},
      SAMPLE:{status:(sm.itemImageUrl||bulletin.sampleCollected)?'READY':'PENDING',note:sm.itemImageUrl?'Merchandiser item image available':bulletin.sampleCollected?'Physical sample collected':'Item image/sample required'},
      FILE:{status:statusFromDate(planning.fileHandoverDate || sm?.sectionData?.ta?.fileHandoverDate),note:planning.fileHandoverDate?`File handover ${ymd(planning.fileHandoverDate)}`:'File handover date missing'},
      PP:{status:(/OK|DONE|APPROV|COMPLETE/.test(ppText)||statusFromDate(planning.ppMeetingDate)==='READY')?'READY':'PENDING',note:ppText|| (planning.ppMeetingDate?`PP meeting ${ymd(planning.ppMeetingDate)}`:'PP status/date missing')},
      FABRIC:{status:fabricRequired>0?(fabricDelivered>=fabricRequired*0.95?'READY':fabricDelivered>0?'PENDING':'PENDING'):(fabricDelivered>0?'READY':'PENDING'),note:fabricRequired>0?`${Math.round(fabricDelivered)} / ${Math.round(fabricRequired)} kg delivered`:fabricDelivered>0?`${Math.round(fabricDelivered)} kg delivered`:'Fabric readiness not yet confirmed'},
      TRIMS:{status:statusFromDate(planning.trimsInhouseDate || sm?.sectionData?.ta?.trimsInhouseDate),note:planning.trimsInhouseDate?`Trims in-house ${ymd(planning.trimsInhouseDate)}`:'Trims in-house date missing'},
    };
    const overrides=Array.isArray(bulletin.readiness)?bulletin.readiness:[];
    const overrideMap=new Map(overrides.map((x:any)=>[String(x.key),x]));
    return Object.entries(raw).map(([key,val])=>{
      const o:any=overrideMap.get(key);
      return {key,label:READY_LABELS[key]||key,status:(o?.status||val.status) as ReadyState,note:text(o?.note)||val.note,autoStatus:val.status,overridden:Boolean(o)};
    });
  }

  @Get('workqueue')
  async workqueue(@Req() req: any) {
    this.ensureIe(req);
    const orders = await this.prisma.order.findMany({
      include: {
        buyer: true,
        styles: {
          include: {
            purchaseOrders: { include:{ breakdowns:true }, orderBy:[{ccd:'asc'},{shipmentDate:'asc'}] },
            breakdowns: true,
            productionLots: { include:{ allocations:true }, orderBy:{createdAt:'asc'} },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const tasks = await this.prisma.task.findMany({ where: { module: 'IE' }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
    const styleTasks = new Map<string,any>(tasks.filter((t:any) => t.entityType === 'STYLE').map((t:any) => [t.entityId, t]));
    const orderTasks = new Map<string,any>(tasks.filter((t:any) => t.entityType === 'ORDER' && t.orderId).map((t:any) => [t.orderId as string, t]));

    return orders.flatMap((order) => order.styles.map((style) => {
      const sm = (style.sourceMetadata || {}) as Record<string, any>;
      const bulletin = sm.ieBulletin || {};
      const task = styleTasks.get(style.id) || orderTasks.get(order.id) || null;
      const workflowStatus=cleanWorkflowStatus(bulletin.status);
      const selectedLotIds=Array.isArray(bulletin.productionLotIds)?bulletin.productionLotIds:[];
      const lots=(style.productionLots||[]).map((lot:any)=>({
        id:lot.id,code:lot.code,name:lot.name,status:lot.status,totalQty:lot.totalQty,shipmentDate:ymd(lot.shipmentDate),selected:selectedLotIds.includes(lot.id),allocationCount:(lot.allocations||[]).length,
      }));
      const readiness=this.autoReadiness(style,bulletin);
      const planDate=sm.ganttPlan?.startDate||sm.planning?.sewingStartDate||sm.planning?.cuttingStart||sm.planning?.taPlanDate||null;
      const planMonth=planDate?String(ymd(planDate)||'').slice(0,7):null;
      const hasBulletin=Boolean(Number(bulletin.smv||0)>0||Number(bulletin.machineQty||0)>0||Number(bulletin.manpower||0)>0||bulletin.sourceFileName);
      const revision=Math.max(1,Number(bulletin.revision||1)); const releasedRevision=Number(bulletin.releasedRevision||0);
      const followUpStatus=workflowStatus==='RELEASED'?'DONE':hasBulletin&&releasedRevision>0&&revision>releasedRevision?'REVISED':hasBulletin?'PENDING':'MISSING';
      const anchor=task?.createdAt||order.createdAt; const pendingDays=followUpStatus==='DONE'?0:Math.max(0,Math.floor((Date.now()-new Date(anchor).getTime())/86400000));
      return {
        orderId: order.id,
        jobNo: order.jobNo,
        buyer: order.buyer,
        merchandiserId: order.merchandiserId,
        orderQty: order.totalQty,
        followUp:{status:followUpStatus,planMonth,line:sm.ganttPlan?.lineCode||sm.planning?.line||null,bulletinDate:ymd(bulletin.bulletinDate||bulletin.releaseDate||bulletin.updatedAt),revision,sourceFileName:bulletin.sourceFileName||null,pendingDays},
        style: {
          id:style.id, styleNo:style.styleNo, itemDescription:style.itemDescription, quantity:style.quantity, collection:style.collection, season:style.season,
          purchaseOrders:style.purchaseOrders,
          breakdownCount:(style.breakdowns||[]).length,
          itemImageUrl: sm.itemImageUrl || null,
          fobPrice: sm.fobPrice ?? null,
          ieBulletin: {...bulletin,status:workflowStatus},
          planning:sm.planning||{},
          ganttPlan:sm.ganttPlan||{},
          productionLots:lots,
          readiness,
        },
        task,
        status:workflowStatus==='PENDING' ? (task?.status || 'PENDING') : workflowStatus,
      };
    }));
  }

  @Get('daily-targets')
  async dailyTargets(@Req() req:any){
    this.ensureIe(req);
    const styles=await this.prisma.style.findMany({
      include:{order:{include:{buyer:true}},productionLots:{where:{status:{in:['APPROVED','RELEASED']}},orderBy:{shipmentDate:'asc'}},purchaseOrders:true},
      orderBy:{id:'desc'},
    });
    const out:any[]=[];
    for(const style of styles){
      const sm=(style.sourceMetadata||{}) as Record<string,any>; const b=sm.ieBulletin||{};
      if(cleanWorkflowStatus(b.status)!=='RELEASED')continue;
      const workingHours=Math.max(1,Number(b.workingHours||8));
      const tph=Number(b.targetPerHour||calcTargetPerHour(Number(b.smv||0),Number(b.manpower||0),Number(b.achievableEfficiency||b.achievableEfficiencyPct||0)));
      const daily=Number(b.dailyTarget||Math.floor(tph*workingHours));
      const selected=new Set(Array.isArray(b.productionLotIds)?b.productionLotIds:[]);
      const lots=(style.productionLots||[]).filter((x:any)=>selected.size===0||selected.has(x.id));
      if(lots.length){
        for(const lot of lots){out.push({styleId:style.id,jobNo:style.order.jobNo,buyer:style.order.buyer.name,styleNo:style.styleNo,itemDescription:style.itemDescription,scopeType:'LOT',scopeId:lot.id,scopeCode:lot.code,shipmentDate:ymd(lot.shipmentDate),qty:lot.totalQty,smv:b.smv,manpower:b.manpower,machineQty:b.machineQty,efficiency:b.achievableEfficiency||b.achievableEfficiencyPct,workingHours,targetPerHour:tph,dailyTarget:daily,requiredDays:daily?Number((lot.totalQty/daily).toFixed(2)):null,line:sm.ganttPlan?.lineCode||null,floor:sm.ganttPlan?.floorCode||null});}
      }else{
        out.push({styleId:style.id,jobNo:style.order.jobNo,buyer:style.order.buyer.name,styleNo:style.styleNo,itemDescription:style.itemDescription,scopeType:'STYLE',scopeId:style.id,scopeCode:'STYLE TOTAL',shipmentDate:ymd(style.purchaseOrders?.[0]?.shipmentDate||style.purchaseOrders?.[0]?.ccd),qty:style.quantity,smv:b.smv,manpower:b.manpower,machineQty:b.machineQty,efficiency:b.achievableEfficiency||b.achievableEfficiencyPct,workingHours,targetPerHour:tph,dailyTarget:daily,requiredDays:daily?Number((style.quantity/daily).toFixed(2)):null,line:sm.ganttPlan?.lineCode||null,floor:sm.ganttPlan?.floorCode||null});
      }
    }
    return out;
  }

  @Put('styles/:styleId/bulletin')
  async saveBulletin(@Param('styleId') styleId: string, @Body() dto: SaveIeBulletinDto, @Req() req: any) {
    this.ensureIe(req);
    const style = await this.prisma.style.findUnique({
      where: { id: styleId },
      include: { order: true, breakdowns:true, purchaseOrders:{include:{breakdowns:true}}, productionLots:{include:{allocations:true}} },
    });
    if (!style) throw new BadRequestException('Style not found');

    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const itemImageUrl = sm.itemImageUrl || null;
    const action=dto.action||'SAVE_DRAFT';
    const previous = sm.ieBulletin || {};
    const operator=Number(dto.operator??previous.operator??0); const helper=Number(dto.helper??previous.helper??0); const finishingManpower=Number(dto.finishingManpower??previous.finishingManpower??0);
    const calculatedManpower=operator+helper+finishingManpower;
    const manpower=Math.max(1,Number((dto.totalManpower??dto.manpower??previous.manpower??calculatedManpower)||1));
    const machineRequirements=(dto.machineRequirements||previous.machineRequirements||[]).filter((x:any)=>text(x.machineType)&&Number(x.qty||0)>0).map((x:any)=>({machineType:text(x.machineType),qty:Math.max(0,Math.round(Number(x.qty||0)))}));
    const requirementTotal=machineRequirements.reduce((sum:number,x:any)=>sum+Number(x.qty||0),0);
    const smv=Number(dto.smv), machineQty=Math.max(1,Number((dto.machineQty??previous.machineQty??requirementTotal)||1)), efficiency=Number(dto.achievableEfficiency), workingHours=Number(dto.workingHours||previous.workingHours||8);
    const revision=Math.max(1,Number(dto.revision??previous.revision??1));
    const bulletinDate=dto.bulletinDate?new Date(dto.bulletinDate).toISOString():previous.bulletinDate||new Date().toISOString();
    const targetPerHour=calcTargetPerHour(smv,manpower,efficiency);
    const dailyTarget=dto.dailyTarget?Number(dto.dailyTarget):calcDailyTarget(smv,manpower,efficiency,workingHours);
    const validLotIds=new Set((style.productionLots||[]).map((x:any)=>x.id));
    const requestedLots=Array.from(new Set((dto.productionLotIds||[]).filter(id=>validLotIds.has(id))));
    const fallbackLots=(style.productionLots||[]).filter((x:any)=>['APPROVED','RELEASED'].includes(String(x.status))).map((x:any)=>x.id);
    const productionLotIds=requestedLots.length?requestedLots:(Array.isArray(previous.productionLotIds)?previous.productionLotIds:fallbackLots);
    const operations=(dto.operations||[]).filter(x=>text(x.operation)).map(x=>({operation:text(x.operation),machineType:text(x.machineType)||'',smv:Number(x.smv||0),manpower:Number(x.manpower||0),machineQty:Number(x.machineQty||0),targetPerHour:Number(x.targetPerHour||0),remarks:text(x.remarks)||''}));
    const readiness=(dto.readiness||[]).filter(x=>READY_LABELS[x.key]).map(x=>({key:x.key,status:x.status,note:text(x.note)}));
    const proposed={...previous,sampleCollected:Boolean(dto.sampleCollected),readiness,productionLotIds};
    const computedReadiness=this.autoReadiness(style,proposed); // kept for backward compatibility; it no longer blocks IE release.
    const operationSmv=operations.reduce((s,x)=>s+Number(x.smv||0),0);

    const status=action==='SUBMIT_REVIEW'?'REVIEW':action==='APPROVE'?'APPROVED':action==='RELEASE'?'RELEASED':'DRAFT';
    const now = new Date();
    const next = {
      ...previous,
      status,
      sampleSource: itemImageUrl && dto.sampleCollected ? 'MERCH_IMAGE_AND_PHYSICAL_SAMPLE' : itemImageUrl ? 'MERCH_IMAGE' : dto.sampleCollected ? 'PHYSICAL_SAMPLE' : 'PENDING',
      itemImageUrl,
      sampleCollected: Boolean(dto.sampleCollected),
      sampleRemarks: dto.sampleRemarks?.trim() || '',
      operationNotes: dto.operationNotes?.trim() || '',
      bulletinDate,revision,operator,helper,finishingManpower,totalManpower:manpower,machineRequirements,
      smv, manpower, machineQty, achievableEfficiency:efficiency, achievableEfficiencyPct:efficiency, workingHours,
      targetPerHour, dailyTarget,
      cuttingSmv:dto.cuttingSmv??previous.cuttingSmv??null,
      costingSmv:dto.costingSmv??previous.costingSmv??null,
      cmPerDozen:dto.cmPerDozen??previous.cmPerDozen??null,
      costDevPerPcs:dto.costDevPerPcs??previous.costDevPerPcs??null,
      reducedSmv:dto.reducedSmv??previous.reducedSmv??null,
      revisedTarget:dto.revisedTarget??previous.revisedTarget??null,
      variancePcs:dto.variancePcs??previous.variancePcs??null,
      remarks: dto.remarks?.trim() || '',
      productionLotIds,
      operations,
      operationSmvTotal:Number(operationSmv.toFixed(3)),
      readiness,
      readinessSnapshot:computedReadiness,
      updatedAt:now.toISOString(), updatedByUserId:req.user.id, updatedByName:req.user.name,
      ...(status==='REVIEW'?{submittedAt:now.toISOString(),submittedByName:req.user.name}:{}),
      ...(status==='APPROVED'?{approvedAt:now.toISOString(),approvedByName:req.user.name}:{}),
      ...(status==='RELEASED'?{releasedAt:now.toISOString(),releaseDate:now.toISOString(),releasedByName:req.user.name,releasedRevision:revision}:{}),
    };

    await this.prisma.$transaction(async (tx) => {
      const nextMeta:any={...sm,ieBulletin:next};
      nextMeta.sectionData={...(sm.sectionData||{}),ie:{...(sm.sectionData?.ie||{}),smv,machineQty,manpower,operator,helper,finishingManpower,machineRequirements,efficiencyPct:efficiency,targetPerHour,dailyTarget,bulletinStatus:status,bulletinDate,revision,workingHours,productionLotIds}};
      if(status==='RELEASED'){
        nextMeta.ganttPlan={...(sm.ganttPlan||{}),smv,manpower,machineQty,machineRequirements,efficiencyPct:efficiency,dailyTarget,workingHours,ieStatus:'RELEASED',ieRevision:revision,ieReleasedAt:now.toISOString(),productionLotIds};
      }
      await tx.style.update({ where: { id: styleId }, data: { sourceMetadata: toPrismaJson(nextMeta) } });
      await tx.task.updateMany({ where: { module: 'IE', entityType: 'STYLE', entityId: styleId, status:{in:['PENDING','IN_PROGRESS','BLOCKED']} }, data: (status==='RELEASED'?{status:'COMPLETED',completedAt:now,blockedReason:null}:{status:'IN_PROGRESS',blockedReason:null}) as any });
      if(status==='RELEASED'){
        const siblingStyles = await tx.style.findMany({ where: { orderId: style.orderId }, select: { sourceMetadata: true } });
        const allReleased = siblingStyles.every((row) => cleanWorkflowStatus(((row.sourceMetadata||{}) as any).ieBulletin?.status)==='RELEASED');
        if (allReleased) await tx.task.updateMany({ where: { module:'IE',orderId:style.orderId,entityType:'ORDER',status:{in:['PENDING','IN_PROGRESS','BLOCKED']} }, data:{status:'COMPLETED',completedAt:now,blockedReason:null} });
      }
      await tx.auditLog.create({ data: { userId:req.user.id,action:`IE_BULLETIN_${status}`,entityType:'STYLE',entityId:styleId,before:toPrismaJson(previous),after:toPrismaJson(next) } });
    });

    return { ok:true, bulletin:next, readiness:computedReadiness, message:`IE Bulletin ${status.toLowerCase()} for ${style.order.jobNo} / ${style.styleNo}` };
  }
}
