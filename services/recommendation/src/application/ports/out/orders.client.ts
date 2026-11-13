/**
 * Aplicación · Puerto de salida `OrdersClient`: señales de compra desde el servicio de Pedidos.
 */
import { PurchaseSignal } from '../../../domain/services/recommendation-engine.js';

/** Token de inyección de dependencias para este puerto. */
export const ORDERS_CLIENT = Symbol('OrdersClient');

export interface ProductSales {
  productId: string;
  unitsSold: number;
}

export interface OrdersClient {
  /** Productos que compró el usuario. @throws Error Si Pedidos no responde. */
  purchases(userId: string): Promise<PurchaseSignal[]>;

  /** Más vendidos de la tienda. @throws Error Si Pedidos no responde. */
  topProducts(limit: number): Promise<ProductSales[]>;
}
