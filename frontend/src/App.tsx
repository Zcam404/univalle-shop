/**
 * Rutas de la aplicación.
 *
 * | Ruta              | Página                         | Acceso        |
 * |-------------------|--------------------------------|---------------|
 * | /                 | Inicio                         | Público       |
 * | /productos        | Catálogo                       | Público       |
 * | /productos/:id    | Detalle de producto            | Público       |
 * | /buscar           | Resultados de búsqueda         | Público       |
 * | /ingresar, /registro, /verificar | Cuenta          | Público       |
 * | /carrito, /checkout, /pedidos, /perfil | Compras   | Con sesión    |
 * | /admin/*          | Panel de administración        | Solo admin    |
 */
import { Route, Routes } from 'react-router';
import { RequireAdmin, RequireAuth } from './components/Guards';
import { Layout } from './components/Layout';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SearchPage } from './pages/SearchPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="productos" element={<CatalogPage />} />
        <Route path="productos/:id" element={<ProductDetailPage />} />
        <Route path="buscar" element={<SearchPage />} />
        <Route path="ingresar" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="verificar" element={<VerifyEmailPage />} />

        <Route path="carrito" element={<RequireAuth><CartPage /></RequireAuth>} />
        <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="pedidos" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="pedidos/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
        <Route path="perfil" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminProductsPage />} />
          <Route path="categorias" element={<AdminCategoriesPage />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
