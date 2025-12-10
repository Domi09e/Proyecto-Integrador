import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminAuthProvider, { useAdminAuth } from "./context/adminAuth.context";
import AdminLayout from "./AdminLayout";


// --- PÁGINAS ---
import AdminLoginPage from "./Pages/AdminLoginPage";
import AdminRegisterPage from "./Pages/AdminRegisterPage";
import DashboardHome from "./Pages/DashboardHome"; // 👈 Nuevo Dashboard
import AdminStores from "./Shop/TiendasPage";
import ClientsPage from "./clients/clients";
import PagosPage from "./Pages/PagosPage";
import ConfigPage from "./settings/ConfigPage";
import UserManagement from "./settings/user_managment";
import UserEditPage from "./settings/UserEdit";
import DocumentsVerification from "./clients/DocumentsVerification";
import GroupsPage from "./groups/GroupsPage";
import SupportPage from "./Pages/SupportPage";
import AuditPage from "./settings/auditPage";


function AdminRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  return children;
}

export default function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* --- AUTH (Públicas) --- */}
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="register" element={<AdminRegisterPage />} />

        {/* --- ZONA PROTEGIDA (Con Sidebar y Header) --- */}
        <Route path="" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          
          {/* Dashboard Principal (se carga en /admin) */}
          <Route index element={<DashboardHome />} />

          {/* Gestión Financiera y Operativa */}
          <Route path="pagos" element={<PagosPage />} />
          <Route path="grupos" element={<GroupsPage />} />
          <Route path="tiendas" element={<AdminStores />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="verificacion" element={<DocumentsVerification />} />
          <Route path="soporte" element={<SupportPage />} />

          {/* Configuración del Sistema */}
          <Route path="config" element={<ConfigPage />} />
          <Route path="config/usuarios" element={<UserManagement />} />
          <Route path="config/usuarios/:id/edit" element={<UserEditPage />} />
          <Route path="auditoria" element={<AuditPage />} />
          
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}