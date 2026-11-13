/**
 * Verificación del correo con el código de 6 dígitos. Permite pedir un código
 * nuevo si no llegó o venció. En desarrollo los correos se ven en MailHog
 * (http://localhost:8025).
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/http';
import { Alert } from '../components/ui';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(
    params.get('noenviado')
      ? { tone: 'warning', text: 'Tu cuenta se creó, pero no pudimos enviar el código. Pide uno nuevo.' }
      : null,
  );
  const [verified, setVerified] = useState(false);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await authApi.verifyEmail(email, code);
      setVerified(true);
      setStatus({ tone: 'success', text: '¡Correo verificado! Ya puedes ingresar.' });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof ApiError ? err.message : 'No se pudo verificar.' });
    }
  };

  const resend = async () => {
    try {
      await authApi.resendCode(email);
      setStatus({ tone: 'info', text: 'Te enviamos un código nuevo. El anterior ya no sirve.' });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof ApiError ? err.message : 'No se pudo reenviar el código.' });
    }
  };

  return (
    <form className="card auth-card" onSubmit={verify}>
      <h1>Verifica tu correo</h1>
      <p className="muted small">Te enviamos un código de 6 dígitos a tu correo institucional. Vence en 15 minutos.</p>
      <label>
        Correo
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Código
        <input
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          className="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      {status && <Alert tone={status.tone}>{status.text}</Alert>}
      {verified ? (
        <Link to="/ingresar" className="btn btn-primary btn-block">
          Ingresar
        </Link>
      ) : (
        <>
          <button className="btn btn-primary btn-block">Verificar</button>
          <button type="button" className="btn btn-ghost btn-block" onClick={resend} disabled={!email}>
            Enviar un código nuevo
          </button>
        </>
      )}
    </form>
  );
}
