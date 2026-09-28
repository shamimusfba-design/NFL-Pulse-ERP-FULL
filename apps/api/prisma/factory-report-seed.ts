import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { commitReportBatch, stageWorkbook } from '../src/imports';
import { PrismaService } from '../src/prisma.service';

async function main(){
  const prisma=new PrismaService(); await prisma.$connect();
  const dir=path.join(__dirname,'..','import-samples');
  const files=['TNA_PLAN_EXECUTION.xlsx','CUTTING_PRINT_INPUT.xlsx','FINISH_FABRIC_DYEING.xlsm','IE_BULLETIN.xlsx'];
  for(const name of files){
    const existing=await prisma.importBatch.findFirst({where:{sourceFileName:name,status:'COMMITTED'}});
    if(existing){console.log(`Skip already imported: ${name}`);continue;}
    const file=path.join(dir,name); if(!fs.existsSync(file)){console.warn(`Missing sample file: ${name}`);continue;}
    console.log(`Staging ${name}...`); const staged=await stageWorkbook(prisma,fs.readFileSync(file),name);
    console.log(`  ${staged.reportLabel}: ${staged.validRows}/${staged.totalRows} valid`);
    await commitReportBatch(prisma,staged.batchId); console.log(`  committed batch ${staged.batchId}`);
  }
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1)});
