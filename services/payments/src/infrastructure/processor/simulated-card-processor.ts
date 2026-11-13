/**
 * Infraestructura · Adaptador de salida `SimulatedCardProcessor`.
 *
 * Implementa el puerto `CardProcessor` sin dinero real: imita las respuestas
 * de un banco con tarjetas de prueba, como hacen las pasarelas en modo sandbox.
 *
 * | Tarjeta              | Resultado                                   |
 * |----------------------|---------------------------------------------|
 * | termina en 0002      | Rechazada: fondos insuficientes             |
 * | termina en 0069      | Rechazada: tarjeta reportada por el banco   |
 * | cualquier otra válida| Aprobada (ej. 4242 4242 4242 4242)          |
 */
import { randomUUID } from 'node:crypto';
import { AuthorizationResult, CardProcessor } from '../../application/ports/out/card-processor.js';
import { Card } from '../../domain/value-objects/card.js';

/** Respuestas de rechazo según los últimos 4 dígitos. */
const DECLINES: Record<string, string> = {
  '0002': 'Fondos insuficientes.',
  '0069': 'La tarjeta fue reportada por el banco. Comunícate con tu entidad.',
};

export class SimulatedCardProcessor implements CardProcessor {
  /**
   * @param latencyMs Demora artificial para parecerse a una pasarela real.
   */
  constructor(private readonly latencyMs = 150) {}

  /** Aprueba o rechaza según las reglas de la tabla. */
  async authorize(card: Card, _amount: number): Promise<AuthorizationResult> {
    await this.delay();
    const reason = DECLINES[card.last4];
    return reason ? { approved: false, reason } : { approved: true, reference: `SIM-${randomUUID()}` };
  }

  /** En el simulador el reembolso siempre se acepta. */
  async refund(_reference: string, _amount: number): Promise<void> {
    await this.delay();
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
