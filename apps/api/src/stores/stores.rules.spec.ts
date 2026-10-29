import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSlice, Ctx, uiRolesOf } from './stores.rules';

const G = [{ b: 'OVS', j: '47742', c: 'Lilac', ft: 'S/J', rq: 500, iq: 100, gq: 900 }, { b: 'OVS', j: '47743', c: 'Navy', ft: 'S/J', rq: 0, iq: 0, gq: 400 }];
const F = [{ b: 'BS-NMT', j: '48104', c: 'Black', f: 'S/J', vb: 300, vl: 0, vs: 0 }];
const gctx = (ui: string[], state: any = {}): Ctx => ({ desk: 'GREIGE', ui, demo: false, lines: { G, A: [{ q: 50 }] }, state, today: '2026-10-30' });
const fctx = (ui: string[], state: any = {}): Ctx => ({ desk: 'FINISHED', ui, demo: false, lines: { F, R: [] }, state, today: '2026-10-30' });
const ch = { id: 'k1', i: 1, ch: '2700', src: 'Khadiza', kg: 300, st: 'Pending' };

test('desk roles come from ERP role codes; the two stores are separate', () => {
  assert.deepEqual(uiRolesOf('GREIGE', ['GREIGE_STORE']), ['Greige Store']);
  assert.deepEqual(uiRolesOf('FINISHED', ['GREIGE_STORE']), []);
  assert.deepEqual(uiRolesOf('FINISHED', ['CUTTING']), ['Cutting']);
});

test('knitting challan → store accepts; subcontract must go to QC; QC by Knit Quality', () => {
  assert.deepEqual(checkSlice('kdel', [], [ch], gctx(['Knitting'])), []);
  assert.match(checkSlice('kdel', [], [ch], gctx(['Greige Store'])).join(), /Knitting posts/);
  const acc = { ...ch, st: 'Accepted', acc: { kg: 298 } };
  assert.match(checkSlice('kdel', [ch], [acc], gctx(['Greige Store'])).join(), /goes to QC/);
  const qcp = { ...ch, st: 'QC pending', acc: { kg: 298 } };
  assert.deepEqual(checkSlice('kdel', [ch], [qcp], gctx(['Greige Store'])), []);
  assert.match(checkSlice('kdel', [qcp], [{ ...qcp, st: 'Accepted', qc: { res: 'Pass' } }], gctx(['Greige Store'])).join(), /Knit Quality/);
  assert.match(checkSlice('kdel', [qcp], [{ ...qcp, st: 'Rejected', qc: { res: 'Fail' } }], gctx(['Knit Quality'])).join(), /defects/);
  assert.match(checkSlice('kdel', [ch], [{ ...ch, kg: 999 }], gctx(['Greige Store'])).join(), /only the receipt/);
});

test('delivery requests and partial deliveries; cannot deliver more than stock', () => {
  const q = { id: 'q1', no: 'GR-0001', type: 'Subcontract WO', ref: 'DWO-12', i: 0, kg: 500, fac: 'Newage', st: 'Open' };
  assert.deepEqual(checkSlice('req', [], [q], gctx(['Dyeing Planner'])), []);
  assert.match(checkSlice('req', [], [{ ...q, fac: 'NFL' }], gctx(['Dyeing Planner'])).join(), /subcontract factory/);
  const d1 = { no: 'GD-1', req: 'q1', i: 0, kg: 300 };
  assert.deepEqual(checkSlice('giss', [], [d1], gctx(['Greige Store'], { req: [q], giss: [d1] })), []);
  const d2 = { no: 'GD-2', req: 'q1', i: 0, kg: 150 }; // stock 500-100-300 = 100 left
  assert.match(checkSlice('giss', [d1], [d1, d2], gctx(['Greige Store'], { req: [q], giss: [d1, d2] })).join(), /Not enough greige/);
  assert.match(checkSlice('giss', [d1], [], gctx(['Greige Store'], { req: [q], giss: [] })).join(), /cannot be changed or removed/);
});

test('finished: cutting OK + shipment passed before reuse; cutting issue limited to stock', () => {
  const cut = { no: 'FI-1', i: 0, lot: 'CL-1', body: 250 };
  assert.deepEqual(checkSlice('cut', [], [cut], fctx(['Finished Fabric Store'], { cut: [cut] })), []);
  assert.match(checkSlice('cut', [], [{ ...cut, body: 400 }], fctx(['Finished Fabric Store'], { cut: [{ ...cut, body: 400 }] })).join(), /More than the stock/);
  const fre = { 0: { kg: 50, ship: '2026-10-20' } };
  assert.match(checkSlice('fre', {}, fre, fctx(['Finished Fabric Store'], { cut: [cut], fre })).join(), /cutting is not OK/);
  const ok = { cut: [cut], fre, cutok: { 'BS-NMT|48104': { d: '2026-10-29' } } };
  assert.deepEqual(checkSlice('fre', {}, fre, fctx(['Finished Fabric Store'], ok)), []);
  assert.match(checkSlice('fre', {}, { 0: { kg: 50, ship: '2026-12-01' } }, fctx(['Finished Fabric Store'], ok)).join(), /not passed/);
  assert.match(checkSlice('cutok', {}, { 'BS-NMT|48104': { d: 'x' } }, fctx(['Finished Fabric Store'])).join(), /Cutting confirms/);
});
