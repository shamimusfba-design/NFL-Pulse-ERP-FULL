import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const CAD_WRITE_ROLES = ['ADMIN', 'CAD'];

class ConsumptionRowDto {
  @IsString() styleId!: string;
  @IsString() color!: string;
  @IsInt() @Min(0) orderQty!: number;
  @IsString() fabricDescription!: string;
  @IsOptional() @IsString() fabricType?: string;
  @IsOptional() @IsNumber() gsm?: number;
  @IsOptional() @IsString() dia?: string;
  @IsOptional() @IsNumber() consumptionValue?: number;
  @IsIn(['KG_DOZ', 'KG_PCS', 'TOTAL_KG']) consumptionBasis!: 'KG_DOZ' | 'KG_PCS' | 'TOTAL_KG';
  @IsOptional() @IsNumber() wastagePct?: number;
  @IsNumber() @Min(0) requiredKg!: number;
  @IsOptional() @IsString() remarks?: string;
}

class SaveConsumptionDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ConsumptionRowDto) rows!: ConsumptionRowDto[];
  @IsOptional() @IsString() remarks?: string;
}

@Controller('cad')
@UseGuards(JwtAuthGuard)
export class CadController {
  constructor(private prisma: PrismaService) {}

  private ensureCadWrite(req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((r) => CAD_WRITE_ROLES.includes(r))) {
      throw new ForbiddenException('CAD consumption update is not allowed for this user');
    }
  }

  @Get('workqueue')
  async workqueue(@Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((r) => [...CAD_WRITE_ROLES, 'MERCH_HEAD', 'MANAGEMENT', 'PLANNING'].includes(r))) {
      throw new ForbiddenException('CAD work queue is not allowed for this user');
    }
    return this.prisma.task.findMany({
      where: {
        module: 'CAD',
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        ...(roles.includes('CAD') && !roles.includes('ADMIN') ? {
          OR: [{ ownerUserId: req.user.id }, { ownerRoleCode: 'CAD' }],
        } : {}),
      },
      include: {
        order: {
          include: {
            buyer: true,
            styles: { include: { breakdowns: true, purchaseOrders: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  @Get('orders/:orderId/consumption')
  async getConsumption(@Param('orderId') orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, styles: { include: { breakdowns: true, purchaseOrders: true } } },
    });
    if (!order) throw new BadRequestException('Order not found');
    const meta = (order.sourceMetadata || {}) as Record<string, any>;
    return { order, cadConsumption: meta.cadConsumption || null };
  }

  @Put('orders/:orderId/consumption')
  async saveConsumption(@Param('orderId') orderId: string, @Body() dto: SaveConsumptionDto, @Req() req: any) {
    this.ensureCadWrite(req);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { styles: true },
    });
    if (!order) throw new BadRequestException('Order not found');
    if (!dto.rows.length) throw new BadRequestException('At least one consumption row is required');

    const styleIds = new Set(order.styles.map((s) => s.id));
    if (dto.rows.some((r) => !styleIds.has(r.styleId))) {
      throw new BadRequestException('One or more consumption rows do not belong to this order');
    }

    const nowIso = new Date().toISOString();
    const orderMeta = (order.sourceMetadata || {}) as Record<string, any>;
    const before = orderMeta.cadConsumption || null;
    const nextConsumption = {
      status: 'CONFIRMED',
      rows: dto.rows,
      remarks: dto.remarks || '',
      updatedAt: nowIso,
      updatedByUserId: req.user.id,
      updatedByName: req.user.name,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          sourceMetadata: toPrismaJson({
            ...orderMeta,
            cadConsumption: nextConsumption,
            documents: {
              ...(orderMeta.documents || {}),
              fabricOrderSheetReadyAt: nowIso,
            },
          }),
        },
      });

      for (const style of order.styles) {
        const styleRows = dto.rows.filter((r) => r.styleId === style.id);
        const fabricRequired = styleRows.reduce((sum, row) => sum + Number(row.requiredKg || 0), 0);
        const current = await tx.style.findUnique({ where: { id: style.id } });
        const sm = (current?.sourceMetadata || {}) as Record<string, any>;
        await tx.style.update({
          where: { id: style.id },
          data: {
            sourceMetadata: toPrismaJson({
              ...sm,
              production: { ...(sm.production || {}), fabricRequired },
              cadConsumptionUpdatedAt: nowIso,
            }),
          },
        });
      }

      await tx.task.updateMany({
        where: {
          orderId,
          module: 'CAD',
          status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        },
        data: { status: 'COMPLETED', completedAt: new Date(), blockedReason: null },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CAD_CONSUMPTION_CONFIRMED',
          entityType: 'ORDER',
          entityId: orderId,
          before: toPrismaJson(before),
          after: toPrismaJson(nextConsumption),
        },
      });
    });

    return { ok: true, cadConsumption: nextConsumption, fabricOrderSheetReady: true, cadTasksCompleted: true };
  }
}
