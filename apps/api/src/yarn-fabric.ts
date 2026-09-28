import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

const t=(v:any)=>String(v??'').trim();
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const pageNo=(v:any)=>Math.max(1,Number(v)||1);
const pageSize=(v:any)=>Math.max(10,Math.min(200,Number(v)||50));
const j=(v:any)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

@Controller('yarn-fabric')
@UseGuards(JwtAuthGuard)
export class YarnFabricController{
  constructor(private prisma:PrismaService){}

  private async audit(req:any,action:string,type:string,id:string,after:any){
    await this.prisma.auditLog.create({data:{userId:req.user?.id||null,action,entityType:type,entityId:id,after:j(after)}});
  }

  @Post('sync-cad-requirements')
  async syncCad(@Req() req:any){
    let synced=0,skip=0;const batch=250;
    while(true){
      const orders=await this.prisma.order.findMany({include:{buyer:true,styles:true},orderBy:{createdAt:'asc'},skip,take:batch});
      if(!orders.length)break;
      for(const order of orders)for(const style of order.styles){
        const om=(order.sourceMetadata||{}) as any;const sm=(style.sourceMetadata||{}) as any;
        const cad=om.cadConsumption||sm.cadConsumption;
        if(!cad||cad.status!=='CONFIRMED'||!Array.isArray(cad.rows))continue;
        for(let x=0;x<cad.rows.length;x++){
          const r=cad.rows[x];if(t(r.styleId)&&t(r.styleId)!==style.id)continue;
          const sourceRef=`CAD:${order.id}:${style.id}:${x}`;
          await this.prisma.fabricRequirement.upsert({
            where:{sourceRef},
            update:{jobNo:order.jobNo,styleNo:style.styleNo,buyerName:order.buyer?.name||null,color:t(r.color)||null,fabricDescription:t(r.fabricDescription)||'Fabric',fabricType:t(r.fabricType)||null,gsm:n(r.gsm)||null,dia:t(r.dia||r.width)||null,requiredKg:Math.max(0,n(r.requiredKg)),status:'OPEN',sourceUpdatedAt:cad.updatedAt?new Date(cad.updatedAt):new Date()},
            create:{sourceRef,orderId:order.id,styleId:style.id,jobNo:order.jobNo,styleNo:style.styleNo,buyerName:order.buyer?.name||null,color:t(r.color)||null,fabricDescription:t(r.fabricDescription)||'Fabric',fabricType:t(r.fabricType)||null,gsm:n(r.gsm)||null,dia:t(r.dia||r.width)||null,requiredKg:Math.max(0,n(r.requiredKg)),sourceUpdatedAt:cad.updatedAt?new Date(cad.updatedAt):new Date()}
          });synced++;
        }
      }
      skip+=orders.length;if(orders.length<batch)break;
    }
    await this.audit(req,'CAD_FABRIC_REQUIREMENTS_SYNCED','FABRIC_REQUIREMENT','BULK',{synced});return{synced};
  }

