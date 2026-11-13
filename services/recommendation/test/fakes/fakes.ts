/**
 * Adaptadores falsos para probar Recomendación sin MongoDB ni otros servicios.
 */
import { CatalogProduct } from '../../src/domain/entities/catalog-product.js';
import { PurchaseSignal } from '../../src/domain/services/recommendation-engine.js';
import { AppLogger } from '../../src/application/ports/out/app-logger.js';
import { OrdersClient, ProductSales } from '../../src/application/ports/out/orders.client.js';
import { ProductSnapshotRepository } from '../../src/application/ports/out/product-snapshot.repository.js';
import { SearchClient } from '../../src/application/ports/out/search.client.js';
import { CachedUserSignals, SignalCacheRepository } from '../../src/application/ports/out/signal-cache.repository.js';

/** Crea un producto de prueba. */
export function product(
  id: string,
  name: string,
  category: string,
  overrides: Partial<{ available: boolean; active: boolean; createdAt: Date; description: string }> = {},
): CatalogProduct {
  return CatalogProduct.from({
    id,
    name,
    description: overrides.description ?? '',
    price: 10000,
    categoryId: `cat-${category}`,
    categoryName: category,
    imageUrl: null,
    available: overrides.available ?? true,
    active: overrides.active ?? true,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
  });
}

export class InMemoryProductSnapshot implements ProductSnapshotRepository {
  readonly items = new Map<string, CatalogProduct>();
  async upsertMany(products: CatalogProduct[]) {
    for (const p of products) this.items.set(p.id, p);
  }
  async findAll() {
    return [...this.items.values()];
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
}

export class FakeOrdersClient implements OrdersClient {
  readonly purchasesByUser = new Map<string, PurchaseSignal[]>();
  top: ProductSales[] = [];
  down = false;
  async purchases(userId: string) {
    if (this.down) throw new Error('Pedidos caído');
    return this.purchasesByUser.get(userId) ?? [];
  }
  async topProducts(limit: number) {
    if (this.down) throw new Error('Pedidos caído');
    return this.top.slice(0, limit);
  }
}

export class FakeSearchClient implements SearchClient {
  readonly searchesByUser = new Map<string, string[]>();
  down = false;
  async recentSearches(userId: string) {
    if (this.down) throw new Error('Búsqueda caída');
    return this.searchesByUser.get(userId) ?? [];
  }
}

export class InMemorySignalCache implements SignalCacheRepository {
  readonly users = new Map<string, CachedUserSignals>();
  top: ProductSales[] | null = null;
  async getUser(userId: string) {
    return this.users.get(userId) ?? { purchases: null, searches: null };
  }
  // Cada escritura actualiza solo su campo y sin `await` intermedio, como `$set`
  // en MongoDB: así dos escrituras en paralelo no se pisan.
  async savePurchases(userId: string, purchases: PurchaseSignal[]) {
    this.users.set(userId, { ...(this.users.get(userId) ?? { purchases: null, searches: null }), purchases });
  }
  async saveSearches(userId: string, searches: string[]) {
    this.users.set(userId, { ...(this.users.get(userId) ?? { purchases: null, searches: null }), searches });
  }
  async getTopProducts() {
    return this.top;
  }
  async saveTopProducts(top: ProductSales[]) {
    this.top = top;
  }
}

export class MemoryLogger implements AppLogger {
  readonly warnings: string[] = [];
  warn(message: string) {
    this.warnings.push(message);
  }
}
