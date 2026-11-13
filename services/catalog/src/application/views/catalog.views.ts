/**
 * Aplicación · Vistas de salida del catálogo.
 *
 * Objetos planos que devuelven los casos de uso. El adaptador HTTP los envía
 * tal cual como JSON.
 */
import { Category } from '../../domain/entities/category.js';
import { Product } from '../../domain/entities/product.js';
import { Reservation, ReservationItem, ReservationStatus } from '../../domain/entities/reservation.js';

export interface CategoryView {
  id: string;
  name: string;
  description: string | null;
}

export interface ProductView {
  id: string;
  name: string;
  description: string;
  /** Precio en pesos colombianos. */
  price: number;
  /** Categoría del producto; `null` si se borró (no debería ocurrir). */
  category: CategoryView | null;
  images: string[];
  stock: number;
  /** `true` si está activo y tiene stock. */
  available: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPageView {
  items: ProductView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReservationView {
  orderId: string;
  status: ReservationStatus;
  items: ReservationItem[];
  /** Total en pesos de todas las líneas. */
  total: number;
  createdAt: string;
}

/** Página del feed de cambios para el servicio de Búsqueda. */
export interface ProductChangesView {
  items: ProductView[];
  /** Cursor para pedir la siguiente página; `null` si no hubo cambios. */
  nextCursor: string | null;
}

export function toCategoryView(category: Category): CategoryView {
  return { id: category.id, name: category.name, description: category.description };
}

/**
 * Convierte un producto en su vista.
 * @param categories Categorías indexadas por id, para incluir el nombre de la categoría.
 */
export function toProductView(product: Product, categories: Map<string, Category>): ProductView {
  const category = categories.get(product.categoryId);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price.amount,
    category: category ? toCategoryView(category) : null,
    images: [...product.images],
    stock: product.stock,
    available: product.isPurchasable,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toReservationView(reservation: Reservation): ReservationView {
  return {
    orderId: reservation.orderId,
    status: reservation.status,
    items: [...reservation.items],
    total: reservation.total,
    createdAt: reservation.createdAt.toISOString(),
  };
}
