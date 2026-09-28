import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

const txt=(v:any)=>String(v??'').trim();
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const pageSize=(v:any)=>Math.max(10,Math.min(200,Number(v)||50));
const pageNo=(v:any)=>Math.max(1,Number(v)||1);
const json=(v:any)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const stockKey=(itemId:string,lotId?:string|null,locationCode?:string|null,rollNo?:string|null)=>[itemId,lotId||'-',locationCode||'-',rollNo||'-'].join('|');

@Controller('material-flow')
@UseGuards(JwtAuthGuard)
export class MaterialFlowController {
  constructor(private prisma:PrismaService){}

  private async audit(req:any,action:string,entityType:string,entityId:string,after:any){
    await this.prisma.auditLog.create({data:{userId:req.user?.id||null,action,entityType,entityId,after:json(after)}});
  }

  private async move(tx:any,req:any,body:any){
    const itemId=txt(body.itemId); const qty=Math.abs(num(body.qty)); const direction=txt(body.direction).toUpperCase()==='OUT'?'OUT':'IN';
    if(!itemId||qty<=0) throw new BadRequestException('Item and positive quantity are required');
    const idem=txt(body.idempotencyKey)||`${txt(body.referenceType)||'MANUAL'}:${txt(body.referenceId)||Date.now()}:${itemId}:${direction}`;
    const duplicate=await tx.materialLedger.findUnique({where:{idempotencyKey:idem}}); if(duplicate)return duplicate;
    const item=await tx.materialItem.findUnique({where:{id:itemId}}); if(!item||!item.active)throw new BadRequestException('Active material item not found');
    const key=stockKey(itemId,txt(body.lotId)||null,txt(body.locationCode)||null,txt(body.rollNo)||null);
    const current=await tx.materialStockBalance.findUnique({where:{stockKey:key}});
    const before=Number(current?.qty||0); const delta=direction==='IN'?qty:-qty; const after=before+delta;
    if(after<-0.0001)throw new BadRequestException(`Insufficient stock. Available ${before.toFixed(3)} ${item.uom}`);
    await tx.materialStockBalance.upsert({where:{stockKey:key},update:{qty:after,jobNo:txt(body.jobNo)||current?.jobNo||null,updatedAt:new Date()},create:{stockKey:key,itemId,lotId:txt(body.lotId)||null,locationCode:txt(body.locationCode)||null,rollNo:txt(body.rollNo)||null,jobNo:txt(body.jobNo)||null,qty:after}});
    return tx.materialLedger.create({data:{itemId,lotId:txt(body.lotId)||null,locationCode:txt(body.locationCode)||null,rollNo:txt(body.rollNo)||null,jobNo:txt(body.jobNo)||null,styleId:txt(body.styleId)||null,batchNo:txt(body.batchNo)||null,txnType:txt(body.txnType)||'ADJUSTMENT',direction,qty,uom:item.uom,referenceType:txt(body.referenceType)||'MANUAL',referenceId:txt(body.referenceId)||null,idempotencyKey:idem,remarks:txt(body.remarks)||null,createdByName:req.user?.name||null}});
  }

  @Get('overview')
  async overview(){
    const [yarnItems,stock,knittingOpen,greigeAvailable,dyeOpen]=await Promise.all([
      this.prisma.materialItem.count({where:{category:'YARN',active:true}}),
      this.prisma.materialStockBalance.aggregate({_sum:{qty:true}}),
      this.prisma.knittingPlan.count({where:{status:{in:['PLANNED','RUNNING','HOLD']}}}),
      this.prisma.greigeRoll.count({where:{status:'AVAILABLE'}}),
      this.prisma.dyeBatch.count({where:{status:{in:['PLANNED','RUNNING','HOLD','REPROCESS']}}}),
    ]);
    const low=await this.prisma.materialStockBalance.findMany({where:{qty:{lte:0}},take:20,orderBy:{updatedAt:'desc'}});
    return {yarnItems,totalStockQty:Number(stock._sum.qty||0),knittingOpen,greigeAvailable,dyeOpen,exceptions:low.length};
  }

