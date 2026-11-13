/**
 * Resultados de búsqueda con filtros de categoría, rango de precio,
 * disponibilidad y orden. Todos los filtros viven en la URL.
 */
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { catalogApi, searchApi } from '../api/endpoints';
import type { SearchSort } from '../api/types';
import { ProductGrid } from '../components/ProductCard';
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui';
import { useAsync } from '../hooks/useAsync';

/** Convierte un texto de la URL en número, o `undefined` si está vacío o no es número. */
const toNumber = (value: string | null) => (value && !Number.isNaN(Number(value)) ? Number(value) : undefined);

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categoryId = params.get('categoria') ?? '';
  const minPrice = toNumber(params.get('min'));
  const maxPrice = toNumber(params.get('max'));
  const onlyAvailable = params.get('disponibles') === '1';
  const sort = (params.get('orden') as SearchSort) ?? 'relevance';
  const page = Number(params.get('pagina') ?? 1);

  const [priceDraft, setPriceDraft] = useState({ min: params.get('min') ?? '', max: params.get('max') ?? '' });
  const categories = useAsync(() => catalogApi.categories(), []);
  const results = useAsync(
    () =>
      searchApi.search({
        q,
        categoryId: categoryId || undefined,
        minPrice,
        maxPrice,
        available: onlyAvailable || undefined,
        sort,
        page,
      }),
    [q, categoryId, minPrice, maxPrice, onlyAvailable, sort, page],
  );

  /** Actualiza varios parámetros de la URL a la vez y vuelve a la página 1. */
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('pagina' in changes)) next.delete('pagina');
    setParams(next);
  };

  const applyPrices = (e: FormEvent) => {
    e.preventDefault();
    update({ min: priceDraft.min, max: priceDraft.max });
  };

  return (
    <>
      <div className="page-head">
        <h1>{q ? `Resultados para "${q}"` : 'Buscar productos'}</h1>
        {results.data && <p className="muted">{results.data.total} producto(s)</p>}
      </div>

      <div className="search-layout">
        <aside className="card filters-panel">
          <label>
            Categoría
            <select value={categoryId} onChange={(e) => update({ categoria: e.target.value })}>
              <option value="">Todas</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <form onSubmit={applyPrices} className="price-range">
            <span>Precio (COP)</span>
            <div className="row">
              <input inputMode="numeric" placeholder="Mín." value={priceDraft.min} onChange={(e) => setPriceDraft({ ...priceDraft, min: e.target.value })} />
              <input inputMode="numeric" placeholder="Máx." value={priceDraft.max} onChange={(e) => setPriceDraft({ ...priceDraft, max: e.target.value })} />
            </div>
            <button className="btn btn-ghost">Aplicar</button>
          </form>
          <label className="checkbox">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => update({ disponibles: e.target.checked ? '1' : '' })} />
            Solo disponibles
          </label>
          <label>
            Ordenar por
            <select value={sort} onChange={(e) => update({ orden: e.target.value })}>
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="newest">Más nuevos</option>
            </select>
          </label>
        </aside>

        <div>
          {results.loading && <Spinner label="Buscando…" />}
          {results.error && <Alert tone="error">{results.error.message}</Alert>}
          {results.data && results.data.items.length === 0 && (
            <EmptyState title="No encontramos productos">
              <p>Prueba con otras palabras o quita algunos filtros.</p>
            </EmptyState>
          )}
          {results.data && results.data.items.length > 0 && (
            <>
              <ProductGrid
                products={results.data.items.map((p) => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  imageUrl: p.imageUrl,
                  categoryName: p.category?.name,
                  available: p.available,
                }))}
              />
              <Pagination page={page} totalPages={results.data.totalPages} onChange={(p) => update({ pagina: String(p) })} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
