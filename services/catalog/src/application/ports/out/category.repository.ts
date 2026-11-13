/**
 * Aplicación · Puerto de salida `CategoryRepository`.
 *
 * Contrato para guardar y consultar categorías. El adaptador de MongoDB lo
 * implementa; las pruebas usan uno en memoria.
 */
import { Category } from '../../../domain/entities/category.js';

/** Token de inyección de dependencias para este puerto. */
export const CATEGORY_REPOSITORY = Symbol('CategoryRepository');

export interface CategoryRepository {
  /** Todas las categorías ordenadas por nombre. */
  findAll(): Promise<Category[]>;

  findById(id: string): Promise<Category | null>;

  /** Busca por la clave normalizada del nombre (ver `Category.keyOf`). */
  findByNameKey(nameKey: string): Promise<Category | null>;

  /**
   * Crea o reemplaza la categoría.
   * @throws CategoryNameTakenError Si otra categoría ya usa ese nombre.
   */
  save(category: Category): Promise<void>;

  delete(id: string): Promise<void>;
}
