import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, requireRole, toJson } from '../merch/merch.common';
import { addDays, buyerCode, dayLoad, finalKgCheck, moveInQueue, n, productionCheck, QItem, r2, R, sameDia, schedule, Slot, suggestedKnitKg, ymd } from './yk.rules';

const D = /^\d{4}-\d{2}-\d{2}$/;
const day = (s?: string | null) => (s ? new Date(s + 'T00:00:00Z') : null);
const iso = (d?: Date | null) => (d ? ymd(d) : null);
type Tx = Prisma.TransactionClient;
const DEFAULT_LOSS: Record<string, number> = { 'S/J': 8, Rib: 10, Fleece: 12, Terry: 11, Pique: 9, Other: 10 };
export const fabricTypeOf = (d: string) => { const t = String(d || '').toUpperCase(); return /RIB/.test(t) ? 'Rib' : /FLEECE/.test(t) ? 'Fleece' : /TERRY/.test(t) ? 'Terry' : /PIQUE|LACOSTE/.test(t) ? 'Pique' : /S\/J|JERSEY/.test(t) ? 'S/J' : 'Other'; };

class JobLineDto { @IsString() colour!: string; @IsOptional() @IsString() part?: string; @IsString() fabric!: string; @IsOptional() @IsString() fabricType?: string; @IsOptional() @IsString() gsm?: string; @IsOptional() @IsString() dia?: string; @IsOptional() @IsString() countType?: string; @Type(() => Number) @IsNumber() @Min(0.01) finishKg!: number; }
class JobDto { @IsString() @MaxLength(60) jobCode!: string; @IsString() buyer!: string; @IsOptional() @IsString() style?: string; @IsOptional() @IsString() merchandiser?: string; @IsOptional() @Matches(D) shipDate?: string; @IsOptional() @Matches(D) taClose?: string; @IsArray() lines!: JobLineDto[]; }
class PlanLineDto { @Type(() => Number) @IsNumber() index!: number; @IsIn(['IN_HOUSE', 'OUTSOURCE']) mode!: string; @IsOptional() @IsString() machineId?: string; @IsOptional() @Matches(D) notBefore?: string; }
class PlanDto { @IsArray() lines!: PlanLineDto[]; }
class MoveDto { @IsString() lineId!: string; @IsString() machineId!: string; @IsOptional() @Matches(D) date?: string; @IsOptional() @Type(() => Number) @IsNumber() position?: number; }
class HoldDto { @IsString() @MaxLength(60) reason!: string; }
class ReleaseDto { @IsOptional() @IsString() machineId?: string; }
class ReportDto { @IsOptional() @IsString() yarnCount?: string; @IsOptional() @IsString() brand?: string; @IsOptional() @IsString() yarnLot?: string; @IsOptional() @IsString() finishWidth?: string; @IsOptional() @IsString() stitchLength?: string; @IsOptional() @Matches(D) fosDate?: string; @IsOptional() @IsString() slot?: string; @IsOptional() @IsString() season?: string; @IsOptional() @IsString() programNo?: string; }
class QtyLineDto { @IsString() lineId!: string; @Type(() => Number) @IsNumber() finalKg!: number; }
class QtyDto { @IsArray() lines!: QtyLineDto[]; }
class OutsideDto { @IsString() @MaxLength(60) factory!: string; @IsOptional() @IsString() programNo?: string; @Matches(D) startDate!: string; @Matches(D) endDate!: string; }
class ProductionDto { @IsString() lineId!: string; @Matches(D) date!: string; @IsOptional() @IsString() machineId?: string; @IsOptional() @IsIn(['EXECUTION', 'DAY_PLAN']) source?: string; @Type(() => Number) @IsNumber() knittedKg!: number; @IsOptional() @Type(() => Number) @IsNumber() deliveredKg?: number; @IsOptional() @Type(() => Number) @IsNumber() rejectedKg?: number; }
class RemarkDto { @IsString() dept!: string; @IsIn(['QUALITY_ISSUE', 'DELAY_REASON', 'NOTE']) type!: string; @IsOptional() @IsString() reason?: string; @IsOptional() @IsString() @MaxLength(500) text?: string; }
class BookingDto { @IsString() factory!: string; @Type(() => Number) @IsNumber() @Min(0) tonsPerDay!: number; }
class MachinesDto { @IsArray() machines!: Array<{ id: string; dia: string; capKgDay: number; active?: boolean }>; }
class LossDto { @IsArray() rules!: Array<{ fabricType: string; lossPct: number }>; }
class ImportDto { @IsOptional() @IsArray() machines?: Array<{ id: string; dia: string; capKgDay: number }>; @IsArray() program!: Array<{ mc: string; buyer: string; job: string; ta?: string; count?: string; brand?: string; lot?: string; fabric: string; gsm?: string; fwid?: string; sl?: string; colour: string; order: number; prod: number; prog?: string; progRcv?: string; pos?: string; remark?: string; ship?: string }>; }

