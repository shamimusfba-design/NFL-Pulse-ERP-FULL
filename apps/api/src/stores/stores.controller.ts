import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, toJson } from '../merch/merch.common';
import { fabConstruction, fabType, numOf } from '../reuse/reuse.rules';
import { canon, checkSlice, Desk, emptyOf, SLICES, STORE_ROLE, uiRolesOf } from './stores.rules';

class SaveDto { @IsObject() slices!: Record<string, { version: number; data: unknown }>; }
const DESKS: Record<string, Desk> = { greige: 'GREIGE', finished: 'FINISHED' };
const KINDS: Record<Desk, string[]> = { GREIGE: ['G', 'A'], FINISHED: ['F', 'R'] };
const AS_OF: Record<Desk, string> = { GREIGE: '2026-09-28', FINISHED: '2026-09-29' };

/**
 * Greige Fabric Store and Finished Fabric Store desks (base /api/stores/:desk, desk = greige | finished).
 *  GET  /:desk/bootstrap  user + desk roles, report lines, working slices with versions
 *  GET  /:desk/state      slices only
 *  PUT  /:desk/state      save changed slices (checked by stores.rules.ts; compare-and-set on version → 409)
 *  POST /:desk/demo       load the labelled demo records once (store role)
 *  GET  /:desk/changes    change log
 * Sending fabric to reuse also writes it to ReuseStock, so fabric order sheet suggestions see it.
 */
