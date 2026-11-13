/**
 * Detalle de un producto: imágenes, precio, disponibilidad, botón para
 * agregar al carrito y productos relacionados.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { catalogApi, recommendationsApi } from '../api/endpoints';
import { ApiError } from '../api/http';
import { RecommendationStrip } from '../components/RecommendationStrip';
import { Alert, ProductImage, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAsync } from '../hooks/useAsync';
import { formatPrice } from '../lib/format';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const product = useAsync(() => catalogApi.product(id), [id]);

  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  if (product.loading) return <Spinner />;
  if (product.error || !product.data) {
    return <Alert tone="error">{product.error?.message ?? 'No se encontró el producto.'}</Alert>;
  }
  const p = product.data;

  /** Agrega al carrito; sin sesión, primero lleva a iniciar sesión. */
  const addToCart = async () => {
    if (!user) return navigate('/ingresar', { state: { from: `/productos/${id}` } });
    setAdding(true);
    setMessage(null);
    try {
      await add(p.id, quantity);
      setMessage({ tone: 'success', text: `Agregaste ${quantity} × ${p.name} al carrito.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof ApiError ? err.message : 'No se pudo agregar al carrito.' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <nav className="breadcrumb">
        <Link to="/productos">Productos</Link>
        {p.category && (
          <>
            {' / '}
            <Link to={`/productos?categoria=${p.category.id}`}>{p.category.name}</Link>
          </>
        )}
      </nav>

      <div className="detail">
        <div className="gallery">
          <ProductImage src={p.images[imageIndex]} alt={p.name} className="detail-img" />
          {p.images.length > 1 && (
            <div className="thumbs">
              {p.images.map((src, i) => (
                <button key={src} className={i === imageIndex ? 'active' : ''} onClick={() => setImageIndex(i)}>
                  <ProductImage src={src} alt={`${p.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <h1>{p.name}</h1>
          <p className="price">{formatPrice(p.price)}</p>
          <p>{p.description}</p>
          {p.available ? (
            <p className="muted">{p.stock <= 5 ? `¡Solo quedan ${p.stock}!` : `${p.stock} disponibles`}</p>
          ) : (
            <Alert tone="warning">Este producto está agotado por ahora.</Alert>
          )}

          {p.available && (
            <div className="buy-row">
              <label>
                Cantidad
                <input
                  type="number"
                  min={1}
                  max={Math.min(p.stock, 100)}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)))}
                />
              </label>
              <button className="btn btn-primary" onClick={addToCart} disabled={adding}>
                {adding ? 'Agregando…' : 'Agregar al carrito'}
              </button>
            </div>
          )}
          {message && (
            <Alert tone={message.tone}>
              {message.text} {message.tone === 'success' && <Link to="/carrito">Ver carrito</Link>}
            </Alert>
          )}
        </div>
      </div>

      <RecommendationStrip title="También te puede interesar" load={() => recommendationsApi.related(id, 4)} deps={[id]} />
    </>
  );
}