const orderOf = (l: { stage: string; finalKg: any; orderKg: any }) => (l.stage === 'ACTIVE' && l.finalKg != null ? n(l.finalKg) : n(l.orderKg));

@Controller('knitting')
@UseGuards(JwtAuthGuard)
export class KnittingController {
  constructor(private prisma: PrismaService) {}

  private async lossOf(tx: Tx | PrismaService, fabricType: string) { const r = await tx.knitLossRule.findUnique({ where: { fabricType } }); return r ? n(r.lossPct) : DEFAULT_LOSS[fabricType] ?? DEFAULT_LOSS.Other; }
  /** Builds the machine queues and the schedule from the database (holds excluded). */
  private async plan(tx: Tx | PrismaService) {
    const today = ymd(new Date());
    const [machines, items, prod] = await Promise.all([tx.knitMachine.findMany({ where: { active: true }, orderBy: { id: 'asc' } }), tx.knitQueueItem.findMany({ include: { line: true }, orderBy: [{ machineId: 'asc' }, { position: 'asc' }] }), tx.knitProduction.groupBy({ by: ['knitLineId'], _sum: { knittedKg: true } })]);
    const P = new Map(prod.map((p) => [p.knitLineId, n(p._sum.knittedKg)]));
    const queues: Record<string, QItem[]> = {};
    items.filter((i) => !i.hold).forEach((i) => { (queues[i.machineId] = queues[i.machineId] || []).push({ id: i.knitLineId, balKg: Math.max(0, orderOf(i.line) - n(i.line.openingKnitKg) - (P.get(i.knitLineId) || 0)), notBefore: iso(i.notBefore) }); });
    const sched = schedule(machines.map((m) => ({ id: m.id, capKgDay: n(m.capKgDay) })), queues, today);
    return { today, machines, items, queues, sched };
  }
  private async writeQueues(tx: Tx, queues: Record<string, QItem[]>, machineIds: string[]) {
    for (const m of machineIds) for (const [i, q] of (queues[m] || []).entries()) await tx.knitQueueItem.update({ where: { knitLineId: q.id }, data: { machineId: m, position: i, notBefore: day(q.notBefore || null), hold: false, holdReason: null } });
  }

