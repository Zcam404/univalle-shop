/**
 * Infraestructura · Adaptador de salida `JwtTokenIssuer`.
 *
 * Implementa el puerto `TokenIssuer` emitiendo JSON Web Tokens firmados con
 * HS256. El API Gateway valida la firma con el mismo secreto (`JWT_SECRET`) y
 * así sabe quién hace cada petición sin consultar a este servicio.
 */
import jwt from 'jsonwebtoken';
import { AccessToken, TokenClaims, TokenIssuer } from '../../application/ports/out/token-issuer.js';

export class JwtTokenIssuer implements TokenIssuer {
  /**
   * @param secret Secreto compartido con el gateway.
   * @param expiresInSeconds Duración del token.
   */
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  /** Firma un token con `sub` (id), `email` y `role`. */
  async issue(claims: TokenClaims): Promise<AccessToken> {
    const accessToken = jwt.sign({ email: claims.email, role: claims.role }, this.secret, {
      subject: claims.sub,
      expiresIn: this.expiresInSeconds,
      algorithm: 'HS256',
      issuer: 'univalle-shop-users',
    });
    return { accessToken, expiresIn: this.expiresInSeconds };
  }
}
