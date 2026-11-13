/**
 * Dominio · Errores de negocio del servicio de Pedidos.
 */
import { DomainError } from './domain.error.js';

/** Una cantidad o línea del carrito no es válida. */
export class InvalidCartItemError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_CART_ITEM';
}

/** El carrito llegó a su máximo de productos distintos. */
export class CartLimitReachedError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'CART_LIMIT_REACHED';

  constructor(max: number) {
    super(`El carrito puede tener como máximo ${max} productos distintos.`);
  }
}

/** El producto no está en el carrito. */
export class CartItemNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'CART_ITEM_NOT_FOUND';

  constructor() {
    super('Ese producto no está en tu carrito.');
  }
}

/** Se intentó comprar con el carrito vacío. */
export class EmptyCartError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'EMPTY_CART';

  constructor() {
    super('Tu carrito está vacío.');
  }
}

/** El producto no existe, está desactivado o agotado. */
export class ProductUnavailableError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'PRODUCT_UNAVAILABLE';

  constructor(message = 'El producto no está disponible.') {
    super(message);
  }
}

/** No hay unidades suficientes para la cantidad pedida. */
export class OutOfStockError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'OUT_OF_STOCK';
}

/** La dirección de envío no es válida. */
export class InvalidShippingAddressError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_SHIPPING_ADDRESS';
}

/** No existe el pedido (o no pertenece a quien lo pide). */
export class OrderNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'ORDER_NOT_FOUND';

  constructor() {
    super('No se encontró el pedido.');
  }
}

/** El pedido no admite ese cambio de estado. */
export class InvalidOrderTransitionError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'INVALID_ORDER_TRANSITION';

  constructor(from: string, to: string) {
    super(`Un pedido en estado ${from} no puede pasar a ${to}.`);
  }
}

/** El servicio de Catálogo no responde; el carrito se conserva. */
export class CatalogUnavailableError extends DomainError {
  readonly kind = 'unavailable';
  readonly code = 'CATALOG_UNAVAILABLE';

  constructor() {
    super('El catálogo no está disponible en este momento. Tu carrito se conserva; intenta de nuevo en unos minutos.');
  }
}

/** El servicio de Pagos no responde. */
export class PaymentServiceUnavailableError extends DomainError {
  readonly kind = 'unavailable';
  readonly code = 'PAYMENT_SERVICE_UNAVAILABLE';

  constructor() {
    super('El servicio de pagos no está disponible en este momento. Intenta de nuevo en unos minutos.');
  }
}
