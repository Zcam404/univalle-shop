/**
 * Aplicación · Puerto de salida `PaymentRepository`.
 */
import { Payment } from '../../../domain/entities/payment.js';

/** Token de inyección de dependencias para este puerto. */
export const PAYMENT_REPOSITORY = Symbol('PaymentRepository');

export interface PaymentRepository {
  findByOrderId(orderId: string): Promise<Payment | null>;

  /**
   * Guarda un pago nuevo.
   * @returns `false` si ya existía un pago para ese pedido (no se modifica).
   */
  create(payment: Payment): Promise<boolean>;

  /** Actualiza un pago existente (por ejemplo, al reembolsarlo). */
  save(payment: Payment): Promise<void>;
}
