import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest para las pruebas unitarias del servicio.
 * Las pruebas viven en `test/` y no necesitan NestJS ni MongoDB: el dominio
 * y los casos de uso se prueban con adaptadores falsos en memoria.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.spec.ts'],
  },
});
