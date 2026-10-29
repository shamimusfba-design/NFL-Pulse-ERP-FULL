// @ts-nocheck -- DB integration test
/** Store desks on PostgreSQL. Run: STORES_DB_TEST=1 DATABASE_URL=... npx tsx --test src/stores/stores.db.spec.ts */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { StoresController } from './stores.controller';
import { seedStores } from '../../prisma/stores-seed';

const RUN = !!process.env.STORES_DB_TEST;
let db: any, api: StoresController;
const U: Record<string, any> = {};
const as = (k: string) => ({ user: U[k] });
const tag = Date.now().toString(36).toUpperCase();
const today = new Date().toISOString().slice(0, 10);
const fails = async (p: Promise<unknown>, status: number, re: RegExp) => { await assert.rejects(p, (e: any) => { assert.equal(e?.status, status); assert.match(JSON.stringify(e?.response ?? e?.message), re); return true; }); };

before(async () => {
  if (!RUN) return;
  if (process.env.STORES_TEST_CLIENT) { const { PrismaClient } = require(process.env.STORES_TEST_CLIENT); const { PrismaPg } = require(process.env.STORES_PG_ADAPTER!); db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }), errorFormat: 'minimal' }); }
  else { const { PrismaClient } = require('@prisma/client'); db = new PrismaClient(); }
  await db.storeChange.deleteMany(); await db.storeSlice.deleteMany();
  const c = await seedStores(db); assert.equal(c['GREIGE.G'], 8682); assert.equal(c['FINISHED.R'], 688);
  for (const [k, role] of [['knit', 'KNITTING'], ['gstore', 'GREIGE_STORE'], ['kqc', 'KNIT_QUALITY'], ['dplan', 'DYEING_PLANNER'], ['dye', 'DYEING'], ['fstore', 'FINISHED_FABRIC_STORE'], ['cut', 'CUTTING'], ['sew', 'SEWING']]) {
    const u = await db.user.create({ data: { email: `${k}.${tag}@st.test`, name: k, passwordHash: 'x' } }); U[k] = { id: u.id, name: k, roles: [role] };
  }
  api = new StoresController(db);
});
after(async () => { if (db) await db.$disconnect(); });

test('greige: challan → accept → QC → request → partial delivery → reuse goes to ReuseStock', { skip: !RUN }, async () => {
  const b = await api.bootstrap('greige', as('gstore'));
  assert.equal(b.lines.G.length, 8682); assert.deepEqual(b.user.uiRoles, ['Greige Store']);
  await fails(api.bootstrap('finished', as('gstore')), 403, /no role/);
  const i = b.lines.G.findIndex((r) => (r.gq || 0) - (r.rq || 0) > 500);
  const ch = { id: 'k1', i, ch: 'K-1', src: 'Khadiza', kg: 400, rolls: 18, d: today, by: 'Knitting', st: 'Pending' };
  await fails(api.save('greige', as('gstore'), { slices: { kdel: { version: 0, data: [ch] } } }), 400, /Knitting posts/);
  await api.save('greige', as('knit'), { slices: { kdel: { version: 0, data: [ch] }, kseq: { version: 0, data: 1 } } });
  const qcp = { ...ch, st: 'QC pending', acc: { kg: 398, rolls: 18, loc: 'NCL-Main Building', d: today, by: 'Greige Store' } };
  await api.save('greige', as('gstore'), { slices: { kdel: { version: 1, data: [qcp] } } });
  await api.save('greige', as('kqc'), { slices: { kdel: { version: 2, data: [{ ...qcp, st: 'Accepted', qc: { res: 'Pass', p: 12, y: 400, d: today } }] } } });
  const q = { id: 'q1', no: 'GR-0001', type: 'Subcontract WO', ref: 'DWO-26-0012', i, kg: 500, fac: 'Newage', d: today, st: 'Open' };
  await api.save('greige', as('dplan'), { slices: { req: { version: 0, data: [q] }, rseq: { version: 0, data: 1 } } });
  const g1 = { no: 'GD-0001', req: 'q1', i, ref: q.ref, kg: 300, loc: 'NCL-Main Building', d: today };
  await api.save('greige', as('gstore'), { slices: { giss: { version: 0, data: [g1] }, gseq: { version: 0, data: 1 } } });
  const g2 = { ...g1, no: 'GD-0002', kg: 450 };
  await fails(api.save('greige', as('gstore'), { slices: { giss: { version: 1, data: [g1, g2] } } }), 400, /more delivered than requested|Not enough greige/);
  await fails(api.save('greige', as('gstore'), { slices: { giss: { version: 0, data: [g1] } } }), 409, /Someone else/);
  const left = b.lines.G.findIndex((r) => (r.rq || 0) - (r.iq || 0) > 50 && r.de && r.de < '2026-09-28');
  await api.save('greige', as('gstore'), { slices: { reuse: { version: 0, data: { [left]: { st: 'In reuse', kg: 50, loc: 'Tin Shed', d: today } } } } });
  const rs = await db.reuseStock.findUnique({ where: { ref: `GREIGE:G:${left}` } });
  assert.equal(rs.store, 'GREIGE'); assert.equal(Number(rs.kg), 50); assert.equal(rs.source, 'LEFT_AFTER_DYEING');
});

