import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth';
import { PrismaService } from '../prisma.service';
import { actorOf, toJson } from '../merch/merch.common';
import { checkSlice, EMPTY, MACHINES, Slice, SLICES, summarize, uiRolesOf } from './dyeing.rules';

class SaveDto {
  /** { sliceName: { version, data } } — only the slices that changed */
  @IsObject() slices!: Record<string, { version: number; data: unknown }>;
}

const REPORT_AS_OF = '2026-09-29'; // date of the Finish Fabric Plan & Execution report loaded by prisma/dyeing-report-seed.ts
const LABDIP_UI: Record<string, string> = { APPROVED: 'Approved', SUBMITTED: 'Submitted', REJECTED: 'Rejected' };

/**
 * Dyeing & Finishing desk API (base /api/dyeing). Serves the page at /dyeing/index.html.
 *  GET  /bootstrap  → user + desk roles, all Finish Fabric lines, every working slice with its version, SMS-stage lab dips
 *  GET  /state      → slices only (after a conflict)
 *  PUT  /state      → save changed slices; each one is checked by dyeing.rules.ts and must carry the version it was read at
 *  GET  /changes    → change log
 */
@Controller('dyeing')
@UseGuards(JwtAuthGuard)
export class DyeingController {
  constructor(private prisma: PrismaService) {}

  private async slices() {
    const rows = await this.prisma.dyeingStateSlice.findMany();
    const out: Record<string, { version: number; data: unknown }> = {};
    for (const s of SLICES) out[s] = { version: 0, data: EMPTY[s] };
    for (const r of rows) if ((SLICES as readonly string[]).includes(r.slice)) out[r.slice] = { version: r.version, data: r.data };
    return out;
  }

  private async lines() {
    return this.prisma.dyeingLine.findMany({ orderBy: [{ source: 'asc' }, { sourceRow: 'asc' }], select: { id: true, data: true } });
  }

  /** Lab dips approved / submitted at SMS stage in merchandising, keyed job|colour like the desk. */
  private async smsLabDips() {
    const dips = await this.prisma.labDip.findMany({ where: { status: { in: Object.keys(LABDIP_UI) } }, select: { color: true, status: true, style: { select: { order: { select: { jobNo: true } } } } } });
    const out: Record<string, string> = {};
    for (const d of dips) { const job = d.style?.order?.jobNo; if (job) out[`${job}|${d.color}`] = LABDIP_UI[d.status]; }
    return out;
  }

  @Get('bootstrap')
  async bootstrap(@Req() req: any) {
    const a = actorOf(req);
    const ui = uiRolesOf(a.roles);
    if (!ui.length) throw new ForbiddenException('Your user has no dyeing desk role');
    const [lines, state, sms] = await Promise.all([this.lines(), this.slices(), this.smsLabDips()]);
    return { user: { id: a.id, name: a.name, roles: a.roles, uiRoles: ui }, asOf: REPORT_AS_OF, machines: MACHINES, lines: lines.map((l) => ({ id: l.id, ...(l.data as object) })), state, sms };
  }

  @Get('state')
  async state(@Req() req: any) {
    if (!uiRolesOf(actorOf(req).roles).length) throw new ForbiddenException('Your user has no dyeing desk role');
    return { state: await this.slices() };
  }

  @Get('changes')
  async changes(@Req() req: any, @Query('limit') limit?: string) {
    if (!uiRolesOf(actorOf(req).roles).length) throw new ForbiddenException('Your user has no dyeing desk role');
    return this.prisma.dyeingChange.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(500, Math.max(1, Number(limit) || 100)) });
  }

  @Put('state')
  async save(@Req() req: any, @Body() body: SaveDto) {
    const a = actorOf(req);
    const ui = uiRolesOf(a.roles);
    if (!ui.length) throw new ForbiddenException('Your user has no dyeing desk role');
    const names = Object.keys(body.slices || {});
    if (!names.length) throw new BadRequestException('Nothing to save');
    for (const n of names) if (!(SLICES as readonly string[]).includes(n)) throw new BadRequestException(`Unknown slice ${n}`);

    return this.prisma.$transaction(async (tx) => {
      const current = await this.slices();
      const conflicts = names.filter((n) => current[n].version !== Number(body.slices[n].version));
      if (conflicts.length) throw new ConflictException({ message: `Someone else saved ${conflicts.join(', ')} first. The page will reload with the latest data.`, conflicts });

      const after: Record<string, any> = {};
      for (const s of SLICES) after[s] = names.includes(s) ? body.slices[s].data : current[s].data;
      const ids = new Map<string, string>();
      for (const l of await tx.dyeingLine.findMany({ select: { id: true, data: true } })) {
        const d: any = l.data, ed = (after.edit as any)?.[l.id] || {};
        ids.set(l.id, `${ed.j ?? d.j}|${ed.c ?? d.c ?? d.it ?? ''}`);
      }
      const ctx = { ui, lineKey: (id: string) => ids.get(id) ?? null, state: after, sms: await this.smsLabDips() };
      const errors = names.flatMap((n) => checkSlice(n as Slice, current[n].data, body.slices[n].data, ctx));
      if (errors.length) throw new BadRequestException({ message: errors.slice(0, 5).join(' · '), details: errors });

      const versions: Record<string, number> = {};
      for (const n of names) {
        let version: number;
        if (current[n].version === 0) {
          try { version = (await tx.dyeingStateSlice.create({ data: { slice: n, data: toJson(body.slices[n].data), version: 1, updatedById: a.id } })).version; }
          catch { throw new ConflictException({ message: `Someone else saved ${n} first. The page will reload with the latest data.`, conflicts: [n] }); }
        } else {
          // compare-and-set on the version so two people saving at the same moment cannot overwrite each other
          const r = await tx.dyeingStateSlice.updateMany({ where: { slice: n, version: current[n].version }, data: { data: toJson(body.slices[n].data), version: current[n].version + 1, updatedById: a.id } });
          if (r.count !== 1) throw new ConflictException({ message: `Someone else saved ${n} first. The page will reload with the latest data.`, conflicts: [n] });
          version = current[n].version + 1;
        }
        versions[n] = version;
        await tx.dyeingChange.create({ data: { slice: n, summary: summarize(n as Slice, current[n].data, body.slices[n].data), actorId: a.id, actorName: a.name || null } });
      }
      return { ok: true, versions };
    });
  }
}
