# Guía de ejecución

## 1. Requisitos

- **Docker** 24 o superior, con **Docker Compose** v2 (`docker compose version`).
- Para desarrollar o ejecutar las pruebas sin Docker: **Node.js 22.12 o superior** (el proyecto se probó con Node 24).
- Unos 3 GB libres para las imágenes.

## 2. Levantar todo el sistema

```bash
cp .env.example .env          # solo la primera vez
docker compose up -d --build  # construye y levanta los 15 contenedores
docker compose ps             # todos deben quedar "Up"; los que tienen healthcheck, "healthy"
```

Orden de arranque:
1. Las bases MongoDB.
2. Cada servicio, cuando su base está sana.
3. El gateway y el frontend.

El gateway no espera a los servicios: si alguno tarda, solo sus rutas responden 503 hasta que esté listo.

Comprobar que todo responde:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","services":{"catalog":{"status":"up","circuit":"CLOSED"}, …}}
```

## 3. Variables de entorno (`.env`)

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `JWT_SECRET` | Secreto con el que Usuarios firma los tokens y el gateway los valida. **Cámbialo fuera de desarrollo.** | `cambia-este-secreto-en-produccion` |
| `JWT_EXPIRES_IN_SECONDS` | Duración de la sesión | `3600` (1 hora) |
| `ALLOWED_EMAIL_DOMAINS` | Dominios de correo con los que se puede registrar | `correounivalle.edu.co,univalle.edu.co` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Cuenta administradora que se crea al arrancar si no existe | `admin@univalleshop.local` / `Admin12345` |
| `SEED_DEMO_DATA` | Carga categorías y productos de ejemplo si el catálogo está vacío | `true` |
| `GATEWAY_PORT` | Puerto del gateway en tu máquina | `3000` |
| `FRONTEND_PORT` | Puerto del frontend en tu máquina | `8080` |
| `MAILHOG_UI_PORT` | Puerto de la bandeja de MailHog | `8025` |

Las variables propias de cada servicio (timeouts, intervalos de sincronización…) están en `docker-compose.yml` y en el README de cada servicio.

## 4. Recorrido de prueba

1. Abre <http://localhost:8080> y entra a **Ingresar → Regístrate** con un correo como `tu.nombre@correounivalle.edu.co`.
2. Abre <http://localhost:8025>, copia el código de 6 dígitos y verifícalo.
3. Busca un producto, agrégalo al carrito y paga con `4242 4242 4242 4242`, vencimiento `12/30` y CVV `123`.
4. Revisa **Mis pedidos**. Mientras no se haya enviado, puedes cancelar el pedido (se reembolsa).
5. Ingresa como `admin@univalleshop.local` / `Admin12345` → **Administrar** para gestionar productos, inventario y pedidos.

### Ver la resiliencia en acción

```bash
docker compose stop recommendation   # la página de inicio muestra novedades en vez de recomendaciones
docker compose stop catalog          # la búsqueda sigue funcionando con su índice propio
docker compose stop payments         # al pagar: 503 con mensaje claro, el stock vuelve y el carrito se conserva
curl http://localhost:3000/api/health  # el servicio detenido aparece "down"
docker compose start recommendation catalog payments
```

## 5. Comandos útiles

| Comando | Para qué |
|---|---|
| `docker compose logs -f orders` | Ver el log de un servicio (avisos de conciliación, sincronización, etc.) |
| `docker compose up -d --build catalog` | Reconstruir un solo servicio después de cambiar su código |
| `docker compose restart gateway` | Reiniciar un servicio |
| `docker compose down` | Detener todo y conservar los datos |
| `docker compose down -v` | Detener todo y **borrar todos los datos**. Al volver a levantar se recrean el admin y el catálogo de ejemplo |

## 6. Documentación de las API (Swagger)

Cada microservicio publica su documentación OpenAPI en `/docs`. Como los servicios no publican puertos, para verla:

- descomenta `ports` en el servicio dentro de `docker-compose.yml` (por ejemplo, `"3001:3001"` en `users`) y abre <http://localhost:3001/docs>; **o**
- ejecuta el servicio en modo desarrollo (sección 7) y abre `http://localhost:<puerto>/docs`.

Las rutas públicas cambian de nombre en el gateway: por ejemplo, `/products` del Catálogo es `/api/catalog/products`. La tabla completa está en [`gateway/README.md`](../gateway/README.md).

## 7. Desarrollo local

### Un microservicio

Cada servicio es un proyecto independiente:

```bash
cd services/catalog
npm install
npm test               # pruebas unitarias (no necesitan MongoDB)
npm run build          # compila TypeScript a dist/
npm run start:dev      # arranca con recarga automática (necesita sus variables de entorno)
```

Para `start:dev`, el servicio necesita una MongoDB y las variables de su README. Lo más simple es usar la MongoDB de Docker publicando temporalmente su puerto, o una MongoDB local en `mongodb://localhost:27017`.

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, con recarga en caliente
```

Vite reenvía `/api` al gateway en `localhost:3000`, así que el resto del sistema debe estar corriendo en Docker.

## 8. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `permission denied … /var/run/docker.sock` | Tu usuario no está en el grupo `docker`: `sudo usermod -aG docker $USER` y vuelve a iniciar sesión. |
| `docker-credential-desktop: executable file not found` | Tu `~/.docker/config.json` tiene `"credsStore": "desktop"` de Docker Desktop. Si usas el Docker del sistema, borra esa línea. |
| `failed to connect … desktop/docker.sock` | El contexto activo es Docker Desktop y no está abierto: ábrelo, o usa `docker context use default`. |
| Una ruta responde **503** | Ese servicio está caído o arrancando. Revisa `docker compose ps` y `docker compose logs <servicio>`. |
| Una ruta responde **429** | Superaste el límite de peticiones (10 intentos de ingreso por minuto). Espera los segundos que indica `Retry-After`. |
| No llega el código de verificación | En desarrollo no se envían correos reales: míralo en <http://localhost:8025>. |
| Las imágenes de los productos se ven grises | Las imágenes de ejemplo vienen de `picsum.photos` y necesitan internet. Si fallan, se muestra la inicial del producto. |
| Al arrancar, los logs de `search` o `recommendation` dicen "No se pudo sincronizar con Catálogo" | Es normal en el primer arranque: esos servicios inician antes que Catálogo. Reintentan solos y luego registran "sincronización reanudada". |
| Un producto nuevo no aparece en la búsqueda | Búsqueda y Recomendación sincronizan cada 10 y 15 segundos. Espera un momento, o como admin usa `POST /api/admin/search/reindex`. |
