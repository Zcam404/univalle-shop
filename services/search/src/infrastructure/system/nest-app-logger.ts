/**
 * Infraestructura · Adaptador de salida `NestAppLogger`.
 *
 * Implementa el puerto `AppLogger` con el logger de NestJS (sale por consola y
 * se ve con `docker compose logs orders`).
 */
import { Logger } from '@nestjs/common';
import { AppLogger } from '../../application/ports/out/app-logger.js';

export class NestAppLogger implements AppLogger {
  private readonly logger = new Logger('Search');

  warn(message: string): void {
    this.logger.warn(message);
  }
}
