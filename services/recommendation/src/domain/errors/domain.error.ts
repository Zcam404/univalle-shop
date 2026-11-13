/**
 * Dominio · Error base.
 *
 * Todos los errores de negocio del servicio heredan de esta clase. El dominio
 * no sabe nada de HTTP: cada error declara solo su `kind` (categoría) y un
 * `code` estable. El adaptador HTTP traduce la categoría a un código de estado,
 * así que agregar un error nuevo no obliga a modificar el adaptador (OCP).
 */

/** Categorías de error de negocio, independientes del protocolo de transporte. */
export type DomainErrorKind =
  | 'validation' // los datos no cumplen una regla de negocio
  | 'unauthorized' // la identidad no se pudo comprobar (credenciales)
  | 'forbidden' // la identidad es válida pero la acción no está permitida
  | 'not_found' // el recurso pedido no existe
  | 'conflict' // la acción choca con el estado actual (duplicados, límites)
  | 'unavailable'; // un servicio externo necesario no respondió (se puede reintentar)

export abstract class DomainError extends Error {
  /** Categoría del error; el adaptador HTTP la usa para elegir el código de estado. */
  abstract readonly kind: DomainErrorKind;

  /** Código estable en mayúsculas (ej. `EMAIL_ALREADY_REGISTERED`) para que el cliente lo interprete. */
  abstract readonly code: string;

  /**
   * @param message Mensaje en español, pensado para mostrarse al usuario.
   */
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
