/**
 * Infraestructura · Rutas públicas del gateway.
 *
 * Aquí se declara qué prefijo va a qué microservicio y qué acceso exige cada
 * ruta. Para exponer un servicio nuevo solo se agrega su bloque a esta lista.
 *
 * | Ruta pública         | Servicio | Ruta interna | Acceso          |
 * |----------------------|----------|--------------|-----------------|
 * | /api/auth/**         | users    | /auth/**     | público         |
 * | /api/users/**        | users    | /users/**    | con sesión      |
 * | /api/catalog/**      | catalog  | /products/** y /categories/** | GET público; el resto solo admin |
 * | /api/cart/**         | orders   | /cart/**     | con sesión      |
 * | /api/orders/**       | orders   | /orders/**   | con sesión      |
 * | /api/admin/orders/** | orders   | /admin/orders/** | solo admin  |
 * | /api/payments/**     | payments | /payments/** | con sesión      |
 * | /api/search/**       | search   | /search/**   | público; /recent con sesión |
 * | /api/admin/search/** | search   | /admin/**    | solo admin      |
 * | /api/recommendations/** | recommendation | /recommendations/** | público; /me con sesión |
 *
 * Las rutas `/internal/**` de los servicios no se mapean: solo las usan otros
 * servicios dentro de la red de Docker.
 */
import { RateLimitRule } from '../../domain/rate-limiter.js';
import { RouteDefinition } from '../../domain/route-table.js';

export const ROUTES: RouteDefinition[] = [
  // Registro, verificación de correo e inicio de sesión: no requieren token.
  { prefix: '/api/auth', service: 'users', targetPrefix: '/auth', defaultAccess: 'public' },

  // Perfil y direcciones del usuario autenticado.
  { prefix: '/api/users', service: 'users', targetPrefix: '/users', defaultAccess: 'authenticated' },

  // Catálogo: cualquiera puede ver productos y categorías; solo el admin los modifica.
  {
    prefix: '/api/catalog/products',
    service: 'catalog',
    targetPrefix: '/products',
    rules: [{ methods: ['GET'], access: 'public' }],
    defaultAccess: 'admin',
  },
  {
    prefix: '/api/catalog/categories',
    service: 'catalog',
    targetPrefix: '/categories',
    rules: [{ methods: ['GET'], access: 'public' }],
    defaultAccess: 'admin',
  },

  // Pedidos: carrito, compra e historial del usuario; panel de pedidos para el admin.
  { prefix: '/api/cart', service: 'orders', targetPrefix: '/cart', defaultAccess: 'authenticated' },
  { prefix: '/api/orders', service: 'orders', targetPrefix: '/orders', defaultAccess: 'authenticated' },
  { prefix: '/api/admin/orders', service: 'orders', targetPrefix: '/admin/orders', defaultAccess: 'admin' },

  // Pagos: el cliente consulta el pago de su pedido. Cobrar y reembolsar son rutas internas.
  { prefix: '/api/payments', service: 'payments', targetPrefix: '/payments', defaultAccess: 'authenticated' },

  // Búsqueda: pública (si hay sesión, se guarda el historial); el historial propio exige sesión.
  {
    prefix: '/api/search',
    service: 'search',
    targetPrefix: '/search',
    rules: [{ path: /^\/recent/, access: 'authenticated' }],
    defaultAccess: 'public',
  },
  { prefix: '/api/admin/search', service: 'search', targetPrefix: '/admin', defaultAccess: 'admin' },

  // Recomendación: populares y relacionados son públicos; las personalizadas exigen sesión.
  {
    prefix: '/api/recommendations',
    service: 'recommendation',
    targetPrefix: '/recommendations',
    rules: [{ path: /^\/me/, access: 'authenticated' }],
    defaultAccess: 'public',
  },
];

/**
 * Límites de peticiones por cliente (usuario con sesión o IP).
 * - Ingreso, registro y reenvío de código: pocos intentos por minuto, para
 *   frenar a quien intente adivinar contraseñas o abusar del envío de correos.
 * - Todo lo demás: un límite generoso que solo detiene el abuso.
 */
export function rateLimitRules(limits: { authPerMinute: number; generalPerMinute: number }): RateLimitRule[] {
  return [
    {
      name: 'auth',
      methods: ['POST'],
      path: /^\/api\/auth\/(login|register|resend-code|verify-email)$/,
      limit: limits.authPerMinute,
      windowMs: 60_000,
    },
    { name: 'general', path: /^\/api\//, limit: limits.generalPerMinute, windowMs: 60_000 },
  ];
}
