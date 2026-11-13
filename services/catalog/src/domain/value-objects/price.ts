/**
 * Dominio · Value object `Price`.
 *
 * Precio en pesos colombianos (COP). Se guarda como entero porque el peso no
 * usa centavos en la práctica, y así se evitan errores de redondeo con decimales.
 */
import { InvalidProductError } from '../errors/catalog.errors.js';

export class Price {
  /** Tope de seguridad contra errores de digitación (100 millones de pesos). */
  static readonly MAX = 100_000_000;

  private constructor(readonly amount: number) {}

  /**
   * @param amount Valor en pesos, entero y mayor que cero.
   * @throws InvalidProductError Si no es un entero positivo o supera el tope.
   */
  static of(amount: number): Price {
    if (!Number.isInteger(amount) || amount <= 0 || amount > Price.MAX) {
      throw new InvalidProductError('El precio debe ser un número entero de pesos mayor que cero.');
    }
    return new Price(amount);
  }

  /** Precio multiplicado por una cantidad (subtotal de una línea). */
  times(quantity: number): number {
    return this.amount * quantity;
  }
}
