import { useState } from "react";
import { useHref, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  CreditCard,
  Settings,
  Bell,
  Heart,
  HelpCircle,
  DollarSign,
  Shield,
  Languages,
  LogOut,
  Users,
  Gift,
  Star,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/authContext";

export function ProfileSidebar({ user }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sections = [
    {
      title: "Beneficios",
      items: [
        { icon: <Star size={18} />, label: "Cashback" },
        { icon: <Gift size={18} />, label: "Invitar amigos" },
      ],
    },
    {
      title: "Ayuda",
      items: [
        { icon: <HelpCircle size={18} />, label: "Servicio al cliente" },
        { icon: <Heart size={18} />, label: "Sugerencias" },
        { icon: <Bell size={18} />, label: "Notificaciones" },
      ],
    },
    {
      title: "Cómo pagas",
      items: [
        { icon: <Wallet size={18} />, label: "Métodos de pago" },
        { icon: <RefreshCw size={18} />, label: "Pagos automáticos" },
        { icon: <CreditCard size={18} />, label: "Preferencias de pago" },
      ],
    },
    {
      title: "Centro de control",
      items: [
        { icon: <User size={18} />, label: "Información de cuenta" },
        { icon: <Shield size={18} />, label: "Seguridad y privacidad" },
        { icon: <Languages size={18} />, label: "Idioma" },
        { icon: <Settings size={18} />, label: "Configuración" },
      ],
    },
  ];

  return (
    <>
      {/* Botón flotante circular */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold hover:bg-indigo-700 transition"
        >
          {user?.username?.charAt(0).toUpperCase()}
        </button>

        {/* Sidebar */}
        <AnimatePresence>
          {open && (
            <>
              {/* Fondo oscuro detrás del panel */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black z-40"
              />

              {/* Panel lateral */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 80 }}
                className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-50 flex flex-col justify-between overflow-y-auto"
              >
                {/* Encabezado */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold mb-3">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-lg font-semibold">{user?.username}</h2>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <button className="text-indigo-600 text-sm mt-2 hover:underline">
                      Editar información
                    </button>
                  </div>

                  <div className="flex justify-between mt-6 p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition">
                    <span className="text-sm font-medium">Poder de compra</span>
                    <span className="text-gray-500 text-sm">No disponible</span>
                  </div>
                </div>

                {/* Contenido principal */}
                <div className="p-6 space-y-6 text-gray-800">
                  {sections.map((section, i) => (
                    <div key={i}>
                      <h3 className="uppercase text-xs text-gray-400 mb-3 font-semibold">
                        {section.title}
                      </h3>
                      <ul className="space-y-3">
                        {section.items.map((item, j) => (
                          <li
                            key={j}
                            className="flex items-center justify-between hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2 text-sm">
                              {item.icon}
                              {item.label}
                            </div>
                            <span className="text-gray-400">{">"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Cerrar sesión */}
                <div className="p-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                    className="w-full bg-indigo-900 text-white py-3 rounded-full hover:bg-indigo-800 transition flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> Cerrar sesión
                  </button>

                  <p className="text-xs text-center text-gray-400 mt-3">
                    Versión 1.0.0 • BNPL App
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
