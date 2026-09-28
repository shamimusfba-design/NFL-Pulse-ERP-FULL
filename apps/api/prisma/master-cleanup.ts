import { PrismaClient } from '@prisma/client';
import {
  APPROVED_BUYERS, APPROVED_FACTORIES, APPROVED_FLOORS, APPROVED_LINES, APPROVED_MERCHANDISERS,
  APPROVED_PRINT_EMB, APPROVED_PROCESSES, APPROVED_STATUSES, cleanBuyer
} from '../src/master-cleaner';

const prisma=new PrismaClient();
const normalize=(v:string)=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const SHIFTING_LINES=new Set(['D1','D2','E1','E2','F','G1','G2','H1','H2','U','V1','V2','W1','W2','ZA1','ZA2']);
const FLOOR_LINES:Record<string,Record<string,string[]>>={
  NFL:{
    'Sewing-01':['A1','A2','B','B2','C','C2','D1','D2','E1','E2','F','G1','G2','H1','H2'],
    'Sewing-02':['J1','J2','K1','K2','L1','L2','M1','M2','N1','N2','O1','O2','P1','P2','Q1','Q2','R1','R2','R3'],
    'Sewing-03':['S1','S2','T1','T2','U','U1','U2','V1','V2','W1','W2','X1','Y1','Y2','Z1','Z2','ZA1','ZA2'],
  },
  NCL:{
    'S-01':['1','2','3','4','5','6','7'],
    'S-02':['8A','8B','9A','9B','10A','10B','11A','11B','12A','12B','13A','13B','14A','14B','15A','15B'],
    'S-03':['16A','16B','17A','17B','18A','18B','19A','19B','20A','20B','21A','21B','22A','22B','23A','23B'],
  }
};
function defaultMachineCount(factory:string,floor:string,line:string,index:number){
  const seed=[...`${factory}|${floor}|${line}`].reduce((a,c)=>a+c.charCodeAt(0),0)+index*7;
  return 24+(seed%21); // stable demo/master capacity: 24..44 machines
}
async function seedPhysicalLineMaster(){
  let idx=0;
  for(const [factoryCode,floors] of Object.entries(FLOOR_LINES)){
    const factoryName=factoryCode==='NFL'?'Northern Fashions Limited':'Northern Clothing Limited';
    const factory=await prisma.factory.upsert({where:{code:factoryCode},update:{name:factoryName,active:true},create:{code:factoryCode,name:factoryName,active:true}});
    for(const [floorCode,lineCodes] of Object.entries(floors)){
      const section=await prisma.section.upsert({where:{factoryId_code:{factoryId:factory.id,code:floorCode}},update:{name:floorCode,active:true},create:{factoryId:factory.id,code:floorCode,name:floorCode,active:true}});
      const floor=await prisma.floor.upsert({where:{sectionId_code:{sectionId:section.id,code:floorCode}},update:{name:floorCode,active:true},create:{sectionId:section.id,code:floorCode,name:floorCode,active:true}});
      for(const code of lineCodes){
        idx++;
        const shifting=factoryCode==='NFL'&&SHIFTING_LINES.has(code);
        const line=await prisma.line.upsert({where:{floorId_code:{floorId:floor.id,code}},update:{name:code,active:true},create:{floorId:floor.id,code,name:code,active:true}});
        const capability={factory:factoryCode,floor:floorCode,lineType:shifting?'SHIFTING':'GENERAL',shiftMode:shifting?'A+B':'GENERAL',shiftAHours:8,shiftBHours:shifting?8:0,defaultCapacityHours:shifting?16:8+(idx%6),otAllowed:!shifting,source:'USER_APPROVED_24-SEP-2026'};
        // Merge legacy duplicate records that display as the same physical line. Preserve the
        // highest known machine count on the canonical approved line, then deactivate duplicates.
        const siblings=await prisma.line.findMany({where:{floorId:floor.id},include:{machinePools:true}});
        const aliases=siblings.filter((x:any)=>normalize(x.code)===normalize(code)||normalize(x.name)===normalize(code));
        const inheritedMachine=Math.max(0,...aliases.flatMap((x:any)=>(x.machinePools||[]).filter((m:any)=>m.active).map((m:any)=>Number(m.machineCount||0))));
        const pool=await prisma.machinePool.findFirst({where:{lineId:line.id,active:true},orderBy:{id:'asc'}});
        if(pool)await prisma.machinePool.update({where:{id:pool.id},data:{machineCount:Math.max(Number(pool.machineCount||0),inheritedMachine),capability,active:true}});
        else await prisma.machinePool.create({data:{lineId:line.id,name:'Main Machine Pool',machineCount:inheritedMachine||defaultMachineCount(factoryCode,floorCode,code,idx),active:true,capability}});
        for(const dup of aliases.filter((x:any)=>x.id!==line.id)){await prisma.line.update({where:{id:dup.id},data:{active:false,effectiveTo:new Date()}});await prisma.machinePool.updateMany({where:{lineId:dup.id},data:{active:false}})}
      }
    }
  }
}

