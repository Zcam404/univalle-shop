/**
 * Aplicación · Puerto de salida `RecentSearchRepository`: búsquedas recientes por usuario.
 */
import { RecentSearches } from '../../../domain/entities/recent-searches.js';

/** Token de inyección de dependencias para este puerto. */
export const RECENT_SEARCH_REPOSITORY = Symbol('RecentSearchRepository');

export interface RecentSearchRepository {
  /** Búsquedas del usuario, o `null` si no ha buscado nada. */
  find(userId: string): Promise<RecentSearches | null>;
  save(recent: RecentSearches): Promise<void>;
}
