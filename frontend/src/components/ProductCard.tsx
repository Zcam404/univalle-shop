/**
 * Tarjeta de producto para las grillas (catálogo, búsqueda, recomendaciones).
 * Acepta los distintos formatos de producto que devuelven los servicios.
 */
import { Link } from 'react-router';
import { formatPrice } from '../lib/format';
import { ProductImage } from './ui';

export interface ProductCardData {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryName?: string | null;
  available?: boolean;
  /** Motivo de una recomendación ("Porque buscaste…"). */
  reason?: string;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link to={`/productos/${product.id}`} className="card product-card">
      <ProductImage src={product.imageUrl} alt={product.name} />
      <div className="product-card-body">
        {product.categoryName && <span className="eyebrow">{product.categoryName}</span>}
        <h3>{product.name}</h3>
        <div className="product-card-footer">
          <strong>{formatPrice(product.price)}</strong>
          {product.available === false && <span className="badge badge-muted">Agotado</span>}
        </div>
        {product.reason && <p className="reason">{product.reason}</p>}
      </div>
    </Link>
  );
}

/** Grilla adaptable de tarjetas. */
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
