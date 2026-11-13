/**
 * Página de inicio: bienvenida, categorías, recomendaciones y novedades.
 *
 * Las recomendaciones son personalizadas si hay sesión y populares si no. Si
 * el servicio de Recomendación no responde, en su lugar se muestran las
 * novedades del catálogo.
 */
import { Link } from 'react-router';
import { catalogApi, recommendationsApi } from '../api/endpoints';
import { ProductGrid } from '../components/ProductCard';
import { RecommendationStrip } from '../components/RecommendationStrip';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';

export function HomePage() {
  const { user } = useAuth();
  const categories = useAsync(() => catalogApi.categories(), []);
  const newest = useAsync(() => catalogApi.products({ pageSize: 8, sort: 'newest' }), []);

  const newestSection = (title: string) => (
    <section className="section">
      <h2>{title}</h2>
      {newest.loading && <Spinner />}
      {newest.error && <Alert tone="warning">{newest.error.message}</Alert>}
      {newest.data && (
        <ProductGrid
          products={newest.data.items.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            imageUrl: p.images[0] ?? null,
            categoryName: p.category?.name,
            available: p.available,
          }))}
        />
      )}
    </section>
  );

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Comunidad Univalle</p>
          <h1>{user ? `Hola, ${user.name.split(' ')[0]}` : 'La tienda de la Universidad del Valle'}</h1>
          <p>Ropa oficial, papelería y accesorios para estudiantes, docentes y administrativos.</p>
          <Link to="/productos" className="btn btn-primary">
            Ver todos los productos
          </Link>
        </div>
      </section>

      {categories.data && categories.data.length > 0 && (
        <nav className="chips" aria-label="Categorías">
          {categories.data.map((c) => (
            <Link key={c.id} to={`/productos?categoria=${c.id}`} className="chip">
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      <RecommendationStrip
        title={user ? 'Recomendados para ti' : 'Lo más popular'}
        load={() => (user ? recommendationsApi.forMe(8) : recommendationsApi.popular(8))}
        deps={[user?.id]}
        fallback={newestSection('Novedades')}
      />
      {newestSection('Recién llegados')}
    </>
  );
}
