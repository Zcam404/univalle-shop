/**
 * Infraestructura · Identidad enviada por el API Gateway.
 *
 * El gateway valida el JWT y reenvía el rol del usuario en `x-user-role`. Este
 * servicio solo es accesible desde la red interna de Docker, así que confía en
 * esa cabecera. Aun así vuelve a comprobar el rol en las rutas de
 * administración (defensa en profundidad): si alguien configura mal una ruta
 * del gateway, el servicio no queda expuesto.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { Requester } from '../../application/ports/in/product.ports.js';

/** Cabecera con el rol del usuario autenticado. */
export const USER_ROLE_HEADER = 'x-user-role';

/** Indica si la petición viene de un administrador. */
function isAdmin(request: Request): boolean {
  return request.headers[USER_ROLE_HEADER] === 'ADMIN';
}

/** Guard para rutas de administración: responde 403 si quien llama no es admin. */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isAdmin(context.switchToHttp().getRequest<Request>())) {
      throw new ForbiddenException('Solo un administrador puede realizar esta acción.');
    }
    return true;
  }
}

/** Decorador de parámetro que entrega quién consulta (`{ isAdmin }`). */
export const CurrentRequester = createParamDecorator((_: unknown, context: ExecutionContext): Requester => {
  return { isAdmin: isAdmin(context.switchToHttp().getRequest<Request>()) };
});
