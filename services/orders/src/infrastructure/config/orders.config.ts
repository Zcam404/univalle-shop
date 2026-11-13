/**
 * Infraestructura · Configuración del servicio de Pedidos.
 *
 * Lee y valida las variables de entorno una sola vez al arrancar.
 */

/** Token de inyección de dependencias para la configuración. */
export const ORDERS_CONFIG = Symbol('OrdersConfig');

export interface OrdersConfig {
  port: number;
  mongoUri: string;
  /** URL interna del servicio de Catálogo (ej. `http://catalog:3002`). */
  catalogUrl: string;
  /** URL interna del servicio de Pagos (ej. `http://payments:3004`). */
  paymentsUrl: string;
  /** Milisegundos máximos de espera en cada llamada a otro servicio. */
  requestTimeoutMs: number;
  circuitBreaker: { failureThreshold: number; resetTimeoutMs: number };
  /** Cada cuántos milisegundos se concilian los cobros en duda. */
  reconcileIntervalMs: number;
}

/**
 * @throws Error Si falta una variable obligatoria o un número no es válido.
 */
export function loadOrdersConfig(env: NodeJS.ProcessEnv = process.env): OrdersConfig {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Falta la variable de entorno obligatoria ${name}.`);
    return value.replace(/\/+$/, '');
  };
  const positiveInt = (name: string, fallback: number): number => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) throw new Error(`La variable ${name} debe ser un entero positivo.`);
    return value;
  };

  return {
    port: positiveInt('PORT', 3003),
    mongoUri: required('MONGO_URI'),
    catalogUrl: required('CATALOG_SERVICE_URL'),
    paymentsUrl: required('PAYMENTS_SERVICE_URL'),
    requestTimeoutMs: positiveInt('REQUEST_TIMEOUT_MS', 4_000),
    circuitBreaker: {
      failureThreshold: positiveInt('CIRCUIT_FAILURE_THRESHOLD', 5),
      resetTimeoutMs: positiveInt('CIRCUIT_RESET_TIMEOUT_MS', 30_000),
    },
    reconcileIntervalMs: positiveInt('RECONCILE_INTERVAL_MS', 60_000),
  };
}
