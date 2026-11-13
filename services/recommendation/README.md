# Servicio de Recomendación

Sugiere productos a cada usuario según sus compras y búsquedas. También ofrece los más populares y los relacionados con un producto.

## Cómo decide (`domain/services/recommendation-engine.ts`)

Cada producto candidato suma puntos:

| Señal | Fuente | Puntos | Motivo que se muestra |
|---|---|---|---|
| Es de una categoría que el usuario compró | Pedidos | 2 por unidad comprada, máximo 10 | "Porque compraste productos de …" |
| Coincide con una búsqueda reciente | Búsqueda | 6 × qué tan reciente es (de 1 a 0,25) | "Porque buscaste "…"" |
| Es de los más vendidos | Pedidos | Hasta 3, proporcional a las ventas | "Popular en la tienda" |

- Nunca recomienda productos agotados, desactivados ni ya comprados.
- Si las señales no alcanzan, completa con los más vendidos y luego con los más nuevos ("Nuevo en la tienda").
- **Relacionados:** primero de la misma categoría (los más vendidos primero), luego populares de otras.

## Resiliencia

- **Copia local del catálogo,** sincronizada con el feed de cambios de Catálogo, igual que Búsqueda.
- **Caché de señales:** las compras, búsquedas y más vendidos se consultan con un timeout corto (1,5 s) y se guarda la última versión. Si Pedidos o Búsqueda no responden, se recomienda con lo guardado y la respuesta lo indica con `degraded: true`.

## Endpoints

| Método y ruta (servicio) | Pública en el gateway | Acceso |
|---|---|---|
| `GET /recommendations/me?limit` | `/api/recommendations/me` | Con sesión |
| `GET /recommendations/popular?limit` | `/api/recommendations/popular` | Público |
| `GET /recommendations/products/:productId/related?limit` | igual | Público |
| `GET /health`, `GET /docs` | — | Salud y Swagger |

Respuesta: `{ strategy: 'personalized' | 'popular' | 'related', degraded, items: [{ id, name, price, imageUrl, category, reason }] }`.

## Datos (base `recommendation`)

| Colección | Contenido |
|---|---|
| `products` | Copia local del catálogo |
| `user_signals` | Última versión conocida de las compras y búsquedas de cada usuario |
| `top_products` | Últimos más vendidos conocidos |
| `sync_state` | Cursor del feed de Catálogo |

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3006` |
| `MONGO_URI` | Base propia | **obligatoria** |
| `CATALOG_SERVICE_URL`, `ORDERS_SERVICE_URL`, `SEARCH_SERVICE_URL` | URLs internas | **obligatorias** |
| `SYNC_INTERVAL_MS` | Cada cuánto se sincroniza el catálogo | `15000` |
| `SIGNALS_TIMEOUT_MS` | Espera máxima por las señales | `1500` |

## Comandos

```bash
npm install
npm test            # 12 pruebas
npm run start:dev
```
