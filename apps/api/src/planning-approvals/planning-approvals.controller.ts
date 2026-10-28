import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, changeStep, loadStyle, requireRole, stepDataOf, stepMapOf, STYLE_INCLUDE, toJson } from '../merch/merch.common';
import { canAct, PLANNING_ROLES } from '../merch/merch.rules';
import { OD_TYPES, SAMPLE_PLANNING, sampleQuotaUse } from '../merch/sample-merch.controller';
import { ageDays, checkRelease, colourQty, DocKey, nextAction, releaseDraft, ReleaseLine } from './pa.rules';

const DOCS = ['FABRIC_SHEET', 'TNA'];
const DOC_NAME: Record<DocKey, string> = { FABRIC_SHEET: 'fabric order sheet', TNA: 'TNA' };
const TNA_TASK = 'Generate and approve TNA:';

class SignedDto { @IsIn(DOCS) doc!: DocKey; @IsOptional() @IsString() @MaxLength(200) note?: string; }
class ReturnDto { @IsIn(DOCS) doc!: DocKey; @IsString() @MaxLength(300) reason!: string; }
class LineDto {
  @IsString() @MaxLength(80) colour!: string; @IsOptional() @IsString() @MaxLength(40) colourCode?: string; @IsOptional() @IsString() @MaxLength(60) part?: string;
  @IsString() @MaxLength(120) fabric!: string; @IsOptional() @IsString() @MaxLength(20) gsm?: string; @IsOptional() @IsString() @MaxLength(120) composition?: string;
  @Type(() => Number) @IsNumber() @Min(0.1) finishKg!: number;
}
class ReleaseDto { @IsArray() @ValidateNested({ each: true }) @Type(() => LineDto) lines!: LineDto[]; }

const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (v: unknown) => { const x = parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };
const month = (d: Date) => d.toISOString().slice(0, 7);
const PLANNERS = [...PLANNING_ROLES, ...SAMPLE_PLANNING];

/**
 * Central Planning / Sample Planning approval desk.
 * One queue for: sample order sheets waiting for TNA (with quota), bulk fabric order sheets and TNAs waiting for approval,
 * approved jobs not yet released to knitting, and jobs missing the item / print-emb description.
 * Approve / generate / description endpoints stay in /merch/bulk and /merch/sample; this desk adds the signed-copy gate,
 * return-to-merchandiser and the release to knitting.
 */
@Controller('planning/approvals')
@UseGuards(JwtAuthGuard)
export class PlanningApprovalsController {
  constructor(private prisma: PrismaService) {}

