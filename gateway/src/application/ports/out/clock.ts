/**
 * Aplicación · Puerto de salida `Clock`.
 *
 * Hora actual en milisegundos. Permite que las pruebas controlen el tiempo del
 * circuit breaker sin esperar de verdad.
 */

/** Token de inyección de dependencias para este puerto. */
export const CLOCK = Symbol('Clock');

export interface Clock {
  /** Milisegundos desde la época Unix. */
  nowMs(): number;
}
