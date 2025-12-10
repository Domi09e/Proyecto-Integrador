import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Store, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  ShoppingBag,
  Globe,
  ArrowLeft // Nuevo
} from "lucide-react";
import api from "../../api/axios";
import { motion, AnimatePresence } from "framer-motion";

export default function TiendasPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para el modal de eliminar
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: "" });

  // Cargar tiendas
  useEffect(() => {
    const loadStores = async () => {
      try {
        const { data } = await api.get("/admin/tiendas");
        setStores(data);
      } catch (error) {
        console.error("Error cargando tiendas", error);
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, []);

  // Filtrado
  const filteredStores = stores.filter(store => 
    store.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.rnc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas rápidas
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.estado === 'activa').length;

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/tiendas/${deleteModal.id}`);
      setStores(prev => prev.filter(s => s.id !== deleteModal.id));
      setDeleteModal({ show: false, id: null, name: "" });
    } catch (error) {
      alert("Error al eliminar la tienda.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10">
      
      {/* --- HEADER CON BOTÓN ATRÁS --- */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Store size={24} />
              </div>
              Catálogo de Tiendas
            </h1>
            <p className="text-slate-400 text-sm mt-1">Administra los comercios afiliados.</p>
          </div>
        </div>

        <Link 
          to="/AggTienda" 
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/20"
        >
          <Plus size={20} /> Nueva Tienda
        </Link>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- STATS & SEARCH --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <StatCard 
             title="Total Tiendas" 
             value={totalStores} 
             icon={<ShoppingBag size={24}/>} 
             color="text-indigo-400" 
             bg="bg-indigo-500/10"
           />
           <StatCard 
             title="Tiendas Activas" 
             value={activeStores} 
             icon={<CheckCircle2 size={24}/>} 
             color="text-emerald-400" 
             bg="bg-emerald-500/10"
           />
           
           {/* Search Bar Estilizado */}
           <div className="bg-slate-800 p-2 rounded-2xl border border-slate-700 flex items-center relative shadow-lg">
              <Search className="absolute left-4 text-slate-500" size={20} />
              <input 
                type="text" 
                placeholder="Buscar tienda..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border-none text-slate-200 rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder:text-slate-600 transition h-full"
              />
           </div>
        </div>

        {/* --- TABLA DE TIENDAS --- */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                  <th className="p-6">Perfil Tienda</th>
                  <th className="p-6">Información</th>
                  <th className="p-6">RNC</th>
                  <th className="p-6 text-center">Estado</th>
                  <th className="p-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-16 text-center text-slate-500">
                      No se encontraron resultados.
                    </td>
                  </tr>
                ) : filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-700/20 transition-colors group">
                    
                    {/* Perfil */}
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600 shrink-0">
                          {store.logo || store.logo_url ? (
                            <img 
                               src={store.logo || store.logo_url} 
                               alt={store.nombre} 
                               className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-slate-300 font-bold text-lg">{store.nombre?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">{store.nombre}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                               {store.category || "General"}
                             </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Información */}
                    <td className="p-6">
                      <div className="space-y-1.5">
                        {store.direccion && (
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <MapPin size={14} className="text-indigo-400"/> 
                            <span className="truncate max-w-[150px]">{store.direccion}</span>
                          </div>
                        )}
                        {store.telefono && (
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Phone size={14} className="text-emerald-400"/> {store.telefono}
                          </div>
                        )}
                         {store.sitio_web && (
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Globe size={14} className="text-blue-400"/> 
                            <a href={store.sitio_web} target="_blank" rel="noreferrer" className="hover:text-white hover:underline truncate max-w-[150px]">Web</a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* RNC */}
                    <td className="p-6 text-sm text-slate-400 font-mono">
                      {store.rnc || "N/A"}
                    </td>

                    {/* Estado */}
                    <td className="p-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        store.estado === 'activa' 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-700 text-slate-400 border-slate-600"
                      }`}>
                        {store.estado === 'activa' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                        {store.estado}
                      </span>
                    </td>

                    {/* Acciones (VISIBLES SIEMPRE) */}
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => navigate(`/admin/tiendas/${store.id}/edit`)}
                          className="p-2 bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-600 hover:border-indigo-500 shadow-sm"
                          title="Editar Tienda"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ show: true, id: store.id, name: store.nombre })}
                          className="p-2 bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-600 hover:border-rose-500 shadow-sm"
                          title="Eliminar Tienda"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL DE CONFIRMACIÓN DE ELIMINAR --- */}
      <AnimatePresence>
        {deleteModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteModal({ show: false, id: null, name: "" })}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-4 mx-auto border border-rose-500/30">
                <AlertTriangle size={28} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Tienda?</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Estás a punto de eliminar <strong>"{deleteModal.name}"</strong>. Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModal({ show: false, id: null, name: "" })}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-900/20"
                >
                  Sí, Eliminar
                </button>
              </div>
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
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
       <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-2xl font-black text-white">{value}</h3>
       </div>
       <div className={`p-3 rounded-xl ${bg} ${color}`}>
          {icon}
       </div>
    </div>
  );
}