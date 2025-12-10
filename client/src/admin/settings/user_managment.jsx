import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/adminAuth.context.jsx";
import {
  fetchAdminUsers,
  deleteUser,
  blockUser,
  unlockUser,
} from "../../api/user.js";
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Ban, 
  CheckCircle, 
  Key, 
  Eye, 
  X, 
  ShieldAlert,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
  { value: "", label: "Todos los roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin_general", label: "Admin General" },
  { value: "admin_tiendas", label: "Admin Tiendas" },
  { value: "soporte", label: "Soporte" },
];

export default function UserManagement() {
  const nav = useNavigate();
  const { user: me } = useAdminAuth();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  
  // Estado para modal de confirmación
  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, user: null });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando usuarios", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filtrado
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list
      .filter((u) => (role ? (u.rol || u.role) === role : true))
      .filter((u) => {
        if (!t) return true;
        const full = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
        return (
          full.includes(t) ||
          (u.email || "").toLowerCase().includes(t) ||
          ((u.rol || u.role || "") + "").toLowerCase().includes(t)
        );
      });
  }, [list, q, role]);

  // Permisos
  const canSuper = me?.rol === "super_admin";
  const canAdmin = canSuper || me?.rol === "admin" || me?.rol === "admin_general";

  // --- ACCIONES ---
  const handleAction = async () => {
    const { action, user } = confirmModal;
    try {
        if (action === 'delete') {
            await deleteUser(user.id);
            alert("Usuario eliminado.");
        } else if (action === 'block') {
            await blockUser(user.id);
            alert("Usuario bloqueado.");
        } else if (action === 'unlock') {
            await unlockUser(user.id);
            alert("Usuario desbloqueado.");
        }
        setConfirmModal({ show: false, action: null, user: null });
        load();
    } catch (e) {
        alert(e?.response?.data?.message || "Error al ejecutar acción");
    }
  };

  const openConfirm = (action, user) => {
      // Validaciones de seguridad antes de abrir modal
      if (!canSuper && (user.rol === 'super_admin' || user.role === 'super_admin')) {
          return alert("No puedes modificar a un Super Admin.");
      }
      setConfirmModal({ show: true, action, user });
  };


  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => nav("/admin/config")} 
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition text-slate-400"
            title="Volver atrás"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                 <Users size={24} />
              </div>
              Gestión de Usuarios
            </h1>
            <p className="text-slate-400 text-sm mt-1">Administra el personal del sistema.</p>
          </div>
        </div>

        {canAdmin && (
            <button 
              onClick={() => nav("/admin/config/usuarios/new")} // Asegúrate de tener esta ruta
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-900/20"
            >
               <Plus size={20}/> Nuevo Usuario
            </button>
        )}
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- TABLA Y FILTROS --- */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
           
           {/* BARRA DE HERRAMIENTAS */}
           <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                 {/* Buscador */}
                 <div className="relative w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar usuario..." 
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition text-sm"
                    />
                 </div>

                 {/* Filtro Rol */}
                 <select 
                   value={role}
                   onChange={e => setRole(e.target.value)}
                   className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm cursor-pointer"
                 >
                   {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                 </select>
              </div>

              <div className="text-sm text-slate-400 font-medium bg-slate-900 px-4 py-2 rounded-lg">
                 {filtered.length} Usuarios
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                       <th className="p-6">Usuario</th>
                       <th className="p-6">Rol</th>
                       <th className="p-6 text-center">Estado</th>
                       <th className="p-6 text-center">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700/50">
                    {filtered.length === 0 ? (
                       <tr><td colSpan="4" className="p-16 text-center text-slate-500">No se encontraron usuarios.</td></tr>
                    ) : filtered.map(u => {
                       const isActive = Number(u.activo ?? 0) === 1;
                       const isBlocked = Number(u.bloqueado ?? 0) === 1;
                       
                       return (
                          <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                             <td className="p-6">
                                <div className="flex items-center gap-4">
                                   <img 
                                     src={u.profile_pic || "https://ui-avatars.com/api/?background=6366f1&color=fff&name=" + u.nombre} 
                                     alt="Avatar" 
                                     className="w-10 h-10 rounded-full object-cover border border-slate-600"
                                   />
                                   <div>
                                      <p className="font-bold text-white text-base">{u.nombre} {u.apellido}</p>
                                      <p className="text-xs text-slate-500">{u.email}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="p-6">
                                <span className="inline-block px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold border border-slate-600 capitalize">
                                   {(u.rol || u.role || "").replace('_', ' ')}
                                </span>
                             </td>
                             <td className="p-6 text-center">
                                {isBlocked ? (
                                   <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                      <Ban size={12}/> Bloqueado
                                   </span>
                                ) : isActive ? (
                                   <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle size={12}/> Activo
                                   </span>
                                ) : (
                                   <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-700 text-slate-400 border border-slate-600">
                                      Inactivo
                                   </span>
                                )}
                             </td>
                             <td className="p-6">
                                <div className="flex justify-center gap-2">
                                   <button onClick={() => setDetail(u)} className="p-2 bg-slate-700 text-slate-300 hover:bg-teal-500 hover:text-white rounded-lg transition" title="Ver Detalles">
                                      <Eye size={18}/>
                                   </button>
                                   
                                   {canAdmin && (
                                      <button onClick={() => nav(`/admin/config/usuarios/${u.id}/edit`)} className="p-2 bg-slate-700 text-slate-300 hover:bg-indigo-500 hover:text-white rounded-lg transition" title="Editar">
                                         <Edit3 size={18}/>
                                      </button>
                                   )}

                                   {canSuper && (u.rol !== 'super_admin') && (
                                      <>
                                         {isBlocked ? (
                                            <button onClick={() => openConfirm('unlock', u)} className="p-2 bg-slate-700 text-slate-300 hover:bg-emerald-500 hover:text-white rounded-lg transition" title="Desbloquear">
                                               <CheckCircle size={18}/>
                                            </button>
                                         ) : (
                                            <button onClick={() => openConfirm('block', u)} className="p-2 bg-slate-700 text-slate-300 hover:bg-amber-500 hover:text-white rounded-lg transition" title="Bloquear">
                                               <Ban size={18}/>
                                            </button>
                                         )}
                                         <button onClick={() => openConfirm('delete', u)} className="p-2 bg-slate-700 text-slate-300 hover:bg-rose-500 hover:text-white rounded-lg transition" title="Eliminar">
                                            <Trash2 size={18}/>
                                         </button>
                                      </>
                                   )}
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* --- MODAL DETALLE --- */}
      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                   <h3 className="text-xl font-bold text-white">Detalles de Usuario</h3>
                   <button onClick={() => setDetail(null)}><X className="text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="flex flex-col items-center mb-6">
                   <img src={detail.profile_pic || "https://ui-avatars.com/api/?background=6366f1&color=fff&name=" + detail.nombre} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-slate-700 mb-3 object-cover"/>
                   <h4 className="text-lg font-bold text-white">{detail.nombre} {detail.apellido}</h4>
                   <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 uppercase mt-1">
                      {detail.rol || detail.role}
                   </span>
                </div>

                <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                   <InfoRow label="Email" value={detail.email} />
                   <InfoRow label="ID Sistema" value={`#${detail.id}`} />
                   <InfoRow label="Último Acceso" value={detail.last_login ? new Date(detail.last_login).toLocaleString() : "Nunca"} />
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL CONFIRMACIÓN --- */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal({ show: false })} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                   <ShieldAlert size={32}/>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                   {confirmModal.action === 'delete' ? '¿Eliminar Usuario?' : confirmModal.action === 'block' ? '¿Bloquear Acceso?' : '¿Restaurar Acceso?'}
                </h3>
                <p className="text-slate-400 text-sm mb-8">
                   Estás a punto de modificar la cuenta de <strong>{confirmModal.user?.nombre}</strong>.
                </p>
                <div className="flex gap-3">
                   <button onClick={() => setConfirmModal({ show: false })} className="flex-1 py-3 border border-slate-600 rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition">Cancelar</button>
                   <button onClick={handleAction} className={`flex-1 py-3 rounded-xl text-white font-bold transition shadow-lg ${confirmModal.action === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                      Confirmar
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function InfoRow({ label, value }) {
   return (
      <div className="flex justify-between border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
         <span className="text-slate-500 text-xs uppercase font-bold">{label}</span>
         <span className="text-slate-200 text-sm font-medium">{value}</span>
      </div>
   )
}