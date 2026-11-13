/**
 * Aplicación · Puerto de salida `CatalogFeedClient`.
 *
 * Lee el feed de productos modificados que publica Catálogo
 * (`GET /internal/products/changes`). Búsqueda consulta a Catálogo, y no al
 * revés, así Catálogo no necesita saber que Búsqueda existe.
 */

/** Token de inyección de dependencias para este puerto. */
export const CATALOG_FEED = Symbol('CatalogFeedClient');

/** Producto tal como lo publica Catálogo. */
export interface CatalogProductChange {
  id: string;
  name: string;
  description: string;
  price: number;
  category: { id: string; name: string } | null;
  images: string[];
  stock: number;
  available: boolean;
  active: boolean;
  createdAt: string;
}

export interface CatalogChangesPage {
  items: CatalogProductChange[];
  nextCursor: string | null;
}

export interface CatalogFeedClient {
  /**
   * @param cursor Último cursor recibido, o `null` para empezar desde el principio.
   * @throws Error Si Catálogo no responde.
   */
  fetchChanges(cursor: string | null, limit: number): Promise<CatalogChangesPage>;
}
