import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const prisma=new PrismaClient();
const normalize=(v:string)=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function main(){
  const file=path.join(__dirname,'reference-values-seed.json');
  const rows=JSON.parse(fs.readFileSync(file,'utf8')) as {category:string;value:string;source?:string}[];
  let count=0;
  for(const r of rows){const normalized=normalize(r.value);if(!normalized)continue;await prisma.referenceValue.upsert({where:{category_normalized:{category:r.category,normalized}},update:{value:r.value,active:true},create:{category:r.category,value:r.value,normalized,source:r.source||'FACTORY_REPORT_PACK_2026',active:true}});count++;}
  console.log(`Reference values ready: ${count}`);
}
main().finally(()=>prisma.$disconnect());
