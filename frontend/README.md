# Frontend

Aplicación web de Univalle Shop en **React 19 + TypeScript + React Router 7**, compilada con **Vite**. En Docker la sirve **Nginx** en el puerto 8080.

## Cómo se conecta al backend

Todas las llamadas van a la ruta relativa `/api`:
- en Docker, Nginx (`nginx.conf`) las reenvía al gateway;
- en desarrollo, lo hace el proxy de Vite (`vite.config.ts`).

Así el navegador habla con un solo origen.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/api/` | `http.ts` (cliente base: token, errores en español), `endpoints.ts` (una función por ruta de la API) y `types.ts` |
| `src/context/` | `AuthContext` (sesión; el token sobrevive a recargar) y `CartContext` (carrito compartido con el encabezado) |
| `src/hooks/useAsync.ts` | Carga de datos con estado de carga y error, descartando respuestas viejas |
| `src/components/` | Layout, búsqueda con sugerencias, tarjetas de producto, franja de recomendaciones, guards de rutas y componentes de interfaz |
| `src/pages/` | Una página por ruta; `pages/admin/` es el panel de administración |
| `src/lib/format.ts` | Precios en pesos, fechas en hora de Colombia y nombres de estados |

## Páginas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Inicio: recomendaciones, categorías y novedades | Público |
| `/productos`, `/productos/:id` | Catálogo y detalle con relacionados | Público |
| `/buscar` | Resultados con filtros | Público |
| `/ingresar`, `/registro`, `/verificar` | Cuenta | Público |
| `/carrito`, `/checkout`, `/pedidos`, `/pedidos/:id`, `/perfil` | Compras y cuenta | Con sesión |
| `/admin`, `/admin/categorias`, `/admin/pedidos` | Administración | Admin |

Los filtros del catálogo y de la búsqueda viven en la URL, así que se pueden compartir y el botón "atrás" funciona.

## Degradación visible

| Situación | Qué ve el usuario |
|---|---|
| Recomendación no responde | El inicio muestra novedades en su lugar |
| Error al pagar o sin stock | Mensaje del servicio en español; el carrito se conserva |
| Imagen que no carga | Recuadro con la inicial del producto |

## Comandos

```bash
npm install
npm run dev       # http://localhost:5173 (necesita el gateway en localhost:3000)
npm run build     # compila a dist/
```
