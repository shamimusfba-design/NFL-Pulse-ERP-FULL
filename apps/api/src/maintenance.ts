import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

const txt=(v:any)=>String(v??'').replace(/\s+/g,' ').trim();
const qty=(v:any)=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0};
const key=(v:any)=>txt(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
function machineKey(v:any){
  const k=key(v);
  if(/(^| )snls( |$)|single needle.*lock|1 ?needle.*lock|lock ?stitch/.test(k))return 'snls';
  if(/4 ?t(hread)?.*over ?lock|over ?lock.*4 ?t(hread)?|(^| )4 ?ol( |$)/.test(k))return '4t ol';
  if(/5 ?t(hread)?.*over ?lock|over ?lock.*5 ?t(hread)?|(^| )5 ?ol( |$)/.test(k))return '5t ol';
  if(/flat ?lock|flatseam|flat seam/.test(k))return 'flatlock';
  if(/kansai|multi ?needle|multi ?n/.test(k))return 'kansai';
  if(/bar ?tack/.test(k))return 'bartack';
  if(/button ?hole/.test(k))return 'buttonhole';
  if(/button ?attach|button ?sew/.test(k))return 'button attach';
  if(/zig ?zag/.test(k))return 'zigzag';
  if(/feed.*arm|f o a/.test(k))return 'feed off arm';
  return k;
}
const json=(v:any)=>JSON.parse(JSON.stringify(v??{})) as Prisma.InputJsonValue;
const ymd=(d:Date)=>d.toISOString().slice(0,10);
function day(value?:string){
  const s=txt(value); const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) throw new BadRequestException('Valid date is required (YYYY-MM-DD).');
  return new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
}
function detectDate(rows:any[][],fallback?:string){
  if(fallback){try{return day(fallback)}catch{}}
  for(const row of rows.slice(0,20))for(const cell of row){
    if(cell instanceof Date&&!Number.isNaN(cell.getTime()))return new Date(Date.UTC(cell.getFullYear(),cell.getMonth(),cell.getDate()));
    const s=txt(cell); let m=s.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})\b/); if(m)return new Date(Date.UTC(Number(m[3]),Number(m[2])-1,Number(m[1])));
    m=s.match(/\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/); if(m)return new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
  }
  return day(ymd(new Date()));
}
function headerScore(row:any[]){const s=key(row.map(txt).join(' | '));return ['machine','m c','break down','breakdown','factory utilize','factory total','unused','rent','sewing 01','sewing 02','sewing 03'].filter(x=>s.includes(x)).length}
function headerIndex(rows:any[][]){let best=-1,score=0;for(let i=0;i<Math.min(35,rows.length);i++){const n=headerScore(rows[i]||[]);if(n>score){score=n;best=i}}return score>=2?best:-1}
function columnLabels(rows:any[][],h:number){const width=Math.max(...rows.slice(Math.max(0,h-1),Math.min(rows.length,h+3)).map(r=>r.length),0);const out:string[]=[];for(let c=0;c<width;c++){const parts:string[]=[];for(let r=Math.max(0,h-1);r<=Math.min(rows.length-1,h+2);r++){const v=txt(rows[r]?.[c]);if(v&&!parts.includes(v))parts.push(v)}out[c]=key(parts.join(' '))}return out}
function findCol(labels:string[],patterns:RegExp[]){return labels.findIndex(x=>patterns.some(p=>p.test(x)))}
function machineCol(rows:any[][],h:number,labels:string[]){let c=findCol(labels,[/machine.*(type|name)/,/name.*machine/,/^machine$/,/m c.*(type|name)/]);if(c>=0)return c;let best=0,bestCount=-1;for(let i=0;i<Math.min(6,Math.max(...rows.map(r=>r.length),0));i++){let count=0;for(const row of rows.slice(h+1,h+30)){const v=txt(row?.[i]);if(v&&/[A-Za-z]/.test(v)&&!/^total$/i.test(v)&&!/^sl\.?$/i.test(v))count++}if(count>bestCount){bestCount=count;best=i}}return best}
function parseLegacySheet(rows:any[][],sourceSheet:string,sourceFileName:string,dateOverride?:string){
  const h=headerIndex(rows); if(h<0)return [];
  const labels=columnLabels(rows,h); const mc=machineCol(rows,h,labels);
  const cols={
    breakdown:findCol(labels,[/break\s*down/,/breakdown/]),
    utilized:findCol(labels,[/factory.*utili[sz]/,/utili[sz].*factory/,/machine.*use(?!d)/]),
    rent:findCol(labels,[/rent/]),
    total:findCol(labels,[/factory.*total/,/total.*m c/,/total.*machine/]),
    unused:findCol(labels,[/factory.*unused/,/unused.*m c/,/idle/]),
    working:findCol(labels,[/working.*available/,/available.*machine/]),
    sew1:findCol(labels,[/sewing\s*0?1/,/sew\s*0?1/]),
    sew2:findCol(labels,[/sewing\s*0?2/,/sew\s*0?2/]),
    sew3:findCol(labels,[/sewing\s*0?3/,/sew\s*0?3/]),
    remarks:findCol(labels,[/remark/,/comment/]),
  };
  const reportDate=detectDate(rows,dateOverride); const out:any[]=[];
  let blankRun=0;
  for(const row of rows.slice(h+1)){
    const machineType=txt(row?.[mc]);
    if(!machineType){blankRun++;if(blankRun>8&&out.length)break;continue} blankRun=0;
    if(/^(sl|s\/l|serial|total|grand total|confidential|machine)$/i.test(machineType)||/total\s*$/i.test(machineType))continue;
    const nums=[cols.breakdown,cols.utilized,cols.rent,cols.total,cols.unused,cols.working,cols.sew1,cols.sew2,cols.sew3].filter(i=>i>=0).map(i=>qty(row?.[i]));
    if(!nums.some(n=>n>0)&&!/[A-Za-z]/.test(machineType))continue;
    const floorUsage:any={}; if(cols.sew1>=0)floorUsage['Sewing-01']=qty(row?.[cols.sew1]); if(cols.sew2>=0)floorUsage['Sewing-02']=qty(row?.[cols.sew2]); if(cols.sew3>=0)floorUsage['Sewing-03']=qty(row?.[cols.sew3]);
    out.push({machineType,normalizedKey:machineKey(machineType),date:reportDate,factoryTotalQty:cols.total>=0?qty(row?.[cols.total]):null,breakdownQty:cols.breakdown>=0?qty(row?.[cols.breakdown]):0,rentQty:cols.rent>=0?qty(row?.[cols.rent]):0,utilizedQty:cols.utilized>=0?qty(row?.[cols.utilized]):0,unusedQty:cols.unused>=0?qty(row?.[cols.unused]):0,workingQty:cols.working>=0?qty(row?.[cols.working]):null,floorUsage,remarks:cols.remarks>=0?txt(row?.[cols.remarks]):'',sourceSheet,sourceFileName});
  }
  return out;
}
function reqRows(sm:any){const ie=sm?.ieBulletin||{};const g=sm?.ganttPlan||{};const ieReleased=String(ie.status||'').toUpperCase()==='RELEASED';const sourceRows=ieReleased?ie.machineRequirements:g.machineRequirements;const rows=Array.isArray(sourceRows)?sourceRows:[];const parsed=rows.filter((x:any)=>txt(x?.machineType)&&qty(x?.qty)>0).map((x:any)=>({machineType:txt(x.machineType),normalizedKey:machineKey(x.machineType),qty:qty(x.qty)}));if(parsed.length)return parsed;const total=qty(ieReleased?ie.machineQty:g.machineQty);return total?[{machineType:'Unclassified IE total',normalizedKey:'unclassified ie total',qty:total}]:[]}
function activeOn(g:any,d:string){if(!g?.startDate||!g?.finishDate)return false;const start=String(g.startDate).slice(0,10),finish=String(g.finishDate).slice(0,10);return start<=d&&finish>=d&&!['CANCELLED','REJECTED'].includes(String(g.status||'').toUpperCase())}
function delta(oldRows:any[],newRows:any[]){const map=new Map<string,{machineType:string,oldQty:number,newQty:number}>();for(const x of oldRows){const k=x.normalizedKey;const r=map.get(k)||{machineType:x.machineType,oldQty:0,newQty:0};r.oldQty+=x.qty;map.set(k,r)}for(const x of newRows){const k=x.normalizedKey;const r=map.get(k)||{machineType:x.machineType,oldQty:0,newQty:0};r.newQty+=x.qty;map.set(k,r)}return [...map.values()].map(x=>({...x,delta:x.newQty-x.oldQty,action:x.newQty>x.oldQty?'ADD':x.newQty<x.oldQty?'REMOVE':'NO CHANGE'})).filter(x=>x.delta!==0)}

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController{
  constructor(private prisma:PrismaService){}

  @Get('dashboard')
  async dashboard(@Query('date') date?:string,@Query('factory') factoryCode='NFL'){
    const reportDate=day(date||ymd(new Date())); const d=ymd(reportDate);
    const factory=await this.prisma.factory.findUnique({where:{code:factoryCode}}); if(!factory)throw new BadRequestException('Factory not found');
    const masters=await this.prisma.maintenanceMachine.findMany({where:{factoryId:factory.id,active:true},include:{dailyRows:{where:{date:reportDate},take:1}},orderBy:{machineType:'asc'}});
    const styles=await this.prisma.style.findMany({include:{order:{include:{buyer:true}}}});
    const requirements=new Map<string,{machineType:string,requiredQty:number,jobs:any[]}>(); const runningJobs:any[]=[];
    const linePlans=new Map<string,any[]>();
    for(const style of styles){const sm=(style.sourceMetadata||{}) as any;const g=sm.ganttPlan||{};if(String(g.factoryCode||'NFL')!==factoryCode||!g.lineCode||['CANCELLED','REJECTED'].includes(String(g.status||'').toUpperCase()))continue;const plan={style,sm,g,start:String(g.startDate||'').slice(0,10),finish:String(g.finishDate||'').slice(0,10),req:reqRows(sm)};const arr=linePlans.get(g.lineCode)||[];arr.push(plan);linePlans.set(g.lineCode,arr);if(!activeOn(g,d))continue;let total=0;for(const x of plan.req){total+=x.qty;const r:{machineType:string,requiredQty:number,jobs:any[]}=requirements.get(x.normalizedKey)??{machineType:x.machineType,requiredQty:0,jobs:[]};r.requiredQty+=x.qty;r.jobs.push({jobNo:style.order.jobNo,styleNo:style.styleNo,line:g.lineCode,qty:x.qty});requirements.set(x.normalizedKey,r)}runningJobs.push({styleId:style.id,jobNo:style.order.jobNo,buyer:style.order.buyer?.name,styleNo:style.styleNo,line:g.lineCode,floor:g.floorCode,status:g.status,startDate:plan.start,finishDate:plan.finish,totalMachine:total,machineRequirements:plan.req});}
    const masterKeys=new Set(masters.map(m=>m.normalizedKey));const rows:any[]=[];
    for(const m of masters){const daily=m.dailyRows[0];const req=requirements.get(m.normalizedKey);const total=Number(daily?.factoryTotalQty??m.totalQty??0);const breakdown=Number(daily?.breakdownQty||0),rent=Number(daily?.rentQty||0);const factoryAvailable=Math.max(0,total-breakdown);const available=factoryAvailable+rent;const required=Number(req?.requiredQty||0);rows.push({id:m.id,machineType:m.machineType,totalQty:total,masterTotalQty:m.totalQty,breakdownQty:breakdown,rentQty:rent,factoryAvailableQty:factoryAvailable,availableQty:available,actualUtilizedQty:Number(daily?.utilizedQty||0),reportedUnusedQty:Number(daily?.unusedQty||0),workingQty:daily?.workingQty??factoryAvailable,requiredQty:required,idleQty:Math.max(0,available-required),shortageQty:Math.max(0,required-available),floorUsage:daily?.floorUsage||{},remarks:daily?.remarks||'',sourceFileName:daily?.sourceFileName||null,jobs:req?.jobs||[]});}
    for(const [k,req] of requirements)if(!masterKeys.has(k))rows.push({id:null,machineType:req.machineType,totalQty:0,masterTotalQty:0,breakdownQty:0,rentQty:0,factoryAvailableQty:0,availableQty:0,actualUtilizedQty:0,reportedUnusedQty:0,workingQty:0,requiredQty:req.requiredQty,idleQty:0,shortageQty:req.requiredQty,floorUsage:{},remarks:'Machine type required by IE but missing in Maintenance Master',sourceFileName:null,jobs:req.jobs});
    rows.sort((a,b)=>b.shortageQty-a.shortageQty||b.requiredQty-a.requiredQty||a.machineType.localeCompare(b.machineType));
    const changeovers:any[]=[];for(const [line,plans] of linePlans){plans.sort((a,b)=>a.start.localeCompare(b.start));for(let i=0;i<plans.length;i++){const next=plans[i];if(!next.start||next.start<d)continue;const diff=Math.round((new Date(`${next.start}T00:00:00Z`).getTime()-reportDate.getTime())/86400000);if(diff<0||diff>7)continue;let prev:any=null;for(let j=i-1;j>=0;j--)if(plans[j].start<next.start){prev=plans[j];break}if(!prev)continue;const changes=delta(prev.req,next.req);if(changes.length)changeovers.push({line,date:next.start,daysAway:diff,oldJob:prev.style.order.jobNo,oldStyle:prev.style.styleNo,newJob:next.style.order.jobNo,newStyle:next.style.styleNo,changes});break}}
    const summary=rows.reduce((s,r)=>({total:s.total+r.totalQty,breakdown:s.breakdown+r.breakdownQty,rent:s.rent+r.rentQty,available:s.available+r.availableQty,required:s.required+r.requiredQty,idle:s.idle+r.idleQty,shortage:s.shortage+r.shortageQty,actualUtilized:s.actualUtilized+r.actualUtilizedQty}),{total:0,breakdown:0,rent:0,available:0,required:0,idle:0,shortage:0,actualUtilized:0});
    return {date:d,factory:{id:factory.id,code:factory.code,name:factory.name},summary,rows,runningJobs:runningJobs.sort((a,b)=>String(a.line).localeCompare(String(b.line))),changeovers:changeovers.sort((a,b)=>a.date.localeCompare(b.date)||a.line.localeCompare(b.line))};
  }

  @Get('weekly-requirement')
  async weeklyRequirement(@Query('startDate') startDate?:string,@Query('factory') factoryCode='NFL'){
    const start=day(startDate||ymd(new Date()));
    const end=new Date(start.getTime()+6*86400000);
    const factory=await this.prisma.factory.findUnique({where:{code:factoryCode}}); if(!factory)throw new BadRequestException('Factory not found');
    const masters=await this.prisma.maintenanceMachine.findMany({
      where:{factoryId:factory.id,active:true},
      include:{dailyRows:{where:{date:{lte:end}},orderBy:{date:'asc'}}},
      orderBy:{machineType:'asc'}
    });
    const masterMap=new Map(masters.map(m=>[m.normalizedKey,m]));
    const styles=await this.prisma.style.findMany({include:{order:{include:{buyer:true}}}});
    const plans:any[]=[];
    for(const style of styles){
      const sm=(style.sourceMetadata||{}) as any; const g=sm.ganttPlan||{};
      if(String(g.factoryCode||'NFL')!==factoryCode||!g.lineCode||['CANCELLED','REJECTED'].includes(String(g.status||'').toUpperCase()))continue;
      plans.push({style,sm,g,req:reqRows(sm)});
    }
    const days:any[]=[]; const shortageKeys=new Set<string>(); const affectedLines=new Set<string>(); const affectedJobs=new Set<string>(); let peakShortageQty=0;
    for(let offset=0;offset<7;offset++){
      const dateObj=new Date(start.getTime()+offset*86400000); const d=ymd(dateObj);
      const reqMap=new Map<string,{machineType:string,requiredQty:number,jobs:any[]}>();
      for(const plan of plans){
        if(!activeOn(plan.g,d))continue;
        for(const x of plan.req){
          const r:{machineType:string,requiredQty:number,jobs:any[]}=reqMap.get(x.normalizedKey)??{machineType:x.machineType,requiredQty:0,jobs:[]};
          r.requiredQty+=x.qty;
          r.jobs.push({jobNo:plan.style.order.jobNo,styleNo:plan.style.styleNo,line:plan.g.lineCode,floor:plan.g.floorCode||null,qty:x.qty});
          reqMap.set(x.normalizedKey,r);
        }
      }
      const rows:any[]=[];
      for(const [k,req] of reqMap){
        const m:any=masterMap.get(k); let daily:any=null;
        if(m){for(const row of m.dailyRows||[]){if(row.date<=dateObj)daily=row;else break}}
        const total=Number(daily?.factoryTotalQty??m?.totalQty??0),breakdown=Number(daily?.breakdownQty||0),rent=Number(daily?.rentQty||0);
        const factoryAvailable=Math.max(0,total-breakdown),available=factoryAvailable+rent,required=Number(req.requiredQty||0),shortage=Math.max(0,required-available),surplus=Math.max(0,available-required);
        const status=shortage>0?'SHORTAGE':surplus>0?'AVAILABLE':'BALANCED';
        if(shortage>0){shortageKeys.add(k);for(const j of req.jobs){affectedLines.add(j.line);affectedJobs.add(`${j.jobNo}::${j.styleNo}`)}}
        rows.push({machineType:req.machineType,normalizedKey:k,requiredQty:required,totalQty:total,breakdownQty:breakdown,rentQty:rent,netAvailableQty:available,shortageQty:shortage,surplusQty:surplus,status,maintenanceSourceDate:daily?ymd(daily.date):null,jobs:req.jobs});
      }
      rows.sort((a,b)=>b.shortageQty-a.shortageQty||b.requiredQty-a.requiredQty||a.machineType.localeCompare(b.machineType));
      const dayShortage=rows.reduce((sum,r)=>sum+r.shortageQty,0); peakShortageQty=Math.max(peakShortageQty,dayShortage);
      days.push({date:d,dayLabel:dateObj.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'}),shortageQty:dayShortage,shortageTypes:rows.filter(r=>r.shortageQty>0).length,rows});
    }
    return {factory:{id:factory.id,code:factory.code,name:factory.name},startDate:ymd(start),endDate:ymd(end),summary:{shortageTypes:shortageKeys.size,peakShortageQty,daysWithShortage:days.filter(x=>x.shortageQty>0).length,affectedLines:affectedLines.size,affectedJobs:affectedJobs.size},days};
  }

  @Get('master')
  async master(@Query('factory') factoryCode='NFL'){const factory=await this.prisma.factory.findUnique({where:{code:factoryCode}});if(!factory)return[];return this.prisma.maintenanceMachine.findMany({where:{factoryId:factory.id,active:true},orderBy:{machineType:'asc'}})}

  @Post('master')
  async addMaster(@Body() body:any){const factoryCode=txt(body.factoryCode||'NFL');const factory=await this.prisma.factory.findUnique({where:{code:factoryCode}});if(!factory)throw new BadRequestException('Factory not found');const machineType=txt(body.machineType);if(!machineType)throw new BadRequestException('Machine type is required');const normalizedKey=machineKey(machineType);return this.prisma.maintenanceMachine.upsert({where:{factoryId_normalizedKey:{factoryId:factory.id,normalizedKey}},update:{machineType,totalQty:qty(body.totalQty),aliases:json(body.aliases||[]),active:true},create:{factoryId:factory.id,machineType,normalizedKey,totalQty:qty(body.totalQty),aliases:json(body.aliases||[]),active:true}})}

  @Put('master/:id')
  async updateMaster(@Param('id') id:string,@Body() body:any){const row=await this.prisma.maintenanceMachine.findUnique({where:{id}});if(!row)throw new BadRequestException('Machine type not found');const machineType=txt(body.machineType||row.machineType);return this.prisma.maintenanceMachine.update({where:{id},data:{machineType,normalizedKey:machineKey(machineType),totalQty:body.totalQty===undefined?row.totalQty:qty(body.totalQty),aliases:body.aliases===undefined?undefined:json(body.aliases),active:body.active===undefined?row.active:Boolean(body.active)}})}

  @Put('daily/:machineId')
  async saveDaily(@Param('machineId') machineId:string,@Body() body:any){const machine=await this.prisma.maintenanceMachine.findUnique({where:{id:machineId}});if(!machine)throw new BadRequestException('Machine type not found');const date=day(body.date);const factoryTotalQty=body.factoryTotalQty===undefined?machine.totalQty:qty(body.factoryTotalQty);if(body.updateMasterTotal!==false&&factoryTotalQty>0&&factoryTotalQty!==machine.totalQty)await this.prisma.maintenanceMachine.update({where:{id:machineId},data:{totalQty:factoryTotalQty}});return this.prisma.maintenanceDailyMachine.upsert({where:{machineId_date:{machineId,date}},update:{factoryTotalQty,breakdownQty:qty(body.breakdownQty),rentQty:qty(body.rentQty),utilizedQty:qty(body.utilizedQty),unusedQty:qty(body.unusedQty),workingQty:body.workingQty===undefined?undefined:qty(body.workingQty),floorUsage:json(body.floorUsage||{}),remarks:txt(body.remarks)},create:{machineId,date,factoryTotalQty,breakdownQty:qty(body.breakdownQty),rentQty:qty(body.rentQty),utilizedQty:qty(body.utilizedQty),unusedQty:qty(body.unusedQty),workingQty:body.workingQty===undefined?undefined:qty(body.workingQty),floorUsage:json(body.floorUsage||{}),remarks:txt(body.remarks)}})}

  @Post('daily/import')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:20*1024*1024}}))
  async importDaily(@UploadedFile() file:any,@Body() body:any){if(!file?.buffer?.length)throw new BadRequestException('Machine utilization Excel file is required');const factoryCode=txt(body.factoryCode||'NFL');const factory=await this.prisma.factory.findUnique({where:{code:factoryCode}});if(!factory)throw new BadRequestException('Factory not found');let wb:XLSX.WorkBook;try{wb=XLSX.read(file.buffer,{type:'buffer',cellDates:true})}catch{throw new BadRequestException('Could not read Excel file')};let parsed:any[]=[];for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name],{header:1,defval:'',raw:true});parsed.push(...parseLegacySheet(rows,name,file.originalname,txt(body.date)||undefined))}if(!parsed.length)throw new BadRequestException('Daily machine utilization table was not detected. Check the report headers.');let imported=0;const importedDate=ymd(parsed[0].date);for(const r of parsed){const machine=await this.prisma.maintenanceMachine.upsert({where:{factoryId_normalizedKey:{factoryId:factory.id,normalizedKey:r.normalizedKey}},update:{machineType:r.machineType,active:true,...(r.factoryTotalQty>0?{totalQty:r.factoryTotalQty}:{})},create:{factoryId:factory.id,machineType:r.machineType,normalizedKey:r.normalizedKey,totalQty:r.factoryTotalQty||0,active:true}});await this.prisma.maintenanceDailyMachine.upsert({where:{machineId_date:{machineId:machine.id,date:r.date}},update:{factoryTotalQty:r.factoryTotalQty,breakdownQty:r.breakdownQty,rentQty:r.rentQty,utilizedQty:r.utilizedQty,unusedQty:r.unusedQty,workingQty:r.workingQty,floorUsage:json(r.floorUsage),remarks:r.remarks,sourceFileName:r.sourceFileName,sourceSheet:r.sourceSheet},create:{machineId:machine.id,date:r.date,factoryTotalQty:r.factoryTotalQty,breakdownQty:r.breakdownQty,rentQty:r.rentQty,utilizedQty:r.utilizedQty,unusedQty:r.unusedQty,workingQty:r.workingQty,floorUsage:json(r.floorUsage),remarks:r.remarks,sourceFileName:r.sourceFileName,sourceSheet:r.sourceSheet}});imported++}return {ok:true,imported,date:importedDate,message:`${imported} machine type row(s) imported for ${importedDate}.`}}
}
