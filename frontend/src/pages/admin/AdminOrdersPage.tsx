/**
 * Administración de pedidos: lista filtrable por estado y acciones para
 * marcar pedidos como enviados o entregados.
 */
import { useState } from 'react';
import { ordersApi } from '../../api/endpoints';
import { ApiError } from '../../api/http';
import type { Order, OrderStatus } from '../../api/types';
import { Alert, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { ORDER_STATUS_LABELS, formatDate, formatPrice, shortId } from '../../lib/format';

/** Siguiente estado que puede asignar el admin, según el estado actual. */
const NEXT: Partial<Record<OrderStatus, { status: 'SHIPPED' | 'DELIVERED'; label: string }>> = {
  PAID: { status: 'SHIPPED', label: 'Marcar como enviado' },
  SHIPPED: { status: 'DELIVERED', label: 'Marcar como entregado' },
};

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('PAID');
  const [page, setPage] = useState(1);
  const orders = useAsync(() => ordersApi.all({ status: status || undefined, page }), [status, page]);
  const [error, setError] = useState<string | null>(null);

  const advance = async (order: Order) => {
    const next = NEXT[order.status];
    if (!next) return;
    setError(null);
    try {
      await ordersApi.setStatus(order.id, next.status);
      orders.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado.');
    }
  };

  return (
    <>
      <div className="filters">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '');
            setPage(1);
          }}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {orders.loading && <Spinner />}
      {orders.error && <Alert tone="error">{orders.error.message}</Alert>}
      {orders.data && orders.data.items.length === 0 && <p className="muted">No hay pedidos con este estado.</p>}
      {orders.data && orders.data.items.length > 0 && (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Envío</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((o) => (
                  <tr key={o.id}>
                    <td>#{shortId(o.id)}</td>
                    <td className="small">{formatDate(o.createdAt)}</td>
                    <td className="small">
                      {o.shippingAddress.recipientName}
                      <br />
                      <span className="muted">
                        {o.shippingAddress.street}, {o.shippingAddress.city}
                      </span>
                    </td>
                    <td className="small">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      {NEXT[o.status] && (
                        <button className="btn btn-ghost" onClick={() => advance(o)}>
                          {NEXT[o.status]!.label}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={orders.data.totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
