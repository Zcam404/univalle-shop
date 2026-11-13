/**
 * Módulo raíz del servicio de Pagos: composición de dependencias.
 *
 * El procesador de tarjetas es el simulador; para usar una pasarela real se
 * cambiaría solo la línea de `CARD_PROCESSOR`.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { GET_PAYMENT, PROCESS_PAYMENT, REFUND_PAYMENT } from './application/ports/in/payment.ports.js';
import { CARD_PROCESSOR, CardProcessor } from './application/ports/out/card-processor.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { ID_GENERATOR, IdGenerator } from './application/ports/out/id-generator.js';
import { PAYMENT_REPOSITORY, PaymentRepository } from './application/ports/out/payment.repository.js';
import {
  GetPaymentUseCase,
  ProcessPaymentUseCase,
  RefundPaymentUseCase,
} from './application/use-cases/payment.use-cases.js';
import { PAYMENTS_CONFIG, PaymentsConfig } from './infrastructure/config/payments.config.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { InternalPaymentsController, PaymentsController } from './infrastructure/http/payments.controller.js';
import { MongoPaymentRepository } from './infrastructure/persistence/mongo-payment.repository.js';
import { PaymentRecord, PaymentSchema } from './infrastructure/persistence/payment.schema.js';
import { SimulatedCardProcessor } from './infrastructure/processor/simulated-card-processor.js';
import { SystemClock } from './infrastructure/system/system-clock.js';
import { UuidIdGenerator } from './infrastructure/system/uuid-id-generator.js';

@Module({})
export class AppModule {
  /**
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: PaymentsConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        MongooseModule.forRoot(config.mongoUri, { serverSelectionTimeoutMS: 5_000 }),
        MongooseModule.forFeature([{ name: PaymentRecord.name, schema: PaymentSchema }]),
        TerminusModule,
      ],
      controllers: [InternalPaymentsController, PaymentsController, HealthController],
      providers: [
        { provide: PAYMENTS_CONFIG, useValue: config },

        // --- Adaptadores de salida -------------------------------------------
        { provide: PAYMENT_REPOSITORY, useClass: MongoPaymentRepository },
        { provide: CARD_PROCESSOR, useValue: new SimulatedCardProcessor(config.simulatedLatencyMs) },
        { provide: CLOCK, useValue: new SystemClock() },
        { provide: ID_GENERATOR, useValue: new UuidIdGenerator() },

        // --- Casos de uso -----------------------------------------------------
        {
          provide: PROCESS_PAYMENT,
          inject: [PAYMENT_REPOSITORY, CARD_PROCESSOR, ID_GENERATOR, CLOCK],
          useFactory: (r: PaymentRepository, p: CardProcessor, ids: IdGenerator, clock: Clock) =>
            new ProcessPaymentUseCase(r, p, ids, clock),
        },
        {
          provide: REFUND_PAYMENT,
          inject: [PAYMENT_REPOSITORY, CARD_PROCESSOR, CLOCK],
          useFactory: (r: PaymentRepository, p: CardProcessor, clock: Clock) => new RefundPaymentUseCase(r, p, clock),
        },
        { provide: GET_PAYMENT, inject: [PAYMENT_REPOSITORY], useFactory: (r: PaymentRepository) => new GetPaymentUseCase(r) },
      ],
    };
  }
}
