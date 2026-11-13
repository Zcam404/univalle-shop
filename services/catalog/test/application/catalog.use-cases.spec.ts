/**
 * Pruebas de los casos de uso de categorías, productos e inventario.
 */
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../../src/application/use-cases/category.use-cases.js';
import {
  AdjustStockUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
} from '../../src/application/use-cases/product-command.use-cases.js';
import {
  GetProductUseCase,
  ListProductChangesUseCase,
  ListProductsUseCase,
} from '../../src/application/use-cases/product-query.use-cases.js';
import {
  CategoryInUseError,
  CategoryNameTakenError,
  CategoryNotFoundError,
  InvalidProductError,
  NegativeStockError,
  ProductNotFoundError,
} from '../../src/domain/errors/catalog.errors.js';
import {
  FixedClock,
  InMemoryCategoryRepository,
  InMemoryProductRepository,
  SequentialIdGenerator,
} from '../fakes/fakes.js';

function setup() {
  const categories = new InMemoryCategoryRepository();
  const products = new InMemoryProductRepository();
  const ids = new SequentialIdGenerator();
  const clock = new FixedClock();
  return {
    listCategories: new ListCategoriesUseCase(categories),
    createCategory: new CreateCategoryUseCase(categories, ids, clock),
    updateCategory: new UpdateCategoryUseCase(categories),
    deleteCategory: new DeleteCategoryUseCase(categories, products),
    createProduct: new CreateProductUseCase(products, categories, ids, clock),
    updateProduct: new UpdateProductUseCase(products, categories),
    adjustStock: new AdjustStockUseCase(products, categories),
    listProducts: new ListProductsUseCase(products, categories),
    getProduct: new GetProductUseCase(products, categories),
    changes: new ListProductChangesUseCase(products, categories),
  };
}

const admin = { isAdmin: true };
const customer = { isAdmin: false };
const base = { description: 'Producto oficial', images: [] as string[] };

describe('Categorías', () => {
  it('crea, renombra y lista categorías ordenadas', async () => {
    const t = setup();
    const papeleria = await t.createCategory.execute({ name: 'Papelería' });
    await t.createCategory.execute({ name: 'Bebidas' });
    await t.updateCategory.execute({ id: papeleria.id, name: 'Útiles' });
    expect((await t.listCategories.execute()).map((c) => c.name)).toEqual(['Bebidas', 'Útiles']);
  });

  it('no permite nombres repetidos aunque cambien mayúsculas o tildes', async () => {
    const t = setup();
    await t.createCategory.execute({ name: 'Papelería' });
    await expect(t.createCategory.execute({ name: 'PAPELERIA' })).rejects.toThrow(CategoryNameTakenError);
  });

  it('solo elimina categorías sin productos', async () => {
    const t = setup();
    const cat = await t.createCategory.execute({ name: 'Ropa' });
    await t.createProduct.execute({ ...base, name: 'Buzo', price: 80000, categoryId: cat.id, stock: 3 });
    await expect(t.deleteCategory.execute(cat.id)).rejects.toThrow(CategoryInUseError);
    await expect(t.deleteCategory.execute('nope')).rejects.toThrow(CategoryNotFoundError);
  });
});

