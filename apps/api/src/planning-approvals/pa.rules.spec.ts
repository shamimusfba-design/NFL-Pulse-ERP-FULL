import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageDays, checkRelease, colourQty, nextAction, releaseDraft } from './pa.rules';

test('colour qty sums sizes and keeps order', () => {
  assert.deepEqual(colourQty([{ color: 'Black', qty: 100 }, { color: 'Navy', qty: 50 }, { color: 'Black', qty: 20 }]), [{ colour: 'Black', qty: 120 }, { colour: 'Navy', qty: 50 }]);
});
test('release draft = colour qty / 12 x consumption, per part', () => {
  const d = releaseDraft([{ colour: 'Black', qty: 1200 }], [{ part: 'Body', fabric: 'S/J', gsm: 160, consKgDz: 2.4 }, { part: 'Rib', fabric: '1x1 Rib', consKgDz: 0.3 }], { Black: '19-4008' });
  assert.equal(d.length, 2); assert.equal(d[0].finishKg, 240); assert.equal(d[1].finishKg, 30); assert.equal(d[0].colourCode, '19-4008'); assert.equal(d[0].gsm, '160');
});
test('release check: >5% over approved sheet is refused, small difference warns', () => {
  const L = (kg: number) => [{ colour: 'Black', fabric: 'S/J', finishKg: kg }];
  assert.equal(checkRelease(L(1060), 1000).ok, false);
  const w = checkRelease(L(1030), 1000); assert.equal(w.ok, true); assert.equal(w.warnings.length, 1);
  assert.equal(checkRelease(L(1000), 1000).warnings.length, 0);
  assert.equal(checkRelease([{ colour: '', fabric: 'S/J', finishKg: 0 }], 0).errors.length, 2);
});
test('next action follows the signed-copy gate', () => {
  const base = { fabric: 'SENT', tna: 'WAIT', fabricSigned: false, tnaSigned: false, tnaGenerated: false, descMissing: true, released: false };
  assert.equal(nextAction(base), 'Receive signed fabric order sheet');
  assert.equal(nextAction({ ...base, fabricSigned: true }), 'Approve fabric order sheet');
  assert.equal(nextAction({ ...base, fabric: 'DONE', tna: 'SENT' }), 'Generate TNA');
  assert.equal(nextAction({ ...base, fabric: 'DONE', tna: 'SENT', tnaGenerated: true }), 'Receive signed TNA');
  assert.equal(nextAction({ ...base, fabric: 'DONE', tna: 'DONE' }), 'Release to knitting');
  assert.equal(nextAction({ ...base, fabric: 'DONE', tna: 'DONE', released: true }), 'Write item and print/emb description');
});
test('age in whole days', () => { assert.equal(ageDays('2026-10-25T00:00:00Z', new Date('2026-10-28T12:00:00Z')), 3); assert.equal(ageDays(null), 0); });
