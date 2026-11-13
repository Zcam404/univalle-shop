/**
 * Aplicación · Caso de uso: conciliar cobros en duda.
 *
 * Cuando Pagos no responde durante una compra, no se sabe si alcanzó a cobrar
 * (la petición pudo llegar y la respuesta perderse). El pedido queda
 * PAYMENT_FAILED "por conciliar". Este caso de uso, ejecutado periódicamente,
 * pregunta a Pagos qué pasó con cada uno:
 *
 * | Pagos responde              | Acción                                  |
 * |-----------------------------|-----------------------------------------|
 * | No hay pago para el pedido  | Nada que hacer: no se cobró             |
 * | Pago RECHAZADO              | Nada que hacer: no se cobró             |
 * | Pago APROBADO               | Se reembolsa (el pedido ya está fallido)|
 * | Pago REEMBOLSADO            | Ya estaba resuelto                      |
 *
 * Así el cliente nunca queda con un cobro de un pedido que no recibirá. Si
 * Pagos sigue sin responder, el pedido queda pendiente para la próxima vez.
 */
import { ReconciliationOutcome } from '../../domain/entities/order.js';
import { AppLogger } from '../ports/out/app-logger.js';
import { OrderRepository } from '../ports/out/order.repository.js';
import { PaymentClient } from '../ports/out/payment.client.js';

/** Resumen de una ejecución. */
export interface ReconciliationReport {
  reviewed: number;
  resolved: number;
  refunded: number;
}

export class ReconcilePaymentsUseCase {
  /** Pedidos revisados por ejecución. */
  static readonly BATCH_SIZE = 50;

  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentClient,
    private readonly logger: AppLogger,
  ) {}

  async execute(): Promise<ReconciliationReport> {
    const pending = await this.orders.findNeedingReconciliation(ReconcilePaymentsUseCase.BATCH_SIZE);
    const report: ReconciliationReport = { reviewed: pending.length, resolved: 0, refunded: 0 };

    for (const order of pending) {
      try {
        const outcome = await this.reconcile(order.id);
        order.resolveReconciliation(outcome);
        await this.orders.save(order);
        report.resolved++;
        if (outcome === 'refunded') report.refunded++;
      } catch (error) {
        this.logger.warn(`No se pudo conciliar el pedido ${order.id}; se reintentará: ${(error as Error).message}`);
      }
    }
    return report;
  }

  /** Consulta el pago del pedido y, si se cobró, lo reembolsa. */
  private async reconcile(orderId: string): Promise<ReconciliationOutcome> {
    const payment = await this.payments.findByOrder(orderId);
    if (!payment) return 'not_charged';
    if (payment.status === 'REJECTED') return 'rejected';
    if (payment.status === 'APPROVED') {
      await this.payments.refund(orderId);
      this.logger.warn(`Pedido ${orderId}: se encontró un cobro aprobado de un pedido fallido y se reembolsó.`);
    }
    return 'refunded';
  }
}
