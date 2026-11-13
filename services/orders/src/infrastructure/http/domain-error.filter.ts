/**
 * Infraestructura · Filtro HTTP para errores de dominio.
 *
 * Convierte cualquier `DomainError` lanzado por un caso de uso en una respuesta
 * HTTP con un formato uniforme:
 *   { "statusCode": 409, "error": "EMAIL_ALREADY_REGISTERED", "message": "..." }
 * El código de estado sale de la categoría (`kind`) del error, así este filtro
 * no cambia cuando se agregan errores nuevos.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, DomainErrorKind } from '../../domain/errors/domain.error.js';

/** Tabla de traducción de categoría de error a código HTTP. */
const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  validation: HttpStatus.BAD_REQUEST,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  /** Escribe la respuesta de error correspondiente al `DomainError` capturado. */
  catch(error: DomainError, host: ArgumentsHost): void {
    const status = STATUS_BY_KIND[error.kind];
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      error: error.code,
      message: error.message,
    });
  }
}
