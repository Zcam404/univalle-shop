/**
 * Infraestructura · Configuración del servicio de Búsqueda.
 */

/** Token de inyección de dependencias para la configuración. */
export const SEARCH_CONFIG = Symbol('SearchConfig');

export interface SearchConfig {
  port: number;
  mongoUri: string;
  /** URL interna del servicio de Catálogo. */
  catalogUrl: string;
  /** Cada cuántos milisegundos se consulta el feed de cambios de Catálogo. */
  syncIntervalMs: number;
  requestTimeoutMs: number;
}

/**
 * @throws Error Si falta una variable obligatoria o un número no es válido.
 */
export function loadSearchConfig(env: NodeJS.ProcessEnv = process.env): SearchConfig {
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
    port: positiveInt('PORT', 3005),
    mongoUri: required('MONGO_URI'),
    catalogUrl: required('CATALOG_SERVICE_URL'),
    syncIntervalMs: positiveInt('SYNC_INTERVAL_MS', 10_000),
    requestTimeoutMs: positiveInt('REQUEST_TIMEOUT_MS', 5_000),
  };
}
