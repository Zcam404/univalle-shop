/**
 * Dominio · Tabla de rutas del gateway.
 *
 * Decide, para cada petición, a qué microservicio va, con qué ruta interna y
 * qué nivel de acceso exige. Las rutas son datos (vienen de la configuración),
 * así que agregar un servicio nuevo no obliga a cambiar esta clase (OCP).
 *
 * Ejemplo: con la ruta `{ prefix: '/api/users', service: 'users', targetPrefix: '/users' }`,
 * la petición `GET /api/users/me` se envía al servicio `users` como `GET /users/me`.
 */
import { RouteNotFoundError } from './gateway.errors.js';
import { AccessLevel } from './identity.js';

/** Regla de acceso dentro de una ruta. La primera que coincide gana. */
export interface AccessRule {
  /** Métodos HTTP a los que aplica (ej. `['GET']`). Si se omite, aplica a todos. */
  methods?: string[];
  /** Expresión que debe cumplir la ruta interna (después del prefijo). Si se omite, aplica a todas. */
  path?: RegExp;
  access: AccessLevel;
}

/** Definición de una ruta pública del gateway. */
export interface RouteDefinition {
  /** Prefijo público (ej. `/api/catalog`). */
  prefix: string;
  /** Nombre del microservicio destino (ej. `catalog`). */
  service: string;
  /** Prefijo con el que el servicio expone esas rutas (ej. `/products`). */
  targetPrefix: string;
  /** Reglas específicas, revisadas en orden. */
  rules?: AccessRule[];
  /** Acceso cuando ninguna regla coincide. */
  defaultAccess: AccessLevel;
}

/** Resultado de resolver una petición contra la tabla. */
export interface ResolvedRoute {
  service: string;
  /** Ruta que se pide al microservicio. */
  targetPath: string;
  access: AccessLevel;
}

export class RouteTable {
  private readonly routes: RouteDefinition[];

  /**
   * @param routes Definiciones de rutas. Se ordenan de prefijo más largo a más
   *   corto para que `/api/users/admin` gane sobre `/api/users` si ambos existen.
   */
  constructor(routes: RouteDefinition[]) {
    this.routes = [...routes]
      .map((r) => ({
        ...r,
        prefix: RouteTable.trimSlash(r.prefix),
        // El destino '/' se guarda como '' para no generar '//productos' al concatenar.
        targetPrefix: r.targetPrefix.replace(/\/+$/, ''),
      }))
      .sort((a, b) => b.prefix.length - a.prefix.length);
  }

  /**
   * Busca la ruta que corresponde a la petición.
   *
   * @param method Método HTTP (GET, POST...).
   * @param path Ruta pública sin query string (ej. `/api/users/me`).
   * @throws RouteNotFoundError Si ninguna ruta coincide.
   */
  resolve(method: string, path: string): ResolvedRoute {
    const route = this.routes.find((r) => path === r.prefix || path.startsWith(r.prefix + '/'));
    if (!route) throw new RouteNotFoundError(path);

    const rest = path.slice(route.prefix.length); // '' o '/algo'
    return {
      service: route.service,
      targetPath: (route.targetPrefix + rest) || '/',
      access: RouteTable.accessFor(route, method.toUpperCase(), rest || '/'),
    };
  }

  /** Aplica las reglas de la ruta en orden; si ninguna coincide, usa el acceso por defecto. */
  private static accessFor(route: RouteDefinition, method: string, rest: string): AccessLevel {
    const rule = route.rules?.find(
      (r) => (!r.methods || r.methods.includes(method)) && (!r.path || r.path.test(rest)),
    );
    return rule?.access ?? route.defaultAccess;
  }

  /** Quita la barra final para comparar prefijos de forma uniforme. */
  private static trimSlash(value: string): string {
    return value.length > 1 ? value.replace(/\/+$/, '') : value;
  }
}
