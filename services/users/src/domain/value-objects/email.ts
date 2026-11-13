/**
 * Dominio · Value object `Email`.
 *
 * Representa un correo electrónico ya validado y normalizado (sin espacios y en
 * minúsculas). Si existe una instancia de `Email`, su formato es correcto: no
 * hace falta volver a validarlo en otras partes del código.
 */
import { InvalidEmailError } from '../errors/user.errors.js';

export class Email {
  /** Formato básico: texto@dominio.extensión, sin espacios. */
  private static readonly FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(readonly value: string) {}

  /**
   * Crea un `Email` a partir del texto que escribió el usuario.
   *
   * @param raw Correo tal como llega (puede tener mayúsculas o espacios alrededor).
   * @returns El correo normalizado.
   * @throws InvalidEmailError Si el texto no tiene formato de correo.
   */
  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!Email.FORMAT.test(normalized)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(normalized);
  }

  /** Parte del correo después de la arroba (ej. `correounivalle.edu.co`). */
  get domain(): string {
    return this.value.slice(this.value.lastIndexOf('@') + 1);
  }

  /** Indica si dos correos son el mismo (ya están normalizados, basta comparar el texto). */
  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
