import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyerCode, jobCode, parseCount, countStatus, idleClass, requisitionState, receiveCheck, issueCheck, suggestedKnitKg, finalKgCheck, productionCheck, schedule, moveInQueue, dayLoad, sameDia, inspectionCheck, qualitySummary } from './yk.rules';

test('codes', () => {
  assert.equal(buyerCode('BS ONS'), 'BS-ONS'); assert.equal(buyerCode('BS- NMT'), 'BS-NMT'); assert.equal(buyerCode('BS ONLY'), 'BS-ONL'); assert.equal(buyerCode('OVS SPA'), 'OVS'); assert.equal(buyerCode('TM LEWIN'), 'TML');
  assert.equal(jobCode('BS ONS', '48283 5TH'), 'BS-ONS 48283 5TH'); assert.equal(jobCode('UTG', 'UT 48906'), 'UT 48906');
  assert.deepEqual(parseCount('34/1 BCI C'), { cnt: '34/1', composition: 'BCI cotton', shade: 'Colour' });
  assert.equal(parseCount('20D').composition, 'Spandex');
});

test('MOQ, pipeline low and urgent need', () => {
  const a = countStatus({ phys: 4000, moq: 10000, pipe: 3000, overduePipe: 0, need: 0 });
  assert.equal(a.status, 'PIPELINE_LOW'); assert.equal(a.urgent, 3000);
  const b = countStatus({ phys: 4000, moq: 10000, pipe: 8000, overduePipe: 5000, need: 2000 });
  assert.equal(b.status, 'BELOW_MOQ_COVERED'); assert.equal(b.urgent, 5000); // overdue pipeline does not count as cover
  assert.equal(countStatus({ phys: 12000, moq: 10000, pipe: 0, overduePipe: 0, need: 0 }).status, 'OK');
  assert.equal(idleClass(200), 'DEAD'); assert.equal(idleClass(120), 'SLOW'); assert.equal(idleClass(null), 'NO_DATE');
});

test('requisition state follows purchase lines', () => {
  assert.equal(requisitionState('WITH_PURCHASE', []), 'WITH_PURCHASE');
  assert.equal(requisitionState('WITH_PURCHASE', [{ orderedKg: 1000, receivedKg: 0 }]), 'ORDERED');
  assert.equal(requisitionState('WITH_PURCHASE', [{ orderedKg: 1000, receivedKg: 400 }]), 'PARTLY_RECEIVED');
  assert.equal(requisitionState('WITH_PURCHASE', [{ orderedKg: 1000, receivedKg: 1000 }]), 'RECEIVED');
  assert.equal(requisitionState('PENDING_STORE', [{ orderedKg: 1, receivedKg: 1 }]), 'PENDING_STORE');
});

test('receive and issue checks', () => {
  assert.equal(receiveCheck(1000, 0, 400), null);
  assert.equal(receiveCheck(1000, 400, 600), null);
  assert.match(receiveCheck(1000, 400, 700)!, /5% over/);
  assert.match(receiveCheck(1000, 1000, 1)!, /fully received/);
  assert.match(issueCheck(300, 'PASSED', 500)!, /Only 300 kg/);
  assert.match(issueCheck(3000, 'HOLD', 500)!, /QC HOLD/);
  assert.equal(issueCheck(3000, 'PASSED', 500), null);
});

test('knitting quantity and production checks', () => {
  assert.equal(suggestedKnitKg(1000, 12), 1137);
  assert.match(finalKgCheck(900, 1000)!, /less than finish/); assert.match(finalKgCheck(1600, 1000)!, /50%/); assert.equal(finalKgCheck(1120, 1000), null);
  assert.match(productionCheck(1000, 950, 900, 200, 0)!, /10% over/);
  assert.match(productionCheck(1000, 500, 500, 0, 10)!, /Only 0 kg/);
  assert.equal(productionCheck(1000, 500, 300, 100, 200), null);
});

test('machine queue schedule, move and day load', () => {
  const machines = [{ id: 'M-01', capKgDay: 400 }, { id: 'M-02', capKgDay: 400 }];
  const q = { 'M-01': [{ id: 'a', balKg: 600 }, { id: 'b', balKg: 400 }], 'M-02': [{ id: 'c', balKg: 200, notBefore: '2026-10-02' }] };
  const s = schedule(machines, q, '2026-09-29');
  assert.equal(s.a.position, 'RUN'); assert.equal(s.b.position, '2'); assert.equal(s.a.e, 1.5); assert.equal(s.b.s, 1.5); assert.equal(s.b.finish, '2026-10-01'); // starts noon 30 Sep, runs one full day
  assert.equal(s.c.start, '2026-10-02');
  const d0 = dayLoad(s, { 'M-01': 400, 'M-02': 400 }, '2026-09-30', '2026-09-29');
  assert.deepEqual(d0.map((x) => [x.id, x.kg]), [['a', 200], ['b', 200]]);
  const moved = moveInQueue(q, s, 'b', 'M-02', { date: '2026-09-29', today: '2026-09-29' });
  assert.deepEqual(moved['M-01'].map((x) => x.id), ['a']); assert.deepEqual(moved['M-02'].map((x) => x.id), ['b', 'c']);
  const end = moveInQueue(q, s, 'a', 'M-02', { date: '2026-10-10', today: '2026-09-29' });
  assert.equal(end['M-02'].find((x) => x.id === 'a')!.notBefore, '2026-10-10');
  assert.throws(() => moveInQueue(q, s, 'zz', 'M-01', { today: '2026-09-29' }));
  assert.equal(sameDia('36X24', '36"24G'), true); assert.equal(sameDia('36X24', '34"24G'), false);
});

test('quality checks and summary', () => {
  assert.match(inspectionCheck(100, 120, 0, 'Hole', 'HOLD')!, /cannot be more/);
  assert.match(inspectionCheck(100, 0, 0, 'Hole', 'HOLD')!, /defect kg/);
  assert.equal(inspectionCheck(100, 5, 0, 'Hole', 'PASS'), null);
  const q = qualitySummary([{ inspectedKg: 1000, defectKg: 10, rejectedKg: 10, decision: 'REJECT', defect: 'Hole' }, { inspectedKg: 500, defectKg: 0, rejectedKg: 0, decision: 'HOLD', defect: 'No defect' }]);
  assert.equal(q.inspectedKg, 1500); assert.equal(q.holdKg, 500); assert.equal(q.rejectionPct, 0.67); assert.deepEqual(q.topDefect, { defect: 'Hole', kg: 10 });
});
