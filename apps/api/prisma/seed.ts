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
    ['DYEING', 'Dyeing'], ['LAB', 'Lab & Testing'], ['FABRIC_FINISHING', 'Fabric Finishing'], ['FINISHED_FABRIC_STORE', 'Finished Fabric Store'], ['CUTTING', 'Cutting'], ['PRINTING', 'Printing'], ['EMBROIDERY', 'Embroidery'],
    ['SEWING', 'Sewing'], ['FINISHING', 'Finishing & Packing'], ['QUALITY', 'Quality Management'], ['TRIMS_STORE', 'Trims & Accessories Store'], ['SHIPMENT', 'Shipment & Commercial'],
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
  for (const r of ['SAMPLE','YARN_MANAGEMENT','PROCUREMENT','YARN_STORE','YARN_DYEING','KNITTING','GREIGE_STORE','DYEING','LAB','FABRIC_FINISHING','FINISHED_FABRIC_STORE','CUTTING','PRINTING','EMBROIDERY','SEWING','FINISHING','TRIMS_STORE','SHIPMENT']) await grant(r,['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','PRODUCTION_WRITE','REPORT_READ']);
  await grant('QUALITY',['MASTER_READ','ORDER_READ','TASK_READ','TASK_UPDATE','QUALITY_WRITE','REPORT_READ']);

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const users: Array<[string,string,string]> = [
    ['admin@nfl.local','NFL Pulse Admin','ADMIN'], ['planning@nfl.local','Central Planning','PLANNING'], ['ie@nfl.local','IE User','IE'], ['cad@nfl.local','CAD User','CAD'], ['quality@nfl.local','Quality User','QUALITY'],
    ['merch@nfl.local','Bulk Merchandising User','MERCH_BULK'], ['samplemerch@nfl.local','Sample Merchandising User','MERCH_SAMPLE'], ['bothmerch@nfl.local','Sample + Bulk Merchandising User','MERCH_BOTH'], ['merchhead@nfl.local','Merchandising Head','MERCH_HEAD'], ['sample@nfl.local','Sample User','SAMPLE'], ['yarn@nfl.local','Yarn Management User','YARN_MANAGEMENT'], ['scm@nfl.local','Procurement / SCM User','PROCUREMENT'],
    ['yarnstore@nfl.local','Yarn Store User','YARN_STORE'], ['yarndyeing@nfl.local','Yarn Dyeing User','YARN_DYEING'], ['knitting@nfl.local','Knitting User','KNITTING'], ['dyeing@nfl.local','Dyeing User','DYEING'],
    ['lab@nfl.local','Lab User','LAB'], ['cutting@nfl.local','Cutting User','CUTTING'], ['printing@nfl.local','Printing User','PRINTING'], ['embroidery@nfl.local','Embroidery User','EMBROIDERY'],
    ['sewing@nfl.local','Sewing User','SEWING'], ['finishing@nfl.local','Finishing User','FINISHING'], ['shipment@nfl.local','Shipment User','SHIPMENT'],
  ];
  for (const [email,name,roleCode] of users) {
    const user = await prisma.user.upsert({ where: { email }, update: { name, passwordHash, active: true }, create: { email, name, passwordHash } });
    const role = roles.get(roleCode)!;
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
  }

  const nfl = await prisma.factory.upsert({ where: { code: 'NFL' }, update: { name: 'Northern Fashion Limited', active: true }, create: { code: 'NFL', name: 'Northern Fashion Limited' } });
  const ncl = await prisma.factory.upsert({ where: { code: 'NCL' }, update: { name: 'Northern Clothing Limited', active: true }, create: { code: 'NCL', name: 'Northern Clothing Limited' } });

  async function section(factoryId:string, code:string, name:string){ return prisma.section.upsert({ where:{factoryId_code:{factoryId,code}}, update:{name,active:true}, create:{factoryId,code,name} }); }
  async function floor(sectionId:string, code:string, name:string){ return prisma.floor.upsert({ where:{sectionId_code:{sectionId,code}}, update:{name,active:true}, create:{sectionId,code,name} }); }
  const sew1=await section(nfl.id,'SEW-1','Sewing-1'); const sew2=await section(nfl.id,'SEW-2','Sewing-2'); const sew3=await section(nfl.id,'SEW-3','Sewing-3');
  const f1=await floor(sew1.id,'SEW-1','Sewing-1'); const f2=await floor(sew2.id,'SEW-2','Sewing-2'); const f3=await floor(sew3.id,'SEW-3','Sewing-3');
  const nflLineNames = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','ZA'];
  for(let i=1;i<=26;i++){
    const floorId=i<=8?f1.id:i<=17?f2.id:f3.id; const code=`L${String(i).padStart(2,'0')}`; const name=nflLineNames[i-1];
    const line=await prisma.line.upsert({ where:{floorId_code:{floorId,code}}, update:{name,active:true}, create:{floorId,code,name} });
    await prisma.machinePool.upsert({ where:{id:`NFL-LINE-${String(i).padStart(2,'0')}`}, update:{lineId:line.id,name:'Main Machine Pool',machineCount:0,active:true,capability:{configurationRequired:true}}, create:{id:`NFL-LINE-${String(i).padStart(2,'0')}`,lineId:line.id,name:'Main Machine Pool',machineCount:0,capability:{configurationRequired:true}} });
  }
  const nclSec=await section(ncl.id,'SEW','Sewing'); const nclFloor=await floor(nclSec.id,'SEW','Sewing');
  for(let i=1;i<=22;i++){ const code=`L${String(i).padStart(2,'0')}`; await prisma.line.upsert({where:{floorId_code:{floorId:nclFloor.id,code}},update:{name:`Line ${i}`,active:true},create:{floorId:nclFloor.id,code,name:`Line ${i}`}}); }
  for(const [code,name] of [['YARN','Yarn'],['KNIT','Knitting'],['DYE','Dyeing'],['CUT','Cutting'],['PRINT','Printing'],['EMB','Embroidery'],['FIN','Finishing'],['QUALITY','Quality'],['SAMPLE','Sample'],['STORE','Stores']]) await section(nfl.id,code,name);

  for (const [code, name] of [['ONLY','ONLY'],['NAMEIT','NAME IT'],['ONLYSONS','ONLY & SONS'],['OVS','OVS'],['UTG','UTG']]) await prisma.buyer.upsert({ where: { code }, update: { name, active: true }, create: { code, name } });

  console.log('Seed complete. Main users: admin, planning, ie, cad, merch, quality and section users @nfl.local / ChangeMe123!');
}
main().finally(() => prisma.$disconnect());
