// @ts-nocheck -- DB integration test: lookups via .find() are asserted at runtime, strict undefined checks add noise here
/**
 * Integration test against a real PostgreSQL database (all migrations applied).
 * Run:  YK_DB_TEST=1 DATABASE_URL=postgresql://... npx tsx --test src/yarn-knit/yk.db.spec.ts
 * The database must be a disposable test database: the test creates its own rows.
 */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { YarnController } from './yarn.controller';
import { KnittingController } from './knitting.controller';
import { KnitQualityController } from './knit-quality.controller';

const RUN = !!process.env.YK_DB_TEST;
let db: any, yarn: YarnController, knit: KnittingController, qc: KnitQualityController;
const U: Record<string, any> = {};
const as = (k: string) => ({ user: U[k] });
const today = new Date().toISOString().slice(0, 10);
const tag = Date.now().toString(36).toUpperCase();
const rejects = async (p: Promise<unknown>, re: RegExp) => { await assert.rejects(p, (e: any) => { assert.match(String(e?.response?.message || e?.message), re); return true; }); };

before(async () => {
  if (!RUN) return;
  if (process.env.YK_TEST_CLIENT) { const { PrismaClient } = require(process.env.YK_TEST_CLIENT); const { PrismaPg } = require(process.env.YK_PG_ADAPTER!); db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }), errorFormat: 'minimal' }); }
  else { const { PrismaClient } = require('@prisma/client'); db = new PrismaClient(); }
  for (const [k, role] of [['admin', 'ADMIN'], ['store', 'YARN_STORE'], ['merch', 'MERCH_BULK'], ['proc', 'PROCUREMENT'], ['central', 'PLANNING'], ['plan', 'KNIT_PLANNER'], ['rep', 'KNIT_REPORTER'], ['pic', 'KNIT_INCHARGE'], ['qc', 'KNIT_QUALITY']]) {
    const u = await db.user.create({ data: { email: `${k}.${tag}@test.local`, name: k, passwordHash: 'x' } }); U[k] = { id: u.id, name: k, roles: [role] };
  }
  yarn = new YarnController(db); knit = new KnittingController(db); qc = new KnitQualityController(db);
});
after(async () => { if (db) await db.$disconnect(); });

