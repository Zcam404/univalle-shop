/**
 * Aplicación · Vistas de salida de Recomendación.
 */
import { Recommendation } from '../../domain/services/recommendation-engine.js';

export interface RecommendedProductView {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  /** Motivo de la sugerencia, para mostrarlo en la tienda. */
  reason: string;
}

export interface RecommendationListView {
  /** `personalized`: basadas en el usuario; `popular`: más vendidos o nuevos; `related`: del mismo tipo. */
  strategy: 'personalized' | 'popular' | 'related';
  /** `true` si algún servicio no respondió y se usaron datos guardados. */
  degraded: boolean;
  items: RecommendedProductView[];
}

export function toRecommendedView(r: Recommendation): RecommendedProductView {
  const p = r.product.toPrimitives();
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.imageUrl,
    category: p.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
    reason: r.reason,
  };
}
