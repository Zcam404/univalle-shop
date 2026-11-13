/**
 * Pruebas de los casos de uso de búsqueda y de sincronización con Catálogo.
 */
import {
  ClearRecentSearchesUseCase,
  GetRecentSearchesUseCase,
  SearchProductsUseCase,
  SuggestProductsUseCase,
} from '../../src/application/use-cases/search.use-cases.js';
import { GetSyncStatusUseCase, ReindexCatalogUseCase, SyncCatalogUseCase } from '../../src/application/use-cases/sync.use-cases.js';
import {
  FakeCatalogFeed,
  FixedClock,
  InMemoryProductIndex,
  InMemoryRecentSearchRepository,
  InMemorySyncState,
  MemoryLogger,
  change,
} from '../fakes/fakes.js';

function setup() {
  const index = new InMemoryProductIndex();
  const recent = new InMemoryRecentSearchRepository();
  const state = new InMemorySyncState();
  const feed = new FakeCatalogFeed();
  const clock = new FixedClock();
  const logger = new MemoryLogger();
  const sync = new SyncCatalogUseCase(feed, index, state, clock);
  return {
    index,
    recent,
    state,
    feed,
    logger,
    sync,
    reindex: new ReindexCatalogUseCase(sync, state),
    status: new GetSyncStatusUseCase(index, state),
    search: new SearchProductsUseCase(index, recent, clock, logger),
    suggest: new SuggestProductsUseCase(index),
    getRecent: new GetRecentSearchesUseCase(recent),
    clearRecent: new ClearRecentSearchesUseCase(recent),
  };
}

/** Catálogo de ejemplo ya sincronizado. */
async function withCatalog() {
  const t = setup();
  t.feed.changes.push(
    change('1', 'Cuaderno argollado Univalle', { price: 12000, description: '100 hojas' }),
    change('2', 'Agenda 2026', { price: 30000, description: 'Ideal para acompañar tu cuaderno' }),
    change('3', 'Café de Colombia Univalle', { price: 25000, categoryName: 'Accesorios' }),
    change('4', 'Mug Univalle', { price: 22000, categoryName: 'Accesorios', available: false, stock: 0 }),
    change('5', 'Cuaderno viejo', { active: false }),
  );
  await t.sync.execute();
  return t;
}

describe('SearchProductsUseCase', () => {
  it('encuentra por palabras incompletas, sin tildes, ordenado por relevancia', async () => {
    const t = await withCatalog();
    const r = await t.search.execute({ text: 'CUAD' });
    expect(r.items.map((p) => p.name)).toEqual(['Cuaderno argollado Univalle', 'Agenda 2026']);
    expect((await t.search.execute({ text: 'cafe' })).items[0].name).toBe('Café de Colombia Univalle');
  });

  it('no muestra productos desactivados', async () => {
    const t = await withCatalog();
    expect((await t.search.execute({ text: 'viejo' })).total).toBe(0);
  });

  it('aplica filtros de categoría, precio y disponibilidad', async () => {
    const t = await withCatalog();
    const r = await t.search.execute({ text: 'univalle', categoryId: 'cat-Accesorios', onlyAvailable: true });
    expect(r.items.map((p) => p.name)).toEqual(['Café de Colombia Univalle']);
    const cheap = await t.search.execute({ maxPrice: 20000, sort: 'price_asc' });
    expect(cheap.items.map((p) => p.price)).toEqual([12000]);
  });

  it('guarda la búsqueda del usuario, y si eso falla igual entrega resultados', async () => {
    const t = await withCatalog();
    await t.search.execute({ text: 'buzo' }, 'ana');
    await t.search.execute({ text: 'termo' }, 'ana');
    await t.search.execute({ text: 'nada' }); // anónimo: no se guarda
    expect((await t.getRecent.execute('ana')).map((r) => r.text)).toEqual(['termo', 'buzo']);

    t.recent.failNext = true;
    expect((await t.search.execute({ text: 'cuad' }, 'ana')).total).toBe(2);
    expect(t.logger.warnings).toHaveLength(1);

    await t.clearRecent.execute('ana');
    expect(await t.getRecent.execute('ana')).toEqual([]);
  });

  it('sugiere nombres mientras se escribe', async () => {
    const t = await withCatalog();
    expect(await t.suggest.execute('univalle cu')).toEqual(['Cuaderno argollado Univalle']);
    expect(await t.suggest.execute('a')).toEqual([]);
  });
});

describe('Sincronización con Catálogo', () => {
  it('lee por páginas, guarda el cursor y solo trae lo nuevo la siguiente vez', async () => {
    const t = setup();
    for (let i = 0; i < 450; i++) t.feed.changes.push(change(`p${i}`, `Producto ${i}`));
    expect(await t.sync.execute()).toBe(450);
    expect(t.state.state.cursor).toBe('450');

    t.feed.changes.push(change('p0', 'Producto 0 renombrado'));
    expect(await t.sync.execute()).toBe(1);
    expect((await t.search.execute({ text: 'renombrado' })).total).toBe(1);
    expect((await t.status.execute()).indexedProducts).toBe(450);
  });

  it('si Catálogo cae a mitad, conserva lo procesado y continúa después', async () => {
    const t = setup();
    for (let i = 0; i < 450; i++) t.feed.changes.push(change(`p${i}`, `Producto ${i}`));
    t.feed.failAfterPages = 1;
    await expect(t.sync.execute()).rejects.toThrow('Catálogo caído');
    expect(t.index.items.size).toBe(200);

    t.feed.failAfterPages = null;
    expect(await t.sync.execute()).toBe(250);
    expect(t.index.items.size).toBe(450);
  });

  it('el reindexado vuelve a leer todo desde el principio', async () => {
    const t = await withCatalog();
    expect(await t.sync.execute()).toBe(0);
    expect(await t.reindex.execute()).toBe(5);
  });
});
