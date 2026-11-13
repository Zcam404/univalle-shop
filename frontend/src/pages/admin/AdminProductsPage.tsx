/**
 * Administración de productos: crear, editar, activar/desactivar y ajustar
 * inventario. Muestra también los productos desactivados.
 */
import { useState, type FormEvent } from 'react';
import { catalogApi, type ProductInput } from '../../api/endpoints';
import { ApiError } from '../../api/http';
import type { Product } from '../../api/types';
import { Alert, Pagination, ProductImage, Spinner } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { formatPrice } from '../../lib/format';

/** Formulario: los números se editan como texto y las imágenes como una URL por línea. */
interface Draft {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  images: string;
  stock: string;
}

const EMPTY: Draft = { name: '', description: '', price: '', categoryId: '', images: '', stock: '0' };

export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const products = useAsync(() => catalogApi.products({ page, pageSize: 10, includeInactive: true, sort: 'newest' }), [page]);
  const categories = useAsync(() => catalogApi.categories(), []);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  /** Ejecuta una acción, muestra el resultado y recarga la lista. */
  const run = async (action: () => Promise<unknown>, success: string) => {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
      products.reload();
      return true;
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof ApiError ? err.message : 'No se pudo completar la acción.' });
      return false;
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data: ProductInput = {
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      categoryId: draft.categoryId,
      images: draft.images.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    const ok = editing
      ? await run(() => catalogApi.updateProduct(editing.id, data), `"${data.name}" actualizado.`)
      : await run(() => catalogApi.createProduct({ ...data, stock: Number(draft.stock) }), `"${data.name}" creado.`);
    if (ok) {
      setDraft(EMPTY);
      setEditing(null);
    }
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setDraft({
      name: p.name,
      description: p.description,
      price: String(p.price),
      categoryId: p.category?.id ?? '',
      images: p.images.join('\n'),
      stock: String(p.stock),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const adjust = (p: Product) => {
    const value = prompt(`Unidades a sumar (o restar con signo menos) para "${p.name}". Stock actual: ${p.stock}`);
    const delta = Number(value);
    if (value && Number.isInteger(delta) && delta !== 0) {
      void run(() => catalogApi.adjustStock(p.id, delta), `Inventario de "${p.name}" ajustado.`);
    }
  };

  return (
    <>
      <form className="card form-card" onSubmit={submit}>
        <h2>{editing ? `Editar: ${editing.name}` : 'Nuevo producto'}</h2>
        <div className="form-grid">
          <label>
            Nombre
            <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            Categoría
            <select required value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
              <option value="">Elige una…</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Precio (COP)
            <input required inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </label>
          {!editing && (
            <label>
              Stock inicial
              <input required inputMode="numeric" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
            </label>
          )}
          <label className="span-2">
            Descripción
            <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <label className="span-2">
            Imágenes (una URL por línea, máximo 8)
            <textarea rows={2} value={draft.images} onChange={(e) => setDraft({ ...draft, images: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <button className="btn btn-primary">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {products.loading && <Spinner />}
      {products.error && <Alert tone="error">{products.error.message}</Alert>}
      {products.data && (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th />
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.data.items.map((p) => (
                  <tr key={p.id} className={p.active ? '' : 'inactive'}>
                    <td>
                      <ProductImage src={p.images[0]} alt={p.name} className="mini" />
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      <br />
                      <span className="muted small">{p.category?.name}</span>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>{p.active ? <span className="badge badge-paid">Activo</span> : <span className="badge badge-muted">Inactivo</span>}</td>
                    <td className="actions">
                      <button className="link-button" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                      <button className="link-button" onClick={() => adjust(p)}>
                        Inventario
                      </button>
                      <button
                        className="link-button"
                        onClick={() =>
                          run(() => catalogApi.updateProduct(p.id, { active: !p.active }), `"${p.name}" ${p.active ? 'desactivado' : 'activado'}.`)
                        }
                      >
                        {p.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={products.data.totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
