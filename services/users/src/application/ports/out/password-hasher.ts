/**
 * Aplicación · Puerto de salida `PasswordHasher`.
 *
 * Contrato para cifrar contraseñas de forma irreversible (hash) y comprobarlas.
 * El algoritmo concreto (bcrypt) lo decide el adaptador.
 */

/** Token de inyección de dependencias para este puerto. */
export const PASSWORD_HASHER = Symbol('PasswordHasher');

export interface PasswordHasher {
  /** Genera el hash que se guarda en la base de datos. */
  hash(plain: string): Promise<string>;

  /** Indica si la contraseña escrita corresponde al hash guardado. */
  compare(plain: string, hash: string): Promise<boolean>;
}
