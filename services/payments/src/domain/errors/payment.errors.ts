/**
 * Dominio · Errores de negocio del servicio de Pagos.
 *
 * Una tarjeta inválida o un rechazo del banco NO son errores: quedan como un
 * pago con estado REJECTED y su motivo. Estos errores son para peticiones mal
 * formadas o acciones que no tienen sentido.
 */
import { DomainError } from './domain.error.js';

/** El monto o los datos del cobro no son válidos. */
export class InvalidPaymentRequestError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_PAYMENT_REQUEST';
}

/** No hay un pago para ese pedido (o no pertenece a quien lo consulta). */
export class PaymentNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'PAYMENT_NOT_FOUND';

  constructor() {
    super('No se encontró un pago para ese pedido.');
  }
}

/** Solo se puede reembolsar un pago aprobado. */
export class PaymentNotRefundableError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'PAYMENT_NOT_REFUNDABLE';

  constructor(status: string) {
    super(`Un pago en estado ${status} no se puede reembolsar.`);
  }
}

/** El procesador de tarjetas no respondió; se puede reintentar. */
export class CardProcessorUnavailableError extends DomainError {
  readonly kind = 'unavailable';
  readonly code = 'CARD_PROCESSOR_UNAVAILABLE';

  constructor() {
    super('El procesador de pagos no respondió. Intenta de nuevo en unos minutos.');
  }
}
