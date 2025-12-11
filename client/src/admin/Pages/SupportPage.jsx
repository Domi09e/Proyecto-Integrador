import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  X,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../api/axios";
import { motion, AnimatePresence } from "framer-motion";

// URL base de tu servidor (ajusta si es necesario)
const BASE_URL = "http://localhost:4000";

export default function SupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolucionText, setResolucionText] = useState("");

  const loadTickets = async () => {
    try {
      setLoading(true);
      // Asegúrate que esta ruta coincida con tu backend
      const { data } = await api.get("/admin/soporte/tickets");
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // --- FILTROS ---
  const filteredTickets = tickets.filter((t) => {
    const term = searchTerm.toLowerCase();

    const matchSearch =
      (t.descripcion || "").toLowerCase().includes(term) ||
      (t.cliente?.email || "").toLowerCase().includes(term) ||
      (t.cliente?.nombre || "").toLowerCase().includes(term) ||
      (t.causa || "").toLowerCase().includes(term); 
      // Eliminé 'asunto' porque Reclamaciones no tiene ese campo

    const matchStatus = filterStatus === "all" || t.estado === filterStatus;

    return matchSearch && matchStatus;
  });

  // Stats (Basados en tus ENUMs: pendiente, en_revision, resuelta)
  const openCount = tickets.filter((t) => t.estado === "pendiente").length;
  const processCount = tickets.filter((t) => t.estado === "en_revision").length;
  const solvedCount = tickets.filter((t) => t.estado === "resuelta").length;

  const handleUpdateStatus = async (id, newStatus) => {
    if (
      (newStatus === "resuelta" || newStatus === "rechazada") &&
      !resolucionText.trim()
    ) {
      return alert(
        "Por favor escribe una resolución o respuesta para el cliente antes de cerrar el ticket."
      );
    }

    if (newStatus === "resuelta" && selectedTicket?.orden) {
      if (
        !window.confirm(
          `ATENCIÓN: Este ticket tiene una orden asociada (RD$ ${selectedTicket.orden.total}). ¿Confirmas el reembolso y cierre?`
        )
      )
        return;
    }

    try {
      // 👇 CAMBIO IMPORTANTE: Enviamos 'resolucion_admin' para que coincida con la BD
      await api.put(`/admin/soporte/tickets/${id}`, {
        estado: newStatus,
        resolucion_admin: resolucionText, 
      });

      alert("Reclamación actualizada correctamente.");
      
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, estado: newStatus } : t))
      );
      setSelectedTicket(null);
      setResolucionText("");
      // Recargar para asegurar datos frescos
      loadTickets();
    } catch (e) {
      console.error(e);
      alert("Error actualizando ticket");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-indigo-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-current"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition text-slate-400"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <LifeBuoy size={24} />
              </div>
              Centro de Reclamaciones
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona reclamos, devoluciones y evidencias.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Pendientes"
            value={openCount}
            color="text-rose-400"
            bg="bg-rose-500/10"
            icon={<AlertCircle size={24} />}
          />
          <StatCard
            title="En Revisión"
            value={processCount}
            color="text-amber-400"
            bg="bg-amber-500/10"
            icon={<Clock size={24} />}
          />
          <StatCard
            title="Resueltas"
            value={solvedCount}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            icon={<CheckCircle2 size={24} />}
          />
        </div>

        {/* TABLA */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          {/* BARRA DE HERRAMIENTAS */}
          <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex flex-col md:flex-row gap-6 justify-between items-center">
            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-700">
              {["all", "pendiente", "en_revision", "resuelta"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    filterStatus === st
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por causa, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl pl-12 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="p-6">Causa / Fecha</th>
                  <th className="p-6">Descripción</th>
                  <th className="p-6">Cliente</th>
                  <th className="p-6 text-center">Evidencia</th>
                  <th className="p-6 text-center">Estado</th>
                  <th className="p-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="p-6">
                      <span className="block font-bold text-white text-sm capitalize mb-1">
                        {/* Usamos 'causa' que viene de la BD */}
                        {(t.causa || "General").replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-6 max-w-xs">
                      <p className="text-sm text-slate-400 line-clamp-2">
                        "{t.descripcion}"
                      </p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {t.cliente?.nombre
                            ? t.cliente.nombre.charAt(0)
                            : "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {t.cliente?.nombre || "Usuario"}{" "}
                            {t.cliente?.apellido || ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t.cliente?.email || "Sin email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      {t.evidencia_url ? (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                          <ImageIcon size={12} /> SI
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      <StatusBadge status={t.estado} />
                    </td>
                    <td className="p-6 text-center">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="p-2 rounded-full bg-slate-700 text-slate-400 hover:bg-indigo-600 hover:text-white transition"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      No se encontraron reclamaciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL DETALLE (SLIDE OVER) --- */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Reclamo #{selectedTicket.id}
                </h2>
                <button onClick={() => setSelectedTicket(null)}>
                  <X className="text-slate-400 hover:text-white" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900 custom-scrollbar">
                {/* Cliente */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                    {selectedTicket.cliente?.nombre
                      ? selectedTicket.cliente.nombre.charAt(0)
                      : "?"}
                  </div>
                  <div>
                    <p className="text-white font-bold">
                      {selectedTicket.cliente?.nombre || "Usuario"}{" "}
                      {selectedTicket.cliente?.apellido || ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedTicket.cliente?.email || "No disponible"}
                    </p>
                  </div>
                </div>

                {/* Orden Relacionada (Si existe) */}
                {selectedTicket.orden && (
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-indigo-500/20">
                    <p className="text-xs text-indigo-400 font-bold uppercase mb-1">Orden Asociada</p>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">ID: #{selectedTicket.orden.id}</span>
                        <span className="text-white font-mono font-bold">RD$ {Number(selectedTicket.orden.total).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Problema */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Detalle del Problema
                  </h3>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500 uppercase">
                        Causa
                      </span>
                      <span className="text-sm font-bold text-indigo-400 capitalize">
                        {(selectedTicket.causa || "General").replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="border-t border-slate-700/50 pt-2">
                      <p className="text-slate-300 text-sm italic">
                        "{selectedTicket.descripcion}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* EVIDENCIA (Imagen Única) */}
                {selectedTicket.evidencia_url && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ImageIcon size={14} /> Evidencia Adjunta
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-slate-700 bg-black">
                      <a
                        href={`${BASE_URL}${selectedTicket.evidencia_url}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`${BASE_URL}${selectedTicket.evidencia_url}`}
                          alt="Evidencia"
                          className="w-full h-auto object-contain hover:opacity-90 transition cursor-zoom-in"
                        />
                      </a>
                    </div>
                  </div>
                )}

                {/* Área de Resolución */}
                {selectedTicket.estado !== 'resuelta' && selectedTicket.estado !== 'rechazada' && (
                  <div className="border-t border-slate-700 pt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Tu Respuesta / Resolución
                    </h3>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-slate-200 text-sm focus:border-indigo-500 focus:outline-none resize-none"
                      rows="4"
                      placeholder="Escribe la respuesta para el cliente antes de aprobar o rechazar..."
                      value={resolucionText}
                      onChange={(e) => setResolucionText(e.target.value)}
                    ></textarea>
                  </div>
                )}
                
                {/* Mostrar Resolución si ya está cerrado */}
                {(selectedTicket.estado === 'resuelta' || selectedTicket.estado === 'rechazada') && selectedTicket.resolucion_admin && (
                     <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resolución dada:</h3>
                        <p className="text-sm text-slate-300 italic">"{selectedTicket.resolucion_admin}"</p>
                     </div>
                )}

              </div>

              {/* Footer Botones */}
              {selectedTicket.estado !== 'resuelta' && selectedTicket.estado !== 'rechazada' && (
                  <div className="p-6 bg-slate-800 border-t border-slate-700 grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedTicket.id, "rechazada")
                      }
                      className="py-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                      <X size={16} /> Rechazar
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedTicket.id, "resuelta")
                      }
                      className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Aprobar & Reembolsar
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedTicket.id, "en_revision")
                      }
                      className="col-span-2 py-2 text-xs font-medium text-amber-500 hover:text-amber-400 transition"
                    >
                      Marcar como "En Revisión" (Investigando)
                    </button>
                  </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helpers
function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase mb-2">
          {title}
        </p>
        <h3 className="text-3xl font-black text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pendiente: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    en_revision: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    resuelta: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rechazada: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span
      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
        styles[status] || "bg-slate-700 text-slate-400"
      }`}
    >
      {status?.replace("_", " ")}
    </span>
  );
}