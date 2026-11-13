/**
 * Infraestructura · Identidad del usuario enviada por el API Gateway.
 *
 * Este servicio no valida JWT: lo hace el gateway, que después reenvía la
 * petición con las cabeceras `x-user-id` y `x-user-role`. El gateway borra esas
 * cabeceras si vienen del cliente, y este servicio no publica su puerto fuera
 * de la red de Docker, así que solo el gateway puede llegar a él.
 *
 * - `GatewayAuthGuard` rechaza (401) las peticiones sin identidad.
 * - `@CurrentUserId()` entrega el id del usuario al método del controlador.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';

/** Nombre de la cabecera con el id del usuario autenticado. */
export const USER_ID_HEADER = 'x-user-id';

/** Lee el id del usuario de la cabecera, o `undefined` si no viene. */
function readUserId(request: Request): string | undefined {
  const value = request.headers[USER_ID_HEADER];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Guard que exige que la petición venga autenticada por el gateway. */
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!readUserId(context.switchToHttp().getRequest<Request>())) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }
    return true;
  }
}

/** Decorador de parámetro que entrega el id del usuario autenticado. */
export const CurrentUserId = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  return readUserId(context.switchToHttp().getRequest<Request>())!;
});
