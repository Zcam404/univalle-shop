/**
 * Adaptadores falsos para probar el gateway sin red ni JWT reales.
 */
import { Clock } from '../../src/application/ports/out/clock.js';
import { ServiceClient, UpstreamRequest, UpstreamResponse } from '../../src/application/ports/out/service-client.js';
import { TokenVerifier } from '../../src/application/ports/out/token-verifier.js';
import { Identity } from '../../src/domain/identity.js';

/** Acepta solo los tokens registrados en el mapa. */
export class FakeTokenVerifier implements TokenVerifier {
  constructor(private readonly valid: Record<string, Identity>) {}

  async verify(token: string): Promise<Identity | null> {
    return this.valid[token] ?? null;
  }
}

/**
 * Cliente que recuerda las peticiones enviadas. Los servicios marcados como
 * caídos lanzan error, como haría una conexión rechazada.
 */
export class FakeServiceClient implements ServiceClient {
  readonly calls: { service: string; request: UpstreamRequest }[] = [];
  readonly down = new Set<string>();

  async send(service: string, request: UpstreamRequest): Promise<UpstreamResponse> {
    this.calls.push({ service, request });
    if (this.down.has(service)) throw new Error('ECONNREFUSED');
    return { status: 200, headers: { 'content-type': 'application/json' }, body: new TextEncoder().encode('{"ok":true}') };
  }
}

/** Reloj manual en milisegundos. */
export class ManualClock implements Clock {
  constructor(public ms = 0) {}

  nowMs(): number {
    return this.ms;
  }
}