  @Get('items')
  async items(@Query('category') category?:string,@Query('q') q?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const take=pageSize(ps),page=pageNo(p),search=txt(q);
    const where:any={active:true,...(category?{category:txt(category).toUpperCase()}:{})};
    if(search)where.OR=[{code:{contains:search,mode:'insensitive'}},{name:{contains:search,mode:'insensitive'}},{composition:{contains:search,mode:'insensitive'}}];
    const [rows,total]=await Promise.all([this.prisma.materialItem.findMany({where,orderBy:{code:'asc'},skip:(page-1)*take,take}),this.prisma.materialItem.count({where})]);
    return {rows,total,page,pageSize:take};
  }

  @Post('items')
  async createItem(@Req() req:any,@Body() b:any){
    const code=txt(b.code).toUpperCase(),name=txt(b.name),category=txt(b.category).toUpperCase();
    if(!code||!name||!['YARN','GREIGE','FINISHED_FABRIC'].includes(category))throw new BadRequestException('Valid category, code and name are required');
    const row=await this.prisma.materialItem.upsert({where:{code},update:{name,category,count:txt(b.count)||null,composition:txt(b.composition)||null,color:txt(b.color)||null,gsm:num(b.gsm)||null,width:txt(b.width)||null,uom:txt(b.uom)||'KG',active:true},create:{code,name,category,count:txt(b.count)||null,composition:txt(b.composition)||null,color:txt(b.color)||null,gsm:num(b.gsm)||null,width:txt(b.width)||null,uom:txt(b.uom)||'KG'}});
    await this.audit(req,'MATERIAL_ITEM_SAVED','MATERIAL_ITEM',row.id,row);return row;
  }

  @Post('lots')
  async createLot(@Req() req:any,@Body() b:any){
    if(!txt(b.itemId)||!txt(b.lotNo))throw new BadRequestException('Item and lot number are required');
    const row=await this.prisma.materialLot.upsert({where:{itemId_lotNo:{itemId:txt(b.itemId),lotNo:txt(b.lotNo)}},update:{supplierName:txt(b.supplierName)||null,supplierLotNo:txt(b.supplierLotNo)||null,shade:txt(b.shade)||null,status:txt(b.status)||'OPEN'},create:{itemId:txt(b.itemId),lotNo:txt(b.lotNo),supplierName:txt(b.supplierName)||null,supplierLotNo:txt(b.supplierLotNo)||null,shade:txt(b.shade)||null,status:txt(b.status)||'OPEN'}});
    await this.audit(req,'MATERIAL_LOT_SAVED','MATERIAL_LOT',row.id,row);return row;
  }

