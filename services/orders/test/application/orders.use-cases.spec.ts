/**
 * Pruebas de los casos de uso del carrito y de los pedidos, incluido el
 * comportamiento cuando Catálogo o Pagos fallan.
 */
import {
  AddToCartUseCase,
  ClearCartUseCase,
  GetCartUseCase,
  RemoveCartItemUseCase,
  UpdateCartItemUseCase,
} from '../../src/application/use-cases/cart.use-cases.js';
import {
  CancelOrderUseCase,
  GetOrderUseCase,
  GetTopProductsUseCase,
  GetUserPurchasesUseCase,
  ListAllOrdersUseCase,
  ListMyOrdersUseCase,
  UpdateOrderStatusUseCase,
} from '../../src/application/use-cases/order.use-cases.js';
import { PlaceOrderUseCase } from '../../src/application/use-cases/place-order.use-case.js';
import {
  CatalogUnavailableError,
  EmptyCartError,
  InvalidOrderTransitionError,
  InvalidShippingAddressError,
  OrderNotFoundError,
  OutOfStockError,
  PaymentServiceUnavailableError,
  ProductUnavailableError,
} from '../../src/domain/errors/order.errors.js';
import {
  address,
  FakeCatalogClient,
  FakePaymentClient,
  FixedClock,
  InMemoryCartRepository,
  InMemoryOrderRepository,
  MemoryLogger,
  SequentialIdGenerator,
} from '../fakes/fakes.js';

const approvedCard = { number: '4242424242424242', holderName: 'ANA PEREZ', expMonth: 12, expYear: 2030, cvv: '123' };
const rejectedCard = { ...approvedCard, number: '4000000000000002' };

function setup() {
  const carts = new InMemoryCartRepository();
  const orders = new InMemoryOrderRepository();
  const catalog = new FakeCatalogClient();
  const payments = new FakePaymentClient();
  const clock = new FixedClock();
  const logger = new MemoryLogger();
  catalog.addProduct('buzo', 'Buzo Univalle', 85000, 3);
  catalog.addProduct('mug', 'Mug Univalle', 22000, 0);
  catalog.addProduct('cuaderno', 'Cuaderno', 12000, 100);
  return {
    carts,
    orders,
    catalog,
    payments,
    logger,
    getCart: new GetCartUseCase(carts),
    add: new AddToCartUseCase(carts, catalog),
    update: new UpdateCartItemUseCase(carts, catalog),
    remove: new RemoveCartItemUseCase(carts),
    clear: new ClearCartUseCase(carts),
    place: new PlaceOrderUseCase(carts, orders, catalog, payments, new SequentialIdGenerator(), clock, logger),
    myOrders: new ListMyOrdersUseCase(orders),
    getOrder: new GetOrderUseCase(orders),
    cancel: new CancelOrderUseCase(orders, payments, catalog, clock, logger),
    allOrders: new ListAllOrdersUseCase(orders),
    setStatus: new UpdateOrderStatusUseCase(orders, clock),
  };
}

describe('Carrito', () => {
  it('agrega productos con sus datos del catálogo', async () => {
    const t = setup();
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 2 });
    const cart = await t.add.execute({ userId: 'ana', productId: 'cuaderno', quantity: 1 });
    expect(cart).toMatchObject({ totalItems: 3, estimatedTotal: 2 * 85000 + 12000 });
    expect(cart.items[0]).toMatchObject({ name: 'Buzo Univalle', subtotal: 170000 });
  });

  it('rechaza productos agotados, inexistentes o cantidades mayores al stock', async () => {
    const t = setup();
    await expect(t.add.execute({ userId: 'ana', productId: 'mug', quantity: 1 })).rejects.toThrow(ProductUnavailableError);
    await expect(t.add.execute({ userId: 'ana', productId: 'nope', quantity: 1 })).rejects.toThrow(ProductUnavailableError);
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 2 });
    await expect(t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 2 })).rejects.toThrow(OutOfStockError);
  });

  it('sin Catálogo no se puede agregar, pero sí cambiar cantidades, quitar y ver el carrito', async () => {
    const t = setup();
    await t.add.execute({ userId: 'ana', productId: 'cuaderno', quantity: 1 });
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 1 });
    t.catalog.down = true;

    await expect(t.add.execute({ userId: 'ana', productId: 'cuaderno', quantity: 1 })).rejects.toThrow(CatalogUnavailableError);
    expect((await t.update.execute({ userId: 'ana', productId: 'cuaderno', quantity: 5 })).totalItems).toBe(6);
    expect((await t.remove.execute('ana', 'buzo')).totalItems).toBe(5);
    expect((await t.getCart.execute('ana')).items).toHaveLength(1);
  });

  it('con Catálogo arriba, no deja subir la cantidad por encima del stock', async () => {
    const t = setup();
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 1 });
    await expect(t.update.execute({ userId: 'ana', productId: 'buzo', quantity: 4 })).rejects.toThrow(OutOfStockError);
  });
});

