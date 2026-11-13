/**
 * Aplicación · Puertos de entrada de productos e inventario.
 */
import { ProductData } from '../../../domain/entities/product.js';
import { ProductSort } from '../out/product.repository.js';
import { ProductChangesView, ProductPageView, ProductView } from '../../views/catalog.views.js';

/** Quién consulta: los administradores pueden ver productos desactivados. */
export interface Requester {
  isAdmin: boolean;
}

export const LIST_PRODUCTS = Symbol('ListProducts');
export interface ListProductsQuery {
  categoryId?: string;
  page?: number;
  pageSize?: number;
  sort?: ProductSort;
  /** Solo tiene efecto si quien consulta es admin. */
  includeInactive?: boolean;
  requester: Requester;
}
/** Lista productos paginados, con filtro por categoría y orden. */
export interface ListProductsPort {
  execute(query: ListProductsQuery): Promise<ProductPageView>;
}

export const GET_PRODUCT = Symbol('GetProduct');
/** Devuelve el detalle de un producto (los inactivos solo para admin). */
export interface GetProductPort {
  execute(id: string, requester: Requester): Promise<ProductView>;
}

export const CREATE_PRODUCT = Symbol('CreateProduct');
export interface CreateProductCommand extends ProductData {
  /** Unidades iniciales en inventario. */
  stock: number;
}
/** Crea un producto activo (solo admin). */
export interface CreateProductPort {
  execute(command: CreateProductCommand): Promise<ProductView>;
}

export const UPDATE_PRODUCT = Symbol('UpdateProduct');
export interface UpdateProductCommand extends Partial<ProductData> {
  id: string;
  /** `false` desactiva el producto; `true` lo reactiva. */
  active?: boolean;
}
/** Edita datos de un producto o lo activa/desactiva (solo admin). */
export interface UpdateProductPort {
  execute(command: UpdateProductCommand): Promise<ProductView>;
}

export const ADJUST_STOCK = Symbol('AdjustStock');
export interface AdjustStockCommand {
  productId: string;
  /** Unidades a sumar (positivo, ej. llegó mercancía) o restar (negativo, ej. unidades dañadas). */
  delta: number;
}
/** Ajusta manualmente el inventario de un producto (solo admin). */
export interface AdjustStockPort {
  execute(command: AdjustStockCommand): Promise<ProductView>;
}

export const LIST_PRODUCT_CHANGES = Symbol('ListProductChanges');
/** Feed de productos modificados, para que Búsqueda mantenga su índice al día. */
export interface ListProductChangesPort {
  execute(cursor: string | undefined, limit?: number): Promise<ProductChangesView>;
}
