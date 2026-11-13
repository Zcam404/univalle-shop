# Especificaciones SDD

En este proyecto la especificación guía el desarrollo (**Specification-Driven Development**). Antes de escribir el código de un servicio se crea `docs/specs/<servicio>.md` con la plantilla de abajo. La especificación se revisa y aprueba, y el código y las pruebas se escriben a partir de ella. Si durante la implementación algo cambia, primero se actualiza la especificación.

| Servicio | Especificación | Estado |
|---|---|---|
| Usuarios | `users.md` | Pendiente |
| Catálogo | `catalog.md` | Pendiente |
| Pedidos | `orders.md` | Pendiente |
| Pagos | `payments.md` | Pendiente |
| Búsqueda | `search.md` | Pendiente |
| Recomendación | `recommendation.md` | Pendiente |
| API Gateway | `gateway.md` | Pendiente |

## Plantilla

```markdown
# Especificación: <Servicio>

## 1. Responsabilidad
Una frase: qué hace el servicio y qué NO hace.

## 2. Glosario
Términos del dominio y su significado.

## 3. Modelo de dominio
Entidades y value objects, con sus atributos y reglas (invariantes).

## 4. Casos de uso
Para cada uno:
- **Actor:** quién lo ejecuta (cliente, admin, otro servicio).
- **Entrada / salida.**
- **Flujo principal.**
- **Reglas de negocio y errores.**
- **Criterios de aceptación** (se convierten en pruebas).

## 5. Puertos
- Entrada: casos de uso expuestos.
- Salida: repositorios, clientes de otros servicios, correo, etc.

## 6. Contrato de API REST
Tabla de endpoints (método, ruta, rol requerido, cuerpo, respuestas y códigos HTTP).

## 7. Modelo de datos (MongoDB)
Colecciones, campos, índices.

## 8. Dependencias con otros servicios
A quién llama, para qué, y qué pasa si no responde.

## 9. Configuración
Variables de entorno.
```
