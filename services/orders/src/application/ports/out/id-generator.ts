/**
 * Aplicación · Puerto de salida `IdGenerator`.
 *
 * Genera identificadores únicos para pedidos. El dominio no
 * depende de los ObjectId de MongoDB, así que la base de datos se podría
 * cambiar sin afectar los identificadores.
 */

/** Token de inyección de dependencias para este puerto. */
export const ID_GENERATOR = Symbol('IdGenerator');

export interface IdGenerator {
  /** Devuelve un identificador único nuevo. */
  generate(): string;
}
