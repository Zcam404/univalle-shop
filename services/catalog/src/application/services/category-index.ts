/**
 * Aplicación · Ayudante `loadCategoryIndex`.
 *
 * Varios casos de uso necesitan el nombre de la categoría de cada producto.
 * Las categorías son pocas, así que se cargan todas de una vez en un mapa por id.
 */
import { Category } from '../../domain/entities/category.js';
import { CategoryRepository } from '../ports/out/category.repository.js';

export async function loadCategoryIndex(categories: CategoryRepository): Promise<Map<string, Category>> {
  return new Map((await categories.findAll()).map((c) => [c.id, c]));
}
