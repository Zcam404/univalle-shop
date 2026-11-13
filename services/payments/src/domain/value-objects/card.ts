/**
 * Dominio · Value object `Card`.
 *
 * Tarjeta de crédito o débito ya validada. Solo vive en memoria durante el
 * cobro: el servicio guarda únicamente la franquicia y los últimos 4 dígitos.
 *
 * Validaciones:
 * - número de 13 a 19 dígitos que cumpla el algoritmo de Luhn (el dígito de
 *   control que traen todas las tarjetas reales; detecta errores de digitación);
 * - nombre del titular;
 * - mes y año de vencimiento no pasados;
 * - CVV de 3 dígitos (4 para American Express).
 *
 * En lugar de lanzar excepciones, `Card.validate` devuelve el motivo del
 * rechazo, porque una tarjeta inválida termina como un pago rechazado.
 */

export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER';

/** Datos tal como los escribe el cliente. */
export interface CardInput {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

/** Resultado de validar: la tarjeta, o el motivo por el que no es válida. */
export type CardValidation = { ok: true; card: Card } | { ok: false; reason: string; last4: string | null };

export class Card {
  private constructor(
    readonly number: string,
    readonly holderName: string,
    readonly brand: CardBrand,
  ) {}

  /** Últimos 4 dígitos, lo único del número que se puede guardar y mostrar. */
  get last4(): string {
    return this.number.slice(-4);
  }

  /**
   * Valida los datos de la tarjeta.
   * @param now Fecha actual, para revisar el vencimiento.
   */
  static validate(input: CardInput, now: Date): CardValidation {
    const number = input.number.replace(/[\s-]/g, '');
    const last4 = /^\d{4,}$/.test(number) ? number.slice(-4) : null;
    const fail = (reason: string): CardValidation => ({ ok: false, reason, last4 });

    if (!/^\d{13,19}$/.test(number) || !Card.passesLuhn(number)) {
      return fail('El número de la tarjeta no es válido.');
    }
    const holderName = input.holderName.trim();
    if (holderName.length < 3) return fail('Escribe el nombre del titular como aparece en la tarjeta.');

    if (!Number.isInteger(input.expMonth) || input.expMonth < 1 || input.expMonth > 12) {
      return fail('El mes de vencimiento no es válido.');
    }
    // La tarjeta sirve hasta el último día de su mes de vencimiento.
    const firstDayAfterExpiry = new Date(Date.UTC(input.expYear, input.expMonth, 1));
    if (firstDayAfterExpiry.getTime() <= now.getTime()) return fail('La tarjeta está vencida.');

    const brand = Card.detectBrand(number);
    const cvvLength = brand === 'AMEX' ? 4 : 3;
    if (!new RegExp(`^\\d{${cvvLength}}$`).test(input.cvv)) {
      return fail(`El código de seguridad (CVV) debe tener ${cvvLength} dígitos.`);
    }

    return { ok: true, card: new Card(number, holderName, brand) };
  }

  /**
   * Algoritmo de Luhn: desde el último dígito hacia atrás, se duplica uno sí y
   * uno no (restando 9 si pasa de 9); la suma total debe ser múltiplo de 10.
   */
  static passesLuhn(number: string): boolean {
    let sum = 0;
    for (let i = 0; i < number.length; i++) {
      let digit = Number(number[number.length - 1 - i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  /** Reconoce la franquicia por los primeros dígitos. */
  static detectBrand(number: string): CardBrand {
    if (/^4/.test(number)) return 'VISA';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(number)) return 'MASTERCARD';
    if (/^3[47]/.test(number)) return 'AMEX';
    return 'OTHER';
  }
}
