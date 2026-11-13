/**
 * Dominio · Value object `PlainPassword`.
 *
 * Contraseña en texto plano que ya cumple la política de seguridad. Solo existe
 * en memoria durante el registro: lo que se guarda es su hash, que genera el
 * puerto `PasswordHasher`.
 */
import { WeakPasswordError } from '../errors/user.errors.js';

export class PlainPassword {
  static readonly MIN_LENGTH = 8;

  /** bcrypt ignora lo que pase de 72 bytes; se limita para que eso no ocurra en silencio. */
  static readonly MAX_LENGTH = 72;

  private constructor(readonly value: string) {}

  /**
   * Valida la contraseña contra la política: entre 8 y 72 caracteres, con al
   * menos una letra y al menos un número.
   *
   * @param raw Contraseña escrita por el usuario.
   * @throws WeakPasswordError Si no cumple alguna de las reglas.
   */
  static create(raw: string): PlainPassword {
    if (raw.length < PlainPassword.MIN_LENGTH || raw.length > PlainPassword.MAX_LENGTH) {
      throw new WeakPasswordError(
        `La contraseña debe tener entre ${PlainPassword.MIN_LENGTH} y ${PlainPassword.MAX_LENGTH} caracteres.`,
      );
    }
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(raw) || !/\d/.test(raw)) {
      throw new WeakPasswordError('La contraseña debe incluir al menos una letra y un número.');
    }
    return new PlainPassword(raw);
  }
}