describe('Compra', () => {
  async function withCart(t: ReturnType<typeof setup>) {
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 2 });
    await t.add.execute({ userId: 'ana', productId: 'cuaderno', quantity: 1 });
  }

  it('pago aprobado: pedido PAID, reserva confirmada y carrito vacío', async () => {
    const t = setup();
    await withCart(t);
    const order = await t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard });

    expect(order).toMatchObject({ status: 'PAID', total: 182000, cancellable: true, payment: { cardLast4: '4242' } });
    expect(t.payments.charges[0]).toMatchObject({ orderId: order.id, amount: 182000 });
    expect(t.catalog.confirmed).toEqual([order.id]);
    expect((await t.getCart.execute('ana')).items).toEqual([]);
    expect(t.catalog.products.get('buzo')!.stock).toBe(1);
  });

  it('pago rechazado: pedido PAYMENT_FAILED, stock devuelto y carrito intacto', async () => {
    const t = setup();
    await withCart(t);
    const order = await t.place.execute({ userId: 'ana', shippingAddress: address, card: rejectedCard });

    expect(order).toMatchObject({ status: 'PAYMENT_FAILED', payment: { failureReason: 'Fondos insuficientes.' } });
    expect(t.catalog.released).toEqual([order.id]);
    expect(t.catalog.products.get('buzo')!.stock).toBe(3);
    expect((await t.getCart.execute('ana')).totalItems).toBe(3);
  });

  it('Pagos caído: responde 503, devuelve el stock y deja el pedido como fallido', async () => {
    const t = setup();
    await withCart(t);
    t.payments.down = true;
    await expect(t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard })).rejects.toThrow(
      PaymentServiceUnavailableError,
    );
    expect([...t.orders.orders.values()][0].status).toBe('PAYMENT_FAILED');
    expect(t.catalog.products.get('buzo')!.stock).toBe(3);
    expect((await t.getCart.execute('ana')).totalItems).toBe(3);
  });

  it('sin stock o con Catálogo caído no se crea ningún pedido', async () => {
    const t = setup();
    await withCart(t);
    t.catalog.products.get('buzo')!.stock = 1; // alguien compró mientras tanto
    await expect(t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard })).rejects.toThrow(OutOfStockError);
    t.catalog.down = true;
    await expect(t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard })).rejects.toThrow(
      CatalogUnavailableError,
    );
    expect(t.orders.orders.size).toBe(0);
    expect(t.payments.charges).toHaveLength(0);
  });

  it('si Catálogo cae justo después de cobrar, el pedido queda pagado y se registra el aviso', async () => {
    const t = setup();
    await withCart(t);
    const originalConfirm = t.catalog.confirm.bind(t.catalog);
    t.catalog.confirm = async () => {
      throw new CatalogUnavailableError();
    };
    const order = await t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard });
    t.catalog.confirm = originalConfirm;
    expect(order.status).toBe('PAID');
    expect(t.logger.warnings[0]).toContain(order.id);
  });

  it('valida carrito vacío y dirección antes de reservar', async () => {
    const t = setup();
    await expect(t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard })).rejects.toThrow(EmptyCartError);
    await withCart(t);
    await expect(
      t.place.execute({ userId: 'ana', shippingAddress: { ...address, street: '' }, card: approvedCard }),
    ).rejects.toThrow(InvalidShippingAddressError);
    expect(t.catalog.reserved.size).toBe(0);
  });
});

