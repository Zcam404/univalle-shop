/**
 * Dominio · Reglas de relevancia de la búsqueda.
 *
 * Cada término suma puntos según dónde aparece en el producto. Un producto
 * debe contener TODOS los términos (en nombre, categoría o descripción) para
 * aparecer en los resultados. Los resultados se ordenan por puntaje.
 *
 * Los mismos pesos los usa el adaptador de MongoDB para calcular el puntaje
 * dentro de la base de datos; `scoreProduct` es la versión en memoria (y la
 * referencia para las pruebas).
 */
import { normalizeText } from './text-normalizer.js';

/** Puntos por término según dónde coincide. */
export const RELEVANCE_WEIGHTS = {
  /** Alguna palabra del nombre empieza con el término ("cuad" → "Cuaderno"). */
  nameWordStart: 5,
  /** El término aparece en cualquier parte del nombre. */
  nameContains: 3,
  /** El término aparece en el nombre de la categoría. */
  categoryContains: 2,
  /** El término aparece en la descripción. */
  descriptionContains: 1,
} as const;

/** Textos de un producto ya normalizados. */
export interface SearchableText {
  nameKey: string;
  categoryKey: string;
  descriptionKey: string;
}

/** Calcula los textos normalizados de un producto. */
export function searchableText(name: string, categoryName: string, description: string): SearchableText {
  return {
    nameKey: normalizeText(name),
    categoryKey: normalizeText(categoryName),
    descriptionKey: normalizeText(description),
  };
}

/** Indica si el producto contiene todos los términos en algún campo. */
export function matchesAllTerms(text: SearchableText, terms: string[]): boolean {
  const all = `${text.nameKey} ${text.categoryKey} ${text.descriptionKey}`;
  return terms.every((t) => all.includes(t));
}

/** Suma los puntos de todos los términos. */
export function scoreProduct(text: SearchableText, terms: string[]): number {
  return terms.reduce((score, t) => {
    const wordStart = (' ' + text.nameKey).includes(' ' + t);
    return (
      score +
      (wordStart ? RELEVANCE_WEIGHTS.nameWordStart : 0) +
      (text.nameKey.includes(t) ? RELEVANCE_WEIGHTS.nameContains : 0) +
      (text.categoryKey.includes(t) ? RELEVANCE_WEIGHTS.categoryContains : 0) +
      (text.descriptionKey.includes(t) ? RELEVANCE_WEIGHTS.descriptionContains : 0)
    );
  }, 0);
}
