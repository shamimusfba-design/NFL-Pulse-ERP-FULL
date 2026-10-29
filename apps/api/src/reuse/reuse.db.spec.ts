// @ts-nocheck -- DB integration test
/**
 * Reuse check on the fabric order sheet, against a real PostgreSQL database (all migrations applied).
 * Run: REUSE_DB_TEST=1 DATABASE_URL=postgresql://... npx tsx --test src/reuse/reuse.db.spec.ts
 */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { BulkMerchController } from '../merch/bulk-merch.controller';
import { PlanningApprovalsController } from '../planning-approvals/planning-approvals.controller';
import { ReuseController } from './reuse.controller';
import { seedReuseStock } from '../../prisma/reuse-stock-seed';

const RUN = !!process.env.REUSE_DB_TEST;
let db: any, bulk: BulkMerchController, pa: PlanningApprovalsController, reuse: ReuseController;
const U: Record<string, any> = {};
const as = (k: string) => ({ user: U[k] });
const tag = Date.now().toString(36).toUpperCase();
const rejects = async (p: Promise<unknown>, re: RegExp) => { await assert.rejects(p, (e: any) => { assert.match(String(e?.response?.message || e?.message), re); return true; }); };

before(async () => {
  if (!RUN) return;
  if (process.env.REUSE_TEST_CLIENT) { const { PrismaClient } = require(process.env.REUSE_TEST_CLIENT); const { PrismaPg } = require(process.env.REUSE_PG_ADAPTER!); db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }), errorFormat: 'minimal' }); }
  else { const { PrismaClient } = require('@prisma/client'); db = new PrismaClient(); }
  for (const [k, role] of [['merch', 'MERCH_BULK'], ['central', 'PLANNING'], ['store', 'FINISHED_FABRIC_STORE'], ['sew', 'SEWING']]) {
    const u = await db.user.create({ data: { email: `${k}.${tag}@reuse.test`, name: k, passwordHash: 'x' } }); U[k] = { id: u.id, name: k, roles: [role] };
  }
  bulk = new BulkMerchController(db); pa = new PlanningApprovalsController(db); reuse = new ReuseController(db);
});
after(async () => { if (db) await db.$disconnect(); });

test('seed loads the real reuse stock (Jan-26 inventory + greige useable excess)', { skip: !RUN }, async () => {
  const n = await seedReuseStock(db); assert.equal(n, 776);
  const s = await reuse.stock({ store: 'FINISHED' }); assert.ok(s.total > 160000, 'about 166 t of finished reuse fabric');
  const m = await reuse.matches({ fabric: 'S/J', gsm: '150', dia: '72"', colour: 'Black', store: 'FINISHED' });
  assert.ok(m.length > 0 && m.every((x) => /black/i.test(x.colour)));
  await rejects(reuse.add(as('sew'), { store: 'FINISHED', source: 'LEFT_AFTER_CUTTING', fabric: 'S/J', kg: 10 } as any), /not allowed/);
});

test('fabric order sheet → reuse suggestions → Planning hold blocks approval → use stock reserves kg', { skip: !RUN }, async () => {
  const f = await db.factory.create({ data: { code: `F${tag}`, name: 'NFL test' } });
  const b = await db.buyer.create({ data: { code: `ONL${tag}`, name: 'ONLY' } });
  const o = await db.order.create({ data: { jobNo: `ONL ${tag}`, factoryId: f.id, buyerId: b.id, merchandiserId: U.merch.id, totalQty: 2400, createdById: U.merch.id, confirmedAt: new Date('2026-10-20T00:00:00Z') } });
  const s = await db.style.create({ data: { orderId: o.id, styleNo: `S${tag}`, quantity: 2400, breakdowns: { create: [{ color: 'Black', size: 'S', qty: 1200 }, { color: 'Rose Pink', size: 'M', qty: 1200 }] } } });
  const steps = { ORDER: 'DONE', CAD: 'DONE', IE: 'DONE', THREAD: 'DONE', FABRIC_SHEET: 'READY', TNA: 'READY', FILE_HANDOVER: 'WAIT', PRE_PRODUCTION: 'WAIT', SIZE_SET: 'WAIT', PP_MEETING: 'WAIT' };
  for (const [step, status] of Object.entries(steps)) await db.merchStep.create({ data: { styleId: s.id, step, status, data: step === 'CAD' ? { parts: [{ part: 'Body', fabric: 'S/J', gsm: 150, comp: '100% Cotton', consKgDz: 2.4 }], finishKg: 480 } : {} } });

  const r = await bulk.fabricSheet(s.id, { colorCodes: { Black: 'C-N10', 'Rose Pink': '15-1621' }, lossPct: 8 } as any, as('merch'));
  assert.ok(r.reuse.matchedLines >= 1 && r.reuse.matchKg > 0, 'black S/J 150 matches reuse stock');
  const black = r.reuse.lines.find((l) => l.colour === 'Black');
  assert.ok(black.suggestions.some((x) => x.store === 'FINISHED'));
  assert.ok(await db.task.findFirst({ where: { entityId: s.id, ownerRoleCode: 'PLANNING', title: { startsWith: 'Check reuse fabric' } } }), 'Planning gets a task');

  const q = await pa.queue(as('central')); const row = q.bulk.find((x) => x.styleId === s.id);
  assert.ok(row.reuse.matchKg > 0);

  await pa.reuseHold(s.id, { note: 'Check shade of old black' } as any, as('central'));
  await pa.signed(s.id, { doc: 'FABRIC_SHEET' } as any, as('central'));
  await rejects(bulk.approveFabric(s.id, as('central')), /Reuse fabric check is on hold/);
  await rejects(pa.reuseDecision(s.id, { decision: 'NOT_SUITABLE' } as any, as('central')), /Write why/);

  const pick = black.suggestions.find((x) => x.store === 'FINISHED');
  await rejects(pa.reuseDecision(s.id, { decision: 'USE', reserve: [{ stockId: pick.id, kg: pick.availableKg + 50 }] } as any, as('central')), /Only/);
  const d = await pa.reuseDecision(s.id, { decision: 'USE', note: 'Shade OK vs standard', reserve: [{ stockId: pick.id, kg: Math.min(100, pick.availableKg) }] } as any, as('central'));
  assert.equal(d.reuseHold.open, false);
  const st = await db.reuseStock.findUnique({ where: { id: pick.id } });
  assert.equal(Number(st.reservedKg), Math.min(100, pick.availableKg));
  await bulk.approveFabric(s.id, as('central'));
  const after = await pa.reuse(s.id, as('central'));
  assert.equal(after.reservations.length, 1); assert.equal(after.hold.decision, 'USE');
});
