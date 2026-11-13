/**
 * Aplicación · Puerto de salida `ProductSnapshotRepository`: copia local del catálogo.
 */
import { CatalogProduct } from '../../../domain/entities/catalog-product.js';

/** Token de inyección de dependencias para este puerto. */
export const PRODUCT_SNAPSHOT = Symbol('ProductSnapshotRepository');

export interface ProductSnapshotRepository {
  /** Crea o reemplaza los productos indicados (por id). */
  upsertMany(products: CatalogProduct[]): Promise<void>;

  /** Todos los productos (activos e inactivos). El catálogo de la tienda es pequeño. */
  findAll(): Promise<CatalogProduct[]>;

  findById(id: string): Promise<CatalogProduct | null>;
}
