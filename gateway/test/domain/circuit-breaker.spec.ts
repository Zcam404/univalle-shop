/**
 * Pruebas del circuit breaker: cerrado → abierto → semiabierto → cerrado/abierto.
 */
import { CircuitBreaker } from '../../src/domain/circuit-breaker.js';

function breaker() {
  return new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
}

describe('CircuitBreaker', () => {
  it('se abre tras N fallos seguidos y rechaza peticiones', () => {
    const b = breaker();
    for (let i = 0; i < 3; i++) {
      expect(b.tryAcquire(0)).toBe(true);
      b.recordFailure(0);
    }
    expect(b.currentState(0)).toBe('OPEN');
    expect(b.tryAcquire(500)).toBe(false);
  });

  it('un éxito reinicia el contador de fallos', () => {
    const b = breaker();
    b.recordFailure(0);
    b.recordFailure(0);
    b.recordSuccess();
    b.recordFailure(0);
    expect(b.currentState(0)).toBe('CLOSED');
  });

  it('pasado el tiempo deja salir una sola prueba; si funciona, se cierra', () => {
    const b = breaker();
    for (let i = 0; i < 3; i++) b.recordFailure(0);

    expect(b.currentState(1000)).toBe('HALF_OPEN');
    expect(b.tryAcquire(1000)).toBe(true);
    expect(b.tryAcquire(1001)).toBe(false); // solo una prueba a la vez
    b.recordSuccess();
    expect(b.currentState(1001)).toBe('CLOSED');
    expect(b.tryAcquire(1001)).toBe(true);
  });

  it('si la prueba falla, se vuelve a abrir por otro periodo completo', () => {
    const b = breaker();
    for (let i = 0; i < 3; i++) b.recordFailure(0);
    b.tryAcquire(1000);
    b.recordFailure(1000);
    expect(b.currentState(1500)).toBe('OPEN');
    expect(b.currentState(2000)).toBe('HALF_OPEN');
  });
});
