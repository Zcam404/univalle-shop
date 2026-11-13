/**
 * Infraestructura · Adaptador de salida `HttpCatalogClient`.
 *
 * Implementa el puerto `CatalogClient` llamando por REST al servicio de
 * Catálogo y traduce sus respuestas a errores del dominio de Pedidos. Los dos
 * servicios no comparten código: el contrato es solo el JSON que se intercambian.
 */
import { CatalogClient, CatalogProduct } from '../../application/ports/out/catalog.client.js';
import { OrderItem } from '../../domain/entities/order.js';
import {
  CatalogUnavailableError,
  InvalidCartItemError,
  OutOfStockError,
  ProductUnavailableError,
} from '../../domain/errors/order.errors.js';
import { ResilientHttpClient } from './resilient-http.client.js';

/** Forma de los errores de Catálogo: `{ statusCode, error, message }`. */
interface CatalogError {
  error?: string;
  message?: string | string[];
}

/** Producto tal como lo devuelve `GET /products/:id`. */
interface CatalogProductResponse {
  id: string;
  name: string;
  price: number;
  images: string[];
  stock: number;
  available: boolean;
}

export class HttpCatalogClient implements CatalogClient {
  constructor(private readonly http: ResilientHttpClient) {}

  /** `GET /products/:id`: 404 significa que no existe o está desactivado. */
  async getProduct(productId: string): Promise<CatalogProduct | null> {
    const res = await this.call<CatalogProductResponse>('GET', `/products/${encodeURIComponent(productId)}`);
    if (res.status === 404) return null;
    this.expect(res.status, 200);
    const p = res.body;
    return { id: p.id, name: p.name, price: p.price, imageUrl: p.images[0] ?? null, stock: p.stock, available: p.available };
  }

  /** `POST /internal/reservations`: 409 trae el motivo (sin stock o producto no disponible). */
  async reserve(orderId: string, items: { productId: string; quantity: number }[]): Promise<OrderItem[]> {
    const res = await this.call<{ items: OrderItem[] } & CatalogError>('POST', '/internal/reservations', { orderId, items });
    if (res.status === 201) return res.body.items;

    const message = HttpCatalogClient.messageOf(res.body);
    if (res.body.error === 'INSUFFICIENT_STOCK') throw new OutOfStockError(message);
    if (res.status === 409) throw new ProductUnavailableError(message);
    if (res.status === 400) throw new InvalidCartItemError(message);
    throw new CatalogUnavailableError();
  }

  /** `POST /internal/reservations/:orderId/confirm`. */
  async confirm(orderId: string): Promise<void> {
    const res = await this.call('POST', `/internal/reservations/${encodeURIComponent(orderId)}/confirm`);
    this.expect(res.status, 200);
  }

  /** `POST /internal/reservations/:orderId/release`. */
  async release(orderId: string): Promise<void> {
    const res = await this.call('POST', `/internal/reservations/${encodeURIComponent(orderId)}/release`);
    this.expect(res.status, 200);
  }

  /** Hace la llamada y convierte "servicio caído" en el error de dominio. */
  private async call<T>(method: string, path: string, body?: unknown) {
    try {
      return await this.http.request<T>(method, path, body);
    } catch {
      throw new CatalogUnavailableError();
    }
  }

  /** Cualquier código inesperado se trata como Catálogo no disponible. */
  private expect(actual: number, expected: number): void {
    if (actual !== expected) throw new CatalogUnavailableError();
  }

  /** Extrae el mensaje legible de un error de Catálogo. */
  private static messageOf(body: CatalogError): string {
    const m = body.message;
    return Array.isArray(m) ? m.join(' ') : (m ?? 'El catálogo rechazó la reserva.');
  }
}
