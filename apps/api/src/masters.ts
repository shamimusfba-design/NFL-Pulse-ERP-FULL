import { BadRequestException, Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

@Controller('masters')
@UseGuards(JwtAuthGuard)
export class MastersController {
  constructor(private prisma: PrismaService) {}

  @Get('factories')
  factories() { return this.prisma.factory.findMany({ where: { active: true }, orderBy: { code: 'asc' } }); }

  @Get('buyers')
  buyers() { return this.prisma.buyer.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }

  @Get('lines')
  async lines() {
    const rows = await this.prisma.line.findMany({
      where: { active: true },
      include: { machinePools: true, floor: { include: { section: { include: { factory: true } } } } },
      orderBy: [{ name: 'asc' }, { effectiveFrom: 'desc' }],
    });
    // Some historical masters contain two records that display as the same physical sewing line
    // (for example A1 with one zero-machine row and one live machine row). Return one canonical
    // physical line to every planner screen. Prefer the row with the larger active machine pool,
    // then the newest effective record.
    const keyOf = (line: any) => `${String(line.floor?.section?.factory?.code || '').toUpperCase()}|${String(line.floor?.code || '').toUpperCase()}|${String(line.name || line.code || '').trim().toUpperCase().replace(/\s+/g, '')}`;
    const mc = (line: any) => (line.machinePools || []).filter((x: any) => x.active !== false).reduce((a: number, x: any) => a + Number(x.machineCount || 0), 0);
    const unique = new Map<string, any>();
    for (const row of rows) {
      const key = keyOf(row); const prev = unique.get(key);
      if (!prev || mc(row) > mc(prev) || (mc(row) === mc(prev) && new Date(row.effectiveFrom).getTime() > new Date(prev.effectiveFrom).getTime())) unique.set(key, row);
    }
    return Array.from(unique.values()).sort((a: any, b: any) => String(a.floor?.section?.factory?.code || '').localeCompare(String(b.floor?.section?.factory?.code || '')) || String(a.floor?.code || '').localeCompare(String(b.floor?.code || ''), undefined, { numeric: true }) || String(a.name || a.code || '').localeCompare(String(b.name || b.code || ''), undefined, { numeric: true }));
  }


  @Get('reference-categories')
  async referenceCategories() {
    const rows = await this.prisma.referenceValue.groupBy({ by: ['category'], where: { active: true }, _count: { category: true }, orderBy: { category: 'asc' } });
    return rows.map((r) => ({ category: r.category, count: r._count.category }));
  }

  @Get('references')
  async references(@Query('category') category?: string, @Query('q') q?: string) {
    const rows = await this.prisma.referenceValue.findMany({
      where: { active: true, ...(category ? { category } : {}), ...(q ? { value: { contains: q, mode: 'insensitive' as const } } : {}) },
      orderBy: [{ category: 'asc' }, { value: 'asc' }], take: 3000,
    });
    return rows;
  }

  @Get('references/:category')
  referencesByCategory(@Param('category') category: string) {
    return this.prisma.referenceValue.findMany({ where: { category, active: true }, orderBy: { value: 'asc' }, take: 3000 });
  }

  @Put('lines/:lineId/machines')
  async updateLineMachines(@Param('lineId') lineId: string, @Body() body: { machineCount?: number }) {
    const machineCount = Math.max(0, Math.round(Number(body?.machineCount ?? 0)));
    if (!Number.isFinite(machineCount)) throw new BadRequestException('Invalid machine count');
    const line = await this.prisma.line.findUnique({ where: { id: lineId }, include: { machinePools: true } });
    if (!line) throw new BadRequestException('Line not found');
    const pool = line.machinePools[0];
    if (pool) await this.prisma.machinePool.update({ where: { id: pool.id }, data: { machineCount, active: true } });
    else await this.prisma.machinePool.create({ data: { lineId, name: 'Main Machine Pool', machineCount, active: true, capability: { plannerEditable: true } } });
    return { ok: true, lineId, machineCount };
  }

}
