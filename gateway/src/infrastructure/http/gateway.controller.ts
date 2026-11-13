/**
 * Infraestructura · Adaptador de entrada HTTP del gateway.
 *
 * Un solo controlador recibe todo lo que empieza por `/api/`, lo convierte en
 * una `GatewayRequest` (sin tipos de Express), llama al caso de uso y copia la
 * respuesta del microservicio al cliente.
 */
import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { FORWARD_REQUEST } from '../../application/ports/in/forward-request.port.js';
import type { ForwardRequestPort, GatewayRequest } from '../../application/ports/in/forward-request.port.js';

@Controller()
export class GatewayController {
  constructor(@Inject(FORWARD_REQUEST) private readonly forward: ForwardRequestPort) {}

  /** Atiende cualquier método en cualquier ruta bajo `/api/`. */
  @All('api/*path')
  async proxy(@Req() req: Request, @Res() res: Response): Promise<void> {
    const response = await this.forward.execute(GatewayController.toGatewayRequest(req));
    res.status(response.status).set(response.headers).end(Buffer.from(response.body));
  }

  /** Traduce la petición de Express al formato del caso de uso. */
  private static toGatewayRequest(req: Request): GatewayRequest {
    const url = new URL(req.originalUrl, 'http://gateway');
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers[name] = Array.isArray(value) ? value.join(', ') : value;
    }
    // El cuerpo llega sin interpretar gracias a `express.raw` (ver main.ts).
    const body = Buffer.isBuffer(req.body) && req.body.length > 0 ? new Uint8Array(req.body) : undefined;
    // `req.ip` respeta la configuración `trust proxy` de main.ts (IP real detrás de Nginx).
    return { method: req.method, path: url.pathname, query: url.search, headers, body, clientIp: req.ip ?? 'desconocida' };
  }
}
