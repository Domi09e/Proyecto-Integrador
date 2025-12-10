import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileClock, Search, Shield, ArrowLeft, 
  Trash2, Edit3, PlusCircle, LogIn, AlertTriangle 
} from "lucide-react";
import api from "../../api/axios";

export default function AuditPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { data } = await api.get("/admin/auditoria");
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.detalles.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.accion.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                 <Shield size={24} />
              </div>
              Auditoría del Sistema
            </h1>
            <p className="text-slate-400 text-sm mt-1">Registro de seguridad y actividad de administradores.</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        
        {/* BUSCADOR */}
        <div className="bg-slate-800 rounded-t-3xl border border-slate-700 p-6 flex items-center gap-4">
           <Search className="text-slate-500" size={20}/>
           <input 
             type="text" 
             placeholder="Buscar por acción, administrador o detalle..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="bg-transparent border-none outline-none text-slate-200 w-full placeholder:text-slate-600"
           />
        </div>

        {/* TABLA DE LOGS */}
        <div className="bg-slate-800 rounded-b-3xl border-x border-b border-slate-700 shadow-xl overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                    <tr>
                       <th className="p-6">Evento / Acción</th>
                       <th className="p-6">Detalle</th>
                       <th className="p-6">Usuario Admin</th>
                       <th className="p-6 text-right">Fecha</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700/50">
                    {filteredLogs.length === 0 ? (
                       <tr><td colSpan="4" className="p-16 text-center text-slate-500">No hay registros de actividad.</td></tr>
                    ) : filteredLogs.map(log => (
                       <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="p-6">
                             <div className="flex items-center gap-3">
                                <ActionIcon action={log.accion} />
                                <div>
                                   <span className="block font-bold text-white text-sm">{log.accion}</span>
                                   <span className="text-[10px] text-slate-500 uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-700 mt-1 inline-block">
                                      {log.entidad}
                                   </span>
                                </div>
                             </div>
                          </td>
                          <td className="p-6 text-sm text-slate-300">
                             {log.detalles}
                          </td>
                          <td className="p-6">
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white">
                                   {log.admin?.nombre?.charAt(0) || "?"}
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white">{log.admin?.nombre} {log.admin?.apellido}</p>
                                   <p className="text-[10px] text-slate-500">{log.admin?.email}</p>
                                </div>
                             </div>
                          </td>
                          <td className="p-6 text-right text-xs text-slate-400 font-mono">
                             {new Date(log.createdAt).toLocaleString()}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}

// Icono dinámico según la acción
function ActionIcon({ action }) {
   const normalized = action.toUpperCase();
   if (normalized.includes("CREATE") || normalized.includes("ADD")) return <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><PlusCircle size={18}/></div>;
   if (normalized.includes("UPDATE") || normalized.includes("EDIT")) return <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Edit3 size={18}/></div>;
   if (normalized.includes("DELETE") || normalized.includes("REMOVE")) return <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400"><Trash2 size={18}/></div>;
   if (normalized.includes("LOGIN")) return <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><LogIn size={18}/></div>;
   
   return <div className="p-2 rounded-lg bg-slate-700 text-slate-400"><FileClock size={18}/></div>;
}