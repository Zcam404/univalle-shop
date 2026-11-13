/**
 * Aplicación · Puerto de salida `ReservationRepository`.
 *
 * Contrato para guardar reservas de inventario. Los cambios de estado son
 * condicionales ("pasa a X solo si sigue en Y") para que dos peticiones
 * simultáneas de liberar la misma reserva no devuelvan el stock dos veces.
 */
import { Reservation, ReservationStatus } from '../../../domain/entities/reservation.js';

/** Token de inyección de dependencias para este puerto. */
export const RESERVATION_REPOSITORY = Symbol('ReservationRepository');

export interface ReservationRepository {
  findByOrderId(orderId: string): Promise<Reservation | null>;

  /**
   * Guarda una reserva nueva.
   * @returns `false` si ya existía una reserva para ese pedido (no la modifica).
   */
  create(reservation: Reservation): Promise<boolean>;

  /**
   * Cambia el estado solo si la reserva sigue en `from`.
   * @returns `true` si se hizo el cambio; `false` si otra petición se adelantó.
   */
  updateStatus(orderId: string, from: ReservationStatus, to: ReservationStatus): Promise<boolean>;
}
