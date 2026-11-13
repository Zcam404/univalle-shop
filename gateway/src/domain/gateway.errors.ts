/**
 * Dominio · Errores del API Gateway.
 *
 * Igual que en los microservicios, el dominio no conoce HTTP: cada error
 * declara una categoría (`kind`) y un código estable, y el adaptador HTTP los
 * traduce a códigos de estado.
 */

/** Categorías de error, independientes del protocolo. */
export type GatewayErrorKind = 'not_found' | 'unauthorized' | 'forbidden' | 'unavailable' | 'rate_limited';

export abstract class GatewayError extends Error {
  /** Categoría del error; el adaptador HTTP la usa para elegir el código de estado. */
  abstract readonly kind: GatewayErrorKind;

  /** Código estable en mayúsculas para que el cliente lo interprete. */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Ninguna ruta del gateway corresponde a la URL pedida. */
export class RouteNotFoundError extends GatewayError {
  readonly kind = 'not_found';
  readonly code = 'ROUTE_NOT_FOUND';

  constructor(path: string) {
    super(`No existe la ruta ${path}.`);
  }
}

/** La ruta exige iniciar sesión y no llegó un token válido. */
export class AuthenticationRequiredError extends GatewayError {
  readonly kind = 'unauthorized';
  readonly code = 'AUTHENTICATION_REQUIRED';

  constructor(reason: 'missing' | 'invalid') {
    super(reason === 'missing' ? 'Debes iniciar sesión.' : 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.');
  }
}

/** El usuario inició sesión pero su rol no le permite usar esta ruta. */
export class InsufficientRoleError extends GatewayError {
  readonly kind = 'forbidden';
  readonly code = 'INSUFFICIENT_ROLE';

  constructor() {
    super('No tienes permisos para realizar esta acción.');
  }
}

/** El microservicio destino está caído, tarda demasiado o su circuito está abierto. */
export class ServiceUnavailableError extends GatewayError {
  readonly kind = 'unavailable';
  readonly code = 'SERVICE_UNAVAILABLE';

  /**
   * @param service Nombre del servicio que no respondió (ej. `users`).
   */
  constructor(readonly service: string) {
    super(`El servicio "${service}" no está disponible en este momento. Intenta de nuevo en unos segundos.`);
  }
}

/** El cliente superó el límite de peticiones; debe esperar antes de reintentar. */
export class TooManyRequestsError extends GatewayError {
  readonly kind = 'rate_limited';
  readonly code = 'TOO_MANY_REQUESTS';

  /**
   * @param retryAfterSeconds Segundos que faltan para que se pueda volver a intentar.
   */
  constructor(readonly retryAfterSeconds: number) {
    super(`Hiciste demasiadas solicitudes seguidas. Intenta de nuevo en ${retryAfterSeconds} segundo(s).`);
  }
}
