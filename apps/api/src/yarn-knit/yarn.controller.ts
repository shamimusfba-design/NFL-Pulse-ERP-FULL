import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, requireRole, toJson } from '../merch/merch.common';
import { countStatus, idleClass, issueCheck, n, parseCount, r2, receiveCheck, requisitionState, R, ymd } from './yk.rules';

const D = /^\d{4}-\d{2}-\d{2}$/;
const day = (s?: string | null) => (s ? new Date(s + 'T00:00:00Z') : null);
const iso = (d?: Date | null) => (d ? ymd(d) : null);
type Tx = Prisma.TransactionClient;

class ReqLineDto { @IsString() countCode!: string; @IsOptional() @IsString() yarnType?: string; @IsOptional() @IsString() composition?: string; @IsOptional() @IsString() shade?: string; @Type(() => Number) @IsNumber() @Min(0.01) kg!: number; }
class RequisitionDto {
  @IsOptional() @IsString() @MaxLength(40) buyer?: string;
  @IsOptional() @IsString() @MaxLength(60) style?: string;
  @IsIn(['PROJECTED', 'CONFIRMED']) basis!: string;
  @IsOptional() @Matches(D) requiredDate?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
  @IsArray() lines!: ReqLineDto[];
}
class ReturnNoteDto { @IsString() @MaxLength(300) note!: string; }
class PoLineDto { @IsString() countCode!: string; @Type(() => Number) @IsNumber() @Min(0.01) kg!: number; }
class PurchaseOrderDto {
  @IsOptional() @IsString() requisitionId?: string;
  @IsString() @MaxLength(60) supplier!: string;
  @IsString() @MaxLength(40) poNo!: string;
  @IsOptional() @IsString() piNo?: string; @IsOptional() @IsString() lcNo?: string; @IsOptional() @Matches(D) lcDate?: string; @IsOptional() @Matches(D) eta?: string;
  @IsArray() lines!: PoLineDto[];
}
class PipelinePatchDto { @IsOptional() @IsIn(['ORDERED', 'LC_OPENED', 'SHIPPED', 'IN_TRANSIT', 'AT_PORT', 'CANCELLED']) status?: string; @IsOptional() @Matches(D) eta?: string; }
class ReceiptDto {
  @IsString() purchaseLineId!: string; @Matches(D) date!: string;
  @IsString() @MaxLength(160) yarnDesc!: string; @IsString() @MaxLength(40) lotNo!: string; @IsOptional() @IsString() lpNo?: string; @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() invoiceNo?: string; @IsOptional() @IsString() challanNo?: string; @IsOptional() @Type(() => Number) @IsNumber() bags?: number; @IsOptional() @Type(() => Number) @IsNumber() cones?: number;
  @Type(() => Number) @IsNumber() kg!: number; @IsIn(['PASSED', 'PENDING', 'HOLD', 'REJECTED']) qcStatus!: string; @IsOptional() @IsString() clientRef?: string;
}
class IssueDto {
  @IsString() lotId!: string; @IsOptional() @IsString() knitLineId?: string; @IsString() @MaxLength(60) jobCode!: string; @IsOptional() @IsString() colour?: string;
  @IsString() @MaxLength(60) party!: string; @IsString() @MaxLength(40) programNo!: string; @Matches(D) date!: string;
  @Type(() => Number) @IsNumber() kg!: number; @IsOptional() @Type(() => Number) @IsNumber() bags?: number; @IsOptional() @Type(() => Number) @IsNumber() cones?: number; @IsOptional() @IsString() challanNo?: string; @IsOptional() @IsString() clientRef?: string;
}
class ReturnDto { @IsString() lotId!: string; @IsString() party!: string; @IsOptional() @IsString() jobCode?: string; @IsOptional() @IsString() programNo?: string; @Matches(D) date!: string; @Type(() => Number) @IsNumber() @Min(0.01) kg!: number; @IsOptional() @IsString() reason?: string; }
class QcDto { @IsIn(['PASSED', 'PENDING', 'HOLD', 'REJECTED']) qcStatus!: string; }
class DeadDto { @IsIn(['REVIEW', 'REALLOCATE', 'RETURN_TO_SUPPLIER', 'SELL', 'WRITE_OFF', 'KEEP']) action!: string; @IsOptional() @IsString() note?: string; }
class ImportDto { @IsOptional() @IsArray() counts?: Array<{ code: string; moqKg: number; yarnType?: string }>; @IsOptional() @IsArray() lots?: Array<{ yarnDesc: string; countCode?: string; supplier?: string; lotNo: string; lpNo?: string; receivedAt?: string; lcNo?: string; location?: string; closingKg: number }>; @Matches(D) asOf!: string; }

