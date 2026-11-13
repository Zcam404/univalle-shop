/**
 * Aplicación · Puerto de salida `TokenIssuer`.
 *
 * Contrato para emitir el token de acceso que el usuario presenta en cada
 * petición. El API Gateway lo valida con el mismo secreto. El formato concreto
 * (JWT) lo decide el adaptador.
 */
import { Role } from '../../../domain/value-objects/user-enums.js';

/** Token de inyección de dependencias para este puerto. */
export const TOKEN_ISSUER = Symbol('TokenIssuer');

/** Datos de identidad que viajan dentro del token. */
export interface TokenClaims {
  /** Identificador del usuario. */
  sub: string;
  email: string;
  role: Role;
}

/** Token emitido y su duración. */
export interface AccessToken {
  accessToken: string;
  /** Segundos hasta que el token vence. */
  expiresIn: number;
}

export interface TokenIssuer {
  /** Firma un token de acceso con los datos de identidad del usuario. */
  issue(claims: TokenClaims): Promise<AccessToken>;
}
