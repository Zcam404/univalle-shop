/**
 * Aplicación · Puerto de salida `ProductRepository`.
 *
 * Contrato para guardar y consultar productos y para modificar su inventario.
 * El inventario tiene un método propio (`adjustStock`) porque debe cambiarse
 * de forma atómica: leer el producto, restar y guardarlo permitiría que dos
 * compras simultáneas vendieran la misma última unidad.
 */
import { Product } from '../../../domain/entities/product.js';

/** Token de inyección de dependencias para este puerto. */
export const PRODUCT_REPOSITORY = Symbol('ProductRepository');

/** Orden de los listados. */
export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name';

/** Filtros y paginación de un listado. */
export interface ProductQuery {
  categoryId?: string;
  /** Si es `false`, solo devuelve productos activos. */
  includeInactive: boolean;
  /** Página empezando en 1. */
  page: number;
  pageSize: number;
  sort: ProductSort;
}

/** Una página de resultados y el total de productos que cumplen el filtro. */
export interface ProductPage {
  items: Product[];
  total: number;
}

/**
 * Posición en el feed de cambios: último producto entregado. Se usa el par
 * (fecha, id) porque varios productos pueden cambiar en el mismo milisegundo.
 */
export interface ChangeCursor {
  updatedAt: Date;
  id: string;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;

  /** Busca varios productos a la vez; los ids que no existen simplemente no aparecen. */
  findByIds(ids: string[]): Promise<Product[]>;

  search(query: ProductQuery): Promise<ProductPage>;

  /**
   * Productos modificados después del cursor, del más antiguo al más reciente.
   * Incluye los inactivos, para que el servicio de Búsqueda los pueda retirar.
   */
  findChangedSince(cursor: ChangeCursor | null, limit: number): Promise<Product[]>;

  countByCategory(categoryId: string): Promise<number>;

  /**
   * Crea o actualiza los datos del producto. Al actualizar NO toca el stock:
   * el inventario solo cambia con `adjustStock`.
   */
  save(product: Product): Promise<void>;

  /**
   * Suma `delta` (positivo o negativo) al stock de forma atómica.
   *
   * @returns El stock resultante, o `null` si el producto no existe o el
   *   resultado quedaría negativo (en ese caso no se modifica nada).
   */
  adjustStock(productId: string, delta: number): Promise<number | null>;
}
