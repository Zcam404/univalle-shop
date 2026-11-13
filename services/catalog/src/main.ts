/**
 * Punto de entrada del servicio de Catálogo.
 *
 * Carga la configuración, crea la aplicación NestJS y activa:
 * - validación automática de los cuerpos de petición (DTOs);
 * - traducción de errores de dominio a respuestas HTTP;
 * - documentación Swagger en /docs;
 * - cierre ordenado al recibir la señal de apagado de Docker.
 */
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { loadCatalogConfig } from './infrastructure/config/catalog.config.js';
import { DomainErrorFilter } from './infrastructure/http/domain-error.filter.js';

/** Arranca el servidor HTTP. */
async function bootstrap(): Promise<void> {
  const config = loadCatalogConfig();
  const app = await NestFactory.create(AppModule.forRoot(config));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que no están en el DTO
      forbidNonWhitelisted: true, // y responde 400 si llegan campos desconocidos
      transform: true, // convierte el cuerpo en una instancia del DTO
    }),
  );
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Univalle Shop · Servicio de Catálogo')
    .setDescription('Productos, categorías, inventario y reservas de stock.')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.port);
  new Logger('Bootstrap').log(`Servicio de Catálogo escuchando en el puerto ${config.port} (Swagger en /docs)`);
}

await bootstrap();
