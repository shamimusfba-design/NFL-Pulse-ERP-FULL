import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth';
import { DOMAIN_MODULES } from './domain-registry';

@Controller('domain')
@UseGuards(JwtAuthGuard)
export class DomainController {
  @Get('modules')
  modules() {
    return DOMAIN_MODULES;
  }
}
