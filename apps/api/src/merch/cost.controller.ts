import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Put, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsObject, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, audit, requireRole, toJson } from './merch.common';
import { calcCost, CostInput, MERCH_EDIT_ROLES } from './merch.rules';

const ENTITY = ['STYLE', 'SAMPLE_SHEET'] as const;
class SaveDto { @IsObject() data!: CostInput; @IsOptional() @IsBoolean() submit?: boolean; }
class RatesDto { @IsObject() data!: Record<string, unknown>; }

/** Starting rates taken from cost sheet 13251813 NMFLANA LS DRESS. Admin replaces them with the company rate list. */
const DEFAULT_RATES = {
  params: { rate: 115, cw: 12, wp: 12, ex: 10, com: 3, profit: 2, buy: 5 },
  items: { yarn: [['34/S Cotton', 3.6], ['20/D Spandex', 9], ['40/D Spandex', 8]], knit: [['Flat rib 3x2', 60], ['Rib 2x2', 30]], yd: [['Yarn dyeing', 170]], dye: [['Dyeing & finishing', 90]], aop: [['AOP / oil dye', 2.5]], cm: [['CM', 8.5]], sp: [['Screen print', 0.5]], sms: [['SMS', 0.5]], cl: [['Care label', 0.5]], ht: [['Hang tag', 0.52]], pt: [['Price tag', 0.25]], bp: [['Blister poly', 0.2]], st: [['Sewing thread', 0.3]], ct: [['Carton', 0.3]], chem: [['Chemical test', 0.05]] },
};

@Controller('merch/cost')
@UseGuards(JwtAuthGuard)
export class CostController {
  constructor(private prisma: PrismaService) {}

  @Get('rates')
  async rates() {
    const r = await this.prisma.costRateSet.findUnique({ where: { id: 'default' } });
    return r ? r.data : DEFAULT_RATES;
  }

  @Put('rates')
  async saveRates(@Body() dto: RatesDto, @Req() req: any) {
    const a = actorOf(req); requireRole(a, [], 'Cost rates'); // ADMIN only (canAct always allows ADMIN)
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.costRateSet.findUnique({ where: { id: 'default' } });
      const after = await tx.costRateSet.upsert({ where: { id: 'default' }, update: { data: toJson(dto.data), updatedById: a.id }, create: { id: 'default', data: toJson(dto.data), updatedById: a.id } });
      await audit(tx, a, 'COST_RATES_SAVED', 'COST_RATES', 'default', before?.data ?? null, dto.data);
      return after.data;
    });
  }

  @Get('sheets/:entityType/:entityId')
  async get(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    if (!ENTITY.includes(entityType as any)) throw new BadRequestException('entityType must be STYLE or SAMPLE_SHEET');
    const cs = await this.prisma.costSheet.findUnique({ where: { entityType_entityId: { entityType, entityId } } });
    return cs ? { ...cs, result: calcCost(cs.data as CostInput) } : null;
  }

  @Put('sheets/:entityType/:entityId')
  async save(@Param('entityType') entityType: string, @Param('entityId') entityId: string, @Body() dto: SaveDto, @Req() req: any) {
    const a = actorOf(req);
    if (!ENTITY.includes(entityType as any)) throw new BadRequestException('entityType must be STYLE or SAMPLE_SHEET');
    requireRole(a, entityType === 'STYLE' ? MERCH_EDIT_ROLES : ['MERCH_SAMPLE', 'MERCH_BOTH', 'MERCH_HEAD'], 'Cost sheet');
    // ownership: only the merchandiser of the job / sheet, head or admin
    if (!a.roles.includes('ADMIN') && !a.roles.includes('MERCH_HEAD')) {
      if (entityType === 'STYLE') {
        const s = await this.prisma.style.findUnique({ where: { id: entityId }, include: { order: true } });
        if (!s) throw new NotFoundException('Job / style not found');
        if ((s.order.merchandiserId || s.order.createdById) !== a.id) throw new ForbiddenException('Only the job merchandiser can change its cost sheet');
      } else {
        const s = await this.prisma.sampleOrderSheet.findUnique({ where: { id: entityId } });
        if (!s) throw new NotFoundException('Sample order sheet not found');
        if ((s.merchandiserId || s.createdById) !== a.id) throw new ForbiddenException('Only the sheet merchandiser can change its cost sheet');
      }
    }
    const result = calcCost(dto.data);
    if (dto.submit && !(result.fob > 0)) throw new BadRequestException('Fill the consumption and costs before submitting');
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.costSheet.findUnique({ where: { entityType_entityId: { entityType, entityId } } });
      const fob = Math.round(result.fob * 10000) / 10000;
      const status = dto.submit ? 'DONE' : 'DRAFT';
      const cs = await tx.costSheet.upsert({ where: { entityType_entityId: { entityType, entityId } }, update: { data: toJson(dto.data), fob, status, updatedById: a.id }, create: { entityType, entityId, data: toJson(dto.data), fob, status, updatedById: a.id } });
      if (entityType === 'SAMPLE_SHEET') await tx.sampleOrderSheet.update({ where: { id: entityId }, data: { costingStatus: status, fob: dto.submit ? fob : undefined } });
      await audit(tx, a, dto.submit ? 'COST_SHEET_SUBMITTED' : 'COST_SHEET_DRAFT', entityType, entityId, before ? { fob: before.fob, status: before.status } : null, { fob, status });
      return { ...cs, result };
    });
  }
}
