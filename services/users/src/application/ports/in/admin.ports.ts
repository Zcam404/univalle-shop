/**
 * Aplicación · Puerto de entrada para la cuenta administradora inicial.
 */

export const ENSURE_ADMIN_USER = Symbol('EnsureAdminUser');

export interface EnsureAdminUserCommand {
  name: string;
  email: string;
  password: string;
}

/**
 * Crea la cuenta administradora si todavía no existe. Se ejecuta al arrancar el
 * servicio con los datos de las variables de entorno.
 */
export interface EnsureAdminUserPort {
  /** @returns `true` si se creó la cuenta; `false` si ya existía. */
  execute(command: EnsureAdminUserCommand): Promise<boolean>;
}
