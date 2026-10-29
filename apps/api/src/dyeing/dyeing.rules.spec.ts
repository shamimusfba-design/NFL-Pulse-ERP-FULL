import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDeliver, checkSlice, labdipApproved, uiRolesOf } from './dyeing.rules';

const keys: Record<string, string> = { L1: '48104|Black', L2: '48110|Black', L3: '48651|White' };
const ctx = (ui: string[], state: Record<string, any> = {}, sms: Record<string, string> = {}) => ({ ui, lineKey: (id: string) => keys[id] ?? null, state, sms });
const day = '2026-10-29';

test('ERP role codes map to desk roles; admin gets all', () => {
  assert.deepEqual(uiRolesOf(['DYEING_PLANNER']), ['Dyeing Planner']);
  assert.deepEqual(uiRolesOf(['LAB', 'MERCH_BULK']), ['Testing Lab', 'Merchandiser']);
  assert.equal(uiRolesOf(['ADMIN']).length, 9);
  assert.deepEqual(uiRolesOf(['SEWING']), []);
});

test('entries: each entry type belongs to its section', () => {
  const add = (t: string, extra: object = {}) => ({ L1: [{ t, d: day, q: 500, ...extra }] });
  assert.deepEqual(checkSlice('ent', {}, add('dye'), ctx(['Dyeing Production'])), []);
  assert.match(checkSlice('ent', {}, add('giss'), ctx(['Dyeing Production']))[0], /Greige Store/);
  assert.deepEqual(checkSlice('ent', {}, add('giss'), ctx(['Greige Store'])), []);
  assert.match(checkSlice('ent', {}, add('gsub'), ctx(['Greige Store'])).join(), /factory/);
  assert.match(checkSlice('ent', {}, { L1: [{ t: 'dye', d: day, q: 0 }] }, ctx(['Dyeing Production'])).join(), /more than 0/);
  assert.match(checkSlice('ent', {}, { X9: [{ t: 'dye', d: day, q: 5 }] }, ctx(['Dyeing Production'])).join(), /does not exist/);
});

test('delivery gate: lab test + final inspection, or conditional release', () => {
  const dlv = { L1: [{ t: 'dlv', d: day, q: 100 }] };
  assert.match(checkSlice('ent', {}, dlv, ctx(['Dyeing Production'])).join(), /testing lab pass/);
  const half = { tests: { '48104|Black': { res: 'Pass' } } };
  assert.equal(canDeliver('48104|Black', half), false);
  const both = { tests: { '48104|Black': { res: 'Pass' } }, fqc: { '48104|Black': { res: 'Pass' } } };
  assert.deepEqual(checkSlice('ent', {}, dlv, ctx(['Dyeing Production'], both)), []);
  assert.deepEqual(checkSlice('ent', {}, dlv, ctx(['Dyeing Production'], { cond: { '48104|Black': { n: 'Buyer OK by mail' } } })), []);
});

test('quality records belong to their own section and need findings when not passed', () => {
  assert.match(checkSlice('tests', {}, { '48104|Black': { res: 'Pass' } }, ctx(['Dyeing Lab']))[0], /Testing Lab/);
  assert.deepEqual(checkSlice('tests', {}, { '48104|Black': { res: 'Pass' } }, ctx(['Testing Lab'])), []);
  assert.match(checkSlice('fqc', {}, { '48104|Black': { res: 'Fail' } }, ctx(['Finishing QC'])).join(), /findings/);
  assert.match(checkSlice('labdip', {}, { '48104|Black': { st: 'Approved' } }, ctx(['Dyeing Production']))[0], /Dyeing Lab or Merchandiser/);
  assert.match(checkSlice('cond', {}, { '48104|Black': { n: '' } }, ctx(['Merchandiser'])).join(), /reason/);
  assert.match(checkSlice('rft', [{ res: 'RFT' }], [], ctx(['Dyeing Lab'])).join(), /only be added/);
});

test('work orders: planner creates, Planning & Control approves, approved WO is locked', () => {
  const wo = { no: 'DWO-26-0001', route: 'In-house', fac: 'NFL', rows: ['L1'], st: 'Awaiting approval' };
  assert.deepEqual(checkSlice('wos', [], [wo], ctx(['Dyeing Planner'])), []);
  assert.match(checkSlice('wos', [], [wo], ctx(['Greige Store'])).join(), /Dyeing Planner creates/);
  assert.match(checkSlice('wos', [], [{ ...wo, fac: 'Newage' }], ctx(['Dyeing Planner'])).join(), /must be NFL/);
  assert.deepEqual(checkSlice('wos', [wo], [{ ...wo, st: 'Approved' }], ctx(['Planning & Control'])), []);
  assert.match(checkSlice('wos', [wo], [{ ...wo, st: 'Approved' }], ctx(['Testing Lab'])).join(), /Planning & Control/);
  const ap = { ...wo, st: 'Approved' };
  assert.match(checkSlice('wos', [ap], [], ctx(['Dyeing Planner'])).join(), /cannot be cancelled/);
  assert.match(checkSlice('wos', [ap], [{ ...ap, fac: 'X' }], ctx(['Dyeing Planner'])).join(), /cannot be changed/);
});

test('machine board: safe load, lab dip gate, issued cards locked', () => {
  const ok = { labdip: { '48104|Black': { st: 'Approved' }, '48110|Black': { st: 'Approved' } }, set: { maxl: 85 } };
  // owner example: 200 + 300 + 150 kg black in one batch on the 1050 kg machine (safe load 892 kg)
  const b = { id: 'b1', m: 'MC-06', d: day, parts: [{ i: 'L1', kg: 200 }, { i: 'L2', kg: 300 }, { i: 'L1', kg: 150 }] };
  assert.deepEqual(checkSlice('batches', [], [b], ctx(['Dyeing Planner'], ok)), []);
  assert.match(checkSlice('batches', [], [{ ...b, parts: [{ i: 'L1', kg: 900 }] }], ctx(['Dyeing Planner'], ok)).join(), /over the safe load/);
  assert.match(checkSlice('batches', [], [{ ...b, parts: [{ i: 'L3', kg: 100 }] }], ctx(['Dyeing Planner'], ok)).join(), /not approved/);
  assert.equal(labdipApproved('48651|White', {}, { '48651|White': 'Approved' }), true); // approved at SMS stage
  assert.deepEqual(checkSlice('batches', [], [{ ...b, parts: [{ i: 'L3', kg: 100 }] }], ctx(['Dyeing Planner'], ok, { '48651|White': 'Approved' })), []);
  const issued = { ...b, conf: true, card: 'BC-261029-001' };
  assert.match(checkSlice('batches', [issued], [], ctx(['Dyeing Planner'], ok)).join(), /already issued/);
  assert.match(checkSlice('batches', [], [b], ctx(['Dyeing Production'], ok)).join(), /Dyeing Planner/);
});

test('records read back from PostgreSQL (keys re-ordered) are not seen as changed', () => {
  const wo = { no: 'DWO-26-0001', route: 'In-house', fac: 'NFL', rows: ['L1'], st: 'Approved', apBy: 'Planning & Control' };
  const fromDb = { apBy: 'Planning & Control', fac: 'NFL', no: 'DWO-26-0001', route: 'In-house', rows: ['L1'], st: 'Approved' };
  const wo2 = { no: 'DWO-26-0002', route: 'Subcontract', fac: 'Newage', rows: ['L2'], st: 'Awaiting approval' };
  assert.deepEqual(checkSlice('wos', [fromDb], [wo, wo2], ctx(['Dyeing Planner'])), []);
});
