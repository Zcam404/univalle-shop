/**
 * Dominio · Agregado `Order`.
 *
 * Un pedido ya confirmado por el cliente. Las líneas, los precios y la
 * dirección son copias congeladas: no cambian aunque cambie el catálogo.
 *
 * Ciclo de vida:
 *
 *   PENDING_PAYMENT ──markPaid()──────────▶ PAID ──ship()──▶ SHIPPED ──deliver()──▶ DELIVERED
 *         │                                  │
 *         └──markPaymentFailed()──▶ PAYMENT_FAILED      └──cancel()──▶ CANCELLED
 *
 * Solo se puede cancelar un pedido pagado que todavía no se ha enviado.
 * Si el cobro quedó en duda (Pagos no respondió), el pedido queda PAYMENT_FAILED
 * "por conciliar" hasta que la tarea de conciliación confirme qué pasó.
 * Cada cambio queda en el historial con su fecha.
 */
import { InvalidOrderTransitionError } from '../errors/order.errors.js';
import { ShippingAddress } from '../value-objects/shipping-address.js';

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/** Línea del pedido con el precio que se cobró. */
export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

/** Resultado del cobro asociado al pedido. */
export interface OrderPayment {
  paymentId: string | null;
  cardLast4: string | null;
  /** Motivo del rechazo, si el pago no se aprobó. */
  failureReason: string | null;
  /**
   * `true` si Pagos no respondió durante el cobro y no se sabe si alcanzó a
   * cobrar. La tarea de conciliación lo revisa y, si hubo cobro, lo reembolsa.
   */
  needsReconciliation: boolean;
}

/** Lo que encontró la conciliación al consultar el servicio de Pagos. */
export type ReconciliationOutcome = 'not_charged' | 'rejected' | 'refunded';

/** Entrada del historial de estados. */
export interface StatusChange {
  status: OrderStatus;
  at: Date;
}

export interface OrderProps {
  id: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  payment: OrderPayment;
  history: StatusChange[];
  createdAt: Date;
}

export class Order {
  private constructor(private props: OrderProps) {}

  /**
   * Crea el pedido en espera de pago, con las líneas y precios que devolvió la
   * reserva del catálogo.
   */
  static place(id: string, userId: string, items: OrderItem[], shippingAddress: ShippingAddress, now: Date): Order {
    return new Order({
      id,
      userId,
      items: items.map((i) => ({ ...i })),
      shippingAddress,
      status: 'PENDING_PAYMENT',
      payment: { paymentId: null, cardLast4: null, failureReason: null, needsReconciliation: false },
      history: [{ status: 'PENDING_PAYMENT', at: now }],
      createdAt: now,
    });
  }

  /** Reconstruye un pedido desde la persistencia. */
  static restore(props: OrderProps): Order {
    return new Order({
      ...props,
      items: props.items.map((i) => ({ ...i })),
      payment: { ...props.payment },
      history: props.history.map((h) => ({ ...h })),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get items(): readonly OrderItem[] {
    return this.props.items.map((i) => ({ ...i }));
  }
  get shippingAddress(): ShippingAddress {
    return this.props.shippingAddress;
  }
  get status(): OrderStatus {
    return this.props.status;
  }
  get payment(): OrderPayment {
    return { ...this.props.payment };
  }
  get history(): readonly StatusChange[] {
    return this.props.history.map((h) => ({ ...h }));
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Total en pesos: suma de precio unitario × cantidad. */
  get total(): number {
    return this.props.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }

  /** Indica si el cliente todavía puede cancelarlo (pagado y sin enviar). */
  get isCancellable(): boolean {
    return this.props.status === 'PAID';
  }

  /** El pago fue aprobado. */
  markPaid(paymentId: string, cardLast4: string | null, now: Date): void {
    this.transition(['PENDING_PAYMENT'], 'PAID', now);
    this.props.payment = { paymentId, cardLast4, failureReason: null, needsReconciliation: false };
  }

  /**
   * El pago fue rechazado o no se pudo procesar.
   * @param outcomeUnknown `true` si Pagos no respondió y no se sabe si cobró (queda por conciliar).
   */
  markPaymentFailed(reason: string, paymentId: string | null, cardLast4: string | null, now: Date, outcomeUnknown = false): void {
    this.transition(['PENDING_PAYMENT'], 'PAYMENT_FAILED', now);
    this.props.payment = { paymentId, cardLast4, failureReason: reason, needsReconciliation: outcomeUnknown };
  }

  /**
   * Cierra la conciliación de un cobro en duda con lo que respondió Pagos y
   * deja el motivo final para el cliente.
   * @throws InvalidOrderTransitionError Si el pedido no estaba por conciliar.
   */
  resolveReconciliation(outcome: ReconciliationOutcome): void {
    if (!this.props.payment.needsReconciliation) {
      throw new InvalidOrderTransitionError(this.props.status, 'CONCILIADO');
    }
    const reasons: Record<ReconciliationOutcome, string> = {
      not_charged: 'El servicio de pagos no respondió. Confirmamos que no se hizo ningún cobro.',
      rejected: 'El servicio de pagos no respondió a tiempo y el banco rechazó el cobro. No se cobró nada.',
      refunded: 'El servicio de pagos no respondió a tiempo, pero el cobro alcanzó a hacerse: ya fue reembolsado.',
    };
    this.props.payment = { ...this.props.payment, failureReason: reasons[outcome], needsReconciliation: false };
  }

  /** El administrador despachó el pedido. */
  ship(now: Date): void {
    this.transition(['PAID'], 'SHIPPED', now);
  }

  /** El pedido llegó al cliente. */
  deliver(now: Date): void {
    this.transition(['SHIPPED'], 'DELIVERED', now);
  }

  /** Cancelación por parte del cliente, antes del envío. */
  cancel(now: Date): void {
    this.transition(['PAID'], 'CANCELLED', now);
  }

  /**
   * Cambia de estado si el estado actual está entre los permitidos y lo anota en el historial.
   * @throws InvalidOrderTransitionError Si el cambio no está permitido.
   */
  private transition(allowedFrom: OrderStatus[], to: OrderStatus, now: Date): void {
    if (!allowedFrom.includes(this.props.status)) {
      throw new InvalidOrderTransitionError(this.props.status, to);
    }
    this.props.status = to;
    this.props.history.push({ status: to, at: now });
  }
}
