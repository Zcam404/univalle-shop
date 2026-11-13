/**
 * Dominio · Motor de recomendación.
 *
 * Reglas puras (sin base de datos ni red) que deciden qué productos sugerir y
 * por qué. Cada producto candidato suma puntos por:
 *
 * | Señal                                        | Puntos                                |
 * |----------------------------------------------|---------------------------------------|
 * | Es de una categoría que el usuario compró    | 2 por unidad comprada, máximo 10      |
 * | Coincide con una búsqueda reciente           | 6 × qué tan reciente es (1 a 0,25)    |
 * | Es de los más vendidos                       | hasta 3, proporcional a las ventas    |
 *
 * Nunca se recomienda algo agotado, desactivado o que el usuario ya compró.
 * Cada sugerencia lleva el motivo principal, para mostrarlo en la tienda
 * ("Porque buscaste "termo"").
 */
import { CatalogProduct } from '../entities/catalog-product.js';
import { toSearchTerms } from './text-normalizer.js';

/** Puntos de cada señal. */
export const WEIGHTS = {
  categoryPerUnit: 2,
  categoryMax: 10,
  searchMatch: 6,
  popularityMax: 3,
} as const;

/** Unidades compradas por el usuario de un producto. */
export interface PurchaseSignal {
  productId: string;
  quantity: number;
}

/** Señales conocidas de un usuario. */
export interface UserSignals {
  purchases: PurchaseSignal[];
  /** Búsquedas recientes, la más reciente primero. */
  searches: string[];
}

/** Producto sugerido con su puntaje y el motivo. */
export interface Recommendation {
  product: CatalogProduct;
  score: number;
  reason: string;
}

/** Resultado: las sugerencias y si se basaron en el usuario o solo en popularidad. */
export interface RecommendationResult {
  strategy: 'personalized' | 'popular';
  items: Recommendation[];
}

export const REASONS = {
  popular: 'Popular en la tienda',
  newest: 'Nuevo en la tienda',
  sameCategory: (category: string) => `Más productos de ${category}`,
  boughtCategory: (category: string) => `Porque compraste productos de ${category}`,
  searched: (text: string) => `Porque buscaste "${text}"`,
};

/**
 * Recomendaciones personalizadas. Si las señales no alcanzan para llenar la
 * lista, se completa con los más vendidos y luego con los más nuevos.
 *
 * @param products Copia completa del catálogo (incluye inactivos, para conocer
 *   la categoría de productos que el usuario compró y ya no se venden).
 * @param popularity Unidades vendidas por id de producto.
 */
export function recommendForUser(
  products: CatalogProduct[],
  signals: UserSignals,
  popularity: Map<string, number>,
  limit: number,
): RecommendationResult {
  const byId = new Map(products.map((p) => [p.id, p]));
  const purchased = new Set(signals.purchases.map((p) => p.productId));

  // Afinidad por categoría: unidades compradas de cada categoría.
  const categoryUnits = new Map<string, number>();
  for (const purchase of signals.purchases) {
    const categoryId = byId.get(purchase.productId)?.categoryId;
    if (categoryId) categoryUnits.set(categoryId, (categoryUnits.get(categoryId) ?? 0) + purchase.quantity);
  }

  // Búsquedas con su peso por antigüedad: la más reciente vale 1 y baja hasta 0,25.
  const searches = signals.searches.map((text, i, all) => ({
    text,
    terms: toSearchTerms(text),
    recency: Math.max(0.25, 1 - i / Math.max(all.length, 1)),
  }));

  const maxSold = Math.max(0, ...popularity.values());
  const personalized: Recommendation[] = [];

  for (const product of products) {
    if (!product.recommendable || purchased.has(product.id)) continue;

    const categoryPoints = Math.min(
      WEIGHTS.categoryMax,
      (categoryUnits.get(product.categoryId ?? '') ?? 0) * WEIGHTS.categoryPerUnit,
    );
    const bestSearch = searches
      .filter((s) => s.terms.length > 0 && s.terms.every((t) => product.searchableText.includes(t)))
      .sort((a, b) => b.recency - a.recency)[0];
    const searchPoints = bestSearch ? WEIGHTS.searchMatch * bestSearch.recency : 0;

    if (categoryPoints === 0 && searchPoints === 0) continue;

    const popularityPoints = maxSold ? (WEIGHTS.popularityMax * (popularity.get(product.id) ?? 0)) / maxSold : 0;
    personalized.push({
      product,
      score: categoryPoints + searchPoints + popularityPoints,
      reason:
        searchPoints >= categoryPoints
          ? REASONS.searched(bestSearch!.text)
          : REASONS.boughtCategory(product.categoryName),
    });
  }

  personalized.sort((a, b) => b.score - a.score || compareByNewest(a.product, b.product));
  const items = personalized.slice(0, limit);

  const exclude = new Set([...purchased, ...items.map((i) => i.product.id)]);
  items.push(...fillWithPopular(products, popularity, limit - items.length, exclude));

  return { strategy: personalized.length > 0 ? 'personalized' : 'popular', items };
}

/** Los más vendidos; si no hay ventas suficientes, se completa con los más nuevos. */
export function recommendPopular(products: CatalogProduct[], popularity: Map<string, number>, limit: number): Recommendation[] {
  return fillWithPopular(products, popularity, limit, new Set());
}

/**
 * Productos relacionados con uno dado: primero de su misma categoría
 * (los más vendidos primero), y si no alcanzan, populares de otras.
 */
export function recommendRelated(
  target: CatalogProduct,
  products: CatalogProduct[],
  popularity: Map<string, number>,
  limit: number,
): Recommendation[] {
  const sameCategory = products
    .filter((p) => p.recommendable && p.id !== target.id && p.categoryId && p.categoryId === target.categoryId)
    .sort((a, b) => (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0) || compareByNewest(a, b))
    .slice(0, limit)
    .map((product) => ({ product, score: popularity.get(product.id) ?? 0, reason: REASONS.sameCategory(target.categoryName) }));

  const exclude = new Set([target.id, ...sameCategory.map((r) => r.product.id)]);
  return [...sameCategory, ...fillWithPopular(products, popularity, limit - sameCategory.length, exclude)];
}

/** Completa con productos vendidos (de más a menos) y luego con los más nuevos. */
function fillWithPopular(
  products: CatalogProduct[],
  popularity: Map<string, number>,
  count: number,
  exclude: Set<string>,
): Recommendation[] {
  if (count <= 0) return [];
  return products
    .filter((p) => p.recommendable && !exclude.has(p.id))
    .sort((a, b) => (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0) || compareByNewest(a, b))
    .slice(0, count)
    .map((product) => {
      const sold = popularity.get(product.id) ?? 0;
      return { product, score: sold, reason: sold > 0 ? REASONS.popular : REASONS.newest };
    });
}

/** Más nuevo primero; a igual fecha, por nombre para que el orden sea estable. */
function compareByNewest(a: CatalogProduct, b: CatalogProduct): number {
  return b.createdAt.getTime() - a.createdAt.getTime() || a.name.localeCompare(b.name);
}
