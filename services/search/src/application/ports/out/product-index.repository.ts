/**
 * Aplicación · Puerto de salida `ProductIndexRepository`: el índice de búsqueda.
 */
import { IndexedProduct } from '../../../domain/entities/indexed-product.js';
import { SearchQuery } from '../../../domain/value-objects/search-query.js';

/** Token de inyección de dependencias para este puerto. */
export const PRODUCT_INDEX = Symbol('ProductIndexRepository');

export interface ProductIndexRepository {
  /** Crea o reemplaza los productos indicados (por id). */
  upsertMany(products: IndexedProduct[]): Promise<void>;

  /**
   * Busca productos activos que contengan todos los términos y cumplan los
   * filtros, ordenados según `query.sort` (relevancia con `RELEVANCE_WEIGHTS`).
   */
  search(query: SearchQuery): Promise<{ items: IndexedProduct[]; total: number }>;

  /** Nombres de productos activos con alguna palabra que empiece por el último término. */
  suggest(terms: string[], limit: number): Promise<string[]>;

  /** Cantidad de productos en el índice (activos e inactivos). */
  count(): Promise<number>;
}
