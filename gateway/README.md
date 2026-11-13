# API Gateway

Único punto de entrada al backend. Recibe todas las peticiones bajo `/api`, valida la sesión, aplica permisos y límites, y las reenvía al microservicio que corresponde.

## Qué hace con cada petición

1. **Enruta:** busca la ruta en la tabla (`src/infrastructure/config/routes.ts`) y traduce el prefijo público al interno.
2. **Autentica:** valida el JWT de `Authorization: Bearer …`: firma HS256 con `JWT_SECRET`, emisor `univalle-shop-users` y vencimiento.
3. **Limita:** cuenta las peticiones del cliente (por usuario, o por IP sin sesión). Al superar el límite responde **429** con `Retry-After`.
4. **Autoriza:** aplica el nivel de acceso de la ruta: público, con sesión o solo admin (401/403).
5. **Protege:** consulta el circuit breaker del servicio destino. Si está abierto, responde **503** al instante.
6. **Reenvía:** borra el token y cualquier `x-user-*` del cliente, agrega `x-user-id`, `x-user-email` y `x-user-role` con la identidad validada, y devuelve la respuesta tal cual.

## Rutas públicas

| Ruta pública | Servicio | Ruta interna | Acceso |
|---|---|---|---|
| `/api/auth/**` | users | `/auth/**` | Público |
| `/api/users/**` | users | `/users/**` | Con sesión |
| `/api/catalog/products/**` | catalog | `/products/**` | `GET` público; el resto, admin |
| `/api/catalog/categories/**` | catalog | `/categories/**` | `GET` público; el resto, admin |
| `/api/cart/**` | orders | `/cart/**` | Con sesión |
| `/api/orders/**` | orders | `/orders/**` | Con sesión |
| `/api/admin/orders/**` | orders | `/admin/orders/**` | Admin |
| `/api/payments/**` | payments | `/payments/**` | Con sesión |
| `/api/search/**` | search | `/search/**` | Público; `/recent`, con sesión |
| `/api/admin/search/**` | search | `/admin/**` | Admin |
| `/api/recommendations/**` | recommendation | `/recommendations/**` | Público; `/me`, con sesión |
| `/api/health` | — | — | Público: estado de todos los servicios |

Las rutas `/internal/**` de los servicios no tienen ruta pública.

## Límites de peticiones

| Regla | Rutas | Límite |
|---|---|---|
| `auth` | `POST /api/auth/login`, `register`, `verify-email`, `resend-code` | 10 por minuto |
| `general` | Todo `/api/**` | 300 por minuto |

Los contadores viven en memoria. Con varias instancias del gateway habría que moverlos a un almacén compartido, como Redis.

## Estructura

| Capa | Contenido |
|---|---|
| `domain/` | `RouteTable`, `AccessPolicy`, `CircuitBreaker`, `RateLimiter` y errores |
| `application/` | `ForwardRequestUseCase`, `SystemHealthUseCase`, registro de circuit breakers. Puertos: `TokenVerifier`, `ServiceClient`, `HealthProbe`, `Clock` |
| `infrastructure/` | Verificador JWT, cliente `fetch` con timeout, controlador comodín `api/*path`, filtro de errores y configuración |

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `JWT_SECRET` | Mismo secreto que Usuarios | **obligatoria** |
| `<SERVICIO>_SERVICE_URL` | URL de cada servicio (ej. `USERS_SERVICE_URL=http://users:3001`) | — |
| `UPSTREAM_TIMEOUT_MS` | Espera máxima por respuesta | `5000` |
| `CIRCUIT_FAILURE_THRESHOLD` | Fallos seguidos que abren el circuito | `5` |
| `CIRCUIT_RESET_TIMEOUT_MS` | Tiempo abierto antes de probar de nuevo | `30000` |
| `RATE_LIMIT_AUTH_PER_MINUTE` | Límite de la regla `auth` | `10` |
| `RATE_LIMIT_PER_MINUTE` | Límite de la regla `general` | `300` |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma | `http://localhost:8080,http://localhost:5173` |

## Comandos

```bash
npm install
npm test            # 25 pruebas
npm run start:dev
```
