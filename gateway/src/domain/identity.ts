/**
 * Dominio · Identidad del usuario autenticado y niveles de acceso.
 */

/** Roles definidos por el servicio de Usuarios. */
export type Role = 'CUSTOMER' | 'ADMIN';

/** Quién hace la petición, según el JWT ya validado. */
export interface Identity {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Nivel de acceso que exige una ruta:
 * - `public`: cualquiera, sin token.
 * - `authenticated`: cualquier usuario con sesión iniciada.
 * - `admin`: solo usuarios con rol `ADMIN`.
 */
export type AccessLevel = 'public' | 'authenticated' | 'admin';
