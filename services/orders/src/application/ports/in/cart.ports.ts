/**
 * Aplicación · Puertos de entrada del carrito (siempre del usuario autenticado).
 */
import { CartView } from '../../views/order.views.js';

export const GET_CART = Symbol('GetCart');
/** Devuelve el carrito (vacío si nunca agregó nada). */
export interface GetCartPort {
  execute(userId: string): Promise<CartView>;
}

export const ADD_TO_CART = Symbol('AddToCart');
export interface AddToCartCommand {
  userId: string;
  productId: string;
  quantity: number;
}
/** Agrega un producto disponible al carrito. */
export interface AddToCartPort {
  execute(command: AddToCartCommand): Promise<CartView>;
}

export const UPDATE_CART_ITEM = Symbol('UpdateCartItem');
export interface UpdateCartItemCommand {
  userId: string;
  productId: string;
  quantity: number;
}
/** Cambia la cantidad de un producto del carrito. */
export interface UpdateCartItemPort {
  execute(command: UpdateCartItemCommand): Promise<CartView>;
}

export const REMOVE_CART_ITEM = Symbol('RemoveCartItem');
/** Quita un producto del carrito. */
export interface RemoveCartItemPort {
  execute(userId: string, productId: string): Promise<CartView>;
}

export const CLEAR_CART = Symbol('ClearCart');
/** Vacía el carrito. */
export interface ClearCartPort {
  execute(userId: string): Promise<CartView>;
}
