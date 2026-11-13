/**
 * Aplicación · Casos de uso de búsqueda y búsquedas recientes.
 */
import { RecentSearches } from '../../domain/entities/recent-searches.js';
import { toSearchTerms } from '../../domain/services/text-normalizer.js';
import { SearchQuery, SearchQueryInput } from '../../domain/value-objects/search-query.js';
import {
  ClearRecentSearchesPort,
  GetRecentSearchesPort,
  SearchProductsPort,
  SuggestProductsPort,
} from '../ports/in/search.ports.js';
import { AppLogger } from '../ports/out/app-logger.js';
import { Clock } from '../ports/out/clock.js';
import { ProductIndexRepository } from '../ports/out/product-index.repository.js';
import { RecentSearchRepository } from '../ports/out/recent-search.repository.js';
import { RecentSearchView, SearchResultView, toProductHitView } from '../views/search.views.js';

/**
 * Busca productos en el índice. Guardar la búsqueda en el historial del
 * usuario es secundario: si falla, se registra un aviso pero los resultados
 * se entregan igual.
 */
export class SearchProductsUseCase implements SearchProductsPort {
  constructor(
    private readonly index: ProductIndexRepository,
    private readonly recent: RecentSearchRepository,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  /** @throws InvalidSearchQueryError Si los filtros no son válidos. */
  async execute(input: SearchQueryInput, userId?: string): Promise<SearchResultView> {
    const query = SearchQuery.create(input);
    const result = await this.index.search(query);

    if (userId && query.hasText) {
      await this.remember(userId, query.rawText);
    }

    return {
      items: result.items.map(toProductHitView),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(result.total / query.pageSize),
      terms: query.terms,
    };
  }

  /** Agrega la búsqueda al historial del usuario sin interrumpir si falla. */
  private async remember(userId: string, text: string): Promise<void> {
    try {
      const recent = (await this.recent.find(userId)) ?? RecentSearches.empty(userId);
      recent.record(text, this.clock.now());
      await this.recent.save(recent);
    } catch (error) {
      this.logger.warn(`No se pudo guardar la búsqueda reciente de ${userId}: ${(error as Error).message}`);
    }
  }
}

/** Hasta 6 nombres de productos que coinciden con lo que se está escribiendo. */
export class SuggestProductsUseCase implements SuggestProductsPort {
  static readonly LIMIT = 6;

  constructor(private readonly index: ProductIndexRepository) {}

  async execute(text: string): Promise<string[]> {
    const terms = toSearchTerms(text);
    return terms.length === 0 ? [] : this.index.suggest(terms, SuggestProductsUseCase.LIMIT);
  }
}

/** Búsquedas recientes del usuario (más reciente primero). */
export class GetRecentSearchesUseCase implements GetRecentSearchesPort {
  constructor(private readonly recent: RecentSearchRepository) {}

  async execute(userId: string): Promise<RecentSearchView[]> {
    const recent = await this.recent.find(userId);
    return (recent?.list ?? []).map((e) => ({ text: e.text, at: e.at.toISOString() }));
  }
}

/** Borra el historial de búsquedas del usuario. */
export class ClearRecentSearchesUseCase implements ClearRecentSearchesPort {
  constructor(private readonly recent: RecentSearchRepository) {}

  async execute(userId: string): Promise<void> {
    const recent = RecentSearches.empty(userId);
    await this.recent.save(recent);
  }
}