  @Get('queue')
  async queue(@Req() req: any, @Query('month') m?: string) {
    const a = actorOf(req); requireRole(a, PLANNERS, 'Planning approvals');
    const now = new Date(); const mm = m && /^\d{4}-\d{2}$/.test(m) ? m : month(now);
    const out: { bulk: any[]; sample: any[]; quota: any[] } = { bulk: [], sample: [], quota: [] };

    if (canAct(a.roles, PLANNING_ROLES)) {
      const styles = await this.prisma.style.findMany({
        where: { merchSteps: { some: { step: { in: DOCS }, status: { in: ['SENT', 'DONE'] } } } },
        include: STYLE_INCLUDE, take: 500,
      });
      for (const s of styles) {
        const st = stepMapOf(s.merchSteps), fd = stepDataOf(s.merchSteps, 'FABRIC_SHEET'), td = stepDataOf(s.merchSteps, 'TNA');
        const row = (k: string) => s.merchSteps.find((x) => x.step === k);
        const flags = { fabric: st.FABRIC_SHEET, tna: st.TNA, fabricSigned: !!fd.signedCopy, tnaSigned: !!td.signedCopy, tnaGenerated: !!td.rows, descMissing: !s.planningItemDesc || (!!s.printEmbType && s.printEmbType !== 'None' && !s.printEmbDesc), released: !!fd.release };
        const action = nextAction(flags);
        if (!action) continue;
        const waitingSince = st.FABRIC_SHEET === 'SENT' ? row('FABRIC_SHEET')?.updatedAt : st.TNA === 'SENT' ? row('TNA')?.updatedAt : (row('TNA')?.doneAt || row('FABRIC_SHEET')?.doneAt);
        out.bulk.push({
          styleId: s.id, jobNo: s.order.jobNo, buyer: s.order.buyer.name, styleNo: s.styleNo, item: s.itemDescription, qty: s.quantity, imageUrl: s.imageUrl,
          merchandiserId: s.order.merchandiserId || s.order.createdById, shipDate: ymd(s.purchaseOrders[0]?.ccd),
          fabric: { status: st.FABRIC_SHEET, signedCopy: fd.signedCopy || null, finishKg: fd.finishKg ?? null, greyKg: fd.greyKg ?? null, lossPct: fd.lossPct ?? null, returned: fd.returned || null },
          tna: { status: st.TNA, generated: !!td.rows, signedCopy: td.signedCopy || null, returned: td.returned || null },
          descriptions: { item: s.planningItemDesc, printEmbType: s.printEmbType, printEmb: s.printEmbDesc, missing: flags.descMissing },
          release: fd.release || null, nextAction: action, ageDays: ageDays(waitingSince, now),
        });
      }
      out.bulk.sort((x, y) => y.ageDays - x.ageDays);
    }

    if (canAct(a.roles, SAMPLE_PLANNING)) {
      const sheets = await this.prisma.sampleOrderSheet.findMany({ where: { status: 'TNA_PENDING' }, include: { colors: true }, orderBy: { createdAt: 'asc' }, take: 500 });
      const cache = new Map<string, any>();
      for (const sh of sheets) {
        const line = sh.subBrand || sh.buyerName, sm = month(sh.createdAt), types = sh.sampleType.split('+').map((t) => t.trim());
        const key = `${line}|${sm}|${types.join(',')}`;
        if (!cache.has(key)) cache.set(key, await sampleQuotaUse(this.prisma, line, sm, types));
        const q = cache.get(key);
        const over = (c: any) => !!c && c.quota > 0 && c.used > c.quota; // this sheet is already counted in "used"
        out.sample.push({
          id: sh.id, sheetNo: sh.sheetNo, buyer: sh.buyerName, line, styleNo: sh.styleNo, styleName: sh.styleName, sampleType: sh.sampleType, coll: sh.coll,
          requiredDate: ymd(sh.requiredDate), qty: sh.colors.reduce((t, c) => t + c.qty, 0), colours: sh.colors.map((c) => ({ colour: c.color, qty: c.qty })),
          merchandiserId: sh.merchandiserId || sh.createdById, quota: { od: q.od, sms: q.sms, overQuota: over(q.od) || over(q.sms) }, ageDays: ageDays(sh.createdAt, now),
          nextAction: 'Set sample TNA or return',
        });
      }
      const quotas = await this.prisma.sampleQuota.findMany({ where: { month: mm }, orderBy: { line: 'asc' } });
      for (const q of quotas) {
        const u = await sampleQuotaUse(this.prisma, q.line, mm, [OD_TYPES[0], 'SMS']);
        out.quota.push({ line: q.line, month: mm, od: { used: u.od?.used ?? 0, quota: q.odQuota, full: q.odQuota > 0 && (u.od?.used ?? 0) >= q.odQuota }, sms: { used: u.sms?.used ?? 0, quota: q.smsQuota, full: q.smsQuota > 0 && (u.sms?.used ?? 0) >= q.smsQuota } });
      }
    }
    return { ...out, counts: { bulk: out.bulk.length, sample: out.sample.length, overQuota: out.sample.filter((x) => x.quota.overQuota).length, releaseDue: out.bulk.filter((x) => x.nextAction === 'Release to knitting').length, over3Days: [...out.bulk, ...out.sample].filter((x) => x.ageDays > 3).length } };
  }

