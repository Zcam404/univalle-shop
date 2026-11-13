/**
 * Módulo raíz del servicio de Pedidos: composición de dependencias.
 *
 * Conecta los puertos con sus adaptadores (MongoDB, clientes REST resilientes
 * hacia Catálogo y Pagos, logger) y construye los casos de uso.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { ADD_TO_CART, CLEAR_CART, GET_CART, REMOVE_CART_ITEM, UPDATE_CART_ITEM } from './application/ports/in/cart.ports.js';
import {
  CANCEL_ORDER,
  GET_ORDER,
  GET_TOP_PRODUCTS,
  GET_USER_PURCHASES,
  LIST_ALL_ORDERS,
  LIST_MY_ORDERS,
  PLACE_ORDER,
  UPDATE_ORDER_STATUS,
} from './application/ports/in/order.ports.js';
import { APP_LOGGER, AppLogger } from './application/ports/out/app-logger.js';
import { CART_REPOSITORY, CartRepository } from './application/ports/out/cart.repository.js';
import { CATALOG_CLIENT, CatalogClient } from './application/ports/out/catalog.client.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { ID_GENERATOR, IdGenerator } from './application/ports/out/id-generator.js';
import { ORDER_REPOSITORY, OrderRepository } from './application/ports/out/order.repository.js';
import { PAYMENT_CLIENT, PaymentClient } from './application/ports/out/payment.client.js';
import {
  AddToCartUseCase,
  ClearCartUseCase,
  GetCartUseCase,
  RemoveCartItemUseCase,
  UpdateCartItemUseCase,
} from './application/use-cases/cart.use-cases.js';
import {
  CancelOrderUseCase,
  GetOrderUseCase,
  GetTopProductsUseCase,
  GetUserPurchasesUseCase,
  ListAllOrdersUseCase,
  ListMyOrdersUseCase,
  UpdateOrderStatusUseCase,
} from './application/use-cases/order.use-cases.js';
import { PlaceOrderUseCase } from './application/use-cases/place-order.use-case.js';
import { ReconcilePaymentsUseCase } from './application/use-cases/reconcile-payments.use-case.js';
import { PaymentReconciliationJob } from './infrastructure/jobs/payment-reconciliation.job.js';
import { HttpCatalogClient } from './infrastructure/clients/http-catalog.client.js';
import { HttpPaymentClient } from './infrastructure/clients/http-payment.client.js';
import { ResilientHttpClient } from './infrastructure/clients/resilient-http.client.js';
import { ORDERS_CONFIG, OrdersConfig } from './infrastructure/config/orders.config.js';
import { CartController } from './infrastructure/http/cart.controller.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { InternalOrdersController } from './infrastructure/http/internal.controller.js';
import { AdminOrdersController, OrdersController } from './infrastructure/http/orders.controller.js';
import { MongoCartRepository } from './infrastructure/persistence/mongo-cart.repository.js';
import { MongoOrderRepository } from './infrastructure/persistence/mongo-order.repository.js';
import { CartRecord, CartSchema, OrderRecord, OrderSchema } from './infrastructure/persistence/orders.schemas.js';
import { NestAppLogger } from './infrastructure/system/nest-app-logger.js';
import { SystemClock } from './infrastructure/system/system-clock.js';
import { UuidIdGenerator } from './infrastructure/system/uuid-id-generator.js';

@Module({})
export class AppModule {
  /**
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: OrdersConfig): DynamicModule {
    const resilience = { timeoutMs: config.requestTimeoutMs, ...config.circuitBreaker };

    return {
      module: AppModule,
      imports: [
        MongooseModule.forRoot(config.mongoUri, { serverSelectionTimeoutMS: 5_000 }),
        MongooseModule.forFeature([
          { name: CartRecord.name, schema: CartSchema },
          { name: OrderRecord.name, schema: OrderSchema },
        ]),
        TerminusModule,
      ],
      controllers: [CartController, OrdersController, AdminOrdersController, InternalOrdersController, HealthController],
      providers: [
        { provide: ORDERS_CONFIG, useValue: config },

        // --- Adaptadores de salida -------------------------------------------
        { provide: CART_REPOSITORY, useClass: MongoCartRepository },
        { provide: ORDER_REPOSITORY, useClass: MongoOrderRepository },
        {
          provide: CATALOG_CLIENT,
          useValue: new HttpCatalogClient(new ResilientHttpClient('catalog', config.catalogUrl, resilience)),
        },
        {
          provide: PAYMENT_CLIENT,
          useValue: new HttpPaymentClient(new ResilientHttpClient('payments', config.paymentsUrl, resilience)),
        },
        { provide: CLOCK, useValue: new SystemClock() },
        { provide: ID_GENERATOR, useValue: new UuidIdGenerator() },
        { provide: APP_LOGGER, useValue: new NestAppLogger() },

        // --- Casos de uso: carrito -------------------------------------------
        { provide: GET_CART, inject: [CART_REPOSITORY], useFactory: (c: CartRepository) => new GetCartUseCase(c) },
        {
          provide: ADD_TO_CART,
          inject: [CART_REPOSITORY, CATALOG_CLIENT],
          useFactory: (c: CartRepository, cat: CatalogClient) => new AddToCartUseCase(c, cat),
        },
        {
          provide: UPDATE_CART_ITEM,
          inject: [CART_REPOSITORY, CATALOG_CLIENT],
          useFactory: (c: CartRepository, cat: CatalogClient) => new UpdateCartItemUseCase(c, cat),
        },
        { provide: REMOVE_CART_ITEM, inject: [CART_REPOSITORY], useFactory: (c: CartRepository) => new RemoveCartItemUseCase(c) },
        { provide: CLEAR_CART, inject: [CART_REPOSITORY], useFactory: (c: CartRepository) => new ClearCartUseCase(c) },

        // --- Casos de uso: pedidos -------------------------------------------
        {
          provide: PLACE_ORDER,
          inject: [CART_REPOSITORY, ORDER_REPOSITORY, CATALOG_CLIENT, PAYMENT_CLIENT, ID_GENERATOR, CLOCK, APP_LOGGER],
          useFactory: (
            c: CartRepository,
            o: OrderRepository,
            cat: CatalogClient,
            pay: PaymentClient,
            ids: IdGenerator,
            clock: Clock,
            log: AppLogger,
          ) => new PlaceOrderUseCase(c, o, cat, pay, ids, clock, log),
        },
        { provide: LIST_MY_ORDERS, inject: [ORDER_REPOSITORY], useFactory: (o: OrderRepository) => new ListMyOrdersUseCase(o) },
        { provide: GET_ORDER, inject: [ORDER_REPOSITORY], useFactory: (o: OrderRepository) => new GetOrderUseCase(o) },
        {
          provide: CANCEL_ORDER,
          inject: [ORDER_REPOSITORY, PAYMENT_CLIENT, CATALOG_CLIENT, CLOCK, APP_LOGGER],
          useFactory: (o: OrderRepository, pay: PaymentClient, cat: CatalogClient, clock: Clock, log: AppLogger) =>
            new CancelOrderUseCase(o, pay, cat, clock, log),
        },
        { provide: LIST_ALL_ORDERS, inject: [ORDER_REPOSITORY], useFactory: (o: OrderRepository) => new ListAllOrdersUseCase(o) },
        {
          provide: UPDATE_ORDER_STATUS,
          inject: [ORDER_REPOSITORY, CLOCK],
          useFactory: (o: OrderRepository, clock: Clock) => new UpdateOrderStatusUseCase(o, clock),
        },

        // --- Casos de uso internos (servicio de Recomendación) -----------------
        { provide: GET_USER_PURCHASES, inject: [ORDER_REPOSITORY], useFactory: (o: OrderRepository) => new GetUserPurchasesUseCase(o) },
        { provide: GET_TOP_PRODUCTS, inject: [ORDER_REPOSITORY], useFactory: (o: OrderRepository) => new GetTopProductsUseCase(o) },

        // --- Conciliación periódica de cobros en duda ----------------------------
        {
          provide: ReconcilePaymentsUseCase,
          inject: [ORDER_REPOSITORY, PAYMENT_CLIENT, APP_LOGGER],
          useFactory: (o: OrderRepository, pay: PaymentClient, log: AppLogger) => new ReconcilePaymentsUseCase(o, pay, log),
        },
        PaymentReconciliationJob,
      ],
    };
  }
}
