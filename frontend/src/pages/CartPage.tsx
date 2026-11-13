/**
 * Carrito: cambiar cantidades, quitar productos y pasar a pagar. Los errores
 * (por ejemplo, pedir más unidades de las que hay) se muestran junto al
 * producto afectado.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/http';
import { Alert, EmptyState, ProductImage } from '../components/ui';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';

export function CartPage() {
  const { cart, update, remove } = useCart();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  /** Ejecuta una acción sobre una línea y guarda su error, si lo hay. */
  const run = async (productId: string, action: () => Promise<void>) => {
    setBusy(productId);
    setErrors((e) => ({ ...e, [productId]: '' }));
    try {
      await action();
    } catch (err) {
      setErrors((e) => ({ ...e, [productId]: err instanceof ApiError ? err.message : 'No se pudo actualizar.' }));
    } finally {
      setBusy(null);
    }
  };

  if (cart.items.length === 0) {
    return (
      <EmptyState title="Tu carrito está vacío">
        <Link to="/productos" className="btn btn-primary">
          Ver productos
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <h1>Carrito</h1>
      <div className="cart-layout">
        <ul className="cart-list">
          {cart.items.map((item) => (
            <li key={item.productId} className="card cart-item">
              <ProductImage src={item.imageUrl} alt={item.name} className="thumb" />
              <div className="cart-item-info">
                <Link to={`/productos/${item.productId}`}>
                  <strong>{item.name}</strong>
                </Link>
                <span className="muted">{formatPrice(item.unitPrice)} c/u</span>
                {errors[item.productId] && <Alert tone="error">{errors[item.productId]}</Alert>}
              </div>
              <input
                type="number"
                min={1}
                max={100}
                aria-label={`Cantidad de ${item.name}`}
                defaultValue={item.quantity}
                key={item.quantity}
                disabled={busy === item.productId}
                onBlur={(e) => {
                  const qty = Number(e.target.value);
                  if (qty !== item.quantity && qty >= 1) void run(item.productId, () => update(item.productId, qty));
                }}
              />
              <strong className="subtotal">{formatPrice(item.subtotal)}</strong>
              <button
                className="link-button danger"
                disabled={busy === item.productId}
                onClick={() => run(item.productId, () => remove(item.productId))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>

        <aside className="card summary">
          <h2>Resumen</h2>
          <div className="summary-row">
            <span>{cart.totalItems} producto(s)</span>
            <strong>{formatPrice(cart.estimatedTotal)}</strong>
          </div>
          <p className="muted small">El precio final se confirma al pagar.</p>
          <Link to="/checkout" className="btn btn-primary btn-block">
            Continuar con el pago
          </Link>
        </aside>
      </div>
    </>
  );
}
