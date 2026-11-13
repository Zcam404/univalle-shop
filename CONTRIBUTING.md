# Guía de contribución

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versión entregada. Solo recibe merges desde `develop` en cada entrega semanal. |
| `develop` | Integración. Aquí se juntan las funcionalidades terminadas. |
| `feature/<servicio>-<descripcion>` | Trabajo en curso. Ej.: `feature/users-registro`, `feature/catalog-inventario`. |
| `fix/<servicio>-<descripcion>` | Corrección de errores. |
| `docs/<descripcion>` | Solo documentación. |

Flujo: crear la rama desde `develop` → commits pequeños → Pull Request hacia `develop` → revisión → merge.

## Mensajes de commit (Conventional Commits)

```
<tipo>(<alcance>): <descripción en minúsculas>
```

- **tipo:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`.
- **alcance:** el servicio o componente: `users`, `catalog`, `orders`, `payments`, `search`, `recommendation`, `gateway`, `frontend`, `infra`.

Ejemplos:

```
feat(users): agregar caso de uso de registro con correo institucional
test(catalog): cubrir validación de stock negativo
docs(specs): especificación SDD del servicio de pedidos
```

Si el commit corresponde a una historia de Jira, se agrega su clave al final: `feat(users): login con JWT (US-12)`.

## Reglas de código

- El dominio (`src/domain`) no importa nada de NestJS, Mongoose ni otras librerías de infraestructura.
- Los servicios solo se comunican por REST; nunca se accede a la base de datos de otro servicio.
- Cada archivo, clase y función pública lleva un comentario TSDoc en español que explica qué hace, qué recibe, qué devuelve y qué errores lanza.
- Toda funcionalidad nueva incluye pruebas unitarias del dominio y de los casos de uso.
