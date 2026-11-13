/**
 * Aplicación · Puerto de salida `CartRepository`: guarda el carrito de cada usuario.
 */
import { Cart } from '../../../domain/entities/cart.js';

/** Token de inyección de dependencias para este puerto. */
export const CART_REPOSITORY = Symbol('CartRepository');

export interface CartRepository {
  /** Carrito del usuario, o `null` si nunca ha agregado nada. */
  findByUserId(userId: string): Promise<Cart | null>;

  /** Crea o reemplaza el carrito. */
  save(cart: Cart): Promise<void>;
}
