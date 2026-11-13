/**
 * Infraestructura · Adaptador de salida `FetchServiceClient`.
 *
 * Implementa el puerto `ServiceClient` con `fetch` de Node.js. Cada petición
 * tiene un tiempo máximo de espera: si el servicio no contesta a tiempo se
 * cancela y se lanza un error, que el caso de uso cuenta como fallo para el
 * circuit breaker.
 */
import { HealthProbe } from '../../application/ports/out/health-probe.js';
import { ServiceClient, UpstreamRequest, UpstreamResponse } from '../../application/ports/out/service-client.js';

/**
 * Cabeceras que describen la conexión entre dos equipos y no deben copiarse
 * de un salto al siguiente. `content-length` y `content-encoding` los
 * recalcula `fetch` (que además ya descomprimió la respuesta).
 */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'content-encoding',
]);

/** Copia las cabeceras omitiendo las de conexión. */
function endToEnd(headers: Iterable<[string, string]>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of headers) {
    if (!HOP_BY_HOP.has(name.toLowerCase())) result[name.toLowerCase()] = value;
  }
  return result;
}

export class FetchServiceClient implements ServiceClient, HealthProbe {
  /** Tiempo máximo para una consulta de salud: debe ser rápida. */
  private static readonly PROBE_TIMEOUT_MS = 2_000;

  /**
   * @param serviceUrls URL base de cada servicio por nombre.
   * @param timeoutMs Tiempo máximo de espera por respuesta.
   */
  constructor(
    private readonly serviceUrls: Record<string, string>,
    private readonly timeoutMs: number,
  ) {}

  /**
   * Envía la petición al servicio y devuelve su respuesta completa.
   *
   * @throws Error Si el servicio no está configurado, no responde o se agota el tiempo.
   */
  async send(service: string, request: UpstreamRequest): Promise<UpstreamResponse> {
    const baseUrl = this.serviceUrls[service];
    if (!baseUrl) throw new Error(`No hay URL configurada para el servicio "${service}".`);

    const hasBody = request.body && request.body.length > 0 && !['GET', 'HEAD'].includes(request.method);
    const response = await fetch(baseUrl + request.path + request.query, {
      method: request.method,
      headers: endToEnd(Object.entries(request.headers)),
      body: hasBody ? new Uint8Array(request.body!) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    return {
      status: response.status,
      headers: endToEnd(response.headers),
      body: new Uint8Array(await response.arrayBuffer()),
    };
  }

  /** Consulta `GET /health` del servicio; cualquier fallo cuenta como caído. */
  async probe(service: string): Promise<boolean> {
    const baseUrl = this.serviceUrls[service];
    if (!baseUrl) return false;
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(FetchServiceClient.PROBE_TIMEOUT_MS) });
      return response.ok;
    } catch {
      return false;
    }
  }
}
