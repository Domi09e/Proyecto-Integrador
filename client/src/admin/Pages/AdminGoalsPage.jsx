import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importar hook de navegación
import { 
  PiggyBank, Search, Filter, BellRing, CheckCircle, 
  AlertCircle, Calendar, ArrowUpRight, ArrowLeft // 👈 Importar flecha
} from "lucide-react";
import api from "../../api/axios";

export default function AdminGoalsPage() {
  const navigate = useNavigate(); // 👈 Inicializar navegación
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filterFreq, setFilterFreq] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todas");
  
  // Estado del botón masivo
  const [sending, setSending] = useState(false);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/snbl/goals?frecuencia=${filterFreq}&estado=${filterStatus}`);
      setGoals(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [filterFreq, filterStatus]);

  const handleBulkNotify = async () => {
    if (!window.confirm("¿Estás seguro? Esto enviará una notificación a TODOS los clientes que tengan pagos atrasados según su frecuencia.")) return;
    
    setSending(true);
    try {
        const { data } = await api.post("/admin/snbl/reminders");
        alert(data.message); 
    } catch (error) {
        alert("Error al enviar notificaciones.");
    } finally {
        setSending(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-slate-900 text-slate-100">
      
      {/* HEADER CON BOTÓN ATRÁS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          {/* 👇 BOTÓN VOLVER ATRÁS */}
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700 text-slate-400 hover:text-white"
            title="Volver"
          >
            <ArrowLeft size={24}/>
          </button>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <PiggyBank className="text-emerald-400" size={32}/> Gestión de Metas SNBL
            </h1>
            <p className="text-slate-400 mt-1">Monitorea el ahorro de los clientes y gestiona recordatorios.</p>
          </div>
        </div>

        {/* BOTÓN MÁGICO NOTIFICACIONES */}
        <button 
            onClick={handleBulkNotify}
            disabled={sending}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 ${sending ? 'bg-slate-700 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
        >
            <BellRing size={20} className={sending ? "animate-spin" : ""} />
            {sending ? "Enviando..." : "Notificar Atrasos"}
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase mr-2">
            <Filter size={16}/> Filtros:
        </div>
        
        <select 
            value={filterFreq}
            onChange={(e) => setFilterFreq(e.target.value)}
            className="bg-slate-900 border border-slate-600 text-white px-4 py-2 rounded-lg outline-none focus:border-indigo-500"
        >
            <option value="todas">Todas las Frecuencias</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
        </select>

        <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-600 text-white px-4 py-2 rounded-lg outline-none focus:border-indigo-500"
        >
            <option value="todas">Todos los Estados</option>
            <option value="activa">Activas (En proceso)</option>
            <option value="completada">Completadas</option>
            <option value="cancelada">Inactivas / Canceladas</option>
        </select>
      </div>

      {/* TABLA DE METAS */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                    <tr>
                        <th className="p-5">Cliente</th>
                        <th className="p-5">Meta / Producto</th>
                        <th className="p-5">Progreso</th>
                        <th className="p-5">Frecuencia</th>
                        <th className="p-5">Estado</th>
                        <th className="p-5 text-right">Creada</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                    {loading ? (
                        <tr><td colSpan="6" className="p-10 text-center">Cargando datos...</td></tr>
                    ) : goals.length === 0 ? (
                        <tr><td colSpan="6" className="p-10 text-center text-slate-500">No se encontraron metas con estos filtros.</td></tr>
                    ) : (
                        goals.map(goal => {
                            const progress = (goal.monto_ahorrado / goal.monto_meta) * 100;
                            return (
                                <tr key={goal.id} className="hover:bg-slate-700/30 transition">
                                    <td className="p-5">
                                        <div className="font-bold text-white">{goal.cliente?.nombre} {goal.cliente?.apellido}</div>
                                        <div className="text-xs text-slate-500">{goal.cliente?.email}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="text-sm font-medium text-slate-200">{goal.producto_nombre}</div>
                                        <div className="text-xs text-indigo-400">{goal.tienda?.nombre}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="w-32">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-emerald-400">RD$ {Number(goal.monto_ahorrado).toLocaleString()}</span>
                                                <span className="text-slate-500">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{width: `${progress}%`}}></div>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1">Meta: {Number(goal.monto_meta).toLocaleString()}</div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className="px-3 py-1 rounded-full bg-slate-700 text-xs font-bold capitalize text-slate-300 border border-slate-600">
                                            {goal.frecuencia}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        {goal.estado === 'activa' && <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Activa</span>}
                                        {goal.estado === 'completada' && <span className="text-blue-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14}/> Completada</span>}
                                        {goal.estado === 'cancelada' && <span className="text-rose-400 flex items-center gap-1 text-xs font-bold"><AlertCircle size={14}/> Cancelada</span>}
                                    </td>
                                    <td className="p-5 text-right text-xs text-slate-500 font-mono">
                                        {new Date(goal.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}