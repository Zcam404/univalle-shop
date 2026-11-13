/**
 * Protección de rutas en el navegador. La seguridad real la aplica el API
 * Gateway; esto solo evita mostrar pantallas que el usuario no puede usar.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** Exige sesión: si no hay, envía a /ingresar y luego regresa a la página pedida. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Spinner />;
  if (!user) return <Navigate to="/ingresar" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Exige rol de administrador. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  return <RequireAuth>{isAdmin ? children : <Navigate to="/" replace />}</RequireAuth>;
}
