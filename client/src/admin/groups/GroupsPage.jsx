import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Activity, 
  ArrowLeft,
  PieChart
} from "lucide-react";
import api from "../../api/axios";

export default function GroupsPage() {
  const navigate = useNavigate(); 
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/admin/grupos"); 
        setGroups(data);
      } catch (e) {
        console.error("Error cargando grupos:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Filtro: Grupos de 2 o más personas
  const visibleGroups = groups.filter(g => g.participantes >= 2);

  const totalGrupos = visibleGroups.length;
  const dineroTotal = visibleGroups.reduce((acc, g) => acc + Number(g.total_grupo), 0);
  
  // Contar completados (con margen de error de RD$1 por decimales)
  const completados = visibleGroups.filter(g => (g.total_grupo - g.progreso_pago) < 1).length;

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
              Grupos de Pago
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Supervisión de cuentas divididas en tiempo real.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard 
             title="Monto Total Activo" 
             value={`RD$ ${dineroTotal.toLocaleString()}`} 
             icon={<DollarSign size={24} />} 
             color="text-emerald-400" 
             bg="bg-emerald-500/10"
           />
           <StatCard 
             title="Grupos Totales" 
             value={totalGrupos} 
             icon={<Users size={24} />} 
             color="text-indigo-400" 
             bg="bg-indigo-500/10"
           />
           <StatCard 
             title="100% Pagados" 
             value={completados} 
             icon={<PieChart size={24} />} 
             color="text-purple-400" 
             bg="bg-purple-500/10"
           />
        </div>

        {/* TABLA */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                  <th className="p-6">Grupo</th>
                  <th className="p-6">Participantes</th>
                  <th className="p-6 text-right">Total Grupo</th>
                  <th className="p-6 text-center">Progreso Global</th>
                  <th className="p-6 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {visibleGroups.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-16 text-center text-slate-500 flex flex-col items-center justify-center w-full">
                      <Users size={48} className="mb-4 opacity-20"/>
                      <p className="text-lg font-medium">No hay grupos activos.</p>
                    </td>
                  </tr>
                ) : visibleGroups.map((grupo) => {
                  
                  // CÁLCULO GLOBAL: (Pagado / Total) * 100
                  const rawPercent = grupo.total_grupo > 0 ? (grupo.progreso_pago / grupo.total_grupo) * 100 : 0;
                  const porcentaje = Math.min(100, Math.round(rawPercent));
                  
                  // Color de barra global
                  const barColor = porcentaje === 100 ? "bg-emerald-500" : "bg-indigo-500";
                  const textColor = porcentaje === 100 ? "text-emerald-400" : "text-indigo-400";

                  return (
                    <>
                      <tr 
                        key={grupo.id} 
                        className={`transition-colors cursor-pointer ${expandedRow === grupo.id ? "bg-slate-700/40" : "hover:bg-slate-700/20"}`}
                        onClick={() => toggleRow(grupo.id)}
                      >
                        <td className="p-6">
                          <div className="font-bold text-white text-base">{grupo.nombre}</div>
                          <div className="text-xs text-slate-500 font-mono mt-1">Org: {grupo.creador}</div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                             <Users size={16} className="text-indigo-400"/>
                             <span className="text-slate-200 font-bold">{grupo.participantes}</span>
                          </div>
                        </td>
                        <td className="p-6 text-right font-mono font-bold text-slate-200 text-lg">
                          RD$ {Number(grupo.total_grupo).toLocaleString()}
                        </td>
                        <td className="p-6">
                          <div className="w-full max-w-[140px] mx-auto">
                            <div className="flex justify-between text-xs mb-1 text-slate-400 font-medium">
                              <span>Pagado</span>
                              <span className={textColor}>{porcentaje}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${porcentaje}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <button className={`p-2 rounded-full transition-all ${expandedRow === grupo.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                            {expandedRow === grupo.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                          </button>
                        </td>
                      </tr>
                      
                      {/* DETALLES DE PARTICIPANTES */}
                      {expandedRow === grupo.id && (
                        <tr className="bg-slate-900/40 shadow-inner">
                          <td colSpan="5" className="p-0">
                            <div className="p-6 border-l-4 border-indigo-500 bg-slate-800/50">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity size={14} className="text-indigo-400"/> Estado Individual
                              </h4>
                              
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {grupo.detalles_ordenes.map((orden) => {
                                  const totalInd = Number(orden.total);
                                  const pendienteInd = Number(orden.pago_bnpl?.monto_pendiente || 0);
                                  const pagadoInd = totalInd - pendienteInd;
                                  
                                  // Progreso Individual: Si debe 0, es 100%. Si debe todo, es 0%.
                                  let progInd = 0;
                                  if (totalInd > 0) {
                                      progInd = Math.round((pagadoInd / totalInd) * 100);
                                  }
                                  
                                  const isPaid = pendienteInd < 1; // Margen de error por centavos

                                  return (
                                    <div key={orden.id} className="bg-slate-800 border border-slate-600 p-4 rounded-xl flex flex-col justify-between hover:border-slate-500 transition-colors relative overflow-hidden">
                                      {/* Indicador lateral de estado */}
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                      
                                      <div className="pl-2">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase">
                                                  {orden.cliente?.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                  <p className="text-sm font-bold text-white truncate w-32">{orden.cliente?.nombre}</p>
                                                  <p className="text-[10px] text-slate-400">{orden.cliente?.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                                                <span>Deuda Restante</span>
                                                <span className={isPaid ? 'text-emerald-400' : 'text-white'}>{progInd}% Pagado</span>
                                            </div>
                                            
                                            {/* Barra de progreso individual */}
                                            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${progInd}%` }}
                                                ></div>
                                            </div>

                                            <p className={`text-right font-mono font-bold text-sm ${isPaid ? 'text-emerald-400' : 'text-white'}`}>
                                                {isPaid ? "¡COMPLETADO!" : `RD$ ${pendienteInd.toLocaleString()}`}
                                            </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

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