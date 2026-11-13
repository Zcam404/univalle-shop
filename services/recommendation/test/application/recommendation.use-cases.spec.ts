/**
 * Pruebas de los casos de uso, incluido qué pasa cuando Pedidos o Búsqueda no responden.
 */
import { SignalsProvider } from '../../src/application/services/signals-provider.js';
import {
  GetMyRecommendationsUseCase,
  GetPopularUseCase,
  GetRelatedUseCase,
} from '../../src/application/use-cases/recommendation.use-cases.js';
import { ProductNotFoundError } from '../../src/domain/errors/recommendation.errors.js';
import {
  FakeOrdersClient,
  FakeSearchClient,
  InMemoryProductSnapshot,
  InMemorySignalCache,
  MemoryLogger,
  product,
} from '../fakes/fakes.js';

async function setup() {
  const products = new InMemoryProductSnapshot();
  await products.upsertMany([
    product('cuaderno', 'Cuaderno argollado', 'Papelería'),
    product('agenda', 'Agenda 2026', 'Papelería'),
    product('termo', 'Termo 750 ml', 'Accesorios'),
    product('buzo', 'Buzo con capucha', 'Ropa'),
  ]);
  const orders = new FakeOrdersClient();
  const search = new FakeSearchClient();
  const cache = new InMemorySignalCache();
  const logger = new MemoryLogger();
  const signals = new SignalsProvider(orders, search, cache, logger);
  return {
    orders,
    search,
    logger,
    mine: new GetMyRecommendationsUseCase(products, signals),
    popular: new GetPopularUseCase(products, signals),
    related: new GetRelatedUseCase(products, signals),
  };
}

describe('GetMyRecommendationsUseCase', () => {
  it('combina compras y búsquedas del usuario', async () => {
    const t = await setup();
    t.orders.purchasesByUser.set('ana', [{ productId: 'cuaderno', quantity: 1 }]);
    t.search.searchesByUser.set('ana', ['termo']);
    const r = await t.mine.execute('ana', 2);
    expect(r).toMatchObject({ strategy: 'personalized', degraded: false });
    expect(r.items.map((i) => i.name)).toEqual(['Termo 750 ml', 'Agenda 2026']);
  });

  it('si Pedidos y Búsqueda caen, usa lo último guardado y lo indica', async () => {
    const t = await setup();
    t.orders.purchasesByUser.set('ana', [{ productId: 'cuaderno', quantity: 1 }]);
    t.search.searchesByUser.set('ana', ['termo']);
    const fresh = await t.mine.execute('ana', 2);

    t.orders.down = true;
    t.search.down = true;
    const fallback = await t.mine.execute('ana', 2);
    expect(fallback.degraded).toBe(true);
    expect(fallback.items).toEqual(fresh.items);
    expect(t.logger.warnings.length).toBeGreaterThan(0);
  });

  it('sin datos guardados y con todo caído, igual responde con productos nuevos', async () => {
    const t = await setup();
    t.orders.down = true;
    t.search.down = true;
    const r = await t.mine.execute('nuevo', 3);
    expect(r).toMatchObject({ strategy: 'popular', degraded: true });
    expect(r.items).toHaveLength(3);
  });
});

describe('Populares y relacionados', () => {
  it('populares según ventas de Pedidos', async () => {
    const t = await setup();
    t.orders.top = [{ productId: 'buzo', unitsSold: 10 }];
    expect((await t.popular.execute(1)).items[0]).toMatchObject({ name: 'Buzo con capucha', reason: 'Popular en la tienda' });
  });

  it('relacionados de un producto existente; 404 si no existe', async () => {
    const t = await setup();
    expect((await t.related.execute('cuaderno', 1)).items[0].name).toBe('Agenda 2026');
    await expect(t.related.execute('nope')).rejects.toThrow(ProductNotFoundError);
  });
});
