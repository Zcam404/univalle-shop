# Servicio de Búsqueda

Mantiene su propio índice de productos, copiado del Catálogo, y permite buscar por texto con filtros. También guarda las búsquedas recientes de cada usuario.

## Cómo funciona

- **Sincronización:** cada `SYNC_INTERVAL_MS`, una tarea lee el feed de cambios de Catálogo desde el último cursor guardado y actualiza el índice. Si Catálogo cae, **la búsqueda sigue funcionando** con lo último sincronizado.
- **Texto tolerante:** se ignoran mayúsculas, tildes y signos ("cafe" encuentra "Café"), y se reconocen palabras incompletas ("cuad" encuentra "Cuaderno"). Deben aparecer todos los términos.
- **Relevancia** (reglas en `domain/services/relevance.ts`). Por cada término:

| Coincidencia | Puntos |
|---|---|
| Una palabra del nombre empieza con el término | +5 |
| El término está en el nombre | +3 |
| El término está en la categoría | +2 |
| El término está en la descripción | +1 |

  El puntaje se calcula dentro de MongoDB con una agregación que usa los mismos pesos.
- **Filtros:** categoría, rango de precio y solo disponibles. **Orden:** relevancia, precio o más nuevos.
- **Búsquedas recientes:** si quien busca tiene sesión, se guardan sus últimas 20, sin repetir y la más reciente primero. Si guardarla falla, los resultados se entregan igual.

## Endpoints

| Método y ruta (servicio) | Pública en el gateway | Acceso |
|---|---|---|
| `GET /search?q&categoryId&minPrice&maxPrice&available&sort&page&pageSize` | `/api/search` | Público |
| `GET /search/suggestions?q` | `/api/search/suggestions` | Público |
| `GET` / `DELETE /search/recent` | `/api/search/recent` | Con sesión |
| `GET /admin/status`, `POST /admin/reindex` | `/api/admin/search/...` | Admin |
| `GET /internal/users/:userId/recent-searches` | — | Recomendación |
| `GET /health`, `GET /docs` | — | Salud y Swagger |

## Datos (base `search`)

| Colección | Contenido |
|---|---|
| `products` | Índice: datos del producto y sus textos normalizados |
| `recent_searches` | Historial por usuario |
| `sync_state` | Cursor del feed de Catálogo y fecha de la última sincronización |

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3005` |
| `MONGO_URI` | Base propia | **obligatoria** |
| `CATALOG_SERVICE_URL` | URL interna de Catálogo | **obligatoria** |
| `SYNC_INTERVAL_MS` | Cada cuánto se sincroniza | `10000` |
| `REQUEST_TIMEOUT_MS` | Espera máxima al leer el feed | `5000` |

## Comandos

```bash
npm install
npm test            # 15 pruebas
npm run start:dev
```
