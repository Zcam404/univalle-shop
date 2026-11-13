/**
 * Aplicación · Casos de uso de consulta de productos.
 */
import { ProductNotFoundError } from '../../domain/errors/catalog.errors.js';
import {
  GetProductPort,
  ListProductChangesPort,
  ListProductsPort,
  ListProductsQuery,
  Requester,
} from '../ports/in/product.ports.js';
import { CategoryRepository } from '../ports/out/category.repository.js';
import { ProductRepository } from '../ports/out/product.repository.js';
import { loadCategoryIndex } from '../services/category-index.js';
import { decodeCursor, encodeCursor } from '../services/change-cursor.js';
import { ProductChangesView, ProductPageView, ProductView, toProductView } from '../views/catalog.views.js';

/**
 * Lista productos paginados. Los valores de paginación fuera de rango se
 * ajustan al límite más cercano en lugar de dar error (página mínima 1,
 * tamaño entre 1 y 50, por defecto 12).
 */
export class ListProductsUseCase implements ListProductsPort {
  static readonly DEFAULT_PAGE_SIZE = 12;
  static readonly MAX_PAGE_SIZE = 50;

  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(query: ListProductsQuery): Promise<ProductPageView> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.min(
      ListProductsUseCase.MAX_PAGE_SIZE,
      Math.max(1, Math.floor(query.pageSize ?? ListProductsUseCase.DEFAULT_PAGE_SIZE)),
    );

    const [result, categoryIndex] = await Promise.all([
      this.products.search({
        categoryId: query.categoryId,
        includeInactive: query.requester.isAdmin && (query.includeInactive ?? false),
        page,
        pageSize,
        sort: query.sort ?? 'newest',
      }),
      loadCategoryIndex(this.categories),
    ]);

    return {
      items: result.items.map((p) => toProductView(p, categoryIndex)),
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }
}

/** Devuelve el detalle de un producto. Para un cliente, un producto inactivo "no existe". */
export class GetProductUseCase implements GetProductPort {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  /** @throws ProductNotFoundError Si no existe, o está inactivo y quien consulta no es admin. */
  async execute(id: string, requester: Requester): Promise<ProductView> {
    const product = await this.products.findById(id);
    if (!product || (!product.active && !requester.isAdmin)) throw new ProductNotFoundError();
    return toProductView(product, await loadCategoryIndex(this.categories));
  }
}

/**
 * Feed de cambios para el servicio de Búsqueda: devuelve los productos
 * modificados después del cursor y el cursor de la siguiente página. Quien lo
 * consume guarda el último cursor y lo envía en la siguiente consulta.
 */
export class ListProductChangesUseCase implements ListProductChangesPort {
  static readonly MAX_LIMIT = 200;

  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  /** @throws InvalidProductError Si el cursor no es válido. */
  async execute(cursor: string | undefined, limit = 100): Promise<ProductChangesView> {
    const safeLimit = Math.min(ListProductChangesUseCase.MAX_LIMIT, Math.max(1, Math.floor(limit)));
    const changed = await this.products.findChangedSince(cursor ? decodeCursor(cursor) : null, safeLimit);
    const categoryIndex = await loadCategoryIndex(this.categories);

    const last = changed.at(-1);
    return {
      items: changed.map((p) => toProductView(p, categoryIndex)),
      nextCursor: last ? encodeCursor({ updatedAt: last.updatedAt, id: last.id }) : (cursor ?? null),
    };
  }
}
