/**
 * Aplicación · Caso de uso: sincronizar la copia local del catálogo.
 *
 * Igual que en Búsqueda: lee el feed de cambios de Catálogo por páginas desde
 * el último cursor guardado y guarda el cursor después de cada página.
 */
import { CatalogProduct } from '../../domain/entities/catalog-product.js';
import { SyncCatalogPort } from '../ports/in/recommendation.ports.js';
import { CatalogFeedClient, CatalogProductChange } from '../ports/out/catalog-feed.client.js';
import { Clock } from '../ports/out/clock.js';
import { ProductSnapshotRepository } from '../ports/out/product-snapshot.repository.js';
import { SyncStateRepository } from '../ports/out/sync-state.repository.js';

/** Convierte un producto del feed en la copia local. */
export function toCatalogProduct(change: CatalogProductChange): CatalogProduct {
  return CatalogProduct.from({
    id: change.id,
    name: change.name,
    description: change.description,
    price: change.price,
    categoryId: change.category?.id ?? null,
    categoryName: change.category?.name ?? '',
    imageUrl: change.images[0] ?? null,
    available: change.available,
    active: change.active,
    createdAt: new Date(change.createdAt),
  });
}

export class SyncCatalogUseCase implements SyncCatalogPort {
  static readonly PAGE_SIZE = 200;
  static readonly MAX_PAGES = 50;

  private running = false;

  constructor(
    private readonly feed: CatalogFeedClient,
    private readonly products: ProductSnapshotRepository,
    private readonly state: SyncStateRepository,
    private readonly clock: Clock,
  ) {}

  /** @throws Error Si Catálogo no responde (la copia local conserva los datos anteriores). */
  async execute(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      let { cursor } = await this.state.get();
      let updated = 0;
      for (let page = 0; page < SyncCatalogUseCase.MAX_PAGES; page++) {
        const changes = await this.feed.fetchChanges(cursor, SyncCatalogUseCase.PAGE_SIZE);
        if (changes.items.length > 0) {
          await this.products.upsertMany(changes.items.map(toCatalogProduct));
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
