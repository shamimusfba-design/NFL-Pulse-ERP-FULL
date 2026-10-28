import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, requireRole, toJson } from './merch.common';
import { canAct, quotaCheck, sampleSheetNo } from './merch.rules';

const SAMPLE_MERCH = ['MERCH_SAMPLE', 'MERCH_BOTH', 'MERCH_HEAD'];
const SAMPLE_PLANNING = ['SAMPLE'];
const SAMPLE_TYPES = ['Offer', 'Development', 'Proto', 'SMS', 'PP', 'APP', 'Photo', 'BPS', 'Test', 'Salesman', 'Size set', 'Other'];
const OD_TYPES = ['Offer', 'Development', 'Proto'];
const TNA_ACTIVITIES = ['Knitting', 'Dyeing', 'AOP', 'Cutting', 'Print', 'Sewing'];
const STATUS = ['NOT_STARTED', 'DRAFT', 'DONE', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTLY_IN_HOUSE', 'IN_HOUSE', 'SENT_TO_PURCHASE', 'NOT_NEEDED'];
const MERCH_STATUS = ['ORDER_SHEET_SENT', 'WAITING_BUYER_COMMENTS', 'COMMENTS_RECEIVED', 'APPROVED_BY_BUYER', 'DROPPED', 'ON_HOLD'];

class ColorDto { @IsString() @MaxLength(80) color!: string; @Type(() => Number) @IsInt() @Min(1) qty!: number; }
class SheetDto {
  @IsString() @MaxLength(60) buyerName!: string;
  @IsOptional() @IsString() @MaxLength(60) subBrand?: string;
  @IsString() @MaxLength(60) styleNo!: string;
  @IsOptional() @IsString() @MaxLength(120) styleName?: string;
  @IsArray() @IsIn(SAMPLE_TYPES, { each: true }) sampleTypes!: string[];
  @IsOptional() @IsString() @MaxLength(40) coll?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) requiredDate?: string;
  @IsOptional() @IsArray() fabric?: Array<[string, string, string, string]>;
  @IsOptional() @IsString() @MaxLength(1000) instructions?: string;
  @IsArray() colors!: ColorDto[];
  @IsOptional() @IsBoolean() overQuota?: boolean;
}
class TnaDto { @IsObject() activities!: Record<string, { s?: string; e?: string }>; @Matches(/^\d{4}-\d{2}-\d{2}$/) plannedDelivery!: string; }
class ReturnDto { @IsString() @MaxLength(500) reason!: string; }
class FollowDto {
  @IsOptional() @IsIn(MERCH_STATUS) merchStatus?: string;
  @IsOptional() @IsIn(STATUS) labDipStatus?: string;
  @IsOptional() @IsIn(STATUS) trimsStatus?: string;
}
class QuotaDto { @Matches(/^\d{4}-\d{2}$/) month!: string; @IsString() @MaxLength(60) line!: string; @Type(() => Number) @IsInt() @Min(0) odQuota!: number; @Type(() => Number) @IsInt() @Min(0) smsQuota!: number; }
class YarnReqDto {
  @IsIn(['SAMPLE', 'PROJECTION']) type!: string;
  @IsOptional() @IsString() sampleSheetId?: string;
  @IsArray() lines!: Array<{ count: string; composition?: string; color?: string; kg: number }>;
}
class YarnReqStatusDto { @IsIn(['SENT_TO_PURCHASE', 'PO_ISSUED', 'LC_OPENED', 'IN_TRANSIT', 'PARTLY_RECEIVED', 'RECEIVED', 'CANCELLED']) status!: string; }

const month = (d: Date) => d.toISOString().slice(0, 7);
const sheetMonth = (s: { createdAt: Date }) => month(s.createdAt);

@Controller('merch/sample')
@UseGuards(JwtAuthGuard)
export class SampleMerchController {
  constructor(private prisma: PrismaService) {}

