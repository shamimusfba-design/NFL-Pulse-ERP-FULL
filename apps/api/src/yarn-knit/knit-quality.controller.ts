import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, requireRole } from '../merch/merch.common';
import { buyerCode, inspectionCheck, n, qualitySummary, R, r2, ymd } from './yk.rules';

const D = /^\d{4}-\d{2}-\d{2}$/;
const day = (s: string) => new Date(s + 'T00:00:00Z');
class InspectionDto { @IsString() lineId!: string; @Matches(D) date!: string; @IsOptional() @IsString() machine?: string; @IsOptional() @Type(() => Number) @IsNumber() rolls?: number; @Type(() => Number) @IsNumber() inspectedKg!: number; @IsString() @MaxLength(60) defect!: string; @Type(() => Number) @IsNumber() defectKg!: number; @Type(() => Number) @IsNumber() rejectedKg!: number; @IsIn(['PASS', 'HOLD', 'REJECT']) decision!: string; @IsOptional() @IsString() @MaxLength(500) remarks?: string; }

@Controller('knitting/quality')
@UseGuards(JwtAuthGuard)
export class KnitQualityController {
  constructor(private prisma: PrismaService) {}
  private async rows(q: Record<string, string | undefined>) {
    const where: any = { AND: [] as any[] };
    if (q.from && D.test(q.from)) where.AND.push({ date: { gte: day(q.from) } }); if (q.to && D.test(q.to)) where.AND.push({ date: { lte: day(q.to) } });
    if (q.defect) where.AND.push({ defect: q.defect }); if (q.decision) where.AND.push({ decision: q.decision });
    const rows = await this.prisma.knitInspection.findMany({ where, include: { line: { include: { outside: true } } }, orderBy: { date: 'desc' }, take: 5000 });
    return rows.map((r) => ({ id: r.id, inspNo: r.inspNo, date: ymd(r.date), lineId: r.knitLineId, jobCode: r.line.jobCode, buyer: buyerCode(r.line.buyer), colour: r.line.colour, fabric: r.line.fabric, fabricType: r.line.fabricType, factory: r.line.mode === 'IN_HOUSE' ? 'NFL (in-house)' : r.line.outside?.factory || 'Not assigned', machine: r.machine, rolls: r.rolls, inspectedKg: n(r.inspectedKg), defect: r.defect, defectKg: n(r.defectKg), rejectedKg: n(r.rejectedKg), decision: r.decision, remarks: r.remarks }))
      .filter((r) => (!q.buyer || r.buyer === q.buyer) && (!q.factory || r.factory === q.factory) && (!q.fabricType || r.fabricType === q.fabricType));
  }
  @Get('inspections') inspections(@Query() q: Record<string, string>) { return this.rows(q); }
  @Get('summary')
  async summary(@Query() q: Record<string, string>) {
    const R0 = await this.rows(q); const s = qualitySummary(R0);
    const grp = (f: (r: (typeof R0)[number]) => string) => { const o: Record<string, { key: string; inspectedKg: number; rejectedKg: number }> = {}; R0.forEach((r) => { const k = f(r) || '—'; const g = (o[k] = o[k] || { key: k, inspectedKg: 0, rejectedKg: 0 }); g.inspectedKg += r.inspectedKg; g.rejectedKg += r.rejectedKg; }); return Object.values(o).map((g) => ({ ...g, inspectedKg: r2(g.inspectedKg), rejectedKg: r2(g.rejectedKg), rejectionPct: g.inspectedKg ? r2((g.rejectedKg / g.inspectedKg) * 100) : 0 })); };
    return { ...s, byFactory: grp((r) => r.factory), byBuyer: grp((r) => r.buyer), byMonth: grp((r) => r.date.slice(0, 7)).sort((a, b) => a.key.localeCompare(b.key)) };
  }
  @Get('pending')
  async pending() {
    const [lines, prod, insp] = await Promise.all([this.prisma.knitLine.findMany({ include: { outside: true } }), this.prisma.knitProduction.groupBy({ by: ['knitLineId'], _sum: { knittedKg: true } }), this.prisma.knitInspection.groupBy({ by: ['knitLineId'], _sum: { inspectedKg: true } })]);
    const P = new Map(prod.map((p) => [p.knitLineId, n(p._sum.knittedKg)])), I = new Map(insp.map((p) => [p.knitLineId, n(p._sum.inspectedKg)]));
    return lines.map((l) => ({ lineId: l.id, jobCode: l.jobCode, colour: l.colour, fabric: l.fabric, factory: l.mode === 'IN_HOUSE' ? 'NFL (in-house)' : l.outside?.factory || 'Not assigned', knittedKg: r2((P.get(l.id) || 0)), toInspectKg: r2((P.get(l.id) || 0) - (I.get(l.id) || 0)) })).filter((x) => x.toInspectKg > 20).sort((a, b) => b.toInspectKg - a.toInspectKg);
  }
  @Post('inspections')
  async create(@Body() dto: InspectionDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, R.QUALITY, 'Knitting inspection');
    const err = inspectionCheck(n(dto.inspectedKg), n(dto.defectKg), n(dto.rejectedKg), dto.defect, dto.decision); if (err) throw new BadRequestException(err);
    return this.prisma.$transaction(async (tx) => {
      const l = await tx.knitLine.findUnique({ where: { id: dto.lineId } }); if (!l) throw new NotFoundException('Knitting line not found');
      const c = await tx.knitInspection.count(); const inspNo = 'KQ-' + String(c + 1).padStart(6, '0');
      const r = await tx.knitInspection.create({ data: { inspNo, knitLineId: l.id, date: day(dto.date), machine: dto.machine || null, rolls: dto.rolls ?? null, inspectedKg: n(dto.inspectedKg), defect: dto.defect, defectKg: n(dto.defectKg), rejectedKg: n(dto.rejectedKg), decision: dto.decision, remarks: dto.remarks || null, createdById: a.id } });
      if (dto.decision !== 'PASS') await tx.knitRemark.create({ data: { knitLineId: l.id, date: day(dto.date), dept: 'Knitting quality', type: 'QUALITY_ISSUE', text: `${dto.defect} · ${n(dto.defectKg)} kg · ${dto.decision}${dto.remarks ? ' · ' + dto.remarks : ''}`, createdById: a.id } });
      await audit(tx, a, 'KNIT_INSPECTION', 'KNIT_LINE', l.id, null, dto); return r;
    });
  }
}
