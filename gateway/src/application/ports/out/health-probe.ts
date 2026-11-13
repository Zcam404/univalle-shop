/**
 * Aplicación · Puerto de salida `HealthProbe`.
 *
 * Pregunta a un microservicio si está sano (su `GET /health`). Es un puerto
 * aparte de `ServiceClient` (ISP): consultar la salud no necesita reenviar
 * cabeceras ni cuerpos.
 */

/** Token de inyección de dependencias para este puerto. */
export const HEALTH_PROBE = Symbol('HealthProbe');

export interface HealthProbe {
  /** `true` si el servicio respondió 200 a tiempo; `false` en cualquier otro caso (nunca lanza). */
  probe(service: string): Promise<boolean>;
}
