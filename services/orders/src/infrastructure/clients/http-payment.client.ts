/**
 * Infraestructura · Adaptador de salida `HttpPaymentClient`.
 *
 * Implementa el puerto `PaymentClient` llamando por REST al servicio de Pagos.
 *
 * Contrato con Pagos:
 * - `POST /internal/payments` `{ orderId, userId, amount, card }` → 201
 *   `{ id, status: 'APPROVED' | 'REJECTED', cardLast4, reason }`. Repetirlo con
 *   el mismo pedido devuelve el mismo pago, sin cobrar dos veces.
 * - `POST /internal/payments/:orderId/refund` → 200.
 * - `GET /internal/payments/:orderId` → 200 con el pago, o 404 si no existe.
 */
import {
  ChargeRequest,
  ChargeResult,
  PaymentClient,
  PaymentRecordSummary,
} from '../../application/ports/out/payment.client.js';
import { PaymentServiceUnavailableError } from '../../domain/errors/order.errors.js';
import { ResilientHttpClient } from './resilient-http.client.js';

interface PaymentResponse {
  id: string;
  status: 'APPROVED' | 'REJECTED';
  cardLast4: string | null;
  reason: string | null;
  message?: string | string[];
}

export class HttpPaymentClient implements PaymentClient {
  constructor(private readonly http: ResilientHttpClient) {}

  /**
   * Cobra el pedido. Si Pagos rechaza los datos de la tarjeta (400), se trata
   * como pago rechazado con el mensaje de Pagos.
   */
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const res = await this.call<PaymentResponse>('POST', '/internal/payments', request);
    if (res.status === 200 || res.status === 201) {
      const p = res.body;
      return { paymentId: p.id, status: p.status, cardLast4: p.cardLast4, reason: p.reason };
    }
    if (res.status === 400) {
      const m = res.body.message;
      return {
        paymentId: '',
        status: 'REJECTED',
        cardLast4: request.card.number.slice(-4),
        reason: Array.isArray(m) ? m.join(' ') : (m ?? 'Los datos de la tarjeta no son válidos.'),
      };
    }
    throw new PaymentServiceUnavailableError();
  }

  /** Solicita el reembolso del pago del pedido. */
  async refund(orderId: string): Promise<void> {
    const res = await this.call('POST', `/internal/payments/${encodeURIComponent(orderId)}/refund`);
    if (res.status !== 200) throw new PaymentServiceUnavailableError();
  }

  /** Consulta el pago del pedido: 404 significa que nunca se registró un cobro. */
  async findByOrder(orderId: string): Promise<PaymentRecordSummary | null> {
    const res = await this.call<PaymentRecordSummary>('GET', `/internal/payments/${encodeURIComponent(orderId)}`);
    if (res.status === 404) return null;
    if (res.status !== 200) throw new PaymentServiceUnavailableError();
    return { status: res.body.status };
  }

  /** Hace la llamada y convierte "servicio caído" en el error de dominio. */
  private async call<T>(method: string, path: string, body?: unknown) {
    try {
      return await this.http.request<T>(method, path, body);
    } catch {
      throw new PaymentServiceUnavailableError();
    }
  }
}
