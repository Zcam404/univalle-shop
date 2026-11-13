/**
 * Aplicación · Puertos de entrada de reservas de inventario (los usa el servicio de Pedidos).
 */
import { ReservationView } from '../../views/catalog.views.js';

export const RESERVE_STOCK = Symbol('ReserveStock');
export interface ReserveStockCommand {
  /** Id del pedido; identifica la reserva y permite reintentar sin duplicarla. */
  orderId: string;
  items: { productId: string; quantity: number }[];
}
/** Aparta las unidades de todos los productos del pedido, o de ninguno. */
export interface ReserveStockPort {
  execute(command: ReserveStockCommand): Promise<ReservationView>;
}

export const CONFIRM_RESERVATION = Symbol('ConfirmReservation');
/** Confirma la reserva cuando el pedido se paga. */
export interface ConfirmReservationPort {
  execute(orderId: string): Promise<ReservationView>;
}

export const RELEASE_RESERVATION = Symbol('ReleaseReservation');
/** Libera la reserva y devuelve el stock (pago rechazado o pedido cancelado). */
export interface ReleaseReservationPort {
  execute(orderId: string): Promise<ReservationView>;
}
