import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fabConstruction, fabType, matchScore, suggest } from './reuse.rules';

test('fabric type and construction come from the factory fabric names', () => {
  assert.equal(fabType('L/S/J'), 'Single Jersey'); assert.equal(fabType('Heavy/J'), 'Single Jersey'); assert.equal(fabType('Lenzing Modal F.F 2x1 L Rib'), 'Rib');
  assert.equal(fabType('L-Fleece-B'), 'Fleece'); assert.equal(fabType('F.Terry'), 'Terry');
  assert.equal(fabConstruction('2x2 L/Rib'), '2x2 Rib'); assert.equal(fabConstruction('1x1 Rib'), '1x1 Rib'); assert.equal(fabConstruction('F.Terry'), 'Loop back (French terry)');
});

test('finished fabric must match fabric, construction, GSM ±5%, width and colour', () => {
  const have = { fabric: 'S/J', composition: '100% Cotton', gsm: 150, dia: '74"', colour: 'Black C-N10' };
  const m = matchScore({ fabric: 'S/J', composition: '100% Cotton', gsm: 150, dia: '72"', colour: 'Black' }, have, true);
  assert.equal(m.ok, true); if (m.ok) assert.ok(m.warn.some((w) => /shade/.test(w)));
  assert.equal(matchScore({ fabric: 'S/J', gsm: 160, colour: 'Black' }, have, true).ok, false, 'GSM 160 vs 150 is more than 5%');
  assert.equal(matchScore({ fabric: '1x1 Rib', gsm: 150, colour: 'Black' }, have, true).ok, false, 'different fabric');
  assert.equal(matchScore({ fabric: 'S/J', gsm: 150, colour: 'Navy' }, have, true).ok, false, 'different colour');
  assert.equal(matchScore({ fabric: 'S/J', gsm: 150, colour: 'Black', composition: '95% Cotton 5% Elastane' }, have, true).ok, false, 'different composition');
  assert.equal(matchScore({ fabric: '2x2 Rib', gsm: 250 }, { fabric: '1x1 Rib', gsm: 250 }, false).ok, false, 'rib construction must match');
});

test('greige ignores colour unless yarn-dyed; AOP never matches', () => {
  assert.equal(matchScore({ fabric: 'S/J', gsm: 160, dia: '64"', colour: 'Pageant Blue' }, { fabric: 'S/J', gsm: 160, dia: '64"', colour: 'White' }, false).ok, true);
  assert.equal(matchScore({ fabric: 'Y/D S/J', gsm: 160, colour: 'Navy stripe' }, { fabric: 'Y/D S/J', gsm: 160, colour: 'Red stripe' }, false).ok, false);
  assert.equal(matchScore({ fabric: 'F.Terry', gsm: 280, colour: 'Navy Blazer-Aop' }, { fabric: 'F.Terry', gsm: 280, colour: 'Navy Blazer' }, true).ok, false);
});

test('suggest ranks finished over greige and skips reserved stock', () => {
  const stock = [
    { id: 'g1', store: 'GREIGE', fabric: 'S/J', gsm: 150, dia: '72"', colour: 'Any', kg: 400, reservedKg: 0 },
    { id: 'f1', store: 'FINISHED', fabric: 'S/J', gsm: 150, dia: '72"', colour: 'Black', kg: 300, reservedKg: 0 },
    { id: 'f2', store: 'FINISHED', fabric: 'S/J', gsm: 150, dia: '72"', colour: 'Black', kg: 100, reservedKg: 100 },
  ];
  const s = suggest({ fabric: 'S/J', gsm: 150, dia: '72"', colour: 'Black' }, stock);
  assert.deepEqual(s.map((x) => x.id), ['f1', 'g1']);
});
