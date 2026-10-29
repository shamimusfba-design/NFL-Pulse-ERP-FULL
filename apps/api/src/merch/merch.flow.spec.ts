/**
 * Runs the bulk merchandising workflow through the real controller code with an in-memory
 * stand-in for Prisma (only the calls this controller uses). It checks business behaviour,
 * not SQL. A real database test is still needed.
 */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BulkMerchController } from './bulk-merch.controller';
import { PlanningApprovalsController } from '../planning-approvals/planning-approvals.controller';

function fakeDb() {
  const style: any = {
    id: 'S1', orderId: 'O1', styleNo: '13281190', quantity: 2400, sourceMetadata: { pricePerItem: 2.4 }, fob: null, printEmbType: 'Print', printEmbDesc: null, planningItemDesc: null, imageUrl: null, packingListStatus: 'NOT_STARTED',
    order: { id: 'O1', jobNo: 'NMT 48905', merchandiserId: 'merch1', createdById: 'merch1', confirmedAt: new Date('2026-10-01T00:00:00Z'), buyer: { name: 'NAME IT' } },
    purchaseOrders: [{ ccd: new Date('2026-12-15T00:00:00Z'), breakdowns: [] }], breakdowns: [{ color: 'Black' }, { color: 'Cloud Dancer' }],
    merchSteps: [] as any[], labDips: [] as any[], trimsChecklist: null as any,
  };
  const tasks: any[] = [], audits: any[] = [], knitJobs: any[] = [];
  const db: any = {
    style: {
      findUnique: async () => ({ ...style, merchSteps: style.merchSteps.map((x: any) => ({ ...x })) }),
      update: async ({ data }: any) => Object.assign(style, data),
    },
    merchStep: {
      findMany: async () => style.merchSteps.map((x: any) => ({ ...x })),
      create: async ({ data }: any) => { style.merchSteps.push({ ...data }); return data; },
      upsert: async ({ where, update, create }: any) => {
        const k = where.styleId_step; const r = style.merchSteps.find((x: any) => x.step === k.step);
        if (r) Object.assign(r, Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined))); else style.merchSteps.push({ ...create });
      },
      update: async ({ where, data }: any) => { const r = style.merchSteps.find((x: any) => x.step === where.styleId_step.step); Object.assign(r, data); return r; },
    },
    reuseStock: { findMany: async () => [] }, // no reuse fabric in this flow
    task: {
      create: async ({ data }: any) => { tasks.push({ ...data, status: 'PENDING' }); },
      findFirst: async ({ where }: any) => tasks.find((t) => t.title.startsWith(where.title.startsWith)) || null,
      updateMany: async ({ where, data }: any) => { let c = 0; for (const t of tasks) if (t.title.startsWith(where.title.startsWith) && where.status.in.includes(t.status)) { Object.assign(t, data); c++; } return { count: c }; },
    },
    auditLog: { create: async ({ data }: any) => { audits.push(data); }, findMany: async () => [] },
    costSheet: { findUnique: async () => null },
    knitJob: { create: async ({ data }: any) => { knitJobs.push({ ...data, id: 'KJ' + (knitJobs.length + 1) }); return knitJobs[knitJobs.length - 1]; } },
    labDip: { upsert: async ({ create, update }: any) => { const r = style.labDips.find((l: any) => l.color === create.color); if (r) Object.assign(r, update); else style.labDips.push({ ...create }); return r || create; } },
  };
  db.$transaction = async (fn: any) => fn(db);
  return { db, style, tasks, audits, knitJobs };
}
const req = (id: string, roles: string[]) => ({ user: { id, name: id, roles } });
const MERCH = req('merch1', ['MERCH_BULK']), OTHER_MERCH = req('merch2', ['MERCH_BULK']), CAD = req('cad1', ['CAD']), IE = req('ie1', ['IE']), PLAN = req('plan1', ['PLANNING']), TECH = req('tech1', ['SAMPLE']);

