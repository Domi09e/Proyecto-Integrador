// client/src/pages/UserSideBar.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Wallet,
  X,
  Plus,
  Check,
  ArrowLeft,
  Calendar,
  Hash,
  Briefcase,
  Smartphone,
  Shield,
  Languages,
  Heart,
  HelpCircle,
  RefreshCw,
  Gift,
  Star,
  FileText,     
  UploadCloud,  
  Clock,        
  AlertCircle,
  PiggyBank // <--- 1. NUEVO IMPORT
} from "lucide-react";
import { useAuth } from "../context/authContext";
import api from "../api/axios";

// Vistas internas del sidebar
const VIEWS = {
  OVERVIEW: "overview",
  PAYMENT_METHODS: "payment_methods",
  PAYMENT_PREFS: "payment_prefs",
  ACCOUNT_INFO: "account_info",
  NOTIFICATIONS: "notifications",
};

export function ProfileSidebar({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState(VIEWS.OVERVIEW);

  // Estados de datos
  const [profile, setProfile] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentPreference, setPaymentPreference] = useState("4_quincenas");
  const [notifications, setNotifications] = useState([]);
  const [docs, setDocs] = useState([]); 
  const [notifUnread, setNotifUnread] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Formulario Nuevo Método
  const [newMethod, setNewMethod] = useState({
    tipo: "tarjeta", 
    marca: "",
    ultimos_cuatro_digitos: "",
    fecha_expiracion: "",
    es_predeterminado: false,
  });

  // Formulario Nuevo Documento
  const [newDoc, setNewDoc] = useState({
    tipo_codigo: "CEDULA",
    numero_documento: "",
    file: null,
  });

  const [showAddForm, setShowAddForm] = useState(false); 

  // Iniciales y Nombre
  const initialLetter = (user?.nombre || "?").charAt(0).toUpperCase();
  const displayName = profile?.nombre || user?.nombre || "Usuario";

  // Bloquear scroll del body cuando el sidebar está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cargar datos al abrir el sidebar
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        setLoading(true);
        const [profileRes, methodsRes, prefRes, notifRes, docsRes] =
          await Promise.all([
            api.get("/client/profile"),
            api.get("/client/payment-methods"),
            api.get("/client/payment-preferences"),
            api.get("/client/notifications"),
            api.get("/client/documentos"),
          ]);

        setProfile(profileRes.data);
        setPaymentMethods(methodsRes.data);
        setPaymentPreference(prefRes.data?.preferencia_bnpl || "4_quincenas");

        const listaNotif = notifRes.data.notifications || [];
        setNotifications(listaNotif);

        const unread =
          notifRes.data.unread_count ??
          listaNotif.filter((n) => n.is_new).length;
        setNotifUnread(unread);

        setDocs(docsRes.data || []);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  // --- Handlers ---
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // --- Handler Documentos ---
  const handleChangeNewDoc = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setNewDoc((d) => ({ ...d, file: files[0] }));
    } else {
      setNewDoc((d) => ({ ...d, [name]: value }));
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!newDoc.file || !newDoc.numero_documento) {
      setErrorMsg("Debes subir una foto y escribir el número.");
      return;
    }
    try {
      setSaving(true);
      setErrorMsg("");

      const fd = new FormData();
      fd.append("tipo_codigo", newDoc.tipo_codigo);
      fd.append("numero_documento", newDoc.numero_documento);
      fd.append("archivo", newDoc.file);

      const { data } = await api.post("/client/documentos", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocs((prev) => [data, ...prev]);

      setNewDoc({ tipo_codigo: "CEDULA", numero_documento: "", file: null });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Error al subir documento.");
    } finally {
      setSaving(false);
    }
  };

  // --- Handler Tarjetas ---
  const handleSaveNewMethod = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    if (newMethod.ultimos_cuatro_digitos.length !== 4) {
      setErrorMsg("Deben ser exactamente 4 dígitos.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...newMethod,
        es_predeterminado: newMethod.es_predeterminado ? 1 : 0,
      };

      const { data } = await api.post("/client/payment-methods", payload);

      setPaymentMethods((prev) => [data, ...prev]);

      setNewMethod({
        tipo: "tarjeta",
        marca: "",
        ultimos_cuatro_digitos: "",
        fecha_expiracion: "",
        es_predeterminado: false,
      });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Error guardando método.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const { data } = await api.put(`/client/payment-methods/${id}/default`);
      const updated = paymentMethods.map((m) => ({
        ...m,
        es_predeterminado: m.id === id ? 1 : 0,
      }));
      setPaymentMethods(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePreference = async () => {
    try {
      setSaving(true);
      await api.put("/client/payment-preferences", {
        preferencia_bnpl: paymentPreference,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.post("/client/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_new: false })));
      setNotifUnread(0);
    } catch (err) {
      console.error(err);
    }
  };

  // --- RENDERIZADORES DE VISTAS ---

  const renderOverview = () => (
    <div className="p-6 space-y-6">
      {/* Tarjeta de Crédito Disponible */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 group transition-transform hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
          Crédito Disponible
        </p>
        <div className="flex justify-between items-end">
          <h3 className="text-3xl font-extrabold tracking-tight">
            RD$ {Number(profile?.poder_credito || 0).toLocaleString()}
          </h3>
          <Wallet className="text-white/50" size={32} />
        </div>
        <div className="mt-6 flex justify-between items-center text-xs text-indigo-100">
          <span>BNPL Virtual</span>
          <span className="font-mono">
            •••• {user?.id?.toString().padStart(4, "0")}
          </span>
        </div>
      </div>

      {/* Menú de Accesos Directos */}
      <div className="space-y-4">
        <SectionHeader label="Finanzas" />
        <MenuItem
          icon={<CreditCard size={20} />}
          label="Métodos de Pago"
          onClick={() => setActiveView(VIEWS.PAYMENT_METHODS)}
        />
        <MenuItem
          icon={<RefreshCw size={20} />}
          label="Preferencias de Pago"
          onClick={() => setActiveView(VIEWS.PAYMENT_PREFS)}
        />
        
        {/* --- 2. NUEVO ITEM SNBL --- */}
        <MenuItem
          icon={<PiggyBank size={20} />}
          label="Mis Metas SNBL"
          onClick={() => {
             navigate("/ahorros");
             setOpen(false);
          }}
        />

        <SectionHeader label="Cuenta" />
        <MenuItem
          icon={<User size={20} />}
          label="Mi Perfil"
          onClick={() => setActiveView(VIEWS.ACCOUNT_INFO)}
        />
        <MenuItem
          icon={<Bell size={20} />}
          label="Notificaciones"
          badge={notifUnread}
          onClick={() => setActiveView(VIEWS.NOTIFICATIONS)}
        />

        <SectionHeader label="Soporte" />
        <MenuItem
          icon={<HelpCircle size={20} />}
          label="Ayuda"
          onClick={() => {}}
        />
      </div>
    </div>
  );

  const renderPaymentMethods = () => (
    <div className="p-6 h-full flex flex-col">
      <BackHeader
        title="Billetera"
        onBack={() => setActiveView(VIEWS.OVERVIEW)}
      />

      <div className="flex-1 overflow-y-auto pr-1 pb-20 no-scrollbar">
        {/* Toggle Formulario */}
        <AnimatePresence>
          {showAddForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-6 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 text-sm">
                    Nueva Tarjeta / Cuenta
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-white p-1 rounded-full shadow-sm text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* VISUALIZADOR DE TARJETA (PREVIEW) */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-950 rounded-2xl p-5 text-white mb-6 shadow-xl relative overflow-hidden transition-all duration-500">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>

                  <div className="relative z-10 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-300 uppercase tracking-[0.2em] font-bold">
                        {newMethod.tipo.replace("_", " ")}
                      </span>
                      {/* Chip Simulado */}
                      <div className="w-9 h-7 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded flex items-center justify-center opacity-90 shadow-sm">
                        <div className="w-5 h-4 border border-yellow-700/30 rounded-sm grid grid-cols-2">
                          <div className="border-r border-yellow-700/30"></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className="text-xl font-mono tracking-widest text-slate-100 drop-shadow-md">
                        •••• •••• •••• {newMethod.ultimos_cuatro_digitos || "0000"}
                      </p>
                    </div>

                    <div className="flex justify-between items-end mt-auto">
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">
                          Titular
                        </p>
                        <p className="text-xs font-bold uppercase truncate w-32 tracking-wide">
                          {newMethod.marca || "TU BANCO"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5 text-right">
                          Expira
                        </p>
                        <p className="text-xs font-bold font-mono">
                          {newMethod.fecha_expiracion || "MM/AA"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={handleSaveNewMethod} className="space-y-4">
                  {/* Tipo Selector */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-200/50 p-1 rounded-xl">
                    {["tarjeta", "cuenta_bancaria", "wallet_digital"].map(
                      (t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewMethod({ ...newMethod, tipo: t })}
                          className={`text-[10px] py-2 rounded-lg font-bold transition-all ${
                            newMethod.tipo === t
                              ? "bg-white text-indigo-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {t.replace("_", " ")}
                        </button>
                      )
                    )}
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3">
                    {/* Marca / Banco */}
                    <div className="relative group">
                      <Briefcase
                        className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                        size={16}
                      />
                      <input
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-700"
                        placeholder="Banco o Alias (Ej. Popular)"
                        value={newMethod.marca}
                        onChange={(e) =>
                          setNewMethod({ ...newMethod, marca: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Últimos 4 */}
                      <div className="relative group">
                        <Hash
                          className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                          size={16}
                        />
                        <input
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-700"
                          placeholder="Últimos 4"
                          maxLength={4}
                          value={newMethod.ultimos_cuatro_digitos}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ""); // Solo números
                            setNewMethod({
                              ...newMethod,
                              ultimos_cuatro_digitos: val,
                            });
                          }}
                        />
                      </div>
                      {/* Expiración */}
                      <div className="relative group">
                        <Calendar
                          className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                          size={16}
                        />
                        <input
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-700"
                          placeholder="MM/AA"
                          maxLength={5}
                          value={newMethod.fecha_expiracion}
                          onChange={(e) =>
                            setNewMethod({
                              ...newMethod,
                              fecha_expiracion: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Switch Default */}
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                    <div
                      className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                        newMethod.es_predeterminado
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${
                          newMethod.es_predeterminado ? "translate-x-5" : ""
                        }`}
                      ></div>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={newMethod.es_predeterminado}
                      onChange={(e) =>
                        setNewMethod({
                          ...newMethod,
                          es_predeterminado: e.target.checked,
                        })
                      }
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      Usar como método principal
                    </span>
                  </label>

                  {errorMsg && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar Método"}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            /* Botón para abrir formulario */
            <button
              onClick={() => setShowAddForm(true)}
              className="group w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition mb-6"
            >
              <div className="bg-slate-100 group-hover:bg-white p-2 rounded-full shadow-sm transition">
                <Plus size={18} />
              </div>
              <span className="font-bold text-sm">Agregar nueva tarjeta</span>
            </button>
          )}
        </AnimatePresence>

        {/* LISTA DE MÉTODOS */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 pl-1">
            Mis Tarjetas Guardadas
          </h4>

          {paymentMethods.length === 0 && !showAddForm && (
            <div className="text-center py-8">
              <div className="inline-block p-3 bg-slate-50 rounded-full mb-2">
                <CreditCard className="text-slate-300" size={24} />
              </div>
              <p className="text-sm text-slate-400 font-medium">
                No tienes métodos guardados.
              </p>
            </div>
          )}

          {paymentMethods.map((m) => (
            <div
              key={m.id}
              className="group relative bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md hover:border-indigo-100 transition-all cursor-default"
            >
              {/* Icono del método */}
              <div
                className={`w-12 h-10 rounded-lg bg-gradient-to-br ${
                  m.tipo === "tarjeta"
                    ? "from-slate-700 to-slate-900"
                    : m.tipo === "wallet_digital"
                    ? "from-blue-500 to-blue-600"
                    : "from-emerald-500 to-teal-600"
                } flex items-center justify-center text-white shadow-sm shrink-0`}
              >
                {m.tipo === "tarjeta" ? (
                  <CreditCard size={18} />
                ) : m.tipo === "wallet_digital" ? (
                  <Smartphone size={18} />
                ) : (
                  <Wallet size={18} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {m.marca || "Método genérico"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500 font-mono tracking-wide">
                    •••• {m.ultimos_cuatro_digitos}
                  </p>
                  {m.fecha_expiracion && (
                    <span className="text-[10px] text-slate-300">
                      • {m.fecha_expiracion}
                    </span>
                  )}
                </div>
              </div>

              {m.es_predeterminado ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={9} strokeWidth={4} /> MAIN
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => handleSetDefault(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition"
                >
                  Usar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
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
            onClick={() => setPaymentPreference(opt.value)}
            className={`w-full flex items-center justify-between border rounded-xl px-3 py-3 text-left transition-colors ${
              paymentPreference === opt.value
                ? "border-indigo-600 bg-indigo-50"
                : "bg-white border-slate-200"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
              <p className="text-xs text-emerald-600">{opt.subtitle}</p>
            </div>
            {paymentPreference === opt.value && (
              <Check size={16} className="text-indigo-600" />
            )}
          </button>
        ))}
      </div>
      <button
        onClick={handleSavePreference}
        disabled={saving}
        className="w-full bg-indigo-900 text-white py-3 rounded-xl mt-4 text-sm font-bold hover:bg-indigo-800"
      >
        {saving ? "Guardando..." : "Guardar preferencia"}
      </button>
    </div>
  );

  // --- RENDERIZADOR: CUENTA Y DOCUMENTOS ---
  const renderAccountInfo = () => (
    <div className="p-6 space-y-6 text-gray-800 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <BackHeader
        title="Mi Cuenta"
        onBack={() => setActiveView(VIEWS.OVERVIEW)}
      />

      {/* Datos Personales */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <User size={14} /> Datos Personales
        </p>
        <div className="space-y-2">
          <InfoRow
            label="Nombre"
            value={`${profile?.nombre} ${profile?.apellido}`}
          />
          <InfoRow label="Email" value={profile?.email} />
          <InfoRow label="Teléfono" value={profile?.telefono || "—"} />
        </div>
      </div>

      {/* --- SECCIÓN DOCUMENTOS / KYC --- */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-indigo-900 font-bold uppercase tracking-wider flex items-center gap-2">
            <Shield size={14} /> Verificación de Identidad
          </p>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              profile?.poder_credito > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {profile?.poder_credito > 0 ? "Verificado" : "Pendiente"}
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Sube tu Cédula o Pasaporte para desbloquear tu crédito BNPL.
        </p>

        {/* Formulario Documentos */}
        <form
          onSubmit={handleUploadDoc}
          className="space-y-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
        >
          <div className="grid grid-cols-3 gap-2">
            <select
              name="tipo_codigo"
              value={newDoc.tipo_codigo}
              onChange={handleChangeNewDoc}
              className="col-span-1 bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-2 outline-none font-medium"
            >
              <option value="CEDULA">Cédula</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
            <input
              name="numero_documento"
              value={newDoc.numero_documento}
              onChange={handleChangeNewDoc}
              placeholder="Número doc."
              className="col-span-2 bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 outline-none"
            />
          </div>

          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
            <div className="flex flex-col items-center justify-center pt-2 pb-3">
              {newDoc.file ? (
                <>
                  <Check size={20} className="text-emerald-500 mb-1" />
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    {newDoc.file.name}
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud size={20} className="text-slate-400 mb-1" />
                  <p className="text-[10px] text-slate-500">
                    Toca para subir foto
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleChangeNewDoc}
            />
          </label>

          {errorMsg && (
            <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {saving ? "Enviando..." : "Enviar a Revisión"}
          </button>
        </form>

        {/* Lista Documentos */}
        <div className="mt-4 space-y-2">
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100"
            >
              <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                <FileText size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700">
                  {d.tipo?.nombre || d.tipo_codigo}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {d.numero_documento}
                </p>
              </div>
              <div>
                {d.estado === "verificado" && (
                  <span className="text-emerald-500">
                    <Check size={16} />
                  </span>
                )}
                {d.estado === "pendiente" && (
                  <span className="text-amber-500">
                    <Clock size={16} />
                  </span>
                )}
                {d.estado === "rechazado" && (
                  <span className="text-rose-500">
                    <AlertCircle size={16} />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="p-6 h-full flex flex-col">
      <BackHeader
        title="Notificaciones"
        onBack={() => setActiveView(VIEWS.OVERVIEW)}
      />
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase">Recientes</p>
        {notifUnread > 0 && (
          <button
            onClick={handleMarkNotificationsRead}
            className="text-xs text-indigo-600 font-bold hover:underline"
          >
            Marcar leídas
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-20">
        {notifications.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-10">
            Sin notificaciones.
          </p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl border transition-all ${
              n.is_new
                ? "bg-white border-indigo-100 shadow-sm"
                : "bg-slate-50 border-slate-100 opacity-70"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-bold text-sm text-slate-800">{n.title}</p>
              {n.is_new && (
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              )}
            </div>
            <p className="text-xs text-slate-500">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setActiveView(VIEWS.OVERVIEW);
        }}
        className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-200 hover:scale-110 transition-transform"
      >
        {initialLetter}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-slate-900 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm ring-4 ring-indigo-50/50">
                    {initialLetter}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {profile?.email || user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                {activeView === VIEWS.OVERVIEW && renderOverview()}
                {activeView === VIEWS.PAYMENT_METHODS && renderPaymentMethods()}
                {activeView === VIEWS.PAYMENT_PREFS && renderPaymentPrefs()}
                {activeView === VIEWS.ACCOUNT_INFO && renderAccountInfo()}
                {activeView === VIEWS.NOTIFICATIONS && renderNotifications()}
              </div>
              <div className="p-4 border-t border-slate-100 bg-white">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-rose-600 font-bold text-sm hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                >
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Subcomponentes
const MenuItem = ({ icon, label, badge, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-100 transition group bg-transparent"
  >
    <div className="flex items-center gap-3 text-slate-500 group-hover:text-indigo-600 transition-colors">
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      {badge > 0 && (
        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          {badge}
        </span>
      )}
      <ArrowLeft
        className="rotate-180 text-slate-300 group-hover:text-indigo-300 transition-transform group-hover:translate-x-1"
        size={16}
      />
    </div>
  </button>
);

const BackHeader = ({ title, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button
      onClick={onBack}
      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition shadow-sm"
    >
      <ArrowLeft size={18} />
    </button>
    <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
  </div>
);

const SectionHeader = ({ label }) => (
  <p className="uppercase text-xs text-gray-400 mt-4 mb-1 font-semibold tracking-wider pl-1">
    {label}
  </p>
);
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-1 text-sm border-b border-slate-50 last:border-0">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800 truncate max-w-[200px] text-right">
      {value}
    </span>
  </div>
);