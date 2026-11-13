/**
 * Caja de búsqueda del encabezado con sugerencias mientras se escribe.
 * Las sugerencias se piden 250 ms después de la última tecla, para no llamar
 * a la API en cada pulsación.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { searchApi } from '../api/endpoints';

export function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (text.trim().length < 2) return setSuggestions([]);
    const timer = setTimeout(() => {
      searchApi
        .suggestions(text)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text]);

  /** Va a la página de resultados. */
  const go = (q: string) => {
    setOpen(false);
    navigate(`/buscar?q=${encodeURIComponent(q.trim())}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) go(text);
  };

  return (
    <form className="search-box" role="search" onSubmit={submit}>
      <input
        type="search"
        placeholder="Buscar productos…"
        aria-label="Buscar productos"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setText(s);
                  go(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
