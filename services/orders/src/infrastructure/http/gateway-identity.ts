/**
 * Infraestructura · Identidad enviada por el API Gateway.
 *
 * El gateway valida el JWT y reenvía `x-user-id` y `x-user-role`. Todas las
 * rutas de Pedidos son de usuarios autenticados; las de `/admin` además
 * exigen rol ADMIN (el gateway también lo revisa: defensa en profundidad).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Requester } from '../../application/ports/in/order.ports.js';

/** Lee la identidad de las cabeceras, o `null` si no viene. */
function readRequester(request: Request): Requester | null {
  const userId = request.headers['x-user-id'];
  if (typeof userId !== 'string' || !userId.trim()) return null;
  return { userId: userId.trim(), isAdmin: request.headers['x-user-role'] === 'ADMIN' };
}

/** Exige un usuario autenticado (401 si no hay identidad). */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!readRequester(context.switchToHttp().getRequest<Request>())) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }
    return true;
  }
}

/** Exige rol ADMIN (401 sin identidad, 403 sin el rol). */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requester = readRequester(context.switchToHttp().getRequest<Request>());
    if (!requester) throw new UnauthorizedException('Debes iniciar sesión.');
    if (!requester.isAdmin) throw new ForbiddenException('Solo un administrador puede realizar esta acción.');
    return true;
  }
}

/** Decorador que entrega `{ userId, isAdmin }` (usar junto con un guard). */
export const CurrentRequester = createParamDecorator((_: unknown, context: ExecutionContext): Requester => {
  return readRequester(context.switchToHttp().getRequest<Request>())!;
});
