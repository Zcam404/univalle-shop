/**
 * Aplicación · Puertos de entrada de pedidos.
 */
import { OrderStatus } from '../../../domain/entities/order.js';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address.js';
import { CardData } from '../out/payment.client.js';
import { ProductSales, PurchasedProduct } from '../out/order.repository.js';
import { OrderPageView, OrderView } from '../../views/order.views.js';

/** Quién hace la petición. */
export interface Requester {
  userId: string;
  isAdmin: boolean;
}

export const PLACE_ORDER = Symbol('PlaceOrder');
export interface PlaceOrderCommand {
  userId: string;
  shippingAddress: Omit<ShippingAddressProps, 'additionalInfo'> & { additionalInfo?: string | null };
  card: CardData;
}
/** Compra el contenido del carrito: reserva stock, cobra y registra el pedido. */
export interface PlaceOrderPort {
  execute(command: PlaceOrderCommand): Promise<OrderView>;
}

export const LIST_MY_ORDERS = Symbol('ListMyOrders');
/** Historial de pedidos del usuario, del más reciente al más antiguo. */
export interface ListMyOrdersPort {
  execute(userId: string, page?: number, pageSize?: number): Promise<OrderPageView>;
}

export const GET_ORDER = Symbol('GetOrder');
/** Detalle de un pedido (el dueño o un admin). */
export interface GetOrderPort {
  execute(orderId: string, requester: Requester): Promise<OrderView>;
}

export const CANCEL_ORDER = Symbol('CancelOrder');
/** El cliente cancela un pedido pagado que aún no se envió: se reembolsa y se devuelve el stock. */
export interface CancelOrderPort {
  execute(orderId: string, userId: string): Promise<OrderView>;
}

export const LIST_ALL_ORDERS = Symbol('ListAllOrders');
export interface ListAllOrdersQuery {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}
/** Todos los pedidos, con filtro por estado (solo admin). */
export interface ListAllOrdersPort {
  execute(query: ListAllOrdersQuery): Promise<OrderPageView>;
}

export const UPDATE_ORDER_STATUS = Symbol('UpdateOrderStatus');
/** El admin marca un pedido como enviado o entregado. */
export interface UpdateOrderStatusPort {
  execute(orderId: string, status: 'SHIPPED' | 'DELIVERED'): Promise<OrderView>;
}

export const GET_USER_PURCHASES = Symbol('GetUserPurchases');
/** Productos comprados por un usuario (uso interno: servicio de Recomendación). */
export interface GetUserPurchasesPort {
  execute(userId: string): Promise<PurchasedProduct[]>;
}

export const GET_TOP_PRODUCTS = Symbol('GetTopProducts');
/** Productos más vendidos de la tienda (uso interno: servicio de Recomendación). */
export interface GetTopProductsPort {
  execute(limit?: number): Promise<ProductSales[]>;
}
