/**
 * Pago (checkout): dirección de envío y datos de la tarjeta.
 *
 * La dirección se puede elegir de las guardadas en el perfil o escribir a
 * mano. Al confirmar, Pedidos reserva el stock y cobra. Si el pago se aprueba,
 * se va al detalle del pedido; si se rechaza, se muestra el motivo y el
 * carrito se conserva para intentar con otra tarjeta.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ordersApi } from '../api/endpoints';
import { ApiError } from '../api/http';
import type { ShippingAddress } from '../api/types';
import { Alert, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';

export function CheckoutPage() {
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const navigate = useNavigate();

  const saved = user?.addresses ?? [];
  const initial = saved.find((a) => a.isDefault) ?? saved[0];
  const [address, setAddress] = useState<ShippingAddress>({
    recipientName: user?.name ?? '',
    phone: user?.phone ?? '',
    street: initial?.street ?? '',
    city: initial?.city ?? 'Cali',
    department: initial?.department ?? 'Valle del Cauca',
    additionalInfo: initial?.additionalInfo ?? '',
  });
  const [card, setCard] = useState({ number: '', holderName: '', exp: '', cvv: '' });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (cart.items.length === 0) {
    return (
      <EmptyState title="No hay nada para pagar">
        <Link to="/productos" className="btn btn-primary">
          Ver productos
        </Link>
      </EmptyState>
    );
  }

  /** Copia una dirección guardada en el formulario. */
  const applySaved = (id: string) => {
    const a = saved.find((x) => x.id === id);
    if (a) setAddress({ ...address, street: a.street, city: a.city, department: a.department, additionalInfo: a.additionalInfo ?? '' });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const [month, year] = card.exp.split('/').map((v) => Number(v.trim()));
    if (!month || !year) return setError('Escribe el vencimiento como MM/AA, por ejemplo 12/30.');

    setSending(true);
    setError(null);
    try {
      const order = await ordersApi.place(address, {
        number: card.number,
        holderName: card.holderName,
        expMonth: month,
        expYear: year < 100 ? 2000 + year : year,
        cvv: card.cvv,
      });
      await refresh();
      if (order.status === 'PAID') {
        navigate(`/pedidos/${order.id}`, { state: { justPaid: true } });
      } else {
        const reason = (order.payment.failureReason ?? 'motivo desconocido').replace(/\.$/, '');
        setError(`El pago fue rechazado: ${reason}. Tu carrito se conserva.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la compra.');
    } finally {
      setSending(false);
    }
  };

  /** Campo de dirección controlado. */
  const field = (key: keyof ShippingAddress, label: string, props: Record<string, unknown> = {}) => (
    <label>
      {label}
      <input value={address[key] ?? ''} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <form className="checkout" onSubmit={submit}>
      <h1>Pagar</h1>
      <div className="cart-layout">
        <div className="stack">
          <section className="card form-card">
            <h2>Dirección de envío</h2>
            {saved.length > 0 && (
              <label>
                Usar una dirección guardada
                <select defaultValue={initial?.id} onChange={(e) => applySaved(e.target.value)}>
                  {saved.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} — {a.street}, {a.city}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="form-grid">
              {field('recipientName', 'Quién recibe', { required: true })}
              {field('phone', 'Teléfono de contacto', { required: true, inputMode: 'tel' })}
              {field('street', 'Dirección', { required: true, placeholder: 'Calle 13 # 100-00' })}
              {field('additionalInfo', 'Indicaciones (opcional)', { placeholder: 'Apto, torre, referencia' })}
              {field('city', 'Ciudad', { required: true })}
              {field('department', 'Departamento', { required: true })}
            </div>
          </section>

          <section className="card form-card">
            <h2>Tarjeta</h2>
            <p className="muted small">
              Pagos de prueba: <code>4242 4242 4242 4242</code> se aprueba; <code>4000 0000 0000 0002</code> se rechaza por fondos
              insuficientes. Cualquier vencimiento futuro y CVV de 3 dígitos.
            </p>
            <div className="form-grid">
              <label className="span-2">
                Número de la tarjeta
                <input required inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
              </label>
              <label className="span-2">
                Nombre del titular
                <input required autoComplete="cc-name" value={card.holderName} onChange={(e) => setCard({ ...card, holderName: e.target.value })} />
              </label>
              <label>
                Vencimiento (MM/AA)
                <input required placeholder="12/30" autoComplete="cc-exp" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} />
              </label>
              <label>
                CVV
                <input required inputMode="numeric" maxLength={4} autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
              </label>
            </div>
          </section>
        </div>

        <aside className="card summary">
          <h2>Tu pedido</h2>
          <ul className="summary-lines">
            {cart.items.map((i) => (
              <li key={i.productId}>
                <span>
                  {i.quantity} × {i.name}
                </span>
                <span>{formatPrice(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatPrice(cart.estimatedTotal)}</strong>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn btn-primary btn-block" disabled={sending}>
            {sending ? 'Procesando pago…' : 'Pagar ahora'}
          </button>
        </aside>
      </div>
    </form>
  );
}
