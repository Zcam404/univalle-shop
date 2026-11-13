# Servicio de Usuarios

Registra a los integrantes de la Universidad del Valle, verifica su correo, inicia sesión (emite el JWT) y administra su perfil y sus direcciones de envío.

## Reglas de negocio

- Solo se registran correos de `ALLOWED_EMAIL_DOMAINS`. Cada cuenta indica la vinculación: estudiante, docente o administrativo.
- **Contraseña:** de 8 a 72 caracteres, con al menos una letra y un número. Se guarda con bcrypt.
- **Código de verificación:** 6 dígitos que vencen en 15 minutos, con 5 intentos. Pedir un código nuevo anula el anterior.
- No se puede iniciar sesión sin verificar el correo. Un correo inexistente y una contraseña incorrecta dan el mismo error.
- Si el correo de verificación no se puede enviar, la cuenta se crea igual y se puede pedir un reenvío.
- **Direcciones:** máximo 5. Siempre hay exactamente una predeterminada, y si se borra, pasa a serlo la primera restante.
- Al arrancar se crea la cuenta **admin** de `ADMIN_EMAIL` si no existe (nace verificada, sin restricción de dominio).

## Endpoints

| Método y ruta (servicio) | Pública en el gateway | Descripción |
|---|---|---|
| `POST /auth/register` | `/api/auth/register` | Registrar cuenta |
| `POST /auth/verify-email` | `/api/auth/verify-email` | Verificar con el código |
| `POST /auth/resend-code` | `/api/auth/resend-code` | Enviar un código nuevo |
| `POST /auth/login` | `/api/auth/login` | Iniciar sesión → `accessToken` |
| `GET` / `PATCH /users/me` | `/api/users/me` | Ver y editar perfil (nombre, teléfono) |
| `GET` / `POST /users/me/addresses` | `/api/users/me/addresses` | Listar y agregar direcciones |
| `PATCH` / `DELETE /users/me/addresses/:id` | igual | Editar (o predeterminar) y eliminar |
| `GET /health` | — | Salud (servicio y MongoDB) |

Documentación interactiva: `GET /docs` (Swagger).

## Datos (base `users`)

Colección `users`. Las direcciones y el código de verificación van embebidos. Tiene un índice único en `email`.

## Puertos y adaptadores

| Puerto | Adaptador |
|---|---|
| `UserRepository` | `MongoUserRepository` |
| `PasswordHasher` | `BcryptPasswordHasher` |
| `TokenIssuer` | `JwtTokenIssuer` (HS256) |
| `VerificationNotifier` | `SmtpVerificationNotifier` (MailHog en desarrollo) |
| `VerificationCodeGenerator` | `CryptoVerificationCodeGenerator` |
| `Clock` / `IdGenerator` | `SystemClock` / `UuidIdGenerator` |

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3001` |
| `MONGO_URI` | Base propia | **obligatoria** |
| `JWT_SECRET` | Secreto compartido con el gateway | **obligatoria** |
| `JWT_EXPIRES_IN_SECONDS` | Duración del token | `3600` |
| `ALLOWED_EMAIL_DOMAINS` | Dominios permitidos, separados por coma | **obligatoria** |
| `VERIFICATION_CODE_TTL_MINUTES` | Vigencia del código | `15` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Servidor de correo y remitente | host **obligatorio**, puerto `1025` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Cuenta admin inicial (opcional) | — |

## Comandos

```bash
npm install
npm test            # 52 pruebas
npm run start:dev
```
