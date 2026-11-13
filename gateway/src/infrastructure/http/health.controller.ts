/**
 * Infraestructura · Salud del gateway y del sistema.
 *
 * - `GET /health`: el gateway está vivo (lo usa el healthcheck de Docker).
 * - `GET /api/health`: estado de cada microservicio y de su circuito, para
 *   ver de un vistazo qué está funcionando. Es público y no pasa por el límite
 *   de peticiones.
 */
import { Controller, Get, Inject } from '@nestjs/common';
import { SYSTEM_HEALTH } from '../../application/ports/in/system-health.port.js';
import type { SystemHealthPort, SystemHealthView } from '../../application/ports/in/system-health.port.js';

@Controller()
export class HealthController {
  constructor(@Inject(SYSTEM_HEALTH) private readonly systemHealth: SystemHealthPort) {}

  /** El gateway responde: está vivo. */
  @Get('health')
  alive() {
    return { status: 'ok' };
  }

  /** Estado de todos los microservicios. Se declara antes del comodín `api/*path` para tener prioridad. */
  @Get('api/health')
  system(): Promise<SystemHealthView> {
    return this.systemHealth.execute();
  }
}
