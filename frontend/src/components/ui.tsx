/**
 * Componentes de interfaz pequeños y reutilizables: avisos, cargando,
 * paginación, estado de pedido e imagen de producto.
 */
import type { ReactNode } from 'react';
import type { OrderStatus } from '../api/types';
import { ORDER_STATUS_LABELS } from '../lib/format';

/** Mensaje destacado. `tone` define el color: información, éxito, advertencia o error. */
export function Alert({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warning' | 'error'; children: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/** Indicador de carga. */
export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner-dot" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Botones de página anterior/siguiente. No se muestra si hay una sola página. */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Paginación">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}

/** Etiqueta de color con el estado del pedido. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

/**
 * Imagen de producto con respaldo: si no hay URL o la imagen no carga, se
 * muestra un recuadro con la inicial del producto.
 */
export function ProductImage({ src, alt, className = '' }: { src: string | null | undefined; alt: string; className?: string }) {
  if (!src) return <ImageFallback alt={alt} className={className} />;
  return (
    <img
      className={`product-img ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = 'none';
        el.insertAdjacentHTML('afterend', `<div class="product-img img-fallback ${className}">${alt.charAt(0)}</div>`);
      }}
    />
  );
}

function ImageFallback({ alt, className }: { alt: string; className: string }) {
  return (
    <div className={`product-img img-fallback ${className}`} aria-label={alt}>
      {alt.charAt(0)}
    </div>
  );
}

/** Contenedor vacío con mensaje y acción opcional (ej. "Tu carrito está vacío"). */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
