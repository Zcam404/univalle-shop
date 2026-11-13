/**
 * Aplicación · Vistas de salida de Búsqueda.
 */
import { IndexedProduct } from '../../domain/entities/indexed-product.js';

/** Producto encontrado. */
export interface ProductHitView {
  id: string;
  name: string;
  description: string;
  price: number;
  category: { id: string; name: string } | null;
  imageUrl: string | null;
  available: boolean;
}

export interface SearchResultView {
  items: ProductHitView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Términos que realmente se buscaron (normalizados). */
  terms: string[];
}

export interface RecentSearchView {
  text: string;
  at: string;
}

export interface SyncStatusView {
  indexedProducts: number;
  lastSyncAt: string | null;
}

export function toProductHitView(product: IndexedProduct): ProductHitView {
  const p = product.toPrimitives();
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
    imageUrl: p.imageUrl,
    available: p.available,
  };
}
