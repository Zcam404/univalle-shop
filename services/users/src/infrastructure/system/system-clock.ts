/**
 * Infraestructura · Adaptador de salida `SystemClock`.
 *
 * Implementa el puerto `Clock` con la hora real del sistema.
 */
import { Clock } from '../../application/ports/out/clock.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
