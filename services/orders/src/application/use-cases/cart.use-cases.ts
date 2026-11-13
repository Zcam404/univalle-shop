/**
 * Aplicación · Casos de uso del carrito.
 */
import { Cart } from '../../domain/entities/cart.js';
import { CatalogUnavailableError, OutOfStockError, ProductUnavailableError } from '../../domain/errors/order.errors.js';
import {
  AddToCartCommand,
  AddToCartPort,
  ClearCartPort,
  GetCartPort,
  RemoveCartItemPort,
  UpdateCartItemCommand,
  UpdateCartItemPort,
} from '../ports/in/cart.ports.js';
import { CartRepository } from '../ports/out/cart.repository.js';
import { CatalogClient } from '../ports/out/catalog.client.js';
import { CartView, toCartView } from '../views/order.views.js';

/** Carga el carrito del usuario o crea uno vacío. */
async function loadCart(carts: CartRepository, userId: string): Promise<Cart> {
  return (await carts.findByUserId(userId)) ?? Cart.empty(userId);
}

/** Devuelve el carrito del usuario. */
export class GetCartUseCase implements GetCartPort {
  constructor(private readonly carts: CartRepository) {}

  async execute(userId: string): Promise<CartView> {
    return toCartView(await loadCart(this.carts, userId));
  }
}

/**
 * Agrega un producto al carrito. Consulta Catálogo para comprobar que exista,
 * esté disponible y tenga unidades suficientes, y para copiar nombre, precio e
 * imagen. Sin Catálogo no se puede agregar (no hay datos del producto).
 */
export class AddToCartUseCase implements AddToCartPort {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogClient,
  ) {}

  /**
   * @throws ProductUnavailableError Si no existe, está desactivado o agotado.
   * @throws OutOfStockError Si la cantidad total en el carrito supera el stock.
   * @throws InvalidCartItemError | CartLimitReachedError Si se rompen los límites del carrito.
   * @throws CatalogUnavailableError Si Catálogo no responde.
   */
  async execute(command: AddToCartCommand): Promise<CartView> {
    const product = await this.catalog.getProduct(command.productId);
    if (!product) throw new ProductUnavailableError('El producto no existe o ya no está disponible.');
    if (!product.available) throw new ProductUnavailableError(`"${product.name}" está agotado.`);

    const cart = await loadCart(this.carts, command.userId);
    if (cart.quantityOf(product.id) + command.quantity > product.stock) {
      throw new OutOfStockError(`Solo quedan ${product.stock} unidades de "${product.name}".`);
    }

    cart.add({ productId: product.id, name: product.name, unitPrice: product.price, imageUrl: product.imageUrl }, command.quantity);
    await this.carts.save(cart);
    return toCartView(cart);
  }
}

/**
 * Cambia la cantidad de un producto. Si Catálogo responde, se revisa que
 * haya stock suficiente; si no responde, se permite el cambio igualmente
 * (degradación controlada): la reserva al comprar hace la validación final.
 */
export class UpdateCartItemUseCase implements UpdateCartItemPort {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogClient,
  ) {}

  /**
   * @throws CartItemNotFoundError Si el producto no está en el carrito.
   * @throws InvalidCartItemError Si la cantidad no es válida.
   * @throws OutOfStockError Si Catálogo indica que no hay unidades suficientes.
   */
  async execute(command: UpdateCartItemCommand): Promise<CartView> {
    const cart = await loadCart(this.carts, command.userId);
    cart.setQuantity(command.productId, command.quantity);

    try {
      const product = await this.catalog.getProduct(command.productId);
      if (product && command.quantity > product.stock) {
        throw new OutOfStockError(`Solo quedan ${product.stock} unidades de "${product.name}".`);
      }
    } catch (error) {
      if (!(error instanceof CatalogUnavailableError)) throw error;
    }

    await this.carts.save(cart);
    return toCartView(cart);
  }
}

/** Quita un producto del carrito. */
export class RemoveCartItemUseCase implements RemoveCartItemPort {
  constructor(private readonly carts: CartRepository) {}

  /** @throws CartItemNotFoundError Si el producto no está en el carrito. */
  async execute(userId: string, productId: string): Promise<CartView> {
    const cart = await loadCart(this.carts, userId);
    cart.remove(productId);
    await this.carts.save(cart);
    return toCartView(cart);
  }
}

/** Vacía el carrito. */
export class ClearCartUseCase implements ClearCartPort {
  constructor(private readonly carts: CartRepository) {}

  async execute(userId: string): Promise<CartView> {
    const cart = await loadCart(this.carts, userId);
    cart.clear();
    await this.carts.save(cart);
    return toCartView(cart);
  }
}
