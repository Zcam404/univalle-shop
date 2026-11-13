/**
 * Adaptadores falsos para probar Búsqueda sin MongoDB ni Catálogo reales.
 * El índice en memoria usa las mismas reglas de relevancia del dominio.
 */
import { IndexedProduct } from '../../src/domain/entities/indexed-product.js';
import { RecentSearches } from '../../src/domain/entities/recent-searches.js';
import { matchesAllTerms, scoreProduct } from '../../src/domain/services/relevance.js';
import { SearchQuery } from '../../src/domain/value-objects/search-query.js';
import { AppLogger } from '../../src/application/ports/out/app-logger.js';
import { CatalogChangesPage, CatalogFeedClient, CatalogProductChange } from '../../src/application/ports/out/catalog-feed.client.js';
import { Clock } from '../../src/application/ports/out/clock.js';
import { ProductIndexRepository } from '../../src/application/ports/out/product-index.repository.js';
import { RecentSearchRepository } from '../../src/application/ports/out/recent-search.repository.js';
import { SyncState, SyncStateRepository } from '../../src/application/ports/out/sync-state.repository.js';

export class InMemoryProductIndex implements ProductIndexRepository {
  readonly items = new Map<string, IndexedProduct>();

  async upsertMany(products: IndexedProduct[]) {
    for (const p of products) this.items.set(p.id, p);
  }

  async search(q: SearchQuery) {
    let list = [...this.items.values()].filter(
      (p) =>
        p.active &&
        (!q.categoryId || p.categoryId === q.categoryId) &&
        (q.minPrice === undefined || p.price >= q.minPrice) &&
        (q.maxPrice === undefined || p.price <= q.maxPrice) &&
        (!q.onlyAvailable || p.available) &&
        matchesAllTerms(p.text, q.terms),
    );
    const sorters = {
      relevance: (a: IndexedProduct, b: IndexedProduct) =>
        scoreProduct(b.text, q.terms) - scoreProduct(a.text, q.terms) || a.name.localeCompare(b.name),
      price_asc: (a: IndexedProduct, b: IndexedProduct) => a.price - b.price,
      price_desc: (a: IndexedProduct, b: IndexedProduct) => b.price - a.price,
      newest: (a: IndexedProduct, b: IndexedProduct) => b.createdAt.getTime() - a.createdAt.getTime(),
    };
    list = list.sort(sorters[q.sort]);
    return { items: list.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: list.length };
  }

  async suggest(terms: string[], limit: number) {
    const last = terms.at(-1)!;
    return [...this.items.values()]
      .filter((p) => p.active && (' ' + p.text.nameKey).includes(' ' + last) && matchesAllTerms(p.text, terms.slice(0, -1)))
      .map((p) => p.name)
      .slice(0, limit);
  }

  async count() {
    return this.items.size;
  }
}

export class InMemoryRecentSearchRepository implements RecentSearchRepository {
  readonly items = new Map<string, RecentSearches>();
  failNext = false;

  async find(userId: string) {
    const r = this.items.get(userId);
    return r ? RecentSearches.restore(userId, [...r.list]) : null;
  }
  async save(recent: RecentSearches) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('Mongo no disponible');
    }
    this.items.set(recent.userId, RecentSearches.restore(recent.userId, [...recent.list]));
  }
}

export class InMemorySyncState implements SyncStateRepository {
  state: SyncState = { cursor: null, lastSyncAt: null };
  async get() {
    return { ...this.state };
  }
  async save(state: SyncState) {
    this.state = { ...state };
  }
}

/**
 * Feed de Catálogo falso: entrega los productos en orden, en páginas, usando
 * como cursor la posición en la lista. `failAfterPages` simula una caída a mitad.
 */
export class FakeCatalogFeed implements CatalogFeedClient {
  readonly changes: CatalogProductChange[] = [];
  failAfterPages: number | null = null;
  calls = 0;

  async fetchChanges(cursor: string | null, limit: number): Promise<CatalogChangesPage> {
    if (this.failAfterPages !== null && this.calls >= this.failAfterPages) throw new Error('Catálogo caído');
    this.calls++;
    const start = cursor ? Number(cursor) : 0;
    const items = this.changes.slice(start, start + limit);
    return { items, nextCursor: items.length ? String(start + items.length) : cursor };
  }
}

export class FixedClock implements Clock {
  now() {
    return new Date('2026-01-15T10:00:00Z');
  }
}

export class MemoryLogger implements AppLogger {
  readonly warnings: string[] = [];
  warn(message: string) {
    this.warnings.push(message);
  }
}

/** Crea un producto del feed de Catálogo para las pruebas. */
export function change(
  id: string,
  name: string,
  overrides: Partial<CatalogProductChange> & { categoryName?: string } = {},
): CatalogProductChange {
  const { categoryName = 'Papelería', ...rest } = overrides;
  return {
    id,
    name,
    description: '',
    price: 10000,
    category: { id: `cat-${categoryName}`, name: categoryName },
    images: [],
    stock: 5,
    available: true,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...rest,
  };
}
