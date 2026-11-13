/**
 * Aplicación · Puertos de entrada de Pagos.
 */
import { CardInput } from '../../../domain/value-objects/card.js';
import { PaymentView } from '../../views/payment.view.js';

export const PROCESS_PAYMENT = Symbol('ProcessPayment');
export interface ProcessPaymentCommand {
  orderId: string;
  userId: string;
  /** Monto en pesos (entero positivo). */
  amount: number;
  card: CardInput;
}
/** Cobra un pedido. Si el pedido ya tiene pago, lo devuelve sin cobrar otra vez. */
export interface ProcessPaymentPort {
  execute(command: ProcessPaymentCommand): Promise<PaymentView>;
}

export const REFUND_PAYMENT = Symbol('RefundPayment');
/** Reembolsa el pago aprobado de un pedido. Repetirlo no reembolsa dos veces. */
export interface RefundPaymentPort {
  execute(orderId: string): Promise<PaymentView>;
}

export const GET_PAYMENT = Symbol('GetPayment');
/** Quién consulta: el dueño del pago o un admin. Sin requester = llamada interna entre servicios. */
export interface PaymentRequester {
  userId: string;
  isAdmin: boolean;
}
/** Consulta el pago de un pedido. */
export interface GetPaymentPort {
  execute(orderId: string, requester?: PaymentRequester): Promise<PaymentView>;
}
