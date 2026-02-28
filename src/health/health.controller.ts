import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  check() {
    return { status: 'OK', message: 'Server is running' };
  }
}
