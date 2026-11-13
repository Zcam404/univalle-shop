/**
 * Módulo raíz del API Gateway: composición de dependencias.
 *
 * Conecta cada puerto con su adaptador (JWT, fetch, reloj del sistema) y
 * construye el caso de uso con la tabla de rutas.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { FORWARD_REQUEST } from './application/ports/in/forward-request.port.js';
import { SYSTEM_HEALTH } from './application/ports/in/system-health.port.js';
import { HEALTH_PROBE, HealthProbe } from './application/ports/out/health-probe.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { SERVICE_CLIENT, ServiceClient } from './application/ports/out/service-client.js';
import { TOKEN_VERIFIER, TokenVerifier } from './application/ports/out/token-verifier.js';
import { CircuitBreakerRegistry } from './application/services/circuit-breaker-registry.js';
import { ForwardRequestUseCase } from './application/use-cases/forward-request.use-case.js';
import { SystemHealthUseCase } from './application/use-cases/system-health.use-case.js';
import { RateLimiter } from './domain/rate-limiter.js';
import { RouteTable } from './domain/route-table.js';
import { FetchServiceClient } from './infrastructure/clients/fetch-service-client.js';
import { GATEWAY_CONFIG, GatewayConfig } from './infrastructure/config/gateway.config.js';
import { ROUTES, rateLimitRules } from './infrastructure/config/routes.js';
import { GatewayController } from './infrastructure/http/gateway.controller.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { JwtTokenVerifier } from './infrastructure/security/jwt-token-verifier.js';
import { SystemClock } from './infrastructure/system/system-clock.js';

@Module({})
export class AppModule {
  /**
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: GatewayConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, GatewayController],
      providers: [
        { provide: GATEWAY_CONFIG, useValue: config },

        // --- Adaptadores de salida ------------------------------------------
        { provide: TOKEN_VERIFIER, useValue: new JwtTokenVerifier(config.jwtSecret) },
        { provide: SERVICE_CLIENT, useValue: new FetchServiceClient(config.serviceUrls, config.upstreamTimeoutMs) },
        // El mismo cliente implementa los dos puertos (reenviar y consultar salud).
        { provide: HEALTH_PROBE, useExisting: SERVICE_CLIENT },
        { provide: CLOCK, useValue: new SystemClock() },

        // --- Dominio y servicios de aplicación -------------------------------
        { provide: RouteTable, useValue: new RouteTable(ROUTES) },
        { provide: CircuitBreakerRegistry, useValue: new CircuitBreakerRegistry(config.circuitBreaker) },
        { provide: RateLimiter, useValue: new RateLimiter(rateLimitRules(config.rateLimit)) },

        // --- Caso de uso ------------------------------------------------------
        {
          provide: FORWARD_REQUEST,
          inject: [RouteTable, TOKEN_VERIFIER, SERVICE_CLIENT, CircuitBreakerRegistry, CLOCK, RateLimiter],
          useFactory: (
            routes: RouteTable,
            tokens: TokenVerifier,
            client: ServiceClient,
            breakers: CircuitBreakerRegistry,
            clock: Clock,
            limiter: RateLimiter,
          ) => new ForwardRequestUseCase(routes, tokens, client, breakers, clock, limiter),
        },
        {
          provide: SYSTEM_HEALTH,
          inject: [HEALTH_PROBE, CircuitBreakerRegistry, CLOCK],
          useFactory: (probe: HealthProbe, breakers: CircuitBreakerRegistry, clock: Clock) =>
            new SystemHealthUseCase(Object.keys(config.serviceUrls).sort(), probe, breakers, clock),
        },
      ],
    };
  }
}
