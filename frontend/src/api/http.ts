/**
 * Cliente HTTP base del frontend.
 *
 * Todas las llamadas van al API Gateway por la ruta relativa `/api`. Esta
 * función agrega el token de sesión, convierte el cuerpo a JSON y transforma
 * cualquier error en un `ApiError` con un mensaje en español listo para
 * mostrarse al usuario.
 */

/** Error de una llamada a la API, con el formato uniforme de los servicios. */
export class ApiError extends Error {
  /** Código HTTP (0 si no hubo respuesta: sin conexión). */
  readonly status: number;
  /** Código estable del servicio (ej. `OUT_OF_STOCK`), o `NETWORK`. */
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  /** El servicio está caído o no hay conexión: conviene mostrar un respaldo. */
  get isUnavailable(): boolean {
    return this.status === 0 || this.status === 503;
  }
}

/** Dónde se guarda el token entre recargas de página. */
const TOKEN_KEY = 'univalle-shop.token';

/** Lee el token guardado (o `null` si no hay sesión o el navegador bloquea el almacenamiento). */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Guarda o borra el token de sesión. */
export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin almacenamiento la sesión dura hasta recargar la página */
  }
}

/** Función que se llama cuando el gateway responde 401 (sesión vencida). La registra AuthContext. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/**
 * Hace una petición a la API.
 *
 * @param method Método HTTP.
 * @param path Ruta después de `/api` (ej. `/catalog/products`).
 * @param body Cuerpo a enviar como JSON.
 * @returns El cuerpo de la respuesta ya convertido (o `undefined` si viene vacío).
 * @throws ApiError Si la respuesta no es 2xx o no hay conexión.
 */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No hay conexión con la tienda. Revisa tu internet e intenta de nuevo.');
  }

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const { error, message } = (data ?? {}) as { error?: string; message?: string | string[] };
    if (response.status === 401 && token) onUnauthorized?.();
    throw new ApiError(
      response.status,
      error ?? `HTTP_${response.status}`,
      (Array.isArray(message) ? message.join(' ') : message) ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
    );
  }
  return data as T;
}

/** Convierte texto a JSON sin lanzar errores (devuelve `undefined` si no es JSON). */
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Construye una query string ignorando valores vacíos. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
