/**
 * Infraestructura · Adaptador de salida `SystemClock`: hora real del sistema.
 */
import { Clock } from '../../application/ports/out/clock.js';

export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}
