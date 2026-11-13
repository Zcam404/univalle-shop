/** Página para rutas que no existen. */
import { Link } from 'react-router';
import { EmptyState } from '../components/ui';

export function NotFoundPage() {
  return (
    <EmptyState title="Esta página no existe">
      <Link to="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </EmptyState>
  );
}
