/**
 * Dominio · Circuit breaker (cortacircuitos).
 *
 * Protege al gateway, y a todo el sistema, de un microservicio caído. Funciona
 * como el breaker eléctrico de una casa:
 *
 * - CERRADO (`CLOSED`): las peticiones pasan normalmente. Se cuentan los fallos seguidos.
 * - ABIERTO (`OPEN`): tras `failureThreshold` fallos seguidos, el gateway deja de
 *   llamar al servicio y responde 503 de inmediato, sin esperar timeouts. Así un
 *   servicio caído no hace lento todo lo demás.
 * - SEMIABIERTO (`HALF_OPEN`): pasado `resetTimeoutMs`, se deja pasar UNA petición
 *   de prueba. Si funciona, el circuito se cierra; si falla, vuelve a abrirse.
 *
 * El tiempo se recibe como parámetro (`now`) para poder probarlo sin esperar.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Fallos seguidos que abren el circuito. */
  failureThreshold: number;
  /** Milisegundos que el circuito permanece abierto antes de probar de nuevo. */
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;
  /** Evita que, en semiabierto, salgan varias peticiones de prueba a la vez. */
  private trialInFlight = false;

  constructor(private readonly options: CircuitBreakerOptions) {}

  /** Estado actual, considerando si ya pasó el tiempo de espera. */
  currentState(now: number): CircuitState {
    if (this.state === 'OPEN' && now - this.openedAt >= this.options.resetTimeoutMs) {
      return 'HALF_OPEN';
    }
    return this.state;
  }

  /**
   * Indica si se puede enviar una petición ahora. En semiabierto solo autoriza
   * la primera; las demás se rechazan hasta conocer el resultado de esa prueba.
   */
  tryAcquire(now: number): boolean {
    const state = this.currentState(now);
    if (state === 'CLOSED') return true;
    if (state === 'OPEN' || this.trialInFlight) return false;
    this.state = 'HALF_OPEN';
    this.trialInFlight = true;
    return true;
  }

  /** Registra una respuesta correcta: cierra el circuito y reinicia el contador. */
  recordSuccess(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.trialInFlight = false;
  }

  /** Registra un fallo; abre el circuito si se llegó al límite o si falló la prueba. */
  recordFailure(now: number): void {
    this.consecutiveFailures++;
    const trialFailed = this.state === 'HALF_OPEN';
    this.trialInFlight = false;
    if (trialFailed || this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = now;
    }
  }
}