  /** Records that the physically signed copy reached Planning. Required before the approval click (agreed rule). */
  @Put('jobs/:styleId/signed-copy')
  async signed(@Param('styleId') id: string, @Body() dto: SignedDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'Signed copy');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps)[dto.doc] !== 'SENT') throw new BadRequestException(`No ${DOC_NAME[dto.doc]} is waiting with Planning`);
      const before = stepDataOf(s.merchSteps, dto.doc);
      const signedCopy = { receivedById: a.id, receivedBy: a.name || null, receivedAt: new Date().toISOString(), note: dto.note || null };
      await tx.merchStep.update({ where: { styleId_step: { styleId: id, step: dto.doc } }, data: { data: toJson({ ...before, signedCopy }) } });
      await audit(tx, a, `PLANNING_SIGNED_COPY_${dto.doc}`, 'STYLE', id, before.signedCopy || null, signedCopy);
      return { doc: dto.doc, signedCopy };
    });
  }

  /** Sends a fabric order sheet or TNA back to the merchandiser with a reason; they correct it and send again. */
  @Post('jobs/:styleId/return')
  async returnDoc(@Param('styleId') id: string, @Body() dto: ReturnDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'Return to merchandiser');
    const reason = String(dto.reason || '').trim(); if (!reason) throw new BadRequestException('Give the reason for returning');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      if (stepMapOf(s.merchSteps)[dto.doc] !== 'SENT') throw new BadRequestException(`No ${DOC_NAME[dto.doc]} is waiting with Planning`);
      const returned = { reason, byId: a.id, by: a.name || null, at: new Date().toISOString() };
      const res = await changeStep(tx, a, s, dto.doc, 'READY', { returned, signedCopy: null });
      if (dto.doc === 'TNA') await tx.task.updateMany({ where: { module: 'MERCH', entityId: id, title: { startsWith: TNA_TASK }, status: { in: ['PENDING', 'IN_PROGRESS'] } }, data: { status: 'CANCELLED' } });
      await tx.task.create({ data: { title: `Returned by Planning (${DOC_NAME[dto.doc]}): ${s.order.jobNo} / ${s.styleNo} — ${reason}`.slice(0, 250), module: 'MERCH', entityType: 'STYLE', entityId: id, orderId: s.orderId, ownerUserId: s.order.merchandiserId || s.order.createdById } });
      return { ...res, returned };
    });
  }

  /** Suggested knitting release lines from CAD consumption × colour quantity. Planning may edit before releasing. */
  @Get('jobs/:styleId/release-draft')
  async draft(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'Knitting release');
    const s = await loadStyle(this.prisma, id);
    const fd = stepDataOf(s.merchSteps, 'FABRIC_SHEET'), cad = stepDataOf(s.merchSteps, 'CAD');
    const lines = releaseDraft(colourQty(s.breakdowns as any), cad.parts || [], fd.colorCodes || {});
    return { lines, approvedFinishKg: num(fd.finishKg), check: checkRelease(lines, num(fd.finishKg)), release: fd.release || null };
  }

  /** Final step: both documents approved → fabric requirement goes to the knitting planner as a pending job. */
  @Post('jobs/:styleId/release')
  async release(@Param('styleId') id: string, @Body() dto: ReleaseDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNING_ROLES, 'Knitting release');
    return this.prisma.$transaction(async (tx) => {
      const s = await loadStyle(tx, id);
      const st = stepMapOf(s.merchSteps), fd = stepDataOf(s.merchSteps, 'FABRIC_SHEET'), td = stepDataOf(s.merchSteps, 'TNA');
      if (st.FABRIC_SHEET !== 'DONE' || st.TNA !== 'DONE') throw new BadRequestException('Approve both the fabric order sheet and the TNA before releasing');
      if (fd.release) throw new BadRequestException(`Already released to knitting on ${String(fd.release.at).slice(0, 10)}`);
      const lines = dto.lines.map((l) => ({ ...l, colour: l.colour.trim(), fabric: l.fabric.trim(), finishKg: Math.round(num(l.finishKg) * 10) / 10 })) as ReleaseLine[];
      const chk = checkRelease(lines, num(fd.finishKg));
      if (!chk.ok) throw new BadRequestException(chk.errors.join('; '));
      const knitEnd = td.rows?.knit?.e || null; // company TNA key for knitting (merch.rules generateTna)
      const job = await tx.knitJob.create({ data: {
        jobCode: s.order.jobNo, buyer: s.order.buyer.name, style: s.styleNo, merchandiser: s.order.merchandiserId || null,
        shipDate: s.purchaseOrders[0]?.ccd || null, taClose: knitEnd ? new Date(knitEnd) : null, approvedAt: new Date(), status: 'PENDING_PLANNING',
        lines: toJson(lines.map((l) => ({ colour: l.colour, part: l.part, fabric: l.fabric, gsm: l.gsm, composition: l.composition, colourCode: l.colourCode, finishKg: l.finishKg }))), createdById: a.id,
      } });
      await tx.task.create({ data: { title: `Plan knitting: ${job.jobCode} / ${s.styleNo}`, module: 'KNITTING', entityType: 'KNIT_JOB', entityId: job.id, orderId: s.orderId, ownerRoleCode: 'KNIT_PLANNER' } });
      const release = { at: new Date().toISOString(), byId: a.id, by: a.name || null, knitJobId: job.id, totalFinishKg: chk.total, lines: lines.length, warnings: chk.warnings };
      await tx.merchStep.update({ where: { styleId_step: { styleId: id, step: 'FABRIC_SHEET' } }, data: { data: toJson({ ...fd, release }) } });
      await audit(tx, a, 'PLANNING_RELEASED_TO_KNITTING', 'STYLE', id, null, { release, lines });
      return { release, knitJobId: job.id, warnings: chk.warnings };
    });
  }

  /** Full approval history of one job (who sent, signed copy, returned, approved, released). */
  @Get('jobs/:styleId/history')
  async history(@Param('styleId') id: string, @Req() req: any) {
    const a = actorOf(req); requireRole(a, PLANNERS, 'Planning approvals');
    const s = await this.prisma.style.findUnique({ where: { id }, select: { id: true } }); if (!s) throw new NotFoundException('Job / style not found');
    return this.prisma.auditLog.findMany({ where: { entityType: 'STYLE', entityId: id, OR: [{ action: { startsWith: 'PLANNING_' } }, { action: { startsWith: 'MERCH_STEP_FABRIC_SHEET' } }, { action: { startsWith: 'MERCH_STEP_TNA' } }, { action: { startsWith: 'MERCH_TNA' } }, { action: 'MERCH_DESCRIPTIONS' }] }, orderBy: { createdAt: 'asc' }, take: 200 });
  }
}
