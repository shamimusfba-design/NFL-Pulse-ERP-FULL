import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, requireRole, stepDataOf } from '../merch/merch.common';
import { colourQty, releaseDraft } from '../planning-approvals/pa.rules';
import { fabConstruction, fabType, numOf, StockRow, suggest } from './reuse.rules';

const STORE_ROLES = ['GREIGE_STORE', 'FINISHED_FABRIC_STORE', 'FABRIC_FINISHING'];
const n = (v: unknown) => Number(v ?? 0) || 0;

class StockDto {
  @IsIn(['GREIGE', 'FINISHED']) store!: string;
  @IsIn(['LEFT_AFTER_DYEING', 'LEFT_AFTER_CUTTING', 'GREIGE_EXCESS_LIST']) source!: string;
  @IsOptional() @IsString() @MaxLength(80) buyer?: string; @IsOptional() @IsString() @MaxLength(60) jobNo?: string;
  @IsString() @MaxLength(160) fabric!: string; @IsOptional() @IsString() @MaxLength(160) composition?: string;
  @IsOptional() @Type(() => Number) @IsNumber() gsm?: number; @IsOptional() @IsString() @MaxLength(20) dia?: string;
  @IsOptional() @IsString() @MaxLength(120) colour?: string; @IsOptional() @IsString() @MaxLength(80) process?: string;
  @Type(() => Number) @IsNumber() @Min(0.1) kg!: number; @IsOptional() @IsString() @MaxLength(80) location?: string; @IsOptional() @IsString() @MaxLength(300) note?: string;
}
class StatusDto { @IsIn(['AVAILABLE', 'USED', 'NOT_REUSABLE']) status!: string; @IsOptional() @IsString() @MaxLength(300) note?: string; }

export const toRow = (r: any): StockRow => ({ id: r.id, store: r.store, jobNo: r.jobNo, fabric: r.fabric, composition: r.composition, gsm: r.gsm, dia: r.dia, colour: r.colour, process: r.process, kg: n(r.kg), reservedKg: n(r.reservedKg) });

/** Reuse suggestions for every colour × fabric part of a job (from CAD parts and the colour breakdown). */
export async function styleReuse(db: Prisma.TransactionClient | PrismaService, style: any) {
  const cad = stepDataOf(style.merchSteps, 'CAD');
  const parts = Array.isArray(cad.parts) ? cad.parts : [];
  if (!parts.length) return { checkedAt: new Date().toISOString(), lines: [], matchKg: 0, matchedLines: 0 };
  const lines = releaseDraft(colourQty(style.breakdowns || []), parts);
  const stock = (await (db as any).reuseStock.findMany({ where: { status: 'AVAILABLE' } })).map(toRow);
  const used = new Map<string, number>();
  const out = lines.map((l) => {
    const sug = suggest({ fabric: l.fabric, gsm: l.gsm, composition: l.composition, colour: l.colour }, stock);
    sug.forEach((x) => used.set(x.id, x.availableKg));
    return { colour: l.colour, part: l.part, fabric: l.fabric, gsm: l.gsm, finishKg: l.finishKg, suggestions: sug, bestKg: sug.reduce((a, x) => a + x.availableKg, 0) };
  });
  const matchKg = [...used.values()].reduce((a, b) => a + b, 0); // each stock row counted once
  return { checkedAt: new Date().toISOString(), lines: out, matchKg: Math.round(matchKg), matchedLines: out.filter((l) => l.suggestions.length).length };
}

/** Fabric reuse stock (both stores). Base path /api/reuse. */
@Controller('reuse')
@UseGuards(JwtAuthGuard)
export class ReuseController {
  constructor(private prisma: PrismaService) {}

  @Get('stock')
  async stock(@Query() q: Record<string, string>) {
    const where: any = { status: q.status || 'AVAILABLE' };
    if (q.store) where.store = q.store;
    if (q.fabricType) where.fabricType = q.fabricType;
    if (q.construction) where.construction = q.construction;
    if (q.colour) where.colour = { contains: q.colour, mode: 'insensitive' };
    const rows = await this.prisma.reuseStock.findMany({ where, orderBy: [{ store: 'asc' }, { fabricType: 'asc' }, { gsm: 'asc' }], take: 2000 });
    const total = rows.reduce((a, r) => a + n(r.kg) - n(r.reservedKg), 0);
    return { total: Math.round(total), rows };
  }

  @Get('matches')
  async matches(@Query() q: Record<string, string>) {
    if (!q.fabric) throw new BadRequestException('fabric is required');
    const stock = (await this.prisma.reuseStock.findMany({ where: { status: 'AVAILABLE', ...(q.store ? { store: q.store } : {}) } })).map(toRow);
    return suggest({ fabric: q.fabric, gsm: q.gsm, dia: q.dia, composition: q.composition, colour: q.colour, process: q.process }, stock, 40);
  }

  @Post('stock')
  async add(@Req() req: any, @Body() dto: StockDto) {
    const a = actorOf(req); requireRole(a, STORE_ROLES, 'Adding reuse stock');
    return this.prisma.reuseStock.create({ data: { ...dto, gsm: dto.gsm ?? numOf(dto.fabric) ?? null, fabricType: fabType(dto.fabric), construction: fabConstruction(dto.fabric), createdById: a.id } });
  }

  @Patch('stock/:id')
  async setStatus(@Req() req: any, @Param('id') id: string, @Body() dto: StatusDto) {
    const a = actorOf(req); requireRole(a, STORE_ROLES, 'Changing reuse stock');
    const r = await this.prisma.reuseStock.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reuse stock not found');
    if (dto.status === 'NOT_REUSABLE' && !String(dto.note || '').trim()) throw new BadRequestException('Write why it is not reusable');
    return this.prisma.reuseStock.update({ where: { id }, data: { status: dto.status, note: dto.note ?? r.note } });
  }
}
