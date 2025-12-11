import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PiggyBank,
  Plus,
  Target,
  ArrowRight,
  CheckCircle,
  CreditCard,
  X,
  Trash2,
  Package,
} from "lucide-react";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";

export default function SavingsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [contributeModal, setContributeModal] = useState({
    show: false,
    goal: null,
  });

  const loadGoals = async () => {
    try {
      const { data } = await api.get("/client/snbl/goals");
      setGoals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCancel = async (goal) => {
    const confirmMsg = `¿Estás seguro de cancelar la meta "${
      goal.producto_nombre
    }"?\n\nTe devolveremos RD$ ${Number(
      goal.monto_ahorrado
    ).toLocaleString()} a tu método de pago.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { data } = await api.post(`/client/snbl/goals/${goal.id}/cancel`);
      alert(data.message);
      loadGoals();
    } catch (error) {
      alert("Error al procesar la devolución.");
    }
  };

  const handleClaim = async (goal) => {
    if (
      !window.confirm(
        `¿Deseas generar la orden de envío para "${goal.producto_nombre}" ahora?`
      )
    )
      return;

    try {
      const { data } = await api.post(`/client/snbl/goals/${goal.id}/claim`);
      alert(data.message);
      loadGoals();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error al reclamar el premio.");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-6 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <PiggyBank className="text-emerald-500" size={32} /> Mis Metas
              SNBL
            </h1>
            <p className="text-slate-500 mt-1">
              Ahorra a tu ritmo con garantía de devolución total.
            </p>
          </div>
          <Link
            to="/tienda"
            className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-700 transition"
          >
            <Plus size={16} /> Nueva Meta
          </Link>
        </header>

        {goals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <Target size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">
              No tienes metas activas
            </h3>
            <p className="text-slate-400 mb-6">
              Ve a una tienda y selecciona "Planear Compra" en un producto.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {goals.map((goal) => {
              const saved = Number(goal.monto_ahorrado);
              const total = Number(goal.monto_meta);
              const progress = Math.min(100, (saved / total) * 100);

              // --- LÓGICA DE ESTADOS ---
              const isCancelled = goal.estado === "cancelada";
              const isClaimed =
                goal.estado === "completada" || goal.estado === "reclamada";
              const isReadyToClaim =
                !isClaimed &&
                !isCancelled &&
                (goal.estado === "meta_alcanzada" || saved >= total);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={goal.id}
                  className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-6 items-center transition-all ${
                    isCancelled
                      ? "bg-slate-100 border-slate-200 opacity-75"
                      : isClaimed
                      ? "bg-blue-50 border-blue-100 opacity-90"
                      : isReadyToClaim
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {/* Icono Tienda */}
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${
                      isCancelled
                        ? "bg-slate-200 text-slate-400"
                        : isClaimed
                        ? "bg-blue-200 text-blue-700"
                        : isReadyToClaim
                        ? "bg-emerald-200 text-emerald-700"
                        : "bg-indigo-50 text-indigo-500"
                    }`}
                  >
                    {isClaimed ? (
                      <Package size={32} />
                    ) : (
                      goal.tienda?.nombre?.charAt(0)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 w-full">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold text-lg text-slate-900">
                        {goal.producto_nombre}
                      </h3>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded uppercase bg-white/50 border border-black/5 ${
                          isClaimed
                            ? "text-blue-700"
                            : isReadyToClaim
                            ? "text-emerald-700"
                            : isCancelled
                            ? "text-slate-500"
                            : "text-indigo-600"
                        }`}
                      >
                        {isClaimed
                          ? "Reclamado / Enviado"
                          : isReadyToClaim
                          ? "¡Meta Alcanzada!"
                          : isCancelled
                          ? "Cancelada"
                          : "Ahorrando"}
                      </span>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${
                          isCancelled
                            ? "bg-slate-400"
                            : isClaimed
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-sm font-medium">
                      <span
                        className={
                          isCancelled ? "text-slate-500" : "text-emerald-600"
                        }
                      >
                        Ahorrado: RD$ {saved.toLocaleString()}
                      </span>
                      <span className="text-slate-400">
                        Meta: RD$ {total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="w-full md:w-auto flex flex-col gap-2 min-w-[140px]">
                    {/* CASO 1: AHORRANDO */}
                    {!isReadyToClaim && !isClaimed && !isCancelled && (
                      <>
                        <button
                          onClick={() =>
                            setContributeModal({ show: true, goal })
                          }
                          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm"
                        >
                          Aportar <ArrowRight size={16} />
                        </button>
                        <button
                          onClick={() => handleCancel(goal)}
                          className="bg-white border border-slate-200 text-slate-500 px-4 py-2.5 rounded-xl font-bold hover:text-rose-600 hover:border-rose-200 transition flex items-center justify-center gap-2 text-sm"
                        >
                          <Trash2 size={16} /> Retirar
                        </button>
                      </>
                    )}

                    {/* CASO 2: LISTA PARA RECLAMAR */}
                    {isReadyToClaim && (
                      <button
                        onClick={() => handleClaim(goal)}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-500 transition animate-pulse"
                      >
                        <CheckCircle size={18} /> Reclamar
                      </button>
                    )}

                    {/* CASO 3: RECLAMADA / COMPLETADA */}
                    {isClaimed && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-1">
                          <Package size={14} /> Reclamado
                        </span>
                      </div>
                    )}

                    {/* CASO 4: CANCELADA */}
                    {isCancelled && (
                      <span className="text-xs text-center text-slate-400 font-medium bg-slate-100 py-2 rounded-lg">
                        Reembolsado
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* MODAL DE APORTE INTELIGENTE */}
        <AnimatePresence>
          {contributeModal.show && (
            <ContributeModal
              goal={contributeModal.goal}
              onClose={() => setContributeModal({ show: false, goal: null })}
              onSuccess={() => {
                setContributeModal({ show: false, goal: null });
                loadGoals();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- MODAL DE APORTE CON CÁLCULO DE CUOTA SUGERIDA ---
function ContributeModal({ goal, onClose, onSuccess }) {
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null); // Nueva Sugerencia

  useEffect(() => {
    // 1. Cargar Métodos
    api.get("/client/payment-methods").then((res) => {
      setMethods(res.data);
      const def = res.data.find((m) => m.es_predeterminado);
      if (def) setSelectedMethod(def.id);
      else if (res.data.length > 0) setSelectedMethod(res.data[0].id);
    });

    // 2. Calcular Cuota Sugerida (Inteligencia SNBL)
    if (goal) {
      const faltante = Number(goal.monto_meta) - Number(goal.monto_ahorrado);
      if (faltante <= 0) return;

      const hoy = new Date();
      const fechaMeta = new Date(goal.fecha_objetivo);
      
      // Calcular diferencia en días
      const diferenciaTiempo = fechaMeta - hoy;
      const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
      
      // Si ya pasó la fecha, sugerir el total
      if (diasRestantes <= 0) {
          setAmount(faltante.toFixed(2));
          setSuggestion("La fecha objetivo ya pasó. ¡Completa tu meta hoy!");
          return;
      }

      // Calcular divisor según frecuencia
      let divisor = 1; 
      if (goal.frecuencia === 'semanal') divisor = Math.max(1, Math.ceil(diasRestantes / 7));
      if (goal.frecuencia === 'quincenal') divisor = Math.max(1, Math.ceil(diasRestantes / 15));
      if (goal.frecuencia === 'mensual') divisor = Math.max(1, Math.ceil(diasRestantes / 30));

      const cuotaIdeal = faltante / divisor;
      
      // Pre-llenar el input con la sugerencia
      setAmount(cuotaIdeal.toFixed(2));
      setSuggestion(`Basado en tu meta ${goal.frecuencia}, te sugerimos aportar esto para terminar a tiempo.`);
    }
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMethod) return alert("Selecciona un método de pago");
    if (!amount || amount <= 0) return alert("Ingresa un monto válido");

    setLoading(true);
    try {
      const { data } = await api.post(
        `/client/snbl/goals/${goal.id}/contribute`,
        {
          monto: amount,
          metodo_pago_id: selectedMethod,
        }
      );
      
      alert(data.message);
      onSuccess();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error al realizar el aporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden z-10 p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Realizar Aporte</h3>
          <button onClick={onClose}>
            <X size={20} className="text-slate-400 hover:text-slate-800" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Mensaje de Sugerencia */}
          {suggestion && (
             <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                <PiggyBank className="text-indigo-500 shrink-0 mt-0.5" size={16}/>
                <p className="text-xs text-indigo-700 font-medium leading-tight">
                   {suggestion}
                </p>
             </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Monto a depositar
            </label>
            <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold pl-2">RD$</span>
                <input
                type="number"
                className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-200 py-2 pl-12 focus:border-indigo-600 outline-none bg-transparent placeholder:text-slate-300"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">
               Faltan: RD$ {(Number(goal.monto_meta) - Number(goal.monto_ahorrado)).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Método de Pago
            </label>
            {methods.length === 0 ? (
              <p className="text-sm text-red-500">
                No tienes tarjetas guardadas. Ve a tu Perfil.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {methods.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedMethod === m.id
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard
                      size={20}
                      className={
                        selectedMethod === m.id
                          ? "text-indigo-600"
                          : "text-slate-400"
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {m.marca}
                      </p>
                      <p className="text-xs text-slate-500">
                        •••• {m.ultimos_cuatro_digitos}
                      </p>
                    </div>
                    {selectedMethod === m.id && (
                      <div className="w-4 h-4 bg-indigo-600 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || methods.length === 0}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50 mt-4 shadow-lg shadow-slate-300"
          >
            {loading ? "Procesando..." : "Confirmar Aporte"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}