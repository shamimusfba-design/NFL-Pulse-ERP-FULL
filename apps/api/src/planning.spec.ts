import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  firstCcd,
  daysInSlot,
  buildTaRows,
  scheduleFromCcd,
  computeCriticalPathAndRisk,
  buildSectionTasksForApprovedTa,
  validateGanttFloorCapacity,
} from './planning.rules.ts';

test('firstCcd picks the earliest CCD across multiple POs regardless of array order', () => {
  const style = {
    purchaseOrders: [
      { poNo: 'PO-LATE', ccd: '2026-06-25' },
      { poNo: 'PO-EARLIEST', ccd: '2026-05-12' },
      { poNo: 'PO-MID', shipmentDate: '2026-06-01' },
    ],
  };
  const earliest = firstCcd(style);
  assert.ok(earliest);
  assert.equal(earliest.toISOString().slice(0, 10), '2026-05-12');
});

test('daysInSlot treats Sunday as weekly holiday and deducts configured Eid/holiday closures', () => {
  // March 2026 Slot 1 (1–10 March 2026): Sundays are March 1 and March 8 (2 Sundays, 8 Mon-Sat days)
  // For Knitting (sundayFactor = 0.5): 8 * 1 + 2 * 0.5 = 9.0 effective days
  assert.equal(daysInSlot(2026, 2, 1, 0.5, []), 9);
  // For Sewing/Cutting (sundayFactor = 0): 8 * 1 + 2 * 0 = 8.0 effective days
  assert.equal(daysInSlot(2026, 2, 1, 0, []), 8);

  // Add 2 Eid/factory closure holidays on non-Sunday dates (2026-03-03 and 2026-03-04)
  const holidays = [
    { date: '2026-03-03', name: 'Factory Holiday 1', factor: 0 },
    { date: '2026-03-04', name: 'Factory Holiday 2', factor: 0 },
  ];
  assert.equal(daysInSlot(2026, 2, 1, 0, holidays), 6);
  assert.equal(daysInSlot(2026, 2, 1, 0.5, holidays), 7);
});

test('buildTaRows and scheduleFromCcd include Test Cutting / Size Set before bulk cutting', () => {
  const style = {
    id: 'style-1',
    styleNo: 'ST-100',
    quantity: 12000,
    purchaseOrders: [{ ccd: '2026-08-20' }],
    sourceMetadata: {
      production: { fabricRequired: 2400 },
      processRouting: ['KNITTING', 'DYEING', 'PRINTING', 'SEWING'],
    },
  };
  const { rows } = buildTaRows(style);
  const keys = rows.map((r) => r.key);
  const ppIdx = keys.indexOf('pp');
  const testCutIdx = keys.indexOf('testCutting');
  const cutIdx = keys.indexOf('cutting');

  assert.ok(testCutIdx > -1, 'testCutting row must exist in T&A');
  assert.ok(ppIdx < testCutIdx && testCutIdx < cutIdx, 'testCutting must be sequenced between PP Meeting and Bulk Cutting');

  const plan = scheduleFromCcd(style, new Date('2026-06-01T00:00:00Z'));
  assert.ok(plan.testCuttingDate, 'scheduleFromCcd must populate testCuttingDate');
  assert.ok(plan.cuttingStart >= plan.testCuttingDate, 'Bulk cutting must start on or after Test Cutting / Size Set');
});

test('computeCriticalPathAndRisk detects delayed/failed activities and projects shipment slip against CCD', () => {
  const style = {
    id: 'style-risk',
    styleNo: 'ST-RISK',
    quantity: 10000,
    purchaseOrders: [{ ccd: '2026-05-20' }],
    sourceMetadata: {
      planning: {
        knittingStart: '2026-04-15',
        knittingEnd: '2026-04-20',
        dyeingFinishingStart: '2026-04-21',
        dyeingFinishingEnd: '2026-05-01',
        trimsInhouseDate: '2026-05-02',
        fileHandoverDate: '2026-05-03',
        ppMeetingDate: '2026-05-04',
        testCuttingDate: '2026-05-05',
        cuttingStart: '2026-05-06',
        cuttingEnd: '2026-05-08',
        sewingStartDate: '2026-05-09',
        sewingEnd: '2026-05-15',
        finishingStart: '2026-05-16',
        finishingEnd: '2026-05-17',
        preFinalInspection: '2026-05-18',
        finalInspection: '2026-05-18',
        exFactoryDate: '2026-05-19',
        cargoClosingDate: '2026-05-20',
        actualDates: {
          knittingEnd: '2026-04-25', // 5 days late
        },
        activityTracking: {
          knitting: {
            actualFinish: '2026-04-25',
            status: 'DELAYED',
            delayReason: 'Yarn lot shade variation',
          },
        },
      },
    },
  };

  const summary = computeCriticalPathAndRisk(style, new Date('2026-04-26T00:00:00Z'));
  assert.equal(summary.maxDelayDays, 5);
  assert.equal(summary.ccdDate, '2026-05-20');
  assert.equal(summary.projectedShipmentDate, '2026-05-25');
  assert.equal(summary.ccdSlipDays, 5);
  assert.equal(summary.riskLevel, 'CRITICAL');
  assert.ok(summary.delayedActivities.some((a) => a.key === 'knitting' && a.delayReason === 'Yarn lot shade variation'));
});

