import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';
const t=(v:any)=>String(v??'').trim();const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;const j=(v:any)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
@Controller('yarn-fabric') @UseGuards(JwtAuthGuard)
export class YarnFabricController{
 constructor(private prisma:PrismaService){}
 private async audit(req:any,action:string,type:string,id:string,after:any){await this.prisma.auditLog.create({data:{userId:req.user?.id||null,action,entityType:type,entityId:id,after:j(after)}})}
 @Post('sync-cad-requirements')
 async syncCad(@Req() req:any){
  const orders=await this.prisma.order.findMany({include:{buyer:true,styles:true},orderBy:{createdAt:'desc'},take:5000});let synced=0;
  for(const order of orders)for(const style of order.styles){const om=(order.sourceMetadata||{}) as any;const cad=om.cadConsumption;if(!cad||cad.status!=='CONFIRMED'||!Array.isArray(cad.rows))continue;
   for(let x=0;x<cad.rows.length;x++){const r=cad.rows[x];if(t(r.styleId)!==style.id)continue;const sourceRef=`CAD:${order.id}:${style.id}:${x}`;await this.prisma.fabricRequirement.upsert({where:{sourceRef},update:{jobNo:order.jobNo,styleNo:style.styleNo,buyerName:order.buyer?.name||null,color:t(r.color)||null,fabricDescription:t(r.fabricDescription)||'Fabric',fabricType:t(r.fabricType)||null,gsm:n(r.gsm)||null,dia:t(r.dia)||null,requiredKg:Math.max(0,n(r.requiredKg)),status:'OPEN',sourceUpdatedAt:cad.updatedAt?new Date(cad.updatedAt):new Date()},create:{sourceRef,orderId:order.id,styleId:style.id,jobNo:order.jobNo,styleNo:style.styleNo,buyerName:order.buyer?.name||null,color:t(r.color)||null,fabricDescription:t(r.fabricDescription)||'Fabric',fabricType:t(r.fabricType)||null,gsm:n(r.gsm)||null,dia:t(r.dia)||null,requiredKg:Math.max(0,n(r.requiredKg)),sourceUpdatedAt:cad.updatedAt?new Date(cad.updatedAt):new Date()}});synced++}
  }await this.audit(req,'CAD_FABRIC_REQUIREMENTS_SYNCED','FABRIC_REQUIREMENT','BULK',{synced});return{synced};
 }
 @Get('fabric-requirements')
 async fabricRequirements(@Query('q') q?:string){const s=t(q);return this.prisma.fabricRequirement.findMany({where:s?{OR:[{jobNo:{contains:s,mode:'insensitive'}},{styleNo:{contains:s,mode:'insensitive'}},{fabricDescription:{contains:s,mode:'insensitive'}}]}:undefined,orderBy:{updatedAt:'desc'},take:300})}
 @Get('yarn-requirements')
 async yarnRequirements(@Query('q') q?:string){const s=t(q);return this.prisma.yarnRequirement.findMany({where:s?{jobNo:{contains:s,mode:'insensitive'}}:undefined,orderBy:{updatedAt:'desc'},take:300})}
 @Post('yarn-requirements')
 async saveYarnRequirement(@Req() req:any,@Body() b:any){if(!t(b.jobNo)||n(b.requiredKg)<=0)throw new BadRequestException('Job and required KG are required');const row=await this.prisma.yarnRequirement.create({data:{fabricRequirementId:t(b.fabricRequirementId)||null,jobNo:t(b.jobNo),styleId:t(b.styleId)||null,yarnItemId:t(b.yarnItemId)||null,yarnCount:t(b.yarnCount)||null,composition:t(b.composition)||null,color:t(b.color)||null,requiredKg:Math.max(0,n(b.requiredKg)),status:'OPEN',remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});await this.audit(req,'YARN_REQUIREMENT_CREATED','YARN_REQUIREMENT',row.id,row);return row}
 @Get('procurement')
 async procurement(){return this.prisma.yarnProcurement.findMany({orderBy:{updatedAt:'desc'},take:300})}
 @Post('procurement')
 async saveProcurement(@Req() req:any,@Body() b:any){if(!t(b.jobNo)||!t(b.supplierName)||n(b.qtyKg)<=0)throw new BadRequestException('Job, supplier and quantity are required');const sourceRef=t(b.sourceRef)||`PO:${Date.now()}:${t(b.jobNo)}`;const row=await this.prisma.yarnProcurement.create({data:{yarnRequirementId:t(b.yarnRequirementId)||null,jobNo:t(b.jobNo),yarnItemId:t(b.yarnItemId)||null,supplierName:t(b.supplierName),piNo:t(b.piNo)||null,lcNo:t(b.lcNo)||null,qtyKg:Math.max(0,n(b.qtyKg)),etd:b.etd?new Date(b.etd):null,eta:b.eta?new Date(b.eta):null,status:t(b.status)||'PLANNED',sourceRef,remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});if(row.yarnRequirementId)await this.prisma.yarnRequirement.update({where:{id:row.yarnRequirementId},data:{orderedKg:{increment:row.qtyKg},status:'ORDERED'}});await this.audit(req,'YARN_PROCUREMENT_CREATED','YARN_PROCUREMENT',row.id,row);return row}
 @Get('yarn-dyeing')
 async yarnDyeing(){return this.prisma.yarnDyeBatch.findMany({orderBy:{updatedAt:'desc'},take:300})}
 @Post('yarn-dyeing')
 async createYarnDye(@Req() req:any,@Body() b:any){if(!t(b.batchNo)||!t(b.jobNo)||!t(b.greyYarnItemId)||!t(b.color)||n(b.sentKg)<=0)throw new BadRequestException('Batch, job, grey yarn, color and sent KG are required');const row=await this.prisma.yarnDyeBatch.create({data:{batchNo:t(b.batchNo).toUpperCase(),jobNo:t(b.jobNo),styleId:t(b.styleId)||null,greyYarnItemId:t(b.greyYarnItemId),greyYarnLotId:t(b.greyYarnLotId)||null,processorName:t(b.processorName)||null,color:t(b.color),shade:t(b.shade)||null,sentKg:Math.max(0,n(b.sentKg)),sentAt:new Date(),status:'SENT',remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});await this.audit(req,'YARN_DYE_BATCH_CREATED','YARN_DYE_BATCH',row.id,row);return row}
 @Put('yarn-dyeing/:id/receive')
 async receiveYarnDye(@Req() req:any,@Param('id') id:string,@Body() b:any){const before=await this.prisma.yarnDyeBatch.findUnique({where:{id}});if(!before)throw new BadRequestException('Yarn dye batch not found');const receivedKg=Math.max(0,n(b.receivedKg));if(receivedKg<=0)throw new BadRequestException('Received KG is required');const row=await this.prisma.yarnDyeBatch.update({where:{id},data:{receivedKg,processLossKg:Math.max(0,before.sentKg-receivedKg),dyedYarnItemId:t(b.dyedYarnItemId)||null,dyedYarnLotId:t(b.dyedYarnLotId)||null,receivedAt:new Date(),status:'RECEIVED',shade:t(b.shade)||before.shade}});await this.audit(req,'YARN_DYE_BATCH_RECEIVED','YARN_DYE_BATCH',id,row);return row}
 @Get('lab-tests')
 async labTests(@Query('jobNo') jobNo?:string){return this.prisma.labTestRecord.findMany({where:jobNo?{jobNo:t(jobNo)}:undefined,orderBy:{updatedAt:'desc'},take:300})}
 @Post('lab-tests')
 async createTest(@Req() req:any,@Body() b:any){if(!t(b.jobNo)||!t(b.testType))throw new BadRequestException('Job and test type are required');const testNo=t(b.testNo)||`LAB-${Date.now().toString(36).toUpperCase()}`;const row=await this.prisma.labTestRecord.create({data:{testNo,scope:t(b.scope)||'FABRIC',referenceType:t(b.referenceType)||'JOB',referenceId:t(b.referenceId)||null,jobNo:t(b.jobNo),styleId:t(b.styleId)||null,batchNo:t(b.batchNo)||null,testType:t(b.testType),resultStatus:'PENDING',remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});await this.audit(req,'LAB_TEST_CREATED','LAB_TEST',row.id,row);return row}
 @Put('lab-tests/:id/result')
 async testResult(@Req() req:any,@Param('id') id:string,@Body() b:any){const status=t(b.resultStatus).toUpperCase();if(!['PASS','FAIL','HOLD','PENDING'].includes(status))throw new BadRequestException('Invalid test status');const row=await this.prisma.labTestRecord.update({where:{id},data:{resultStatus:status,resultValue:t(b.resultValue)||null,reportRef:t(b.reportRef)||null,testedAt:new Date(),releasedAt:status==='PASS'?new Date():null,remarks:t(b.remarks)||undefined}});await this.audit(req,'LAB_TEST_RESULT','LAB_TEST',id,row);return row}
 @Get('dashboard')
 async dashboard(){const [fabric,yarn,procurement,yarnDye,tests]=await Promise.all([this.prisma.fabricRequirement.count({where:{status:'OPEN'}}),this.prisma.yarnRequirement.count({where:{status:{in:['OPEN','ORDERED']}}}),this.prisma.yarnProcurement.count({where:{status:{not:'ARRIVED'}}}),this.prisma.yarnDyeBatch.count({where:{status:{not:'RECEIVED'}}}),this.prisma.labTestRecord.count({where:{resultStatus:{in:['PENDING','HOLD','FAIL']}}})]);return{fabric,yarn,procurement,yarnDye,tests}}
}
