/**
 * Infraestructura · Configuración del gateway.
 *
 * Lee las variables de entorno una vez al arrancar. Las URLs de los
 * microservicios se declaran con el patrón `<SERVICIO>_SERVICE_URL`
 * (ej. `USERS_SERVICE_URL=http://users:3001`), así agregar un servicio no
 * exige tocar este archivo.
 */

/** Token de inyección de dependencias para la configuración. */
export const GATEWAY_CONFIG = Symbol('GatewayConfig');

export interface GatewayConfig {
  port: number;
  /** Secreto compartido con el servicio de Usuarios para validar los JWT. */
  jwtSecret: string;
  /** URL base de cada microservicio, por nombre en minúsculas (ej. `users`). */
  serviceUrls: Record<string, string>;
  /** Milisegundos máximos de espera por la respuesta de un servicio. */
  upstreamTimeoutMs: number;
  circuitBreaker: { failureThreshold: number; resetTimeoutMs: number };
  /** Límites de peticiones por cliente y por minuto. */
  rateLimit: { authPerMinute: number; generalPerMinute: number };
  /** Orígenes del navegador autorizados por CORS (el frontend). */
  corsOrigins: string[];
}

/**
 * Construye la configuración a partir de las variables de entorno.
 *
 * @throws Error Si falta una variable obligatoria o un número no es válido.
 */
export function loadGatewayConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Falta la variable de entorno obligatoria ${name}.`);
    return value;
  };

  const positiveInt = (name: string, fallback: number): number => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`La variable ${name} debe ser un entero positivo (valor recibido: "${raw}").`);
    }
    return value;
  };

  // USERS_SERVICE_URL=http://users:3001  →  { users: 'http://users:3001' }
  const serviceUrls = Object.fromEntries(
    Object.entries(env)
      .filter(([name, value]) => name.endsWith('_SERVICE_URL') && value?.trim())
      .map(([name, value]) => [name.slice(0, -'_SERVICE_URL'.length).toLowerCase(), value!.trim().replace(/\/+$/, '')]),
  );

  return {
    port: positiveInt('PORT', 3000),
    jwtSecret: required('JWT_SECRET'),
    serviceUrls,
    upstreamTimeoutMs: positiveInt('UPSTREAM_TIMEOUT_MS', 5_000),
    circuitBreaker: {
      failureThreshold: positiveInt('CIRCUIT_FAILURE_THRESHOLD', 5),
      resetTimeoutMs: positiveInt('CIRCUIT_RESET_TIMEOUT_MS', 30_000),
    },
    rateLimit: {
      authPerMinute: positiveInt('RATE_LIMIT_AUTH_PER_MINUTE', 10),
      generalPerMinute: positiveInt('RATE_LIMIT_PER_MINUTE', 300),
    },
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:8080,http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
