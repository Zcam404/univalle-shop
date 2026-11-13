/**
 * Aplicación · Casos de uso de sincronización con Catálogo.
 */
import { IndexedProduct } from '../../domain/entities/indexed-product.js';
import { GetSyncStatusPort, ReindexCatalogPort, SyncCatalogPort } from '../ports/in/search.ports.js';
import { CatalogFeedClient, CatalogProductChange } from '../ports/out/catalog-feed.client.js';
import { Clock } from '../ports/out/clock.js';
import { ProductIndexRepository } from '../ports/out/product-index.repository.js';
import { SyncStateRepository } from '../ports/out/sync-state.repository.js';
import { SyncStatusView } from '../views/search.views.js';

/** Convierte un producto del feed de Catálogo en un producto indexado. */
export function toIndexedProduct(change: CatalogProductChange): IndexedProduct {
  return IndexedProduct.from({
    id: change.id,
    name: change.name,
    description: change.description,
    price: change.price,
    categoryId: change.category?.id ?? null,
    categoryName: change.category?.name ?? '',
    imageUrl: change.images[0] ?? null,
    stock: change.stock,
    available: change.available,
    active: change.active,
    createdAt: new Date(change.createdAt),
  });
}

/**
 * Lee el feed de cambios de Catálogo página por página desde el último
 * cursor guardado, actualiza el índice y guarda el nuevo cursor después de
 * cada página. Si Catálogo falla a mitad de camino, lo ya procesado queda
 * guardado y la siguiente sincronización sigue desde ahí.
 *
 * Nunca corren dos sincronizaciones a la vez: si una sigue en curso, la otra
 * se omite (devuelve 0).
 */
export class SyncCatalogUseCase implements SyncCatalogPort {
  static readonly PAGE_SIZE = 200;
  /** Tope de páginas por ejecución, para que una sincronización no se alargue indefinidamente. */
  static readonly MAX_PAGES = 50;

  private running = false;

  constructor(
    private readonly feed: CatalogFeedClient,
    private readonly index: ProductIndexRepository,
    private readonly state: SyncStateRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * @returns Productos actualizados en esta ejecución.
   * @throws Error Si Catálogo no responde (el índice conserva los datos anteriores).
   */
  async execute(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      let { cursor } = await this.state.get();
      let updated = 0;

      for (let page = 0; page < SyncCatalogUseCase.MAX_PAGES; page++) {
        const changes = await this.feed.fetchChanges(cursor, SyncCatalogUseCase.PAGE_SIZE);
        if (changes.items.length > 0) {
          await this.index.upsertMany(changes.items.map(toIndexedProduct));
          updated += changes.items.length;
        }
        cursor = changes.nextCursor;
        await this.state.save({ cursor, lastSyncAt: this.clock.now() });
        if (changes.items.length < SyncCatalogUseCase.PAGE_SIZE) break;
      }
      return updated;
    } finally {
      this.running = false;
    }
  }
}

/** Reinicia el cursor y vuelve a leer todo el catálogo (por ejemplo, tras restaurar la base). */
export class ReindexCatalogUseCase implements ReindexCatalogPort {
  constructor(
    private readonly sync: SyncCatalogPort,
    private readonly state: SyncStateRepository,
  ) {}

  async execute(): Promise<number> {
    const { lastSyncAt } = await this.state.get();
    await this.state.save({ cursor: null, lastSyncAt });
    return this.sync.execute();
  }
}

/** Cuántos productos hay en el índice y cuándo fue la última sincronización. */
export class GetSyncStatusUseCase implements GetSyncStatusPort {
  constructor(
    private readonly index: ProductIndexRepository,
    private readonly state: SyncStateRepository,
  ) {}

  async execute(): Promise<SyncStatusView> {
    const [count, state] = await Promise.all([this.index.count(), this.state.get()]);
    return { indexedProducts: count, lastSyncAt: state.lastSyncAt?.toISOString() ?? null };
  }
}
