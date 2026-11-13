/**
 * Infraestructura · Configuración del servicio de Recomendación.
 */

/** Token de inyección de dependencias para la configuración. */
export const RECOMMENDATION_CONFIG = Symbol('RecommendationConfig');

export interface RecommendationConfig {
  port: number;
  mongoUri: string;
  catalogUrl: string;
  ordersUrl: string;
  searchUrl: string;
  /** Cada cuántos milisegundos se consulta el feed de cambios de Catálogo. */
  syncIntervalMs: number;
  /** Tiempo máximo de espera al pedir señales a Pedidos y Búsqueda (corto: si tardan, se usa la caché). */
  signalsTimeoutMs: number;
}

/**
 * @throws Error Si falta una variable obligatoria o un número no es válido.
 */
export function loadRecommendationConfig(env: NodeJS.ProcessEnv = process.env): RecommendationConfig {
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
    port: positiveInt('PORT', 3006),
    mongoUri: required('MONGO_URI'),
    catalogUrl: required('CATALOG_SERVICE_URL'),
    ordersUrl: required('ORDERS_SERVICE_URL'),
    searchUrl: required('SEARCH_SERVICE_URL'),
    syncIntervalMs: positiveInt('SYNC_INTERVAL_MS', 15_000),
    signalsTimeoutMs: positiveInt('SIGNALS_TIMEOUT_MS', 1_500),
  };
}