test('yarn: requisition → purchase → partial receipts → issue → return', { skip: !RUN }, async () => {
  const c1 = `30/1 BCI C ${tag}`, c2 = `20D ${tag}`;
  await yarn.import({ asOf: today, counts: [{ code: c1, moqKg: 10000 }, { code: c2, moqKg: 2000 }], lots: [{ yarnDesc: `30s BCI ${tag}`, countCode: c1, lotNo: 'L1', closingKg: 300, receivedAt: '2026-01-01' }] } as any, as('admin'));
  await rejects(yarn.import({ asOf: today, counts: [] } as any, as('store')), /not allowed/);

  const r = await yarn.createReq({ buyer: 'BS-ONL', basis: 'CONFIRMED', lines: [{ countCode: c1, kg: 1000 }] } as any, as('merch')).catch((e) => e);
  assert.match(String(r?.response?.message), /style/);
  const req = await yarn.createReq({ buyer: 'BS-ONL', style: '15402333', basis: 'PROJECTED', lines: [{ countCode: c1, kg: 1000 }] } as any, as('merch'));
  assert.equal(req.status, 'PENDING_STORE');
  await rejects(yarn.purchaseOrder({ requisitionId: req.id, supplier: 'NRG', poNo: `PO-${tag}`, lines: [{ countCode: c1, kg: 1000 }] } as any, as('proc')), /not approved/);
  await yarn.approveReq(req.id, as('store'));
  const [pl] = await yarn.purchaseOrder({ requisitionId: req.id, supplier: 'NRG', poNo: `PO-${tag}`, lcNo: 'LC1', eta: today, lines: [{ countCode: c1, kg: 1000 }] } as any, as('proc'));
  let st = (await yarn.requisitions()).find((x: any) => x.id === req.id); assert.equal(st.state, 'ORDERED');

  const g = { purchaseLineId: pl.id, date: today, yarnDesc: `30s comb compact BCI ${tag}`, lotNo: 'NR-1', qcStatus: 'PASSED' };
  await yarn.receive({ ...g, kg: 400, clientRef: `grn-${tag}-1` } as any, as('store'));
  const dup: any = await yarn.receive({ ...g, kg: 400, clientRef: `grn-${tag}-1` } as any, as('store'));
  assert.equal(dup.duplicate, true);
  await rejects(yarn.receive({ ...g, kg: 700 } as any, as('store')), /5% over/);
  st = (await yarn.requisitions()).find((x: any) => x.id === req.id); assert.equal(st.state, 'PARTLY_RECEIVED');
  await yarn.receive({ ...g, kg: 600 } as any, as('store'));
  st = (await yarn.requisitions()).find((x: any) => x.id === req.id); assert.equal(st.state, 'RECEIVED');

  const lots = (await yarn.lots('0')).filter((l: any) => String(l.yarnDesc).includes(tag));
  const nr = lots.find((l: any) => l.lotNo === 'NR-1'), old = lots.find((l: any) => l.lotNo === 'L1');
  assert.equal(nr.balanceKg, 1000); assert.equal(old.balanceKg, 300);
  await rejects(yarn.issue({ lotId: old.id, jobCode: 'BS-ONL 1', party: 'NFL', programNo: 'P1', date: today, kg: 500 } as any, as('store')), /Only 300 kg/);
  await yarn.lotQc(old.id, { qcStatus: 'HOLD' } as any, as('store'));
  await rejects(yarn.issue({ lotId: old.id, jobCode: 'BS-ONL 1', party: 'NFL', programNo: 'P1', date: today, kg: 100 } as any, as('store')), /QC HOLD/);

  // two people issue 800 kg each from the same 1,000 kg lot at the same time: only one may succeed
  const res = await Promise.allSettled([1, 2].map((i) => yarn.issue({ lotId: nr.id, jobCode: 'BS-ONL 1', party: 'NFL', programNo: 'P' + i, date: today, kg: 800 } as any, as('store'))));
  assert.equal(res.filter((x) => x.status === 'fulfilled').length, 1, 'exactly one concurrent issue succeeds');
  const after1 = (await yarn.lots('0')).find((l: any) => l.id === nr.id); assert.equal(after1.balanceKg, 200);

  await rejects(yarn.yarnReturn({ lotId: nr.id, party: 'Parents', date: today, kg: 10 } as any, as('store')), /only 0 kg/);
  await yarn.yarnReturn({ lotId: nr.id, party: 'NFL', date: today, kg: 50 } as any, as('store'));
  assert.equal((await yarn.lots('0')).find((l: any) => l.id === nr.id).balanceKg, 250);

  const cnt = (await yarn.counts()).find((c: any) => c.code === c1);
  assert.equal(cnt.phys, 550); assert.equal(cnt.holdKg, 300); assert.equal(cnt.pipe, 0); assert.equal(cnt.status, 'PIPELINE_LOW');
  const audits = await db.auditLog.count({ where: { userId: { in: [U.store.id, U.proc.id, U.merch.id] } } }); assert.ok(audits >= 8);
});

