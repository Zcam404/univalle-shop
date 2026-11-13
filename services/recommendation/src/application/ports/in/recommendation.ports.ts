/**
 * Aplicación · Puertos de entrada de Recomendación.
 */
import { RecommendationListView } from '../../views/recommendation.views.js';

export const GET_MY_RECOMMENDATIONS = Symbol('GetMyRecommendations');
/** Recomendaciones personalizadas para el usuario autenticado. */
export interface GetMyRecommendationsPort {
  execute(userId: string, limit?: number): Promise<RecommendationListView>;
}

export const GET_POPULAR = Symbol('GetPopular');
/** Productos más vendidos (para visitantes o la página principal). */
export interface GetPopularPort {
  execute(limit?: number): Promise<RecommendationListView>;
}

export const GET_RELATED = Symbol('GetRelated');
/** Productos relacionados con uno (en la página de detalle). */
export interface GetRelatedPort {
  execute(productId: string, limit?: number): Promise<RecommendationListView>;
}

export const SYNC_CATALOG = Symbol('SyncCatalog');
/** Trae los cambios pendientes del Catálogo a la copia local. */
export interface SyncCatalogPort {
  /** @returns Cuántos productos se actualizaron. */
  execute(): Promise<number>;
}
