/**
 * Infraestructura · Adaptador de salida `HttpCatalogFeedClient`.
 *
 * Implementa el puerto `CatalogFeedClient` con
 * `GET {CATALOG}/internal/products/changes?cursor=…&limit=…`.
 */
import { CatalogChangesPage, CatalogFeedClient } from '../../application/ports/out/catalog-feed.client.js';
import { ResilientHttpClient } from './resilient-http.client.js';

export class HttpCatalogFeedClient implements CatalogFeedClient {
  constructor(private readonly http: ResilientHttpClient) {}

  /** @throws Error Si Catálogo no responde o contesta algo distinto de 200. */
  async fetchChanges(cursor: string | null, limit: number): Promise<CatalogChangesPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const res = await this.http.request<CatalogChangesPage>('GET', `/internal/products/changes?${params}`);
    if (res.status !== 200) throw new Error(`Catálogo respondió ${res.status} al pedir el feed de cambios.`);
    return res.body;
  }
}