describe('Productos', () => {
  async function withProducts() {
    const t = setup();
    const ropa = await t.createCategory.execute({ name: 'Ropa' });
    const papel = await t.createCategory.execute({ name: 'Papelería' });
    const buzo = await t.createProduct.execute({ ...base, name: 'Buzo', price: 80000, categoryId: ropa.id, stock: 3 });
    const gorra = await t.createProduct.execute({ ...base, name: 'Gorra', price: 30000, categoryId: ropa.id, stock: 0 });
    const lapiz = await t.createProduct.execute({ ...base, name: 'Lápiz', price: 1500, categoryId: papel.id, stock: 10 });
    return { t, ropa, papel, buzo, gorra, lapiz };
  }

  it('crea el producto con su categoría y disponibilidad', async () => {
    const { buzo, gorra } = await withProducts();
    expect(buzo).toMatchObject({ price: 80000, stock: 3, available: true, category: { name: 'Ropa' } });
    expect(gorra.available).toBe(false);
  });

  it('exige que la categoría exista', async () => {
    const t = setup();
    await expect(
      t.createProduct.execute({ ...base, name: 'Buzo', price: 1000, categoryId: 'nope', stock: 1 }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it('lista con filtro por categoría, orden y paginación', async () => {
    const { t, ropa } = await withProducts();
    const page = await t.listProducts.execute({ categoryId: ropa.id, sort: 'price_asc', pageSize: 1, page: 2, requester: customer });
    expect(page).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(page.items.map((p) => p.name)).toEqual(['Buzo']);
  });

  it('ajusta tamaños de página fuera de rango', async () => {
    const { t } = await withProducts();
    const page = await t.listProducts.execute({ page: -3, pageSize: 1000, requester: customer });
    expect(page).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('los desactivados solo los ve el admin, y solo si los pide', async () => {
    const { t, buzo } = await withProducts();
    await t.updateProduct.execute({ id: buzo.id, active: false });

    expect((await t.listProducts.execute({ requester: customer, includeInactive: true })).total).toBe(2);
    expect((await t.listProducts.execute({ requester: admin })).total).toBe(2);
    expect((await t.listProducts.execute({ requester: admin, includeInactive: true })).total).toBe(3);

    await expect(t.getProduct.execute(buzo.id, customer)).rejects.toThrow(ProductNotFoundError);
    expect((await t.getProduct.execute(buzo.id, admin)).active).toBe(false);
  });

  it('editar un producto no altera su stock', async () => {
    const { t, buzo, papel } = await withProducts();
    await t.adjustStock.execute({ productId: buzo.id, delta: 7 });
    const edited = await t.updateProduct.execute({ id: buzo.id, price: 85000, categoryId: papel.id });
    expect(edited).toMatchObject({ price: 85000, stock: 10, category: { name: 'Papelería' } });
  });

  it('ajusta el inventario sin dejarlo negativo', async () => {
    const { t, buzo } = await withProducts();
    expect((await t.adjustStock.execute({ productId: buzo.id, delta: -3 })).stock).toBe(0);
    await expect(t.adjustStock.execute({ productId: buzo.id, delta: -1 })).rejects.toThrow(NegativeStockError);
    await expect(t.adjustStock.execute({ productId: buzo.id, delta: 0 })).rejects.toThrow(InvalidProductError);
    await expect(t.adjustStock.execute({ productId: 'nope', delta: 1 })).rejects.toThrow(ProductNotFoundError);
  });
});

describe('Feed de cambios', () => {
  it('entrega los cambios en orden y continúa desde el cursor', async () => {
    const t = setup();
    const cat = await t.createCategory.execute({ name: 'Ropa' });
    for (const name of ['A1', 'B2', 'C3']) {
      await t.createProduct.execute({ ...base, name, price: 1000, categoryId: cat.id, stock: 1 });
    }

    const first = await t.changes.execute(undefined, 2);
    expect(first.items.map((p) => p.name)).toEqual(['A1', 'B2']);

    const second = await t.changes.execute(first.nextCursor!, 2);
    expect(second.items.map((p) => p.name)).toEqual(['C3']);

    // Sin cambios nuevos, el cursor se mantiene.
    const third = await t.changes.execute(second.nextCursor!, 2);
    expect(third).toEqual({ items: [], nextCursor: second.nextCursor });

    // Un cambio de stock vuelve a aparecer en el feed (Búsqueda muestra disponibilidad).
    await t.adjustStock.execute({ productId: first.items[0].id, delta: 5 });
    expect((await t.changes.execute(second.nextCursor!)).items.map((p) => p.name)).toEqual(['A1']);
  });

  it('rechaza cursores inválidos', async () => {
    await expect(setup().changes.execute('basura')).rejects.toThrow(InvalidProductError);
  });
});
