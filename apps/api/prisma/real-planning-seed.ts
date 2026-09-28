import { PrismaClient } from '@prisma/client';
import { clearDemoData } from './demo-data';
import { REAL_PLANNING_DATA, REAL_PLANNING_SOURCE } from './real-planning-data';

const prisma = new PrismaClient();

const NFL_FLOOR_MAP: Record<string,string> = { NFL1:'SEW-1', NFL2:'SEW-2', NFL3:'SEW-3' };
const NFL_ALLOWED: Record<string,string[]> = {
  NFL1:['A','B','C','D','E','F','G','H'],
  NFL2:['J','K','L','M','N','O','P','Q','R'],
  NFL3:['S','T','U','V','W','X','Y','Z','ZA'],
};

function asDate(value:string){ return new Date(`${value}T00:00:00.000Z`); }
function daysInclusive(start:string,end:string){ return Math.max(1, Math.round((asDate(end).getTime()-asDate(start).getTime())/86400000)+1); }
function displayJobNo(code:string, job:string){ return `${code} ${String(job).trim()}`.replace(/\s+/g,' '); }
function baseNflLine(raw:string, floor:string){
  const allowed=NFL_ALLOWED[floor]||[];
  const parts=String(raw||'').toUpperCase().replace(/\s+/g,'').split('+');
  for(const part of parts){
    const m=part.match(/^(ZA|[A-Z])/); if(m&&allowed.includes(m[1])) return m[1];
  }
  const direct=String(raw||'').toUpperCase().match(/(ZA|[A-Z])/g)||[];
  return direct.find(x=>allowed.includes(x))||allowed[0]||'A';
}
function nclLineNo(raw:string){ const m=String(raw||'').match(/(?:N\/?|LINE\s*)?(\d{1,2})/i); return Math.max(1,Math.min(22,Number(m?.[1]||1))); }
function json(value:any){ return value as any; }

