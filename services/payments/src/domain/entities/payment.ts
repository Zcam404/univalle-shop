/**
 * Dominio · Entidad `Payment`.
 *
 * Cobro de un pedido. Hay como máximo uno por pedido. Estados:
 *
 *   APPROVED ──refund()──▶ REFUNDED
 *   REJECTED (final; no hay nada que reembolsar)
 */
import { PaymentNotRefundableError } from '../errors/payment.errors.js';
import { CardBrand } from '../value-objects/card.js';

export type PaymentStatus = 'APPROVED' | 'REJECTED' | 'REFUNDED';

export interface PaymentProps {
  id: string;
  orderId: string;
  userId: string;
  /** Monto en pesos. */
  amount: number;
  status: PaymentStatus;
  cardBrand: CardBrand | null;
  cardLast4: string | null;
  /** Motivo del rechazo, en español. */
  reason: string | null;
  /** Referencia de la transacción en el procesador (para reembolsar). */
  processorReference: string | null;
  createdAt: Date;
  refundedAt: Date | null;
}

/** Datos comunes al crear un pago. */
type NewPayment = Pick<PaymentProps, 'id' | 'orderId' | 'userId' | 'amount' | 'cardBrand' | 'cardLast4' | 'createdAt'>;

export class Payment {
  private constructor(private props: PaymentProps) {}

  /** Pago aprobado por el procesador. */
  static approved(data: NewPayment, processorReference: string): Payment {
    return new Payment({ ...data, status: 'APPROVED', reason: null, processorReference, refundedAt: null });
  }

  /** Pago rechazado (tarjeta inválida o rechazo del banco). */
  static rejected(data: NewPayment, reason: string): Payment {
    return new Payment({ ...data, status: 'REJECTED', reason, processorReference: null, refundedAt: null });
  }

  /** Reconstruye un pago desde la persistencia. */
  static restore(props: PaymentProps): Payment {
    return new Payment({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get orderId(): string {
    return this.props.orderId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get status(): PaymentStatus {
    return this.props.status;
  }
  get processorReference(): string | null {
    return this.props.processorReference;
  }

  /**
   * Marca el pago como reembolsado.
   * @throws PaymentNotRefundableError Si no está aprobado.
   */
  refund(now: Date): void {
    if (this.props.status !== 'APPROVED') throw new PaymentNotRefundableError(this.props.status);
    this.props.status = 'REFUNDED';
    this.props.refundedAt = now;
  }

  toPrimitives(): PaymentProps {
    return { ...this.props };
  }
}