  @Get('stock')
  async stock(@Query('category') category?:string,@Query('jobNo') jobNo?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const take=pageSize(ps),page=pageNo(p);
    const items=category?await this.prisma.materialItem.findMany({where:{category:txt(category).toUpperCase()},select:{id:true}}):[];
    const where:any={...(jobNo?{jobNo:txt(jobNo)}:{}),...(category?{itemId:{in:items.map(x=>x.id)}}:{})};
    const [rows,total]=await Promise.all([this.prisma.materialStockBalance.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*take,take}),this.prisma.materialStockBalance.count({where})]);
    const ids=[...new Set(rows.map(x=>x.itemId))];const itemRows=await this.prisma.materialItem.findMany({where:{id:{in:ids}}});const map=new Map(itemRows.map(x=>[x.id,x]));
    return {rows:rows.map(x=>({...x,item:map.get(x.itemId)||null})),total,page,pageSize:take};
  }

  @Get('ledger')
  async ledger(@Query('itemId') itemId?:string,@Query('jobNo') jobNo?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const take=pageSize(ps),page=pageNo(p),where:any={...(itemId?{itemId:txt(itemId)}:{}),...(jobNo?{jobNo:txt(jobNo)}:{})};
    const [rows,total]=await Promise.all([this.prisma.materialLedger.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*take,take}),this.prisma.materialLedger.count({where})]);
    return {rows,total,page,pageSize:take};
  }

  @Post('movements')
  async movement(@Req() req:any,@Body() b:any){
    const row=await this.prisma.$transaction(tx=>this.move(tx,req,b),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    await this.audit(req,'MATERIAL_MOVEMENT','MATERIAL_LEDGER',row.id,row);return row;
  }

  @Get('reservations')
  async reservations(@Query('jobNo') jobNo?:string){return this.prisma.materialReservation.findMany({where:{...(jobNo?{jobNo:txt(jobNo)}:{}),status:{in:['RESERVED','PARTIAL']}},orderBy:{createdAt:'desc'},take:200})}

  @Post('reservations')
  async reserve(@Req() req:any,@Body() b:any){
    const qty=Math.abs(num(b.qty));if(!txt(b.itemId)||!txt(b.jobNo)||qty<=0)throw new BadRequestException('Item, job and positive quantity are required');
    const row=await this.prisma.materialReservation.create({data:{itemId:txt(b.itemId),lotId:txt(b.lotId)||null,jobNo:txt(b.jobNo),styleId:txt(b.styleId)||null,qty,status:'RESERVED',reference:txt(b.reference)||null,createdByName:req.user?.name||null}});
    await this.audit(req,'MATERIAL_RESERVED','MATERIAL_RESERVATION',row.id,row);return row;
  }

  @Get('knitting/plans')
  async knittingPlans(@Query('status') status?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const take=pageSize(ps),page=pageNo(p),where:any=status?{status:txt(status).toUpperCase()}:{};
    const [rows,total]=await Promise.all([this.prisma.knittingPlan.findMany({where,orderBy:{plannedStart:'asc'},skip:(page-1)*take,take}),this.prisma.knittingPlan.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('knitting/plans')
  async saveKnittingPlan(@Req() req:any,@Body() b:any){
    if(!txt(b.jobNo)||!txt(b.fabricCode))throw new BadRequestException('Job and fabric code are required');
    const row=await this.prisma.knittingPlan.create({data:{jobNo:txt(b.jobNo),styleId:txt(b.styleId)||null,fabricCode:txt(b.fabricCode).toUpperCase(),machineCode:txt(b.machineCode)||null,machineCapability:txt(b.machineCapability)||null,plannedStart:b.plannedStart?new Date(b.plannedStart):null,plannedEnd:b.plannedEnd?new Date(b.plannedEnd):null,targetKg:Math.max(0,num(b.targetKg)),status:txt(b.status)||'PLANNED',subcontractor:txt(b.subcontractor)||null,remarks:txt(b.remarks)||null,createdByName:req.user?.name||null}});
    await this.audit(req,'KNITTING_PLAN_CREATED','KNITTING_PLAN',row.id,row);return row;
  }

  @Post('knitting/production')
  async knittingProduction(@Req() req:any,@Body() b:any){
    const plan=await this.prisma.knittingPlan.findUnique({where:{id:txt(b.planId)}});if(!plan)throw new BadRequestException('Knitting plan not found');
    const greigeKg=Math.max(0,num(b.greigeKg)),rollNo=txt(b.rollNo);if(greigeKg<=0||!rollNo)throw new BadRequestException('Greige quantity and roll number are required');
    const sourceRef=txt(b.sourceRef)||`KNIT:${plan.id}:${rollNo}`;
    const result=await this.prisma.$transaction(async tx=>{
      const existing=await tx.knittingProduction.findUnique({where:{sourceRef}});if(existing)return {production:existing,duplicate:true};
      if(num(b.yarnConsumedKg)>0){await this.move(tx,req,{itemId:b.yarnItemId,lotId:b.yarnLotId,locationCode:b.yarnLocationCode,jobNo:plan.jobNo,styleId:plan.styleId,qty:num(b.yarnConsumedKg),direction:'OUT',txnType:'KNITTING_CONSUMPTION',referenceType:'KNITTING',referenceId:sourceRef,idempotencyKey:`${sourceRef}:YARN:OUT`})}
      if(num(b.yarnReturnedKg)>0){await this.move(tx,req,{itemId:b.yarnItemId,lotId:b.yarnLotId,locationCode:b.yarnLocationCode,jobNo:plan.jobNo,styleId:plan.styleId,qty:num(b.yarnReturnedKg),direction:'IN',txnType:'KNITTING_RETURN',referenceType:'KNITTING',referenceId:sourceRef,idempotencyKey:`${sourceRef}:YARN:RETURN`})}
      const itemCode=`GR-${plan.fabricCode}`;const greigeItem=await tx.materialItem.upsert({where:{code:itemCode},update:{active:true},create:{code:itemCode,name:`Greige ${plan.fabricCode}`,category:'GREIGE',uom:'KG'}});
      const lotNo=txt(b.greigeLotNo)||`K-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;const lot=await tx.materialLot.upsert({where:{itemId_lotNo:{itemId:greigeItem.id,lotNo}},update:{status:'OPEN'},create:{itemId:greigeItem.id,lotNo,status:'OPEN'}});
      const production=await tx.knittingProduction.create({data:{planId:plan.id,productionDate:b.productionDate?new Date(b.productionDate):new Date(),shift:txt(b.shift)||null,yarnItemId:txt(b.yarnItemId)||null,yarnLotId:txt(b.yarnLotId)||null,yarnIssuedKg:Math.max(0,num(b.yarnIssuedKg)),yarnConsumedKg:Math.max(0,num(b.yarnConsumedKg)),yarnReturnedKg:Math.max(0,num(b.yarnReturnedKg)),wastageKg:Math.max(0,num(b.wastageKg)),greigeKg,rollNo,sourceRef,createdByName:req.user?.name||null}});
      const roll=await tx.greigeRoll.create({data:{rollNo,knittingProductionId:production.id,jobNo:plan.jobNo,styleId:plan.styleId,materialItemId:greigeItem.id,materialLotId:lot.id,lotNo,gsm:num(b.gsm)||null,composition:txt(b.composition)||null,width:txt(b.width)||null,weightKg:greigeKg,qualityStatus:txt(b.qualityStatus)||'PENDING',locationCode:txt(b.locationCode)||'GREIGE-RECEIVING',status:'AVAILABLE'}});
      await this.move(tx,req,{itemId:greigeItem.id,lotId:lot.id,locationCode:roll.locationCode,rollNo,jobNo:plan.jobNo,styleId:plan.styleId,qty:greigeKg,direction:'IN',txnType:'KNITTING_OUTPUT',referenceType:'KNITTING',referenceId:sourceRef,idempotencyKey:`${sourceRef}:GREIGE:IN`});
      await tx.knittingPlan.update({where:{id:plan.id},data:{actualKg:{increment:greigeKg},status:'RUNNING'}});return{production,roll,duplicate:false};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    await this.audit(req,'KNITTING_PRODUCTION_POSTED','KNITTING_PLAN',plan.id,result);return result;
  }

  @Get('greige/rolls')
  async greigeRolls(@Query('status') status?:string,@Query('jobNo') jobNo?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const take=pageSize(ps),page=pageNo(p),where:any={...(status?{status:txt(status).toUpperCase()}:{}),...(jobNo?{jobNo:txt(jobNo)}:{})};
    const [rows,total]=await Promise.all([this.prisma.greigeRoll.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*take,take}),this.prisma.greigeRoll.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('greige/rolls/:id/quality')
  async greigeQuality(@Req() req:any,@Param('id') id:string,@Body() b:any){
    const qualityStatus=txt(b.qualityStatus).toUpperCase();if(!['PENDING','PASSED','HOLD','REJECTED'].includes(qualityStatus))throw new BadRequestException('Invalid quality status');
    const row=await this.prisma.greigeRoll.update({where:{id},data:{qualityStatus,status:qualityStatus==='REJECTED'?'REJECTED':qualityStatus==='HOLD'?'HOLD':'AVAILABLE'}});
    await this.audit(req,'GREIGE_QUALITY_UPDATED','GREIGE_ROLL',id,row);return row;
  }

  @Get('dyeing/batches')
  async dyeBatches(@Query('status') status?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const take=pageSize(ps),page=pageNo(p),where:any=status?{status:txt(status).toUpperCase()}:{};
    const [rows,total]=await Promise.all([this.prisma.dyeBatch.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*take,take}),this.prisma.dyeBatch.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('dyeing/batches')
  async createDyeBatch(@Req() req:any,@Body() b:any){
    const rollIds=Array.isArray(b.rollIds)?b.rollIds.map(txt).filter(Boolean):[];if(!txt(b.batchNo)||!txt(b.jobNo)||!rollIds.length)throw new BadRequestException('Batch number, job and at least one roll are required');
    const row=await this.prisma.$transaction(async tx=>{
      const rolls=await tx.greigeRoll.findMany({where:{id:{in:rollIds}}});if(rolls.length!==rollIds.length||rolls.some(x=>x.status!=='AVAILABLE'||x.qualityStatus==='REJECTED'||x.qualityStatus==='HOLD'))throw new BadRequestException('One or more rolls are not available for dyeing');
      const inputKg=rolls.reduce((s,x)=>s+Number(x.weightKg),0);
      const batch=await tx.dyeBatch.create({data:{batchNo:txt(b.batchNo).toUpperCase(),jobNo:txt(b.jobNo),styleId:txt(b.styleId)||null,color:txt(b.color)||null,shade:txt(b.shade)||null,machineCode:txt(b.machineCode)||null,recipeRef:txt(b.recipeRef)||null,plannedStart:b.plannedStart?new Date(b.plannedStart):null,plannedEnd:b.plannedEnd?new Date(b.plannedEnd):null,inputKg,status:txt(b.status)||'PLANNED',parentBatchId:txt(b.parentBatchId)||null,remarks:txt(b.remarks)||null,createdByName:req.user?.name||null}});
      for(const roll of rolls){await tx.dyeBatchRoll.create({data:{batchId:batch.id,rollId:roll.id,inputWeightKg:roll.weightKg}});await tx.greigeRoll.update({where:{id:roll.id},data:{status:'RESERVED_DYEING',dyeBatchId:batch.id}})}
      return batch;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    await this.audit(req,'DYE_BATCH_CREATED','DYE_BATCH',row.id,row);return row;
  }

  @Post('dyeing/batches/:id/start')
  async startDyeBatch(@Req() req:any,@Param('id') id:string){
    const result=await this.prisma.$transaction(async tx=>{
      const batch=await tx.dyeBatch.findUnique({where:{id}});if(!batch)throw new BadRequestException('Dye batch not found');if(batch.status==='RUNNING')return batch;if(!['PLANNED','REPROCESS'].includes(batch.status))throw new BadRequestException('Batch cannot be started from current status');
      const links=await tx.dyeBatchRoll.findMany({where:{batchId:id}});const rolls=await tx.greigeRoll.findMany({where:{id:{in:links.map(x=>x.rollId)}}});
      for(const roll of rolls){if(roll.status!=='RESERVED_DYEING')throw new BadRequestException(`Roll ${roll.rollNo} is not reserved for this batch`);await this.move(tx,req,{itemId:roll.materialItemId,lotId:roll.materialLotId,locationCode:roll.locationCode,rollNo:roll.rollNo,jobNo:roll.jobNo,styleId:roll.styleId,batchNo:batch.batchNo,qty:roll.weightKg,direction:'OUT',txnType:'DYEING_ISSUE',referenceType:'DYE_BATCH',referenceId:id,idempotencyKey:`DYE:${id}:ROLL:${roll.id}:OUT`});await tx.greigeRoll.update({where:{id:roll.id},data:{status:'IN_DYEING'}})}
      return tx.dyeBatch.update({where:{id},data:{status:'RUNNING',actualStart:new Date()}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    await this.audit(req,'DYE_BATCH_STARTED','DYE_BATCH',id,result);return result;
  }

  @Post('dyeing/batches/:id/complete')
  async completeDyeBatch(@Req() req:any,@Param('id') id:string,@Body() b:any){
    const outputKg=Math.max(0,num(b.outputKg));if(outputKg<=0)throw new BadRequestException('Finished output quantity is required');
    const result=await this.prisma.$transaction(async tx=>{
      const batch=await tx.dyeBatch.findUnique({where:{id}});if(!batch)throw new BadRequestException('Dye batch not found');if(batch.status==='COMPLETED')return batch;if(batch.status!=='RUNNING')throw new BadRequestException('Only a running batch can be completed');
      const itemCode=txt(b.finishedItemCode).toUpperCase()||`FF-${batch.jobNo}-${txt(batch.color||'NA').replace(/\s+/g,'-').toUpperCase()}`;const item=await tx.materialItem.upsert({where:{code:itemCode},update:{active:true,color:batch.color||undefined},create:{code:itemCode,name:`Finished Fabric ${batch.jobNo} ${batch.color||''}`.trim(),category:'FINISHED_FABRIC',color:batch.color||null,uom:'KG'}});
      const lotNo=txt(b.finishedLotNo)||batch.batchNo;const lot=await tx.materialLot.upsert({where:{itemId_lotNo:{itemId:item.id,lotNo}},update:{status:'OPEN',shade:batch.shade},create:{itemId:item.id,lotNo,shade:batch.shade,status:'OPEN'}});
      await this.move(tx,req,{itemId:item.id,lotId:lot.id,locationCode:txt(b.locationCode)||'FINISHED-FABRIC-RECEIVING',jobNo:batch.jobNo,styleId:batch.styleId,batchNo:batch.batchNo,qty:outputKg,direction:'IN',txnType:'DYEING_OUTPUT',referenceType:'DYE_BATCH',referenceId:id,idempotencyKey:`DYE:${id}:FINISHED:IN`});
      await tx.greigeRoll.updateMany({where:{dyeBatchId:id},data:{status:'CONSUMED'}});
      const processLossKg=Math.max(0,Number(batch.inputKg)-outputKg);
      await tx.finishedFabricHandoff.upsert({where:{sourceRef:`DYE:${id}:HANDOFF`},update:{qtyKg:outputKg,status:'READY'},create:{dyeBatchId:id,jobNo:batch.jobNo,styleId:batch.styleId,materialItemId:item.id,materialLotId:lot.id,qtyKg:outputKg,status:'READY',sourceRef:`DYE:${id}:HANDOFF`,createdByName:req.user?.name||null}});
      return tx.dyeBatch.update({where:{id},data:{outputKg,processLossKg,status:'COMPLETED',actualEnd:new Date()}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    await this.audit(req,'DYE_BATCH_COMPLETED','DYE_BATCH',id,result);return result;
  }

  @Post('dyeing/batches/:id/reprocess')
  async reprocess(@Req() req:any,@Param('id') id:string,@Body() b:any){
    const parent=await this.prisma.dyeBatch.findUnique({where:{id}});if(!parent)throw new BadRequestException('Original batch not found');
    const batchNo=txt(b.batchNo).toUpperCase();if(!batchNo)throw new BadRequestException('New reprocess batch number is required');
    const row=await this.prisma.dyeBatch.create({data:{batchNo,jobNo:parent.jobNo,styleId:parent.styleId,color:txt(b.color)||parent.color,shade:txt(b.shade)||parent.shade,machineCode:txt(b.machineCode)||parent.machineCode,recipeRef:txt(b.recipeRef)||parent.recipeRef,inputKg:Math.max(0,num(b.inputKg)||Number(parent.outputKg||0)),status:'REPROCESS',parentBatchId:parent.id,remarks:txt(b.remarks)||'Reprocess linked to original batch',createdByName:req.user?.name||null}});
    await this.audit(req,'DYE_BATCH_REPROCESS_CREATED','DYE_BATCH',row.id,row);return row;
  }

  @Get('finished-handoffs')
  async handoffs(@Query('status') status?:string){return this.prisma.finishedFabricHandoff.findMany({where:status?{status:txt(status).toUpperCase()}:undefined,orderBy:{createdAt:'desc'},take:200})}
}
