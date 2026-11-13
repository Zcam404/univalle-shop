# Checklist de Arquitectura Hexagonal y SOLID

Checklist propio para contrastar con el del curso ("Repaso en Plastilina"). Se marca por servicio al cerrar cada fase.

Leyenda de columnas: **USR** Usuarios · **CAT** Catálogo · **ORD** Pedidos · **PAY** Pagos · **SRC** Búsqueda · **REC** Recomendación · **GW** Gateway

## 1. Capas

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| El código está separado en `domain`, `application` e `infrastructure` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las dependencias apuntan hacia dentro: infraestructura → aplicación → dominio | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 2. Dominio

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| No importa NestJS, Mongoose, Express ni otra librería de infraestructura | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las reglas de negocio viven en entidades y value objects, no en controladores ni repositorios | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las entidades protegen sus invariantes (no se puede crear un objeto inválido) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Los errores de negocio son clases de error propias del dominio | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 3. Puertos

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Los puertos de salida son interfaces definidas en `application/ports/out` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Los puertos de entrada (casos de uso) son interfaces en `application/ports/in` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Los puertos usan tipos del dominio, no esquemas de Mongoose ni DTOs HTTP | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 4. Adaptadores

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Los controladores HTTP solo traducen la petición y llaman a un caso de uso | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Los repositorios Mongoose implementan un puerto y convierten documento ↔ entidad | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| Los clientes REST hacia otros servicios implementan un puerto | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Se puede cambiar un adaptador (ej. Mongo → memoria) sin tocar dominio ni casos de uso | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 5. Principios SOLID

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| **SRP:** cada caso de uso hace una sola operación de negocio | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| **OCP:** se agregan comportamientos con nuevos adaptadores o estrategias, sin modificar los existentes | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| **LSP:** cualquier implementación de un puerto se puede usar en lugar de otra | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| **ISP:** los puertos son pequeños; nadie depende de métodos que no usa | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| **DIP:** los casos de uso reciben sus puertos por inyección de dependencias (tokens de NestJS) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 6. Pruebas

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| El dominio se prueba sin NestJS ni base de datos | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Los casos de uso se prueban con adaptadores en memoria o dobles de prueba | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