test('buildSectionTasksForApprovedTa creates downstream tasks for Knitting, Dyeing, Store, CAD, Cutting, Sewing & Finishing', () => {
  const plan = {
    knittingEnd: '2026-05-01',
    dyeingFinishingEnd: '2026-05-10',
    trimsInhouseDate: '2026-05-11',
    fileHandoverDate: '2026-05-12',
    testCuttingDate: '2026-05-13',
    cuttingEnd: '2026-05-15',
    printingEnd: '2026-05-17',
    sewingStartDate: '2026-05-18',
    finalInspection: '2026-05-25',
  };
  const tasks = buildSectionTasksForApprovedTa({ id: 'ord-1', jobNo: '48085' }, { id: 'sty-1', styleNo: '13251506' }, plan);
  const modules = tasks.map((t) => t.module);
  assert.ok(modules.includes('KNITTING'));
  assert.ok(modules.includes('DYEING'));
  assert.ok(modules.includes('STORE'));
  assert.ok(modules.includes('MERCHANDISING'));
  assert.ok(modules.includes('CUTTING'));
  assert.ok(modules.includes('PRINTING'));
  assert.ok(modules.includes('SEWING'));
  assert.ok(modules.includes('FINISHING'));
  assert.equal(tasks.length, 9);
});

test('validateGanttFloorCapacity flags 0-machine lines and 0-capacity floors instead of silently skipping them', () => {
  const floorCapacity = new Map<string, number>([
    ['NFL|FL-2', 50],
    ['NFL|FL-ZERO', 0],
  ]);

  const styles = [
    {
      id: 's-zero-floor',
      styleNo: 'ST-ZERO-FLOOR',
      sourceMetadata: {
        ganttPlan: {
          status: 'REVIEWED',
          factoryCode: 'NFL',
          floorCode: 'FL-ZERO',
          lineCode: 'L1',
          machineQty: 30,
          startDate: '2026-05-01',
          finishDate: '2026-05-05',
        },
      },
    },
    {
      id: 's-zero-machine',
      styleNo: 'ST-ZERO-MC',
      sourceMetadata: {
        ganttPlan: {
          status: 'REVIEWED',
          factoryCode: 'NFL',
          floorCode: 'FL-2',
          lineCode: 'L2',
          machineQty: 0,
          startDate: '2026-05-01',
          finishDate: '2026-05-05',
        },
      },
    },
    {
      id: 's-overload',
      styleNo: 'ST-OVERLOAD',
      sourceMetadata: {
        ganttPlan: {
          status: 'REVIEWED',
          factoryCode: 'NFL',
          floorCode: 'FL-2',
          lineCode: 'L3',
          machineQty: 65,
          startDate: '2026-05-01',
          finishDate: '2026-05-02',
        },
      },
    },
  ];

  const targetIds = new Set(['s-zero-floor', 's-zero-machine', 's-overload']);
  const res = validateGanttFloorCapacity(styles, targetIds, floorCapacity);

  assert.equal(res.ok, false);
  assert.equal(res.unconfiguredIssues.length, 2);
  assert.ok(res.unconfiguredIssues[0].includes('FL-ZERO'));
  assert.ok(res.unconfiguredIssues[1].includes('0 machine count'));
  assert.ok(res.overloads.length > 0);
  assert.ok(res.overloads[0].includes('65 planned / 50 max'));
});
