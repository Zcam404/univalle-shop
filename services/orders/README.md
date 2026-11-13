# Servicio de Pedidos

Maneja el carrito de cada usuario, coordina la compra entre Catálogo y Pagos, guarda el historial de pedidos y concilia los cobros que quedaron en duda.

## Reglas de negocio

- **Carrito:** uno por usuario, máximo 50 productos distintos y de 1 a 100 unidades de cada uno. Guarda una copia del nombre, precio e imagen.
- **Agregar al carrito** exige que el producto exista, esté disponible y tenga stock suficiente; para eso consulta Catálogo. **Cambiar cantidades o quitar** funciona aunque Catálogo esté caído.
- **Compra (saga):**
  1. reservar stock en Catálogo;
  2. guardar el pedido `PENDING_PAYMENT`;
  3. cobrar en Pagos;
  4. si se aprueba: `PAID`, se confirma la reserva y se vacía el carrito. Si se rechaza: `PAYMENT_FAILED`, se libera el stock y se conserva el carrito.
- **Pagos no responde:** el pedido queda `PAYMENT_FAILED` *por conciliar*, se libera el stock y se responde 503. Una tarea periódica consulta a Pagos y, si hubo cobro, lo reembolsa.
- **Estados:** `PAID` → `SHIPPED` → `DELIVERED` (los avanza el admin). El cliente puede cancelar solo un pedido `PAID`: primero se reembolsa y después se devuelve el stock.
- Un cliente solo ve sus propios pedidos.

## Endpoints

| Método y ruta (servicio) | Pública en el gateway | Acceso |
|---|---|---|
| `GET /cart`, `DELETE /cart` | `/api/cart` | Con sesión |
| `POST /cart/items`, `PATCH`/`DELETE /cart/items/:productId` | igual | Con sesión |
| `POST /orders` `{ shippingAddress, card }` | `/api/orders` | Con sesión |
| `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` | igual | Con sesión |
| `GET /admin/orders?status&page`, `PATCH /admin/orders/:id/status` | `/api/admin/orders` | Admin |
| `GET /internal/users/:userId/purchases` | — | Recomendación |
| `GET /internal/top-products?limit` | — | Recomendación |
| `GET /health`, `GET /docs` | — | Salud y Swagger |

## Datos (base `orders`)

| Colección | Contenido |
|---|---|
| `carts` | Un documento por usuario (`_id` = id del usuario) |
| `orders` | Pedidos con líneas, dirección, pago e historial embebidos. Índices por usuario, por estado y un índice parcial para los pedidos por conciliar |

## Dependencias con otros servicios

| Servicio | Para qué | Si no responde |
|---|---|---|
| Catálogo | Datos del producto, reservar, confirmar y liberar stock | No se puede agregar ni comprar (503). Cambiar cantidades sí funciona. Si cae después de cobrar, el pedido queda pagado y se registra un aviso |
| Pagos | Cobrar, reembolsar y consultar cobros | No se puede comprar ni cancelar (503). Los cobros en duda se concilian después |

Cada cliente REST tiene timeout y circuit breaker propios (`ResilientHttpClient`).

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3003` |
| `MONGO_URI` | Base propia | **obligatoria** |
| `CATALOG_SERVICE_URL`, `PAYMENTS_SERVICE_URL` | URLs internas | **obligatorias** |
| `REQUEST_TIMEOUT_MS` | Espera máxima por llamada | `4000` |
| `CIRCUIT_FAILURE_THRESHOLD`, `CIRCUIT_RESET_TIMEOUT_MS` | Circuit breaker | `5`, `30000` |
| `RECONCILE_INTERVAL_MS` | Cada cuánto se concilian los cobros en duda | `60000` (`20000` en Compose) |

## Comandos

```bash
npm install
npm test            # 26 pruebas
npm run start:dev
```
