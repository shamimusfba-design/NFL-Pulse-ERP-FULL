import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private prisma: PrismaService) {}

  @Get('my')
  my(@Req() req: any) {
    const roles: string[] = req.user.roles || [];
    const base: any = { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } };
    if (roles.includes('ADMIN')) {
      // Administrator can test and supervise the complete task engine.
    } else if (roles.includes('MANAGEMENT')) {
      base.priority = { in: ['HIGH', 'CRITICAL'] };
    } else {
      base.OR = [{ ownerUserId: req.user.id }, { ownerRoleCode: { in: roles } }];
    }
    return this.prisma.task.findMany({
      where: base,
      include: { order: { include: { buyer: true, factory: true } } },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    });
  }
}
