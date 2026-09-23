import { Controller, Get, UseGuards } from '@nestjs/common';
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
  lines() {
    return this.prisma.line.findMany({
      where: { active: true },
      include: { machinePools: true, floor: { include: { section: { include: { factory: true } } } } },
      orderBy: { name: 'asc' },
    });
  }
}
