/**
 * Administración de categorías: crear, renombrar y eliminar (solo si no
 * tienen productos; si tienen, Catálogo responde con el motivo).
 */
import { useState, type FormEvent } from 'react';
import { catalogApi } from '../../api/endpoints';
import { ApiError } from '../../api/http';
import { Alert, Spinner } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';

export function AdminCategoriesPage() {
  const categories = useAsync(() => catalogApi.categories(), []);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
      categories.reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof ApiError ? err.message : 'No se pudo completar la acción.' });
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await run(() => catalogApi.createCategory({ name, description: description || null }), `Categoría "${name}" creada.`);
    setName('');
    setDescription('');
  };

  return (
    <>
      <form className="card form-card" onSubmit={create}>
        <h2>Nueva categoría</h2>
        <div className="form-grid">
          <label>
            Nombre
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Descripción (opcional)
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary">Crear categoría</button>
      </form>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {categories.loading && <Spinner />}
      {categories.data && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="muted">{c.description}</td>
                  <td className="actions">
                    <button
                      className="link-button"
                      onClick={() => {
                        const newName = prompt('Nuevo nombre de la categoría', c.name);
                        if (newName && newName !== c.name) void run(() => catalogApi.updateCategory(c.id, { name: newName }), 'Categoría renombrada.');
                      }}
                    >
                      Renombrar
                    </button>
                    <button
                      className="link-button danger"
                      onClick={() => confirm(`¿Eliminar "${c.name}"?`) && run(() => catalogApi.deleteCategory(c.id), 'Categoría eliminada.')}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
