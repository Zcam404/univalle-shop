/**
 * Pruebas de la conciliación de cobros en duda.
 */
import { AddToCartUseCase } from '../../src/application/use-cases/cart.use-cases.js';
import { PlaceOrderUseCase } from '../../src/application/use-cases/place-order.use-case.js';
import { ReconcilePaymentsUseCase } from '../../src/application/use-cases/reconcile-payments.use-case.js';
import { PaymentServiceUnavailableError } from '../../src/domain/errors/order.errors.js';
import {
  FakeCatalogClient,
  FakePaymentClient,
  FixedClock,
  InMemoryCartRepository,
  InMemoryOrderRepository,
  MemoryLogger,
  SequentialIdGenerator,
  address,
} from '../fakes/fakes.js';

const card = { number: '4242424242424242', holderName: 'ANA PEREZ', expMonth: 12, expYear: 2030, cvv: '123' };

/** Crea un pedido cuyo cobro quedó en duda porque Pagos no respondió. */
async function setupWithDoubtfulOrder() {
  const carts = new InMemoryCartRepository();
  const orders = new InMemoryOrderRepository();
  const catalog = new FakeCatalogClient();
  const payments = new FakePaymentClient();
  const logger = new MemoryLogger();
  catalog.addProduct('buzo', 'Buzo', 85000, 3);
  await new AddToCartUseCase(carts, catalog).execute({ userId: 'ana', productId: 'buzo', quantity: 1 });

  payments.down = true;
  const place = new PlaceOrderUseCase(carts, orders, catalog, payments, new SequentialIdGenerator(), new FixedClock(), logger);
  await expect(place.execute({ userId: 'ana', shippingAddress: address, card })).rejects.toThrow(PaymentServiceUnavailableError);
  payments.down = false;

  const order = [...orders.orders.values()][0];
  return { orders, payments, order, reconcile: new ReconcilePaymentsUseCase(orders, payments, logger) };
}

describe('ReconcilePaymentsUseCase', () => {
  it('el pedido con cobro en duda queda por conciliar', async () => {
    const t = await setupWithDoubtfulOrder();
    expect(t.order.status).toBe('PAYMENT_FAILED');
    expect(t.order.payment.needsReconciliation).toBe(true);
  });

  it('si Pagos sí alcanzó a cobrar, lo reembolsa', async () => {
    const t = await setupWithDoubtfulOrder();
    t.payments.recorded.set(t.order.id, 'APPROVED');
    expect(await t.reconcile.execute()).toEqual({ reviewed: 1, resolved: 1, refunded: 1 });
    expect(t.payments.refunds).toEqual([t.order.id]);
    const order = (await t.orders.findById(t.order.id))!;
    expect(order.payment).toMatchObject({ needsReconciliation: false, failureReason: expect.stringContaining('reembolsado') });
  });

  it('si no hubo cobro, solo cierra la conciliación', async () => {
    const t = await setupWithDoubtfulOrder();
    expect(await t.reconcile.execute()).toEqual({ reviewed: 1, resolved: 1, refunded: 0 });
    expect(t.payments.refunds).toEqual([]);
    expect(await t.reconcile.execute()).toEqual({ reviewed: 0, resolved: 0, refunded: 0 });
  });

  it('si Pagos sigue caído, lo deja pendiente para la próxima vez', async () => {
    const t = await setupWithDoubtfulOrder();
    t.payments.down = true;
    expect(await t.reconcile.execute()).toEqual({ reviewed: 1, resolved: 0, refunded: 0 });
    expect((await t.orders.findById(t.order.id))!.payment.needsReconciliation).toBe(true);
  });
});
