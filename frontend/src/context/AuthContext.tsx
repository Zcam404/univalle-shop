/**
 * Contexto de sesión.
 *
 * Guarda quién inició sesión y ofrece `login`, `logout` y `refreshUser` a toda
 * la aplicación. El token se conserva en el almacenamiento del navegador para
 * que la sesión sobreviva a recargar la página; al arrancar se valida pidiendo
 * el perfil. Si el gateway responde 401 (token vencido), se cierra la sesión.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, usersApi } from '../api/endpoints';
import { getStoredToken, setStoredToken, setUnauthorizedHandler } from '../api/http';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  /** `true` mientras se comprueba la sesión guardada al abrir la página. */
  checking: boolean;
  isAdmin: boolean;
  /** @throws ApiError Si las credenciales no son válidas o el correo no está verificado. */
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  /** Vuelve a pedir el perfil (después de editarlo o agregar direcciones). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => getStoredToken() !== null);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  // Al abrir la página: si hay un token guardado, se comprueba pidiendo el perfil.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getStoredToken()) return;
    usersApi
      .me()
      .then(setUser)
      .catch(() => {
        /* el manejador de 401 cierra la sesión; otros errores dejan al usuario como anónimo */
      })
      .finally(() => setChecking(false));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setStoredToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await usersApi.me());
  }, []);

  const value = useMemo(
    () => ({ user, checking, isAdmin: user?.role === 'ADMIN', login, logout, refreshUser }),
    [user, checking, login, logout, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Acceso al contexto de sesión desde cualquier componente. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
