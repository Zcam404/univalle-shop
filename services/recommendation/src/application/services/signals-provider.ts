/**
 * Aplicación · Servicio `SignalsProvider`.
 *
 * Reúne las señales de un usuario consultando Pedidos y Búsqueda. Cada fuente
 * es independiente:
 * - si responde, se usa su dato fresco y se guarda en la caché;
 * - si no responde, se usa lo último guardado (o nada) y se marca `degraded`.
 *
 * Así la caída de un servicio empeora un poco las recomendaciones, pero nunca
 * las rompe.
 */
import { UserSignals } from '../../domain/services/recommendation-engine.js';
import { AppLogger } from '../ports/out/app-logger.js';
import { OrdersClient } from '../ports/out/orders.client.js';
import { SearchClient } from '../ports/out/search.client.js';
import { SignalCacheRepository } from '../ports/out/signal-cache.repository.js';

export interface SignalsWithStatus<T> {
  value: T;
  /** `true` si alguna fuente no respondió y se usaron datos guardados o ninguno. */
  degraded: boolean;
}

export class SignalsProvider {
  /** Cuántos productos más vendidos se consideran para la popularidad. */
  static readonly TOP_LIMIT = 50;

  constructor(
    private readonly orders: OrdersClient,
    private readonly search: SearchClient,
    private readonly cache: SignalCacheRepository,
    private readonly logger: AppLogger,
  ) {}

  /** Compras y búsquedas recientes del usuario. */
  async userSignals(userId: string): Promise<SignalsWithStatus<UserSignals>> {
    const cached = await this.cache.getUser(userId);
    const [purchases, searches] = await Promise.all([
      this.fresh(
        () => this.orders.purchases(userId),
        (v) => this.cache.savePurchases(userId, v),
        cached.purchases,
        'Pedidos',
      ),
      this.fresh(
        () => this.search.recentSearches(userId),
        (v) => this.cache.saveSearches(userId, v),
        cached.searches,
        'Búsqueda',
      ),
    ]);
    return {
      value: { purchases: purchases.value ?? [], searches: searches.value ?? [] },
      degraded: purchases.degraded || searches.degraded,
    };
  }

  /** Unidades vendidas por producto (popularidad). */
  async popularity(): Promise<SignalsWithStatus<Map<string, number>>> {
    const top = await this.fresh(
      () => this.orders.topProducts(SignalsProvider.TOP_LIMIT),
      (v) => this.cache.saveTopProducts(v),
      await this.cache.getTopProducts(),
      'Pedidos',
    );
    return { value: new Map((top.value ?? []).map((t) => [t.productId, t.unitsSold])), degraded: top.degraded };
  }

  /**
   * Intenta traer el dato fresco y guardarlo; si la fuente falla, devuelve el
   * dato en caché y registra un aviso.
   */
  private async fresh<T>(
    load: () => Promise<T>,
    save: (value: T) => Promise<void>,
    cached: T | null,
    source: string,
  ): Promise<SignalsWithStatus<T | null>> {
    try {
      const value = await load();
      await save(value).catch(() => undefined); // si la caché falla, el dato fresco sirve igual
      return { value, degraded: false };
    } catch (error) {
      this.logger.warn(`${source} no respondió; se usan datos guardados. ${(error as Error).message}`);
      return { value: cached, degraded: true };
    }
  }
}
