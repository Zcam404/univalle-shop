/**
 * Infraestructura · Adaptador de salida `JwtTokenVerifier`.
 *
 * Implementa el puerto `TokenVerifier` validando los JWT que emite el servicio
 * de Usuarios: firma HS256 con el secreto compartido, emisor esperado y fecha
 * de vencimiento.
 */
import jwt from 'jsonwebtoken';
import { TokenVerifier } from '../../application/ports/out/token-verifier.js';
import { Identity, Role } from '../../domain/identity.js';

const ROLES: readonly Role[] = ['CUSTOMER', 'ADMIN'];

export class JwtTokenVerifier implements TokenVerifier {
  /**
   * @param secret Mismo `JWT_SECRET` que usa el servicio de Usuarios.
   */
  constructor(private readonly secret: string) {}

  /** Devuelve la identidad del token, o `null` si la firma, el emisor, la fecha o el contenido no son válidos. */
  async verify(token: string): Promise<Identity | null> {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'], // impide que un token "alg: none" o con otro algoritmo se acepte
        issuer: 'univalle-shop-users',
      });
      if (typeof payload === 'string') return null;

      const { sub, email, role } = payload as { sub?: unknown; email?: unknown; role?: unknown };
      if (typeof sub !== 'string' || typeof email !== 'string' || !ROLES.includes(role as Role)) {
        return null;
      }
      return { userId: sub, email, role: role as Role };
    } catch {
      return null;
    }
  }
}
