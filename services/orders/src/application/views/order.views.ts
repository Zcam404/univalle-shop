/**
 * Aplicación · Vistas de salida de carrito y pedidos.
 */
import { Cart } from '../../domain/entities/cart.js';
import { Order, OrderStatus } from '../../domain/entities/order.js';
import { ShippingAddressProps } from '../../domain/value-objects/shipping-address.js';

export interface CartItemView {
  productId: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  subtotal: number;
}

export interface CartView {
  items: CartItemView[];
  /** Unidades totales (para el ícono del carrito). */
  totalItems: number;
  /** Total con los precios guardados; el definitivo se fija al comprar. */
  estimatedTotal: number;
}

export interface OrderItemView {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderView {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItemView[];
  total: number;
  shippingAddress: ShippingAddressProps;
  payment: { cardLast4: string | null; failureReason: string | null };
  history: { status: OrderStatus; at: string }[];
  /** `true` si el cliente todavía puede cancelarlo. */
  cancellable: boolean;
  createdAt: string;
}

export interface OrderPageView {
  items: OrderView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toCartView(cart: Cart): CartView {
  const items = cart.lines.map((i) => ({ ...i, subtotal: i.unitPrice * i.quantity }));
  return {
    items,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    estimatedTotal: cart.estimatedTotal,
  };
}

export function toOrderView(order: Order): OrderView {
  const payment = order.payment;
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    items: order.items.map((i) => ({ ...i, subtotal: i.unitPrice * i.quantity })),
    total: order.total,
    shippingAddress: order.shippingAddress.toPrimitives(),
    payment: { cardLast4: payment.cardLast4, failureReason: payment.failureReason },
    history: order.history.map((h) => ({ status: h.status, at: h.at.toISOString() })),
    cancellable: order.isCancellable,
    createdAt: order.createdAt.toISOString(),
  };
}
