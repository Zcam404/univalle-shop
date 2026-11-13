/**
 * Aplicación · Puerto de salida `TokenVerifier`.
 *
 * Valida el token de acceso que emite el servicio de Usuarios y extrae la
 * identidad. El formato concreto (JWT firmado con HS256) lo conoce solo el adaptador.
 */
import { Identity } from '../../../domain/identity.js';

/** Token de inyección de dependencias para este puerto. */
export const TOKEN_VERIFIER = Symbol('TokenVerifier');

export interface TokenVerifier {
  /**
   * @param token Token sin el prefijo `Bearer `.
   * @returns La identidad, o `null` si el token es inválido, está mal firmado o venció.
   */
  verify(token: string): Promise<Identity | null>;
}
