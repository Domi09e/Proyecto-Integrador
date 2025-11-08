import { Link, Outlet, useNavigate } from "react-router-dom";
// Corregido: Se usan rutas absolutas desde la carpeta 'src' para evitar problemas de resolución.
import { useAuth } from "/src/context/authContext";
import { ProfileSidebar } from "/src/pages/UserSideBar";
import { Search, Globe, Heart } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [showMegaMenu, setShowMegaMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest("#megaMenu") &&
        !e.target.closest("#descubrirBtn")
      ) {
        setShowMegaMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const menuItems = [
    { label: "Descubrir BNPL", path: "/descubrir" },
    { label: "Cartera", path: "/cartera" },
    { label: "Pagos", path: "/pagos" },
    { label: "Tienda", path: "/tienda" },
    { label: "Atención al cliente", path: "/soporte" },
  ];

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-10 py-4 bg-white shadow-sm">
        {/* Logo */}
        <div className="text-2xl font-bold text-gray-900 tracking-tight">
          <Link to="/descubrir">BNPL</Link>
        </div>

        {/* Menú principal */}
        <ul className="hidden md:flex space-x-8 text-sm font-medium text-gray-700 relative">
          {menuItems.map((item, index) => (
            <li key={index} className="relative">
              <button
                id={
                  item.label === "Descubrir BNPL" ? "descubrirBtn" : undefined
                }
                onClick={() => {
                  if (item.label === "Descubrir BNPL") {
                    setShowMegaMenu(!showMegaMenu);
                  } else {
                    navigate(item.path);
                    setShowMegaMenu(false);
                  }
                }}
                onMouseEnter={() =>
                  item.label === "Descubrir BNPL" && setShowMegaMenu(true)
                }
                className={`hover:text-black transition-colors cursor-pointer ${
                  item.label === "Descubrir BNPL" && showMegaMenu
                    ? "font-semibold text-black"
                    : ""
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Iconos y perfil */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <button className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition">
                <Search size={18} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition">
                <Globe size={18} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition">
                <Heart size={18} />
              </button>
              <ProfileSidebar user={user} />
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 transition"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </nav>

      {/* Mega menú fijo debajo del navbar */}
      {showMegaMenu && (
        <div
          id="megaMenu"
          className="absolute top-[72px] left-0 w-full bg-white shadow-2xl border-t border-gray-100 z-40 animate-fade-down"
        >
          <div className="max-w-6xl mx-auto grid grid-cols-5 gap-8 p-10">
            {/* Columna 1 */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-900">
                Opciones de pago
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#">Todos los métodos</Link>
                </li>
                <li>
                  <Link to="#">Pagar en 4</Link>
                </li>
                <li>
                  <Link to="#">Pagar a plazos</Link>
                </li>
                <li>
                  <Link to="#">Pagar en 30 días</Link>
                </li>
                <li>
                  <Link to="#">Pago completo</Link>
                </li>
              </ul>
            </div>

            {/* Columna 2 */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-900">
                Compras y recompensas
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="../pages/Shops.jsx">Directorio de tiendas</Link>
                </li>
                <li>
                  <Link to="#">Cashback</Link>
                </li>
                <li>
                  <Link to="#">Membresías</Link>
                </li>
              </ul>
            </div>

            {/* Columna 3 */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-900">Herramientas</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#">Extensión del navegador</Link>
                </li>
              </ul>
            </div>

            {/* Columna 4 */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-900">Banca</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#">Tarjeta BNPL</Link>
                </li>
                <li>
                  <Link to="#">Crédito</Link>
                </li>
                <li>
                  <Link to="#">Balance</Link>
                </li>
              </ul>
            </div>

            {/* Columna 5 */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-900">
                Carteras digitales
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="#">Apple Pay</Link>
                </li>
                <li>
                  <Link to="#">Google Pay</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* --- CAMBIO CLAVE AQUÍ --- */}
      {/* Contenido principal sin restricciones de ancho */}
      {/* El padding top (pt-20 o similar) empuja el contenido hacia abajo para que no quede oculto por el navbar fijo */}
      <main className="pt-[72px]">
        <Outlet />
      </main>
    </>
  );
}
