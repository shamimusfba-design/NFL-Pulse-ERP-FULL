// @ts-nocheck -- DB integration test: lookups are asserted at runtime
/**
 * Planning approvals against a real PostgreSQL database (all migrations applied).
 * Run: PA_DB_TEST=1 DATABASE_URL=postgresql://... npx tsx --test src/planning-approvals/pa.db.spec.ts
 * Use a disposable test database: the test creates its own rows.
 */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { BulkMerchController } from '../merch/bulk-merch.controller';
import { SampleMerchController } from '../merch/sample-merch.controller';
import { PlanningApprovalsController } from './planning-approvals.controller';
import { KnittingController } from '../yarn-knit/knitting.controller';

const RUN = !!process.env.PA_DB_TEST;
let db: any, bulk: BulkMerchController, sample: SampleMerchController, pa: PlanningApprovalsController, knit: KnittingController;
const U: Record<string, any> = {};
const as = (k: string) => ({ user: U[k] });
const tag = Date.now().toString(36).toUpperCase();
const rejects = async (p: Promise<unknown>, re: RegExp) => { await assert.rejects(p, (e: any) => { assert.match(String(e?.response?.message || e?.message), re); return true; }); };

before(async () => {
  if (!RUN) return;
  if (process.env.YK_TEST_CLIENT) { const { PrismaClient } = require(process.env.YK_TEST_CLIENT); const { PrismaPg } = require(process.env.YK_PG_ADAPTER!); db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }), errorFormat: 'minimal' }); }
  else { const { PrismaClient } = require('@prisma/client'); db = new PrismaClient(); }
  for (const [k, role] of [['merch', 'MERCH_BULK'], ['smerch', 'MERCH_SAMPLE'], ['central', 'PLANNING'], ['splan', 'SAMPLE'], ['kplan', 'KNIT_PLANNER']]) {
    const u = await db.user.create({ data: { email: `${k}.${tag}@pa.test`, name: k, passwordHash: 'x' } }); U[k] = { id: u.id, name: k, roles: [role] };
  }
  bulk = new BulkMerchController(db); sample = new SampleMerchController(db); pa = new PlanningApprovalsController(db); knit = new KnittingController(db);
});
after(async () => { if (db) await db.$disconnect(); });

