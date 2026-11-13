/**
 * Infraestructura · Tarea periódica de conciliación de cobros.
 *
 * Ejecuta `ReconcilePaymentsUseCase` cada `RECONCILE_INTERVAL_MS` (por defecto
 * 60 s). Si no hay pedidos por conciliar, no hace nada ni escribe en el log.
 */
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ReconcilePaymentsUseCase } from '../../application/use-cases/reconcile-payments.use-case.js';
import { ORDERS_CONFIG } from '../config/orders.config.js';
import type { OrdersConfig } from '../config/orders.config.js';

@Injectable()
export class PaymentReconciliationJob implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PaymentReconciliationJob.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly reconcile: ReconcilePaymentsUseCase,
    @Inject(ORDERS_CONFIG) private readonly config: OrdersConfig,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.run(), this.config.reconcileIntervalMs);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Una ejecución; nunca se superponen dos y nunca lanza errores. */
  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const report = await this.reconcile.execute();
      if (report.reviewed > 0) {
        this.logger.log(
          `Conciliación: ${report.reviewed} revisado(s), ${report.resolved} resuelto(s), ${report.refunded} reembolsado(s).`,
        );
      }
    } catch (error) {
      this.logger.warn(`La conciliación falló; se reintentará: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
