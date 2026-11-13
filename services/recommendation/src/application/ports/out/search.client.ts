/**
 * Aplicación · Puerto de salida `SearchClient`: búsquedas recientes desde el servicio de Búsqueda.
 */

/** Token de inyección de dependencias para este puerto. */
export const SEARCH_CLIENT = Symbol('SearchClient');

export interface SearchClient {
  /** Textos buscados por el usuario, el más reciente primero. @throws Error Si Búsqueda no responde. */
  recentSearches(userId: string): Promise<string[]>;
}
