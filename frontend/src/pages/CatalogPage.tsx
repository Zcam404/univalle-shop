/**
 * Catálogo completo con filtro por categoría, orden y paginación. Los filtros
 * viven en la URL (`?categoria=…&orden=…&pagina=…`), así se pueden compartir
 * enlaces y el botón "atrás" funciona.
 */
import { useSearchParams } from 'react-router';
import { catalogApi } from '../api/endpoints';
import type { ProductSort } from '../api/types';
import { ProductGrid } from '../components/ProductCard';
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui';
import { useAsync } from '../hooks/useAsync';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Más nuevos' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'name', label: 'Nombre' },
];

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoria') ?? '';
  const sort = (params.get('orden') as ProductSort) ?? 'newest';
  const page = Number(params.get('pagina') ?? 1);

  const categories = useAsync(() => catalogApi.categories(), []);
  const products = useAsync(
    () => catalogApi.products({ categoryId: categoryId || undefined, sort, page, pageSize: 12 }),
    [categoryId, sort, page],
  );

  /** Cambia un filtro en la URL y vuelve a la primera página. */
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'pagina') next.delete('pagina');
    setParams(next);
  };

  return (
    <>
      <div className="page-head">
        <h1>Productos</h1>
        <div className="filters">
          <select value={categoryId} onChange={(e) => setFilter('categoria', e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setFilter('orden', e.target.value)} aria-label="Ordenar por">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.loading && <Spinner />}
      {products.error && <Alert tone="error">{products.error.message}</Alert>}
      {products.data && products.data.items.length === 0 && <EmptyState title="No hay productos en esta categoría" />}
      {products.data && products.data.items.length > 0 && (
        <>
          <ProductGrid
            products={products.data.items.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              imageUrl: p.images[0] ?? null,
              categoryName: p.category?.name,
              available: p.available,
            }))}
          />
          <Pagination page={page} totalPages={products.data.totalPages} onChange={(p) => setFilter('pagina', String(p))} />
        </>
      )}
    </>
  );
}
