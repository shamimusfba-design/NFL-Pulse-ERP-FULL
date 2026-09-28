import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const BATCH = 'GANTT-SEP-OCT-NOV-2026-V2-REAL-LINES';
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'gantt-sept-nov-2026.json'), 'utf8')) as { jobs:any[] };

function codeFromBuyer(name:string){
  const s=String(name||'GEN').toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,18);
  return s || 'GEN';
}
function safeDate(v:any, fallback:Date){const d=v?new Date(v):fallback; return Number.isNaN(d.getTime())?fallback:d}
function safeLineName(v:any){const s=String(v||'').trim(); return s || 'UNASSIGNED'}
function safeCode(v:string, i:number){
  const base=v.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,28) || `LINE-${i+1}`;
  return `TNA-${base}`;
}

async function ensureRealTnaLines(factoryId:string){
  const section = await prisma.section.upsert({
    where:{ factoryId_code:{factoryId,code:'SEW-TNA'} },
    update:{name:'Sewing - T&A Reference Lines',active:true},
    create:{factoryId,code:'SEW-TNA',name:'Sewing - T&A Reference Lines',active:true}
  });
  const floor = await prisma.floor.upsert({
    where:{ sectionId_code:{sectionId:section.id,code:'TNA-2026'} },
    update:{name:'T&A Sept-Nov 2026',active:true},
    create:{sectionId:section.id,code:'TNA-2026',name:'T&A Sept-Nov 2026',active:true}
  });
  const names = Array.from(new Set((raw.jobs||[]).map(r=>safeLineName(r.line)))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const result = new Map<string,any>();
  for(let i=0;i<names.length;i++){
    const name=names[i]; const code=safeCode(name,i);
    const line=await prisma.line.upsert({
      where:{floorId_code:{floorId:floor.id,code}},
      update:{name,active:true},
      create:{floorId:floor.id,code,name,active:true}
    });
    const maxMachines=Math.max(1,...(raw.jobs||[]).filter(r=>safeLineName(r.line)===name).map(r=>Math.max(0,Number(r.machines||0))));
    const poolId=`TNA-${line.id}`;
    await prisma.machinePool.upsert({
      where:{id:poolId},
      update:{lineId:line.id,name:'T&A Reference Machine Pool',machineCount:maxMachines,active:true,capability:json({source:'T&A reference / derived where missing'})},
      create:{id:poolId,lineId:line.id,name:'T&A Reference Machine Pool',machineCount:maxMachines,active:true,capability:json({source:'T&A reference / derived where missing'})}
    });
    result.set(name,{...line,floor:{...floor,section:{...section}}});
  }
  return result;
}

async function main(){
  const creator = await prisma.user.findFirst({ where:{ active:true }, orderBy:{ createdAt:'asc' } });
  const factory = await prisma.factory.findFirst({ where:{ code:'NFL' } });
  if(!creator || !factory) throw new Error('Base master data missing. Run npm run prisma:seed once, then run this seed again.');
  const sourceLines=await ensureRealTnaLines(factory.id);

  const grouped = new Map<string, any[]>();
  for(const r of raw.jobs||[]){ const k=String(r.job||'').trim(); if(!k)continue; if(!grouped.has(k))grouped.set(k,[]); grouped.get(k)!.push(r); }
  let ordersCreated=0, stylesCreated=0, stylesUpdated=0;
  for(const [jobNo, rows] of grouped){
    const first=rows[0];
    const buyerName=String(first.buyer||'General Buyer').trim()||'General Buyer';
    let buyerCode=codeFromBuyer(buyerName);
    let buyer=await prisma.buyer.findFirst({where:{OR:[{name:buyerName},{code:buyerCode}]}});
    if(!buyer){ let suffix=1, c=buyerCode; while(await prisma.buyer.findUnique({where:{code:c}})){c=`${buyerCode.slice(0,14)}${suffix++}`}; buyer=await prisma.buyer.create({data:{code:c,name:buyerName,active:true}}); }
    let order=await prisma.order.findUnique({where:{jobNo}});
    if(!order){
      order=await prisma.order.create({data:{jobNo,factoryId:factory.id,buyerId:buyer.id,totalQty:rows.reduce((s,x)=>s+Math.max(0,Number(x.qty||0)),0),createdById:creator.id,sourceMetadata:json({ganttReferenceBatch:BATCH,source:'T&A Plan & Execution Summary(5).xlsx'})}}); ordersCreated++;
    }
    const usedStyles=new Set<string>();
    for(let i=0;i<rows.length;i++){
      const r=rows[i]; let styleNo=String(r.style||`STYLE-${i+1}`).trim()||`STYLE-${i+1}`;
      if(usedStyles.has(styleNo))styleNo=`${styleNo}-${i+1}`; usedStyles.add(styleNo);
      const realLineName=safeLineName(r.line); const line=sourceLines.get(realLineName)!;
      const start=safeDate(r.start,new Date('2026-09-01T00:00:00Z')); const finish=safeDate(r.end,start); const ex=safeDate(r.exFactory,finish);
      const sourceMetadata:any={
        ganttReferenceBatch:BATCH,
        source:'T&A Plan & Execution Summary(5).xlsx',
        originalTnaLine:realLineName,
        planning:{taStatus:'APPROVED',sewingStartDate:start.toISOString(),sewingEnd:finish.toISOString(),exFactoryDate:ex.toISOString(),cargoClosingDate:ex.toISOString(),remarks:'Imported Sept-Nov 2026 T&A reference plan'},
        ganttPlan:{status:'REVIEWED',factoryCode:'NFL',floorCode:line.floor.code,lineId:line.id,lineCode:realLineName,startDate:start.toISOString(),finishDate:finish.toISOString(),workingHours:Number(r.workingHours||8),smv:Number(r.smv||0),manpower:Number(r.manpower||0),efficiencyPct:Number(r.efficiency||65),achievementPct:Number(r.achv||0),machineQty:Number(r.machines||0),dailyTarget:Number(r.dailyTarget||0),requiredHours:Number(r.requiredHours||0),risk:'ON_TRACK',remark:'Real T&A line preserved; missing IE fields are derived',ieInputStatus:'REFERENCE_DERIVED'},
        ieBulletin:{smv:Number(r.smv||0),manpower:Number(r.manpower||0),achievableEfficiencyPct:Number(r.efficiency||65),machineQty:Number(r.machines||0),source:'REFERENCE_DERIVED_PENDING_IE_CONFIRMATION'},
        sectionData:{sewing:{productionQty:Number(r.actualQty||0),machineQty:Number(r.machines||0),manpower:Number(r.manpower||0),efficiencyPct:Number(r.efficiency||65),achievementPct:Number(r.achv||0),remark:r.actualSource||'Reference actual'}},
      };
      let style=await prisma.style.findUnique({where:{orderId_styleNo:{orderId:order.id,styleNo}}});
      if(!style){style=await prisma.style.create({data:{orderId:order.id,styleNo,itemDescription:String(r.itemDescription||r.item||''),quantity:Math.max(1,Number(r.qty||1)),sourceMetadata:json(sourceMetadata)}});stylesCreated++;}
      else {const old=(style.sourceMetadata||{}) as any; await prisma.style.update({where:{id:style.id},data:{sourceMetadata:json({...old,...sourceMetadata,planning:{...(old.planning||{}),...sourceMetadata.planning},ganttPlan:{...(old.ganttPlan||{}),...sourceMetadata.ganttPlan},ieBulletin:{...(old.ieBulletin||{}),...sourceMetadata.ieBulletin},sectionData:{...(old.sectionData||{}),sewing:{...(old.sectionData?.sewing||{}),...sourceMetadata.sectionData.sewing}}})}});stylesUpdated++;}
      await prisma.purchaseOrder.upsert({where:{styleId_poNumber:{styleId:style.id,poNumber:`REF-${jobNo}-${i+1}`}},update:{totalQty:Math.max(1,Number(r.qty||1)),ccd:ex,shipmentDate:ex},create:{styleId:style.id,poNumber:`REF-${jobNo}-${i+1}`,totalQty:Math.max(1,Number(r.qty||1)),ccd:ex,shipmentDate:ex,sourceMetadata:json({ganttReferenceBatch:BATCH})}});
    }
  }
  console.log({batch:BATCH,sourceRows:raw.jobs.length,uniqueJobs:grouped.size,realSourceLines:sourceLines.size,ordersCreated,stylesCreated,stylesUpdated});
}
main().finally(()=>prisma.$disconnect());
