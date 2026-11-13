/**
 * Dominio · Value object `VerificationCode`.
 *
 * Código de 6 dígitos que se envía al correo institucional para comprobar que
 * el usuario realmente lo controla. Vence en una fecha y admite un número
 * limitado de intentos fallidos, para que no se pueda adivinar probando todas
 * las combinaciones. Es inmutable: registrar un intento fallido devuelve una
 * instancia nueva.
 */

/** Datos con los que se reconstruye un código guardado en la base de datos. */
export interface VerificationCodeProps {
  code: string;
  expiresAt: Date;
  failedAttempts: number;
}

export class VerificationCode {
  /** Cantidad de intentos fallidos permitidos antes de exigir un código nuevo. */
  static readonly MAX_ATTEMPTS = 5;

  private constructor(private readonly props: VerificationCodeProps) {}

  /**
   * Crea un código recién emitido, sin intentos fallidos.
   *
   * @param code Seis dígitos generados por el puerto `VerificationCodeGenerator`.
   * @param expiresAt Momento a partir del cual el código deja de servir.
   * @throws Error Si el código no son exactamente 6 dígitos (error de programación, no del usuario).
   */
  static issue(code: string, expiresAt: Date): VerificationCode {
    if (!/^\d{6}$/.test(code)) {
      throw new Error('El código de verificación debe tener exactamente 6 dígitos.');
    }
    return new VerificationCode({ code, expiresAt, failedAttempts: 0 });
  }

  /** Reconstruye un código desde la persistencia, sin volver a validarlo. */
  static restore(props: VerificationCodeProps): VerificationCode {
    return new VerificationCode({ ...props });
  }

  get code(): string {
    return this.props.code;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get failedAttempts(): number {
    return this.props.failedAttempts;
  }

  /** Intentos que quedan antes de que el código quede inutilizable. */
  get remainingAttempts(): number {
    return Math.max(0, VerificationCode.MAX_ATTEMPTS - this.props.failedAttempts);
  }

  /** Indica si el código ya venció en el instante `now`. */
  isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  /** Indica si el código todavía se puede usar en el instante `now` (no vencido y con intentos). */
  isUsable(now: Date): boolean {
    return !this.isExpired(now) && this.remainingAttempts > 0;
  }

  /** Compara el código con el que escribió el usuario (se ignoran espacios alrededor). */
  matches(candidate: string): boolean {
    return this.props.code === candidate.trim();
  }

  /** Devuelve una copia del código con un intento fallido más. */
  withFailedAttempt(): VerificationCode {
    return new VerificationCode({ ...this.props, failedAttempts: this.props.failedAttempts + 1 });
  }
}
