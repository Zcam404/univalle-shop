/**
 * Infraestructura · Adaptador de salida `HttpSearchClient`.
 *
 * Implementa el puerto `SearchClient` con `GET /internal/users/:userId/recent-searches` de Búsqueda.
 */
import { SearchClient } from '../../application/ports/out/search.client.js';
import { ResilientHttpClient } from './resilient-http.client.js';

export class HttpSearchClient implements SearchClient {
  constructor(private readonly http: ResilientHttpClient) {}

  async recentSearches(userId: string): Promise<string[]> {
    const res = await this.http.request<{ text: string }[]>(
      'GET',
      `/internal/users/${encodeURIComponent(userId)}/recent-searches`,
    );
    if (res.status !== 200) throw new Error(`Búsqueda respondió ${res.status}`);
    return res.body.map((s) => s.text);
  }
}
