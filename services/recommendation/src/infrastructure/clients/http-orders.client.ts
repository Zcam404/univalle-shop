/**
 * Infraestructura · Adaptador de salida `HttpOrdersClient`.
 *
 * Implementa el puerto `OrdersClient` con las rutas internas de Pedidos:
 * `GET /internal/users/:userId/purchases` y `GET /internal/top-products`.
 */
import { OrdersClient, ProductSales } from '../../application/ports/out/orders.client.js';
import { PurchaseSignal } from '../../domain/services/recommendation-engine.js';
import { ResilientHttpClient } from './resilient-http.client.js';

export class HttpOrdersClient implements OrdersClient {
  constructor(private readonly http: ResilientHttpClient) {}

  async purchases(userId: string): Promise<PurchaseSignal[]> {
    const res = await this.http.request<{ productId: string; quantity: number }[]>(
      'GET',
      `/internal/users/${encodeURIComponent(userId)}/purchases`,
    );
    if (res.status !== 200) throw new Error(`Pedidos respondió ${res.status}`);
    return res.body.map((p) => ({ productId: p.productId, quantity: p.quantity }));
  }

  async topProducts(limit: number): Promise<ProductSales[]> {
    const res = await this.http.request<ProductSales[]>('GET', `/internal/top-products?limit=${limit}`);
    if (res.status !== 200) throw new Error(`Pedidos respondió ${res.status}`);
    return res.body;
  }
}
