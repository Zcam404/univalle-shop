/**
 * Infraestructura · Adaptador de salida `BcryptPasswordHasher`.
 *
 * Implementa el puerto `PasswordHasher` con bcrypt. bcrypt es lento a
 * propósito y añade una sal aleatoria a cada hash, lo que dificulta adivinar
 * contraseñas aunque alguien obtenga la base de datos.
 */
import bcrypt from 'bcryptjs';
import { PasswordHasher } from '../../application/ports/out/password-hasher.js';

export class BcryptPasswordHasher implements PasswordHasher {
  /**
   * @param rounds Costo de bcrypt (10 = unas 2^10 iteraciones). Más alto es más
   *   seguro pero más lento en cada registro e inicio de sesión.
   */
  constructor(private readonly rounds = 10) {}

  /** Genera el hash con una sal aleatoria nueva. */
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  /** Compara la contraseña escrita con el hash guardado. */
  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
