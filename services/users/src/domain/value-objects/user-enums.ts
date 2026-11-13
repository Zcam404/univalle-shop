/**
 * Dominio · Enumeraciones del usuario.
 */

/** Tipo de vínculo de la persona con la Universidad del Valle. */
export enum Affiliation {
  STUDENT = 'STUDENT', // estudiante
  PROFESSOR = 'PROFESSOR', // docente
  STAFF = 'STAFF', // administrativo
}

/**
 * Rol dentro de la tienda. Define los permisos, no el vínculo con la universidad:
 * `CUSTOMER` compra; `ADMIN` además administra productos, inventario y pedidos.
 */
export enum Role {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}
