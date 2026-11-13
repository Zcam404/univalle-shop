/**
 * Módulo raíz del servicio de Recomendación: composición de dependencias.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import {
  GET_MY_RECOMMENDATIONS,
  GET_POPULAR,
  GET_RELATED,
  SYNC_CATALOG,
} from './application/ports/in/recommendation.ports.js';
import { APP_LOGGER, AppLogger } from './application/ports/out/app-logger.js';
import { CATALOG_FEED, CatalogFeedClient } from './application/ports/out/catalog-feed.client.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { ORDERS_CLIENT, OrdersClient } from './application/ports/out/orders.client.js';
import { PRODUCT_SNAPSHOT, ProductSnapshotRepository } from './application/ports/out/product-snapshot.repository.js';
import { SEARCH_CLIENT, SearchClient } from './application/ports/out/search.client.js';
import { SIGNAL_CACHE, SignalCacheRepository } from './application/ports/out/signal-cache.repository.js';
import { SYNC_STATE_REPOSITORY, SyncStateRepository } from './application/ports/out/sync-state.repository.js';
import { SignalsProvider } from './application/services/signals-provider.js';
import {
  GetMyRecommendationsUseCase,
  GetPopularUseCase,
  GetRelatedUseCase,
} from './application/use-cases/recommendation.use-cases.js';
import { SyncCatalogUseCase } from './application/use-cases/sync-catalog.use-case.js';
import { HttpCatalogFeedClient } from './infrastructure/clients/http-catalog-feed.client.js';
import { HttpOrdersClient } from './infrastructure/clients/http-orders.client.js';
import { HttpSearchClient } from './infrastructure/clients/http-search.client.js';
import { ResilientHttpClient } from './infrastructure/clients/resilient-http.client.js';
import { RECOMMENDATION_CONFIG, RecommendationConfig } from './infrastructure/config/recommendation.config.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { RecommendationsController } from './infrastructure/http/recommendations.controller.js';
import { CatalogSyncJob } from './infrastructure/jobs/catalog-sync.job.js';
import { MongoProductSnapshotRepository } from './infrastructure/persistence/mongo-product-snapshot.repository.js';
import { MongoSignalCacheRepository } from './infrastructure/persistence/mongo-signal-cache.repository.js';
import { MongoSyncStateRepository } from './infrastructure/persistence/mongo-sync-state.repository.js';
import {
  ProductSnapshotRecord,
  ProductSnapshotSchema,
  SyncStateRecord,
  SyncStateSchema,
  TopProductsRecord,
  TopProductsSchema,
  UserSignalsRecord,
  UserSignalsSchema,
} from './infrastructure/persistence/recommendation.schemas.js';
import { NestAppLogger } from './infrastructure/system/nest-app-logger.js';
import { SystemClock } from './infrastructure/system/system-clock.js';

@Module({})
export class AppModule {
  /**
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: RecommendationConfig): DynamicModule {
    // Señales: timeout corto y circuito que se abre rápido; si fallan, se usa la caché.
    const signals = { timeoutMs: config.signalsTimeoutMs, failureThreshold: 3, resetTimeoutMs: 15_000 };

    return {
      module: AppModule,
      imports: [
        MongooseModule.forRoot(config.mongoUri, { serverSelectionTimeoutMS: 5_000 }),
        MongooseModule.forFeature([
          { name: ProductSnapshotRecord.name, schema: ProductSnapshotSchema },
          { name: UserSignalsRecord.name, schema: UserSignalsSchema },
          { name: TopProductsRecord.name, schema: TopProductsSchema },
          { name: SyncStateRecord.name, schema: SyncStateSchema },
        ]),
        TerminusModule,
      ],
      controllers: [RecommendationsController, HealthController],
      providers: [
        { provide: RECOMMENDATION_CONFIG, useValue: config },

        // --- Adaptadores de salida -------------------------------------------
        { provide: PRODUCT_SNAPSHOT, useClass: MongoProductSnapshotRepository },
        { provide: SIGNAL_CACHE, useClass: MongoSignalCacheRepository },
        { provide: SYNC_STATE_REPOSITORY, useClass: MongoSyncStateRepository },
        {
          provide: CATALOG_FEED,
          useValue: new HttpCatalogFeedClient(
            new ResilientHttpClient('catalog', config.catalogUrl, { timeoutMs: 5_000, failureThreshold: 3, resetTimeoutMs: 15_000 }),
          ),
        },
        { provide: ORDERS_CLIENT, useValue: new HttpOrdersClient(new ResilientHttpClient('orders', config.ordersUrl, signals)) },
        { provide: SEARCH_CLIENT, useValue: new HttpSearchClient(new ResilientHttpClient('search', config.searchUrl, signals)) },
        { provide: CLOCK, useValue: new SystemClock() },
        { provide: APP_LOGGER, useValue: new NestAppLogger() },

        // --- Servicios de aplicación y casos de uso ---------------------------
        {
          provide: SignalsProvider,
          inject: [ORDERS_CLIENT, SEARCH_CLIENT, SIGNAL_CACHE, APP_LOGGER],
          useFactory: (o: OrdersClient, s: SearchClient, c: SignalCacheRepository, l: AppLogger) => new SignalsProvider(o, s, c, l),
        },
        {
          provide: GET_MY_RECOMMENDATIONS,
          inject: [PRODUCT_SNAPSHOT, SignalsProvider],
          useFactory: (p: ProductSnapshotRepository, s: SignalsProvider) => new GetMyRecommendationsUseCase(p, s),
        },
        {
          provide: GET_POPULAR,
          inject: [PRODUCT_SNAPSHOT, SignalsProvider],
          useFactory: (p: ProductSnapshotRepository, s: SignalsProvider) => new GetPopularUseCase(p, s),
        },
        {
          provide: GET_RELATED,
          inject: [PRODUCT_SNAPSHOT, SignalsProvider],
          useFactory: (p: ProductSnapshotRepository, s: SignalsProvider) => new GetRelatedUseCase(p, s),
        },
        {
          provide: SYNC_CATALOG,
          inject: [CATALOG_FEED, PRODUCT_SNAPSHOT, SYNC_STATE_REPOSITORY, CLOCK],
          useFactory: (f: CatalogFeedClient, p: ProductSnapshotRepository, st: SyncStateRepository, c: Clock) =>
            new SyncCatalogUseCase(f, p, st, c),
        },

        CatalogSyncJob,
      ],
    };
  }
}
