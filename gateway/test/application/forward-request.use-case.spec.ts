/**
 * Pruebas del caso de uso principal del gateway.
 */
import { CircuitBreakerRegistry } from '../../src/application/services/circuit-breaker-registry.js';
import { ForwardRequestUseCase } from '../../src/application/use-cases/forward-request.use-case.js';
import {
  AuthenticationRequiredError,
  InsufficientRoleError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from '../../src/domain/gateway.errors.js';
import { RateLimiter } from '../../src/domain/rate-limiter.js';
import { RouteTable } from '../../src/domain/route-table.js';
import { FakeServiceClient, FakeTokenVerifier, ManualClock } from '../fakes/fakes.js';

function setup() {
  const client = new FakeServiceClient();
  const clock = new ManualClock();
  const routes = new RouteTable([
    { prefix: '/api/auth', service: 'users', targetPrefix: '/auth', defaultAccess: 'public' },
    { prefix: '/api/users', service: 'users', targetPrefix: '/users', defaultAccess: 'authenticated' },
    { prefix: '/api/admin', service: 'catalog', targetPrefix: '/admin', defaultAccess: 'admin' },
  ]);
  const tokens = new FakeTokenVerifier({
    'tok-ana': { userId: 'ana-id', email: 'ana@x.co', role: 'CUSTOMER' },
    'tok-admin': { userId: 'admin-id', email: 'admin@x.co', role: 'ADMIN' },
  });
  const breakers = new CircuitBreakerRegistry({ failureThreshold: 2, resetTimeoutMs: 1000 });
  const limiter = new RateLimiter([
    { name: 'auth', methods: ['POST'], path: /^\/api\/auth\/login$/, limit: 2, windowMs: 60_000 },
    { name: 'general', path: /^\/api\//, limit: 100, windowMs: 60_000 },
  ]);
  return { client, clock, useCase: new ForwardRequestUseCase(routes, tokens, client, breakers, clock, limiter) };
}

/** Petición GET con las cabeceras indicadas. */
const get = (path: string, headers: Record<string, string> = {}, clientIp = '10.0.0.1') => ({ method: 'GET', path, query: '', headers, clientIp });

describe('ForwardRequestUseCase', () => {
  it('reenvía rutas públicas sin token, con la ruta interna y la query', async () => {
    const t = setup();
    await t.useCase.execute({ method: 'POST', path: '/api/auth/login', query: '?x=1', headers: { 'content-type': 'application/json' }, clientIp: '10.0.0.1' });
    expect(t.client.calls[0]).toMatchObject({
      service: 'users',
      request: { method: 'POST', path: '/auth/login', query: '?x=1', headers: { 'content-type': 'application/json' } },
    });
  });

  it('agrega la identidad del token y quita el token', async () => {
    const t = setup();
    await t.useCase.execute(get('/api/users/me', { authorization: 'Bearer tok-ana' }));
    expect(t.client.calls[0].request.headers).toEqual({
      'x-user-id': 'ana-id',
      'x-user-email': 'ana@x.co',
      'x-user-role': 'CUSTOMER',
    });
  });

  it('descarta cabeceras de identidad falsificadas por el cliente', async () => {
    const t = setup();
    await t.useCase.execute(get('/api/auth/login', { 'x-user-id': 'admin-id', 'x-user-role': 'ADMIN' }));
    expect(t.client.calls[0].request.headers).toEqual({});
  });

  it('exige token en rutas protegidas y lo valida', async () => {
    const t = setup();
    await expect(t.useCase.execute(get('/api/users/me'))).rejects.toThrow(AuthenticationRequiredError);
    await expect(t.useCase.execute(get('/api/users/me', { authorization: 'Bearer falso' }))).rejects.toThrow(
      'Tu sesión no es válida',
    );
    expect(t.client.calls).toHaveLength(0);
  });

  it('en rutas públicas un token inválido se ignora', async () => {
    const t = setup();
    await t.useCase.execute(get('/api/auth/login', { authorization: 'Bearer falso' }));
    expect(t.client.calls[0].request.headers).toEqual({});
  });

  it('solo los ADMIN pasan a rutas de administración', async () => {
    const t = setup();
    await expect(t.useCase.execute(get('/api/admin/x', { authorization: 'Bearer tok-ana' }))).rejects.toThrow(
      InsufficientRoleError,
    );
    await t.useCase.execute(get('/api/admin/x', { authorization: 'Bearer tok-admin' }));
    expect(t.client.calls).toHaveLength(1);
  });

  it('si un servicio cae, abre su circuito sin afectar a los demás', async () => {
    const t = setup();
    t.client.down.add('catalog');
    const admin = { authorization: 'Bearer tok-admin' };

    // Dos fallos abren el circuito de catalog.
    await expect(t.useCase.execute(get('/api/admin/x', admin))).rejects.toThrow(ServiceUnavailableError);
    await expect(t.useCase.execute(get('/api/admin/x', admin))).rejects.toThrow(ServiceUnavailableError);

    // Con el circuito abierto ya no se llama al servicio: respuesta 503 inmediata.
    const callsBefore = t.client.calls.length;
    await expect(t.useCase.execute(get('/api/admin/x', admin))).rejects.toThrow(ServiceUnavailableError);
    expect(t.client.calls.length).toBe(callsBefore);

    // users sigue funcionando.
    const res = await t.useCase.execute(get('/api/auth/anything'));
    expect(res.status).toBe(200);

    // Cuando catalog vuelve y pasa el tiempo de espera, el circuito se cierra.
    t.client.down.delete('catalog');
    t.clock.ms = 1000;
    expect((await t.useCase.execute(get('/api/admin/x', admin))).status).toBe(200);
  });
});

describe('Límite de peticiones', () => {
  const login = (clientIp: string) => ({ method: 'POST', path: '/api/auth/login', query: '', headers: {}, clientIp });

  it('bloquea los intentos de ingreso que superan el límite, por IP', async () => {
    const t = setup();
    await t.useCase.execute(login('1.1.1.1'));
    await t.useCase.execute(login('1.1.1.1'));
    await expect(t.useCase.execute(login('1.1.1.1'))).rejects.toThrow(TooManyRequestsError);
    // Otra IP no se ve afectada.
    await expect(t.useCase.execute(login('2.2.2.2'))).resolves.toBeDefined();
    // Al empezar la siguiente ventana se puede volver a intentar.
    t.clock.ms = 60_000;
    await expect(t.useCase.execute(login('1.1.1.1'))).resolves.toBeDefined();
  });

  it('con sesión, el límite es por usuario y no por IP', async () => {
    const t = setup();
    const headers = { authorization: 'Bearer tok-ana' };
    for (let i = 0; i < 100; i++) await t.useCase.execute(get('/api/users/me', headers, `10.0.0.${i}`));
    await expect(t.useCase.execute(get('/api/users/me', headers, '10.9.9.9'))).rejects.toThrow(TooManyRequestsError);
  });
});