test('full bulk workflow: CAD → IE → thread → fabric sheet → TNA → handover → pre-production → size set → PP meeting', async () => {
  const { db, style, tasks, audits, knitJobs } = fakeDb();
  const c = new BulkMerchController(db), pa = new PlanningApprovalsController(db);
  const st = () => Object.fromEntries(style.merchSteps.map((x: any) => [x.step, x.status]));

  await assert.rejects(c.cad('S1', { parts: [{ part: 'Body', consKgDz: 3.9 }] }, IE), /not allowed/);
  await c.cad('S1', { parts: [{ part: 'Body', consKgDz: 3.9 }, { part: 'Neck rib', consKgDz: 0.31 }] }, CAD);
  assert.equal(st().CAD, 'DONE');
  assert.ok(tasks.some((t) => t.title.startsWith('IE bulletin:') && t.ownerRoleCode === 'IE'));
  await assert.rejects(c.thread('S1', { lines: [{ name: '40/2', metersPerPc: 140 }] }, IE), /opens after the IE bulletin/);
  await c.ie('S1', { smv: 6.2, operations: 14, machines: 18 }, IE);
  assert.equal(st().THREAD, 'READY');
  await c.thread('S1', { lines: [{ name: '40/2', metersPerPc: 140 }] }, IE);
  assert.equal(st().FABRIC_SHEET, 'READY'); assert.equal(st().TNA, 'READY');

  await assert.rejects(c.fabricSheet('S1', { colorCodes: { Black: 'C-N10' }, lossPct: 8 }, MERCH), /Cloud Dancer/);
  await assert.rejects(c.fabricSheet('S1', { colorCodes: { Black: 'x', 'Cloud Dancer': 'y' }, lossPct: 8 }, OTHER_MERCH), /Only the job merchandiser/);
  const fs = await c.fabricSheet('S1', { colorCodes: { Black: 'C-N10', 'Cloud Dancer': '11-4201 TCX' }, lossPct: 8 }, MERCH);
  assert.equal(st().FABRIC_SHEET, 'SENT');
  const fsData = style.merchSteps.find((x: any) => x.step === 'FABRIC_SHEET').data;
  assert.equal(fsData.finishKg, 842); assert.equal(fsData.greyKg, 915.2);
  await assert.rejects(c.approveFabric('S1', MERCH), /not allowed/);
  // Planning returns it once, merchandiser sends again
  await assert.rejects(pa.returnDoc('S1', { doc: 'FABRIC_SHEET', reason: '  ' } as any, PLAN), /reason/);
  await pa.returnDoc('S1', { doc: 'FABRIC_SHEET', reason: 'Rib colour code missing' } as any, PLAN);
  assert.equal(st().FABRIC_SHEET, 'READY');
  assert.ok(tasks.some((t) => t.title.startsWith('Returned by Planning (fabric order sheet)') && t.ownerUserId === 'merch1'));
  await c.fabricSheet('S1', { colorCodes: { Black: 'C-N10', 'Cloud Dancer': '11-4201 TCX' }, lossPct: 8 }, MERCH);
  // agreed rule: no approval click before the signed physical copy is recorded
  await assert.rejects(c.approveFabric('S1', PLAN), /signed physical fabric order sheet/);
  await assert.rejects(pa.signed('S1', { doc: 'FABRIC_SHEET' } as any, MERCH), /not allowed/);
  await pa.signed('S1', { doc: 'FABRIC_SHEET', note: 'signed by GM' } as any, PLAN);
  await c.approveFabric('S1', PLAN);
  assert.equal(st().FABRIC_SHEET, 'DONE'); assert.equal(st().FILE_HANDOVER, 'WAIT'); // still waits for the TNA

  await c.tnaSend('S1', MERCH);
  await assert.rejects(c.tnaApprove('S1', PLAN), /Generate the TNA dates first/);
  const g = await c.tnaGenerate('S1', PLAN);
  assert.equal((g.rows as any).knit.s, '2026-10-01');
  await assert.rejects(c.tnaEdit('S1', { rows: { cut: { s: '2026-11-10', e: '2026-11-01' } } }, PLAN), /end must be on or after start/);
  await assert.rejects(c.tnaApprove('S1', PLAN), /signed physical TNA/);
  await pa.signed('S1', { doc: 'TNA' } as any, PLAN);
  await assert.rejects(pa.release('S1', { lines: [{ colour: 'Black', fabric: 'S/J', finishKg: 400 }] } as any, PLAN), /Approve both/);
  await c.tnaApprove('S1', PLAN);
  assert.equal(st().TNA, 'DONE'); assert.equal(st().FILE_HANDOVER, 'READY');
  // release to knitting: refused if far above the approved 842 kg, then released once
  await assert.rejects(pa.release('S1', { lines: [{ colour: 'Black', fabric: 'S/J', finishKg: 900 }] } as any, PLAN), /more than 5% above/);
  const rel = await pa.release('S1', { lines: [{ colour: 'Black', part: 'Body', fabric: 'S/J', finishKg: 421 }, { colour: 'Cloud Dancer', part: 'Body', fabric: 'S/J', finishKg: 421 }] } as any, PLAN);
  assert.equal(knitJobs.length, 1); assert.equal(knitJobs[0].status, 'PENDING_PLANNING'); assert.equal(knitJobs[0].lines.length, 2);
  assert.ok(tasks.some((t) => t.title.startsWith('Plan knitting:') && t.ownerRoleCode === 'KNIT_PLANNER'));
  assert.equal(rel.release.totalFinishKg, 842);
  await assert.rejects(pa.release('S1', { lines: [{ colour: 'Black', fabric: 'S/J', finishKg: 10 }] } as any, PLAN), /Already released/);

  await c.handover('S1', { departments: ['Cutting', 'Sewing / IE'] }, MERCH);
  assert.equal(st().PRE_PRODUCTION, 'READY');
  const half = await c.preProduction('S1', { done: { Cutting: true } }, PLAN);
  assert.equal((half as any).complete, false); assert.equal(st().PRE_PRODUCTION, 'READY');
  await c.preProduction('S1', { done: { Cutting: true, 'Sewing / IE': true } }, PLAN);
  assert.equal(st().SIZE_SET, 'READY');
  await assert.rejects(c.ppMeeting('S1', { date: '2026-11-20' }, MERCH), /after the size set/);
  await c.sizeSet('S1', { note: 'Fit OK' }, TECH);
  await c.ppMeeting('S1', { date: '2026-11-20', time: '10:00' }, MERCH);
  assert.equal(st().PP_MEETING, 'DONE');

  const open = tasks.filter((t) => t.status === 'PENDING' && t.module === 'MERCH').map((t) => t.title); // the knitting planner's own task stays open for Knitting
  assert.deepEqual(open, [], 'every workflow task is completed at the end: ' + open.join(' | '));
  assert.ok(audits.length >= 12);
});

test('lab dip rounds and colour check', async () => {
  const { db, style } = fakeDb();
  const c = new BulkMerchController(db);
  await c.labDip('S1', 'Black', { status: 'SUBMITTED' }, MERCH);
  await c.labDip('S1', 'Black', { status: 'REJECTED' }, MERCH);
  await c.labDip('S1', 'Black', { status: 'SUBMITTED' }, MERCH);
  assert.equal(style.labDips[0].rounds, 2);
  await assert.rejects(c.labDip('S1', 'Pink', { status: 'SUBMITTED' }, MERCH), /not in this job/);
});
