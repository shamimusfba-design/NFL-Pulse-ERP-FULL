import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, changeStep, ensureWorkflow, loadStyle, requireJobOwner, requireRole, stepDataOf, stepMapOf, toJson } from './merch.common';
import {
  checklistInHouse, checklistRequiredQty, finishFabricKg, generateTna, greyFabricKg, labDipSummary, LAB_DIP_STATUS, MERCH_EDIT_ROLES, MERCH_ROLES, PLANNING_ROLES, stage, Step, STEP_ROLES,
} from './merch.rules';

// ---------- DTOs ----------
class CadDto { @IsArray() parts!: Array<{ part: string; fabric?: string; gsm?: number; comp?: string; consKgDz: number }>; }
class IeDto { @Type(() => Number) @IsNumber() @Min(0.01) smv!: number; @IsOptional() @Type(() => Number) @IsNumber() operations?: number; @IsOptional() @Type(() => Number) @IsNumber() machines?: number; }
class ThreadDto { @IsArray() lines!: Array<{ name: string; metersPerPc: number }>; }
class FabricSheetDto { @IsObject() colorCodes!: Record<string, string>; @Type(() => Number) @IsNumber() @Min(0) @Max(60) lossPct!: number; @IsOptional() @IsString() @MaxLength(500) instructions?: string; }
class TnaRowsDto { @IsObject() rows!: Record<string, { s: string; e: string; d?: number }>; }
class DescriptionsDto { @IsOptional() @IsString() @MaxLength(300) itemDescription?: string; @IsOptional() @IsString() @MaxLength(300) printEmbDescription?: string; }
class HandoverDto { @IsArray() departments!: string[]; }
class PreProductionDto { @IsObject() done!: Record<string, boolean>; }
class SizeSetDto { @IsOptional() @IsString() @MaxLength(300) note?: string; }
class PpMeetingDto { @IsString() date!: string; @IsOptional() @IsString() time?: string; @IsOptional() @IsString() @MaxLength(300) note?: string; }
class LabDipDto { @IsIn(LAB_DIP_STATUS as unknown as string[]) status!: string; }
class MerchFieldsDto {
  @IsOptional() @IsIn(['None', 'Print', 'Embroidery', 'Print + Embroidery']) printEmbType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fob?: number;
  @IsOptional() @IsIn(['NOT_STARTED', 'PREPARED', 'SENT_TO_BUYER']) packingListStatus?: string;
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
}
class ChecklistDto { @IsArray() lines!: Array<{ name: string; spec?: string; unit?: string; perPc: number; wastePct?: number }>; }
class LineOrderDto { @IsIn(['NOT_ORDERED', 'ORDERED']) status!: string; }
class LineReceiveDto { @Type(() => Number) @IsNumber() @Min(0) receivedQty!: number; }

const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (v: unknown) => { const x = parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };

@Controller('merch/bulk')
@UseGuards(JwtAuthGuard)
export class BulkMerchController {
  constructor(private prisma: PrismaService) {}

