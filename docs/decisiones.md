# Decisiones del proyecto

Registro de las decisiones tomadas antes de empezar a implementar. Si alguna cambia, se actualiza aquí y se indica la fecha.

| # | Tema | Decisión | Motivo |
|---|---|---|---|
| 1 | Vinculación con Univalle | El registro solo acepta correos de dominios institucionales (configurables en `ALLOWED_EMAIL_DOMAINS`) y exige verificar el correo con un código de 6 dígitos. En desarrollo los correos se ven en **MailHog** (`http://localhost:8025`). | No hay acceso a una API oficial de la universidad; el correo institucional prueba la vinculación. |
| 2 | Pagos | **Simulados**. El dominio de Pagos depende del puerto `PaymentGateway`; el adaptador `FakePaymentGateway` aprueba o rechaza según reglas de prueba. | Permite cambiar a una pasarela real (Wompi, PayU) creando solo un adaptador nuevo. |
| 3 | Recomendación | Basada en reglas: categorías de compras anteriores del usuario + productos más vendidos + búsquedas recientes. Sin machine learning. | Suficiente para el alcance del curso y fácil de explicar. |
| 4 | Repositorio | **Monorepo** con un `package.json`, `Dockerfile` y base de datos por servicio. Sin código de dominio compartido. | Una sola URL de entrega, un solo `docker-compose.yml` y las especificaciones junto al código. |
| 5 | Ramas y commits | `main` (entregas) + `develop` (integración) + `feature/<servicio>-<descripcion>`. Mensajes con Conventional Commits. | Ver [`CONTRIBUTING.md`](../CONTRIBUTING.md). |
| 6 | Quién publica productos | Solo usuarios con rol **admin**. Docentes, estudiantes y administrativos compran. | Mantiene simples Catálogo y Pedidos (no es un marketplace). |
| 7 | Imágenes de productos | Se guardan como **URLs**; no hay subida de archivos. | Evita un servicio de almacenamiento en el MVP. |
| 8 | Lenguaje y estilo | TypeScript. Identificadores en inglés; comentarios y documentación en español. Cada archivo, clase y función pública lleva comentarios TSDoc que explican su propósito. | Requisito del equipo: el código debe entenderse y poder defenderse ante el profesor. |
| 9 | Orden de implementación | Base → Usuarios → Gateway mínimo → Catálogo → Pedidos → Pagos → Búsqueda → Recomendación → Gateway completo → Frontend → Documentación final. | El gateway mínimo permite probar cada servicio con autenticación real desde el principio. |

## Decisiones tomadas durante el desarrollo

| # | Tema | Decisión | Motivo |
|---|---|---|---|
| 10 | Versión de NestJS | NestJS 12 tal como lo genera su CLI: módulos ES (ESM), TypeScript 6 y **Vitest** en lugar de Jest. En el código, los imports relativos terminan en `.js`. | Es la configuración oficial de esa versión; Jest y `ts-jest` no soportan bien ESM ni TypeScript 6. |
| 11 | Casos de uso sin decoradores | Los casos de uso son clases simples; `app.module.ts` los construye con `useFactory` y los registra bajo el token de su puerto de entrada. | La capa de aplicación no depende de NestJS y se prueba sin él. |
| 12 | Datos de Catálogo en otros servicios | Búsqueda y Recomendación guardan su propia copia de los productos y la actualizan leyendo un **feed de cambios** de Catálogo (con cursor), en vez de que Catálogo les avise. | Catálogo no necesita conocer a sus consumidores, y ellos siguen funcionando si Catálogo cae. |
| 13 | Inventario | El stock solo se cambia con operaciones atómicas de MongoDB (`$inc` con condición). Las reservas son por pedido, todo o nada, idempotentes y con precio congelado. | Evita vender la misma unidad dos veces. Probado con 25 compras simultáneas. |
| 14 | Compra | Saga coordinada por Pedidos con compensación: reservar → cobrar → confirmar, o liberar si el pago no se aprueba. | Sin transacciones entre bases distintas, la compensación mantiene el sistema consistente. |
| 15 | Cobros en duda | Si Pagos no responde durante un cobro, el pedido queda "por conciliar" y una tarea periódica consulta a Pagos y reembolsa si hubo cobro. | Nunca queda un cobro de un pedido fallido. |
| 16 | Resiliencia entre servicios | Timeout y circuit breaker propios (sin librerías externas) en el gateway y en cada cliente REST. Recomendación guarda caché de las señales de otros servicios. | Un servicio caído o lento no arrastra a los demás. Es lógica pequeña y fácil de explicar y probar. |
| 17 | Identidad dentro del sistema | Solo el gateway valida el JWT. Los servicios reciben `x-user-id` y `x-user-role`, no publican puertos y revisan de nuevo el rol en sus rutas de administración. | Seguridad centralizada con defensa en profundidad. |
| 18 | Límite de peticiones | En el gateway: 10 por minuto en ingreso y registro, 300 por minuto en el resto, por usuario o por IP. Contadores en memoria. | Frena a quien intente adivinar contraseñas y el abuso. Con varias instancias del gateway se movería a Redis. |
| 19 | Frontend | React + Vite servido por Nginx, que también reenvía `/api` al gateway (un solo origen). Estilos con CSS propio, sin librería de componentes. | Menos dependencias y sin configuración de CORS en producción. |
| 20 | Correo | MailHog en desarrollo: los correos se ven en <http://localhost:8025> y no se entregan. | Permite probar el registro con cualquier correo institucional. Para correo real se agregaría autenticación SMTP al adaptador. |