  private async loadSheet(id: string) {
    const s = await this.prisma.sampleOrderSheet.findUnique({ where: { id }, include: { colors: true } });
    if (!s) throw new NotFoundException('Sample order sheet not found');
    return s;
  }
  private assertOwner(a: { id: string; roles: string[] }, s: { merchandiserId: string | null; createdById: string }) {
    if (a.roles.includes('ADMIN') || a.roles.includes('MERCH_HEAD')) return;
    if ((s.merchandiserId || s.createdById) !== a.id) throw new ForbiddenException('Only the sheet merchandiser, merchandising head or admin can change this sheet');
  }
  private async quotaUse(line: string, m: string, types: string[]) {
    const isOD = types.some((t) => OD_TYPES.includes(t)), isSMS = types.includes('SMS');
    const q = await this.prisma.sampleQuota.findUnique({ where: { month_line: { month: m, line } } });
    const sheets = await this.prisma.sampleOrderSheet.findMany({ where: { subBrand: line, status: { not: 'RETURNED' }, createdAt: { gte: new Date(m + '-01T00:00:00Z'), lt: new Date(new Date(m + '-01T00:00:00Z').setUTCMonth(new Date(m + '-01T00:00:00Z').getUTCMonth() + 1)) } }, select: { sampleType: true, styleNo: true } });
    const styles = (pred: (t: string) => boolean) => new Set(sheets.filter((s) => s.sampleType.split('+').some((t) => pred(t.trim()))).map((s) => s.styleNo)).size;
    return {
      od: isOD ? quotaCheck(styles((t) => OD_TYPES.includes(t)), q?.odQuota || 0, 1) : null,
      sms: isSMS ? quotaCheck(styles((t) => t === 'SMS'), q?.smsQuota || 0, 1) : null,
    };
  }

  @Get('sheets')
  async list(@Req() req: any, @Query('status') status?: string, @Query('buyer') buyer?: string, @Query('q') q?: string) {
    const a = actorOf(req);
    const mine = a.roles.some((r) => SAMPLE_MERCH.includes(r)) && !a.roles.includes('MERCH_HEAD') && !a.roles.includes('ADMIN');
    return this.prisma.sampleOrderSheet.findMany({
      where: { AND: [status ? { status } : {}, buyer ? { buyerName: buyer } : {}, q ? { OR: [{ styleNo: { contains: q, mode: 'insensitive' } }, { sheetNo: { contains: q, mode: 'insensitive' } }] } : {}, mine ? { OR: [{ merchandiserId: a.id }, { merchandiserId: null, createdById: a.id }] } : {}] },
      include: { colors: true }, orderBy: { createdAt: 'desc' }, take: 500,
    });
  }

  @Get('quota')
  async quota(@Query('month') m?: string) {
    const mm = m && /^\d{4}-\d{2}$/.test(m) ? m : month(new Date());
    const quotas = await this.prisma.sampleQuota.findMany({ where: { month: mm }, orderBy: { line: 'asc' } });
    return Promise.all(quotas.map(async (q) => ({ ...q, used: await this.quotaUse(q.line, mm, ['Development', 'SMS']) })));
  }

