/**
 * Aplicación · Registro de circuit breakers.
 *
 * Mantiene un circuit breaker independiente por microservicio: si Catálogo se
 * cae, se abre solo su circuito y las peticiones a Usuarios siguen pasando.
 */
import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from '../../domain/circuit-breaker.js';

export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  /**
   * @param options Configuración que se aplica a cada breaker nuevo.
   */
  constructor(private readonly options: CircuitBreakerOptions) {}

  /** Devuelve el breaker del servicio, creándolo la primera vez. */
  for(service: string): CircuitBreaker {
    let breaker = this.breakers.get(service);
    if (!breaker) {
      breaker = new CircuitBreaker(this.options);
      this.breakers.set(service, breaker);
    }
    return breaker;
  }

  /** Estado de cada circuito conocido, para el endpoint de salud. */
  states(now: number): Record<string, CircuitState> {
    return Object.fromEntries([...this.breakers].map(([name, b]) => [name, b.currentState(now)]));
  }
}
