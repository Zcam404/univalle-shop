/**
 * Hook `useAsync`: ejecuta una función asíncrona (normalmente una llamada a la
 * API) y expone su estado: cargando, datos o error. Se vuelve a ejecutar
 * cuando cambian las dependencias, y `reload()` la repite a pedido.
 *
 * Si las dependencias cambian antes de que termine una llamada anterior, el
 * resultado viejo se descarta para no mostrar datos desactualizados.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/http';

export interface AsyncState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  reload: () => void;
  /** Reemplaza los datos localmente (ej. después de una acción que devuelve el recurso actualizado). */
  setData: (data: T) => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const call = ++latest.current;
    setLoading(true);
    setError(undefined);
    fn()
      .then((result) => {
        if (call === latest.current) setData(result);
      })
      .catch((err: unknown) => {
        if (call !== latest.current) return;
        setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Ocurrió un error inesperado.'));
      })
      .finally(() => {
        if (call === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, setData };
}
