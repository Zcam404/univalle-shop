/**
 * Aplicación · Puerto de entrada `SystemHealthPort`: estado de todo el sistema.
 */
import { CircuitState } from '../../../domain/circuit-breaker.js';

/** Token de inyección de dependencias para este puerto. */
export const SYSTEM_HEALTH = Symbol('SystemHealth');

export interface ServiceHealth {
  status: 'up' | 'down';
  /** Estado del circuit breaker del gateway hacia ese servicio. */
  circuit: CircuitState;
}

export interface SystemHealthView {
  /** `ok` si todos responden; `degraded` si alguno está caído (el resto sigue funcionando). */
  status: 'ok' | 'degraded';
  services: Record<string, ServiceHealth>;
}

export interface SystemHealthPort {
  execute(): Promise<SystemHealthView>;
}
