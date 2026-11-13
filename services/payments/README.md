# Servicio de Pagos

Procesa los cobros de los pedidos con una pasarela **simulada** y hace reembolsos. Para cobrar de verdad bastaría con escribir otro adaptador del puerto `CardProcessor` (Wompi, PayU…), sin tocar el dominio.

## Reglas de negocio

- **Un pago por pedido:** cobrar dos veces el mismo pedido devuelve el pago existente, sin cobrar de nuevo.
- **La tarjeta se valida antes de cobrar:**
  - número de 13 a 19 dígitos que cumpla el algoritmo de Luhn;
  - titular;
  - vencimiento no pasado (sirve hasta el último día del mes);
  - CVV de 3 dígitos, o 4 si es American Express.
- Una tarjeta inválida o un rechazo del banco **no son errores HTTP**: quedan como pago `REJECTED` con el motivo en español.
- Solo se reembolsa un pago `APPROVED`. Repetir el reembolso no lo hace dos veces.
- Se guarda solo la **franquicia y los últimos 4 dígitos**; nunca el número completo ni el CVV.
- Tope por transacción: 20.000.000 de pesos.

## Tarjetas de prueba (`SimulatedCardProcessor`)

| Tarjeta | Resultado |
|---|---|
| Termina en `0002` (ej. `4000 0000 0000 0002`) | Rechazada: fondos insuficientes |
| Termina en `0069` (ej. `4000 0000 0000 0069`) | Rechazada: tarjeta reportada |
| Cualquier otra válida (ej. `4242 4242 4242 4242`) | Aprobada |

## Endpoints

| Método y ruta (servicio) | Pública en el gateway | Uso |
|---|---|---|
| `GET /payments/orders/:orderId` | `/api/payments/orders/:orderId` | El cliente ve el pago de su pedido (el admin, cualquiera) |
| `POST /internal/payments` `{ orderId, userId, amount, card }` | — | Pedidos: cobrar |
| `POST /internal/payments/:orderId/refund` | — | Pedidos: reembolsar |
| `GET /internal/payments/:orderId` | — | Pedidos: conciliar cobros en duda |
| `GET /health`, `GET /docs` | — | Salud y Swagger |

## Datos (base `payments`)

Colección `payments`, con índice único en `orderId` (garantiza un pago por pedido aunque lleguen dos cobros a la vez).

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3004` |
| `MONGO_URI` | Base propia | **obligatoria** |
| `SIMULATED_LATENCY_MS` | Demora del procesador simulado | `150` |

## Comandos

```bash
npm install
npm test            # 14 pruebas
npm run start:dev
```