  @Get('fabric-requirements')
  async fabricRequirements(@Query('q') q?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const s=t(q),page=pageNo(p),take=pageSize(ps);const where:any=s?{OR:[{jobNo:{contains:s,mode:'insensitive'}},{styleNo:{contains:s,mode:'insensitive'}},{fabricDescription:{contains:s,mode:'insensitive'}}]}:undefined;
    const [rows,total]=await Promise.all([this.prisma.fabricRequirement.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*take,take}),this.prisma.fabricRequirement.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Get('yarn-requirements')
  async yarnRequirements(@Query('q') q?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const s=t(q),page=pageNo(p),take=pageSize(ps);const where:any=s?{OR:[{jobNo:{contains:s,mode:'insensitive'}},{yarnCount:{contains:s,mode:'insensitive'}},{composition:{contains:s,mode:'insensitive'}}]}:undefined;
    const [rows,total]=await Promise.all([this.prisma.yarnRequirement.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*take,take}),this.prisma.yarnRequirement.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('yarn-requirements')
  async saveYarnRequirement(@Req() req:any,@Body() b:any){
    if(!t(b.jobNo)||n(b.requiredKg)<=0)throw new BadRequestException('Job and required KG are required');
    const row=await this.prisma.yarnRequirement.create({data:{fabricRequirementId:t(b.fabricRequirementId)||null,jobNo:t(b.jobNo),styleId:t(b.styleId)||null,yarnItemId:t(b.yarnItemId)||null,yarnCount:t(b.yarnCount)||null,composition:t(b.composition)||null,color:t(b.color)||null,requiredKg:Math.max(0,n(b.requiredKg)),status:'OPEN',remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});
    await this.audit(req,'YARN_REQUIREMENT_CREATED','YARN_REQUIREMENT',row.id,row);return row;
  }

  @Get('procurement')
  async procurement(@Query('q') q?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const s=t(q),page=pageNo(p),take=pageSize(ps);const where:any=s?{OR:[{jobNo:{contains:s,mode:'insensitive'}},{supplierName:{contains:s,mode:'insensitive'}},{piNo:{contains:s,mode:'insensitive'}},{lcNo:{contains:s,mode:'insensitive'}}]}:undefined;
    const [rows,total]=await Promise.all([this.prisma.yarnProcurement.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*take,take}),this.prisma.yarnProcurement.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('procurement')
  async saveProcurement(@Req() req:any,@Body() b:any){
    if(!t(b.jobNo)||!t(b.supplierName)||n(b.qtyKg)<=0)throw new BadRequestException('Job, supplier and quantity are required');
    const sourceRef=t(b.sourceRef)||`PO:${Date.now()}:${t(b.jobNo)}`;
    const row=await this.prisma.yarnProcurement.create({data:{yarnRequirementId:t(b.yarnRequirementId)||null,jobNo:t(b.jobNo),yarnItemId:t(b.yarnItemId)||null,supplierName:t(b.supplierName),piNo:t(b.piNo)||null,lcNo:t(b.lcNo)||null,qtyKg:Math.max(0,n(b.qtyKg)),receivedKg:0,etd:b.etd?new Date(b.etd):null,eta:b.eta?new Date(b.eta):null,status:t(b.status)||'PLANNED',sourceRef,remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});
    if(row.yarnRequirementId)await this.prisma.yarnRequirement.update({where:{id:row.yarnRequirementId},data:{orderedKg:{increment:row.qtyKg},status:'ORDERED'}});
    await this.audit(req,'YARN_PROCUREMENT_CREATED','YARN_PROCUREMENT',row.id,row);return row;
  }

  @Put('procurement/:id/receive')
  async receiveProcurement(@Req() req:any,@Param('id') id:string,@Body() b:any){
    const qty=Math.max(0,n(b.receivedKg));if(qty<=0)throw new BadRequestException('Positive received KG is required');
    const before=await this.prisma.yarnProcurement.findUnique({where:{id}});if(!before)throw new BadRequestException('Procurement record not found');
    const remaining=Math.max(0,before.qtyKg-before.receivedKg);if(qty>remaining+0.0001)throw new BadRequestException(`Receipt exceeds remaining pipeline KG (${remaining.toFixed(2)})`);
    const total=before.receivedKg+qty,status=total+0.0001>=before.qtyKg?'ARRIVED':'PARTIAL';
    const row=await this.prisma.yarnProcurement.update({where:{id},data:{receivedKg:total,arrivalDate:status==='ARRIVED'?new Date():before.arrivalDate,status}});
    if(before.yarnRequirementId)await this.prisma.yarnRequirement.update({where:{id:before.yarnRequirementId},data:{inHouseKg:{increment:qty}}});
    await this.audit(req,'YARN_PROCUREMENT_RECEIVED','YARN_PROCUREMENT',id,{...row,receiptKg:qty});return row;
  }

  @Get('yarn-dyeing')
  async yarnDyeing(@Query('q') q?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const s=t(q),page=pageNo(p),take=pageSize(ps);const where:any=s?{OR:[{jobNo:{contains:s,mode:'insensitive'}},{batchNo:{contains:s,mode:'insensitive'}},{processorName:{contains:s,mode:'insensitive'}}]}:undefined;
    const [rows,total]=await Promise.all([this.prisma.yarnDyeBatch.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*take,take}),this.prisma.yarnDyeBatch.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('yarn-dyeing')
  async createYarnDye(@Req() req:any,@Body() b:any){
    if(!t(b.batchNo)||!t(b.jobNo)||!t(b.greyYarnItemId)||!t(b.color)||n(b.sentKg)<=0)throw new BadRequestException('Batch, job, grey yarn, color and sent KG are required');
    const row=await this.prisma.yarnDyeBatch.create({data:{batchNo:t(b.batchNo).toUpperCase(),jobNo:t(b.jobNo),styleId:t(b.styleId)||null,greyYarnItemId:t(b.greyYarnItemId),greyYarnLotId:t(b.greyYarnLotId)||null,processorName:t(b.processorName)||null,color:t(b.color),shade:t(b.shade)||null,sentKg:Math.max(0,n(b.sentKg)),sentAt:new Date(),status:'SENT',remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});
    await this.audit(req,'YARN_DYE_BATCH_CREATED','YARN_DYE_BATCH',row.id,row);return row;
  }

  @Put('yarn-dyeing/:id/receive')
  async receiveYarnDye(@Req() req:any,@Param('id') id:string,@Body() b:any){
    const before=await this.prisma.yarnDyeBatch.findUnique({where:{id}});if(!before)throw new BadRequestException('Yarn dye batch not found');
    const receivedKg=Math.max(0,n(b.receivedKg));if(receivedKg<=0||receivedKg>before.sentKg+0.0001)throw new BadRequestException('Received KG must be positive and cannot exceed sent KG');
    const row=await this.prisma.yarnDyeBatch.update({where:{id},data:{receivedKg,processLossKg:Math.max(0,before.sentKg-receivedKg),dyedYarnItemId:t(b.dyedYarnItemId)||null,dyedYarnLotId:t(b.dyedYarnLotId)||null,receivedAt:new Date(),status:'RECEIVED',shade:t(b.shade)||before.shade}});
    await this.audit(req,'YARN_DYE_BATCH_RECEIVED','YARN_DYE_BATCH',id,row);return row;
  }

  @Get('lab-tests')
  async labTests(@Query('jobNo') jobNo?:string,@Query('page') p?:string,@Query('pageSize') ps?:string){
    const page=pageNo(p),take=pageSize(ps),where:any=jobNo?{jobNo:t(jobNo)}:undefined;
    const [rows,total]=await Promise.all([this.prisma.labTestRecord.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*take,take}),this.prisma.labTestRecord.count({where})]);return{rows,total,page,pageSize:take};
  }

  @Post('lab-tests')
  async createTest(@Req() req:any,@Body() b:any){
    if(!t(b.jobNo)||!t(b.testType))throw new BadRequestException('Job and test type are required');
    const testNo=t(b.testNo)||`LAB-${Date.now().toString(36).toUpperCase()}`;
    const row=await this.prisma.labTestRecord.create({data:{testNo,scope:t(b.scope)||'FABRIC',referenceType:t(b.referenceType)||'JOB',referenceId:t(b.referenceId)||null,jobNo:t(b.jobNo),styleId:t(b.styleId)||null,batchNo:t(b.batchNo)||null,testType:t(b.testType),resultStatus:'PENDING',remarks:t(b.remarks)||null,createdByName:req.user?.name||null}});
    await this.audit(req,'LAB_TEST_CREATED','LAB_TEST',row.id,row);return row;
  }

  @Put('lab-tests/:id/result')
  async testResult(@Req() req:any,@Param('id') id:string,@Body() b:any){
    const status=t(b.resultStatus).toUpperCase();if(!['PASS','FAIL','HOLD','PENDING'].includes(status))throw new BadRequestException('Invalid test status');
    const row=await this.prisma.labTestRecord.update({where:{id},data:{resultStatus:status,resultValue:t(b.resultValue)||null,reportRef:t(b.reportRef)||null,testedAt:new Date(),releasedAt:status==='PASS'?new Date():null,remarks:t(b.remarks)||undefined}});
    await this.audit(req,'LAB_TEST_RESULT','LAB_TEST',id,row);return row;
  }

  @Get('dashboard')
  async dashboard(){
    const [fabric,yarn,procurement,yarnDye,tests]=await Promise.all([
      this.prisma.fabricRequirement.count({where:{status:'OPEN'}}),
      this.prisma.yarnRequirement.count({where:{status:{in:['OPEN','ORDERED']}}}),
      this.prisma.yarnProcurement.count({where:{status:{not:'ARRIVED'}}}),
      this.prisma.yarnDyeBatch.count({where:{status:{not:'RECEIVED'}}}),
      this.prisma.labTestRecord.count({where:{resultStatus:{in:['PENDING','HOLD','FAIL']}}})
    ]);return{fabric,yarn,procurement,yarnDye,tests};
  }
}
