import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkActual, evaluate } from './pc.rules';

const plan = {
  knittingStart: '2026-11-01', knittingEnd: '2026-11-05',
  dyeingFinishingStart: '2026-11-06', dyeingFinishingEnd: '2026-11-10',
  trimsInhouseDate: '2026-11-12', fileHandoverDate: '2026-11-14', ppMeetingDate: '2026-11-16',
  cuttingStart: '2026-11-17', cuttingEnd: '2026-11-18', sewingStartDate: '2026-11-19', sewingEnd: '2026-11-28',
  finishingStart: '2026-11-29', finishingEnd: '2026-12-01', preFinalInspection: '2026-12-02', finalInspection: '2026-12-03',
  exFactoryDate: '2026-12-04', cargoClosingDate: '2026-12-05',
};

test('on track when everything before today is done on time', () => {
  const r = evaluate({ ...plan, actuals: { knitting: { date: '2026-11-05' } } }, '2026-11-07');
  assert.equal(r.risk, 'ON_TRACK'); assert.equal(r.failedCount, 0); assert.equal(r.nextActivity?.key, 'dyeing');
});

test('overdue row absorbed by downstream slack = WATCH, not critical', () => {
  // dyeing due 11-10, today 11-12 (2 days late); slack after dyeing: 1 (to trims) + 1 + 1 + 0... = 3
  const r = evaluate({ ...plan, actuals: { knitting: { date: '2026-11-05' } } }, '2026-11-12');
  const dye = r.rows.find((x) => x.key === 'dyeing')!;
  assert.equal(dye.status, 'OVERDUE'); assert.equal(dye.delayDays, 2); assert.ok(dye.bufferAfter >= 2);
  assert.equal(r.risk, 'WATCH'); assert.equal(dye.critical, false);
});

test('delay bigger than slack is critical and pushes ex-factory past CCD', () => {
  const r = evaluate({ ...plan, actuals: { knitting: { date: '2026-11-15', reasonCode: 'YARN_LATE' } } }, '2026-11-16');
  const knit = r.rows.find((x) => x.key === 'knitting')!;
  assert.equal(knit.status, 'DONE_LATE'); assert.equal(knit.delayDays, 10); assert.ok(knit.critical);
  assert.ok(r.slipDays > 0); assert.equal(r.projectedExFactory! > plan.exFactoryDate, true);
  assert.equal(r.risk, r.ccdMissDays > 0 ? 'CCD_MISS' : 'AT_RISK');
  assert.ok(r.criticalRows.includes('Knitting'));
});

test('late actual needs a reason; future actual rejected', () => {
  assert.equal(checkActual('2026-11-05', '2026-11-09', undefined, '2026-11-10'), 'Late activity: choose a delay reason');
  assert.equal(checkActual('2026-11-05', '2026-11-09', 'YARN_LATE', '2026-11-10'), null);
  assert.equal(checkActual('2026-11-05', '2026-11-06', undefined, '2026-11-10'), null);
  assert.equal(checkActual('2026-11-05', '2026-11-20', 'OTHER', '2026-11-10'), 'Actual date cannot be in the future');
});
