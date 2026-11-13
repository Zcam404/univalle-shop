/**
 * Pruebas del limitador de peticiones por ventanas fijas.
 */
import { RateLimiter } from '../../src/domain/rate-limiter.js';

describe('RateLimiter', () => {
  const limiter = () =>
    new RateLimiter([
      { name: 'auth', methods: ['POST'], path: /^\/api\/auth\//, limit: 3, windowMs: 60_000 },
      { name: 'general', path: /^\/api\//, limit: 5, windowMs: 60_000 },
    ]);

  it('permite hasta el límite y luego indica cuántos segundos esperar', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) expect(l.consume('POST', '/api/auth/login', 'ip:1', 0).allowed).toBe(true);
    expect(l.consume('POST', '/api/auth/login', 'ip:1', 15_000)).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it('cada regla y cada cliente tienen su propio contador', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) l.consume('POST', '/api/auth/login', 'ip:1', 0);
    expect(l.consume('GET', '/api/auth/login', 'ip:1', 0).allowed).toBe(true); // GET no es la regla auth
    expect(l.consume('POST', '/api/auth/login', 'ip:2', 0).allowed).toBe(true);
  });

  it('las rutas sin regla no tienen límite', () => {
    const l = limiter();
    for (let i = 0; i < 50; i++) expect(l.consume('GET', '/health', 'ip:1', 0).allowed).toBe(true);
  });

  it('borra contadores vencidos cuando hay demasiados clientes', () => {
    const l = new RateLimiter([{ name: 'g', path: /.*/, limit: 1, windowMs: 1000 }], 2);
    l.consume('GET', '/x', 'a', 0);
    l.consume('GET', '/x', 'b', 0);
    l.consume('GET', '/x', 'c', 5000); // dispara la limpieza
    expect(l.consume('GET', '/x', 'a', 5000).allowed).toBe(true);
  });
});
