/**
 * Infraestructura · Filtro HTTP para errores del gateway.
 *
 * Responde con el mismo formato que usan los microservicios:
 *   { "statusCode": 503, "error": "SERVICE_UNAVAILABLE", "message": "..." }
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { GatewayError, GatewayErrorKind, TooManyRequestsError } from '../../domain/gateway.errors.js';

/** Tabla de traducción de categoría de error a código HTTP. */
const STATUS_BY_KIND: Record<GatewayErrorKind, HttpStatus> = {
  not_found: HttpStatus.NOT_FOUND,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  rate_limited: HttpStatus.TOO_MANY_REQUESTS,
};

@Catch(GatewayError)
export class GatewayErrorFilter implements ExceptionFilter {
  catch(error: GatewayError, host: ArgumentsHost): void {
    const status = STATUS_BY_KIND[error.kind];
    const response = host.switchToHttp().getResponse<Response>();
    // Indica al cliente cuándo puede reintentar.
    if (error instanceof TooManyRequestsError) response.setHeader('Retry-After', String(error.retryAfterSeconds));
    else if (status === HttpStatus.SERVICE_UNAVAILABLE) response.setHeader('Retry-After', '10');
    response.status(status).json({ statusCode: status, error: error.code, message: error.message });
  }
}
