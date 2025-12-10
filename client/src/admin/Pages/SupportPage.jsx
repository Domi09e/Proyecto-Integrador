import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Hook para navegar atrás
import { 
  LifeBuoy, Search, CheckCircle2, 
  Clock, AlertCircle, ChevronRight, X,
  ShoppingBag, FileText, RefreshCcw, ArrowLeft
} from "lucide-react";
import api from "../../api/axios";
import { motion, AnimatePresence } from "framer-motion";

export default function SupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
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
  const filteredTickets = tickets.filter(t => {
    const matchSearch = 
      t.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cliente.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === "all" || t.estado === filterStatus;
    
    return matchSearch && matchStatus;
  });

  // Stats
  const openCount = tickets.filter(t => t.estado === 'abierto').length;
  const processCount = tickets.filter(t => t.estado === 'en_proceso').length;
  const solvedCount = tickets.filter(t => t.estado === 'resuelto').length;

  const handleUpdateStatus = async (id, newStatus) => {
    if (newStatus === 'resuelto' && selectedTicket?.orden) {
        if(!window.confirm("ATENCIÓN: Este ticket tiene una orden asociada. Al marcarlo como 'Resuelto', se cancelará la deuda y se reembolsará el crédito al cliente. ¿Continuar?")) return;
    }

    try {
      await api.put(`/admin/soporte/tickets/${id}`, { estado: newStatus });
      alert("Estado actualizado correctamente.");
      setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: newStatus } : t));
      setSelectedTicket(null); // Cerrar modal
      loadTickets(); // Recargar para asegurar datos frescos
    } catch (e) {
      alert("Error actualizando ticket");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10">
      
      {/* HEADER CON BOTÓN ATRÁS */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition text-slate-400"
            title="Volver atrás"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                 <LifeBuoy size={24} />
              </div>
              Centro de Soporte
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona reclamos, devoluciones y ayuda al cliente.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard 
             title="Tickets Abiertos" 
             value={openCount} 
             color="text-rose-400" 
             bg="bg-rose-500/10" 
             icon={<AlertCircle size={24}/>} 
           />
           <StatCard 
             title="En Proceso" 
             value={processCount} 
             color="text-amber-400" 
             bg="bg-amber-500/10" 
             icon={<Clock size={24}/>} 
           />
           <StatCard 
             title="Resueltos" 
             value={solvedCount} 
             color="text-emerald-400" 
             bg="bg-emerald-500/10" 
             icon={<CheckCircle2 size={24}/>} 
           />
        </div>

        {/* TABLA Y CONTROLES */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          
          {/* BARRA DE HERRAMIENTAS */}
          <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex flex-col md:flex-row gap-6 justify-between items-center">
             
             {/* Pestañas */}
             <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                {['all', 'abierto', 'en_proceso', 'resuelto'].map(st => (
                   <button 
                     key={st}
                     onClick={() => setFilterStatus(st)}
                     className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        filterStatus === st 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                     }`}
                   >
                     {st.replace('_', ' ')}
                   </button>
                ))}
             </div>
             
             {/* Buscador */}
             <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por asunto, email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl pl-12 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition text-sm"
                />
             </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                   <tr>
                      <th className="p-6">Tipo / Asunto</th>
                      <th className="p-6">Descripción</th>
                      <th className="p-6">Cliente</th>
                      <th className="p-6 text-center">Estado</th>
                      <th className="p-6 text-center">Acción</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                   {filteredTickets.map(t => (
                      <tr key={t.id} className="hover:bg-slate-700/20 transition-colors group">
                         <td className="p-6">
                            {t.orden ? (
                               <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-md border border-purple-500/20 mb-2">
                                  <RefreshCcw size={12}/> DEVOLUCIÓN
                               </span>
                            ) : (
                               <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-600 mb-2">
                                  <FileText size={12}/> CONSULTA
                               </span>
                            )}
                            <p className="font-bold text-white text-base">{t.asunto}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(t.fecha_creacion).toLocaleDateString()}</p>
                         </td>
                         <td className="p-6 max-w-xs">
                            <p className="text-sm text-slate-400 line-clamp-2 italic">"{t.descripcion_inicial}"</p>
                         </td>
                         <td className="p-6">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                  {t.cliente.nombre.charAt(0)}
                               </div>
                               <div>
                                  <p className="text-sm font-medium text-white">{t.cliente.nombre} {t.cliente.apellido}</p>
                                  <p className="text-xs text-slate-500">{t.cliente.email}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-6 text-center">
                            <StatusBadge status={t.estado} />
                         </td>
                         <td className="p-6 text-center">
                            <button 
                              onClick={() => setSelectedTicket(t)}
                              className="p-2 rounded-full bg-slate-700 text-slate-400 hover:bg-indigo-600 hover:text-white transition shadow-sm"
                            >
                               <ChevronRight size={20} />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
             {filteredTickets.length === 0 && (
                <div className="p-16 text-center text-slate-500">
                   <p className="text-lg">No hay tickets pendientes.</p>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* --- MODAL DETALLE (SLIDE OVER) --- */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex justify-end">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setSelectedTicket(null)}
             />
             <motion.div 
               initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
               className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 h-full shadow-2xl flex flex-col"
             >
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                   <h2 className="text-xl font-bold text-white tracking-tight">Ticket #{selectedTicket.id}</h2>
                   <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-700 rounded-full transition"><X className="text-slate-400 hover:text-white"/></button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-8 bg-slate-900">
                   
                   {/* Info Cliente */}
                   <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Información del Cliente</h3>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
                            {selectedTicket.cliente.nombre.charAt(0)}
                         </div>
                         <div>
                            <p className="text-white font-bold text-lg">{selectedTicket.cliente.nombre} {selectedTicket.cliente.apellido}</p>
                            <p className="text-sm text-slate-400">{selectedTicket.cliente.email}</p>
                         </div>
                      </div>
                   </div>

                   {/* Detalles del Problema */}
                   <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detalles del Problema</h3>
                      <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                         <p className="text-white font-medium mb-2">{selectedTicket.asunto}</p>
                         <p className="text-slate-300 text-sm leading-relaxed">"{selectedTicket.descripcion_inicial}"</p>
                      </div>
                      
                      {/* Si es devolución */}
                      {selectedTicket.orden && (
                         <div className="mt-4 p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-4">
                               <RefreshCcw size={18}/> Solicitud de Reembolso
                            </div>
                            <div className="flex justify-between items-end border-t border-purple-500/20 pt-4">
                               <div>
                                  <p className="text-xs text-purple-300/60 uppercase font-bold">Orden ID</p>
                                  <p className="text-purple-200 font-mono">#{selectedTicket.orden.id}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-xs text-purple-300/60 uppercase font-bold">Monto a Devolver</p>
                                  <p className="text-2xl font-black text-white">RD$ {Number(selectedTicket.orden.total).toLocaleString()}</p>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                {/* Footer de Acciones */}
                <div className="p-6 bg-slate-800 border-t border-slate-700">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Resolución</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'en_proceso')} 
                          className="py-3.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold text-sm transition"
                        >
                            En Proceso
                        </button>
                        
                        <button 
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'resuelto')} 
                          className={`py-3.5 rounded-xl font-bold text-white shadow-lg transition flex items-center justify-center gap-2 ${
                              selectedTicket.orden 
                              ? "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20" 
                              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                          }`}
                        >
                            <CheckCircle2 size={18}/> 
                            {selectedTicket.orden ? "Aprobar Reembolso" : "Marcar Resuelto"}
                        </button>
                    </div>
                    <button 
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'cerrado')} 
                      className="w-full mt-4 text-xs text-slate-500 hover:text-slate-300 font-medium transition"
                    >
                        Cerrar ticket sin acciones
                    </button>
                </div>

             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helpers Visuales
function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center justify-between hover:-translate-y-1 transition-transform">
       <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-3xl font-black text-white">{value}</h3>
       </div>
       <div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    abierto: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    en_proceso: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    resuelto: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cerrado: "bg-slate-700 text-slate-400 border-slate-600"
  };
  return (
    <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.cerrado}`}>
      {status.replace('_', ' ')}
    </span>
  );
}