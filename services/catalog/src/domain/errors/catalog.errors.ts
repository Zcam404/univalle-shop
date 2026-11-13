/**
 * Dominio · Errores de negocio del servicio de Catálogo.
 */
import { DomainError } from './domain.error.js';

/** Los datos de una categoría no son válidos. */
export class InvalidCategoryError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_CATEGORY';
}

/** Ya existe una categoría con ese nombre. */
export class CategoryNameTakenError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'CATEGORY_NAME_TAKEN';

  constructor(name: string) {
    super(`Ya existe una categoría llamada "${name}".`);
  }
}

/** No existe la categoría indicada. */
export class CategoryNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'CATEGORY_NOT_FOUND';

  constructor() {
    super('No se encontró la categoría.');
  }
}

/** La categoría tiene productos y por eso no se puede eliminar. */
export class CategoryInUseError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'CATEGORY_IN_USE';

  constructor(productCount: number) {
    super(`No se puede eliminar la categoría: tiene ${productCount} producto(s). Muévelos a otra categoría primero.`);
  }
}

/** Los datos de un producto no son válidos. */
export class InvalidProductError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_PRODUCT';
}

/** No existe el producto (o no está visible para quien lo pide). */
export class ProductNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor() {
    super('No se encontró el producto.');
  }
}

/** Un ajuste de inventario dejaría el stock en negativo. */
export class NegativeStockError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'NEGATIVE_STOCK';

  constructor(available: number) {
    super(`El ajuste dejaría el inventario en negativo (disponible: ${available}).`);
  }
}

/** Los datos de una reserva no son válidos (cantidades, productos repetidos, etc.). */
export class InvalidReservationError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_RESERVATION';
}

/** Un producto del pedido no existe o está desactivado. */
export class ProductNotAvailableError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'PRODUCT_NOT_AVAILABLE';

  constructor(readonly productId: string) {
    super(`El producto ${productId} ya no está disponible.`);
  }
}

/** No hay unidades suficientes de un producto para el pedido. */
export class InsufficientStockError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'INSUFFICIENT_STOCK';

  constructor(
    readonly productId: string,
    productName: string,
    readonly available: number,
  ) {
    super(`No hay suficientes unidades de "${productName}" (disponibles: ${available}).`);
  }
}

/** No existe una reserva para ese pedido. */
export class ReservationNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'RESERVATION_NOT_FOUND';

  constructor() {
    super('No existe una reserva para ese pedido.');
  }
}

/** La reserva no admite ese cambio de estado (ej. confirmar una reserva ya liberada). */
export class InvalidReservationTransitionError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'INVALID_RESERVATION_TRANSITION';

  constructor(from: string, to: string) {
    super(`La reserva está en estado ${from} y no puede pasar a ${to}.`);
  }
}
