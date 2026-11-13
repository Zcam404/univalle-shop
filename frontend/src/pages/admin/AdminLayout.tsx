/**
 * Marco del panel de administración con pestañas: productos, categorías y pedidos.
 */
import { NavLink, Outlet } from 'react-router';

export function AdminLayout() {
  return (
    <>
      <h1>Administración</h1>
      <nav className="tabs">
        <NavLink to="/admin" end>
          Productos
        </NavLink>
        <NavLink to="/admin/categorias">Categorías</NavLink>
        <NavLink to="/admin/pedidos">Pedidos</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