@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private prisma: PrismaService) {}

  private desk(d: string) { const x = DESKS[d]; if (!x) throw new BadRequestException('Unknown store'); return x; }
  private async slices(db: any, desk: Desk) {
    const rows = await db.storeSlice.findMany({ where: { desk } });
    const out: Record<string, { version: number; data: unknown }> = {};
    for (const s of SLICES[desk]) out[s] = { version: 0, data: emptyOf(s) };
    for (const r of rows) if (SLICES[desk].includes(r.slice)) out[r.slice] = { version: r.version, data: r.data };
    return out;
  }
  private async lines(db: any, desk: Desk) {
    const out: Record<string, any[]> = {};
    for (const k of KINDS[desk]) out[k] = (await db.storeLine.findMany({ where: { desk, kind: k }, orderBy: { sourceRow: 'asc' }, select: { data: true } })).map((x: any) => x.data);
    return out;
  }
  private roles(req: any, desk: Desk) { const a = actorOf(req); const ui = uiRolesOf(desk, a.roles); if (!ui.length) throw new ForbiddenException('Your user has no role on this store'); return { a, ui }; }

  @Get(':desk/bootstrap')
  async bootstrap(@Param('desk') d: string, @Req() req: any) {
    const desk = this.desk(d); const { a, ui } = this.roles(req, desk);
    const [lines, state] = await Promise.all([this.lines(this.prisma, desk), this.slices(this.prisma, desk)]);
    return { user: { id: a.id, name: a.name, roles: a.roles, uiRoles: ui }, asOf: AS_OF[desk], lines, state };
  }

  @Get(':desk/state')
  async state(@Param('desk') d: string, @Req() req: any) { const desk = this.desk(d); this.roles(req, desk); return { state: await this.slices(this.prisma, desk) }; }

  @Get(':desk/changes')
  async changes(@Param('desk') d: string, @Req() req: any, @Query('limit') limit?: string) {
    const desk = this.desk(d); this.roles(req, desk);
    return this.prisma.storeChange.findMany({ where: { desk }, orderBy: { createdAt: 'desc' }, take: Math.min(500, Math.max(1, Number(limit) || 100)) });
  }

  @Put(':desk/state')
  save(@Param('desk') d: string, @Req() req: any, @Body() body: SaveDto) { return this.write(this.desk(d), req, body, false); }

  @Post(':desk/demo')
  async demo(@Param('desk') d: string, @Req() req: any, @Body() body: SaveDto) {
    const desk = this.desk(d); const { ui } = this.roles(req, desk);
    if (!ui.includes(STORE_ROLE[desk])) throw new ForbiddenException(`${STORE_ROLE[desk]} loads the demo data`);
    const cur = await this.slices(this.prisma, desk);
    if (cur.demoSeeded.data) throw new BadRequestException('Demo data was already loaded once');
    for (const [k, v] of Object.entries(body.slices || {})) {
      const list = Array.isArray(v.data) ? v.data : [];
      if (Array.isArray(v.data) && list.some((x: any) => !x?.demo && !(cur[k]?.data as any[] || []).some((y: any) => canon(y) === canon(x)))) throw new BadRequestException('Only records marked demo can be loaded here');
    }
    return this.write(desk, req, body, true);
  }

  private async write(desk: Desk, req: any, body: SaveDto, demo: boolean) {
    const { a, ui } = this.roles(req, desk);
    const names = Object.keys(body.slices || {});
    if (!names.length) throw new BadRequestException('Nothing to save');
    for (const n of names) if (!SLICES[desk].includes(n)) throw new BadRequestException(`Unknown slice ${n}`);
    return this.prisma.$transaction(async (tx: any) => {
      const current = await this.slices(tx, desk);
      const conflicts = names.filter((n) => current[n].version !== Number(body.slices[n].version));
      if (conflicts.length) throw new ConflictException({ message: `Someone else saved ${conflicts.join(', ')} first. The page will reload with the latest data.`, conflicts });
      const after: Record<string, any> = {};
      for (const s of SLICES[desk]) after[s] = names.includes(s) ? body.slices[s].data : current[s].data;
      const ctx = { desk, ui, demo, lines: await this.lines(tx, desk), state: after, today: new Date().toISOString().slice(0, 10) };
      const errors = names.flatMap((n) => checkSlice(n, current[n].data, body.slices[n].data, ctx));
      if (errors.length) throw new BadRequestException({ message: [...new Set(errors)].slice(0, 5).join(' · '), details: errors });
      const versions: Record<string, number> = {};
      for (const n of names) {
        const data = toJson(body.slices[n].data);
        if (current[n].version === 0) {
          try { await tx.storeSlice.create({ data: { desk, slice: n, data, version: 1, updatedById: a.id } }); } catch { throw new ConflictException({ message: `Someone else saved ${n} first. The page will reload with the latest data.`, conflicts: [n] }); }
          versions[n] = 1;
        } else {
          const r = await tx.storeSlice.updateMany({ where: { desk, slice: n, version: current[n].version }, data: { data, version: current[n].version + 1, updatedById: a.id } });
          if (r.count !== 1) throw new ConflictException({ message: `Someone else saved ${n} first. The page will reload with the latest data.`, conflicts: [n] });
          versions[n] = current[n].version + 1;
        }
        await tx.storeChange.create({ data: { desk, slice: n, summary: `${n}${demo ? ' (demo)' : ''}`, actorId: a.id, actorName: a.name || null } });
      }
      await this.syncReuse(tx, desk, names, current, after, ctx.lines, a.id);
      return { ok: true, versions };
    });
  }

  /** Left-over fabric sent to reuse on the store page → ReuseStock, so merchandising / planning suggestions see it. */
  private async syncReuse(tx: any, desk: Desk, names: string[], cur: any, after: any, lines: Record<string, any[]>, by: string) {
    const slice = desk === 'GREIGE' ? 'reuse' : 'fre';
    if (!names.includes(slice)) return;
    const before = (cur[slice].data || {}) as Record<string, any>, now = (after[slice] || {}) as Record<string, any>;
    for (const [k, u] of Object.entries(now)) {
      if (canon(before[k]) === canon(u)) continue;
      const ref = `${desk}:${desk === 'GREIGE' ? 'G' : 'F'}:${k}`;
      const r = (desk === 'GREIGE' ? lines.G : lines.F)[+k] || {};
      if (desk === 'GREIGE' && u.st !== 'In reuse') { await tx.reuseStock.updateMany({ where: { ref }, data: { status: 'NOT_REUSABLE', note: u.why || null } }); continue; }
      const fabric = desk === 'GREIGE' ? r.ft : r.f;
      const row = { store: desk, source: desk === 'GREIGE' ? 'LEFT_AFTER_DYEING' : 'LEFT_AFTER_CUTTING', buyer: r.b || null, jobNo: r.j || null, fabric: fabric || 'Not recorded', fabricType: fabType(fabric), construction: fabConstruction(fabric), gsm: numOf(r.gsm), dia: r.dia || null, colour: r.c || null, process: r.ap || null, kg: Number(u.kg) || 0, location: u.loc || null, status: 'AVAILABLE', createdById: by };
      await tx.reuseStock.upsert({ where: { ref }, create: { ref, ...row }, update: row });
    }
  }
}
