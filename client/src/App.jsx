import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { ProtectedRoute } from "./routes";
import Navbar from "./components/Navbar";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import Descubrir from "./pages/BNPL";
import Cartera from "./pages/Wallet";
import Pagos from "./pages/Payments";
import Tienda from "./pages/Shops";
import Soporte from "./pages/Support";
import AdminRoutes from "./admin/AdminRoutes.jsx";
import AggTienda from "./admin/Shop/AggTienda.jsx";
import ClientsPage from "./admin/clients/clients.jsx";
import PartnerRequestPage from "./pages/partnerRequest.jsx";
import StoreDetailPage from "./pages/StoreDetail.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/AggTienda" element={<AggTienda />} />
          <Route path="/clientes" element={<ClientsPage />} />
          
          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            <Route path="/cartera" element={<Cartera />} />
            <Route path="/pagos" element={<Pagos />} />
          </Route>
          {/* Rutas con layout (Navbar) */}
          <Route element={<Navbar />}>
            <Route path="/" element={<Descubrir />} />
            <Route path="/descubrir" element={<Descubrir />} />
            <Route path="/tienda" element={<Tienda />} />
            <Route path="/quiero-ser-tienda-bnpl" element={<PartnerRequestPage />} />
            <Route path="/tiendas/:id" element={<StoreDetailPage />} />
            <Route path="/soporte" element={<Soporte />} />
            <Route path="/cartera" element={<Cartera />} />
            <Route path="/pagos" element={<Pagos />} />
          </Route>

          {/* Rutas independientes: login y register */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
