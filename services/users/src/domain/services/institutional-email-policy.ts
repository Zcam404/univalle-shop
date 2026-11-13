/**
 * Dominio · Servicio `InstitutionalEmailPolicy`.
 *
 * Aplica la regla central del negocio: solo pueden registrarse personas con un
 * correo de un dominio de la Universidad del Valle. Los dominios permitidos se
 * reciben al construirlo (vienen de la configuración), así que la regla se
 * ajusta sin modificar el código.
 */
import { NotInstitutionalEmailError } from '../errors/user.errors.js';
import { Email } from '../value-objects/email.js';

export class InstitutionalEmailPolicy {
  private readonly allowedDomains: readonly string[];

  /**
   * @param allowedDomains Dominios aceptados, sin arroba (ej. `correounivalle.edu.co`).
   * @throws Error Si la lista está vacía: sin dominios nadie podría registrarse.
   */
  constructor(allowedDomains: readonly string[]) {
    const normalized = allowedDomains.map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    if (normalized.length === 0) {
      throw new Error('Debe configurarse al menos un dominio de correo institucional.');
    }
    this.allowedDomains = normalized;
  }

  /** Indica si el correo pertenece exactamente a uno de los dominios permitidos. */
  isInstitutional(email: Email): boolean {
    return this.allowedDomains.includes(email.domain);
  }

  /**
   * Verifica que el correo sea institucional.
   *
   * @throws NotInstitutionalEmailError Si el dominio no está permitido.
   */
  ensureInstitutional(email: Email): void {
    if (!this.isInstitutional(email)) {
      throw new NotInstitutionalEmailError(this.allowedDomains);
    }
  }
}
