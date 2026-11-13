/**
 * Aplicación · Puertos de entrada de Búsqueda.
 */
import { SearchQueryInput } from '../../../domain/value-objects/search-query.js';
import { RecentSearchView, SearchResultView, SyncStatusView } from '../../views/search.views.js';

export const SEARCH_PRODUCTS = Symbol('SearchProducts');
/** Busca productos. Si llega `userId` y hay texto, se guarda en sus búsquedas recientes. */
export interface SearchProductsPort {
  execute(input: SearchQueryInput, userId?: string): Promise<SearchResultView>;
}

export const SUGGEST_PRODUCTS = Symbol('SuggestProducts');
/** Sugerencias de nombres mientras el usuario escribe. */
export interface SuggestProductsPort {
  execute(text: string): Promise<string[]>;
}

export const GET_RECENT_SEARCHES = Symbol('GetRecentSearches');
/** Búsquedas recientes de un usuario. */
export interface GetRecentSearchesPort {
  execute(userId: string): Promise<RecentSearchView[]>;
}

export const CLEAR_RECENT_SEARCHES = Symbol('ClearRecentSearches');
/** Borra el historial de búsquedas del usuario. */
export interface ClearRecentSearchesPort {
  execute(userId: string): Promise<void>;
}

export const SYNC_CATALOG = Symbol('SyncCatalog');
/** Trae los cambios pendientes del Catálogo al índice. */
export interface SyncCatalogPort {
  /** @returns Cuántos productos se actualizaron. */
  execute(): Promise<number>;
}

export const REINDEX_CATALOG = Symbol('ReindexCatalog');
/** Vuelve a leer todo el catálogo desde el principio (admin). */
export interface ReindexCatalogPort {
  execute(): Promise<number>;
}

export const GET_SYNC_STATUS = Symbol('GetSyncStatus');
/** Estado del índice: cuántos productos tiene y cuándo se sincronizó. */
export interface GetSyncStatusPort {
  execute(): Promise<SyncStatusView>;
}
