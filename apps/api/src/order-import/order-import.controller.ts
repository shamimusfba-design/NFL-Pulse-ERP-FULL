import { Controller, ForbiddenException, Post, UploadedFile, UseGuards, UseInterceptors, Body, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth';
import { OrderImportService } from './order-import.service';
import { PrismaService } from '../prisma.service';
import { OrderImportPreview } from './order-import.types';
import { persistImportedOrder } from './order-import.persist';

@Controller('orders/import')
@UseGuards(JwtAuthGuard)
export class OrderImportController {
  constructor(private readonly imports: OrderImportService, private readonly prisma: PrismaService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  preview(@UploadedFile() file: any, @Body('buyerCode') buyerCode: string | undefined, @Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => ['ADMIN', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'].includes(role))) throw new ForbiddenException('PO Import is not allowed for this user');
    return this.imports.preview(file, buyerCode);
  }

  @Post('confirm')
  confirm(@Body() body: {
    preview: OrderImportPreview;
    buyerId: string;
    merchandiserId?: string;
    approveNeedReview?: boolean;
    jobType?: 'NEW' | 'REPEAT';
    repeatBaseJobNo?: string;
    repeatLotNo?: string;
  }, @Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => ['ADMIN', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'].includes(role))) throw new ForbiddenException('PO Import is not allowed for this user');
    const merchRoles = ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH'];
    const ownsOrder = (req.user.roles || []).some((role: string) => merchRoles.includes(role));
    return persistImportedOrder({
      prisma: this.prisma,
      preview: body.preview,
      buyerId: body.buyerId,
      merchandiserId: ownsOrder ? req.user.id : body.merchandiserId,
      userId: req.user.id,
      approveNeedReview: body.approveNeedReview,
      jobType: body.jobType,
      repeatBaseJobNo: body.repeatBaseJobNo,
      repeatLotNo: body.repeatLotNo,
    });
  }
}
