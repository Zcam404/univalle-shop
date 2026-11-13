/**
 * Detalle de un pedido: productos, dirección, pago e historial de estados.
 * Si todavía no se envió, el cliente puede cancelarlo (se reembolsa el pago).
 */
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ordersApi } from '../api/endpoints';
import { ApiError } from '../api/http';
import { Alert, Spinner, StatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { ORDER_STATUS_LABELS, formatDate, formatPrice, shortId } from '../lib/format';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const justPaid = (location.state as { justPaid?: boolean } | null)?.justPaid;
  const order = useAsync(() => ordersApi.get(id), [id]);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (order.loading) return <Spinner />;
  if (order.error || !order.data) return <Alert tone="error">{order.error?.message ?? 'No se encontró el pedido.'}</Alert>;
  const o = order.data;

  const cancel = async () => {
    if (!confirm('¿Cancelar este pedido? Se reembolsará el pago a tu tarjeta.')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      order.setData(await ordersApi.cancel(o.id));
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <nav className="breadcrumb">
        <Link to="/pedidos">Mis pedidos</Link> / #{shortId(o.id)}
      </nav>
      {justPaid && <Alert tone="success">¡Gracias por tu compra! Tu pago fue aprobado.</Alert>}

      <div className="page-head">
        <h1>Pedido #{shortId(o.id)}</h1>
        <StatusBadge status={o.status} />
      </div>

      <div className="cart-layout">
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.productId}>
                  <td>
                    <Link to={`/productos/${i.productId}`}>{i.name}</Link>
                  </td>
                  <td>{i.quantity}</td>
                  <td>{formatPrice(i.unitPrice)}</td>
                  <td>{formatPrice(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <td>
                  <strong>{formatPrice(o.total)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <aside className="stack">
          <section className="card">
            <h2>Envío</h2>
            <p>
              {o.shippingAddress.recipientName}
              <br />
              {o.shippingAddress.street}
              {o.shippingAddress.additionalInfo && <>, {o.shippingAddress.additionalInfo}</>}
              <br />
              {o.shippingAddress.city}, {o.shippingAddress.department}
              <br />
              Tel. {o.shippingAddress.phone}
            </p>
          </section>
          <section className="card">
            <h2>Pago</h2>
            {o.payment.cardLast4 && <p>Tarjeta terminada en {o.payment.cardLast4}</p>}
            {o.payment.failureReason && <Alert tone="warning">{o.payment.failureReason}</Alert>}
          </section>
          <section className="card">
            <h2>Historial</h2>
            <ol className="timeline">
              {o.history.map((h) => (
                <li key={h.status + h.at}>
                  <strong>{ORDER_STATUS_LABELS[h.status]}</strong>
                  <span className="muted small">{formatDate(h.at)}</span>
                </li>
              ))}
            </ol>
          </section>
          {o.cancellable && (
            <button className="btn btn-danger" onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Cancelando…' : 'Cancelar pedido'}
            </button>
          )}
          {cancelError && <Alert tone="error">{cancelError}</Alert>}
        </aside>
      </div>
    </>
  );
}
