# Servicio de Catálogo

Administra productos, categorías e inventario. Aparta stock para los pedidos (reservas) y publica un feed de cambios para Búsqueda y Recomendación.

## Reglas de negocio

- **Producto:** nombre de 2 a 120 caracteres, precio entero en pesos mayor que 0, de 0 a 8 imágenes (URL http/https) y stock nunca negativo.
- Los productos **no se borran, se desactivan**: los inactivos no aparecen para los clientes ni se pueden comprar.
- **Categorías:** nombre único, sin importar mayúsculas ni tildes. Solo se borran si no tienen productos.
- **Inventario:** se modifica con operaciones atómicas de MongoDB, así dos compras simultáneas no se llevan la misma unidad.
- **Reservas** (una por pedido):
  - son todo o nada: si un producto no alcanza, se devuelve lo ya descontado;
  - congelan nombre y precio;
  - son idempotentes;
  - pasan por `RESERVED` → `CONFIRMED` → `RELEASED` (liberar devuelve el stock una sola vez).

## Endpoints

| Método y ruta (servicio) | Pública en el gateway | Acceso |
|---|---|---|
| `GET /categories` | `/api/catalog/categories` | Público |
| `POST /categories`, `PATCH`/`DELETE /categories/:id` | igual | Admin |
| `GET /products?categoryId&page&pageSize&sort&includeInactive` | `/api/catalog/products` | Público (inactivos solo admin) |
| `GET /products/:id` | igual | Público |
| `POST /products`, `PATCH /products/:id` | igual | Admin |
| `POST /products/:id/stock-adjustments` `{ delta }` | igual | Admin |
| `POST /internal/reservations` `{ orderId, items }` | — | Pedidos |
| `POST /internal/reservations/:orderId/confirm` | — | Pedidos |
| `POST /internal/reservations/:orderId/release` | — | Pedidos |
| `GET /internal/products/changes?cursor&limit` | — | Búsqueda y Recomendación |
| `GET /health`, `GET /docs` | — | Salud y Swagger |

## Datos (base `catalog`)

| Colección | Contenido |
|---|---|
| `categories` | Categorías, con índice único en el nombre normalizado |
| `products` | Productos. `updatedAt` cambia en cada escritura, incluidos los cambios de stock, y alimenta el feed |
| `reservations` | Reservas; el `_id` es el id del pedido |

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3002` |
| `MONGO_URI` | Base propia | **obligatoria** |
| `SEED_DEMO_DATA` | Cargar el catálogo de ejemplo si está vacío | `false` (`true` en Compose) |

## Comandos

```bash
npm install
npm test            # 33 pruebas
npm run start:dev
```
