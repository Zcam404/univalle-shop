/**
 * Aplicación · Puerto de salida `Clock`.
 *
 * Fuente de la hora actual. Los casos de uso la piden a este puerto en lugar de
 * usar `new Date()` directamente, así las pruebas pueden fijar la hora y
 * comprobar, por ejemplo, que un código vence a los 15 minutos.
 */

/** Token de inyección de dependencias para este puerto. */
export const CLOCK = Symbol('Clock');

export interface Clock {
  /** Devuelve el instante actual. */
  now(): Date;
}
