import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Search, Edit3, Trash2, Ban, CheckCircle, 
  DollarSign, ArrowLeft, Shield, CheckCircle2, AlertCircle, X
} from "lucide-react";
import { getClients, updateClient, toggleBlockClient, deleteClient } from "../../api/clientsManager";
import { useAdminAuth } from "../context/adminAuth.context";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para Modales
  const [editingClient, setEditingClient] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // PERMISO: Solo Super Admin puede editar/borrar
  const isSuperAdmin = user?.rol === 'super_admin';

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data } = await getClients();
      setClients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Filtrado
  const filteredClients = clients.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas Rápidas
  const stats = useMemo(() => {
    const total = clients.length;
    const activos = clients.filter(c => c.activo).length;
    const creditoTotal = clients.reduce((acc, c) => acc + Number(c.poder_credito), 0);
    return { total, activos, creditoTotal };
  }, [clients]);

  // --- ACCIONES ---
  const handleBlock = async (client) => {
    if (!isSuperAdmin) return;
    const debeBloquear = client.activo ? true : false; // Si está activo, enviamos true para bloquear

    if (!window.confirm(`¿Seguro que quieres ${debeBloquear ? 'bloquear' : 'activar'} a este usuario?`)) return;

    try {
      await toggleBlockClient(client.id, debeBloquear);
      // Actualización optimista
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, activo: !debeBloquear } : c));
    } catch (e) { alert("Error al cambiar estado"); }
  };

  const handleDelete = async () => {
    if (!isSuperAdmin) return;
    try {
      await deleteClient(deletingId);
      setClients(prev => prev.filter(c => c.id !== deletingId));
      setDeletingId(null);
    } catch (e) { alert("No se puede eliminar. Puede tener deudas pendientes."); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      await updateClient(editingClient.id, {
        nombre: editingClient.nombre,
        poder_credito: editingClient.poder_credito
      });
      alert("Cliente actualizado");
      setEditingClient(null);
      loadClients();
    } catch (e) { alert("Error al actualizar"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10">
      
      {/* HEADER */}
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
              Gestión de Clientes
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Administra usuarios, límites de crédito y accesos.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard 
             title="Clientes Registrados" 
             value={stats.total} 
             icon={<Users size={24} />} 
             color="text-indigo-400" 
             bg="bg-indigo-500/10"
           />
           <StatCard 
             title="Usuarios Activos" 
             value={stats.activos} 
             icon={<CheckCircle2 size={24} />} 
             color="text-emerald-400" 
             bg="bg-emerald-500/10"
           />
           <StatCard 
             title="Crédito Otorgado Total" 
             value={`RD$ ${stats.creditoTotal.toLocaleString()}`} 
             icon={<DollarSign size={24} />} 
             color="text-amber-400" 
             bg="bg-amber-500/10"
           />
        </div>

        {/* TABLA */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
           
           {/* BUSCADOR */}
           <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente por nombre o email..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border-none text-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600 transition"
                />
              </div>
              <div className="text-sm text-slate-400 font-medium bg-slate-900 px-4 py-2 rounded-lg">
                 {filteredClients.length} Usuarios
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                       <th className="p-6">Usuario</th>
                       <th className="p-6">Contacto</th>
                       <th className="p-6">Crédito BNPL</th>
                       <th className="p-6 text-center">Estado</th>
                       {isSuperAdmin && <th className="p-6 text-center">Acciones</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700/50">
                    {filteredClients.length === 0 ? (
                       <tr><td colSpan="5" className="p-16 text-center text-slate-500">No se encontraron clientes.</td></tr>
                    ) : filteredClients.map(client => (
                       <tr key={client.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="p-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30 text-lg">
                                   {client.nombre.charAt(0)}
                                </div>
                                <div>
                                   <p className="font-bold text-white text-base">{client.nombre} {client.apellido}</p>
                                   <p className="text-xs text-slate-500 font-mono">ID: {client.id}</p>
                                </div>
                             </div>
                          </td>
                          <td className="p-6 text-sm">
                             <p className="text-slate-300 mb-0.5">{client.email}</p>
                             <p className="text-slate-500 text-xs">{client.telefono || "Sin teléfono"}</p>
                          </td>
                          <td className="p-6">
                             <span className="font-mono font-bold text-emerald-400 text-lg">
                                RD$ {Number(client.poder_credito).toLocaleString()}
                             </span>
                          </td>
                          <td className="p-6 text-center">
                             {/* LÓGICA CORREGIDA DE ESTADO */}
                             {client.activo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                                   <CheckCircle size={12}/> ACTIVO
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                                   <Ban size={12}/> BLOQUEADO
                                </span>
                             )}
                          </td>
                          
                          {isSuperAdmin && (
                             <td className="p-6">
                                <div className="flex justify-center gap-2">
                                   <button 
                                      onClick={() => setEditingClient(client)}
                                      className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white transition"
                                      title="Editar Crédito"
                                   >
                                      <Edit3 size={18}/>
                                   </button>
                                   
                                   <button 
                                      onClick={() => handleBlock(client)}
                                      className={`p-2 rounded-lg transition ${client.activo ? 'bg-slate-700 text-slate-300 hover:bg-amber-500 hover:text-white' : 'bg-slate-700 text-slate-300 hover:bg-emerald-500 hover:text-white'}`}
                                      title={client.activo ? "Bloquear" : "Activar"}
                                   >
                                      {client.activo ? <Ban size={18}/> : <CheckCircle size={18}/>}
                                   </button>

                                   <button 
                                      onClick={() => setDeletingId(client.id)}
                                      className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-rose-600 hover:text-white transition"
                                      title="Eliminar"
                                   >
                                      <Trash2 size={18}/>
                                   </button>
                                </div>
                             </td>
                          )}
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* --- MODAL EDITAR --- */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingClient(null)} />
             <motion.div 
               initial={{scale: 0.95, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.95, opacity: 0}}
               className="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl w-full max-w-sm shadow-2xl"
             >
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-white">Editar Cliente</h3>
                   <button onClick={() => setEditingClient(null)} className="p-1 hover:bg-slate-700 rounded-full transition"><X className="text-slate-400 hover:text-white"/></button>
                </div>
                
                <form onSubmit={handleUpdate} className="space-y-5">
                   <div>
                      <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Nombre</label>
                      <input 
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
                        value={editingClient.nombre}
                        onChange={e => setEditingClient({...editingClient, nombre: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Límite de Crédito (RD$)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500 transition"
                        value={editingClient.poder_credito}
                        onChange={e => setEditingClient({...editingClient, poder_credito: e.target.value})}
                      />
                   </div>
                   
                   <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold mt-2 flex justify-center gap-2 transition shadow-lg shadow-indigo-900/20">
                      <CheckCircle size={20}/> Guardar Cambios
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL ELIMINAR --- */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
             <motion.div 
               initial={{scale: 0.95, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.95, opacity: 0}}
               className="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center"
             >
                <div className="w-14 h-14 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                   <AlertCircle size={32}/>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Cliente?</h3>
                <p className="text-slate-400 text-sm mb-8">
                  Esta acción es irreversible. Se borrará el historial de crédito y compras del usuario.
                </p>
                
                <div className="flex gap-3">
                   <button onClick={() => setDeletingId(null)} className="flex-1 py-3 border border-slate-600 rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition">Cancelar</button>
                   <button onClick={handleDelete} className="flex-1 py-3 bg-rose-600 rounded-xl text-white font-bold hover:bg-rose-500 transition shadow-lg shadow-rose-900/20">Eliminar</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponente de Tarjeta
function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg flex items-start justify-between hover:-translate-y-1 transition-transform duration-300">
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