  @Put('quota')
  async setQuota(@Body() dto: QuotaDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, ['MERCH_HEAD'], 'Quota setting');
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.sampleQuota.upsert({ where: { month_line: { month: dto.month, line: dto.line } }, update: { odQuota: dto.odQuota, smsQuota: dto.smsQuota }, create: { ...dto } });
      await audit(tx, a, 'SAMPLE_QUOTA_SET', 'SAMPLE_QUOTA', r.id, null, dto);
      return r;
    });
  }

  @Post('sheets')
  async create(@Body() dto: SheetDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, SAMPLE_MERCH, 'Sample order entry');
    if (!dto.sampleTypes.length) throw new BadRequestException('Choose the sample type');
    if (!dto.colors.length) throw new BadRequestException('Add at least one colour with quantity');
    const needsFabric = dto.sampleTypes.some((t) => ['SMS', 'PP', 'APP'].includes(t));
    if (needsFabric && !(dto.fabric || []).length) throw new BadRequestException('SMS, PP and APP samples need the fabric details (knitting and dyeing)');
    const line = dto.subBrand || dto.buyerName;
    const q = await this.quotaUse(line, month(new Date()), dto.sampleTypes);
    if ((q.od?.over || q.sms?.over) && !dto.overQuota) throw new BadRequestException(`Monthly quota for ${line} is full. Send again with overQuota = true to let Sample Planning decide.`);
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.sampleOrderSheet.count({ where: { createdAt: { gte: new Date(month(new Date()) + '-01T00:00:00Z') } } });
      const sheet = await tx.sampleOrderSheet.create({
        data: {
          sheetNo: sampleSheetNo(count + 1), buyerName: dto.buyerName, subBrand: dto.subBrand || null, styleNo: dto.styleNo.trim(), styleName: dto.styleName || null,
          sampleType: dto.sampleTypes.join(' + '), coll: dto.coll || null, merchandiserId: a.id, requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null,
          fabric: dto.fabric ? toJson(dto.fabric) : undefined, instructions: dto.instructions || null, createdById: a.id,
          colors: { create: dto.colors.map((c) => ({ color: c.color.trim(), qty: c.qty })) },
        },
        include: { colors: true },
      });
      await tx.task.create({ data: { title: `Sample TNA: ${sheet.sheetNo} / ${sheet.styleNo}`, module: 'SAMPLE', entityType: 'SAMPLE_SHEET', entityId: sheet.id, ownerRoleCode: 'SAMPLE' } });
      for (const t of ['Lab dip', 'Trims ordering'].concat(dto.sampleTypes.includes('SMS') ? ['Costing', 'Yarn requisition'] : [])) {
        await tx.task.create({ data: { title: `${t}: ${sheet.sheetNo} / ${sheet.styleNo}`, module: 'SAMPLE', entityType: 'SAMPLE_SHEET', entityId: sheet.id, ownerUserId: a.id } });
      }
      await audit(tx, a, 'SAMPLE_SHEET_CREATED', 'SAMPLE_SHEET', sheet.id, null, { ...dto, overQuota: !!dto.overQuota, quota: q });
      return sheet;
    });
  }

  @Put('sheets/:id')
  async resubmit(@Param('id') id: string, @Body() dto: SheetDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, SAMPLE_MERCH, 'Sample order sheet');
    const s = await this.loadSheet(id); this.assertOwner(a, s);
    if (s.status !== 'RETURNED') throw new BadRequestException('Only a returned sheet can be edited and sent again');
    return this.prisma.$transaction(async (tx) => {
      await tx.sampleOrderColor.deleteMany({ where: { sheetId: id } });
      const after = await tx.sampleOrderSheet.update({
        where: { id },
        data: { styleName: dto.styleName || null, sampleType: dto.sampleTypes.join(' + '), coll: dto.coll || null, requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null, fabric: dto.fabric ? toJson(dto.fabric) : undefined, instructions: dto.instructions || null, status: 'TNA_PENDING', returnReason: null, colors: { create: dto.colors.map((c) => ({ color: c.color.trim(), qty: c.qty })) } },
        include: { colors: true },
      });
      await tx.task.create({ data: { title: `Sample TNA: ${after.sheetNo} / ${after.styleNo}`, module: 'SAMPLE', entityType: 'SAMPLE_SHEET', entityId: id, ownerRoleCode: 'SAMPLE' } });
      await audit(tx, a, 'SAMPLE_SHEET_RESUBMITTED', 'SAMPLE_SHEET', id, { status: s.status, reason: s.returnReason }, { status: 'TNA_PENDING' });
      return after;
    });
  }

  @Post('sheets/:id/tna')
  async approveTna(@Param('id') id: string, @Body() dto: TnaDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, SAMPLE_PLANNING, 'Sample TNA');
    const s = await this.loadSheet(id);
    if (s.status !== 'TNA_PENDING') throw new BadRequestException('This sheet is not waiting for a TNA');
    for (const k of Object.keys(dto.activities)) if (!TNA_ACTIVITIES.includes(k)) throw new BadRequestException(`Unknown activity ${k}`);
    const sew = dto.activities.Sewing;
    if (!sew?.s || !sew?.e || sew.e < sew.s) throw new BadRequestException('Sewing start and end are required, end on or after start');
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.sampleOrderSheet.update({ where: { id }, data: { status: 'APPROVED', tna: toJson(dto.activities), plannedDelivery: new Date(dto.plannedDelivery) } });
      await tx.task.updateMany({ where: { module: 'SAMPLE', entityId: id, title: { startsWith: 'Sample TNA:' }, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await audit(tx, a, 'SAMPLE_TNA_APPROVED', 'SAMPLE_SHEET', id, { status: s.status }, { status: 'APPROVED', tna: dto.activities, plannedDelivery: dto.plannedDelivery });
      return after;
    });
  }

  @Post('sheets/:id/return')
  async returnSheet(@Param('id') id: string, @Body() dto: ReturnDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, SAMPLE_PLANNING, 'Return order sheet');
    const s = await this.loadSheet(id);
    if (s.status !== 'TNA_PENDING') throw new BadRequestException('Only a sheet waiting for TNA can be returned');
    if (!dto.reason.trim()) throw new BadRequestException('Give the reason for returning');
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.sampleOrderSheet.update({ where: { id }, data: { status: 'RETURNED', returnReason: dto.reason.trim() } });
      await tx.task.updateMany({ where: { module: 'SAMPLE', entityId: id, title: { startsWith: 'Sample TNA:' }, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'CANCELLED' } });
      await tx.task.create({ data: { title: `Returned by Sample Planning: ${s.sheetNo} / ${s.styleNo}`, module: 'SAMPLE', entityType: 'SAMPLE_SHEET', entityId: id, ownerUserId: s.merchandiserId || s.createdById } });
      await audit(tx, a, 'SAMPLE_SHEET_RETURNED', 'SAMPLE_SHEET', id, { status: s.status }, { status: 'RETURNED', reason: dto.reason });
      return after;
    });
  }

  @Patch('sheets/:id/follow')
  async follow(@Param('id') id: string, @Body() dto: FollowDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, SAMPLE_MERCH, 'Sample follow-up');
    const s = await this.loadSheet(id); this.assertOwner(a, s);
    const data: any = {};
    for (const k of ['merchStatus', 'labDipStatus', 'trimsStatus'] as const) if (dto[k] !== undefined) data[k] = dto[k];
    if (!Object.keys(data).length) throw new BadRequestException('Nothing to update');
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.sampleOrderSheet.update({ where: { id }, data });
      await audit(tx, a, 'SAMPLE_FOLLOW_UP', 'SAMPLE_SHEET', id, Object.fromEntries(Object.keys(data).map((k) => [k, (s as any)[k]])), data);
      return after;
    });
  }

  // ---------- yarn requisition (to Purchase) ----------
  @Post('yarn-requisitions')
  async createYarnReq(@Body() dto: YarnReqDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, SAMPLE_MERCH, 'Yarn requisition');
    if (!dto.lines.length || dto.lines.some((l) => !String(l.count || '').trim() || !(Number(l.kg) > 0))) throw new BadRequestException('Every line needs a yarn count and kg above 0');
    const sheet = dto.sampleSheetId ? await this.loadSheet(dto.sampleSheetId) : null;
    if (dto.type === 'SAMPLE' && !sheet) throw new BadRequestException('A sample yarn requisition must be linked to a sample order sheet');
    return this.prisma.$transaction(async (tx) => {
      const n = (await tx.yarnRequisition.count()) + 1;
      const totalKg = dto.lines.reduce((s, l) => s + Number(l.kg), 0);
      const r = await tx.yarnRequisition.create({ data: { reqNo: `YR-${new Date().toISOString().slice(2, 7).replace('-', '')}-${String(n).padStart(4, '0')}`, type: dto.type, sampleSheetId: sheet?.id || null, styleNo: sheet?.styleNo || null, buyerName: sheet?.buyerName || null, lines: toJson(dto.lines), totalKg, createdById: a.id } });
      if (sheet) await tx.sampleOrderSheet.update({ where: { id: sheet.id }, data: { yarnReqStatus: 'SENT_TO_PURCHASE' } });
      await tx.task.create({ data: { title: `Yarn requisition ${r.reqNo}${sheet ? ' / ' + sheet.styleNo : ''}`, module: 'PROCUREMENT', entityType: 'YARN_REQUISITION', entityId: r.id, ownerRoleCode: 'PROCUREMENT' } });
      await audit(tx, a, 'YARN_REQUISITION_CREATED', 'YARN_REQUISITION', r.id, null, dto);
      return r;
    });
  }

  @Get('yarn-requisitions')
  async yarnReqs(@Query('status') status?: string) {
    return this.prisma.yarnRequisition.findMany({ where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, take: 300 });
  }

  @Patch('yarn-requisitions/:id/status')
  async yarnReqStatus(@Param('id') id: string, @Body() dto: YarnReqStatusDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, ['PROCUREMENT'], 'Yarn requisition status');
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.yarnRequisition.findUnique({ where: { id } });
      if (!r) throw new NotFoundException('Yarn requisition not found');
      const after = await tx.yarnRequisition.update({ where: { id }, data: { status: dto.status } });
      if (dto.status === 'RECEIVED' || dto.status === 'CANCELLED') await tx.task.updateMany({ where: { module: 'PROCUREMENT', entityId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: dto.status === 'RECEIVED' ? 'COMPLETED' : 'CANCELLED', completedAt: new Date() } });
      await audit(tx, a, 'YARN_REQUISITION_STATUS', 'YARN_REQUISITION', id, { status: r.status }, { status: dto.status });
      return after;
    });
  }
}