async function nextNo(tx: Tx, model: 'yarnReceipt' | 'yarnIssue' | 'yarnReturn' | 'yarnRequisition', field: string, prefix: string) {
  const p = `${prefix}-${ymd(new Date()).slice(2, 4)}${ymd(new Date()).slice(5, 7)}-`;
  const c = await (tx[model] as any).count({ where: { [field]: { startsWith: p } } });
  return p + String(c + 1).padStart(4, '0');
}
async function lotBalance(tx: Tx, lotId: string) { const a = await tx.yarnLedger.aggregate({ where: { lotId }, _sum: { kg: true } }); return n(a._sum.kg); }

@Controller('yarn')
@UseGuards(JwtAuthGuard)
export class YarnController {
  constructor(private prisma: PrismaService) {}

  // ---------- stock ----------
  @Get('counts')
  async counts() {
    const today = ymd(new Date());
    const [counts, lots, bal, pipe, lines, prod] = await Promise.all([
      this.prisma.yarnCount.findMany(), this.prisma.yarnLot.findMany({ select: { id: true, countCode: true, qcStatus: true } }),
      this.prisma.yarnLedger.groupBy({ by: ['lotId'], _sum: { kg: true } }),
      this.prisma.yarnPurchaseLine.findMany({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.knitLine.findMany({ where: { countType: { not: null } }, select: { id: true, countType: true, orderKg: true, finalKg: true, openingKnitKg: true, stage: true } }),
      this.prisma.knitProduction.groupBy({ by: ['knitLineId'], _sum: { knittedKg: true } }),
    ]);
    const B = new Map(bal.map((b) => [b.lotId, n(b._sum.kg)]));
    const P = new Map(prod.map((p) => [p.knitLineId, n(p._sum.knittedKg)]));
    const stock: Record<string, number> = {}, hold: Record<string, number> = {};
    lots.forEach((l) => { if (!l.countCode) return; const k = B.get(l.id) || 0; stock[l.countCode] = (stock[l.countCode] || 0) + k; if (l.qcStatus !== 'PASSED') hold[l.countCode] = (hold[l.countCode] || 0) + k; });
    const pp: Record<string, number> = {}, od: Record<string, number> = {};
    pipe.forEach((p) => { const b = Math.max(0, n(p.orderedKg) - n(p.receivedKg)); pp[p.countCode] = (pp[p.countCode] || 0) + b; if (p.eta && iso(p.eta)! < today) od[p.countCode] = (od[p.countCode] || 0) + b; });
    const need: Record<string, number> = {};
    lines.forEach((l) => { const order = l.stage === 'ACTIVE' && l.finalKg != null ? n(l.finalKg) : n(l.orderKg); const b = Math.max(0, order - n(l.openingKnitKg) - (P.get(l.id) || 0)); if (b > 0) need[l.countType!] = (need[l.countType!] || 0) + b; });
    return counts.map((c) => { const pc = parseCount(c.code); const s = { phys: r2(stock[c.code] || 0), moq: n(c.moqKg), pipe: r2(pp[c.code] || 0), overduePipe: r2(od[c.code] || 0), need: r2(need[c.code] || 0) };
      return { code: c.code, cnt: c.cnt || pc.cnt, composition: c.composition || pc.composition, shade: c.shade || pc.shade, yarnType: c.yarnType, ...s, holdKg: r2(hold[c.code] || 0), ...countStatus(s) }; });
  }

  @Get('lots')
  async lots(@Query('withStock') withStock = '1') {
    const today = ymd(new Date());
    const [lots, bal, lastIssue, dead] = await Promise.all([this.prisma.yarnLot.findMany(), this.prisma.yarnLedger.groupBy({ by: ['lotId'], _sum: { kg: true } }), this.prisma.yarnLedger.groupBy({ by: ['lotId'], where: { kind: 'ISSUE' }, _max: { date: true } }), this.prisma.yarnDeadAction.findMany()]);
    const B = new Map(bal.map((b) => [b.lotId, n(b._sum.kg)])), LI = new Map(lastIssue.map((x) => [x.lotId, x._max.date])), DA = new Map(dead.map((d) => [d.lotId, d.action]));
    return lots.map((l) => { const since = LI.get(l.id) || l.receivedAt; const idle = since ? Math.round((Date.parse(today) - since.getTime()) / 864e5) : null;
      return { ...l, receivedAt: iso(l.receivedAt), balanceKg: r2(B.get(l.id) || 0), idleDays: idle, idleClass: idleClass(idle), deadAction: DA.get(l.id) || null }; })
      .filter((l) => withStock !== '1' || l.balanceKg > 0);
  }

  @Put('lots/:id/dead-action')
  async deadAction(@Param('id') id: string, @Body() dto: DeadDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE.concat(['MANAGEMENT']), 'Dead stock action');
    return this.prisma.$transaction(async (tx) => { const r = await tx.yarnDeadAction.upsert({ where: { lotId: id }, update: { action: dto.action, note: dto.note, updatedById: a.id }, create: { lotId: id, action: dto.action, note: dto.note, updatedById: a.id } }); await audit(tx, a, 'YARN_DEAD_ACTION', 'YARN_LOT', id, null, dto); return r; });
  }

  @Patch('lots/:id/qc')
  async lotQc(@Param('id') id: string, @Body() dto: QcDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE.concat(['QUALITY']), 'QC status');
    return this.prisma.$transaction(async (tx) => { const before = await tx.yarnLot.findUnique({ where: { id } }); if (!before) throw new NotFoundException('Lot not found'); const r = await tx.yarnLot.update({ where: { id }, data: { qcStatus: dto.qcStatus } }); await audit(tx, a, 'YARN_LOT_QC', 'YARN_LOT', id, before.qcStatus, dto.qcStatus); return r; });
  }

