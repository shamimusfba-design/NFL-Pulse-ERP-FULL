import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysInSlot, firstCcd, holidaySet, scheduleFromCcd } from './planning';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (n: number) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };
const style = (ccds: string[], qty = 3000) => ({ quantity: qty, purchaseOrders: ccds.map((ccd) => ({ ccd })), sourceMetadata: {} });

test('CCD = earliest across all POs, not the first PO', () => {
  const s = style(['2027-05-30', '2027-04-10', '2027-06-01']);
  assert.equal(iso(firstCcd(s)), '2027-04-10');
});

test('T&A keeps CCD fixed and dates run in process order', () => {
  const ccd = iso(plus(150));
  const r = scheduleFromCcd(style([ccd]));
  assert.equal(r.cargoClosingDate.slice(0, 10), ccd);
  assert.equal(r.taGeneration.scheduleFeasibility, 'FEASIBLE');
  const order = ['knittingStart', 'knittingEnd', 'dyeingFinishingEnd', 'cuttingStart', 'sewingStartDate', 'sewingEnd', 'finishingEnd', 'exFactoryDate', 'cargoClosingDate'];
  const vals = order.map((k) => r[k]).filter(Boolean);
  assert.ok(vals.length >= 6, 'core dates generated');
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i - 1] <= vals[i], `${order[i - 1]} <= next`);
});

test('tight CCD never puts an editable date in the past and is flagged for review', () => {
  const r = scheduleFromCcd(style([iso(plus(10))], 20000));
  const today = iso(plus(0));
  for (const [k, v] of Object.entries(r)) if (k !== 'taGeneration' && typeof v === 'string') assert.ok(v.slice(0, 10) >= today, `${k} not in past`);
  assert.equal(r.taGeneration.scheduleFeasibility, 'PLANNING_REVIEW_REQUIRED');
  assert.ok(r.taGeneration.shortageDays > 0);
});

test('slot capacity days: Sunday factor and holidays', () => {
  // Nov 2026, slot 1 = 1..10 Nov; 1 Nov and 8 Nov are Sundays
  assert.equal(daysInSlot(2026, 10, 1, 1), 10);
  assert.equal(daysInSlot(2026, 10, 1, 0), 8);
  assert.equal(daysInSlot(2026, 10, 1, 0.5), 9);
  assert.equal(daysInSlot(2026, 10, 1, 0, holidaySet({ holidays: ['2026-11-03', 'bad', '2026-11-08'] })), 7);
});
