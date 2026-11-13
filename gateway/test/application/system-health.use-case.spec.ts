/**
 * Pruebas del estado de salud agregado del sistema.
 */
import { CircuitBreakerRegistry } from '../../src/application/services/circuit-breaker-registry.js';
import { SystemHealthUseCase } from '../../src/application/use-cases/system-health.use-case.js';
import { ManualClock } from '../fakes/fakes.js';

describe('SystemHealthUseCase', () => {
  it('marca el sistema como degradado si algún servicio no responde e incluye el circuito', async () => {
    const breakers = new CircuitBreakerRegistry({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breakers.for('catalog').recordFailure(0);
    const probe = { probe: async (s: string) => s !== 'catalog' };
    const health = await new SystemHealthUseCase(['catalog', 'users'], probe, breakers, new ManualClock(10)).execute();
    expect(health).toEqual({
      status: 'degraded',
      services: { catalog: { status: 'down', circuit: 'OPEN' }, users: { status: 'up', circuit: 'CLOSED' } },
    });
  });
});
