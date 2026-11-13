/**
 * Dominio · Entidad `Reservation`.
 *
 * Unidades de inventario apartadas para un pedido. El servicio de Pedidos la
 * crea al confirmar la compra, la confirma si el pago se aprueba y la libera
 * (devolviendo el stock) si el pago falla o el pedido se cancela.
 *
 * Guarda una copia del nombre y del precio de cada producto en el momento de
 * la compra: si el precio cambia después, el pedido conserva lo que se cobró.
 *
 * Estados posibles:
 *   RESERVED ──confirm()──▶ CONFIRMED
 *      │                        │
 *      └──────release()─────────┴──▶ RELEASED (final)
 */
import { InvalidReservationTransitionError } from '../errors/catalog.errors.js';

export type ReservationStatus = 'RESERVED' | 'CONFIRMED' | 'RELEASED';

/** Una línea de la reserva, con el precio congelado. */
export interface ReservationItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ReservationProps {
  orderId: string;
  items: ReservationItem[];
  status: ReservationStatus;
  createdAt: Date;
}

export class Reservation {
  private constructor(private props: ReservationProps) {}

  /** Crea una reserva nueva en estado RESERVED. */
  static create(orderId: string, items: ReservationItem[], now: Date): Reservation {
    return new Reservation({ orderId, items: items.map((i) => ({ ...i })), status: 'RESERVED', createdAt: now });
  }

  /** Reconstruye una reserva desde la persistencia. */
  static restore(props: ReservationProps): Reservation {
    return new Reservation({ ...props, items: props.items.map((i) => ({ ...i })) });
  }

  get orderId(): string {
    return this.props.orderId;
  }
  get items(): readonly ReservationItem[] {
    return this.props.items.map((i) => ({ ...i }));
  }
  get status(): ReservationStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Total a pagar: suma de precio unitario × cantidad de cada línea. */
  get total(): number {
    return this.props.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }

  /**
   * Marca la reserva como confirmada (pedido pagado).
   * @throws InvalidReservationTransitionError Si no está en RESERVED.
   */
  confirm(): void {
    if (this.props.status !== 'RESERVED') {
      throw new InvalidReservationTransitionError(this.props.status, 'CONFIRMED');
    }
    this.props.status = 'CONFIRMED';
  }

  /**
   * Marca la reserva como liberada. El caso de uso devuelve el stock.
   * @throws InvalidReservationTransitionError Si ya estaba liberada.
   */
  release(): void {
    if (this.props.status === 'RELEASED') {
      throw new InvalidReservationTransitionError(this.props.status, 'RELEASED');
    }
    this.props.status = 'RELEASED';
  }
}
