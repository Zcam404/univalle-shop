/**
 * Formatos de presentación: precios, fechas y nombres legibles de estados.
 */
import type { Affiliation, OrderStatus } from '../api/types';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

/** 85000 → "$ 85.000". */
export function formatPrice(amount: number): string {
  return pesos.format(amount);
}

/** Fecha ISO → "12 nov 2026, 5:30 p. m." en hora de Colombia. */
export function formatDate(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** Nombre en español de cada estado de pedido. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  PAYMENT_FAILED: 'Pago rechazado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

/** Nombre en español de cada tipo de vinculación con la universidad. */
export const AFFILIATION_LABELS: Record<Affiliation, string> = {
  STUDENT: 'Estudiante',
  PROFESSOR: 'Docente',
  STAFF: 'Administrativo',
};

/** Número de pedido corto para mostrar (primeros 8 caracteres del id). */
export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
