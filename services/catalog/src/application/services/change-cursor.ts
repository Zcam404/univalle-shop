/**
 * Aplicación · Codificación del cursor del feed de cambios.
 *
 * El cursor viaja al cliente como texto opaco (base64url de "fecha|id"), así
 * el cliente no depende de su formato interno.
 */
import { InvalidProductError } from '../../domain/errors/catalog.errors.js';
import { ChangeCursor } from '../ports/out/product.repository.js';

/** Convierte el cursor en texto. */
export function encodeCursor(cursor: ChangeCursor): string {
  return Buffer.from(`${cursor.updatedAt.toISOString()}|${cursor.id}`).toString('base64url');
}

/**
 * Lee un cursor recibido del cliente.
 * @throws InvalidProductError Si el texto no es un cursor válido.
 */
export function decodeCursor(text: string): ChangeCursor {
  const [iso, ...rest] = Buffer.from(text, 'base64url').toString('utf8').split('|');
  const updatedAt = new Date(iso);
  const id = rest.join('|');
  if (Number.isNaN(updatedAt.getTime()) || !id) {
    throw new InvalidProductError('El cursor del feed de cambios no es válido.');
  }
  return { updatedAt, id };
}
