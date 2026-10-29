/**
 * Loads the Finish Fabric Plan & Execution report (29.09.26, sheets June'26 – November'26) into DyeingLine.
 * prisma/dyeing-report-2026-09-29.json was extracted from "29.09.26 Finish Fabric Plan & Execution Status.xlsm"
 * (Google Drive / DYeing report): one object per job-colour line, summary rows and blank rows removed.
 * Safe to run again: lines are matched on (source, sourceRow) and updated.
 *   npm run prisma:dyeing-seed -w @nfl/api
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const SOURCE = 'REPORT_2026-09-29';

export async function seedDyeingReport(prisma: any, file = join(__dirname, 'dyeing-report-2026-09-29.json')) {
  const rows: any[] = JSON.parse(readFileSync(file, 'utf8'));
  let n = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await prisma.$transaction(chunk.map((d, k) => {
      const sourceRow = i + k;
      const row = { month: String(d.m), slot: d.sl ? String(d.sl) : null, buyer: String(d.b), jobNo: String(d.j), colour: d.c || d.it || null, data: d };
      return prisma.dyeingLine.upsert({ where: { source_sourceRow: { source: SOURCE, sourceRow } }, create: { source: SOURCE, sourceRow, ...row }, update: row });
    }));
    n += chunk.length;
  }
  return n;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedDyeingReport(prisma)
    .then((n) => console.log(`Dyeing report: ${n} lines loaded (${SOURCE})`))
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
