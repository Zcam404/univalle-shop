/**
 * Perfil del usuario: datos personales, direcciones de envío e historial de
 * búsquedas.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { searchApi, usersApi, type AddressInput } from '../api/endpoints';
import { ApiError } from '../api/http';
import type { Address } from '../api/types';
import { Alert } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { AFFILIATION_LABELS } from '../lib/format';

const EMPTY_ADDRESS: AddressInput = { label: '', street: '', city: 'Cali', department: 'Valle del Cauca', additionalInfo: '' };

/** Convierte cualquier error en un mensaje para mostrar. */
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.');

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [profileMsg, setProfileMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [draft, setDraft] = useState<AddressInput>(EMPTY_ADDRESS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const recent = useAsync(() => searchApi.recent(), []);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.updateMe({ name: profile.name, phone: profile.phone || null });
      await refreshUser();
      setProfileMsg({ tone: 'success', text: 'Datos actualizados.' });
    } catch (err) {
      setProfileMsg({ tone: 'error', text: messageOf(err) });
    }
  };

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    try {
      if (editingId) await usersApi.updateAddress(editingId, draft);
      else await usersApi.addAddress(draft);
      await refreshUser();
      setDraft(EMPTY_ADDRESS);
      setEditingId(null);
    } catch (err) {
      setAddressError(messageOf(err));
    }
  };

  /** Ejecuta una acción sobre una dirección y recarga el perfil. */
  const act = async (action: () => Promise<unknown>) => {
    setAddressError(null);
    try {
      await action();
      await refreshUser();
    } catch (err) {
      setAddressError(messageOf(err));
    }
  };

  const edit = (a: Address) => {
    setEditingId(a.id);
    setDraft({ label: a.label, street: a.street, city: a.city, department: a.department, additionalInfo: a.additionalInfo ?? '' });
  };

  return (
    <>
      <h1>Mi cuenta</h1>
      <div className="profile-grid">
        <form className="card form-card" onSubmit={saveProfile}>
          <h2>Datos personales</h2>
          <p className="muted small">
            {user.email} · {AFFILIATION_LABELS[user.affiliation]}
            {user.role === 'ADMIN' && ' · Administrador'}
          </p>
          <label>
            Nombre
            <input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label>
            Teléfono
            <input inputMode="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </label>
          {profileMsg && <Alert tone={profileMsg.tone}>{profileMsg.text}</Alert>}
          <button className="btn btn-primary">Guardar</button>
        </form>

        <section className="card form-card">
          <h2>Direcciones de envío</h2>
          {user.addresses.length === 0 && <p className="muted">Aún no tienes direcciones guardadas.</p>}
          <ul className="address-list">
            {user.addresses.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.label}</strong> {a.isDefault && <span className="badge badge-paid">Predeterminada</span>}
                  <br />
                  <span className="muted small">
                    {a.street}
                    {a.additionalInfo && `, ${a.additionalInfo}`} — {a.city}, {a.department}
                  </span>
                </div>
                <div className="row">
                  {!a.isDefault && (
                    <button className="link-button" onClick={() => act(() => usersApi.updateAddress(a.id, { isDefault: true }))}>
                      Predeterminar
                    </button>
                  )}
                  <button className="link-button" onClick={() => edit(a)}>
                    Editar
                  </button>
                  <button className="link-button danger" onClick={() => act(() => usersApi.removeAddress(a.id))}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={saveAddress} className="form-grid">
            <h3 className="span-2">{editingId ? 'Editar dirección' : 'Nueva dirección'}</h3>
            {(['label', 'street', 'additionalInfo', 'city', 'department'] as const).map((key) => (
              <label key={key} className={key === 'street' ? 'span-2' : ''}>
                {{ label: 'Nombre (ej. Casa)', street: 'Dirección', additionalInfo: 'Indicaciones', city: 'Ciudad', department: 'Departamento' }[key]}
                <input required={key !== 'additionalInfo'} value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
              </label>
            ))}
            {addressError && (
              <div className="span-2">
                <Alert tone="error">{addressError}</Alert>
              </div>
            )}
            <div className="row span-2">
              <button className="btn btn-primary">{editingId ? 'Guardar cambios' : 'Agregar dirección'}</button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(EMPTY_ADDRESS);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card form-card">
          <h2>Búsquedas recientes</h2>
          <p className="muted small">Las usamos para recomendarte productos.</p>
          {recent.data && recent.data.length > 0 ? (
            <>
              <div className="chips">
                {recent.data.map((r) => (
                  <Link key={r.text} className="chip" to={`/buscar?q=${encodeURIComponent(r.text)}`}>
                    {r.text}
                  </Link>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={() => searchApi.clearRecent().then(recent.reload)}>
                Borrar historial
              </button>
            </>
          ) : (
            <p className="muted">{recent.error ? 'No se pudo cargar el historial.' : 'Sin búsquedas todavía.'}</p>
          )}
        </section>
      </div>
    </>
  );
}
