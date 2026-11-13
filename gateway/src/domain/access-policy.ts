/**
 * Dominio · Política de acceso.
 *
 * Compara el nivel de acceso que exige una ruta con la identidad de quien
 * hace la petición y decide si la deja pasar.
 */
import { AuthenticationRequiredError, InsufficientRoleError } from './gateway.errors.js';
import { AccessLevel, Identity } from './identity.js';

export class AccessPolicy {
  /**
   * Comprueba que la identidad cumpla el nivel de acceso.
   *
   * @param access Nivel que exige la ruta.
   * @param identity Usuario autenticado, o `null` si no envió token.
   * @throws AuthenticationRequiredError Si la ruta exige sesión y no hay identidad.
   * @throws InsufficientRoleError Si la ruta es solo para administradores.
   */
  static ensureAllowed(access: AccessLevel, identity: Identity | null): void {
    if (access === 'public') return;
    if (!identity) throw new AuthenticationRequiredError('missing');
    if (access === 'admin' && identity.role !== 'ADMIN') throw new InsufficientRoleError();
  }
}
