/**
 * Loads the store report lines for the Greige Fabric Store and Finished Fabric Store desks.
 *  greige-store-2026-09-28.json : G = "Greige fabric stock status-28-09-26" monthly sheets May–Nov'26 (8,682 job-colour lines),
 *                                 A = Advance / Hold+Useable excess / Not useable excess lists
 *  finished-store-2026.json      : F = finished fabric lines from the 29.09.26 Finish Fabric Plan & Execution report (deliveries from dyeing),
 *                                 R = closing stock of "12.December-25 Fabric Store Inventory" (sheet JANUARY-26)
 * Safe to run again (matched on desk + kind + sourceRow).   npm run prisma:stores-seed -w @nfl/api
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const FILES: Array<[string, string]> = [['GREIGE', 'greige-store-2026-09-28.json'], ['FINISHED', 'finished-store-2026.json']];

export async function seedStores(prisma: any, dir = __dirname) {
  const counts: Record<string, number> = {};
  for (const [desk, file] of FILES) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Record<string, any[]>;
    for (const [kind, rows] of Object.entries(data)) {
      for (let i = 0; i < rows.length; i += 500) {
        await prisma.$transaction(rows.slice(i, i + 500).map((d, k) => prisma.storeLine.upsert({ where: { desk_kind_sourceRow: { desk, kind, sourceRow: i + k } }, create: { desk, kind, sourceRow: i + k, data: d }, update: { data: d } })));
      }
      counts[`${desk}.${kind}`] = rows.length;
    }
  }
  return counts;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedStores(prisma).then((c) => console.log('Store lines loaded', c)).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
