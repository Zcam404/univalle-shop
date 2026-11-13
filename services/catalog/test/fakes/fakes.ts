/**
 * Adaptadores falsos en memoria para probar el catálogo sin MongoDB.
 */
import { Category } from '../../src/domain/entities/category.js';
import { Product } from '../../src/domain/entities/product.js';
import { Reservation, ReservationStatus } from '../../src/domain/entities/reservation.js';
import { CategoryNameTakenError } from '../../src/domain/errors/catalog.errors.js';
import { CategoryRepository } from '../../src/application/ports/out/category.repository.js';
import { Clock } from '../../src/application/ports/out/clock.js';
import { IdGenerator } from '../../src/application/ports/out/id-generator.js';
import {
  ChangeCursor,
  ProductPage,
  ProductQuery,
  ProductRepository,
} from '../../src/application/ports/out/product.repository.js';
import { ReservationRepository } from '../../src/application/ports/out/reservation.repository.js';

export class InMemoryCategoryRepository implements CategoryRepository {
  readonly items = new Map<string, Category>();

  async findAll() {
    return [...this.items.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByNameKey(key: string) {
    return [...this.items.values()].find((c) => c.nameKey === key) ?? null;
  }
  async save(category: Category) {
    const clash = await this.findByNameKey(category.nameKey);
    if (clash && clash.id !== category.id) throw new CategoryNameTakenError(category.name);
    this.items.set(category.id, category);
  }
  async delete(id: string) {
    this.items.delete(id);
  }
}

/**
 * Repositorio de productos en memoria. Guarda copias (no referencias) y
 * respeta la regla de `save`: al actualizar no toca el stock.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly items = new Map<string, Product>();
  private tick = 0;

  /** Copia del producto con stock y fecha de modificación nuevos. */
  private copy(p: Product, stock = p.stock): Product {
    this.tick++;
    return Product.restore({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      categoryId: p.categoryId,
      images: [...p.images],
      stock,
      active: p.active,
      createdAt: p.createdAt,
      updatedAt: new Date(Date.UTC(2026, 0, 1) + this.tick),
    });
  }

  async findById(id: string) {
    const p = this.items.get(id);
    return p ? this.copy(p) : null;
  }
  async findByIds(ids: string[]) {
    return ids.flatMap((id) => (this.items.has(id) ? [this.items.get(id)!] : []));
  }
  async search(q: ProductQuery): Promise<ProductPage> {
    let list = [...this.items.values()].filter(
      (p) => (q.includeInactive || p.active) && (!q.categoryId || p.categoryId === q.categoryId),
    );
    if (q.sort === 'price_asc') list.sort((a, b) => a.price.amount - b.price.amount);
    if (q.sort === 'price_desc') list.sort((a, b) => b.price.amount - a.price.amount);
    if (q.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return { items: list.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: list.length };
  }
  async findChangedSince(cursor: ChangeCursor | null, limit: number) {
    return [...this.items.values()]
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || a.id.localeCompare(b.id))
      .filter(
        (p) =>
          !cursor ||
          p.updatedAt > cursor.updatedAt ||
          (p.updatedAt.getTime() === cursor.updatedAt.getTime() && p.id > cursor.id),
      )
      .slice(0, limit);
  }
  async countByCategory(categoryId: string) {
    return [...this.items.values()].filter((p) => p.categoryId === categoryId).length;
  }
  async save(product: Product) {
    const existing = this.items.get(product.id);
    this.items.set(product.id, this.copy(product, existing ? existing.stock : product.stock));
  }
  async adjustStock(id: string, delta: number) {
    const p = this.items.get(id);
    if (!p || p.stock + delta < 0) return null;
    this.items.set(id, this.copy(p, p.stock + delta));
    return p.stock + delta;
  }
}

export class InMemoryReservationRepository implements ReservationRepository {
  readonly items = new Map<string, Reservation>();

  async findByOrderId(orderId: string) {
    const r = this.items.get(orderId);
    return r ? Reservation.restore({ orderId: r.orderId, items: [...r.items], status: r.status, createdAt: r.createdAt }) : null;
  }
  async create(reservation: Reservation) {
    if (this.items.has(reservation.orderId)) return false;
    this.items.set(reservation.orderId, reservation);
    return true;
  }
  async updateStatus(orderId: string, from: ReservationStatus, to: ReservationStatus) {
    const r = this.items.get(orderId);
    if (!r || r.status !== from) return false;
    this.items.set(orderId, Reservation.restore({ orderId, items: [...r.items], status: to, createdAt: r.createdAt }));
    return true;
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
    return `id-${this.n++}`;
  }
}
