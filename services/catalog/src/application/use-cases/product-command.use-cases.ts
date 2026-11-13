/**
 * Aplicación · Casos de uso de administración de productos e inventario.
 */
import { Product } from '../../domain/entities/product.js';
import {
  CategoryNotFoundError,
  InvalidProductError,
  NegativeStockError,
  ProductNotFoundError,
} from '../../domain/errors/catalog.errors.js';
import {
  AdjustStockCommand,
  AdjustStockPort,
  CreateProductCommand,
  CreateProductPort,
  UpdateProductCommand,
  UpdateProductPort,
} from '../ports/in/product.ports.js';
import { CategoryRepository } from '../ports/out/category.repository.js';
import { Clock } from '../ports/out/clock.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { ProductRepository } from '../ports/out/product.repository.js';
import { loadCategoryIndex } from '../services/category-index.js';
import { ProductView, toProductView } from '../views/catalog.views.js';

/** Crea un producto en una categoría existente. */
export class CreateProductUseCase implements CreateProductPort {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws InvalidProductError Si algún dato no es válido.
   * @throws CategoryNotFoundError Si la categoría no existe.
   */
  async execute(command: CreateProductCommand): Promise<ProductView> {
    const { stock, ...data } = command;
    const product = Product.create(this.ids.generate(), data, stock, this.clock.now());
    if (!(await this.categories.findById(product.categoryId))) throw new CategoryNotFoundError();

    await this.products.save(product);
    return toProductView(product, await loadCategoryIndex(this.categories));
  }
}

/** Edita los datos de un producto y/o lo activa o desactiva. */
export class UpdateProductUseCase implements UpdateProductPort {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  /**
   * @throws ProductNotFoundError Si no existe.
   * @throws InvalidProductError Si los datos no son válidos.
   * @throws CategoryNotFoundError Si se cambia a una categoría que no existe.
   */
  async execute(command: UpdateProductCommand): Promise<ProductView> {
    const { id, active, ...changes } = command;
    const product = await this.products.findById(id);
    if (!product) throw new ProductNotFoundError();

    product.update(changes);
    if (active !== undefined) product.setActive(active);

    if (changes.categoryId !== undefined && !(await this.categories.findById(product.categoryId))) {
      throw new CategoryNotFoundError();
    }

    await this.products.save(product);
    // Se relee para devolver el stock y la fecha de modificación actuales de la base de datos.
    const saved = (await this.products.findById(id)) ?? product;
    return toProductView(saved, await loadCategoryIndex(this.categories));
  }
}

/** Suma o resta unidades al inventario de un producto (entrada de mercancía, unidades dañadas...). */
export class AdjustStockUseCase implements AdjustStockPort {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  /**
   * @throws InvalidProductError Si `delta` no es un entero distinto de cero.
   * @throws ProductNotFoundError Si el producto no existe.
   * @throws NegativeStockError Si el ajuste dejaría el stock en negativo.
   */
  async execute(command: AdjustStockCommand): Promise<ProductView> {
    if (!Number.isInteger(command.delta) || command.delta === 0) {
      throw new InvalidProductError('El ajuste debe ser un número entero distinto de cero.');
    }

    const newStock = await this.products.adjustStock(command.productId, command.delta);
    const product = await this.products.findById(command.productId);
    if (!product) throw new ProductNotFoundError();
    if (newStock === null) throw new NegativeStockError(product.stock);

    return toProductView(product, await loadCategoryIndex(this.categories));
  }
}
