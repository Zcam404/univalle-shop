/**
 * Historial de pedidos del usuario, del más reciente al más antiguo.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { ordersApi } from '../api/endpoints';
import { Alert, EmptyState, Pagination, Spinner, StatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { formatDate, formatPrice, shortId } from '../lib/format';

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const orders = useAsync(() => ordersApi.mine(page), [page]);

  if (orders.loading) return <Spinner />;
  if (orders.error) return <Alert tone="error">{orders.error.message}</Alert>;
  if (!orders.data || orders.data.items.length === 0) {
    return (
      <EmptyState title="Aún no tienes pedidos">
        <Link to="/productos" className="btn btn-primary">
          Empezar a comprar
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <h1>Mis pedidos</h1>
      <ul className="order-list">
        {orders.data.items.map((o) => (
          <li key={o.id}>
            <Link to={`/pedidos/${o.id}`} className="card order-row">
              <div>
                <strong>Pedido #{shortId(o.id)}</strong>
                <span className="muted small">{formatDate(o.createdAt)}</span>
              </div>
              <span className="muted">{o.items.reduce((n, i) => n + i.quantity, 0)} producto(s)</span>
              <StatusBadge status={o.status} />
              <strong>{formatPrice(o.total)}</strong>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={orders.data.totalPages} onChange={setPage} />
    </>
  );
}
