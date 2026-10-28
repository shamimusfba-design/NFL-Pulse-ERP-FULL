import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { canAct, defaultSteps, recompute, Step, StepMap, STEPS, STEP_TASK_ROLE, STEP_TASK_TITLE } from './merch.rules';

export type Actor = { id: string; name?: string; roles: string[] };
type Tx = Prisma.TransactionClient;

export const toJson = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;
export const actorOf = (req: any): Actor => ({ id: req.user.id, name: req.user.name, roles: req.user.roles || [] });

export function requireRole(a: Actor, allowed: string[], what: string) {
  if (!canAct(a.roles, allowed)) throw new ForbiddenException(`${what} is not allowed for this user`);
}

/** Merchandiser may edit own jobs; team head and admin may edit all. */
export function requireJobOwner(a: Actor, order: { merchandiserId: string | null; createdById: string }) {
  if (a.roles.includes('ADMIN') || a.roles.includes('MERCH_HEAD')) return;
  const own = order.merchandiserId ? order.merchandiserId === a.id : order.createdById === a.id;
  if (!own) throw new ForbiddenException('Only the job merchandiser, merchandising head or admin can change this job');
}

export async function audit(tx: Tx, a: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await tx.auditLog.create({ data: { userId: a.id, action, entityType, entityId, before: toJson(before), after: toJson(after) } });
}

export const STYLE_INCLUDE = {
  order: { include: { buyer: true } },
  purchaseOrders: { include: { breakdowns: true }, orderBy: { ccd: 'asc' as const } },
  breakdowns: true,
  merchSteps: true,
  labDips: true,
  trimsChecklist: { include: { lines: { orderBy: { sortNo: 'asc' as const } } } },
} satisfies Prisma.StyleInclude;

export async function loadStyle(tx: { style: Prisma.TransactionClient['style'] }, styleId: string) {
  const style = await tx.style.findUnique({ where: { id: styleId }, include: STYLE_INCLUDE });
  if (!style) throw new NotFoundException('Job / style not found');
  return style;
}

export function stepMapOf(rows: Array<{ step: string; status: string }>): StepMap {
  const map = defaultSteps();
  for (const r of rows) if ((STEPS as readonly string[]).includes(r.step)) map[r.step as Step] = r.status as any;
  return map;
}
export function stepDataOf(rows: Array<{ step: string; data: any }>, step: Step) {
  return (rows.find((r) => r.step === step)?.data as any) || {};
}

const taskTitle = (step: Step, jobNo: string, styleNo: string) => `${STEP_TASK_TITLE[step]}: ${jobNo} / ${styleNo}`;

/**
 * Saves one step's status (and data), opens the next steps by the workflow rules,
 * creates tasks for opened steps and completes the finished step's task. All inside the caller's transaction.
 */
export async function changeStep(tx: Tx, a: Actor, style: { id: string; styleNo: string; orderId: string; order: { jobNo: string } }, step: Step, status: string, data?: unknown) {
  const rows = await tx.merchStep.findMany({ where: { styleId: style.id } });
  const before = stepMapOf(rows);
  const map = { ...before, [step]: status } as StepMap;
  const prevData = stepDataOf(rows, step);
  const nextData = data === undefined ? prevData : { ...prevData, ...(data as object) };
  await tx.merchStep.upsert({
    where: { styleId_step: { styleId: style.id, step } },
    update: { status, data: toJson(nextData), doneById: status === 'DONE' ? a.id : undefined, doneAt: status === 'DONE' ? new Date() : undefined },
    create: { styleId: style.id, step, status, data: toJson(nextData), doneById: status === 'DONE' ? a.id : null, doneAt: status === 'DONE' ? new Date() : null },
  });
  const opened = recompute(map);
  for (const s of opened) {
    await tx.merchStep.upsert({ where: { styleId_step: { styleId: style.id, step: s } }, update: { status: 'READY' }, create: { styleId: style.id, step: s, status: 'READY' } });
    const role = STEP_TASK_ROLE[s];
    if (role) await tx.task.create({ data: { title: taskTitle(s, style.order.jobNo, style.styleNo), module: 'MERCH', entityType: 'STYLE', entityId: style.id, orderId: style.orderId, ownerRoleCode: role } });
  }
  if (status === 'DONE') {
    await tx.task.updateMany({ where: { module: 'MERCH', entityId: style.id, title: { startsWith: `${STEP_TASK_TITLE[step]}:` }, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
  }
  await audit(tx, a, `MERCH_STEP_${step}_${status}`, 'STYLE', style.id, { status: before[step] }, { status, data: nextData, opened });
  return { steps: map, opened };
}

/** Creates the first CAD / IE tasks when a job is opened in merchandising for the first time. */
export async function ensureWorkflow(tx: Tx, a: Actor, style: { id: string; styleNo: string; orderId: string; order: { jobNo: string }; merchSteps: Array<{ step: string }> }) {
  if (style.merchSteps.length) return false;
  const map = defaultSteps();
  for (const s of STEPS) await tx.merchStep.create({ data: { styleId: style.id, step: s, status: map[s] } });
  for (const s of ['CAD', 'IE'] as Step[]) {
    const exists = await tx.task.findFirst({ where: { module: 'MERCH', entityId: style.id, title: { startsWith: `${STEP_TASK_TITLE[s]}:` } } });
    if (!exists) await tx.task.create({ data: { title: taskTitle(s, style.order.jobNo, style.styleNo), module: 'MERCH', entityType: 'STYLE', entityId: style.id, orderId: style.orderId, ownerRoleCode: STEP_TASK_ROLE[s]! } });
  }
  await audit(tx, a, 'MERCH_WORKFLOW_OPENED', 'STYLE', style.id, null, map);
  return true;
}
