// @ts-nocheck -- DB integration test
/**
 * Integration test against a real PostgreSQL database (all migrations applied).
 * Run:  DYE_DB_TEST=1 DATABASE_URL=postgresql://... npx tsx --test src/dyeing/dyeing.db.spec.ts
 * Disposable test database only: it loads the 29.09.26 report and writes desk records.
 */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DyeingController } from './dyeing.controller';
import { seedDyeingReport } from '../../prisma/dyeing-report-seed';

const RUN = !!process.env.DYE_DB_TEST;
let db: any, api: DyeingController, lines: any[] = [];
const U: Record<string, any> = {};
const as = (k: string) => ({ user: U[k] });
const tag = Date.now().toString(36).toUpperCase();
const day = new Date().toISOString().slice(0, 10);
const fails = async (p: Promise<unknown>, status: number, re: RegExp) => {
  await assert.rejects(p, (e: any) => { assert.equal(e?.status, status); assert.match(JSON.stringify(e?.response ?? e?.message), re); return true; });
};
const ver = async () => (await api.state(as('admin'))).state;

before(async () => {
  if (!RUN) return;
  if (process.env.DYE_TEST_CLIENT) { const { PrismaClient } = require(process.env.DYE_TEST_CLIENT); const { PrismaPg } = require(process.env.DYE_PG_ADAPTER!); db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }), errorFormat: 'minimal' }); }
  else { const { PrismaClient } = require('@prisma/client'); db = new PrismaClient(); }
  await db.dyeingChange.deleteMany(); await db.dyeingStateSlice.deleteMany();
  const n = await seedDyeingReport(db);
  assert.equal(n, 5581);
  for (const [k, role] of [['admin', 'ADMIN'], ['plan', 'DYEING_PLANNER'], ['greige', 'GREIGE_STORE'], ['dye', 'DYEING'], ['pc', 'PLANNING'], ['dlab', 'DYEING_LAB'], ['lab', 'LAB'], ['fqc', 'FABRIC_FINISHING'], ['merch', 'MERCH_BULK'], ['sew', 'SEWING']]) {
    const u = await db.user.create({ data: { email: `${k}.${tag}@test.local`, name: k, passwordHash: 'x' } }); U[k] = { id: u.id, name: k, roles: [role] };
  }
  api = new DyeingController(db);
});
after(async () => { if (db) await db.$disconnect(); });

test('bootstrap returns all report lines, desk roles and empty slices', { skip: !RUN }, async () => {
  const b = await api.bootstrap(as('plan'));
  lines = b.lines;
  assert.equal(lines.length, 5581);
  assert.deepEqual(b.user.uiRoles, ['Dyeing Planner']);
  assert.equal(b.state.wos.version, 0);
  assert.equal(b.machines.length, 20);
  await fails(api.bootstrap(as('sew')), 403, /no dyeing desk role/);
  // re-running the seed updates in place, no duplicate lines
  await seedDyeingReport(db);
  assert.equal(await db.dyeingLine.count(), 5581);
});

test('work order → approval → board → delivery gates, all persisted', { skip: !RUN }, async () => {
  const L = lines.find((l) => l.j && l.c && !l.it && l.df === 'NFL' && !l.bn && !l.dd && l.rt > 100);
  const key = `${L.j}|${L.c}`;
  const wo = { no: 'DWO-26-0001', name: 'test', job: L.b + ' ' + L.j, route: 'In-house', fac: 'NFL', proc: ['fin'], rows: [L.id], kg: L.rt, st: 'Awaiting approval' };

  await fails(api.save(as('greige'), { slices: { wos: { version: 0, data: [wo] } } }), 400, /Dyeing Planner creates/);
  let r = await api.save(as('plan'), { slices: { wos: { version: 0, data: [wo] }, rowWo: { version: 0, data: { [L.id]: wo.no } }, woSeq: { version: 0, data: 1 } } });
  assert.deepEqual(r.versions, { wos: 1, rowWo: 1, woSeq: 1 });

  // two people on version 1: first wins, second gets a conflict
  await api.save(as('pc'), { slices: { wos: { version: 1, data: [{ ...wo, st: 'Approved', apBy: 'Planning & Control' }] } } });
  await fails(api.save(as('plan'), { slices: { wos: { version: 1, data: [{ ...wo, name: 'renamed' }] } } }), 409, /Someone else saved wos/);

  // board: refused until the lab dip is approved
  const batch = { id: 'b1', m: 'MC-06', d: day, kg: 300, parts: [{ i: L.id, kg: 300 }], shade: 'Dark', c: L.c };
  await fails(api.save(as('plan'), { slices: { batches: { version: 0, data: [batch] } } }), 400, /not approved/);
  await fails(api.save(as('dye'), { slices: { labdip: { version: 0, data: { [key]: { st: 'Approved' } } } } }), 400, /Dyeing Lab or Merchandiser/);
  await api.save(as('dlab'), { slices: { labdip: { version: 0, data: { [key]: { st: 'Approved', rd: 1 } } } } });
  await fails(api.save(as('plan'), { slices: { batches: { version: 0, data: [{ ...batch, parts: [{ i: L.id, kg: 950 }] }] } } }), 400, /over the safe load/);
  await api.save(as('plan'), { slices: { batches: { version: 0, data: [{ ...batch, conf: true, card: 'BC-TEST-001' }] }, bcSeq: { version: 0, data: 1 } } });
  await fails(api.save(as('plan'), { slices: { batches: { version: 1, data: [] } } }), 400, /already issued/);

  // daily entries and the delivery gate
  const ent = (list: any[], v: number, who: string) => api.save(as(who), { slices: { ent: { version: v, data: { [L.id]: list } } } });
  const dyed = { t: 'dye', d: day, q: 300, b: 'BC-TEST-001', by: 'Dyeing Production' };
  await fails(ent([dyed], 0, 'greige'), 400, /Dyeing Production/);
  await ent([dyed], 0, 'dye');
  const dlv = { t: 'dlv', d: day, q: 250, by: 'Dyeing Production' };
  await fails(ent([dyed, dlv], 1, 'dye'), 400, /testing lab pass/);
  await api.save(as('lab'), { slices: { tests: { version: 0, data: { [key]: { res: 'Pass', t: { GSM: 'Pass' } } } } } });
  await fails(ent([dyed, dlv], 1, 'dye'), 400, /final inspection/);
  await api.save(as('fqc'), { slices: { fqc: { version: 0, data: { [key]: { res: 'Pass', rolls: 12 } } } } });
  await ent([dyed, dlv], 1, 'dye');

  const st = await ver();
  assert.equal(st.ent.data[L.id].length, 2);
  assert.equal(st.wos.data[0].st, 'Approved');
  assert.equal(st.batches.data[0].card, 'BC-TEST-001');
  const log = await api.changes(as('admin'), '50');
  assert.ok(log.length >= 9);
  assert.ok(log.some((c) => c.slice === 'ent' && c.actorName === 'dye'));
});
