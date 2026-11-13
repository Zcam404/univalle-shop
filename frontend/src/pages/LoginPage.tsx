/**
 * Inicio de sesión. Si el correo aún no está verificado, ofrece ir a
 * verificarlo. Al entrar, regresa a la página desde donde se pidió iniciar sesión.
 */
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { Alert } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'No se pudo iniciar sesión.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h1>Ingresar</h1>
      <label>
        Correo institucional
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && (
        <Alert tone="error">
          {error.message}{' '}
          {error.code === 'EMAIL_NOT_VERIFIED' && <Link to={`/verificar?email=${encodeURIComponent(email)}`}>Verificar ahora</Link>}
        </Alert>
      )}
      <button className="btn btn-primary btn-block" disabled={sending}>
        {sending ? 'Ingresando…' : 'Ingresar'}
      </button>
      <p className="muted small">
        ¿No tienes cuenta? <Link to="/registro">Regístrate con tu correo Univalle</Link>
      </p>
    </form>
  );
}
