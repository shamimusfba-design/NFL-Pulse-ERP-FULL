/**
 * Loads the starting fabric reuse stock:
 *  - finished fabric closing stock from "12.December-25 Fabric Store Inventory.xlsx" (sheet JANUARY-26) — old jobs, shipment passed
 *  - greige "Hold + Useable Excess Fabric List" from "Greige fabric stock status-28-09-26"
 * Safe to run again: rows from these two sources are replaced (reserved rows are kept).
 *   npm run prisma:reuse-seed -w @nfl/api
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fabConstruction, fabType, numOf } from '../src/reuse/reuse.rules';

export async function seedReuseStock(prisma: any, file = join(__dirname, 'reuse-stock-2026.json')) {
  const rows: any[] = JSON.parse(readFileSync(file, 'utf8'));
  await prisma.reuseStock.deleteMany({ where: { source: { in: ['INVENTORY_JAN26', 'GREIGE_EXCESS_LIST'] }, reservations: { none: {} } } });
  const data = rows.map((r) => ({ ...r, gsm: numOf(r.gsm), fabricType: fabType(r.fabric), construction: fabConstruction(r.fabric) }));
  for (let i = 0; i < data.length; i += 500) await prisma.reuseStock.createMany({ data: data.slice(i, i + 500) });
  return data.length;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedReuseStock(prisma).then((n) => console.log(`Reuse stock: ${n} rows loaded`)).catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
