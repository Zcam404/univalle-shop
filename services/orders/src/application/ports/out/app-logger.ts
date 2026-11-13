/**
 * Aplicación · Puerto de salida `AppLogger`.
 *
 * Registra avisos de operaciones que fallaron sin detener el caso de uso
 * (por ejemplo, confirmar una reserva cuando Catálogo está caído), para que el
 * equipo pueda revisarlas.
 */

/** Token de inyección de dependencias para este puerto. */
export const APP_LOGGER = Symbol('AppLogger');

export interface AppLogger {
  warn(message: string): void;
}