  // ---------- list & detail ----------
  @Get('jobs')
  async list(@Req() req: any, @Query('q') q?: string, @Query('buyer') buyer?: string, @Query('stage') stageF?: string, @Query('month') month?: string, @Query('page') page = '1') {
    const a = actorOf(req);
    const isMerch = a.roles.some((r) => MERCH_ROLES.includes(r));
    const seeAll = !isMerch || a.roles.includes('ADMIN') || a.roles.includes('MERCH_HEAD');
    const where: any = { AND: [] as any[] };
    if (!seeAll) where.AND.push({ order: { OR: [{ merchandiserId: a.id }, { merchandiserId: null, createdById: a.id }] } });
    if (buyer) where.AND.push({ order: { buyer: { name: buyer } } });
    if (q) where.AND.push({ OR: [{ styleNo: { contains: q, mode: 'insensitive' } }, { order: { jobNo: { contains: q, mode: 'insensitive' } } }] });
    const rows = await this.prisma.style.findMany({
      where, take: 2000, orderBy: { order: { createdAt: 'desc' } },
      include: { order: { include: { buyer: true } }, merchSteps: { select: { step: true, status: true } }, labDips: { select: { status: true } }, purchaseOrders: { select: { ccd: true, shipmentDate: true } }, trimsChecklist: { select: { status: true, lines: { select: { orderStatus: true, requiredQty: true, receivedQty: true } } } } },
    });
    const out = rows.map((s) => {
      const steps = stepMapOf(s.merchSteps);
      const ship = s.purchaseOrders.map((p) => ymd(p.ccd || p.shipmentDate)).filter(Boolean).sort()[0] || null;
      const trims = s.trimsChecklist ? checklistInHouse(s.trimsChecklist.lines.map((l) => ({ orderStatus: l.orderStatus, requiredQty: num(l.requiredQty), receivedQty: num(l.receivedQty) }))) : null;
      const fob = s.fob != null ? num(s.fob) : num((s.sourceMetadata as any)?.pricePerItem) || null;
      return {
        styleId: s.id, jobNo: s.order.jobNo, buyer: s.order.buyer.name, styleNo: s.styleNo, item: s.itemDescription, qty: s.quantity, merchandiserId: s.order.merchandiserId,
        steps, stage: stage(steps), labDip: labDipSummary(s.labDips), checklist: s.trimsChecklist?.status || 'NOT_STARTED', trims, shipDate: ship,
        fob, orderValue: fob != null ? Math.round(fob * s.quantity * 100) / 100 : null, printEmbType: s.printEmbType, printEmbDesc: s.printEmbDesc, itemDescription: s.planningItemDesc, packingList: s.packingListStatus,
      };
    }).filter((r) => (!stageF || r.stage === stageF) && (!month || (r.shipDate || '').slice(0, 7) === month));
    const size = 50, p = Math.max(1, parseInt(page, 10) || 1);
    return { total: out.length, page: p, pageSize: size, rows: out.slice((p - 1) * size, p * size) };
  }

  @Get('jobs/:styleId')
  async detail(@Param('styleId') styleId: string, @Req() req: any) {
    const a = actorOf(req);
    let s = await loadStyle(this.prisma, styleId);
    if (!s.merchSteps.length && a.roles.some((r) => [...MERCH_EDIT_ROLES, 'ADMIN'].includes(r))) {
      await this.prisma.$transaction((tx) => ensureWorkflow(tx, a, s));
      s = await loadStyle(this.prisma, styleId);
    }
    const steps = stepMapOf(s.merchSteps);
    const history = await this.prisma.auditLog.findMany({ where: { entityType: 'STYLE', entityId: styleId }, orderBy: { createdAt: 'desc' }, take: 40, include: { user: { select: { name: true } } } });
    const cost = await this.prisma.costSheet.findUnique({ where: { entityType_entityId: { entityType: 'STYLE', entityId: styleId } } });
    return {
      style: s, steps, stage: stage(steps),
      stepData: Object.fromEntries(s.merchSteps.map((r: { step: string; data: unknown }) => [r.step, r.data] as [string, unknown])),
      labDip: labDipSummary(s.labDips), costSheet: cost ? { status: cost.status, fob: cost.fob } : null,
      history: history.map((h) => ({ at: h.createdAt, by: h.user?.name || null, action: h.action })),
    };
  }

