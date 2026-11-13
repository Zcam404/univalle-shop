/**
 * Aplicación · Casos de uso de categorías.
 *
 * Son cuatro operaciones pequeñas; cada una es una clase con una sola
 * responsabilidad (SRP), agrupadas en este archivo por su tamaño.
 */
import { Category } from '../../domain/entities/category.js';
import { CategoryInUseError, CategoryNameTakenError, CategoryNotFoundError } from '../../domain/errors/catalog.errors.js';
import {
  CreateCategoryCommand,
  CreateCategoryPort,
  DeleteCategoryPort,
  ListCategoriesPort,
  UpdateCategoryCommand,
  UpdateCategoryPort,
} from '../ports/in/category.ports.js';
import { CategoryRepository } from '../ports/out/category.repository.js';
import { Clock } from '../ports/out/clock.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { ProductRepository } from '../ports/out/product.repository.js';
import { CategoryView, toCategoryView } from '../views/catalog.views.js';

/** Lista todas las categorías. */
export class ListCategoriesUseCase implements ListCategoriesPort {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<CategoryView[]> {
    return (await this.categories.findAll()).map(toCategoryView);
  }
}

/** Crea una categoría comprobando que el nombre no esté en uso. */
export class CreateCategoryUseCase implements CreateCategoryPort {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws InvalidCategoryError Si el nombre o la descripción no son válidos.
   * @throws CategoryNameTakenError Si ya existe una categoría con ese nombre.
   */
  async execute(command: CreateCategoryCommand): Promise<CategoryView> {
    const category = Category.create(this.ids.generate(), command.name, command.description, this.clock.now());
    if (await this.categories.findByNameKey(category.nameKey)) {
      throw new CategoryNameTakenError(category.name);
    }
    await this.categories.save(category);
    return toCategoryView(category);
  }
}

/** Cambia nombre y/o descripción de una categoría. */
export class UpdateCategoryUseCase implements UpdateCategoryPort {
  constructor(private readonly categories: CategoryRepository) {}

  /**
   * @throws CategoryNotFoundError Si no existe.
   * @throws CategoryNameTakenError Si el nuevo nombre ya lo usa otra categoría.
   */
  async execute(command: UpdateCategoryCommand): Promise<CategoryView> {
    const category = await this.categories.findById(command.id);
    if (!category) throw new CategoryNotFoundError();

    category.update({ name: command.name, description: command.description });
    const sameName = await this.categories.findByNameKey(category.nameKey);
    if (sameName && sameName.id !== category.id) {
      throw new CategoryNameTakenError(category.name);
    }
    await this.categories.save(category);
    return toCategoryView(category);
  }
}

/** Elimina una categoría, solo si no tiene productos (incluidos los desactivados). */
export class DeleteCategoryUseCase implements DeleteCategoryPort {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
  ) {}

  /**
   * @throws CategoryNotFoundError Si no existe.
   * @throws CategoryInUseError Si todavía tiene productos.
   */
  async execute(id: string): Promise<void> {
    if (!(await this.categories.findById(id))) throw new CategoryNotFoundError();
    const count = await this.products.countByCategory(id);
    if (count > 0) throw new CategoryInUseError(count);
    await this.categories.delete(id);
  }
}
