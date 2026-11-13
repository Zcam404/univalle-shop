/**
 * Infraestructura · Adaptador de salida `CryptoVerificationCodeGenerator`.
 *
 * Implementa el puerto `VerificationCodeGenerator` con el generador
 * criptográfico de Node.js. `Math.random()` no sirve aquí porque sus valores
 * se pueden predecir.
 */
import { randomInt } from 'node:crypto';
import { VerificationCodeGenerator } from '../../application/ports/out/verification-code-generator.js';

export class CryptoVerificationCodeGenerator implements VerificationCodeGenerator {
  /** Devuelve un número aleatorio entre 000000 y 999999, siempre con 6 dígitos. */
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
