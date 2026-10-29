import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    ['MASTER_READ', 'Read master data'], ['MASTER_WRITE', 'Manage master data'], ['ORDER_READ', 'Read orders'], ['ORDER_CREATE', 'Create orders'],
    ['TASK_READ', 'Read tasks'], ['TASK_UPDATE', 'Update tasks'], ['PLANNING_WRITE', 'Central planning write'], ['QUALITY_WRITE', 'Quality entry / remarks'],
    ['STORE_WRITE', 'Store transaction entry'], ['PRODUCTION_WRITE', 'Production entry'], ['REPORT_READ', 'Reports and analytics'],
  ];
  for (const [code, name] of permissions) await prisma.permission.upsert({ where: { code }, update: { name }, create: { code, name } });

  const roleDefs = [
    ['ADMIN', 'Administrator'], ['MANAGEMENT', 'Management'], ['MERCH_SAMPLE', 'Sample Merchandising'], ['MERCH_BULK', 'Bulk Merchandising'], ['MERCH_BOTH', 'Sample + Bulk Merchandising'], ['MERCH_HEAD', 'Merchandising Head'],
    ['PLANNING', 'Central Planning'], ['IE', 'Industrial Production Engineering'], ['CAD', 'CAD / Pattern'], ['SAMPLE', 'Central Sample Department'],
    ['YARN_MANAGEMENT', 'Yarn Management'], ['PROCUREMENT', 'Procurement / SCM'], ['YARN_STORE', 'Yarn Store'], ['YARN_DYEING', 'Yarn Dyeing'], ['KNITTING', 'Knitting'], ['GREIGE_STORE', 'Greige Fabric Store'],
    ['KNIT_PLANNER', 'Knitting Planner'], ['KNIT_REPORTER', 'Knitting Reporter'], ['KNIT_INCHARGE', 'Knitting Production Incharge'], ['KNIT_QUALITY', 'Knitting Quality'],
    ['DYEING', 'Dyeing'], ['DYEING_PLANNER', 'Dyeing Planner'], ['DYEING_LAB', 'Dyeing Lab'], ['LAB', 'Lab & Testing'], ['FABRIC_FINISHING', 'Fabric Finishing'], ['FINISHED_FABRIC_STORE', 'Finished Fabric Store'], ['CUTTING', 'Cutting'], ['PRINTING', 'Printing'], ['EMBROIDERY', 'Embroidery'],
    ['SEWING', 'Sewing'], ['FINISHING', 'Finishing & Packing'], ['QUALITY', 'Quality Management'], ['TRIMS_STORE', 'Trims & Accessories Store'], ['SHIPMENT', 'Shipment & Commercial'], ['MAINTENANCE', 'Maintenance & Engineering'],
  ];
  const roles = new Map<string, any>();
  for (const [code, name] of roleDefs) roles.set(code, await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } }));
  const allPermissions = await prisma.permission.findMany();
  const grant = async (roleCode: string, permissionCodes: string[]) => {
    const role = roles.get(roleCode)!;
    for (const code of permissionCodes) { const permission = allPermissions.find((p) => p.code === code); if (!permission) continue; await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } }); }
  };
  await grant('ADMIN', allPermissions.map((p) => p.code));
  await grant('MANAGEMENT', ['MASTER_READ','ORDER_READ','TASK_READ','REPORT_READ']);
  for (const r of ['MERCH_SAMPLE','MERCH_BULK','MERCH_BOTH','MERCH_HEAD']) await grant(r,['MASTER_READ','ORDER_READ','ORDER_CREATE','TASK_READ','TASK_UPDATE','REPORT_READ']);
  await grant('PLANNING',['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','PLANNING_WRITE','REPORT_READ']);
  await grant('IE',['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','PRODUCTION_WRITE','REPORT_READ']);
  await grant('CAD',['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','PRODUCTION_WRITE','REPORT_READ']);
  for (const r of ['SAMPLE','YARN_MANAGEMENT','PROCUREMENT','YARN_STORE','YARN_DYEING','KNITTING','GREIGE_STORE','DYEING','DYEING_PLANNER','DYEING_LAB','LAB','FABRIC_FINISHING','FINISHED_FABRIC_STORE','CUTTING','PRINTING','EMBROIDERY','SEWING','FINISHING','TRIMS_STORE','SHIPMENT','MAINTENANCE','KNIT_PLANNER','KNIT_REPORTER','KNIT_INCHARGE']) await grant(r,['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','PRODUCTION_WRITE','REPORT_READ']);
  await grant('QUALITY',['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','QUALITY_WRITE','REPORT_READ']);
  await grant('KNIT_QUALITY',['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','QUALITY_WRITE','REPORT_READ']);

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const users: Array<[string,string,string]> = [
    ['admin@nfl.local','NFL Pulse Admin','ADMIN'], ['planning@nfl.local','Central Planning','PLANNING'], ['ie@nfl.local','IE User','IE'], ['cad@nfl.local','CAD User','CAD'], ['quality@nfl.local','Quality User','QUALITY'],
    ['merch@nfl.local','Bulk Merchandising User','MERCH_BULK'], ['samplemerch@nfl.local','Sample Merchandising User','MERCH_SAMPLE'], ['bothmerch@nfl.local','Sample + Bulk Merchandising User','MERCH_BOTH'], ['merchhead@nfl.local','Merchandising Head','MERCH_HEAD'], ['sample@nfl.local','Sample User','SAMPLE'], ['yarn@nfl.local','Yarn Management User','YARN_MANAGEMENT'], ['scm@nfl.local','Procurement / SCM User','PROCUREMENT'],
    ['yarnstore@nfl.local','Yarn Store User','YARN_STORE'], ['yarndyeing@nfl.local','Yarn Dyeing User','YARN_DYEING'], ['knitting@nfl.local','Knitting User','KNITTING'], ['knitplan@nfl.local','Knitting Planner','KNIT_PLANNER'], ['knitreport@nfl.local','Knitting Reporter','KNIT_REPORTER'], ['knitincharge@nfl.local','Knitting Production Incharge','KNIT_INCHARGE'], ['knitqc@nfl.local','Knitting Quality','KNIT_QUALITY'], ['dyeing@nfl.local','Dyeing User','DYEING'], ['dyeplan@nfl.local','Dyeing Planner','DYEING_PLANNER'], ['dyelab@nfl.local','Dyeing Lab User','DYEING_LAB'], ['greige@nfl.local','Greige Store User','GREIGE_STORE'], ['fabricqc@nfl.local','Fabric Finishing QC','FABRIC_FINISHING'], ['management@nfl.local','Management User','MANAGEMENT'],
    ['lab@nfl.local','Lab User','LAB'], ['cutting@nfl.local','Cutting User','CUTTING'], ['printing@nfl.local','Printing User','PRINTING'], ['embroidery@nfl.local','Embroidery User','EMBROIDERY'],
    ['sewing@nfl.local','Sewing User','SEWING'], ['finishing@nfl.local','Finishing User','FINISHING'], ['shipment@nfl.local','Shipment User','SHIPMENT'], ['maintenance@nfl.local','Maintenance User','MAINTENANCE'],
  ];
  for (const [email,name,roleCode] of users) {
    const user = await prisma.user.upsert({ where: { email }, update: { name, passwordHash, active: true }, create: { email, name, passwordHash } });
    const role = roles.get(roleCode)!;
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
  }

  const nfl = await prisma.factory.upsert({ where: { code: 'NFL' }, update: { name: 'Northern Fashions Limited', active: true }, create: { code: 'NFL', name: 'Northern Fashions Limited' } });
  const ncl = await prisma.factory.upsert({ where: { code: 'NCL' }, update: { name: 'Northern Clothing Limited', active: true }, create: { code: 'NCL', name: 'Northern Clothing Limited' } });

  async function section(factoryId:string, code:string, name:string){ return prisma.section.upsert({ where:{factoryId_code:{factoryId,code}}, update:{name,active:true}, create:{factoryId,code,name} }); }
  async function floor(sectionId:string, code:string, name:string){ return prisma.floor.upsert({ where:{sectionId_code:{sectionId,code}}, update:{name,active:true}, create:{sectionId,code,name} }); }
  async function sewingLine(factoryCode:string, floorId:string, code:string, lineType:'GENERAL'|'SHIFTING'){
    const line=await prisma.line.upsert({ where:{floorId_code:{floorId,code}}, update:{name:code,active:true}, create:{floorId,code,name:code,active:true} });
    const shifting=lineType==='SHIFTING';
    await prisma.machinePool.upsert({
      where:{id:`${factoryCode}-${floorId}-${code}`},
      update:{lineId:line.id,name:'Main Machine Pool',active:true,capability:{lineType,shiftMode:shifting?'A+B':'GENERAL',defaultHours:shifting?16:8,shiftAHours:8,shiftBHours:shifting?8:0,otAllowed:!shifting,plannerEditable:true}},
      create:{id:`${factoryCode}-${floorId}-${code}`,lineId:line.id,name:'Main Machine Pool',machineCount:0,active:true,capability:{lineType,shiftMode:shifting?'A+B':'GENERAL',defaultHours:shifting?16:8,shiftAHours:8,shiftBHours:shifting?8:0,otAllowed:!shifting,plannerEditable:true}}
    });
    return line;
  }

  // USER-APPROVED 24-Sep-2026 physical Gantt line master.
  // NFL A/B suffixes below are shifts collapsed into ONE main Gantt row; NCL A/B values are separate physical lines.
  const nflFloorDefs=[
    {code:'Sewing-01',general:['A1','A2','B','B2','C','C2'],shifting:['D1','D2','E1','E2','F','G1','G2','H1','H2']},
    {code:'Sewing-02',general:['J1','J2','K1','K2','L1','L2','M1','M2','N1','N2','O1','O2','P1','P2','Q1','Q2','R1','R2','R3'],shifting:[]},
    {code:'Sewing-03',general:['S1','S2','T1','T2','U1','U2','X1','Y1','Y2','Z1','Z2'],shifting:['U','V1','V2','W1','W2','ZA1','ZA2']},
  ];
  for(const def of nflFloorDefs){
    const sec=await section(nfl.id,def.code.toUpperCase(),def.code); const fl=await floor(sec.id,def.code,def.code);
    for(const code of def.general) await sewingLine('NFL',fl.id,code,'GENERAL');
    for(const code of def.shifting) await sewingLine('NFL',fl.id,code,'SHIFTING');
  }

  const nclFloorDefs=[
    {code:'S-01',lines:['1','2','3','4','5','6','7']},
    {code:'S-02',lines:['8A','8B','9A','9B','10A','10B','11A','11B','12A','12B','13A','13B','14A','14B','15A','15B']},
    {code:'S-03',lines:['16A','16B','17A','17B','18A','18B','19A','19B','20A','20B','21A','21B','22A','22B','23A','23B']},
  ];
  for(const def of nclFloorDefs){
    const sec=await section(ncl.id,def.code,def.code); const fl=await floor(sec.id,def.code,def.code);
    for(const code of def.lines) await sewingLine('NCL',fl.id,code,'GENERAL');
  }
  for(const [code,name] of [['YARN','Yarn'],['KNIT','Knitting'],['DYE','Dyeing'],['CUT','Cutting'],['PRINT','Printing'],['EMB','Embroidery'],['FIN','Finishing'],['QUALITY','Quality'],['SAMPLE','Sample'],['STORE','Stores']]) await section(nfl.id,code,name);


  async function responsibility(row:{floorCode:string;areaCode?:string;lineCode?:string;department:string;role:string;personName:string;effectiveFrom:string;effectiveTo?:string;source:string;active?:boolean}){
    const found=await prisma.responsibleAssignment.findFirst({where:{factoryCode:'NFL',floorCode:row.floorCode,areaCode:row.areaCode||null,lineCode:row.lineCode||null,department:row.department,role:row.role,personName:row.personName,effectiveFrom:new Date(row.effectiveFrom)}});
    const data={factoryCode:'NFL',floorCode:row.floorCode,areaCode:row.areaCode||null,lineCode:row.lineCode||null,department:row.department,role:row.role,personName:row.personName,effectiveFrom:new Date(row.effectiveFrom),effectiveTo:row.effectiveTo?new Date(row.effectiveTo):null,source:row.source,active:row.active!==false};
    if(found) await prisma.responsibleAssignment.update({where:{id:found.id},data}); else await prisma.responsibleAssignment.create({data});
  }
  const seedResponsibility=[
    {floorCode:'Sewing-01',department:'Production',role:'Production Manager',personName:'Md. Mokbul Hossain',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-01',department:'Production',role:'APM',personName:'Md. Aminur Rahman',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-01',areaCode:'A/B/C',department:'Production',role:'Area Responsible',personName:'Md. Mamun (Sattar)',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-01',areaCode:'D1A/D2A/EA',department:'Production',role:'Area Responsible',personName:'Shopan Mia (Jakirul Islam)',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-01',areaCode:'D1B/D2B/EB',department:'Production',role:'Area Responsible',personName:'Md. Habibur Rahman',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-01',areaCode:'FA/G1A/G2A/H1A/H2A',department:'Production',role:'Area Responsible',personName:'Md. Saiful Islam',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-01',areaCode:'FB/G1B/G2B/H1B/H2B',department:'Production',role:'Area Responsible',personName:'Md. Abul Basher',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-02',department:'Production',role:'Production Manager',personName:'Md. Mazibar Rahaman',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-02',areaCode:'J/K/L',department:'Production',role:'Area Responsible',personName:'Md. Jabed Ali',effectiveFrom:'2025-01-01',effectiveTo:'2026-09-24',source:'2025 KPI history',active:false},
    {floorCode:'Sewing-02',areaCode:'J/K/L',department:'Production',role:'Area Responsible',personName:'Nazrul',effectiveFrom:'2026-09-25',source:'Current correction 25-Sep-2026'},
    {floorCode:'Sewing-02',areaCode:'M/N/R',department:'Production',role:'Area Responsible',personName:'Md. Mokhlesur Rahman',effectiveFrom:'2025-01-01',effectiveTo:'2025-06-30',source:'2025 KPI history',active:false},
    {floorCode:'Sewing-02',areaCode:'M/N/R',department:'Production',role:'Area Responsible',personName:'Md. Titon',effectiveFrom:'2025-07-01',effectiveTo:'2026-09-24',source:'2025 KPI history',active:false},
    {floorCode:'Sewing-02',areaCode:'O/P/Q',department:'Production',role:'Area Responsible',personName:'Md. Islam Talukdher',effectiveFrom:'2025-01-01',effectiveTo:'2026-09-24',source:'2025 KPI history',active:false},
    {floorCode:'Sewing-02',areaCode:'O/P/Q',department:'Production',role:'Area Responsible',personName:'Mokhles',effectiveFrom:'2026-09-25',source:'Current correction 25-Sep-2026'},
    {floorCode:'Sewing-02',department:'Quality',role:'Quality Manager',personName:'Md. Golam Saroar',effectiveFrom:'2025-01-01',source:'2025 Quality KPI seed'},
    {floorCode:'Sewing-02',areaCode:'ALL',department:'Quality',role:'Sr. Officer',personName:'Md. Rubel Islam',effectiveFrom:'2025-01-01',source:'2025 Quality KPI seed'},
    {floorCode:'Sewing-02',areaCode:'J/K/L1/L2/M/N2',department:'Quality',role:'Officer',personName:'Md. Rubel Mia',effectiveFrom:'2025-01-01',source:'2025 Quality KPI seed'},
    {floorCode:'Sewing-02',areaCode:'N1/O1/O2/P/Q1/Q2/R',department:'Quality',role:'Officer',personName:'Md. Sha Alom',effectiveFrom:'2025-01-01',source:'2025 Quality KPI seed'},
    {floorCode:'Sewing-02',department:'IE',role:'Asst. Manager IE',personName:'Shamim',effectiveFrom:'2025-01-01',source:'2025 IE KPI seed'},
    {floorCode:'Sewing-02',areaCode:'J/K1/L1/L2',department:'IE',role:'IE Responsible',personName:'Nasim Hossen',effectiveFrom:'2025-01-01',source:'2025 IE KPI seed'},
    {floorCode:'Sewing-02',areaCode:'L1/L2/M/N2',department:'IE',role:'IE Responsible',personName:'Shaimun Islam',effectiveFrom:'2025-01-01',source:'2025 IE KPI seed; overlap retained for review'},
    {floorCode:'Sewing-03',department:'Production',role:'Production Manager',personName:'Md. Nurul Islam',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-03',department:'Production',role:'APM',personName:'Md. Kalam Hossen',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-03',areaCode:'S/T/U',department:'Production',role:'Area Responsible',personName:'Mizanur Rahman',effectiveFrom:'2025-01-01',source:'2025 KPI seed/current'},
    {floorCode:'Sewing-03',areaCode:'S/T/U',department:'Production',role:'Area Responsible',personName:'Islam',effectiveFrom:'2026-09-25',source:'Current correction 25-Sep-2026'},
    {floorCode:'Sewing-03',areaCode:'V/W/ZA1B',department:'Production',role:'Area Responsible',personName:'Md. Atikkur Rahman',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-03',areaCode:'VA/W1A/W2A/ZA1A',department:'Production',role:'Area Responsible',personName:'Shagir Md. Anower',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
    {floorCode:'Sewing-03',areaCode:'X/Y/Z/ZA2',department:'Production',role:'Area Responsible',personName:'Md. Bachchu Mia / Golam Mostafa',effectiveFrom:'2025-01-01',source:'2025 KPI seed'},
  ];
  for(const row of seedResponsibility) await responsibility(row as any);

  for (const name of ['Name It','ONLY','Only & Sons','OVS','UTG','New Look','T.M Lewin','Maurices','Miss Selfridge',"Sainsbury's","Anthony's",'Guess']) {
    const code=name;
    await prisma.buyer.upsert({ where: { code }, update: { name, active: true }, create: { code, name, active: true } });
  }

  console.log('Seed complete. Main users: admin, planning, ie, cad, merch, quality and section users @nfl.local / ChangeMe123!');
}
main().finally(() => prisma.$disconnect());
