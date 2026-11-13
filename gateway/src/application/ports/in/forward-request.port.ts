/**
 * Aplicación · Puerto de entrada `ForwardRequestPort`.
 *
 * La única operación del gateway: recibir una petición del cliente y
 * devolver la respuesta del microservicio que corresponde. Los tipos son
 * independientes de Express para que el caso de uso no dependa del framework.
 */

/** Token de inyección de dependencias para este puerto. */
export const FORWARD_REQUEST = Symbol('ForwardRequest');

/** Petición tal como llega del cliente. */
export interface GatewayRequest {
  method: string;
  /** Ruta pública sin query string (ej. `/api/users/me`). */
  path: string;
  /** Query string con el `?` incluido, o cadena vacía. */
  query: string;
  /** Cabeceras con el nombre en minúsculas. */
  headers: Record<string, string>;
  /** Cuerpo sin interpretar (el gateway no lo lee, solo lo reenvía). */
  body?: Uint8Array;
  /** IP del cliente, para el límite de peticiones de usuarios sin sesión. */
  clientIp: string;
}

/** Respuesta que se devuelve al cliente. */
export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

export interface ForwardRequestPort {
  /**
   * @throws RouteNotFoundError | AuthenticationRequiredError | InsufficientRoleError | TooManyRequestsError | ServiceUnavailableError
   */
  execute(request: GatewayRequest): Promise<GatewayResponse>;
}
