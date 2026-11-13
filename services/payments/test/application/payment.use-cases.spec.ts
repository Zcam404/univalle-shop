/**
 * Pruebas de los casos de uso de Pagos con el procesador simulado real (sin demora).
 */
import { GetPaymentUseCase, ProcessPaymentUseCase, RefundPaymentUseCase } from '../../src/application/use-cases/payment.use-cases.js';
import { CardProcessor } from '../../src/application/ports/out/card-processor.js';
import {
  CardProcessorUnavailableError,
  InvalidPaymentRequestError,
  PaymentNotFoundError,
  PaymentNotRefundableError,
} from '../../src/domain/errors/payment.errors.js';
import { SimulatedCardProcessor } from '../../src/infrastructure/processor/simulated-card-processor.js';
import { FixedClock, InMemoryPaymentRepository, SequentialIdGenerator, cards } from '../fakes/fakes.js';

function setup(processor: CardProcessor = new SimulatedCardProcessor(0)) {
  const payments = new InMemoryPaymentRepository();
  const clock = new FixedClock();
  return {
    payments,
    process: new ProcessPaymentUseCase(payments, processor, new SequentialIdGenerator(), clock),
    refund: new RefundPaymentUseCase(payments, processor, clock),
    get: new GetPaymentUseCase(payments),
  };
}

const charge = (orderId: string, card = cards.approved, amount = 182000) => ({ orderId, userId: 'ana', amount, card });

describe('ProcessPaymentUseCase', () => {
  it('aprueba una tarjeta válida y guarda solo franquicia y últimos 4 dígitos', async () => {
    const t = setup();
    const p = await t.process.execute(charge('o1'));
    expect(p).toMatchObject({ status: 'APPROVED', amount: 182000, cardBrand: 'VISA', cardLast4: '4242', reason: null });
    expect(JSON.stringify(t.payments.items.get('o1')!.toPrimitives())).not.toContain('4242424242424242');
  });

  it('registra los rechazos del banco con su motivo', async () => {
    const t = setup();
    expect(await t.process.execute(charge('o1', cards.insufficientFunds))).toMatchObject({
      status: 'REJECTED',
      reason: 'Fondos insuficientes.',
    });
    expect((await t.process.execute(charge('o2', cards.reported))).status).toBe('REJECTED');
  });

  it('una tarjeta inválida queda como pago rechazado, no como error', async () => {
    const t = setup();
    const p = await t.process.execute(charge('o1', { ...cards.approved, expYear: 2020 }));
    expect(p).toMatchObject({ status: 'REJECTED', reason: 'La tarjeta está vencida.' });
  });

  it('cobrar dos veces el mismo pedido devuelve el mismo pago', async () => {
    const t = setup();
    const first = await t.process.execute(charge('o1'));
    const second = await t.process.execute(charge('o1', cards.insufficientFunds, 999));
    expect(second).toEqual(first);
  });

  it('rechaza montos que superan el cupo y valida el monto', async () => {
    const t = setup();
    expect((await t.process.execute(charge('o1', cards.approved, 30_000_000))).status).toBe('REJECTED');
    await expect(t.process.execute(charge('o2', cards.approved, 0))).rejects.toThrow(InvalidPaymentRequestError);
  });

  it('si el procesador no responde, no registra pago y se puede reintentar', async () => {
    const down: CardProcessor = {
      authorize: async () => {
        throw new Error('timeout');
      },
      refund: async () => {},
    };
    const t = setup(down);
    await expect(t.process.execute(charge('o1'))).rejects.toThrow(CardProcessorUnavailableError);
    expect(t.payments.items.size).toBe(0);
  });
});

describe('RefundPaymentUseCase', () => {
  it('reembolsa una vez y repetirlo no cambia nada', async () => {
    const t = setup();
    await t.process.execute(charge('o1'));
    const r1 = await t.refund.execute('o1');
    const r2 = await t.refund.execute('o1');
    expect(r1.status).toBe('REFUNDED');
    expect(r2.refundedAt).toBe(r1.refundedAt);
  });

  it('no reembolsa pagos rechazados ni inexistentes', async () => {
    const t = setup();
    await t.process.execute(charge('o1', cards.insufficientFunds));
    await expect(t.refund.execute('o1')).rejects.toThrow(PaymentNotRefundableError);
    await expect(t.refund.execute('nope')).rejects.toThrow(PaymentNotFoundError);
  });
});

describe('GetPaymentUseCase', () => {
  it('el dueño y el admin ven el pago; otro usuario no', async () => {
    const t = setup();
    await t.process.execute(charge('o1'));
    expect((await t.get.execute('o1', { userId: 'ana', isAdmin: false })).orderId).toBe('o1');
    expect((await t.get.execute('o1', { userId: 'x', isAdmin: true })).orderId).toBe('o1');
    await expect(t.get.execute('o1', { userId: 'luis', isAdmin: false })).rejects.toThrow(PaymentNotFoundError);
  });
});
