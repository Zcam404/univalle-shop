/**
 * Aplicación · Puerto de salida `VerificationCodeGenerator`.
 *
 * Genera los códigos de 6 dígitos para verificar el correo. Está detrás de un
 * puerto para que las pruebas usen un código fijo y predecible.
 */

/** Token de inyección de dependencias para este puerto. */
export const VERIFICATION_CODE_GENERATOR = Symbol('VerificationCodeGenerator');

export interface VerificationCodeGenerator {
  /** Devuelve un código nuevo de exactamente 6 dígitos (puede empezar en cero). */
  generate(): string;
}
