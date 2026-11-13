/**
 * Infraestructura · Configuración del servicio de Catálogo.
 *
 * Lee y valida las variables de entorno una sola vez al arrancar.
 */

/** Token de inyección de dependencias para la configuración. */
export const CATALOG_CONFIG = Symbol('CatalogConfig');

export interface CatalogConfig {
  port: number;
  /** Cadena de conexión a la base MongoDB propia de este servicio. */
  mongoUri: string;
  /** Si es `true` y el catálogo está vacío, se cargan categorías y productos de ejemplo. */
  seedDemoData: boolean;
}

/**
 * @throws Error Si falta una variable obligatoria o el puerto no es válido.
 */
export function loadCatalogConfig(env: NodeJS.ProcessEnv = process.env): CatalogConfig {
  const mongoUri = env.MONGO_URI?.trim();
  if (!mongoUri) throw new Error('Falta la variable de entorno obligatoria MONGO_URI.');

  const port = Number(env.PORT ?? 3002);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT no es un puerto válido: "${env.PORT}".`);

  return { port, mongoUri, seedDemoData: env.SEED_DEMO_DATA?.trim().toLowerCase() === 'true' };
}