async function main(){
  const admin = await prisma.user.findFirst({ where:{ active:true, roles:{ some:{ role:{ code:'ADMIN' } } } }, orderBy:{createdAt:'asc'} });
  if(!admin) throw new Error('Admin user not found. Run npm.cmd run db:seed first.');

  const clearedDemo=await clearDemoData(prisma);
  const existingBatch=await prisma.order.findMany({select:{id:true,sourceMetadata:true}});
  const oldIds=existingBatch.filter(x=>(x.sourceMetadata as any)?.realPlanningImportBatch===REAL_PLANNING_SOURCE.batch).map(x=>x.id);
  if(oldIds.length) await prisma.order.deleteMany({where:{id:{in:oldIds}}});

  // Buyer master now follows the short-code rule used in every displayed Job No.
  const buyerNames:Record<string,string>={ONL:'ONL',ONS:'ONS',NMT:'NMT',OVS:'OVS',UTG:'UTG',GBX:'GBX'};
  const buyers=new Map<string,any>();
  for(const code of Array.from(new Set(REAL_PLANNING_DATA.map(x=>x.buyerCode)))){
    const buyer=await prisma.buyer.upsert({where:{code},update:{name:buyerNames[code]||code,active:true},create:{code,name:buyerNames[code]||code,active:true}});
    buyers.set(code,buyer);
  }
  await prisma.buyer.updateMany({where:{code:{in:['ONLY','NAMEIT','ONLYSONS']}},data:{active:false}});

  const factories=await prisma.factory.findMany({where:{code:{in:['NFL','NCL']}}});
  const factoryByCode=new Map(factories.map(x=>[x.code,x]));
  const lines=await prisma.line.findMany({where:{active:true},include:{floor:{include:{section:{include:{factory:true}}}}}});

  function resolveLine(rec:(typeof REAL_PLANNING_DATA)[number]){
    const isNcl=rec.reportedFloor.toUpperCase().startsWith('NCL');
    if(isNcl){
      const no=nclLineNo(rec.reportedLine);
      return lines.find(l=>l.floor.section.factory.code==='NCL' && l.name===`Line ${no}`)
        || lines.find(l=>l.floor.section.factory.code==='NCL');
    }
    const floorKey=rec.reportedFloor.toUpperCase().replace(/\s+/g,'');
    const floorCode=NFL_FLOOR_MAP[floorKey]||'SEW-1';
    const name=baseNflLine(rec.reportedLine,floorKey);
    return lines.find(l=>l.floor.section.factory.code==='NFL' && l.floor.code===floorCode && l.name.toUpperCase()===name)
      || lines.find(l=>l.floor.section.factory.code==='NFL' && l.floor.code===floorCode);
  }

  let created=0, updated=0, skipped=0;
  const buyerCount:Record<string,number>={};
  const monthCount:Record<string,number>={};
  for(const rec of REAL_PLANNING_DATA){
    const line=resolveLine(rec); if(!line){skipped+=1;continue;}
    const factoryCode=line.floor.section.factory.code;
    const factory=factoryByCode.get(factoryCode); const buyer=buyers.get(rec.buyerCode);
    if(!factory||!buyer){skipped+=1;continue;}
    const jobNo=displayJobNo(rec.buyerCode,rec.jobNo);
    const old=await prisma.order.findUnique({where:{jobNo}});
    const orderMeta={
      realPlanningImport:true, realPlanningImportBatch:REAL_PLANNING_SOURCE.batch, sourceFiles:REAL_PLANNING_SOURCE,
      sourceBuyer:rec.buyerSource, sourceJobNo:rec.jobNo, reportedFloor:rec.reportedFloor, reportedLine:rec.reportedLine,
    };
    const order=await prisma.order.upsert({
      where:{jobNo},
      update:{factoryId:factory.id,buyerId:buyer.id,totalQty:rec.orderQty,source:'IMPORT',sourceMetadata:json(orderMeta)},
      create:{jobNo,factoryId:factory.id,buyerId:buyer.id,totalQty:rec.orderQty,source:'IMPORT',sourceMetadata:json(orderMeta),confirmedAt:asDate(rec.sewingStart),createdById:admin.id},
    });
    old?updated++:created++;

    const duration=daysInclusive(rec.sewingStart,rec.sewingEnd);
    const bufferDays=Math.round((asDate(rec.ccd).getTime()-asDate(rec.sewingEnd).getTime())/86400000);
    const risk=bufferDays<0?'CRITICAL':bufferDays<=2?'RISK':'ON_TRACK';
    const fabricBalance=Math.max(0,Number((rec.fabricKg-rec.fabricDeliveredKg).toFixed(2)));
    const styleMeta={
      realPlanningImport:true, realPlanningImportBatch:REAL_PLANNING_SOURCE.batch,
      source:{...REAL_PLANNING_SOURCE,buyer:rec.buyerSource,reportedFloor:rec.reportedFloor,reportedLine:rec.reportedLine},
      merchandisingFollowUp:{presentStatus:rec.presentStatus,remarks:'Imported from actual T&A / execution reference reports'},
      planning:{taStatus:'APPROVED',status:'APPROVED',source:'ACTUAL_TA_REPORT',sewingStartDate:asDate(rec.sewingStart).toISOString(),sewingEndDate:asDate(rec.sewingEnd).toISOString(),exFactoryDate:asDate(rec.exFactory).toISOString(),cargoClosingDate:asDate(rec.ccd).toISOString()},
      ganttPlan:{
        status:'APPROVED',factoryCode,factoryName:line.floor.section.factory.name,floorCode:line.floor.code,floorName:line.floor.name,
        lineId:line.id,lineCode:line.name,sourceLineCode:rec.reportedLine,startDate:asDate(rec.sewingStart).toISOString(),finishDate:asDate(rec.sewingEnd).toISOString(),
        workingHours:8,baseDailyTarget:rec.dailyTarget,dailyTarget:rec.dailyTarget,machineQty:rec.estimatedMachineQty,machineCountSource:'ESTIMATED_FROM_TA_DURATION',
        bufferDays,risk,version:1,source:'ACTUAL_TA_REPORT',sourceBatch:REAL_PLANNING_SOURCE.batch,
      },
      sectionData:{
        finishedFabricStore:{requiredKg:rec.fabricKg,receivedKg:rec.fabricDeliveredKg,balanceKg:fabricBalance,status:rec.fabricDeliveredKg>=rec.fabricKg&&rec.fabricKg>0?'Ready':rec.fabricDeliveredKg>0?'Partial':'Pending'},
        cutting:{orderQty:rec.orderQty,cutQty:rec.cuttingQty,balanceQty:Math.max(0,rec.orderQty-rec.cuttingQty),status:rec.cuttingQty>=rec.orderQty?'Complete':rec.cuttingQty>0?'Running':'Pending'},
        printing:{applicable:Boolean(rec.printEmbDescription||rec.printSend),sendQty:rec.printSend,receiveQty:rec.printRecv,balanceQty:Math.max(0,rec.printSend-rec.printRecv),description:rec.printEmbDescription||null,status:rec.printSend?rec.printRecv>=rec.printSend?'Complete':'Running':'N/A'},
        sewing:{inputQty:rec.inputQty,readyForInput:rec.readyForInput,productionQty:0,balanceQty:rec.orderQty,line:`${factoryCode} · ${line.name}`,machineQty:rec.estimatedMachineQty,target:rec.dailyTarget,status:rec.presentStatus},
        shipment:{orderQty:rec.orderQty,ccd:asDate(rec.ccd).toISOString(),status:'Planned'},
      },
      importNote:'Dates/line/floor/order data are source-derived. Machine requirement is estimated only where the source reports did not provide machine count.',
    };
    const style=await prisma.style.upsert({
      where:{orderId_styleNo:{orderId:order.id,styleNo:rec.styleNo}},
      update:{itemDescription:rec.itemDescription,quantity:rec.orderQty,sourceMetadata:json(styleMeta)},
      create:{orderId:order.id,styleNo:rec.styleNo,itemDescription:rec.itemDescription,quantity:rec.orderQty,sourceMetadata:json(styleMeta)},
    });
    await prisma.purchaseOrder.upsert({
      where:{styleId_poNumber:{styleId:style.id,poNumber:'T&A PLAN'}},
      update:{totalQty:rec.orderQty,ccd:asDate(rec.ccd),shipmentDate:asDate(rec.ccd),sourceMetadata:json({source:'ACTUAL_TA_REPORT',batch:REAL_PLANNING_SOURCE.batch})},
      create:{styleId:style.id,poNumber:'T&A PLAN',referenceType:'T&A_REPORT',totalQty:rec.orderQty,ccd:asDate(rec.ccd),shipmentDate:asDate(rec.ccd),sourceMetadata:json({source:'ACTUAL_TA_REPORT',batch:REAL_PLANNING_SOURCE.batch})},
    });
    buyerCount[rec.buyerCode]=(buyerCount[rec.buyerCode]||0)+1;
    const month=rec.sewingStart.slice(0,7); monthCount[month]=(monthCount[month]||0)+1;
  }

  console.log(`Real planning seed complete: ${created} created, ${updated} updated, ${skipped} skipped; ${clearedDemo.deletedOrders} demo jobs removed.`);
  console.log('Sewing-start month count:', monthCount);
  console.log('Buyer count:', buyerCount);
  console.log(`Source batch: ${REAL_PLANNING_SOURCE.batch} · ${REAL_PLANNING_DATA.length} source rows.`);
}

main().catch((e)=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
