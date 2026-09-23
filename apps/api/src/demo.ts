import { Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';
import { clearDemoData, demoStatus, loadDemoData } from '../prisma/demo-data';

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private prisma: PrismaService) {}

  private admin(req: any) {
    if (!req.user.roles?.includes('ADMIN')) throw new ForbiddenException('Demo data controls are admin only');
  }

  private sectionKey(slug: string) {
    const keyMap: Record<string, string> = {
      yarn: 'yarn', procurement: 'procurement', 'yarn-store': 'yarnStore', 'yarn-dyeing': 'yarnDyeing',
      knitting: 'knitting', 'greige-store': 'greigeStore', dyeing: 'dyeing', lab: 'labTesting',
      'fabric-finishing': 'fabricFinishing', 'finished-fabric': 'finishedFabricStore', cutting: 'cutting', printing: 'printing',
      embroidery: 'embroidery', 'special-process': 'specialProcess', sewing: 'sewing', finishing: 'finishing', quality: 'quality',
      'quality-history': 'quality', trims: 'trims', inventory: 'yarnStore', shipment: 'shipment',
      'sample-merchandising': 'sample', 'central-sample': 'sample', 'sample-fabric-store': 'sample', technical: 'cad', cad: 'cad',
      capacity: 'sewing', 'sewing-planning': 'sewing', subcontract: 'printing', 'ie-overview': 'ie', 'ie-bulletin': 'ie',
      'ie-daily-target': 'ieDailyTarget', 'ie-npt': 'ieNpt', 'ie-skill-matrix': 'ieSkillMatrix', 'ie-production-checkpoints': 'ieCheckpoints', 'ie-reports': 'ie',
      management: 'shipment', 'job-360': 'shipment', reports: 'shipment', 'floor-display': 'sewing', 'lead-time-history': 'shipment',
    };
    return keyMap[slug] || 'shipment';
  }

  @Get('module/:slug')
  async modulePreview(@Param('slug') slug: string) {
    const key = this.sectionKey(slug);
    const orders = await this.prisma.order.findMany({
      include: { buyer: true, styles: { include: { purchaseOrders: true } }, tasks: true },
      orderBy: { jobNo: 'asc' }, take: 250,
    });
    return orders.filter((o) => (o.sourceMetadata as any)?.demoData === true).map((order) => {
      const style = order.styles[0];
      const sm = (style?.sourceMetadata || {}) as any;
      const production = sm.production || {};
      const sectionData = sm.sectionData?.[key] || {};
      const sectionStatus = sectionData.status || sectionData.latestStatus || sm.demoSectionStatus?.[slug] || sm.demoSectionStatus?.[key] || sm.merchandisingFollowUp?.presentStatus || 'Demo';
      const task = order.tasks.find((t) => t.status !== 'COMPLETED') || order.tasks[0];
      const noAction = ['Complete', 'Pass', 'Ready', 'Released / Monitoring', 'N/A', 'Shipped'].includes(String(sectionStatus));
      return {
        orderId: order.id, jobNo: order.jobNo, buyer: order.buyer?.name, styleNo: style?.styleNo,
        itemDescription: style?.itemDescription, orderQty: style?.quantity || order.totalQty, sectionStatus,
        production, sectionData,
        pendingAction: noAction ? 'No action' : `${slug.replace(/-/g, ' ')} follow-up`,
        task: task ? { title: task.title, status: task.status, priority: task.priority, module: task.module } : null,
      };
    });
  }

  @Get('job360')
  async job360List() {
    const orders = await this.prisma.order.findMany({
      where: {}, include: { buyer: true, styles: { include: { purchaseOrders: true } } }, orderBy: { jobNo: 'asc' }, take: 300,
    });
    return orders.filter((o) => (o.sourceMetadata as any)?.demoData === true).map((order) => {
      const style = order.styles[0];
      const sm = (style?.sourceMetadata || {}) as any;
      return {
        id: order.id, jobNo: order.jobNo, buyer: order.buyer?.name, styleNo: style?.styleNo,
        itemDescription: style?.itemDescription, orderQty: style?.quantity || order.totalQty,
        ccd: style?.purchaseOrders?.[0]?.ccd || style?.purchaseOrders?.[0]?.shipmentDate || null,
        presentStatus: sm.merchandisingFollowUp?.presentStatus || 'Confirmed',
        qualityStatus: sm.sectionData?.quality?.latestStatus || '—',
        shipmentStatus: sm.sectionData?.shipment?.status || '—',
      };
    });
  }

  @Get('job360/:orderId')
  async job360Detail(@Param('orderId') orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, factory: true, styles: { include: { breakdowns: true, purchaseOrders: true } }, tasks: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Job not found');
    const style = order.styles[0];
    const sm = (style?.sourceMetadata || {}) as any;
    const om = (order.sourceMetadata || {}) as any;
    return {
      order: {
        id: order.id, jobNo: order.jobNo, buyer: order.buyer?.name, factory: order.factory?.name,
        orderQty: style?.quantity || order.totalQty, styleNo: style?.styleNo, itemDescription: style?.itemDescription,
        collection: style?.collection, season: style?.season, fobPrice: sm.fobPrice || null, itemImageUrl: sm.itemImageUrl || null,
        ccd: style?.purchaseOrders?.[0]?.ccd || style?.purchaseOrders?.[0]?.shipmentDate || null,
        poNo: style?.purchaseOrders?.[0]?.poNumber || null,
      },
      merchandising: sm.merchandisingFollowUp || {}, planning: sm.planning || om.taPlan || {},
      production: sm.production || {}, sectionData: sm.sectionData || {},
      qualityHistory: sm.qualityHistory || [], testReports: sm.testReports || [], leadTimeHistory: sm.leadTimeHistory || [],
      tasks: order.tasks.map((t) => ({ id: t.id, title: t.title, module: t.module, status: t.status, priority: t.priority, dueAt: t.dueAt, blockedReason: t.blockedReason })),
    };
  }

  @Get('status')
  async status(@Req() req: any) { this.admin(req); return demoStatus(this.prisma); }

  @Post('load')
  async load(@Req() req: any) { this.admin(req); return loadDemoData(this.prisma, req.user.id); }

  @Delete('clear')
  async clear(@Req() req: any) { this.admin(req); return clearDemoData(this.prisma); }
}
