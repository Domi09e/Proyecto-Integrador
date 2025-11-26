import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  CreditCard,
  Settings,
  Bell,
  Heart,
  HelpCircle,
  Shield,
  Languages,
  LogOut,
  Gift,
  Star,
  RefreshCw,
  Wallet,
  X,
  Plus,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/authContext";
import api from "../api/axios"; // 👈 MUY IMPORTANTE

// Vistas internas del sidebar
const VIEWS = {
  OVERVIEW: "overview",
  PAYMENT_METHODS: "payment_methods",
  PAYMENT_PREFS: "payment_prefs",
  ACCOUNT_INFO: "account_info",
};

export function ProfileSidebar({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState(VIEWS.OVERVIEW);

  // datos que vienen del backend
  const [profile, setProfile] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentPreference, setPaymentPreference] = useState("4_quincenas");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // formulario de nuevo método de pago
  const [newMethod, setNewMethod] = useState({
    tipo: "tarjeta", // 👈 ahora sí coincide con el ENUM
    marca: "",  
    ultimos_cuatro_digitos: "",
    fecha_expiracion: "",
    es_predeterminado: 0,
  });

  const initialLetter = (
    user?.username ||
    user?.nombre ||
    profile?.nombre ||
    "?"
  )
    .charAt(0)
    .toUpperCase();

  const displayName =
    profile?.nombre || user?.username || `${profile?.nombre ?? ""}`;

  /* =========================================================
     BLOQUEAR SCROLL DEL BODY CUANDO ESTÁ ABIERTO
  ========================================================= */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* =========================================================
     CARGAR DATOS DEL CLIENTE AL ABRIR SIDEBAR
  ========================================================= */
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const [profileRes, methodsRes, prefRes] = await Promise.all([
          api.get("/client/profile"), // { id, nombre, apellido, email, telefono, direccion, poder_credito, ... }
          api.get("/client/payment-methods"), // array de metodosdepago
          api.get("/client/payment-preferences"), // { preferencia_bnpl: "4_biweekly" }
        ]);

        setProfile(profileRes.data || null);
        setPaymentMethods(methodsRes.data || []);
        setPaymentPreference(prefRes.data?.preferencia_bnpl || "4_quincenas");
      } catch (err) {
        console.error("Error cargando datos del cliente:", err);
        setErrorMsg("No se pudieron cargar los datos del perfil.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open]);

  /* =========================================================
     HANDLERS GENERALES
  ========================================================= */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleChangeNewMethod = (e) => {
    const { name, value, type, checked } = e.target;
    setNewMethod((m) => ({
      ...m,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  const handleSaveNewMethod = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        tipo: newMethod.tipo,
        marca: newMethod.marca.trim(),
        ultimos_cuatro_digitos: newMethod.ultimos_cuatro_digitos.trim(),
        fecha_expiracion: newMethod.fecha_expiracion.trim(),
        es_predeterminado: newMethod.es_predeterminado ? 1 : 0,
      };

      const { data } = await api.post("/client/payment-methods", payload);
      setPaymentMethods((prev) => [...prev, data]);

      // limpiar formulario
      setNewMethod({
        tipo: "tarjeta_credito",
        marca: "",
        ultimos_cuatro_digitos: "",
        fecha_expiracion: "",
        es_predeterminado: 0,
      });
    } catch (err) {
      console.error("Error guardando método de pago:", err);
      setErrorMsg("No se pudo guardar el método de pago.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultMethod = async (id) => {
    try {
      setSaving(true);
      const { data } = await api.put(`/client/payment-methods/${id}/default`);
      setPaymentMethods(data); // asume que el backend devuelve todos actualizados
    } catch (err) {
      console.error("Error marcando predeterminado:", err);
      setErrorMsg("No se pudo actualizar el método predeterminado.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreference = async () => {
    try {
      setSaving(true);
      await api.put("/client/payment-preferences", {
        preferencia_bnpl: paymentPreference,
      });
    } catch (err) {
      console.error("Error guardando preferencia de pago:", err);
      setErrorMsg("No se pudo guardar la preferencia de pago.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      const payload = {
        nombre: profile.nombre,
        apellido: profile.apellido,
        telefono: profile.telefono,
        _address: profile.address,
        get address() {
          return this._address;
        },
        set address(value) {
          this._address = value;
        },
      };
      const { data } = await api.put("/client/profile", payload);
      setProfile(data);
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      setErrorMsg("No se pudo actualizar la información.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     SUBVISTAS (CONTENIDO INTERNO DEL SIDEBAR)
  ========================================================= */

  const renderOverview = () => (
    <div className="p-6 space-y-6 text-gray-800">
      {/* Poder de compra y estado */}
      <div className="border rounded-xl p-4 flex justify-between items-center bg-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-700">Poder de compra</p>
          <p className="text-xs text-gray-500">
            Límite disponible para pagar con BNPL.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-indigo-700">
            {profile?.poder_credito != null
              ? `$${Number(profile.poder_credito).toFixed(2)}`
              : "No disponible"}
          </p>
        </div>
      </div>

      {/* Atajos principales */}
      <div className="space-y-4">
        <SectionHeader label="Beneficios" />
        <ShortcutItem icon={<Star size={18} />} label="Cashback" />
        <ShortcutItem icon={<Gift size={18} />} label="Invitar amigos" />

        <SectionHeader label="Ayuda" />
        <ShortcutItem
          icon={<HelpCircle size={18} />}
          label="Servicio al cliente"
        />
        <ShortcutItem icon={<Bell size={18} />} label="Notificaciones" />
        <ShortcutItem icon={<Heart size={18} />} label="Sugerencias" />

        <SectionHeader label="Cómo pagas" />
        <ShortcutItem
          icon={<Wallet size={18} />}
          label="Métodos de pago"
          onClick={() => setActiveView(VIEWS.PAYMENT_METHODS)}
        />
        <ShortcutItem
          icon={<RefreshCw size={18} />}
          label="Pagos automáticos"
        />
        <ShortcutItem
          icon={<CreditCard size={18} />}
          label="Preferencias de pago"
          onClick={() => setActiveView(VIEWS.PAYMENT_PREFS)}
        />

        <SectionHeader label="Centro de control" />
        <ShortcutItem
          icon={<User size={18} />}
          label="Información de cuenta"
          onClick={() => setActiveView(VIEWS.ACCOUNT_INFO)}
        />
        <ShortcutItem
          icon={<Shield size={18} />}
          label="Seguridad y privacidad"
        />
        <ShortcutItem icon={<Languages size={18} />} label="Idioma" />
        <ShortcutItem icon={<Settings size={18} />} label="Configuración" />
      </div>
    </div>
  );

  const renderPaymentMethods = () => (
    <div className="p-6 space-y-6 text-gray-800">
      <BackHeader
        title="Métodos de pago"
        onBack={() => setActiveView(VIEWS.OVERVIEW)}
      />

      {/* Bloque recomendado tipo Klarna */}
      <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4 mb-4">
        <span className="inline-block text-xs font-semibold text-violet-700 bg-violet-100 rounded-full px-3 py-0.5 mb-2">
          Recomendado
        </span>
        <h3 className="font-semibold text-gray-900 mb-1">
          Agrega una tarjeta o cuenta
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Compatible con la mayoría de nuestras opciones de pago flexibles.
        </p>
        <button
          onClick={() => {
            const el = document.getElementById("new-method-form");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="inline-flex items-center gap-2 bg-indigo-900 text-white text-sm px-4 py-2 rounded-full hover:bg-indigo-800"
        >
          <Plus size={16} /> Agregar método de pago
        </button>
      </div>

      {/* Lista de métodos existentes */}
      <div className="space-y-3">
        <p className="text-xs uppercase text-gray-400 mb-1">
          Otros métodos guardados
        </p>
        {paymentMethods.length === 0 && (
          <p className="text-sm text-gray-500">
            Aún no tienes métodos de pago guardados.
          </p>
        )}

        {paymentMethods.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between border rounded-xl px-3 py-2 bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">
                {m.marca || "tarjeta"} •••• {m.ultimos_cuatro_digitos}
              </p>
              <p className="text-xs text-gray-500">
                {m.tipo} — vence {m.fecha_expiracion}
              </p>
            </div>
            <button
              onClick={() => handleSetDefaultMethod(m.id)}
              className="flex items-center gap-1 text-xs text-indigo-700 hover:underline"
            >
              {m.es_predeterminado ? (
                <>
                  <Check size={14} /> Predeterminado
                </>
              ) : (
                "Marcar predeterminado"
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Formulario para agregar nuevo método */}
      <form
        id="new-method-form"
        onSubmit={handleSaveNewMethod}
        className="mt-4 space-y-3 border-t pt-4"
      >
        <p className="text-xs uppercase text-gray-400">Agregar nuevo método</p>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            Tipo de método
          </label>
          <select
            name="tipo"
            value={newMethod.tipo}
            onChange={handleChangeNewMethod}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="tarjeta">tarjeta</option>
            <option value="cuenta_bancaria">cuenta_bancaria</option>
            <option value="wallet_digital">wallet_digital</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Marca</label>
            <input
              name="marca"
              value={newMethod.marca}
              onChange={handleChangeNewMethod}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Visa, MasterCard..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Últimos 4 dígitos
            </label>
            <input
              name="ultimos_cuatro_digitos"
              value={newMethod.ultimos_cuatro_digitos}
              onChange={handleChangeNewMethod}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="1234"
              maxLength={4}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Fecha de expiración
            </label>
            <input
              name="fecha_expiracion"
              value={newMethod.fecha_expiracion}
              onChange={handleChangeNewMethod}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="MM/AA"
            />
          </div>
          <label className="flex items-center gap-2 text-xs mt-5">
            <input
              type="checkbox"
              name="es_predeterminado"
              checked={!!newMethod.es_predeterminado}
              onChange={handleChangeNewMethod}
            />
            Usar como predeterminado
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 rounded-full mt-2 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar método de pago"}
        </button>
      </form>
    </div>
  );

  const renderPaymentPrefs = () => (
    <div className="p-6 space-y-6 text-gray-800">
      <BackHeader
        title="Preferencias de pago"
        onBack={() => setActiveView(VIEWS.OVERVIEW)}
      />

      <p className="text-sm text-gray-600 mb-3">
        Define cómo te gustaría pagar normalmente tus compras con BNPL.
      </p>

      <div className="space-y-3">
        {[
          {
            value: "pago_completo",
            title: "Pagar en una sola vez",
            subtitle: "0% de interés",
          },
          {
            value: "pagar_despues",
            title: "Pagar después",
            subtitle: "0% de interés",
          },
          {
            value: "4_quincenas",
            title: "4 pagos quincenales",
            subtitle: "0% de interés en compras elegibles",
          },
          {
            value: "12_meses",
            title: "12 pagos mensuales",
            subtitle: "Se aplican intereses",
          },
          {
            value: "24_meses",
            title: "24 pagos mensuales",
            subtitle: "Se aplican intereses",
          },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPaymentPreference(opt.value)}
            className={`w-full flex items-center justify-between border rounded-xl px-3 py-3 text-left ${
              paymentPreference === opt.value
                ? "border-indigo-600 bg-indigo-50"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
              <p className="text-xs text-green-600">{opt.subtitle}</p>
            </div>
            <span
              className={`h-4 w-4 rounded-full border-2 ${
                paymentPreference === opt.value
                  ? "border-indigo-600 bg-indigo-600"
                  : "border-gray-400"
              }`}
            />
          </button>
        ))}
      </div>

      <button
        onClick={handleSavePreference}
        disabled={saving}
        className="w-full bg-indigo-900 text-white py-2 rounded-full mt-4 text-sm font-semibold hover:bg-indigo-800 disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar preferencia"}
      </button>
    </div>
  );

  const renderAccountInfo = () => (
    <div className="p-6 space-y-6 text-gray-800">
      <BackHeader
        title="Información de cuenta"
        onBack={() => setActiveView(VIEWS.OVERVIEW)}
      />

      {profile && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Nombre</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={profile.nombre || ""}
                onChange={(e) =>
                  setProfile({ ...profile, nombre: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Apellido
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={profile.apellido || ""}
                onChange={(e) =>
                  setProfile({ ...profile, apellido: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Teléfono</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={profile.telefono || ""}
              onChange={(e) =>
                setProfile({ ...profile, telefono: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Dirección
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={profile.address || ""}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2 rounded-full text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      )}
    </div>
  );

  /* =========================================================
     RENDER PRINCIPAL
  ========================================================= */

  return (
    <>
      {/* Botón flotante circular (abre/cierra) */}
      <button
        onClick={() => {
          setActiveView(VIEWS.OVERVIEW);
          setOpen(true);
        }}
        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold hover:bg-indigo-700 transition"
      >
        {initialLetter}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Fondo oscuro */}
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
              className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-50 flex flex-col overflow-y-auto"
            >
              {/* CABECERA SUPERIOR COMÚN */}
              <div className="p-6 border-b border-gray-200 relative">
                {/* Cerrar */}
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold mb-3">
                    {initialLetter}
                  </div>
                  <h2 className="text-lg font-semibold">{displayName}</h2>
                  <p className="text-sm text-gray-500">
                    {profile?.email || user?.email}
                  </p>
                </div>
              </div>

              {/* CONTENIDO SEGÚN VISTA */}
              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Cargando información...
                </div>
              ) : (
                <>
                  {errorMsg && (
                    <div className="mx-6 mt-4 mb-2 rounded-lg bg-red-100 text-red-700 text-xs px-3 py-2">
                      {errorMsg}
                    </div>
                  )}

                  {activeView === VIEWS.OVERVIEW && renderOverview()}
                  {activeView === VIEWS.PAYMENT_METHODS &&
                    renderPaymentMethods()}
                  {activeView === VIEWS.PAYMENT_PREFS && renderPaymentPrefs()}
                  {activeView === VIEWS.ACCOUNT_INFO && renderAccountInfo()}
                </>
              )}

              {/* FOOTER / CERRAR SESIÓN */}
              <div className="p-6 border-t border-gray-200 mt-auto">
                <button
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                  className="w-full bg-indigo-900 text-white py-3 rounded-full hover:bg-indigo-800 transition flex items-center justify-center gap-2 text-sm font-semibold"
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
    </>
  );
}

/* =========================================================
   COMPONENTES PEQUEÑOS DE APOYO
========================================================= */

function SectionHeader({ label }) {
  return (
    <p className="uppercase text-xs text-gray-400 mt-4 mb-1 font-semibold">
      {label}
    </p>
  );
}

function ShortcutItem({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition text-sm text-gray-800"
    >
      <div className="flex items-center gap-2">
        {icon}
        {label}
      </div>
      <span className="text-gray-400">{">"}</span>
    </button>
  );
}

function BackHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <button
        type="button"
        onClick={onBack}
        className="p-1 rounded-full hover:bg-gray-100"
      >
        <ArrowLeft size={18} />
      </button>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  );
}