describe('Gestión de pedidos', () => {
  async function paidOrder(t: ReturnType<typeof setup>) {
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 1 });
    return t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard });
  }

  it('el cliente ve solo sus pedidos; el admin ve cualquiera', async () => {
    const t = setup();
    const order = await paidOrder(t);
    expect((await t.myOrders.execute('ana')).total).toBe(1);
    expect((await t.myOrders.execute('luis')).total).toBe(0);
    await expect(t.getOrder.execute(order.id, { userId: 'luis', isAdmin: false })).rejects.toThrow(OrderNotFoundError);
    expect((await t.getOrder.execute(order.id, { userId: 'admin', isAdmin: true })).id).toBe(order.id);
  });

  it('cancelar reembolsa, devuelve el stock y no se puede repetir', async () => {
    const t = setup();
    const order = await paidOrder(t);
    const cancelled = await t.cancel.execute(order.id, 'ana');
    expect(cancelled.status).toBe('CANCELLED');
    expect(t.payments.refunds).toEqual([order.id]);
    expect(t.catalog.products.get('buzo')!.stock).toBe(3);
    await expect(t.cancel.execute(order.id, 'ana')).rejects.toThrow(InvalidOrderTransitionError);
  });

  it('si Pagos no puede reembolsar, el pedido no se cancela', async () => {
    const t = setup();
    const order = await paidOrder(t);
    t.payments.down = true;
    await expect(t.cancel.execute(order.id, 'ana')).rejects.toThrow(PaymentServiceUnavailableError);
    expect((await t.getOrder.execute(order.id, { userId: 'ana', isAdmin: false })).status).toBe('PAID');
  });

  it('el admin avanza el estado en orden y filtra por estado', async () => {
    const t = setup();
    const order = await paidOrder(t);
    await expect(t.setStatus.execute(order.id, 'DELIVERED')).rejects.toThrow(InvalidOrderTransitionError);
    await t.setStatus.execute(order.id, 'SHIPPED');
    expect((await t.allOrders.execute({ status: 'SHIPPED' })).total).toBe(1);
    expect((await t.setStatus.execute(order.id, 'DELIVERED')).status).toBe('DELIVERED');
    await expect(t.cancel.execute(order.id, 'ana')).rejects.toThrow(InvalidOrderTransitionError);
  });
});

describe('Consultas internas para Recomendación', () => {
  it('solo cuentan los pedidos pagados (no los rechazados ni cancelados)', async () => {
    const t = setup();
    const purchases = new GetUserPurchasesUseCase(t.orders);
    const top = new GetTopProductsUseCase(t.orders);

    await t.add.execute({ userId: 'ana', productId: 'cuaderno', quantity: 3 });
    await t.place.execute({ userId: 'ana', shippingAddress: address, card: approvedCard });
    await t.add.execute({ userId: 'ana', productId: 'buzo', quantity: 1 });
    await t.place.execute({ userId: 'ana', shippingAddress: address, card: rejectedCard });
    await t.add.execute({ userId: 'luis', productId: 'cuaderno', quantity: 2 });
    const luis = await t.place.execute({ userId: 'luis', shippingAddress: address, card: approvedCard });
    await t.add.execute({ userId: 'luis', productId: 'buzo', quantity: 1 });
    await t.clear.execute('luis');
    await t.cancel.execute(luis.id, 'luis');

    expect((await purchases.execute('ana')).map((p) => [p.productId, p.quantity])).toEqual([['cuaderno', 3]]);
    expect(await top.execute()).toEqual([{ productId: 'cuaderno', unitsSold: 3 }]);
  });
});
