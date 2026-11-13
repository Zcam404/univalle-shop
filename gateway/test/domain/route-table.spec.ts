/**
 * Pruebas de la tabla de rutas y de la política de acceso.
 */
import { AccessPolicy } from '../../src/domain/access-policy.js';
import { AuthenticationRequiredError, InsufficientRoleError, RouteNotFoundError } from '../../src/domain/gateway.errors.js';
import { RouteTable } from '../../src/domain/route-table.js';

const table = new RouteTable([
  { prefix: '/api/auth', service: 'users', targetPrefix: '/auth', defaultAccess: 'public' },
  { prefix: '/api/users/', service: 'users', targetPrefix: '/users', defaultAccess: 'authenticated' },
  {
    prefix: '/api/catalog',
    service: 'catalog',
    targetPrefix: '/',
    rules: [
      { methods: ['GET'], access: 'public' },
      { methods: ['POST'], path: /^\/reservations/, access: 'authenticated' },
    ],
    defaultAccess: 'admin',
  },
]);

describe('RouteTable', () => {
  it('traduce el prefijo público al interno del servicio', () => {
    expect(table.resolve('GET', '/api/users/me/addresses')).toEqual({
      service: 'users',
      targetPath: '/users/me/addresses',
      access: 'authenticated',
    });
    expect(table.resolve('post', '/api/auth/login').targetPath).toBe('/auth/login');
  });

  it('el prefijo exacto se traduce a la raíz del destino', () => {
    expect(table.resolve('GET', '/api/catalog').targetPath).toBe('/');
    expect(table.resolve('GET', '/api/catalog/products/1').targetPath).toBe('/products/1');
  });

  it('aplica la primera regla que coincide y si no, el acceso por defecto', () => {
    expect(table.resolve('GET', '/api/catalog/products').access).toBe('public');
    expect(table.resolve('POST', '/api/catalog/reservations').access).toBe('authenticated');
    expect(table.resolve('POST', '/api/catalog/products').access).toBe('admin');
  });

  it('no confunde prefijos parecidos ni rutas desconocidas', () => {
    expect(() => table.resolve('GET', '/api/usersx/me')).toThrow(RouteNotFoundError);
    expect(() => table.resolve('GET', '/otra')).toThrow(RouteNotFoundError);
  });
});

describe('AccessPolicy', () => {
  const customer = { userId: 'u1', email: 'a@x.co', role: 'CUSTOMER' as const };
  const admin = { ...customer, role: 'ADMIN' as const };

  it('deja pasar a todos en rutas públicas', () => {
    expect(() => AccessPolicy.ensureAllowed('public', null)).not.toThrow();
  });

  it('exige sesión en rutas autenticadas', () => {
    expect(() => AccessPolicy.ensureAllowed('authenticated', null)).toThrow(AuthenticationRequiredError);
    expect(() => AccessPolicy.ensureAllowed('authenticated', customer)).not.toThrow();
  });

  it('exige rol ADMIN en rutas de administración', () => {
    expect(() => AccessPolicy.ensureAllowed('admin', customer)).toThrow(InsufficientRoleError);
    expect(() => AccessPolicy.ensureAllowed('admin', admin)).not.toThrow();
  });
});
