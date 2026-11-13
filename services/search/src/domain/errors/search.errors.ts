/**
 * Dominio · Errores de negocio del servicio de Búsqueda.
 */
import { DomainError } from './domain.error.js';

/** Los parámetros de la búsqueda no son válidos (ej. precio mínimo mayor que el máximo). */
export class InvalidSearchQueryError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_SEARCH_QUERY';
}
