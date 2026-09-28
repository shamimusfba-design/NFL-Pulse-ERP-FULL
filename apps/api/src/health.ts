import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  health() { return { ok: true, service: 'nfl-pulse-api', version: '0.4.33' }; }
}
