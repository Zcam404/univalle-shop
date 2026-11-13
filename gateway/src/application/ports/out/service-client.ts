/**
 * Aplicación · Puerto de salida `ServiceClient`.
 *
 * Envía una petición a un microservicio por su nombre. El adaptador sabe en
 * qué URL vive cada servicio y aplica el tiempo máximo de espera.
 */

/** Token de inyección de dependencias para este puerto. */
export const SERVICE_CLIENT = Symbol('ServiceClient');

/** Petición dirigida a un microservicio. */
export interface UpstreamRequest {
  method: string;
  /** Ruta interna del servicio (ej. `/users/me`). */
  path: string;
  query: string;
  headers: Record<string, string>;
  body?: Uint8Array;
}

/** Respuesta del microservicio. */
export interface UpstreamResponse {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

export interface ServiceClient {
  /**
   * Envía la petición y devuelve la respuesta, sea cual sea su código HTTP.
   *
   * @throws Error Si el servicio no responde: conexión rechazada, nombre
   *   desconocido o tiempo de espera agotado. El caso de uso lo cuenta como
   *   fallo para el circuit breaker.
   */
  send(service: string, request: UpstreamRequest): Promise<UpstreamResponse>;
}
