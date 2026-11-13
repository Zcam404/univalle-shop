/**
 * Pruebas del dominio de Búsqueda: normalización, relevancia, consulta e historial.
 */
import { RecentSearches } from '../../src/domain/entities/recent-searches.js';
import { InvalidSearchQueryError } from '../../src/domain/errors/search.errors.js';
import { RELEVANCE_WEIGHTS, matchesAllTerms, scoreProduct, searchableText } from '../../src/domain/services/relevance.js';
import { normalizeText, toSearchTerms } from '../../src/domain/services/text-normalizer.js';
import { SearchQuery } from '../../src/domain/value-objects/search-query.js';

describe('Normalización', () => {
  it('quita tildes, mayúsculas y signos', () => {
    expect(normalizeText('  ¡Café & Mañana!  ')).toBe('cafe manana');
  });

  it('extrae términos únicos de 2+ letras, máximo 6', () => {
    expect(toSearchTerms('Buzo buzo a GRIS')).toEqual(['buzo', 'gris']);
    expect(toSearchTerms('uno dos tres cuatro cinco seis siete')).toHaveLength(6);
  });
});

describe('Relevancia', () => {
  const cuaderno = searchableText('Cuaderno argollado Univalle', 'Papelería', 'Cuaderno de 100 hojas');
  const agenda = searchableText('Agenda 2026', 'Papelería', 'Incluye calendario y espacio para cuaderno de notas');

  it('exige que estén todos los términos en algún campo', () => {
    expect(matchesAllTerms(cuaderno, ['cuad', 'univalle'])).toBe(true);
    expect(matchesAllTerms(cuaderno, ['cuad', 'termo'])).toBe(false);
  });

  it('una coincidencia en el nombre pesa más que en la descripción', () => {
    expect(scoreProduct(cuaderno, ['cuad'])).toBeGreaterThan(scoreProduct(agenda, ['cuad']));
    expect(scoreProduct(cuaderno, ['cuad'])).toBe(
      RELEVANCE_WEIGHTS.nameWordStart + RELEVANCE_WEIGHTS.nameContains + RELEVANCE_WEIGHTS.descriptionContains,
    );
  });
});

describe('SearchQuery', () => {
  it('sin texto ordena por más nuevos y ajusta la paginación', () => {
    const q = SearchQuery.create({ text: '  ', page: 0, pageSize: 500 });
    expect(q).toMatchObject({ sort: 'newest', page: 1, pageSize: 50, hasText: false });
  });

  it('valida el rango de precios', () => {
    expect(() => SearchQuery.create({ minPrice: 5000, maxPrice: 1000 })).toThrow(InvalidSearchQueryError);
    expect(() => SearchQuery.create({ minPrice: -1 })).toThrow(InvalidSearchQueryError);
  });
});

describe('RecentSearches', () => {
  it('guarda lo más reciente primero, sin repetir y como máximo 20', () => {
    const r = RecentSearches.empty('u1');
    const at = new Date();
    r.record('buzo', at);
    r.record('termo', at);
    r.record('  BUZO ', at);
    expect(r.list.map((e) => e.text)).toEqual(['BUZO', 'termo']);
    for (let i = 0; i < 30; i++) r.record(`busqueda ${i}`, at);
    expect(r.list).toHaveLength(RecentSearches.MAX_ENTRIES);
    r.record('   ', at);
    expect(r.list[0].text).toBe('busqueda 29');
  });
});
