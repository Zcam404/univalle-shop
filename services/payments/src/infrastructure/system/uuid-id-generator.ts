/**
 * Infraestructura · Adaptador de salida `UuidIdGenerator`.
 *
 * Implementa el puerto `IdGenerator` con UUID v4 aleatorios.
 */
import { randomUUID } from 'node:crypto';
import { IdGenerator } from '../../application/ports/out/id-generator.js';

export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
