/**
 * Aplicación · Puerto de salida `VerificationNotifier`.
 *
 * Contrato para hacerle llegar al usuario su código de verificación. El
 * adaptador actual lo envía por correo (SMTP); en las pruebas se usa uno falso
 * que solo recuerda los envíos.
 */

/** Token de inyección de dependencias para este puerto. */
export const VERIFICATION_NOTIFIER = Symbol('VerificationNotifier');

/** Datos del mensaje de verificación. */
export interface VerificationMessage {
  to: string;
  name: string;
  code: string;
  expiresAt: Date;
}

export interface VerificationNotifier {
  /**
   * Envía el código al usuario.
   * @throws Error Si el envío falla (servidor de correo caído, etc.).
   */
  sendVerificationCode(message: VerificationMessage): Promise<void>;
}
