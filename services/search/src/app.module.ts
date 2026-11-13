/**
 * Módulo raíz del servicio de Búsqueda: composición de dependencias.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import {
  CLEAR_RECENT_SEARCHES,
  GET_RECENT_SEARCHES,
  GET_SYNC_STATUS,
  REINDEX_CATALOG,
  SEARCH_PRODUCTS,
  SUGGEST_PRODUCTS,
  SYNC_CATALOG,
  SyncCatalogPort,
} from './application/ports/in/search.ports.js';
import { APP_LOGGER, AppLogger } from './application/ports/out/app-logger.js';
import { CATALOG_FEED, CatalogFeedClient } from './application/ports/out/catalog-feed.client.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { PRODUCT_INDEX, ProductIndexRepository } from './application/ports/out/product-index.repository.js';
import { RECENT_SEARCH_REPOSITORY, RecentSearchRepository } from './application/ports/out/recent-search.repository.js';
import { SYNC_STATE_REPOSITORY, SyncStateRepository } from './application/ports/out/sync-state.repository.js';
import {
  ClearRecentSearchesUseCase,
  GetRecentSearchesUseCase,
  SearchProductsUseCase,
  SuggestProductsUseCase,
} from './application/use-cases/search.use-cases.js';
import { GetSyncStatusUseCase, ReindexCatalogUseCase, SyncCatalogUseCase } from './application/use-cases/sync.use-cases.js';
import { HttpCatalogFeedClient } from './infrastructure/clients/http-catalog-feed.client.js';
import { ResilientHttpClient } from './infrastructure/clients/resilient-http.client.js';
import { SEARCH_CONFIG, SearchConfig } from './infrastructure/config/search.config.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { AdminSearchController, InternalSearchController, SearchController } from './infrastructure/http/search.controller.js';
import { CatalogSyncJob } from './infrastructure/jobs/catalog-sync.job.js';
import { MongoProductIndexRepository } from './infrastructure/persistence/mongo-product-index.repository.js';
import { MongoRecentSearchRepository } from './infrastructure/persistence/mongo-recent-search.repository.js';
import { MongoSyncStateRepository } from './infrastructure/persistence/mongo-sync-state.repository.js';
import {
  IndexedProductRecord,
  IndexedProductSchema,
  RecentSearchRecord,
  RecentSearchSchema,
  SyncStateRecord,
  SyncStateSchema,
} from './infrastructure/persistence/search.schemas.js';
import { NestAppLogger } from './infrastructure/system/nest-app-logger.js';
import { SystemClock } from './infrastructure/system/system-clock.js';

@Module({})
export class AppModule {
  /**
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: SearchConfig): DynamicModule {
    // Circuit breaker suave: el job reintenta solo cada pocos segundos.
    const catalogHttp = new ResilientHttpClient('catalog', config.catalogUrl, {
      timeoutMs: config.requestTimeoutMs,
      failureThreshold: 3,
      resetTimeoutMs: 15_000,
    });

    return {
      module: AppModule,
      imports: [
        MongooseModule.forRoot(config.mongoUri, { serverSelectionTimeoutMS: 5_000 }),
        MongooseModule.forFeature([
          { name: IndexedProductRecord.name, schema: IndexedProductSchema },
          { name: RecentSearchRecord.name, schema: RecentSearchSchema },
          { name: SyncStateRecord.name, schema: SyncStateSchema },
        ]),
        TerminusModule,
      ],
      controllers: [SearchController, AdminSearchController, InternalSearchController, HealthController],
      providers: [
        { provide: SEARCH_CONFIG, useValue: config },

        // --- Adaptadores de salida -------------------------------------------
        { provide: PRODUCT_INDEX, useClass: MongoProductIndexRepository },
        { provide: RECENT_SEARCH_REPOSITORY, useClass: MongoRecentSearchRepository },
        { provide: SYNC_STATE_REPOSITORY, useClass: MongoSyncStateRepository },
        { provide: CATALOG_FEED, useValue: new HttpCatalogFeedClient(catalogHttp) },
        { provide: CLOCK, useValue: new SystemClock() },
        { provide: APP_LOGGER, useValue: new NestAppLogger() },

        // --- Casos de uso -----------------------------------------------------
        {
          provide: SEARCH_PRODUCTS,
          inject: [PRODUCT_INDEX, RECENT_SEARCH_REPOSITORY, CLOCK, APP_LOGGER],
          useFactory: (i: ProductIndexRepository, r: RecentSearchRepository, c: Clock, l: AppLogger) =>
            new SearchProductsUseCase(i, r, c, l),
        },
        { provide: SUGGEST_PRODUCTS, inject: [PRODUCT_INDEX], useFactory: (i: ProductIndexRepository) => new SuggestProductsUseCase(i) },
        {
          provide: GET_RECENT_SEARCHES,
          inject: [RECENT_SEARCH_REPOSITORY],
          useFactory: (r: RecentSearchRepository) => new GetRecentSearchesUseCase(r),
        },
        {
          provide: CLEAR_RECENT_SEARCHES,
          inject: [RECENT_SEARCH_REPOSITORY],
          useFactory: (r: RecentSearchRepository) => new ClearRecentSearchesUseCase(r),
        },
        {
          provide: SYNC_CATALOG,
          inject: [CATALOG_FEED, PRODUCT_INDEX, SYNC_STATE_REPOSITORY, CLOCK],
          useFactory: (f: CatalogFeedClient, i: ProductIndexRepository, s: SyncStateRepository, c: Clock) =>
            new SyncCatalogUseCase(f, i, s, c),
        },
        {
          provide: REINDEX_CATALOG,
          inject: [SYNC_CATALOG, SYNC_STATE_REPOSITORY],
          useFactory: (sync: SyncCatalogPort, s: SyncStateRepository) => new ReindexCatalogUseCase(sync, s),
        },
        {
          provide: GET_SYNC_STATUS,
          inject: [PRODUCT_INDEX, SYNC_STATE_REPOSITORY],
          useFactory: (i: ProductIndexRepository, s: SyncStateRepository) => new GetSyncStatusUseCase(i, s),
        },

        CatalogSyncJob,
      ],
    };
  }
}
