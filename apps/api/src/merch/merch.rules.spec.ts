import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcCost, generateTna, recompute, defaultSteps, stage, finishFabricKg, greyFabricKg, checklistRequiredQty, checklistInHouse, labDipSummary, nextLotNo, ordinal, quotaCheck, sampleSheetNo, canAct } from './merch.rules';

test('cost sheet matches the company sheet 13251813 NMFLANA LS DRESS (FOB 3.43)', () => {
  const r = calcCost({ rate: 115, fabs: [
    { d: '95% Org.Ctn 5% Elas 220 GSM 3X2 Flat Rib Y/D', cons: 2.6, cw: 12, yarns: [{ c: '34/S', p: 3.6, pc: 95 }, { c: '20/D', p: 9, pc: 5 }], knit: 60, aop: 2.5, dye: 90, wp: 12 },
    { d: '2x2 Rib', cons: 0, cw: 12, yarns: [{ c: '34/S', p: 3.6, pc: 95 }, { c: '40/D', p: 8, pc: 5 }], knit: 30, yd: 170, wp: 12 },
  ], cm: 8.5, sp: 0.5, cl: 0.5, ht: 0.52, pt: 0.25, bp: 0.2, st: 0.3, ct: 0.3, ex: 10, sms: 0.5, com: 3, profit: 2, buy: 5, chem: 0.05 });
  assert.equal(r.fabs[0].perKg.toFixed(2), '8.60');
  assert.equal(r.fabs[0].perDz.toFixed(2), '25.03');
  assert.equal(r.fabs[1].perKg.toFixed(2), '6.23');
  assert.equal(r.acc.toFixed(4), '2.2770');
  assert.equal(r.dozen.toFixed(4), '36.8064');
  assert.equal(r.prod.toFixed(4), '3.1592');
  assert.equal(r.fob.toFixed(2), '3.43');
});

test('workflow opens steps in the agreed order', () => {
  const w = defaultSteps();
  assert.deepEqual(recompute(w), []);
  assert.equal(stage(w), 'CAD / IE work');
  w.CAD = 'DONE'; w.IE = 'DONE'; assert.deepEqual(recompute(w), ['THREAD']);
  w.THREAD = 'DONE'; assert.deepEqual(recompute(w), ['FABRIC_SHEET', 'TNA']);
  w.FABRIC_SHEET = 'DONE'; assert.deepEqual(recompute(w), []); // file handover waits for TNA too
  w.TNA = 'DONE'; assert.deepEqual(recompute(w), ['FILE_HANDOVER']);
  w.FILE_HANDOVER = 'DONE'; assert.deepEqual(recompute(w), ['PRE_PRODUCTION']);
  w.PRE_PRODUCTION = 'DONE'; assert.deepEqual(recompute(w), ['SIZE_SET']);
  w.SIZE_SET = 'DONE'; assert.deepEqual(recompute(w), ['PP_MEETING']);
  w.PP_MEETING = 'DONE'; assert.equal(stage(w), 'In production');
});

test('fabric quantities', () => {
  assert.equal(finishFabricKg([{ part: 'Body', consKgDz: 3.9 }, { part: 'Rib', consKgDz: 0.31 }], 2400), 842);
  assert.equal(greyFabricKg(1000, 12), 1136.4);
  assert.throws(() => greyFabricKg(1000, 100));
});

test('TNA follows the planning bands and skips print/emb when not needed', () => {
  const t = generateTna({ poReceived: '2026-10-01', finishKg: 842, qty: 2400, printEmb: 'None' });
  assert.equal(t.knit.s, '2026-10-01'); assert.equal(t.knit.d, 4);
  assert.equal(t.dye.d, 10); assert.equal(t.print, undefined); assert.equal(t.emb, undefined);
  assert.ok(t.exf.s > t.final.s);
  const p = generateTna({ poReceived: '2026-10-01', finishKg: 6000, qty: 20000, printEmb: 'Print + Embroidery' });
  assert.equal(p.knit.d, 13); assert.equal(p.print.d, 5); assert.equal(p.emb.d, 6);
  assert.throws(() => generateTna({ poReceived: '', finishKg: 1, qty: 1 }));
});

test('trims checklist quantities and status', () => {
  assert.equal(checklistRequiredQty(3600, 1, 3), 3708);
  assert.equal(checklistRequiredQty(3600, 0.0004, 5, 'cone'), 1.51);
  assert.throws(() => checklistRequiredQty(-1, 1, 0));
  const s = checklistInHouse([{ orderStatus: 'ORDERED', requiredQty: 100, receivedQty: 100 }, { orderStatus: 'ORDERED', requiredQty: 50, receivedQty: 10 }]);
  assert.equal(s.ordered, 'ORDERED'); assert.equal(s.inHouse, 'PARTLY_RECEIVED');
  assert.equal(checklistInHouse([{ orderStatus: 'NOT_ORDERED', requiredQty: 10, receivedQty: 0 }]).ordered, 'NOT_STARTED');
});

test('lab dip summary, lots, quota, sheet no, roles', () => {
  assert.equal(labDipSummary([{ status: 'APPROVED' }, { status: 'SUBMITTED' }]), '1/2_APPROVED');
  assert.equal(labDipSummary([{ status: 'APPROVED' }]), 'ALL_APPROVED');
  assert.equal(ordinal(2), '2nd'); assert.equal(ordinal(11), '11th'); assert.equal(ordinal(22), '22nd');
  assert.equal(nextLotNo(['ONL 48216', 'ONL 48216 2nd', 'ONL 49000'], '48216'), '3rd');
  assert.equal(quotaCheck(9, 10, 2).over, true);
  assert.equal(sampleSheetNo(7, new Date('2026-10-28T00:00:00Z')), 'SMP-2610-0007');
  assert.equal(canAct(['ADMIN'], ['CAD']), true); assert.equal(canAct(['IE'], ['CAD']), false);
});
