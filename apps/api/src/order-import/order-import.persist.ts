import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { OrderImportPreview } from './order-import.types';
import { resolveJobNumber } from '../job-number';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  // Parser metadata is plain JSON-like data. Serializing here removes undefined
  // properties and guarantees a Prisma-compatible JSON value.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function persistImportedOrder(args: {
  prisma: PrismaService;
  preview: OrderImportPreview;
  buyerId: string;
  merchandiserId?: string;
  userId: string;
  approveNeedReview?: boolean;
  jobType?: 'NEW' | 'REPEAT';
  repeatBaseJobNo?: string;
  repeatLotNo?: string;
}) {
  const { prisma, preview, buyerId, merchandiserId, userId, approveNeedReview, jobType, repeatBaseJobNo, repeatLotNo } = args;
  if (!preview.styles?.length) throw new BadRequestException('Import preview has no styles');
  const failedChecks = (preview.validation?.checks || []).filter((x) => !x.ok);
  const hardFailures = failedChecks.filter((x) => x.code !== 'PARSER_WARNINGS');
  if (hardFailures.length) throw new BadRequestException('Import totals do not reconcile. Correct the mismatches before confirming.');
  if (preview.validation?.status !== 'VALIDATED' && !approveNeedReview) {
    throw new BadRequestException('Import needs review. Explicit approval is required before confirming parser warnings.');
  }

  return prisma.$transaction(async (tx) => {
    // Customer orders are received in NFL's name. Factory is therefore implicit in Order Entry.
    // Later NFL/NCL production allocation belongs to Planning, not Order Entry.
    const factory = await tx.factory.findUnique({ where: { code: 'NFL' } });
    if (!factory) throw new BadRequestException('NFL factory master is missing');
    const buyer = await tx.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new BadRequestException('Buyer/Brand not found');

    const job = await resolveJobNumber(tx, factory.id, { jobType, repeatBaseJobNo, repeatLotNo });
    const jobNo = job.jobNo;
    const totalQty = preview.styles.reduce((s, x) => s + x.totalQty, 0);

    const order = await tx.order.create({
      data: {
        jobNo,
        factoryId: factory.id,
        buyerId,
        merchandiserId,
        source: 'IMPORT',
        totalQty,
        createdById: userId,
        sourceMetadata: toPrismaJson({
          parserFamily: preview.parserFamily,
          parserVersion: preview.parserVersion,
          sourceFileName: preview.sourceFileName,
          sourceMetadata: preview.sourceMetadata ?? null,
          needReviewApproved: Boolean(approveNeedReview && preview.validation?.status !== 'VALIDATED'),
          jobType: job.jobType,
          baseJobNo: job.baseJobNo,
          lotNo: job.lotNo,
        }),
        styles: {
          create: preview.styles.map((style) => ({
            styleNo: style.styleNo,
            itemDescription: style.styleDescription,
            quantity: style.totalQty,
            collection: style.collection,
            season: style.season,
            sourceMetadata: toPrismaJson(style.metadata),
            breakdowns: {
              create: style.colors.flatMap((color) => color.sizes.map((size) => ({
                color: color.color,
                colorCode: color.colorCode,
                size: size.size,
                qty: size.qty,
                ean: size.ean,
              }))),
            },
            purchaseOrders: {
              create: style.orderReferences.map((ref) => ({
                poNumber: ref.reference,
                referenceType: ref.referenceType,
                totalQty: ref.totalQty,
                ccd: ref.ccd ? new Date(ref.ccd) : undefined,
                shipmentDate: ref.shipmentDate ? new Date(ref.shipmentDate) : undefined,
                cancelDate: ref.cancelDate ? new Date(ref.cancelDate) : undefined,
                destination: ref.destination,
                market: ref.market,
                sourceMetadata: toPrismaJson(ref.metadata),
                breakdowns: {
                  create: ref.colors.flatMap((color) => color.sizes.map((size) => ({
                    color: color.color,
                    colorCode: color.colorCode,
                    size: size.size,
                    qty: size.qty,
                    ean: size.ean,
                  }))),
                },
              })),
            },
          })),
        },
      },
      include: {
        buyer: true,
        styles: { include: { breakdowns: true, purchaseOrders: { include: { breakdowns: true } } } },
      },
    });

    const [ieUser, cadUser, planningUser] = await Promise.all([
      tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'IE' } } } } }),
      tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'CAD' } } } } }),
      tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'PLANNING' } } } } }),
    ]);
    await tx.task.createMany({ data: [
      ...order.styles.map((style) => ({ title: `Complete IE / Operation Bulletin for ${jobNo} / ${style.styleNo}`, module: 'IE', entityType: 'STYLE', entityId: style.id, orderId: order.id, ownerUserId: ieUser?.id, ownerRoleCode: 'IE', priority: 'HIGH' as const })),
      { title: `CAD consumption required for ${jobNo}`, module: 'CAD', entityType: 'ORDER', entityId: order.id, orderId: order.id, ownerUserId: cadUser?.id, ownerRoleCode: 'CAD', priority: 'HIGH' },
      { title: `Generate / approve T&A for ${jobNo}`, module: 'T&A', entityType: 'ORDER', entityId: order.id, orderId: order.id, ownerUserId: planningUser?.id, ownerRoleCode: 'PLANNING', priority: 'HIGH' },
    ] });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'ORDER_IMPORTED',
        entityType: 'ORDER',
        entityId: order.id,
        after: { jobNo, totalQty, parserFamily: preview.parserFamily, parserVersion: preview.parserVersion, sourceFileName: preview.sourceFileName },
      },
    });
    return order;
  });
}
