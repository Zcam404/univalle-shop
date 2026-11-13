/**
 * Aplicación · Puerto de salida `OrderRepository`: guarda y consulta pedidos.
 */
import { Order, OrderStatus } from '../../../domain/entities/order.js';

/** Token de inyección de dependencias para este puerto. */
export const ORDER_REPOSITORY = Symbol('OrderRepository');

/** Página de pedidos y total de resultados. */
export interface OrderPage {
  items: Order[];
  total: number;
}

/** Filtros para los listados (siempre del más reciente al más antiguo). */
export interface OrderQuery {
  userId?: string;
  status?: OrderStatus;
  page: number;
  pageSize: number;
}

/** Producto comprado por un usuario, sumando todos sus pedidos válidos. */
export interface PurchasedProduct {
  productId: string;
  quantity: number;
  lastPurchasedAt: Date;
}

/** Producto con las unidades vendidas en toda la tienda. */
export interface ProductSales {
  productId: string;
  unitsSold: number;
}

/** Estados en los que un pedido cuenta como compra realizada. */
export const COMPLETED_STATUSES: OrderStatus[] = ['PAID', 'SHIPPED', 'DELIVERED'];

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;

  find(query: OrderQuery): Promise<OrderPage>;

  /** Crea o reemplaza el pedido. */
  save(order: Order): Promise<void>;

  /** Pedidos con un cobro en duda pendiente de conciliar (los más antiguos primero). */
  findNeedingReconciliation(limit: number): Promise<Order[]>;

  /** Productos que compró el usuario (pedidos en `COMPLETED_STATUSES`), del más reciente al más antiguo. */
  purchasedByUser(userId: string): Promise<PurchasedProduct[]>;

  /** Productos más vendidos (pedidos en `COMPLETED_STATUSES`), de más a menos unidades. */
  topSelling(limit: number): Promise<ProductSales[]>;
}
