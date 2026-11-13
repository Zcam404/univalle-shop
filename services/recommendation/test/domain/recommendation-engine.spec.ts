/**
 * Pruebas del motor de recomendación.
 */
import {
  REASONS,
  recommendForUser,
  recommendPopular,
  recommendRelated,
} from '../../src/domain/services/recommendation-engine.js';
import { product } from '../fakes/fakes.js';

const catalog = [
  product('cuaderno', 'Cuaderno argollado', 'Papelería'),
  product('agenda', 'Agenda 2026', 'Papelería'),
  product('lapiceros', 'Kit de lapiceros', 'Papelería', { createdAt: new Date('2026-02-01') }),
  product('termo', 'Termo 750 ml', 'Accesorios', { description: 'acero inoxidable' }),
  product('mug', 'Mug Univalle', 'Accesorios', { available: false }),
  product('buzo', 'Buzo con capucha', 'Ropa'),
  product('viejo', 'Producto descontinuado', 'Papelería', { active: false }),
];
const none = new Map<string, number>();

describe('recommendForUser', () => {
  it('sugiere productos de las categorías compradas, sin repetir lo comprado', () => {
    const r = recommendForUser(catalog, { purchases: [{ productId: 'cuaderno', quantity: 2 }], searches: [] }, none, 2);
    expect(r.strategy).toBe('personalized');
    expect(r.items.map((i) => i.product.id)).toEqual(['lapiceros', 'agenda']);
    expect(r.items[0].reason).toBe(REASONS.boughtCategory('Papelería'));
  });

  it('las búsquedas recientes pesan más que las antiguas y dan su motivo', () => {
    const r = recommendForUser(catalog, { purchases: [], searches: ['termo', 'buzo'] }, none, 2);
    expect(r.items.map((i) => i.product.id)).toEqual(['termo', 'buzo']);
    expect(r.items[0].reason).toBe(REASONS.searched('termo'));
  });

  it('una búsqueda reconoce palabras de la descripción, sin tildes', () => {
    const r = recommendForUser(catalog, { purchases: [], searches: ['ACERO'] }, none, 1);
    expect(r.items[0].product.id).toBe('termo');
  });

  it('nunca sugiere productos agotados, desactivados ni comprados', () => {
    const r = recommendForUser(
      catalog,
      { purchases: [{ productId: 'viejo', quantity: 5 }], searches: ['mug'] },
      none,
      10,
    );
    const ids = r.items.map((i) => i.product.id);
    expect(ids).not.toContain('mug');
    expect(ids).not.toContain('viejo');
    // La compra de un producto ya desactivado igual cuenta para su categoría.
    expect(r.items[0].reason).toBe(REASONS.boughtCategory('Papelería'));
  });

  it('sin señales usa los más vendidos y completa con los más nuevos', () => {
    const r = recommendForUser(catalog, { purchases: [], searches: [] }, new Map([['buzo', 7]]), 3);
    expect(r.strategy).toBe('popular');
    expect(r.items.map((i) => [i.product.id, i.reason])).toEqual([
      ['buzo', REASONS.popular],
      ['lapiceros', REASONS.newest],
      ['agenda', REASONS.newest],
    ]);
  });
});

describe('recommendPopular y recommendRelated', () => {
  it('ordena por unidades vendidas', () => {
    const r = recommendPopular(catalog, new Map([['termo', 3], ['agenda', 9]]), 2);
    expect(r.map((i) => i.product.id)).toEqual(['agenda', 'termo']);
  });

  it('relacionados: primero la misma categoría, luego populares de otras', () => {
    const r = recommendRelated(catalog[3], catalog, new Map([['buzo', 4]]), 3); // termo
    expect(r.map((i) => i.product.id)).toEqual(['buzo', 'lapiceros', 'agenda']);
    const papel = recommendRelated(catalog[0], catalog, none, 2); // cuaderno
    expect(papel.map((i) => i.reason)).toEqual([REASONS.sameCategory('Papelería'), REASONS.sameCategory('Papelería')]);
  });
});
