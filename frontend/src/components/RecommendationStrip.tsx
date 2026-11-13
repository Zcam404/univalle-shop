/**
 * Franja de recomendaciones. Si el servicio de Recomendación no responde, se
 * oculta sin romper la página (o muestra el respaldo que se le pase).
 */
import type { ReactNode } from 'react';
import type { RecommendationList } from '../api/types';
import { useAsync } from '../hooks/useAsync';
import { ProductGrid } from './ProductCard';
import { Spinner } from './ui';

interface Props {
  title: string;
  /** Llamada a la API que trae las recomendaciones. */
  load: () => Promise<RecommendationList>;
  /** Dependencias que obligan a recargar (ej. el usuario o el producto actual). */
  deps: unknown[];
  /** Qué mostrar si el servicio falla; por defecto, nada. */
  fallback?: ReactNode;
}

export function RecommendationStrip({ title, load, deps, fallback = null }: Props) {
  const { data, error, loading } = useAsync(load, deps);

  if (loading) return <Spinner label="Buscando recomendaciones…" />;
  if (error || !data || data.items.length === 0) return <>{fallback}</>;

  return (
    <section className="section">
      <h2>{title}</h2>
      <ProductGrid
        products={data.items.map((r) => ({
          id: r.id,
          name: r.name,
          price: r.price,
          imageUrl: r.imageUrl,
          categoryName: r.category?.name,
          reason: r.reason,
        }))}
      />
    </section>
  );
}
