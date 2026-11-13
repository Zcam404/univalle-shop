/**
 * Aplicación · Puertos de entrada de categorías.
 */
import { CategoryView } from '../../views/catalog.views.js';

export const LIST_CATEGORIES = Symbol('ListCategories');
/** Lista todas las categorías ordenadas por nombre. */
export interface ListCategoriesPort {
  execute(): Promise<CategoryView[]>;
}

export const CREATE_CATEGORY = Symbol('CreateCategory');
export interface CreateCategoryCommand {
  name: string;
  description?: string | null;
}
/** Crea una categoría con nombre único (solo admin). */
export interface CreateCategoryPort {
  execute(command: CreateCategoryCommand): Promise<CategoryView>;
}

export const UPDATE_CATEGORY = Symbol('UpdateCategory');
export interface UpdateCategoryCommand {
  id: string;
  name?: string;
  description?: string | null;
}
/** Cambia nombre y/o descripción de una categoría (solo admin). */
export interface UpdateCategoryPort {
  execute(command: UpdateCategoryCommand): Promise<CategoryView>;
}

export const DELETE_CATEGORY = Symbol('DeleteCategory');
/** Elimina una categoría sin productos (solo admin). */
export interface DeleteCategoryPort {
  execute(id: string): Promise<void>;
}
