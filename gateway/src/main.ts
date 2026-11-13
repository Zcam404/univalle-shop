/**
 * Punto de entrada del API Gateway.
 *
 * - Desactiva el parser JSON de NestJS: el gateway no interpreta los cuerpos,
 *   los reenvía tal cual (`express.raw`), así sirve igual para JSON o archivos.
 * - Habilita CORS para que el frontend pueda llamarlo desde el navegador.
 * - Traduce los errores del gateway a respuestas HTTP uniformes.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module.js';
import { loadGatewayConfig } from './infrastructure/config/gateway.config.js';
import { GatewayErrorFilter } from './infrastructure/http/gateway-error.filter.js';

/** Arranca el servidor HTTP. */
async function bootstrap(): Promise<void> {
  const config = loadGatewayConfig();
  const app = await NestFactory.create(AppModule.forRoot(config), { bodyParser: false });

  app.use(express.raw({ type: () => true, limit: '2mb' }));
  // Detrás de Nginx (frontend), la IP real del cliente llega en X-Forwarded-For.
  // Solo se confía en esa cabecera si la conexión viene de una red privada (Docker).
  app.getHttpAdapter().getInstance().set('trust proxy', 'uniquelocal');
  app.enableCors({ origin: config.corsOrigins });
  app.useGlobalFilters(new GatewayErrorFilter());
  app.enableShutdownHooks();

  await app.listen(config.port);
  const logger = new Logger('Bootstrap');
  logger.log(`API Gateway escuchando en el puerto ${config.port}`);
  logger.log(`Servicios configurados: ${JSON.stringify(config.serviceUrls)}`);
}

await bootstrap();
