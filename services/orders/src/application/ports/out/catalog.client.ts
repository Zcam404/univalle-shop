/**
 * Aplicación · Puerto de salida `CatalogClient`.
 *
 * Lo que Pedidos necesita del servicio de Catálogo. El adaptador lo implementa
 * con llamadas REST (con timeout y circuit breaker) y traduce las respuestas de
 * Catálogo a errores del dominio de Pedidos.
 */
import { OrderItem } from '../../../domain/entities/order.js';

/** Token de inyección de dependencias para este puerto. */
export const CATALOG_CLIENT = Symbol('CatalogClient');

/** Datos del producto que interesan al carrito. */
export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  /** Activo y con stock. */
  available: boolean;
}

export interface CatalogClient {
  /**
   * @returns El producto, o `null` si no existe o está desactivado.
   * @throws CatalogUnavailableError Si Catálogo no responde.
   */
  getProduct(productId: string): Promise<CatalogProduct | null>;

  /**
   * Aparta el stock de todas las líneas (todo o nada) y devuelve las líneas
   * con el nombre y el precio congelados. Repetirla con el mismo pedido no
   * descuenta dos veces.
   *
   * @throws OutOfStockError | ProductUnavailableError Si no se puede reservar.
   * @throws CatalogUnavailableError Si Catálogo no responde.
   */
  reserve(orderId: string, items: { productId: string; quantity: number }[]): Promise<OrderItem[]>;

  /** Confirma la reserva de un pedido pagado. @throws CatalogUnavailableError */
  confirm(orderId: string): Promise<void>;

  /** Libera la reserva y devuelve el stock. @throws CatalogUnavailableError */
  release(orderId: string): Promise<void>;
}
