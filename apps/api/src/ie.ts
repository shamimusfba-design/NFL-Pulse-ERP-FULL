import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

class SaveIeBulletinDto {
  @IsOptional() @IsBoolean() sampleCollected?: boolean;
  @IsOptional() @IsString() sampleRemarks?: string;
  @IsOptional() @IsString() operationNotes?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) smv!: number;
  @Type(() => Number) @IsInt() @Min(1) manpower!: number;
  @Type(() => Number) @IsInt() @Min(1) machineQty!: number;
  @Type(() => Number) @IsNumber() @Min(1) @Max(100) achievableEfficiency!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dailyTarget?: number;
  @IsOptional() @IsString() remarks?: string;
}

@Controller('ie')
@UseGuards(JwtAuthGuard)
export class IeController {
  constructor(private prisma: PrismaService) {}

  private ensureIe(req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => ['ADMIN', 'IE'].includes(role))) {
      throw new ForbiddenException('Industrial Production Engineering access is required');
    }
  }

  @Get('workqueue')
  async workqueue(@Req() req: any) {
    this.ensureIe(req);
    const orders = await this.prisma.order.findMany({
      include: {
        buyer: true,
        styles: { include: { purchaseOrders: true, breakdowns: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    const tasks = await this.prisma.task.findMany({
      where: { module: 'IE' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    const styleTasks = new Map(tasks.filter((t) => t.entityType === 'STYLE').map((t) => [t.entityId, t]));
    const orderTasks = new Map(tasks.filter((t) => t.entityType === 'ORDER' && t.orderId).map((t) => [t.orderId as string, t]));

    return orders.flatMap((order) => order.styles.map((style) => {
      const sm = (style.sourceMetadata || {}) as Record<string, any>;
      const bulletin = sm.ieBulletin || {};
      const task = styleTasks.get(style.id) || orderTasks.get(order.id) || null;
      return {
        orderId: order.id,
        jobNo: order.jobNo,
        buyer: order.buyer,
        orderQty: order.totalQty,
        style: {
          ...style,
          itemImageUrl: sm.itemImageUrl || null,
          fobPrice: sm.fobPrice ?? null,
          ieBulletin: bulletin,
        },
        task,
        status: bulletin.status === 'COMPLETED' ? 'COMPLETED' : task?.status || 'PENDING',
      };
    }));
  }

  @Put('styles/:styleId/bulletin')
  async saveBulletin(@Param('styleId') styleId: string, @Body() dto: SaveIeBulletinDto, @Req() req: any) {
    this.ensureIe(req);
    const style = await this.prisma.style.findUnique({
      where: { id: styleId },
      include: { order: true },
    });
    if (!style) throw new BadRequestException('Style not found');

    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const itemImageUrl = sm.itemImageUrl || null;
    if (!itemImageUrl && !dto.sampleCollected) {
      throw new BadRequestException('No Merchandiser item image is available. Mark Physical Sample Collected before completing the IE Bulletin.');
    }

    const now = new Date();
    const before = sm.ieBulletin || {};
    const next = {
      ...before,
      status: 'COMPLETED',
      sampleSource: itemImageUrl && dto.sampleCollected ? 'MERCH_IMAGE_AND_PHYSICAL_SAMPLE' : itemImageUrl ? 'MERCH_IMAGE' : 'PHYSICAL_SAMPLE',
      itemImageUrl,
      sampleCollected: Boolean(dto.sampleCollected),
      sampleRemarks: dto.sampleRemarks?.trim() || '',
      operationNotes: dto.operationNotes?.trim() || '',
      smv: Number(dto.smv),
      manpower: Number(dto.manpower),
      machineQty: Number(dto.machineQty),
      achievableEfficiency: Number(dto.achievableEfficiency),
      dailyTarget: dto.dailyTarget ? Number(dto.dailyTarget) : null,
      remarks: dto.remarks?.trim() || '',
      completedAt: now.toISOString(),
      completedByUserId: req.user.id,
      completedByName: req.user.name,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.style.update({
        where: { id: styleId },
        data: { sourceMetadata: toPrismaJson({ ...sm, ieBulletin: next }) },
      });

      await tx.task.updateMany({
        where: {
          module: 'IE',
          entityType: 'STYLE',
          entityId: styleId,
          status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        },
        data: { status: 'COMPLETED', completedAt: now, blockedReason: null },
      });

      const siblingStyles = await tx.style.findMany({ where: { orderId: style.orderId }, select: { sourceMetadata: true } });
      const allCompleted = siblingStyles.every((row) => {
        const meta = (row.sourceMetadata || {}) as Record<string, any>;
        return meta.ieBulletin?.status === 'COMPLETED';
      });
      if (allCompleted) {
        await tx.task.updateMany({
          where: {
            module: 'IE',
            orderId: style.orderId,
            entityType: 'ORDER',
            status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
          },
          data: { status: 'COMPLETED', completedAt: now, blockedReason: null },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'IE_BULLETIN_COMPLETED',
          entityType: 'STYLE',
          entityId: styleId,
          before: toPrismaJson(before),
          after: toPrismaJson(next),
        },
      });
    });

    return { ok: true, bulletin: next, message: `IE Bulletin completed for ${style.order.jobNo} / ${style.styleNo}` };
  }
}