test('finished: demo once → dyeing challan → accept → cut → cutting OK → reuse', { skip: !RUN }, async () => {
  const b = await api.bootstrap('finished', as('fstore'));
  const i = b.lines.F.findIndex((r) => (r.rb || 0) > 300);
  await fails(api.demo('finished', as('fstore'), { slices: { ddel: { version: 0, data: [{ id: 'x', i, ch: 'D', body: 5, st: 'Pending' }] } } }), 400, /marked demo/);
  await api.demo('finished', as('fstore'), { slices: { ddel: { version: 0, data: [{ id: 'd0', i, ch: 'DEMO-D1', body: 10, st: 'Pending', demo: true }] }, demoSeeded: { version: 0, data: true } } });
  await fails(api.demo('finished', as('fstore'), { slices: { dseq: { version: 0, data: 1 } } }), 400, /already loaded/);
  const d = { id: 'd1', i, ch: 'D-901', body: 300, lrib: 0, sj: 0, d: today, st: 'Pending' };
  const demoRow = { id: 'd0', i, ch: 'DEMO-D1', body: 10, st: 'Pending', demo: true };
  await api.save('finished', as('dye'), { slices: { ddel: { version: 1, data: [demoRow, d] } } });
  await api.save('finished', as('fstore'), { slices: { ddel: { version: 2, data: [{ ...d, st: 'Accepted', acc: { body: 296, lrib: 0, sj: 0, loc: 'F.ST', d: today } }] } } }); // demo row cleared by the store
  await api.save('finished', as('fstore'), { slices: { cut: { version: 0, data: [{ no: 'FI-1', i, lot: 'CL-1', body: 250, d: today }] } } });
  await fails(api.save('finished', as('fstore'), { slices: { fre: { version: 0, data: { [i]: { kg: 40, ship: '2026-10-01' } } } } }), 400, /cutting is not OK/);
  const r = b.lines.F[i];
  await api.save('finished', as('cut'), { slices: { cutok: { version: 0, data: { [`${r.b}|${r.j}`]: { d: today } } } } });
  await api.save('finished', as('fstore'), { slices: { fre: { version: 0, data: { [i]: { kg: 40, ship: '2026-10-01', loc: 'F.ST', d: today } } } } });
  const rs = await db.reuseStock.findUnique({ where: { ref: `FINISHED:F:${i}` } });
  assert.equal(rs.source, 'LEFT_AFTER_CUTTING'); assert.equal(Number(rs.kg), 40);
  assert.ok((await api.changes('finished', as('fstore'), '20')).length >= 6);
});