test('bulk: queue → return → signed copy gate → approve both → release to knitting', { skip: !RUN }, async () => {
  const f = await db.factory.create({ data: { code: `F${tag}`, name: 'NFL test' } });
  const b = await db.buyer.create({ data: { code: `NMT${tag}`, name: 'NAME IT' } });
  const o = await db.order.create({ data: { jobNo: `NMT ${tag}`, factoryId: f.id, buyerId: b.id, merchandiserId: U.merch.id, totalQty: 1200, createdById: U.merch.id, confirmedAt: new Date('2026-10-01T00:00:00Z') } });
  const s = await db.style.create({ data: { orderId: o.id, styleNo: `S${tag}`, quantity: 1200, printEmbType: 'Print', breakdowns: { create: [{ color: 'Black', size: 'S', qty: 300 }, { color: 'Black', size: 'M', qty: 300 }, { color: 'Navy', size: 'S', qty: 600 }] } } });
  const steps = { ORDER: 'DONE', CAD: 'DONE', IE: 'DONE', THREAD: 'DONE', FABRIC_SHEET: 'READY', TNA: 'READY', FILE_HANDOVER: 'WAIT', PRE_PRODUCTION: 'WAIT', SIZE_SET: 'WAIT', PP_MEETING: 'WAIT' };
  for (const [step, status] of Object.entries(steps)) await db.merchStep.create({ data: { styleId: s.id, step, status, data: step === 'CAD' ? { parts: [{ part: 'Body', fabric: 'S/J 30s', gsm: 160, consKgDz: 2.4 }, { part: 'Neck', fabric: '1x1 Rib', consKgDz: 0.3 }], finishKg: 270 } : undefined } });

  await bulk.fabricSheet(s.id, { colorCodes: { Black: '19-4008', Navy: '19-3933' }, lossPct: 8 } as any, as('merch'));
  let q = await pa.queue(as('central'));
  let row = q.bulk.find((x) => x.styleId === s.id);
  assert.equal(row.nextAction, 'Receive signed fabric order sheet');
  await rejects(pa.queue(as('merch')), /not allowed/);

  await pa.returnDoc(s.id, { doc: 'FABRIC_SHEET', reason: 'Navy code wrong' } as any, as('central'));
  assert.ok(await db.task.findFirst({ where: { entityId: s.id, ownerUserId: U.merch.id, title: { startsWith: 'Returned by Planning' }, status: 'PENDING' } }));
  await bulk.fabricSheet(s.id, { colorCodes: { Black: '19-4008', Navy: '19-4010' }, lossPct: 8 } as any, as('merch'));
  assert.equal(await db.task.count({ where: { entityId: s.id, title: { startsWith: 'Returned by Planning' }, status: 'PENDING' } }), 0);

  await rejects(bulk.approveFabric(s.id, as('central')), /signed physical fabric order sheet/);
  await pa.signed(s.id, { doc: 'FABRIC_SHEET', note: 'GM signed' } as any, as('central'));
  await bulk.approveFabric(s.id, as('central'));

  await bulk.tnaSend(s.id, as('merch'));
  q = await pa.queue(as('central')); row = q.bulk.find((x) => x.styleId === s.id);
  assert.equal(row.nextAction, 'Generate TNA');
  await bulk.tnaGenerate(s.id, as('central'));
  await rejects(bulk.tnaApprove(s.id, as('central')), /signed physical TNA/);
  await pa.signed(s.id, { doc: 'TNA' } as any, as('central'));
  await bulk.tnaApprove(s.id, as('central'));

  q = await pa.queue(as('central')); row = q.bulk.find((x) => x.styleId === s.id);
  assert.equal(row.nextAction, 'Release to knitting');
  const d = await pa.draft(s.id, as('central'));
  assert.equal(d.lines.length, 4); // 2 colours × 2 parts
  assert.equal(d.lines.find((l) => l.colour === 'Black' && l.part === 'Body').finishKg, 120);
  assert.equal(d.lines.find((l) => l.colour === 'Navy').colourCode, '19-4010');
  assert.equal(d.check.total, 270); assert.equal(d.check.ok, true);

  const r = await pa.release(s.id, { lines: d.lines } as any, as('central'));
  const kj = await db.knitJob.findUnique({ where: { id: r.knitJobId } });
  assert.equal(kj.status, 'PENDING_PLANNING'); assert.equal(kj.lines.length, 4); assert.equal(kj.jobCode, `NMT ${tag}`);
  assert.ok((await knit.jobs('PENDING_PLANNING')).some((j) => j.id === r.knitJobId), 'knitting planner sees the released job');
  await rejects(pa.release(s.id, { lines: d.lines } as any, as('central')), /Already released/);

  q = await pa.queue(as('central')); row = q.bulk.find((x) => x.styleId === s.id);
  assert.equal(row.nextAction, 'Write item and print/emb description');
  await bulk.descriptions(s.id, { itemDescription: 'Girls LS top', printEmbDescription: 'Front chest print' } as any, as('central'));
  q = await pa.queue(as('central'));
  assert.equal(q.bulk.find((x) => x.styleId === s.id), undefined, 'job leaves the queue when nothing is left for Planning');
  const h = await pa.history(s.id, as('central'));
  assert.ok(h.some((x) => x.action === 'PLANNING_RELEASED_TO_KNITTING') && h.some((x) => x.action === 'PLANNING_SIGNED_COPY_TNA'));
});

test('sample: queue shows quota use; over-quota sheet is flagged', { skip: !RUN }, async () => {
  const line = `ONLY ${tag}`, m = new Date().toISOString().slice(0, 7);
  await db.sampleQuota.create({ data: { month: m, line, odQuota: 1, smsQuota: 0 } });
  const mk = (st: string, over?: boolean) => sample.create({ buyerName: 'BESTSELLER', subBrand: line, styleNo: st, sampleTypes: ['Development'], colors: [{ color: 'Black', qty: 2 }], overQuota: over } as any, as('smerch'));
  await mk(`D1${tag}`);
  await rejects(mk(`D2${tag}`), /quota/);
  await mk(`D2${tag}`, true);
  const q = await pa.queue(as('splan'));
  const mine = q.sample.filter((x) => x.line === line);
  assert.equal(mine.length, 2); assert.ok(mine.every((x) => x.quota.overQuota), 'both sheets show the line is over quota (2 of 1)');
  const qb = q.quota.find((x) => x.line === line); assert.equal(qb.od.used, 2); assert.equal(qb.od.full, true);
  assert.equal(q.bulk.length, 0, 'Sample Planning does not see the bulk desk');
});
