/**
 * Dominio · Agregado `Cart`.
 *
 * Carrito de compras de un usuario (uno por usuario; su id es el del usuario).
 * Cada línea guarda una copia del nombre, precio e imagen del producto al
 * agregarlo, para mostrar el carrito aunque el catálogo no responda. El precio
 * que finalmente se cobra lo fija la reserva del catálogo al comprar.
 *
 * Reglas: cantidades enteras entre 1 y 100 por producto; máximo 50 productos
 * distintos; agregar un producto que ya está suma la cantidad.
 */
import { CartItemNotFoundError, CartLimitReachedError, InvalidCartItemError } from '../errors/order.errors.js';

/** Línea del carrito. */
export interface CartItem {
  productId: string;
  name: string;
  /** Precio en pesos al momento de agregarlo (informativo). */
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
}

/** Datos del producto que se copian al carrito. */
export type ProductSnapshot = Omit<CartItem, 'quantity'>;

export class Cart {
  static readonly MAX_LINES = 50;
  static readonly MAX_QUANTITY = 100;

  private constructor(
    readonly userId: string,
    private items: CartItem[],
  ) {}

  /** Carrito vacío para un usuario. */
  static empty(userId: string): Cart {
    return new Cart(userId, []);
  }

  /** Reconstruye un carrito desde la persistencia. */
  static restore(userId: string, items: CartItem[]): Cart {
    return new Cart(userId, items.map((i) => ({ ...i })));
  }

  /** Copia de las líneas. */
  get lines(): readonly CartItem[] {
    return this.items.map((i) => ({ ...i }));
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Suma de precio × cantidad con los precios guardados (estimado; el definitivo lo da la reserva). */
  get estimatedTotal(): number {
    return this.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }

  /** Cantidad de unidades de un producto que ya hay en el carrito (0 si no está). */
  quantityOf(productId: string): number {
    return this.items.find((i) => i.productId === productId)?.quantity ?? 0;
  }

  /**
   * Agrega unidades de un producto. Si ya estaba, suma la cantidad y actualiza
   * nombre, precio e imagen con los datos recientes.
   *
   * @throws InvalidCartItemError Si la cantidad no es válida o el total pasa de 100.
   * @throws CartLimitReachedError Si es un producto nuevo y ya hay 50.
   */
  add(product: ProductSnapshot, quantity: number): void {
    Cart.validateQuantity(quantity);
    const existing = this.items.find((i) => i.productId === product.productId);
    if (existing) {
      Cart.validateQuantity(existing.quantity + quantity);
      Object.assign(existing, product, { quantity: existing.quantity + quantity });
      return;
    }
    if (this.items.length >= Cart.MAX_LINES) throw new CartLimitReachedError(Cart.MAX_LINES);
    this.items.push({ ...product, quantity });
  }

  /**
   * Cambia la cantidad de un producto que ya está en el carrito.
   * @throws CartItemNotFoundError Si no está.
   * @throws InvalidCartItemError Si la cantidad no es válida.
   */
  setQuantity(productId: string, quantity: number): void {
    Cart.validateQuantity(quantity);
    const item = this.items.find((i) => i.productId === productId);
    if (!item) throw new CartItemNotFoundError();
    item.quantity = quantity;
  }

  /**
   * Quita un producto del carrito.
   * @throws CartItemNotFoundError Si no está.
   */
  remove(productId: string): void {
    if (!this.items.some((i) => i.productId === productId)) throw new CartItemNotFoundError();
    this.items = this.items.filter((i) => i.productId !== productId);
  }

  /** Vacía el carrito (después de una compra pagada). */
  clear(): void {
    this.items = [];
  }

  /** La cantidad debe ser un entero entre 1 y 100. */
  private static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Cart.MAX_QUANTITY) {
      throw new InvalidCartItemError(`La cantidad debe ser un número entero entre 1 y ${Cart.MAX_QUANTITY}.`);
    }
  }
}
