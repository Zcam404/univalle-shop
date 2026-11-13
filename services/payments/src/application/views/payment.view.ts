/**
 * Aplicación · Vista de salida de un pago (sin la referencia interna del procesador).
 */
import { Payment, PaymentStatus } from '../../domain/entities/payment.js';
import { CardBrand } from '../../domain/value-objects/card.js';

export interface PaymentView {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  cardBrand: CardBrand | null;
  cardLast4: string | null;
  reason: string | null;
  createdAt: string;
  refundedAt: string | null;
}

export function toPaymentView(payment: Payment): PaymentView {
  const p = payment.toPrimitives();
  return {
    id: p.id,
    orderId: p.orderId,
    userId: p.userId,
    amount: p.amount,
    status: p.status,
    cardBrand: p.cardBrand,
    cardLast4: p.cardLast4,
    reason: p.reason,
    createdAt: p.createdAt.toISOString(),
    refundedAt: p.refundedAt?.toISOString() ?? null,
  };
}
