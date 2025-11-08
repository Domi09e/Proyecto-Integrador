// client/src/admin/AdminRoutes.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminAuthProvider, { useAdminAuth } from "./adminAuth.context";
import AdminLayout from "./AdminLayout";
import AdminLoginPage from "./Pages/AdminLoginPage";
import AdminRegisterPage from "./Pages/AdminRegisterPage";
import AdminDashboard from "./Pages/AdminDashboard";
import TiendasPage from "./Pages/TiendasPage";
import UsuariosPage from "./Pages/UsuariosPage";
import PagosPage from "./Pages/PagosPage";
import ConfigPage from "./Pages/ConfigPage";

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
          <Route index element={<AdminDashboard />} />
          <Route path="tiendas" element={<TiendasPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="pagos" element={<PagosPage />} />
          <Route path="config" element={<ConfigPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
