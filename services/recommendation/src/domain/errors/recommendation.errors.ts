/**
 * Dominio · Errores de negocio del servicio de Recomendación.
 */
import { DomainError } from './domain.error.js';

/** El producto pedido no está en la copia local del catálogo. */
export class ProductNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor() {
    super('No se encontró el producto.');
  }
}
