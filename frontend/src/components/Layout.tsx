/**
 * Estructura común de todas las páginas: encabezado con búsqueda, carrito y
 * menú de cuenta; contenido; y pie de página.
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SearchBox } from './SearchBox';

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="header">
        <div className="container header-row">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">U</span>
            Univalle <span>Shop</span>
          </Link>
          <SearchBox />
          <nav className="header-nav">
            <NavLink to="/productos">Productos</NavLink>
            {user ? (
              <>
                <NavLink to="/pedidos">Mis pedidos</NavLink>
                {isAdmin && <NavLink to="/admin">Administrar</NavLink>}
                <NavLink to="/perfil" title={user.email}>
                  {user.name.split(' ')[0]}
                </NavLink>
                <button
                  className="link-button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Salir
                </button>
              </>
            ) : (
              <NavLink to="/ingresar">Ingresar</NavLink>
            )}
            <NavLink to="/carrito" className="cart-link" aria-label={`Carrito: ${cart.totalItems} productos`}>
              🛒 <span className="cart-count">{cart.totalItems}</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          Univalle Shop · Tienda exclusiva para estudiantes, docentes y administrativos de la Universidad del Valle.
        </div>
      </footer>
    </div>
  );
}
