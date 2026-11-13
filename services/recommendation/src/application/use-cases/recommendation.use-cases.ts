/**
 * Aplicación · Casos de uso de Recomendación.
 */
import { ProductNotFoundError } from '../../domain/errors/recommendation.errors.js';
import {
  recommendForUser,
  recommendPopular,
  recommendRelated,
} from '../../domain/services/recommendation-engine.js';
import { GetMyRecommendationsPort, GetPopularPort, GetRelatedPort } from '../ports/in/recommendation.ports.js';
import { ProductSnapshotRepository } from '../ports/out/product-snapshot.repository.js';
import { SignalsProvider } from '../services/signals-provider.js';
import { RecommendationListView, toRecommendedView } from '../views/recommendation.views.js';

/** Limita la cantidad pedida a un rango razonable (1 a 20, por defecto 10). */
const clampLimit = (limit: number | undefined) => Math.min(20, Math.max(1, Math.floor(limit ?? 10)));

/** Recomendaciones según las compras y búsquedas del usuario. */
export class GetMyRecommendationsUseCase implements GetMyRecommendationsPort {
  constructor(
    private readonly products: ProductSnapshotRepository,
    private readonly signals: SignalsProvider,
  ) {}

  async execute(userId: string, limit?: number): Promise<RecommendationListView> {
    const [catalog, user, popularity] = await Promise.all([
      this.products.findAll(),
      this.signals.userSignals(userId),
      this.signals.popularity(),
    ]);
    const result = recommendForUser(catalog, user.value, popularity.value, clampLimit(limit));
    return {
      strategy: result.strategy,
      degraded: user.degraded || popularity.degraded,
      items: result.items.map(toRecommendedView),
    };
  }
}

/** Más vendidos (o más nuevos si aún no hay ventas). */
export class GetPopularUseCase implements GetPopularPort {
  constructor(
    private readonly products: ProductSnapshotRepository,
    private readonly signals: SignalsProvider,
  ) {}

  async execute(limit?: number): Promise<RecommendationListView> {
    const [catalog, popularity] = await Promise.all([this.products.findAll(), this.signals.popularity()]);
    return {
      strategy: 'popular',
      degraded: popularity.degraded,
      items: recommendPopular(catalog, popularity.value, clampLimit(limit)).map(toRecommendedView),
    };
  }
}

/** Productos relacionados con uno dado. */
export class GetRelatedUseCase implements GetRelatedPort {
  constructor(
    private readonly products: ProductSnapshotRepository,
    private readonly signals: SignalsProvider,
  ) {}

  /** @throws ProductNotFoundError Si el producto no está en la copia del catálogo. */
  async execute(productId: string, limit?: number): Promise<RecommendationListView> {
    const target = await this.products.findById(productId);
    if (!target) throw new ProductNotFoundError();
    const [catalog, popularity] = await Promise.all([this.products.findAll(), this.signals.popularity()]);
    return {
      strategy: 'related',
      degraded: popularity.degraded,
      items: recommendRelated(target, catalog, popularity.value, clampLimit(limit)).map(toRecommendedView),
    };
  }
}
