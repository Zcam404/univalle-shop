/**
 * Aplicación · Servicio `VerificationCodeIssuer`.
 *
 * Crea códigos de verificación con su fecha de vencimiento. Lo comparten los
 * casos de uso de registro y de reenvío de código, para que la regla de
 * vencimiento esté en un solo lugar.
 */
import { VerificationCode } from '../../domain/value-objects/verification-code.js';
import { Clock } from '../ports/out/clock.js';
import { VerificationCodeGenerator } from '../ports/out/verification-code-generator.js';

export class VerificationCodeIssuer {
  /**
   * @param generator Puerto que produce los 6 dígitos.
   * @param clock Puerto que da la hora actual.
   * @param ttlMinutes Minutos de validez de cada código.
   */
  constructor(
    private readonly generator: VerificationCodeGenerator,
    private readonly clock: Clock,
    private readonly ttlMinutes: number,
  ) {}

  /** Genera un código nuevo que vence dentro de `ttlMinutes` minutos. */
  issue(): VerificationCode {
    const expiresAt = new Date(this.clock.now().getTime() + this.ttlMinutes * 60_000);
    return VerificationCode.issue(this.generator.generate(), expiresAt);
  }
}