  // ---------- masters ----------
  @Get('machines') machines() { return this.prisma.knitMachine.findMany({ orderBy: { id: 'asc' } }); }
  @Put('machines')
  async setMachines(@Body() dto: MachinesDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, [], 'Machine list');
    return this.prisma.$transaction(async (tx) => { for (const m of dto.machines) { if (!m.id || !(n(m.capKgDay) > 0)) throw new BadRequestException('Every machine needs an id and kg per day'); await tx.knitMachine.upsert({ where: { id: m.id }, update: { dia: m.dia, capKgDay: n(m.capKgDay), active: m.active ?? true }, create: { id: m.id, dia: m.dia, capKgDay: n(m.capKgDay), active: m.active ?? true } }); } await audit(tx, a, 'KNIT_MACHINES', 'KNIT_MACHINE', 'all', null, dto.machines); return tx.knitMachine.findMany({ orderBy: { id: 'asc' } }); });
  }
  @Get('loss-rules') async loss() { const r = await this.prisma.knitLossRule.findMany(); return Object.entries(DEFAULT_LOSS).map(([k, v]) => ({ fabricType: k, lossPct: n(r.find((x) => x.fabricType === k)?.lossPct ?? v) })).concat(r.filter((x) => !DEFAULT_LOSS[x.fabricType]).map((x) => ({ fabricType: x.fabricType, lossPct: n(x.lossPct) }))); }
  @Put('loss-rules')
  async setLoss(@Body() dto: LossDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.INCHARGE, 'Process loss matrix');
    return this.prisma.$transaction(async (tx) => { for (const r of dto.rules) { if (!(n(r.lossPct) >= 0 && n(r.lossPct) < 60)) throw new BadRequestException('Loss % must be between 0 and 60'); await tx.knitLossRule.upsert({ where: { fabricType: r.fabricType }, update: { lossPct: n(r.lossPct) }, create: { fabricType: r.fabricType, lossPct: n(r.lossPct) } }); } await audit(tx, a, 'KNIT_LOSS_MATRIX', 'KNIT', 'loss', null, dto.rules); return { saved: dto.rules.length }; });
  }

  // ---------- Central Planning → knitting ----------
  @Post('jobs')
  async createJob(@Body() dto: JobDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.CENTRAL, 'Approved fabric order sheet');
    if (!dto.lines?.length || dto.lines.some((l) => !l.colour || !(n(l.finishKg) > 0))) throw new BadRequestException('Every line needs a colour and finish fabric kg');
    return this.prisma.$transaction(async (tx) => { const j = await tx.knitJob.create({ data: { jobCode: dto.jobCode.trim(), buyer: dto.buyer, style: dto.style || null, merchandiser: dto.merchandiser || null, shipDate: day(dto.shipDate), taClose: day(dto.taClose), approvedAt: new Date(), lines: toJson(dto.lines.map((l) => ({ ...l, fabricType: l.fabricType || fabricTypeOf(l.fabric) }))), createdById: a.id } });
      await tx.task.create({ data: { title: `Plan knitting: ${j.jobCode}`, module: 'KNITTING', entityType: 'KNIT_JOB', entityId: j.id, ownerRoleCode: 'KNIT_PLANNER' } });
      await audit(tx, a, 'KNIT_JOB_RECEIVED', 'KNIT_JOB', j.id, null, dto); return j; });
  }
  @Get('jobs') jobs(@Query('status') status?: string) { return this.prisma.knitJob.findMany({ where: status ? { status } : {}, orderBy: { approvedAt: 'desc' }, take: 500 }); }

  @Post('jobs/:id/plan')
  async planJob(@Param('id') id: string, @Body() dto: PlanDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.PLANNER, 'Knitting planning');
    return this.prisma.$transaction(async (tx) => {
      const j = await tx.knitJob.findUnique({ where: { id } }); if (!j) throw new NotFoundException('Job not found'); if (j.status !== 'PENDING_PLANNING') throw new BadRequestException('This job is already planned');
      const L = j.lines as any as JobLineDto[]; if (dto.lines.length !== L.length || L.some((_, i) => !dto.lines.find((x) => x.index === i))) throw new BadRequestException('Send a plan for every line of the job');
      const machines = await tx.knitMachine.findMany(); const created: any[] = [];
      for (const p of dto.lines.sort((x, y) => x.index - y.index)) {
        const x = L[p.index]; const ft = x.fabricType || fabricTypeOf(x.fabric); const order = suggestedKnitKg(n(x.finishKg), await this.lossOf(tx, ft));
        if (p.mode === 'IN_HOUSE') { const m = machines.find((q) => q.id === p.machineId); if (!m) throw new BadRequestException(`Line ${p.index + 1}: choose a machine`); }
        const line = await tx.knitLine.create({ data: { jobId: j.id, source: 'CENTRAL_PLANNING', buyer: j.buyer, jobCode: j.jobCode, colour: x.colour, part: x.part || null, fabric: x.fabric, fabricType: ft, gsm: x.gsm || null, dia: x.dia || null, countType: x.countType || null, finishKg: n(x.finishKg), orderKg: order, mode: p.mode, stage: 'REPORT', taClose: j.taClose, shipDate: j.shipDate, merchandiser: j.merchandiser } });
        if (p.mode === 'IN_HOUSE') { const last = await tx.knitQueueItem.aggregate({ where: { machineId: p.machineId! }, _max: { position: true } }); await tx.knitQueueItem.create({ data: { knitLineId: line.id, machineId: p.machineId!, position: (last._max.position ?? -1) + 1, notBefore: day(p.notBefore) } }); }
        created.push(line);
      }
      await tx.knitJob.update({ where: { id }, data: { status: 'PLANNED' } });
      await tx.task.updateMany({ where: { entityType: 'KNIT_JOB', entityId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await tx.task.create({ data: { title: `Report completion: ${j.jobCode}`, module: 'KNITTING', entityType: 'KNIT_JOB', entityId: id, ownerRoleCode: 'KNIT_REPORTER' } });
      await audit(tx, a, 'KNIT_JOB_PLANNED', 'KNIT_JOB', id, null, dto);
      return created;
    });
  }

  // ---------- the plan (Gantt + list plan) ----------
  @Get('plan')
  async getPlan() {
    const { today, machines, items, sched } = await this.plan(this.prisma);
    return { today, machines: machines.map((m) => ({ id: m.id, dia: m.dia, capKgDay: n(m.capKgDay), loadDays: r2(Math.max(0, ...Object.values(sched).filter((s) => s.machineId === m.id).map((s) => s.e))) })),
      lines: items.map((i) => { const s: Slot | undefined = sched[i.knitLineId]; const l = i.line; const late = !!(s && l.taClose && s.finish > iso(l.taClose)!);
        return { lineId: l.id, machineId: i.machineId, position: i.hold ? (i.holdReason || 'HOLD') : s?.position, hold: i.hold, buyer: buyerCode(l.buyer), jobCode: l.jobCode, colour: l.colour, fabric: l.fabric, gsm: l.gsm, finishWidth: l.finishWidth, stitchLength: l.stitchLength, yarnCount: l.yarnCount, brand: l.brand, yarnLot: l.yarnLot, orderKg: orderOf(l), balanceKg: s ? r2(s.kg) : null, start: s?.start ?? null, finish: s?.finish ?? null, startOffset: s?.s ?? null, endOffset: s?.e ?? null, taClose: iso(l.taClose), shipDate: iso(l.shipDate), programNo: l.programNo, remarks: l.remarks, late, delayDays: late ? Math.round((Date.parse(s!.finish) - Date.parse(iso(l.taClose)!)) / 864e5) : 0 }; }) };
  }

  @Post('plan/move')
  async move(@Body() dto: MoveDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.PLANNER, 'Plan change');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.knitQueueItem.findUnique({ where: { knitLineId: dto.lineId }, include: { line: true } }); if (!item) throw new NotFoundException('Line is not in the machine plan');
      const mc = await tx.knitMachine.findUnique({ where: { id: dto.machineId } }); if (!mc) throw new BadRequestException('Machine not found');
      const { today, queues, sched } = await this.plan(tx);
      if (item.hold) { const l = item.line; (queues[item.machineId] = queues[item.machineId] || []).push({ id: l.id, balKg: 0 }); }
      const next = moveInQueue(queues, sched, dto.lineId, dto.machineId, { date: dto.date, position: dto.position, today });
      await this.writeQueues(tx, next, [...new Set([item.machineId, dto.machineId])]);
      await audit(tx, a, 'KNIT_PLAN_MOVED', 'KNIT_LINE', dto.lineId, { machineId: item.machineId, position: item.position, hold: item.hold }, { ...dto, diaMatch: sameDia(item.line.dia || '', mc.dia) });
      const after = await this.plan(tx); return { slot: after.sched[dto.lineId] || null, diaMatch: sameDia(item.line.dia || '', mc.dia) };
    });
  }
  @Post('lines/:id/hold')
  async hold(@Param('id') id: string, @Body() dto: HoldDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.PLANNER, 'Hold');
    return this.prisma.$transaction(async (tx) => { const q = await tx.knitQueueItem.findUnique({ where: { knitLineId: id } }); if (!q) throw new NotFoundException('Line is not in the machine plan'); const r = await tx.knitQueueItem.update({ where: { knitLineId: id }, data: { hold: true, holdReason: dto.reason } }); await audit(tx, a, 'KNIT_LINE_HOLD', 'KNIT_LINE', id, null, dto); return r; });
  }
  @Post('lines/:id/release')
  async release(@Param('id') id: string, @Body() dto: ReleaseDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.PLANNER, 'Release');
    return this.prisma.$transaction(async (tx) => { const q = await tx.knitQueueItem.findUnique({ where: { knitLineId: id } }); if (!q) throw new NotFoundException('Line is not in the machine plan'); if (!q.hold) throw new BadRequestException('This line is not on hold');
      const m = dto.machineId || q.machineId; const last = await tx.knitQueueItem.aggregate({ where: { machineId: m, hold: false }, _max: { position: true } });
      const r = await tx.knitQueueItem.update({ where: { knitLineId: id }, data: { hold: false, holdReason: null, machineId: m, position: (last._max.position ?? -1) + 1 } }); await audit(tx, a, 'KNIT_LINE_RELEASED', 'KNIT_LINE', id, q, r); return r; });
  }

  // ---------- reporter: report completion ----------
  @Put('lines/:id/report')
  async report(@Param('id') id: string, @Body() dto: ReportDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.REPORTER, 'Report completion');
    return this.prisma.$transaction(async (tx) => { const l = await tx.knitLine.findUnique({ where: { id } }); if (!l) throw new NotFoundException('Line not found');
      const data: any = {}; for (const k of ['yarnCount', 'brand', 'yarnLot', 'finishWidth', 'stitchLength', 'slot', 'season', 'programNo'] as const) if (dto[k] !== undefined) data[k] = dto[k] || null; if (dto.fosDate !== undefined) data.fosDate = day(dto.fosDate);
      const after = await tx.knitLine.update({ where: { id }, data }); await audit(tx, a, 'KNIT_REPORT_FIELDS', 'KNIT_LINE', id, null, dto); return after; });
  }
  @Post('jobs/:id/report-complete')
  async reportComplete(@Param('id') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.REPORTER, 'Report completion');
    return this.prisma.$transaction(async (tx) => { const L = await tx.knitLine.findMany({ where: { jobId: id, stage: 'REPORT' } }); if (!L.length) throw new BadRequestException('No line of this job is waiting for report completion');
      const miss = L.filter((l) => !l.yarnCount || !l.brand || !l.yarnLot); if (miss.length) throw new BadRequestException(`Fill yarn count, brand and lot for: ${miss.map((l) => l.colour).join(', ')}`);
      await tx.knitLine.updateMany({ where: { jobId: id, stage: 'REPORT' }, data: { stage: 'QTY' } });
      await tx.task.updateMany({ where: { entityType: 'KNIT_JOB', entityId: id, ownerRoleCode: 'KNIT_REPORTER', status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await tx.task.create({ data: { title: `Approve knitting quantity: ${L[0].jobCode}`, module: 'KNITTING', entityType: 'KNIT_JOB', entityId: id, ownerRoleCode: 'KNIT_INCHARGE' } });
      await audit(tx, a, 'KNIT_REPORT_COMPLETED', 'KNIT_JOB', id, null, { lines: L.length }); return { lines: L.length }; });
  }

  // ---------- production incharge ----------
  @Post('jobs/:id/approve-qty')
  async approveQty(@Param('id') id: string, @Body() dto: QtyDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.INCHARGE, 'Knitting quantity approval');
    return this.prisma.$transaction(async (tx) => { const L = await tx.knitLine.findMany({ where: { jobId: id, stage: 'QTY' } }); if (!L.length) throw new BadRequestException('No line of this job is waiting for quantity approval');
      for (const l of L) { const q = dto.lines.find((x) => x.lineId === l.id); if (!q) throw new BadRequestException(`Enter the final knitting kg for ${l.colour}`); const err = finalKgCheck(n(q.finalKg), n(l.finishKg)); if (err) throw new BadRequestException(`${l.colour}: ${err}`); }
      for (const l of L) await tx.knitLine.update({ where: { id: l.id }, data: { finalKg: n(dto.lines.find((x) => x.lineId === l.id)!.finalKg), stage: 'ACTIVE' } });
      await tx.task.updateMany({ where: { entityType: 'KNIT_JOB', entityId: id, ownerRoleCode: 'KNIT_INCHARGE', status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await audit(tx, a, 'KNIT_QTY_APPROVED', 'KNIT_JOB', id, L.map((l) => ({ id: l.id, orderKg: l.orderKg })), dto.lines); return { approved: L.length }; });
  }
  @Put('lines/:id/outside')
  async outside(@Param('id') id: string, @Body() dto: OutsideDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.INCHARGE, 'Outside allocation');
    if (dto.endDate < dto.startDate) throw new BadRequestException('End date must be on or after start date');
    return this.prisma.$transaction(async (tx) => { const l = await tx.knitLine.findUnique({ where: { id } }); if (!l) throw new NotFoundException('Line not found'); if (l.mode !== 'OUTSOURCE') throw new BadRequestException('This line is planned in-house');
      const data = { factory: dto.factory.trim(), programNo: dto.programNo || null, startDate: day(dto.startDate), endDate: day(dto.endDate), allocatedById: a.id };
      const r = await tx.knitOutsideAllocation.upsert({ where: { knitLineId: id }, update: data, create: { knitLineId: id, ...data } }); await audit(tx, a, 'KNIT_OUTSIDE_ALLOCATED', 'KNIT_LINE', id, null, dto); return r; });
  }
  @Put('factory-bookings')
  async booking(@Body() dto: BookingDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.INCHARGE.concat(R.PLANNER), 'Capacity booking');
    return this.prisma.$transaction(async (tx) => { const r = await tx.knitFactoryBooking.upsert({ where: { factory: dto.factory.trim() }, update: { tonsPerDay: n(dto.tonsPerDay) }, create: { factory: dto.factory.trim(), tonsPerDay: n(dto.tonsPerDay) } }); await audit(tx, a, 'KNIT_FACTORY_BOOKING', 'KNIT', dto.factory, null, dto); return r; });
  }

  // ---------- production ----------
  @Post('production')
  async production(@Body() dto: ProductionDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.REPORTER, 'Production entry');
    return this.prisma.$transaction(async (tx) => { const l = await tx.knitLine.findUnique({ where: { id: dto.lineId } }); if (!l) throw new NotFoundException('Line not found');
      const s = await tx.knitProduction.aggregate({ where: { knitLineId: l.id }, _sum: { knittedKg: true, deliveredKg: true } });
      const err = productionCheck(orderOf(l) - n(l.openingKnitKg), n(s._sum.knittedKg), n(s._sum.deliveredKg), n(dto.knittedKg), n(dto.deliveredKg)); if (err) throw new BadRequestException(err);
      const r = await tx.knitProduction.create({ data: { knitLineId: l.id, date: day(dto.date)!, machineId: dto.machineId || null, source: dto.source || 'EXECUTION', knittedKg: n(dto.knittedKg), deliveredKg: n(dto.deliveredKg), rejectedKg: n(dto.rejectedKg), createdById: a.id } });
      await audit(tx, a, 'KNIT_PRODUCTION', 'KNIT_LINE', l.id, null, dto); return r; }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  @Post('lines/:id/remarks')
  async remark(@Param('id') id: string, @Body() dto: RemarkDto, @Req() req: any) {
    const a = actorOf(req); if (a.roles.length === 1 && a.roles[0] === 'MANAGEMENT') throw new BadRequestException('Management view cannot add remarks');
    if (dto.type !== 'DELAY_REASON' && !dto.text?.trim()) throw new BadRequestException('Write the remark'); if (dto.type === 'DELAY_REASON' && !dto.reason) throw new BadRequestException('Choose the delay reason');
    return this.prisma.$transaction(async (tx) => { if (!(await tx.knitLine.findUnique({ where: { id } }))) throw new NotFoundException('Line not found'); const r = await tx.knitRemark.create({ data: { knitLineId: id, date: day(ymd(new Date()))!, dept: dto.dept, type: dto.type, reason: dto.reason || null, text: dto.text || null, createdById: a.id } }); await audit(tx, a, 'KNIT_REMARK', 'KNIT_LINE', id, null, dto); return r; });
  }

  // ---------- reports ----------
  @Get('lines')
  async lines(@Query('stage') stage?: string, @Query('jobCode') jobCode?: string) {
    const { sched } = await this.plan(this.prisma);
    const [L, prod, remarks, qitems] = await Promise.all([this.prisma.knitLine.findMany({ where: { ...(stage ? { stage } : {}), ...(jobCode ? { jobCode } : {}) }, include: { outside: true } }), this.prisma.knitProduction.groupBy({ by: ['knitLineId'], _sum: { knittedKg: true, deliveredKg: true, rejectedKg: true } }), this.prisma.knitRemark.findMany({ orderBy: { createdAt: 'asc' } }), this.prisma.knitQueueItem.findMany()]);
    const P = new Map(prod.map((p) => [p.knitLineId, p._sum])); const Q = new Map(qitems.map((q) => [q.knitLineId, q])); const today = ymd(new Date());
    return L.map((l) => { const p = P.get(l.id); const knit = n(l.openingKnitKg) + n(p?.knittedKg); const order = orderOf(l); const s = sched[l.id]; const q = Q.get(l.id); const rm = remarks.filter((r) => r.knitLineId === l.id); const delay = rm.filter((r) => r.type === 'DELAY_REASON').pop();
      const finish = s?.finish || iso(l.outside?.endDate) || null; const bal = r2(Math.max(0, order - knit)); const late = bal > 0 && !!((finish && finish < today) || (s && l.taClose && s.finish > iso(l.taClose)!));
      return { ...l, buyerCode: buyerCode(l.buyer), knitReqKg: order, knittedKg: r2(knit), balanceKg: bal, deliveredKg: r2(n(l.openingKnitKg) + n(p?.deliveredKg)), deliveryBalanceKg: r2(Math.max(0, knit - n(l.openingKnitKg) - n(p?.deliveredKg))), rejectedKg: r2(n(p?.rejectedKg)), factory: l.mode === 'IN_HOUSE' ? 'NFL (in-house)' : l.outside?.factory || 'Not assigned', machineId: q?.machineId || null, position: q ? (q.hold ? q.holdReason || 'HOLD' : s?.position) : null, start: s?.start || iso(l.outside?.startDate), finish, late, delayReason: delay?.reason || null, remarksCount: rm.length,
        extraPct: l.finishKg ? r2((order / n(l.finishKg) - 1) * 100) : null, status: bal === 0 ? 'DONE' : q?.hold ? 'ON_HOLD' : late ? 'LATE' : knit > 0 ? 'RUNNING' : 'NOT_STARTED' }; });
  }
  @Get('day-plan')
  async dayPlan(@Query('date') date?: string) {
    const d = date && D.test(date) ? date : ymd(new Date()); const { today, machines, sched } = await this.plan(this.prisma);
    const caps = Object.fromEntries(machines.map((m) => [m.id, n(m.capKgDay)])); const rows = dayLoad(sched, caps, d, today);
    const actual = await this.prisma.knitProduction.groupBy({ by: ['knitLineId', 'machineId'], where: { date: day(d)! }, _sum: { knittedKg: true } });
    const lines = await this.prisma.knitLine.findMany({ where: { id: { in: rows.map((r) => r.id) } } }); const LL = new Map(lines.map((l) => [l.id, l]));
    return rows.map((r) => { const l = LL.get(r.id)!; const act = actual.find((x) => x.knitLineId === r.id && x.machineId === r.machineId); return { date: d, machineId: r.machineId, lineId: r.id, jobCode: l.jobCode, colour: l.colour, fabric: l.fabric, plannedKg: r.kg, actualKg: act ? n(act._sum.knittedKg) : null }; });
  }
  @Get('capacity')
  async capacity(@Query('date') date?: string) {
    const d = date && D.test(date) ? date : ymd(new Date()); const { today, machines, sched } = await this.plan(this.prisma);
    const caps = Object.fromEntries(machines.map((m) => [m.id, n(m.capKgDay)])); const inHouse = dayLoad(sched, caps, d, today).reduce((s, x) => s + x.kg, 0);
    const [book, alloc, prod] = await Promise.all([this.prisma.knitFactoryBooking.findMany(), this.prisma.knitOutsideAllocation.findMany({ include: { line: true } }), this.prisma.knitProduction.groupBy({ by: ['knitLineId'], _sum: { knittedKg: true } })]);
    const P = new Map(prod.map((p) => [p.knitLineId, n(p._sum.knittedKg)])); const load: Record<string, number> = {};
    alloc.forEach((x) => { if (!x.startDate || !x.endDate) return; const from = iso(x.startDate)! > today ? iso(x.startDate)! : today; const to = iso(x.endDate)!; if (d < from || d > to) return; const bal = Math.max(0, orderOf(x.line) - n(x.line.openingKnitKg) - (P.get(x.knitLineId) || 0)); load[x.factory] = (load[x.factory] || 0) + bal / Math.max(1, (Date.parse(to) - Date.parse(from)) / 864e5 + 1); });
    const facs = [...new Set(book.map((b) => b.factory).concat(Object.keys(load)))];
    return [{ factory: 'NFL (in-house)', bookedTons: r2(Object.values(caps).reduce((s, v) => s + v, 0) / 1000), loadedTons: r2(inHouse / 1000) }].concat(facs.map((f) => ({ factory: f, bookedTons: n(book.find((b) => b.factory === f)?.tonsPerDay), loadedTons: r2((load[f] || 0) / 1000) }))).map((r) => ({ ...r, freeTons: r2(r.bookedTons - r.loadedTons), overBooked: r.loadedTons > r.bookedTons }));
  }

  // ---------- import of the machine-wise knitting program ----------
  @Post('import')
  async import(@Body() dto: ImportDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, [], 'Knitting import');
    return this.prisma.$transaction(async (tx) => {
      for (const m of dto.machines || []) await tx.knitMachine.upsert({ where: { id: m.id }, update: { dia: m.dia, capKgDay: n(m.capKgDay) }, create: { id: m.id, dia: m.dia, capKgDay: n(m.capKgDay) } });
      const known = new Set((await tx.knitMachine.findMany()).map((m) => m.id)); const order = (p?: string) => (p === 'RUN' ? 0 : /^\d+$/.test(p || '') ? +p! - 1 : null);
      let lines = 0, queued = 0, held = 0; const byM: Record<string, Array<{ id: string; o: number }>> = {};
      for (const p of dto.program) {
        if (!known.has(p.mc)) throw new BadRequestException(`Unknown machine ${p.mc}`);
        const l = await tx.knitLine.create({ data: { source: 'MACHINE_PROGRAM', buyer: p.buyer, jobCode: /^[A-Z]/.test(p.job) ? p.job : `${buyerCode(p.buyer)} ${p.job}`, colour: p.colour || '—', fabric: p.fabric, fabricType: fabricTypeOf(p.fabric), gsm: p.gsm || null, dia: null, yarnCount: p.count || null, brand: p.brand || null, yarnLot: p.lot || null, finishWidth: p.fwid || null, stitchLength: p.sl || null, orderKg: n(p.order), openingKnitKg: n(p.prod), mode: 'IN_HOUSE', stage: 'ACTIVE', taClose: day(p.ta), shipDate: day(p.ship), programNo: p.prog || null, programRcvDate: day(p.progRcv), remarks: p.remark || null } });
        lines++; const o = order(p.pos);
        if (o === null) { await tx.knitQueueItem.create({ data: { knitLineId: l.id, machineId: p.mc, position: 9999, hold: true, holdReason: p.pos || 'NOT_SEQUENCED' } }); held++; } else (byM[p.mc] = byM[p.mc] || []).push({ id: l.id, o });
      }
      for (const [m, L] of Object.entries(byM)) { const last = await tx.knitQueueItem.aggregate({ where: { machineId: m, hold: false }, _max: { position: true } }); let base = (last._max.position ?? -1) + 1; for (const x of L.sort((p, q) => p.o - q.o)) { await tx.knitQueueItem.create({ data: { knitLineId: x.id, machineId: m, position: base++ } }); queued++; } }
      await audit(tx, a, 'KNIT_PROGRAM_IMPORT', 'KNIT', 'program', null, { lines, queued, held }); return { lines, queued, held };
    }, { timeout: 120000 });
  }
}
