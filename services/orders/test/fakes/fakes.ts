/**
 * Adaptadores falsos para probar Pedidos sin MongoDB, Catálogo ni Pagos reales.
 */
import { Cart } from '../../src/domain/entities/cart.js';
import { Order, OrderItem } from '../../src/domain/entities/order.js';
import { CatalogUnavailableError, OutOfStockError, PaymentServiceUnavailableError } from '../../src/domain/errors/order.errors.js';
import { AppLogger } from '../../src/application/ports/out/app-logger.js';
import { CartRepository } from '../../src/application/ports/out/cart.repository.js';
import { CatalogClient, CatalogProduct } from '../../src/application/ports/out/catalog.client.js';
import { Clock } from '../../src/application/ports/out/clock.js';
import { IdGenerator } from '../../src/application/ports/out/id-generator.js';
import { COMPLETED_STATUSES, OrderPage, OrderQuery, OrderRepository } from '../../src/application/ports/out/order.repository.js';
import { ChargeRequest, ChargeResult, PaymentClient } from '../../src/application/ports/out/payment.client.js';

export class InMemoryCartRepository implements CartRepository {
  readonly carts = new Map<string, Cart>();
  async findByUserId(userId: string) {
    const c = this.carts.get(userId);
    return c ? Cart.restore(userId, [...c.lines]) : null;
  }
  async save(cart: Cart) {
    this.carts.set(cart.userId, Cart.restore(cart.userId, [...cart.lines]));
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  readonly orders = new Map<string, Order>();
  async findById(id: string) {
    return this.orders.get(id) ?? null;
  }
  async find(q: OrderQuery): Promise<OrderPage> {
    const list = [...this.orders.values()]
      .filter((o) => (!q.userId || o.userId === q.userId) && (!q.status || o.status === q.status))
      .reverse();
    return { items: list.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: list.length };
  }
  async save(order: Order) {
    this.orders.set(order.id, order);
  }
  private completed() {
    return [...this.orders.values()].filter((o) => COMPLETED_STATUSES.includes(o.status));
  }
  async findNeedingReconciliation(limit: number) {
    return [...this.orders.values()].filter((o) => o.payment.needsReconciliation).slice(0, limit);
  }
  async purchasedByUser(userId: string) {
    const totals = new Map<string, { productId: string; quantity: number; lastPurchasedAt: Date }>();
    for (const o of this.completed().filter((o) => o.userId === userId)) {
      for (const i of o.items) {
        const t = totals.get(i.productId) ?? { productId: i.productId, quantity: 0, lastPurchasedAt: o.createdAt };
        t.quantity += i.quantity;
        if (o.createdAt > t.lastPurchasedAt) t.lastPurchasedAt = o.createdAt;
        totals.set(i.productId, t);
      }
    }
    return [...totals.values()];
  }
  async topSelling(limit: number) {
    const totals = new Map<string, number>();
    for (const o of this.completed()) for (const i of o.items) totals.set(i.productId, (totals.get(i.productId) ?? 0) + i.quantity);
    return [...totals].map(([productId, unitsSold]) => ({ productId, unitsSold })).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, limit);
  }
}

/**
 * Catálogo falso con stock en memoria. Registra qué reservas se confirmaron o
 * liberaron. Con `down = true` simula que el servicio está caído.
 */
export class FakeCatalogClient implements CatalogClient {
  readonly products = new Map<string, CatalogProduct>();
  readonly reserved = new Map<string, OrderItem[]>();
  readonly confirmed: string[] = [];
  readonly released: string[] = [];
  down = false;

  addProduct(id: string, name: string, price: number, stock: number) {
    this.products.set(id, { id, name, price, imageUrl: null, stock, available: stock > 0 });
  }

  private ensureUp() {
    if (this.down) throw new CatalogUnavailableError();
  }

  async getProduct(id: string) {
    this.ensureUp();
    return this.products.get(id) ?? null;
  }

  async reserve(orderId: string, items: { productId: string; quantity: number }[]) {
    this.ensureUp();
    for (const i of items) {
      const p = this.products.get(i.productId)!;
      if (p.stock < i.quantity) throw new OutOfStockError(`No hay suficientes unidades de "${p.name}".`);
    }
    const lines = items.map((i) => {
      const p = this.products.get(i.productId)!;
      p.stock -= i.quantity;
      return { productId: p.id, name: p.name, unitPrice: p.price, quantity: i.quantity };
    });
    this.reserved.set(orderId, lines);
    return lines;
  }

  async confirm(orderId: string) {
    this.ensureUp();
    this.confirmed.push(orderId);
  }

  async release(orderId: string) {
    this.ensureUp();
    for (const l of this.reserved.get(orderId) ?? []) this.products.get(l.productId)!.stock += l.quantity;
    this.released.push(orderId);
  }
}

/**
 * Pagos falso: aprueba salvo que la tarjeta termine en 0002; con `down = true`
 * está caído. `recorded` simula los pagos que Pagos tiene guardados.
 */
export class FakePaymentClient implements PaymentClient {
  readonly charges: ChargeRequest[] = [];
  readonly refunds: string[] = [];
  readonly recorded = new Map<string, 'APPROVED' | 'REJECTED' | 'REFUNDED'>();
  down = false;

  async findByOrder(orderId: string) {
    if (this.down) throw new PaymentServiceUnavailableError();
    const status = this.recorded.get(orderId);
    return status ? { status } : null;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (this.down) throw new PaymentServiceUnavailableError();
    this.charges.push(req);
    const last4 = req.card.number.slice(-4);
    return last4 === '0002'
      ? { paymentId: `pay-${req.orderId}`, status: 'REJECTED', cardLast4: last4, reason: 'Fondos insuficientes.' }
      : { paymentId: `pay-${req.orderId}`, status: 'APPROVED', cardLast4: last4, reason: null };
  }

  async refund(orderId: string) {
    if (this.down) throw new PaymentServiceUnavailableError();
    this.refunds.push(orderId);
    if (this.recorded.has(orderId)) this.recorded.set(orderId, 'REFUNDED');
  }
}

export class FixedClock implements Clock {
  now() {
    return new Date('2026-01-15T10:00:00Z');
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private n = 1;
  generate() {
    return `order-${this.n++}`;
  }
}

export class MemoryLogger implements AppLogger {
  readonly warnings: string[] = [];
  warn(message: string) {
    this.warnings.push(message);
  }
}

/** Dirección de envío válida para las pruebas. */
export const address = {
  recipientName: 'Ana Pérez',
  street: 'Calle 13 # 100-00',
  city: 'Cali',
  department: 'Valle del Cauca',
  phone: '300 123 4567',
};