  // ---------- CAD / IE ----------
  @Post('jobs/:styleId/cad')
  async cad(@Param('styleId') id: string, @Body() dto: CadDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.CAD, 'CAD consumption');
    if (!dto.parts.length || dto.parts.some((p) => !p.part || !(num(p.consKgDz) > 0))) throw new BadRequestException('Every part needs a name and consumption (kg / dozen) above 0');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); await ensureWorkflow(tx, a, s);
      if (stepMapOf(await tx.merchStep.findMany({ where: { styleId: id } })).CAD !== 'READY') throw new BadRequestException('CAD consumption is not due for this job');
      const finishKg = finishFabricKg(dto.parts, s.quantity);
      return changeStep(tx, a, s, 'CAD', 'DONE', { parts: dto.parts, finishKg });
    });
  }

  @Post('jobs/:styleId/ie')
  async ie(@Param('styleId') id: string, @Body() dto: IeDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.IE, 'IE bulletin');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); await ensureWorkflow(tx, a, s);
      if (stepMapOf(await tx.merchStep.findMany({ where: { styleId: id } })).IE !== 'READY') throw new BadRequestException('IE bulletin is not due for this job');
      return changeStep(tx, a, s, 'IE', 'DONE', { smv: dto.smv, operations: dto.operations ?? null, machines: dto.machines ?? null });
    });
  }

  @Post('jobs/:styleId/thread')
  async thread(@Param('styleId') id: string, @Body() dto: ThreadDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.THREAD, 'Thread consumption');
    if (!dto.lines.length || dto.lines.some((l) => !l.name || !(num(l.metersPerPc) > 0))) throw new BadRequestException('Every thread line needs a name and metres per piece above 0');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).THREAD !== 'READY') throw new BadRequestException('Thread consumption opens after the IE bulletin');
      return changeStep(tx, a, s, 'THREAD', 'DONE', { lines: dto.lines });
    });
  }

  // ---------- fabric order sheet ----------
  @Post('jobs/:styleId/fabric-sheet')
  async fabricSheet(@Param('styleId') id: string, @Body() dto: FabricSheetDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.FABRIC_SHEET, 'Fabric order sheet');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (stepMapOf(s.merchSteps).FABRIC_SHEET !== 'READY') throw new BadRequestException('Fabric order sheet is not due (needs CAD, IE bulletin and thread first)');
      const colours: string[] = [...new Set<string>(s.breakdowns.map((b: { color: string }) => String(b.color)))];
      const missing = colours.filter((c) => !String(dto.colorCodes[c] || '').trim());
      if (missing.length) throw new BadRequestException(`Add the colour / code for: ${missing.join(', ')}`);
      const finishKg = num(stepDataOf(s.merchSteps, 'CAD').finishKg);
      return changeStep(tx, a, s, 'FABRIC_SHEET', 'SENT', { colorCodes: dto.colorCodes, lossPct: dto.lossPct, instructions: dto.instructions || '', finishKg, greyKg: greyFabricKg(finishKg, dto.lossPct) });
    });
  }

  @Post('jobs/:styleId/fabric-sheet/approve')
  async approveFabric(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'Fabric order sheet approval');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).FABRIC_SHEET !== 'SENT') throw new BadRequestException('No fabric order sheet is waiting for approval');
      return changeStep(tx, a, s, 'FABRIC_SHEET', 'DONE');
    });
  }

  // ---------- TNA (one step: merchandiser sends, Planning generates and approves) ----------
  @Post('jobs/:styleId/tna/send')
  async tnaSend(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.TNA, 'TNA sheet');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (stepMapOf(s.merchSteps).TNA !== 'READY') throw new BadRequestException('TNA sheet is not due');
      const res = await changeStep(tx, a, s, 'TNA', 'SENT');
      await tx.task.create({ data: { title: `Generate and approve TNA: ${s.order.jobNo} / ${s.styleNo}`, module: 'MERCH', entityType: 'STYLE', entityId: s.id, orderId: s.orderId, ownerRoleCode: 'PLANNING' } });
      return res;
    });
  }

  @Post('jobs/:styleId/tna/generate')
  async tnaGenerate(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'TNA generation');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).TNA !== 'SENT') throw new BadRequestException('No TNA sheet is waiting for Planning');
      const rows = generateTna({ poReceived: ymd(s.order.confirmedAt)!, finishKg: num(stepDataOf(s.merchSteps, 'CAD').finishKg), qty: s.quantity, printEmb: s.printEmbType || '' });
      await tx.merchStep.update({ where: { styleId_step: { styleId: id, step: 'TNA' } }, data: { data: toJson({ ...stepDataOf(s.merchSteps, 'TNA'), rows, generatedAt: new Date() }) } });
      await audit(tx, a, 'MERCH_TNA_GENERATED', 'STYLE', id, null, rows);
      return { rows };
    });
  }

  @Put('jobs/:styleId/tna')
  async tnaEdit(@Param('styleId') id: string, @Body() dto: TnaRowsDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'TNA edit');
    for (const [k, r] of Object.entries(dto.rows)) {
      if (k === 'total') continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.s) || !/^\d{4}-\d{2}-\d{2}$/.test(r.e) || r.e < r.s) throw new BadRequestException(`Check the dates of ${k}: end must be on or after start`);
    }
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).TNA !== 'SENT') throw new BadRequestException('TNA can be edited only while it is with Planning');
      const before = stepDataOf(s.merchSteps, 'TNA');
      await tx.merchStep.update({ where: { styleId_step: { styleId: id, step: 'TNA' } }, data: { data: toJson({ ...before, rows: dto.rows }) } });
      await audit(tx, a, 'MERCH_TNA_EDITED', 'STYLE', id, before.rows, dto.rows);
      return { rows: dto.rows };
    });
  }

  @Post('jobs/:styleId/tna/approve')
  async tnaApprove(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'TNA approval');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).TNA !== 'SENT') throw new BadRequestException('No TNA is waiting for approval');
      if (!stepDataOf(s.merchSteps, 'TNA').rows) throw new BadRequestException('Generate the TNA dates first');
      const res = await changeStep(tx, a, s, 'TNA', 'DONE');
      await tx.task.updateMany({ where: { module: 'MERCH', entityId: id, title: { startsWith: 'Generate and approve TNA:' }, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      return res;
    });
  }

  @Put('jobs/:styleId/descriptions')
  async descriptions(@Param('styleId') id: string, @Body() dto: DescriptionsDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'Item and print/emb description');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      const after = await tx.style.update({ where: { id }, data: { planningItemDesc: dto.itemDescription ?? s.planningItemDesc, printEmbDesc: dto.printEmbDescription ?? s.printEmbDesc } });
      await audit(tx, a, 'MERCH_DESCRIPTIONS', 'STYLE', id, { item: s.planningItemDesc, pe: s.printEmbDesc }, { item: after.planningItemDesc, pe: after.printEmbDesc });
      return { itemDescription: after.planningItemDesc, printEmbDescription: after.printEmbDesc };
    });
  }

  // ---------- handover → pre-production → size set → PP meeting ----------
  @Post('jobs/:styleId/file-handover')
  async handover(@Param('styleId') id: string, @Body() dto: HandoverDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.FILE_HANDOVER, 'File handover');
    if (!dto.departments.length) throw new BadRequestException('Select at least one department');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (stepMapOf(s.merchSteps).FILE_HANDOVER !== 'READY') throw new BadRequestException('File handover opens after the fabric order sheet and TNA are approved');
      return changeStep(tx, a, s, 'FILE_HANDOVER', 'DONE', { departments: dto.departments, at: new Date() });
    });
  }

  @Post('jobs/:styleId/pre-production')
  async preProduction(@Param('styleId') id: string, @Body() dto: PreProductionDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.PRE_PRODUCTION, 'Pre-production update');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).PRE_PRODUCTION !== 'READY') throw new BadRequestException('Pre-production is not open for this job');
      const depts: string[] = stepDataOf(s.merchSteps, 'FILE_HANDOVER').departments || [];
      const done = Object.fromEntries(depts.map((d) => [d, !!dto.done[d]]));
      const all = depts.length > 0 && depts.every((d) => done[d]);
      if (!all) {
        await tx.merchStep.update({ where: { styleId_step: { styleId: id, step: 'PRE_PRODUCTION' } }, data: { data: toJson({ done }) } });
        await audit(tx, a, 'MERCH_PRE_PRODUCTION_PROGRESS', 'STYLE', id, null, done);
        return { done, complete: false };
      }
      return { ...(await changeStep(tx, a, s, 'PRE_PRODUCTION', 'DONE', { done })), complete: true };
    });
  }

  @Post('jobs/:styleId/size-set')
  async sizeSet(@Param('styleId') id: string, @Body() dto: SizeSetDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.SIZE_SET, 'Size set');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps).SIZE_SET !== 'READY') throw new BadRequestException('Size set opens after pre-production is finished');
      return changeStep(tx, a, s, 'SIZE_SET', 'DONE', { note: dto.note || '' });
    });
  }

  @Post('jobs/:styleId/pp-meeting')
  async ppMeeting(@Param('styleId') id: string, @Body() dto: PpMeetingDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, STEP_ROLES.PP_MEETING, 'PP meeting');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) throw new BadRequestException('Enter the meeting date');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (stepMapOf(s.merchSteps).PP_MEETING !== 'READY') throw new BadRequestException('PP meeting is due only after the size set is OK');
      return changeStep(tx, a, s, 'PP_MEETING', 'DONE', { date: dto.date, time: dto.time || '', note: dto.note || '' });
    });
  }

  // ---------- merchandiser fields, lab dip ----------
  @Patch('jobs/:styleId/fields')
  async fields(@Param('styleId') id: string, @Body() dto: MerchFieldsDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, MERCH_EDIT_ROLES, 'Job update');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      const data: any = {};
      if (dto.printEmbType !== undefined) data.printEmbType = dto.printEmbType;
      if (dto.fob !== undefined) data.fob = dto.fob;
      if (dto.packingListStatus !== undefined) data.packingListStatus = dto.packingListStatus;
      if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
      const after = await tx.style.update({ where: { id }, data });
      await audit(tx, a, 'MERCH_FIELDS', 'STYLE', id, { printEmbType: s.printEmbType, fob: s.fob, packingListStatus: s.packingListStatus }, data);
      return { printEmbType: after.printEmbType, fob: after.fob, packingListStatus: after.packingListStatus, imageUrl: after.imageUrl };
    });
  }

  @Patch('jobs/:styleId/lab-dips/:color')
  async labDip(@Param('styleId') id: string, @Param('color') color: string, @Body() dto: LabDipDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, MERCH_EDIT_ROLES, 'Lab dip update');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (!s.breakdowns.some((b) => b.color === color)) throw new BadRequestException(`Colour ${color} is not in this job`);
      const cur = s.labDips.find((l) => l.color === color);
      const rounds = (cur?.rounds || 0) + (dto.status === 'SUBMITTED' ? 1 : 0);
      const after = await tx.labDip.upsert({ where: { styleId_color: { styleId: id, color } }, update: { status: dto.status, rounds }, create: { styleId: id, color, status: dto.status, rounds } });
      await audit(tx, a, 'MERCH_LAB_DIP', 'STYLE', id, cur ? { color, status: cur.status } : null, { color, status: dto.status, rounds });
      return after;
    });
  }

  // ---------- trims & accessories checklist ----------
  @Put('jobs/:styleId/checklist')
  async saveChecklist(@Param('styleId') id: string, @Body() dto: ChecklistDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, MERCH_EDIT_ROLES, 'Trims & accessories checklist');
    if (dto.lines.some((l) => !String(l.name || '').trim() || !(num(l.perPc) >= 0))) throw new BadRequestException('Every line needs an item name and a per-piece quantity');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      const cl = s.trimsChecklist;
      if (cl?.lines.some((l) => l.orderStatus === 'ORDERED')) throw new BadRequestException('Some items are already ordered. Change those lines from the ordering screen.');
      const checklist = cl || (await tx.trimsChecklist.create({ data: { styleId: id } }));
      await tx.trimsChecklistLine.deleteMany({ where: { checklistId: checklist.id } });
      await tx.trimsChecklistLine.createMany({ data: dto.lines.map((l, i) => ({ checklistId: checklist.id, sortNo: i + 1, name: l.name.trim(), spec: l.spec || null, unit: l.unit || 'pcs', perPc: num(l.perPc), wastePct: num(l.wastePct), requiredQty: checklistRequiredQty(s.quantity, num(l.perPc), num(l.wastePct), l.unit || 'pcs') })) });
      await tx.trimsChecklist.update({ where: { id: checklist.id }, data: { status: 'DRAFT' } });
      await audit(tx, a, 'MERCH_CHECKLIST_SAVED', 'STYLE', id, cl?.lines.length ?? 0, dto.lines.length);
      return tx.trimsChecklist.findUnique({ where: { id: checklist.id }, include: { lines: { orderBy: { sortNo: 'asc' } } } });
    });
  }

  @Post('jobs/:styleId/checklist/ready')
  async checklistReady(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, MERCH_EDIT_ROLES, 'Trims & accessories checklist');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (!s.trimsChecklist?.lines.length) throw new BadRequestException('Add the checklist items first');
      await tx.trimsChecklist.update({ where: { id: s.trimsChecklist.id }, data: { status: 'READY' } });
      await audit(tx, a, 'MERCH_CHECKLIST_READY', 'STYLE', id, s.trimsChecklist.status, 'READY');
      return { status: 'READY' };
    });
  }

  @Post('jobs/:styleId/checklist/order-all')
  async orderAll(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, MERCH_EDIT_ROLES, 'Trims ordering');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id); requireJobOwner(a, s.order);
      if (s.trimsChecklist?.status !== 'READY') throw new BadRequestException('Mark the checklist ready before ordering');
      const r = await tx.trimsChecklistLine.updateMany({ where: { checklistId: s.trimsChecklist.id, orderStatus: 'NOT_ORDERED' }, data: { orderStatus: 'ORDERED', orderedAt: new Date() } });
      await audit(tx, a, 'MERCH_TRIMS_ORDER_ALL', 'STYLE', id, null, { lines: r.count });
      return { ordered: r.count };
    });
  }

  @Patch('checklist-lines/:lineId/order')
  async lineOrder(@Param('lineId') lineId: string, @Body() dto: LineOrderDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, MERCH_EDIT_ROLES, 'Trims ordering');
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.trimsChecklistLine.findUnique({ where: { id: lineId }, include: { checklist: { include: { style: { include: { order: true } } } } } });
      if (!line) throw new BadRequestException('Checklist line not found');
      requireJobOwner(a, line.checklist.style.order);
      if (line.checklist.status !== 'READY') throw new BadRequestException('Mark the checklist ready before ordering');
      if (dto.status === 'NOT_ORDERED' && num(line.receivedQty) > 0) throw new BadRequestException('The store has already received this item; it cannot be set back to not ordered');
      const after = await tx.trimsChecklistLine.update({ where: { id: lineId }, data: { orderStatus: dto.status, orderedAt: dto.status === 'ORDERED' ? new Date() : null } });
      await audit(tx, a, 'MERCH_TRIMS_ORDER', 'STYLE', line.checklist.styleId, { line: line.name, status: line.orderStatus }, { line: line.name, status: dto.status });
      return after;
    });
  }

  @Patch('checklist-lines/:lineId/receive')
  async lineReceive(@Param('lineId') lineId: string, @Body() dto: LineReceiveDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, ['TRIMS_STORE'], 'Trims receive');
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.trimsChecklistLine.findUnique({ where: { id: lineId } });
      if (!line) throw new BadRequestException('Checklist line not found');
      if (line.orderStatus !== 'ORDERED') throw new BadRequestException('This item is not ordered yet');
      const after = await tx.trimsChecklistLine.update({ where: { id: lineId }, data: { receivedQty: dto.receivedQty } });
      const cl = await tx.trimsChecklist.findUnique({ where: { id: line.checklistId } });
      await audit(tx, a, 'TRIMS_STORE_RECEIVE', 'STYLE', cl!.styleId, { line: line.name, received: num(line.receivedQty) }, { line: line.name, received: dto.receivedQty });
      return after;
    });
  }

  // ---------- order value (management view; everyone with access can see) ----------
  @Get('order-value')
  async orderValue(@Query('month') month?: string, @Query('buyer') buyer?: string, @Query('merchandiserId') merchandiserId?: string) {
    const styles = await this.prisma.style.findMany({
      where: { AND: [buyer ? { order: { buyer: { name: buyer } } } : {}, merchandiserId ? { order: { merchandiserId } } : {}] },
      select: { id: true, styleNo: true, quantity: true, fob: true, sourceMetadata: true, itemDescription: true, order: { select: { jobNo: true, merchandiserId: true, buyer: { select: { name: true } } } }, purchaseOrders: { select: { ccd: true, shipmentDate: true } } },
    });
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(styles.map((s) => s.order.merchandiserId).filter(Boolean) as string[])] } }, select: { id: true, name: true } });
    const uname = new Map(users.map((u) => [u.id, u.name]));
    const rows = styles.map((s) => {
      const fob = s.fob != null ? num(s.fob) : num((s.sourceMetadata as any)?.pricePerItem) || null;
      const ship = s.purchaseOrders.map((p) => ymd(p.ccd || p.shipmentDate)).filter(Boolean).sort()[0] || null;
      return { styleId: s.id, jobNo: s.order.jobNo, styleNo: s.styleNo, buyer: s.order.buyer.name, merchandiser: s.order.merchandiserId ? uname.get(s.order.merchandiserId) || null : null, qty: s.quantity, fob, value: fob != null ? fob * s.quantity : null, shipMonth: ship ? ship.slice(0, 7) : null };
    }).filter((r) => !month || r.shipMonth === month);
    const group = (key: 'shipMonth' | 'merchandiser' | 'buyer') => {
      const m = new Map<string, { key: string; value: number; qty: number; jobs: number }>();
      for (const r of rows) { if (r.value == null) continue; const k = r[key] || 'Not set'; const g = m.get(k) || { key: k, value: 0, qty: 0, jobs: 0 }; g.value += r.value; g.qty += r.qty; g.jobs++; m.set(k, g); }
      return [...m.values()].sort((x, y) => (key === 'shipMonth' ? x.key.localeCompare(y.key) : y.value - x.value));
    };
    const withValue = rows.filter((r) => r.value != null);
    const totalValue = withValue.reduce((s, r) => s + (r.value || 0), 0), valuedQty = withValue.reduce((s, r) => s + r.qty, 0);
    return {
      totals: { orderValue: Math.round(totalValue * 100) / 100, orderQty: rows.reduce((s, r) => s + r.qty, 0), averageFob: valuedQty ? Math.round((totalValue / valuedQty) * 100) / 100 : 0, jobs: rows.length, jobsWithoutFob: rows.length - withValue.length },
      byMonth: group('shipMonth'), byMerchandiser: group('merchandiser'), byBuyer: group('buyer'), rows,
    };
  }
}
