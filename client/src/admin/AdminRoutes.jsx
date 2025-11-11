// client/src/admin/AdminRoutes.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminAuthProvider, { useAdminAuth } from "./context/adminAuth.context";
import AdminLayout from "./AdminLayout";
import AdminLoginPage from "./Pages/AdminLoginPage";
import AdminRegisterPage from "./Pages/AdminRegisterPage";
import AdminStores from "./Shop/TiendasPage";
import ClientPage from "./Pages/UsuariosPage";
import PagosPage from "./Pages/PagosPage";
import ConfigPage from "./settings/ConfigPage";

function AdminRoute({ children }){
  const { isAuthenticated, loading } = useAdminAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  return children;
}

export default function AdminRoutes(){
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Auth */}
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="register" element={<AdminRegisterPage />} />

        {/* Zona protegida */}
        <Route path="" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          {/* ⬇️ si entras a /admin, te manda a /admin/tiendas */}
          <Route path="clientes" element={<ClientPage />} />
          <Route path="pagos" element={<PagosPage />} />
        </Route>

        <Route path="tiendas" element={<AdminStores />} />
        <Route path="config" element={<ConfigPage />} />
      </Routes>
    </AdminAuthProvider>
  );
}

