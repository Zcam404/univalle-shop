/**
 * Dominio · Límite de peticiones (rate limiting).
 *
 * Evita que un mismo cliente sature la tienda o intente adivinar contraseñas
 * probando miles de combinaciones. Cada regla cuenta las peticiones de cada
 * cliente en ventanas fijas de tiempo (ej. 10 por minuto): al superar el
 * límite se rechaza hasta que empiece la siguiente ventana.
 *
 * El cliente se identifica por su id de usuario si inició sesión, o por su IP
 * si no. Los contadores viven en memoria: con varias instancias del gateway
 * habría que guardarlos en un almacén compartido (ej. Redis).
 */

/** Regla de límite. La primera que coincide con la petición es la que se aplica. */
export interface RateLimitRule {
  /** Nombre corto, para separar los contadores de cada regla. */
  name: string;
  /** Métodos HTTP a los que aplica; si se omite, a todos. */
  methods?: string[];
  /** Rutas públicas a las que aplica. */
  path: RegExp;
  /** Peticiones permitidas por ventana. */
  limit: number;
  /** Duración de la ventana en milisegundos. */
  windowMs: number;
}

/** Resultado de consumir una petición. */
export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Contador de una ventana. */
interface WindowCounter {
  windowStart: number;
  count: number;
  windowMs: number;
}

export class RateLimiter {
  private readonly counters = new Map<string, WindowCounter>();

  /**
   * @param rules Reglas en orden de prioridad (las más específicas primero).
   * @param maxTrackedClients Si se supera, se borran los contadores vencidos para no crecer sin límite en memoria.
   */
  constructor(
    private readonly rules: RateLimitRule[],
    private readonly maxTrackedClients = 50_000,
  ) {}

  /**
   * Registra una petición del cliente y decide si se permite.
   *
   * @param clientKey Identificador del cliente (`user:<id>` o `ip:<dirección>`).
   * @param now Instante actual en milisegundos.
   */
  consume(method: string, path: string, clientKey: string, now: number): RateLimitDecision {
    const rule = this.rules.find((r) => (!r.methods || r.methods.includes(method.toUpperCase())) && r.path.test(path));
    if (!rule) return { allowed: true };

    const key = `${rule.name}|${clientKey}`;
    let counter = this.counters.get(key);
    if (!counter || now - counter.windowStart >= rule.windowMs) {
      counter = { windowStart: now, count: 0, windowMs: rule.windowMs };
      this.counters.set(key, counter);
      this.evictExpired(now);
    }

    counter.count++;
    if (counter.count > rule.limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((counter.windowStart + rule.windowMs - now) / 1000) };
    }
    return { allowed: true };
  }

  /** Borra contadores de ventanas ya terminadas cuando hay demasiados. */
  private evictExpired(now: number): void {
    if (this.counters.size <= this.maxTrackedClients) return;
    for (const [key, c] of this.counters) {
      if (now - c.windowStart >= c.windowMs) this.counters.delete(key);
    }
  }
}
