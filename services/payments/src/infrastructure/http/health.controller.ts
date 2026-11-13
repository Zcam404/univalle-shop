/**
 * Infraestructura · Endpoint de salud.
 *
 * `GET /health` responde 200 si el servicio y su base MongoDB están
 * disponibles, y 503 si no. Lo usan el healthcheck de Docker Compose y el API
 * Gateway para saber si pueden enviarle peticiones.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongooseHealthIndicator,
  ) {}

  /** Comprueba que MongoDB responda a un ping. */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.mongo.pingCheck('mongodb', { timeout: 1500 })]);
  }
}
