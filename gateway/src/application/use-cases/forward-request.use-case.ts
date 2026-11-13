/**
 * Aplicación · Caso de uso: reenviar una petición al microservicio que corresponde.
 */
import { AccessPolicy } from '../../domain/access-policy.js';
import { AuthenticationRequiredError, ServiceUnavailableError, TooManyRequestsError } from '../../domain/gateway.errors.js';
import { AccessLevel, Identity } from '../../domain/identity.js';
import { RateLimiter } from '../../domain/rate-limiter.js';
import { RouteTable } from '../../domain/route-table.js';
import { ForwardRequestPort, GatewayRequest, GatewayResponse } from '../ports/in/forward-request.port.js';
import { Clock } from '../ports/out/clock.js';
import { ServiceClient, UpstreamResponse } from '../ports/out/service-client.js';
import { TokenVerifier } from '../ports/out/token-verifier.js';
import { CircuitBreakerRegistry } from '../services/circuit-breaker-registry.js';

/**
 * Cabeceras de identidad que el gateway agrega. Si el cliente las envía, se
 * descartan: de lo contrario cualquiera podría hacerse pasar por otro usuario
 * escribiendo `x-user-id` a mano.
 */
export const IDENTITY_HEADERS = {
  userId: 'x-user-id',
  email: 'x-user-email',
  role: 'x-user-role',
} as const;

/**
 * Pasos:
 * 1. Busca la ruta en la tabla (servicio destino, ruta interna, nivel de acceso).
 * 2. Si llega un token, lo valida y obtiene la identidad.
 * 3. Aplica el límite de peticiones del cliente (por usuario o por IP).
 * 4. Aplica la política de acceso (público, autenticado o admin).
 * 5. Consulta el circuit breaker del servicio: si está abierto, responde 503 sin llamarlo.
 * 6. Reenvía la petición con la identidad en cabeceras y sin el token.
 * 7. Registra éxito o fallo en el breaker y devuelve la respuesta tal cual.
 *
 * Solo cuentan como fallo los errores de red y los timeouts. Una respuesta 4xx
 * o 5xx significa que el servicio está vivo y respondió, así que se devuelve
 * al cliente sin abrir el circuito.
 */
export class ForwardRequestUseCase implements ForwardRequestPort {
  constructor(
    private readonly routes: RouteTable,
    private readonly tokens: TokenVerifier,
    private readonly client: ServiceClient,
    private readonly breakers: CircuitBreakerRegistry,
    private readonly clock: Clock,
    private readonly rateLimiter: RateLimiter,
  ) {}

  /**
   * @throws RouteNotFoundError Si la URL no corresponde a ningún servicio.
   * @throws AuthenticationRequiredError Si la ruta exige sesión y no hay token válido.
   * @throws InsufficientRoleError Si la ruta es solo para administradores.
   * @throws TooManyRequestsError Si el cliente superó su límite de peticiones.
   * @throws ServiceUnavailableError Si el servicio no responde o su circuito está abierto.
   */
  async execute(request: GatewayRequest): Promise<GatewayResponse> {
    const route = this.routes.resolve(request.method, request.path);
    const identity = await this.authenticate(request.headers.authorization, route.access);

    const clientKey = identity ? `user:${identity.userId}` : `ip:${request.clientIp}`;
    const decision = this.rateLimiter.consume(request.method, request.path, clientKey, this.clock.nowMs());
    if (!decision.allowed) throw new TooManyRequestsError(decision.retryAfterSeconds);

    AccessPolicy.ensureAllowed(route.access, identity);

    const breaker = this.breakers.for(route.service);
    if (!breaker.tryAcquire(this.clock.nowMs())) {
      throw new ServiceUnavailableError(route.service);
    }

    let response: UpstreamResponse;
    try {
      response = await this.client.send(route.service, {
        method: request.method,
        path: route.targetPath,
        query: request.query,
        headers: this.upstreamHeaders(request.headers, identity),
        body: request.body,
      });
    } catch {
      breaker.recordFailure(this.clock.nowMs());
      throw new ServiceUnavailableError(route.service);
    }

    breaker.recordSuccess();
    return response;
  }

  /**
   * Obtiene la identidad a partir de la cabecera `Authorization: Bearer <token>`.
   *
   * - Sin token: `null` (la política decide si la ruta lo permite).
   * - Token inválido en una ruta protegida: 401 explicando que la sesión no es válida.
   * - Token inválido en una ruta pública: se ignora y se continúa como anónimo.
   */
  private async authenticate(authorization: string | undefined, access: AccessLevel): Promise<Identity | null> {
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) return null;

    const identity = await this.tokens.verify(match[1]);
    if (!identity && access !== 'public') {
      throw new AuthenticationRequiredError('invalid');
    }
    return identity;
  }

  /**
   * Prepara las cabeceras para el microservicio: quita el token y cualquier
   * cabecera de identidad enviada por el cliente, y agrega la identidad validada.
   */
  private upstreamHeaders(headers: Record<string, string>, identity: Identity | null): Record<string, string> {
    const blocked = new Set<string>(['authorization', ...Object.values(IDENTITY_HEADERS)]);
    const result = Object.fromEntries(Object.entries(headers).filter(([name]) => !blocked.has(name)));
    if (identity) {
      result[IDENTITY_HEADERS.userId] = identity.userId;
      result[IDENTITY_HEADERS.email] = identity.email;
      result[IDENTITY_HEADERS.role] = identity.role;
    }
    return result;
  }
}
