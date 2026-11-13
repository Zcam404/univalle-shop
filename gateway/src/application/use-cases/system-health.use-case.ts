/**
 * Aplicación · Caso de uso: estado de salud de todo el sistema.
 *
 * Consulta en paralelo el `/health` de cada microservicio configurado y agrega
 * el estado del circuit breaker que el gateway tiene hacia cada uno. Sirve
 * para mostrar en una sola respuesta qué está funcionando.
 */
import { SystemHealthPort, SystemHealthView } from '../ports/in/system-health.port.js';
import { Clock } from '../ports/out/clock.js';
import { HealthProbe } from '../ports/out/health-probe.js';
import { CircuitBreakerRegistry } from '../services/circuit-breaker-registry.js';

export class SystemHealthUseCase implements SystemHealthPort {
  /**
   * @param services Nombres de los servicios a consultar (los que tienen URL configurada).
   */
  constructor(
    private readonly services: string[],
    private readonly probe: HealthProbe,
    private readonly breakers: CircuitBreakerRegistry,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<SystemHealthView> {
    const results = await Promise.all(this.services.map(async (name) => [name, await this.probe.probe(name)] as const));
    const now = this.clock.nowMs();
    const services = Object.fromEntries(
      results.map(([name, up]) => [
        name,
        { status: up ? ('up' as const) : ('down' as const), circuit: this.breakers.for(name).currentState(now) },
      ]),
    );
    return { status: results.every(([, up]) => up) ? 'ok' : 'degraded', services };
  }
}
