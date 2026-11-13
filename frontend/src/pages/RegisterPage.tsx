/**
 * Registro para integrantes de la Universidad del Valle. El servicio de
 * Usuarios valida que el correo sea institucional y envía un código de
 * verificación; después se pasa a la página de verificación.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/http';
import type { Affiliation } from '../api/types';
import { Alert } from '../components/ui';
import { AFFILIATION_LABELS } from '../lib/format';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', affiliation: 'STUDENT' as Affiliation });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const result = await authApi.register(form);
      navigate(`/verificar?email=${encodeURIComponent(result.user.email)}${result.verificationEmailSent ? '' : '&noenviado=1'}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h1>Crear cuenta</h1>
      <p className="muted small">Solo para estudiantes, docentes y administrativos con correo de la Universidad del Valle.</p>
      <label>
        Nombre completo
        <input required minLength={2} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label>
        Correo institucional
        <input
          type="email"
          required
          placeholder="nombre.apellido@correounivalle.edu.co"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <span className="hint">Mínimo 8 caracteres, con al menos una letra y un número.</span>
      </label>
      <label>
        Vinculación con la universidad
        <select value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value as Affiliation })}>
          {Object.entries(AFFILIATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && <Alert tone="error">{error}</Alert>}
      <button className="btn btn-primary btn-block" disabled={sending}>
        {sending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
      <p className="muted small">
        ¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link>
      </p>
    </form>
  );
}
