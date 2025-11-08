import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { ProtectedRoute } from "./routes";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import Descubrir from "./pages/BNPL";
import Cartera from "./pages/Wallet";
import Pagos from "./pages/Payments";
import Tienda from "./pages/Shops";
import Soporte from "./pages/Support";
import AdminRoutes from "./admin/AdminRoutes.jsx";
import AdminStores from "./admin/Pages/TiendasPage.jsx";
import StoreForm from "./admin/components/AggTienda.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        {/* Ramas del ADMIN (sin afectar el Navbar del cliente) */}
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/tiendas" element={<AdminStores />} />
          <Route path="/AggTienda" element={<StoreForm />} />
          

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            <Route path="/cartera" element={<Cartera />} />
            <Route path="/pagos" element={<Pagos />} />
          </Route>
          {/* Rutas con layout (Navbar) */}
          <Route element={<Navbar />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/descubrir" element={<Descubrir />} />
            <Route path="/tienda" element={<Tienda />} />
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