async function put(category:string,value:string){
  const normalized=normalize(value); if(!normalized)return;
  await prisma.referenceValue.upsert({where:{category_normalized:{category,normalized}},update:{value,active:true,source:'APPROVED_FACTORY_MASTER'},create:{category,value,normalized,source:'APPROVED_FACTORY_MASTER',active:true}});
}
async function main(){
  const factoryCats=['PROCESS_FACTORY','DYEING_FACTORY','AOP_FACTORY','PEACH_FACTORY','BRUSH_FACTORY','SHEARING_FACTORY','SINGEING_FACTORY','FINISHING_FACTORY'];
  const controlled=['BUYER','SEWING_LINE','MERCHANDISER','FLOOR','SEWING_FLOOR','PRESENT_STATUS','PRINT_EMB_TYPE','ADDITIONAL_PROCESS',...factoryCats];
  // Only approved controlled categories are exposed as dropdown masters.
  await prisma.referenceValue.updateMany({where:{category:{notIn:controlled}},data:{active:false}});
  await prisma.referenceValue.updateMany({where:{category:{in:controlled}},data:{active:false}});
  for(const v of APPROVED_BUYERS)await put('BUYER',v);
  for(const v of APPROVED_LINES)await put('SEWING_LINE',v);
  for(const v of APPROVED_MERCHANDISERS)await put('MERCHANDISER',v);
  for(const v of APPROVED_FLOORS.filter(v=>v!=='NCL')){await put('FLOOR',v);await put('SEWING_FLOOR',v)}
  for(const v of APPROVED_STATUSES)await put('PRESENT_STATUS',v);
  for(const v of APPROVED_PRINT_EMB)await put('PRINT_EMB_TYPE',v);
  for(const v of APPROVED_PROCESSES)await put('ADDITIONAL_PROCESS',v);
  for(const c of factoryCats)for(const v of APPROVED_FACTORIES)await put(c,v);


  await seedPhysicalLineMaster();

  // Keep Buyer and Sewing Line dropdown tables clean as well. Unknown values remain in import audit/history, not as active masters.
  await prisma.buyer.updateMany({where:{code:{notIn:[...APPROVED_BUYERS,'UNMAPPED']}},data:{active:false}});
  await prisma.line.updateMany({where:{code:{notIn:[...APPROVED_LINES]}},data:{active:false}});

  // Consolidate buyer aliases already created by older imports without deleting history.
  const buyers=await prisma.buyer.findMany();
  for(const b of buyers){
    if(b.code==='UNMAPPED')continue;
    const c=cleanBuyer(b.name||b.code); if(!c.value)continue;
    const canonical=await prisma.buyer.upsert({where:{code:c.value},update:{name:c.value,active:true},create:{code:c.value,name:c.value,active:true}});
    if(canonical.id!==b.id){await prisma.order.updateMany({where:{buyerId:b.id},data:{buyerId:canonical.id}});await prisma.buyer.update({where:{id:b.id},data:{active:false}});}
  }
  console.log('Approved factory masters cleaned and seeded.');
  console.log(`Buyers ${APPROVED_BUYERS.length}, lines ${APPROVED_LINES.length}, merchandisers ${APPROVED_MERCHANDISERS.length}, statuses ${APPROVED_STATUSES.length}.`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
