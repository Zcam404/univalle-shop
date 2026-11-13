/**
 * Dominio · Value object `SearchQuery`.
 *
 * Búsqueda ya validada: términos normalizados, filtros coherentes y
 * paginación dentro de rango.
 */
import { InvalidSearchQueryError } from '../errors/search.errors.js';
import { toSearchTerms } from '../services/text-normalizer.js';

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

/** Parámetros tal como llegan del cliente. */
export interface SearchQueryInput {
  text?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}

export class SearchQuery {
  static readonly DEFAULT_PAGE_SIZE = 12;
  static readonly MAX_PAGE_SIZE = 50;

  private constructor(
    readonly terms: string[],
    readonly rawText: string,
    readonly categoryId: string | undefined,
    readonly minPrice: number | undefined,
    readonly maxPrice: number | undefined,
    readonly onlyAvailable: boolean,
    readonly sort: SearchSort,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  /**
   * Valida y normaliza los parámetros. Sin texto, ordenar por relevancia no
   * tiene sentido, así que se ordena por "más nuevos".
   *
   * @throws InvalidSearchQueryError Si los precios son negativos o el mínimo supera al máximo.
   */
  static create(input: SearchQueryInput): SearchQuery {
    const rawText = (input.text ?? '').trim().slice(0, 100);
    const terms = toSearchTerms(rawText);

    for (const price of [input.minPrice, input.maxPrice]) {
      if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
        throw new InvalidSearchQueryError('Los precios del filtro deben ser números positivos.');
      }
    }
    if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) {
      throw new InvalidSearchQueryError('El precio mínimo no puede ser mayor que el máximo.');
    }

    const sort = input.sort ?? 'relevance';
    return new SearchQuery(
      terms,
      rawText,
      input.categoryId || undefined,
      input.minPrice,
      input.maxPrice,
      input.onlyAvailable ?? false,
      sort === 'relevance' && terms.length === 0 ? 'newest' : sort,
      Math.max(1, Math.floor(input.page ?? 1)),
      Math.min(SearchQuery.MAX_PAGE_SIZE, Math.max(1, Math.floor(input.pageSize ?? SearchQuery.DEFAULT_PAGE_SIZE))),
    );
  }

  /** Indica si el usuario escribió algo que se pueda buscar. */
  get hasText(): boolean {
    return this.terms.length > 0;
  }
}
