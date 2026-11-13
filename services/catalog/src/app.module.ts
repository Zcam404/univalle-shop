/**
 * Módulo raíz del servicio de Catálogo: composición de dependencias.
 *
 * Único lugar que conoce a la vez los puertos y sus implementaciones. Aquí se
 * conectan los repositorios de MongoDB y se construyen los casos de uso.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { CREATE_CATEGORY, DELETE_CATEGORY, LIST_CATEGORIES, UPDATE_CATEGORY } from './application/ports/in/category.ports.js';
import {
  ADJUST_STOCK,
  CREATE_PRODUCT,
  GET_PRODUCT,
  LIST_PRODUCT_CHANGES,
  LIST_PRODUCTS,
  UPDATE_PRODUCT,
} from './application/ports/in/product.ports.js';
import { CONFIRM_RESERVATION, RELEASE_RESERVATION, RESERVE_STOCK } from './application/ports/in/reservation.ports.js';
import { CATEGORY_REPOSITORY, CategoryRepository } from './application/ports/out/category.repository.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { ID_GENERATOR, IdGenerator } from './application/ports/out/id-generator.js';
import { PRODUCT_REPOSITORY, ProductRepository } from './application/ports/out/product.repository.js';
import { RESERVATION_REPOSITORY, ReservationRepository } from './application/ports/out/reservation.repository.js';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from './application/use-cases/category.use-cases.js';
import {
  AdjustStockUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
} from './application/use-cases/product-command.use-cases.js';
import {
  GetProductUseCase,
  ListProductChangesUseCase,
  ListProductsUseCase,
} from './application/use-cases/product-query.use-cases.js';
import {
  ConfirmReservationUseCase,
  ReleaseReservationUseCase,
  ReserveStockUseCase,
} from './application/use-cases/reservation.use-cases.js';
import { DemoCatalogSeeder } from './infrastructure/bootstrap/demo-catalog.seeder.js';
import { CATALOG_CONFIG, CatalogConfig } from './infrastructure/config/catalog.config.js';
import { CategoriesController } from './infrastructure/http/categories.controller.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { InternalController } from './infrastructure/http/internal.controller.js';
import { ProductsController } from './infrastructure/http/products.controller.js';
import {
  CategoryRecord,
  CategorySchema,
  ProductRecord,
  ProductSchema,
  ReservationRecord,
  ReservationSchema,
} from './infrastructure/persistence/catalog.schemas.js';
import { MongoCategoryRepository } from './infrastructure/persistence/mongo-category.repository.js';
import { MongoProductRepository } from './infrastructure/persistence/mongo-product.repository.js';
import { MongoReservationRepository } from './infrastructure/persistence/mongo-reservation.repository.js';
import { SystemClock } from './infrastructure/system/system-clock.js';
import { UuidIdGenerator } from './infrastructure/system/uuid-id-generator.js';

/** Abreviaturas para los tipos de los repositorios en las fábricas de abajo. */
type Cats = CategoryRepository;
type Prods = ProductRepository;
type Res = ReservationRepository;

@Module({})
export class AppModule {
  /**
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: CatalogConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        MongooseModule.forRoot(config.mongoUri, { serverSelectionTimeoutMS: 5_000 }),
        MongooseModule.forFeature([
          { name: CategoryRecord.name, schema: CategorySchema },
          { name: ProductRecord.name, schema: ProductSchema },
          { name: ReservationRecord.name, schema: ReservationSchema },
        ]),
        TerminusModule,
      ],
      controllers: [CategoriesController, ProductsController, InternalController, HealthController],
      providers: [
        { provide: CATALOG_CONFIG, useValue: config },

        // --- Adaptadores de salida -------------------------------------------
        { provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository },
        { provide: PRODUCT_REPOSITORY, useClass: MongoProductRepository },
        { provide: RESERVATION_REPOSITORY, useClass: MongoReservationRepository },
        { provide: CLOCK, useValue: new SystemClock() },
        { provide: ID_GENERATOR, useValue: new UuidIdGenerator() },

        // --- Casos de uso: categorías -----------------------------------------
        { provide: LIST_CATEGORIES, inject: [CATEGORY_REPOSITORY], useFactory: (c: Cats) => new ListCategoriesUseCase(c) },
        {
          provide: CREATE_CATEGORY,
          inject: [CATEGORY_REPOSITORY, ID_GENERATOR, CLOCK],
          useFactory: (c: Cats, ids: IdGenerator, clock: Clock) => new CreateCategoryUseCase(c, ids, clock),
        },
        { provide: UPDATE_CATEGORY, inject: [CATEGORY_REPOSITORY], useFactory: (c: Cats) => new UpdateCategoryUseCase(c) },
        {
          provide: DELETE_CATEGORY,
          inject: [CATEGORY_REPOSITORY, PRODUCT_REPOSITORY],
          useFactory: (c: Cats, p: Prods) => new DeleteCategoryUseCase(c, p),
        },

        // --- Casos de uso: productos e inventario ------------------------------
        {
          provide: LIST_PRODUCTS,
          inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY],
          useFactory: (p: Prods, c: Cats) => new ListProductsUseCase(p, c),
        },
        {
          provide: GET_PRODUCT,
          inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY],
          useFactory: (p: Prods, c: Cats) => new GetProductUseCase(p, c),
        },
        {
          provide: CREATE_PRODUCT,
          inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY, ID_GENERATOR, CLOCK],
          useFactory: (p: Prods, c: Cats, ids: IdGenerator, clock: Clock) => new CreateProductUseCase(p, c, ids, clock),
        },
        {
          provide: UPDATE_PRODUCT,
          inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY],
          useFactory: (p: Prods, c: Cats) => new UpdateProductUseCase(p, c),
        },
        {
          provide: ADJUST_STOCK,
          inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY],
          useFactory: (p: Prods, c: Cats) => new AdjustStockUseCase(p, c),
        },
        {
          provide: LIST_PRODUCT_CHANGES,
          inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY],
          useFactory: (p: Prods, c: Cats) => new ListProductChangesUseCase(p, c),
        },

        // --- Casos de uso: reservas (servicio de Pedidos) ------------------------
        {
          provide: RESERVE_STOCK,
          inject: [PRODUCT_REPOSITORY, RESERVATION_REPOSITORY, CLOCK],
          useFactory: (p: Prods, r: Res, clock: Clock) => new ReserveStockUseCase(p, r, clock),
        },
        {
          provide: CONFIRM_RESERVATION,
          inject: [RESERVATION_REPOSITORY],
          useFactory: (r: Res) => new ConfirmReservationUseCase(r),
        },
        {
          provide: RELEASE_RESERVATION,
          inject: [RESERVATION_REPOSITORY, PRODUCT_REPOSITORY],
          useFactory: (r: Res, p: Prods) => new ReleaseReservationUseCase(r, p),
        },

        DemoCatalogSeeder,
      ],
    };
  }
}