  // ---------- requisitions ----------
  private validLines(lines: ReqLineDto[]) { if (!lines?.length || lines.some((l) => !l.countCode || !(n(l.kg) > 0))) throw new BadRequestException('Every line needs a count and kg above 0'); return lines.map((l) => { const pc = parseCount(l.countCode); return { countCode: l.countCode, yarnType: l.yarnType || null, composition: l.composition || pc.composition, shade: l.shade || pc.shade, kg: n(l.kg) }; }); }

  @Get('requisitions')
  async requisitions(@Query('status') status?: string) {
    const [reqs, pl] = await Promise.all([this.prisma.yarnRequisition.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }), this.prisma.yarnPurchaseLine.findMany({ where: { requisitionId: { not: null } } })]);
    return reqs.map((r) => ({ ...r, state: requisitionState(r.status, pl.filter((p) => p.requisitionId === r.id).map((p) => ({ orderedKg: n(p.orderedKg), receivedKg: n(p.receivedKg), status: p.status }))) })).filter((r) => !status || r.state === status);
  }

  @Post('requisitions')
  async createReq(@Body() dto: RequisitionDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.REQ, 'Yarn requisition');
    const isMerch = a.roles.some((r) => R.MERCH.includes(r)) && !a.roles.includes('YARN_STORE');
    if (isMerch && !dto.style) throw new BadRequestException('Enter the style no.');
    const lines = this.validLines(dto.lines);
    return this.prisma.$transaction(async (tx) => {
      const reqNo = await nextNo(tx, 'yarnRequisition', 'reqNo', 'YR');
      const r = await tx.yarnRequisition.create({ data: { reqNo, type: isMerch ? 'BULK' : 'MOQ', source: isMerch ? 'MERCHANDISER' : 'YARN_STORE', styleNo: dto.style || null, buyerName: dto.buyer || null, basis: dto.basis, requiredDate: day(dto.requiredDate), note: dto.note || null, lines: toJson(lines), totalKg: lines.reduce((s, l) => s + l.kg, 0), status: isMerch ? 'PENDING_STORE' : 'WITH_PURCHASE', approvedById: isMerch ? null : a.id, approvedAt: isMerch ? null : new Date(), createdById: a.id } });
      await tx.task.create({ data: { title: `${isMerch ? 'Review' : 'Order'} yarn requisition ${reqNo}`, module: isMerch ? 'YARN' : 'PROCUREMENT', entityType: 'YARN_REQUISITION', entityId: r.id, ownerRoleCode: isMerch ? 'YARN_STORE' : 'PROCUREMENT' } });
      await audit(tx, a, 'YARN_REQUISITION_CREATED', 'YARN_REQUISITION', r.id, null, { ...dto, lines });
      return r;
    });
  }

  @Put('requisitions/:id')
  async editReq(@Param('id') id: string, @Body() dto: RequisitionDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE, 'Requisition review');
    const lines = this.validLines(dto.lines);
    return this.prisma.$transaction(async (tx) => { const r = await tx.yarnRequisition.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Requisition not found'); if (r.status !== 'PENDING_STORE') throw new BadRequestException('Only a requisition waiting for the yarn store can be edited');
      const after = await tx.yarnRequisition.update({ where: { id }, data: { lines: toJson(lines), totalKg: lines.reduce((s, l) => s + l.kg, 0), basis: dto.basis, requiredDate: day(dto.requiredDate) ?? r.requiredDate, note: dto.note ?? r.note } });
      await audit(tx, a, 'YARN_REQUISITION_EDITED', 'YARN_REQUISITION', id, r.lines, lines); return after; });
  }

  @Post('requisitions/:id/approve')
  async approveReq(@Param('id') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE, 'Requisition approval');
    return this.prisma.$transaction(async (tx) => { const r = await tx.yarnRequisition.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Requisition not found'); if (r.status !== 'PENDING_STORE') throw new BadRequestException('This requisition is not waiting for the yarn store');
      const after = await tx.yarnRequisition.update({ where: { id }, data: { status: 'WITH_PURCHASE', approvedById: a.id, approvedAt: new Date() } });
      await tx.task.updateMany({ where: { entityType: 'YARN_REQUISITION', entityId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await tx.task.create({ data: { title: `Order yarn requisition ${r.reqNo}`, module: 'PROCUREMENT', entityType: 'YARN_REQUISITION', entityId: id, ownerRoleCode: 'PROCUREMENT' } });
      await audit(tx, a, 'YARN_REQUISITION_APPROVED', 'YARN_REQUISITION', id, r.status, 'WITH_PURCHASE'); return after; });
  }

  @Post('requisitions/:id/return')
  async returnReq(@Param('id') id: string, @Body() dto: ReturnNoteDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE, 'Requisition return');
    if (!dto.note.trim()) throw new BadRequestException('Write why it is returned');
    return this.prisma.$transaction(async (tx) => { const r = await tx.yarnRequisition.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Requisition not found'); if (r.status !== 'PENDING_STORE') throw new BadRequestException('This requisition is not waiting for the yarn store');
      const after = await tx.yarnRequisition.update({ where: { id }, data: { status: 'RETURNED', returnNote: dto.note.trim() } });
      await tx.task.updateMany({ where: { entityType: 'YARN_REQUISITION', entityId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'CANCELLED' } });
      await tx.task.create({ data: { title: `Returned by yarn store: ${r.reqNo}`, module: 'YARN', entityType: 'YARN_REQUISITION', entityId: id, ownerUserId: r.createdById } });
      await audit(tx, a, 'YARN_REQUISITION_RETURNED', 'YARN_REQUISITION', id, r.status, { status: 'RETURNED', note: dto.note }); return after; });
  }

  // ---------- purchase & pipeline ----------
  @Get('pipeline')
  async pipeline() { const today = ymd(new Date()); return (await this.prisma.yarnPurchaseLine.findMany({ orderBy: { createdAt: 'desc' } })).map((p) => { const bal = r2(Math.max(0, n(p.orderedKg) - n(p.receivedKg))); return { ...p, balanceKg: bal, state: p.status === 'CANCELLED' ? 'CANCELLED' : bal <= 0 ? 'RECEIVED' : n(p.receivedKg) > 0 ? 'PARTLY_RECEIVED' : p.status, overdue: !!(p.eta && iso(p.eta)! < today && bal > 0) }; }); }

  @Post('purchase-orders')
  async purchaseOrder(@Body() dto: PurchaseOrderDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.PURCHASE, 'Purchase order');
    if (!dto.lines?.length || dto.lines.some((l) => !l.countCode || !(n(l.kg) > 0))) throw new BadRequestException('Every line needs a count and kg above 0');
    return this.prisma.$transaction(async (tx) => {
      if (dto.requisitionId) { const r = await tx.yarnRequisition.findUnique({ where: { id: dto.requisitionId } }); if (!r) throw new NotFoundException('Requisition not found'); if (r.status !== 'WITH_PURCHASE') throw new BadRequestException('This requisition is not approved for purchase'); }
      const created: any[] = [];
      for (const l of dto.lines) created.push(await tx.yarnPurchaseLine.create({ data: { poNo: dto.poNo.trim(), requisitionId: dto.requisitionId || null, countCode: l.countCode, supplier: dto.supplier.trim(), piNo: dto.piNo || null, lcNo: dto.lcNo || null, lcDate: day(dto.lcDate), eta: day(dto.eta), orderedKg: n(l.kg), status: dto.lcNo ? 'LC_OPENED' : 'ORDERED', createdById: a.id } }));
      if (dto.requisitionId) await tx.task.updateMany({ where: { entityType: 'YARN_REQUISITION', entityId: dto.requisitionId, ownerRoleCode: 'PROCUREMENT', status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await audit(tx, a, 'YARN_PO_PLACED', 'YARN_PO', dto.poNo, null, dto);
      return created;
    }).catch((e) => { if (e?.code === 'P2002') throw new BadRequestException('This PO already has a line for that count'); throw e; });
  }

  @Patch('pipeline/:id')
  async pipelinePatch(@Param('id') id: string, @Body() dto: PipelinePatchDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.PURCHASE, 'Pipeline update');
    return this.prisma.$transaction(async (tx) => { const p = await tx.yarnPurchaseLine.findUnique({ where: { id } }); if (!p) throw new NotFoundException('Purchase line not found');
      if (dto.status === 'CANCELLED' && n(p.receivedKg) > 0) throw new BadRequestException('Part of this line is already received; it cannot be cancelled');
      const after = await tx.yarnPurchaseLine.update({ where: { id }, data: { status: dto.status ?? p.status, eta: dto.eta ? day(dto.eta) : p.eta } });
      await audit(tx, a, 'YARN_PIPELINE_UPDATED', 'YARN_PO', id, { status: p.status, eta: iso(p.eta) }, dto); return after; });
  }

  // ---------- receive (GRN) ----------
  @Post('receipts')
  async receive(@Body() dto: ReceiptDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE, 'Yarn receive');
    if (dto.clientRef) { const dup = await this.prisma.yarnReceipt.findUnique({ where: { clientRef: dto.clientRef } }); if (dup) return { duplicate: true, receipt: dup }; }
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.yarnPurchaseLine.findUnique({ where: { id: dto.purchaseLineId } }); if (!p) throw new NotFoundException('Purchase line not found');
      if (p.status === 'CANCELLED') throw new BadRequestException('This purchase line is cancelled');
      const err = receiveCheck(n(p.orderedKg), n(p.receivedKg), n(dto.kg)); if (err) throw new BadRequestException(err);
      const lot = await tx.yarnLot.upsert({ where: { yarnDesc_lotNo_lpNo: { yarnDesc: dto.yarnDesc.trim(), lotNo: dto.lotNo.trim(), lpNo: (dto.lpNo || '').trim() } }, update: { qcStatus: dto.qcStatus, location: dto.location || undefined }, create: { yarnDesc: dto.yarnDesc.trim(), countCode: p.countCode, supplier: p.supplier, lotNo: dto.lotNo.trim(), lpNo: (dto.lpNo || '').trim(), receivedAt: day(dto.date), lcNo: p.lcNo, location: dto.location || 'Yarn Store', qcStatus: dto.qcStatus } });
      const grnNo = await nextNo(tx, 'yarnReceipt', 'grnNo', 'GRN');
      const rc = await tx.yarnReceipt.create({ data: { grnNo, date: day(dto.date)!, purchaseLineId: p.id, lotId: lot.id, kg: n(dto.kg), bags: dto.bags ?? null, cones: dto.cones ?? null, invoiceNo: dto.invoiceNo || null, challanNo: dto.challanNo || null, qcStatus: dto.qcStatus, clientRef: dto.clientRef || null, createdById: a.id } });
      await tx.yarnLedger.create({ data: { lotId: lot.id, kind: 'RECEIPT', kg: n(dto.kg), date: day(dto.date)!, refType: 'YARN_RECEIPT', refId: rc.id, createdById: a.id } });
      await tx.yarnPurchaseLine.update({ where: { id: p.id }, data: { receivedKg: { increment: n(dto.kg) } } });
      await audit(tx, a, 'YARN_GRN_POSTED', 'YARN_RECEIPT', rc.id, null, { ...dto, grnNo, lotId: lot.id });
      return rc;
    });
  }

  @Get('receipts')
  async receipts() { return this.prisma.yarnReceipt.findMany({ orderBy: { date: 'desc' }, take: 2000 }); }

  // ---------- issue / return ----------
  @Post('issues')
  async issue(@Body() dto: IssueDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE, 'Yarn issue');
    if (dto.clientRef) { const dup = await this.prisma.yarnIssue.findUnique({ where: { clientRef: dto.clientRef } }); if (dup) return { duplicate: true, issue: dup }; }
    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.yarnLot.findUnique({ where: { id: dto.lotId } }); if (!lot) throw new NotFoundException('Lot not found');
      const bal = await lotBalance(tx, lot.id);
      const err = issueCheck(bal, lot.qcStatus, n(dto.kg)); if (err) throw new BadRequestException(err);
      if (dto.knitLineId && !(await tx.knitLine.findUnique({ where: { id: dto.knitLineId } }))) throw new BadRequestException('Knitting line not found');
      const issueNo = await nextNo(tx, 'yarnIssue', 'issueNo', 'ISS');
      const is = await tx.yarnIssue.create({ data: { issueNo, date: day(dto.date)!, lotId: lot.id, knitLineId: dto.knitLineId || null, jobCode: dto.jobCode.trim(), colour: dto.colour || null, party: dto.party.trim(), programNo: dto.programNo.trim(), kg: n(dto.kg), bags: dto.bags ?? null, cones: dto.cones ?? null, challanNo: dto.challanNo || null, clientRef: dto.clientRef || null, createdById: a.id } });
      await tx.yarnLedger.create({ data: { lotId: lot.id, kind: 'ISSUE', kg: -n(dto.kg), date: day(dto.date)!, refType: 'YARN_ISSUE', refId: is.id, createdById: a.id } });
      await audit(tx, a, 'YARN_ISSUED', 'YARN_ISSUE', is.id, { lotBalance: bal }, { ...dto, issueNo, lotBalance: r2(bal - n(dto.kg)) });
      return is;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((e) => { if (e?.code === 'P2034') throw new BadRequestException('Another issue from this lot was posted at the same time. Please try again.'); throw e; });
  }

  @Get('issues')
  async issues(@Query('jobCode') jobCode?: string) { return this.prisma.yarnIssue.findMany({ where: jobCode ? { jobCode } : {}, orderBy: { date: 'desc' }, take: 2000 }); }

  @Post('returns')
  async yarnReturn(@Body() dto: ReturnDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.STORE, 'Yarn return');
    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.yarnLot.findUnique({ where: { id: dto.lotId } }); if (!lot) throw new NotFoundException('Lot not found');
      const issued = await tx.yarnIssue.aggregate({ where: { lotId: lot.id, party: dto.party }, _sum: { kg: true } }); const returned = await tx.yarnReturn.aggregate({ where: { lotId: lot.id, party: dto.party }, _sum: { kg: true } });
      if (n(dto.kg) > n(issued._sum.kg) - n(returned._sum.kg) + 1e-9) throw new BadRequestException(`${dto.party} has only ${r2(n(issued._sum.kg) - n(returned._sum.kg))} kg of this lot to return`);
      const returnNo = await nextNo(tx, 'yarnReturn', 'returnNo', 'RET');
      const rt = await tx.yarnReturn.create({ data: { returnNo, date: day(dto.date)!, lotId: lot.id, party: dto.party, jobCode: dto.jobCode || null, programNo: dto.programNo || null, kg: n(dto.kg), reason: dto.reason || null, createdById: a.id } });
      await tx.yarnLedger.create({ data: { lotId: lot.id, kind: 'RETURN', kg: n(dto.kg), date: day(dto.date)!, refType: 'YARN_RETURN', refId: rt.id, createdById: a.id } });
      await audit(tx, a, 'YARN_RETURNED', 'YARN_RETURN', rt.id, null, dto); return rt;
    });
  }

  // ---------- import (opening data from the store and MOQ sheets) ----------
  @Post('import')
  async import(@Body() dto: ImportDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, [], 'Yarn import'); // admin only
    return this.prisma.$transaction(async (tx) => {
      let counts = 0, lots = 0;
      for (const c of dto.counts || []) { const pc = parseCount(c.code); await tx.yarnCount.upsert({ where: { code: c.code }, update: { moqKg: n(c.moqKg), yarnType: c.yarnType || undefined }, create: { code: c.code, cnt: pc.cnt || c.code, composition: pc.composition, shade: pc.shade, yarnType: c.yarnType || null, moqKg: n(c.moqKg) } }); counts++; }
      for (const l of dto.lots || []) {
        const lot = await tx.yarnLot.upsert({ where: { yarnDesc_lotNo_lpNo: { yarnDesc: l.yarnDesc, lotNo: l.lotNo, lpNo: l.lpNo || '' } }, update: {}, create: { yarnDesc: l.yarnDesc, countCode: l.countCode || null, supplier: l.supplier || null, lotNo: l.lotNo, lpNo: l.lpNo || '', receivedAt: day(l.receivedAt), lcNo: l.lcNo || null, location: l.location || null } });
        const opening = await tx.yarnLedger.findFirst({ where: { lotId: lot.id, kind: 'OPENING' } });
        if (!opening && n(l.closingKg) !== 0) { await tx.yarnLedger.create({ data: { lotId: lot.id, kind: 'OPENING', kg: n(l.closingKg), date: day(dto.asOf)!, refType: 'IMPORT', refId: dto.asOf, createdById: a.id } }); lots++; }
      }
      await audit(tx, a, 'YARN_IMPORT', 'YARN', dto.asOf, null, { counts, lots });
      return { counts, lotsWithOpening: lots };
    }, { timeout: 120000 });
  }
}
