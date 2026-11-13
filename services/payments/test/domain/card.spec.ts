/**
 * Pruebas de la validación de tarjetas y de la entidad Payment.
 */
import { Payment } from '../../src/domain/entities/payment.js';
import { PaymentNotRefundableError } from '../../src/domain/errors/payment.errors.js';
import { Card } from '../../src/domain/value-objects/card.js';
import { cards } from '../fakes/fakes.js';

const NOW = new Date('2026-06-15T10:00:00Z');

describe('Card', () => {
  it('acepta tarjetas válidas y reconoce la franquicia', () => {
    const visa = Card.validate(cards.approved, NOW);
    expect(visa.ok && visa.card.brand).toBe('VISA');
    expect(visa.ok && visa.card.last4).toBe('4242');

    const mc = Card.validate({ ...cards.approved, number: '5555555555554444' }, NOW);
    expect(mc.ok && mc.card.brand).toBe('MASTERCARD');

    const amex = Card.validate({ ...cards.approved, number: '378282246310005', cvv: '1234' }, NOW);
    expect(amex.ok && amex.card.brand).toBe('AMEX');
  });

  it('rechaza números que no cumplen Luhn (error de digitación)', () => {
    const r = Card.validate({ ...cards.approved, number: '4242424242424241' }, NOW);
    expect(r).toEqual({ ok: false, reason: 'El número de la tarjeta no es válido.', last4: '4241' });
  });

  it('la tarjeta sirve hasta el último día de su mes de vencimiento', () => {
    expect(Card.validate({ ...cards.approved, expMonth: 6, expYear: 2026 }, NOW).ok).toBe(true);
    const expired = Card.validate({ ...cards.approved, expMonth: 5, expYear: 2026 }, NOW);
    expect(!expired.ok && expired.reason).toBe('La tarjeta está vencida.');
  });

  it('valida el CVV según la franquicia', () => {
    expect(Card.validate({ ...cards.approved, cvv: '12' }, NOW).ok).toBe(false);
    expect(Card.validate({ ...cards.approved, number: '378282246310005', cvv: '123' }, NOW).ok).toBe(false);
  });
});

describe('Payment', () => {
  const base = { id: 'p1', orderId: 'o1', userId: 'u1', amount: 1000, cardBrand: 'VISA' as const, cardLast4: '4242', createdAt: NOW };

  it('solo un pago aprobado se puede reembolsar', () => {
    const ok = Payment.approved(base, 'ref');
    ok.refund(NOW);
    expect(ok.status).toBe('REFUNDED');
    expect(() => ok.refund(NOW)).toThrow(PaymentNotRefundableError);
    expect(() => Payment.rejected(base, 'x').refund(NOW)).toThrow(PaymentNotRefundableError);
  });
});
