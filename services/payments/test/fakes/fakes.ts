/**
 * Adaptadores falsos para probar Pagos sin MongoDB.
 */
import { Payment } from '../../src/domain/entities/payment.js';
import { Clock } from '../../src/application/ports/out/clock.js';
import { IdGenerator } from '../../src/application/ports/out/id-generator.js';
import { PaymentRepository } from '../../src/application/ports/out/payment.repository.js';

export class InMemoryPaymentRepository implements PaymentRepository {
  readonly items = new Map<string, Payment>();

  async findByOrderId(orderId: string) {
    const p = this.items.get(orderId);
    return p ? Payment.restore(p.toPrimitives()) : null;
  }
  async create(payment: Payment) {
    if (this.items.has(payment.orderId)) return false;
    this.items.set(payment.orderId, Payment.restore(payment.toPrimitives()));
    return true;
  }
  async save(payment: Payment) {
    this.items.set(payment.orderId, Payment.restore(payment.toPrimitives()));
  }
}

export class FixedClock implements Clock {
  now() {
    return new Date('2026-06-15T10:00:00Z');
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private n = 1;
  generate() {
    return `pay-${this.n++}`;
  }
}

/** Tarjetas de prueba. */
export const cards = {
  approved: { number: '4242 4242 4242 4242', holderName: 'Ana Pérez', expMonth: 12, expYear: 2030, cvv: '123' },
  insufficientFunds: { number: '4000000000000002', holderName: 'Ana Pérez', expMonth: 12, expYear: 2030, cvv: '123' },
  reported: { number: '4000000000000069', holderName: 'Ana Pérez', expMonth: 12, expYear: 2030, cvv: '123' },
};