test('knitting: program import → plan → move → report → quantity → production → day plan → quality', { skip: !RUN }, async () => {
  const M1 = `T1-${tag}`, M2 = `T2-${tag}`;
  await knit.import({ machines: [{ id: M1, dia: '36"24G', capKgDay: 400 }, { id: M2, dia: '36"24G', capKgDay: 400 }], program: [
    { mc: M1, buyer: 'BS ONS', job: '48283 5TH', fabric: 'S/J', colour: 'BLACK', order: 1000, prod: 200, pos: 'RUN', ta: today },
    { mc: M1, buyer: 'BS ONS', job: '48283 5TH', fabric: 'S/J', colour: 'WHITE', order: 400, prod: 0, pos: '2' },
    { mc: M1, buyer: 'BS ONS', job: '48283 5TH', fabric: 'RIB', colour: 'NAVY', order: 300, prod: 0, pos: 'Y/NILL' } ] } as any, as('admin'));
  let plan = await knit.getPlan(); let mine = plan.lines.filter((l: any) => l.machineId === M1);
  const black = mine.find((l: any) => l.colour === 'BLACK'), white = mine.find((l: any) => l.colour === 'WHITE'), navy = mine.find((l: any) => l.colour === 'NAVY');
  assert.equal(black.position, 'RUN'); assert.equal(black.balanceKg, 800); assert.equal(white.position, '2'); assert.equal(white.startOffset, black.endOffset); // white starts the moment black ends assert.equal(navy.hold, true);
  assert.equal(black.jobCode, 'BS-ONS 48283 5TH'); assert.equal(black.late, true); // 2 days of work, T&A close today

  const job = await knit.createJob({ jobCode: `BS-NMT ${tag}`, buyer: 'BS-NMT', style: 'TEE', shipDate: '2026-12-31', taClose: '2026-12-01', lines: [{ colour: 'Black', part: 'Body', fabric: 'S/J', dia: '36X24', countType: '30/1 BCI C', finishKg: 920 }, { colour: 'Black', part: 'Rib', fabric: 'Rib', dia: '30X18', finishKg: 90 }] } as any, as('central'));
  await rejects(knit.planJob(job.id, { lines: [{ index: 0, mode: 'IN_HOUSE', machineId: M1 }, { index: 1, mode: 'OUTSOURCE' }] } as any, as('store')), /not allowed/);
  const created = await knit.planJob(job.id, { lines: [{ index: 0, mode: 'IN_HOUSE', machineId: M1 }, { index: 1, mode: 'OUTSOURCE' }] } as any, as('plan'));
  const body = created[0], rib = created[1]; assert.equal(Number(body.orderKg), 1000); // 920 / (1 − 8%)
  plan = await knit.getPlan(); assert.equal(plan.lines.find((l: any) => l.lineId === body.id).position, '3');

  const mv: any = await knit.move({ lineId: body.id, machineId: M2, date: today } as any, as('plan'));
  assert.equal(mv.slot.machineId, M2); assert.equal(mv.slot.position, 'RUN'); assert.equal(mv.diaMatch, true);
  plan = await knit.getPlan(); assert.equal(plan.lines.filter((l: any) => l.machineId === M1 && !l.hold).length, 2);
  await knit.release(navy.lineId, {} as any, as('plan')); plan = await knit.getPlan(); assert.equal(plan.lines.find((l: any) => l.lineId === navy.lineId).position, '3');
  await knit.hold(navy.lineId, { reason: 'Y/NILL' } as any, as('plan'));

  await rejects(knit.reportComplete(job.id, as('rep')), /Fill yarn count/);
  for (const l of created) await knit.report(l.id, { yarnCount: '30/1', brand: 'NRG', yarnLot: 'N-1', slot: "Oct'26 1st" } as any, as('rep'));
  await knit.reportComplete(job.id, as('rep'));
  await rejects(knit.approveQty(job.id, { lines: [{ lineId: body.id, finalKg: 900 }, { lineId: rib.id, finalKg: 100 }] } as any, as('pic')), /less than finish/);
  await knit.approveQty(job.id, { lines: [{ lineId: body.id, finalKg: 1030 }, { lineId: rib.id, finalKg: 100 }] } as any, as('pic'));
  await knit.outside(rib.id, { factory: 'Parents', programNo: 'P-1', startDate: today, endDate: today } as any, as('pic'));
  await rejects(knit.outside(body.id, { factory: 'Parents', startDate: today, endDate: today } as any, as('pic')), /in-house/);

  await rejects(knit.production({ lineId: body.id, date: today, knittedKg: 1200 } as any, as('rep')), /10% over/);
  await knit.production({ lineId: body.id, date: today, machineId: M2, knittedKg: 400, deliveredKg: 300 } as any, as('rep'));
  await rejects(knit.production({ lineId: body.id, date: today, knittedKg: 0, deliveredKg: 200 } as any, as('rep')), /Only 100 kg/);
  const L = (await knit.lines(undefined, `BS-NMT ${tag}`)).find((l: any) => l.id === body.id);
  assert.equal(L.knitReqKg, 1030); assert.equal(L.knittedKg, 400); assert.equal(L.balanceKg, 630); assert.equal(L.deliveryBalanceKg, 100); assert.equal(L.extraPct, 11.96);
  const dp = await knit.dayPlan(today); assert.ok(dp.some((x: any) => x.lineId === body.id && x.machineId === M2 && x.actualKg === 400));
  const cap = await knit.capacity(today); assert.ok(cap.find((c: any) => c.factory === 'NFL (in-house)').bookedTons > 0);

  await rejects(qc.create({ lineId: body.id, date: today, inspectedKg: 100, defect: 'Hole', defectKg: 0, rejectedKg: 0, decision: 'PASS' } as any, as('qc')), /defect kg/);
  await qc.create({ lineId: body.id, date: today, inspectedKg: 400, defect: 'Hole', defectKg: 8, rejectedKg: 0, decision: 'HOLD', remarks: 'needle changed' } as any, as('qc'));
  const s: any = await qc.summary({ from: today, to: today, buyer: 'BS-NMT' });
  assert.ok(s.inspectedKg >= 400); assert.ok(s.holdKg >= 400);
  const L2 = (await knit.lines(undefined, `BS-NMT ${tag}`)).find((l: any) => l.id === body.id); assert.equal(L2.remarksCount, 1);
});
