/**
 * Infraestructura · Cliente HTTP resiliente para llamar a otros microservicios.
 *
 * Envuelve `fetch` con dos protecciones:
 * - **Timeout:** si el servicio no contesta a tiempo, se cancela la petición.
 * - **Circuit breaker:** tras N fallos seguidos deja de llamar al servicio
 *   durante un tiempo y falla de inmediato; luego deja pasar una petición de
 *   prueba para ver si ya se recuperó.
 *
 * Cuenta como fallo: error de red, timeout o respuesta 5xx. Una respuesta 4xx
 * significa que el servicio está bien y rechazó la petición, así que se
 * devuelve al adaptador para que la interprete.
 */

/** El servicio no respondió, respondió 5xx o su circuito está abierto. */
export class UpstreamUnavailableError extends Error {
  constructor(service: string, reason: string) {
    super(`El servicio ${service} no está disponible: ${reason}`);
  }
}

/** Respuesta de otro servicio: código HTTP y cuerpo JSON (o `null` si no tenía). */
export interface UpstreamResponse<T = unknown> {
  status: number;
  body: T;
}

export interface ResilienceOptions {
  timeoutMs: number;
  failureThreshold: number;
  resetTimeoutMs: number;
}

export class ResilientHttpClient {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;

  /**
   * @param service Nombre del servicio, para los mensajes de error.
   * @param baseUrl URL interna del servicio.
   */
  constructor(
    private readonly service: string,
    private readonly baseUrl: string,
    private readonly options: ResilienceOptions,
  ) {}

  /**
   * Envía una petición JSON.
   *
   * @throws UpstreamUnavailableError Si el circuito está abierto, hay error de red,
   *   se agota el tiempo o el servicio responde 5xx.
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<UpstreamResponse<T>> {
    const isTrial = this.acquire();

    let response: Response;
    try {
      response = await fetch(this.baseUrl + path, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      this.onFailure(isTrial);
      throw new UpstreamUnavailableError(this.service, (error as Error).message);
    }

    if (response.status >= 500) {
      this.onFailure(isTrial);
      throw new UpstreamUnavailableError(this.service, `respondió ${response.status}`);
    }

    this.onSuccess();
    const text = await response.text();
    return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
  }

  /**
   * Decide si la petición puede salir. Devuelve `true` si es la petición de
   * prueba de un circuito semiabierto.
   * @throws UpstreamUnavailableError Si el circuito está abierto.
   */
  private acquire(): boolean {
    if (this.openedAt === null) return false;
    const halfOpen = Date.now() - this.openedAt >= this.options.resetTimeoutMs;
    if (!halfOpen || this.trialInFlight) {
      throw new UpstreamUnavailableError(this.service, 'circuito abierto');
    }
    this.trialInFlight = true;
    return true;
  }

  /** Respuesta correcta: cierra el circuito. */
  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.trialInFlight = false;
  }

  /** Fallo: abre el circuito si se llegó al límite o si falló la prueba. */
  private onFailure(wasTrial: boolean): void {
    this.consecutiveFailures++;
    this.trialInFlight = false;
    if (wasTrial || this.consecutiveFailures >= this.options.failureThreshold) {
      this.openedAt = Date.now();
    }
  }
}
