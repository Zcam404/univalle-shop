# Checklist de Microservicios

Checklist propio para contrastar con el del curso ("Repaso en Plastilina"). Se marca por servicio al cerrar cada fase.

Leyenda de columnas: **USR** Usuarios · **CAT** Catálogo · **ORD** Pedidos · **PAY** Pagos · **SRC** Búsqueda · **REC** Recomendación · **GW** Gateway

## 1. Responsabilidad y límites

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Tiene una sola responsabilidad de negocio, descrita en una frase en su README | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Es dueño exclusivo de sus datos (ningún otro servicio escribe en ellos) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| Se puede desplegar sin desplegar los demás | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 2. Datos

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Usa su propia base MongoDB en un contenedor propio | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| No accede a la base de otro servicio | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Los datos ajenos que guarda son copias o referencias por ID, no relaciones | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | — |

## 3. Comunicación

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Expone una API REST con recursos, verbos y códigos HTTP correctos | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| La API está documentada con Swagger/OpenAPI | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Valida los datos de entrada (DTOs) y responde errores con un formato uniforme | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Se comunica con otros servicios solo por REST | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las URLs de otros servicios vienen de variables de entorno | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 4. Resiliencia

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Las llamadas a otros servicios tienen timeout | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las llamadas a otros servicios tienen circuit breaker o reintentos | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Tiene una respuesta alternativa cuando una dependencia falla | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Expone `GET /health` y Compose lo usa como healthcheck | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Prueba manual: al detener otro servicio, este sigue respondiendo | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 5. Seguridad

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Solo es accesible a través del gateway (no publica puertos) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| Las rutas protegidas exigen JWT válido y rol adecuado | — | — | — | — | — | — | ☐ |
| Los secretos se leen de variables de entorno, nunca del código | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Las contraseñas se guardan cifradas (hash) | ☐ | — | — | — | — | — | — |

## 6. Contenedores y despliegue

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Tiene su propio `Dockerfile` multi-etapa (compilar → imagen final liviana) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Está declarado en `docker-compose.yml` con su base y su healthcheck | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Arranca con `docker compose up` sin pasos manuales | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 7. Calidad y proceso

| Criterio | USR | CAT | ORD | PAY | SRC | REC | GW |
|---|---|---|---|---|---|---|---|
| Tiene especificación SDD aprobada en `docs/specs/` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Tiene pruebas unitarias del dominio y de los casos de uso | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Tiene README propio (responsabilidad, endpoints, variables, cómo ejecutarlo) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| El código lleva comentarios TSDoc que explican cada clase y función | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Se desarrolló en ramas `feature/` con commits convencionales | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
