/**
 * Aplicación · Puerto de salida `Clock`.
 *
 * Fuente de la hora actual, para que las pruebas puedan fijarla.
 */

/** Token de inyección de dependencias para este puerto. */
export const CLOCK = Symbol('Clock');

export interface Clock {
  now(): Date;
}
