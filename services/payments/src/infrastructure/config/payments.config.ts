/**
 * Infraestructura · Configuración del servicio de Pagos.
 */

/** Token de inyección de dependencias para la configuración. */
export const PAYMENTS_CONFIG = Symbol('PaymentsConfig');

export interface PaymentsConfig {
  port: number;
  mongoUri: string;
  /** Demora del procesador simulado, en milisegundos. */
  simulatedLatencyMs: number;
}

/**
 * @throws Error Si falta MONGO_URI o un número no es válido.
 */
export function loadPaymentsConfig(env: NodeJS.ProcessEnv = process.env): PaymentsConfig {
  const mongoUri = env.MONGO_URI?.trim();
  if (!mongoUri) throw new Error('Falta la variable de entorno obligatoria MONGO_URI.');

  const port = Number(env.PORT ?? 3004);
  const latency = Number(env.SIMULATED_LATENCY_MS ?? 150);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT no es un puerto válido: "${env.PORT}".`);
  if (!Number.isInteger(latency) || latency < 0) throw new Error('SIMULATED_LATENCY_MS debe ser un entero ≥ 0.');

  return { port, mongoUri, simulatedLatencyMs: latency };
}
