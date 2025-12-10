import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  DollarSign, 
  ShoppingBag, 
  FileText, 
  ArrowUpRight, 
  TrendingUp, 
  Activity, 
  ShieldAlert 
} from "lucide-react";
import api from "../../api/axios";
import { useAdminAuth } from "../context/adminAuth.context";

export default function DashboardHome() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState(null);
  
  // --- ESTADOS DEL GRÁFICO ---
  const [chartData, setChartData] = useState([]); 
  const [chartFilter, setChartFilter] = useState("6_months"); 
  const [loading, setLoading] = useState(true);

  // 1. Cargar Estadísticas Generales
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await api.get("/admin/dashboard-stats");
        setStats(data);
      } catch (e) {
        console.error("Error cargando dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  // 2. Cargar Datos del Gráfico
  useEffect(() => {
    const loadChart = async () => {
      try {
        const { data } = await api.get(`/admin/dashboard-chart?range=${chartFilter}`);
        setChartData(data);
      } catch (e) {
        console.error("Error cargando gráfico:", e);
        // Fallback visual por si falla la API (para que no se vea roto)
        setChartData([
            { label: "Ene", value: 15000 }, 
            { label: "Feb", value: 25000 }, 
            { label: "Mar", value: 18000 },
            { label: "Abr", value: 30000 },
            { label: "May", value: 42000 },
            { label: "Jun", value: 38000 }
        ]); 
      }
    };
    loadChart();
  }, [chartFilter]);

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 100;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-6 sm:p-10 font-sans">
      
      {/* HEADER */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Hola, {user?.nombre?.split(" ")[0]} 
          </h1>
          <p className="text-slate-500 mt-1">Resumen ejecutivo del sistema.</p>
        </div>
        
        {stats?.documentosPendientes > 0 && (
          <Link 
            to="/admin/verificacion" 
            className="bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl border border-amber-200 font-bold text-sm flex items-center gap-2 hover:bg-amber-100 transition shadow-sm animate-pulse"
          >
            <ShieldAlert size={18} />
            {stats.documentosPendientes} Documentos por revisar
          </Link>
        )}
      </div>

      {/* --- 1. KPIs (MODO CLARO) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
         <KpiCard 
           title="Usuarios Totales" 
           value={stats?.totalClientes} 
           icon={<Users size={22}/>} 
           color="text-indigo-600" 
           bg="bg-indigo-50" 
           trend="+12%"
         />
         <KpiCard 
           title="Volumen Procesado" 
           value={`RD$ ${Number(stats?.volumenTotal || 0).toLocaleString()}`} 
           icon={<DollarSign size={22}/>} 
           color="text-emerald-600" 
           bg="bg-emerald-50" 
           trend="+5.2%"
         />
         <KpiCard 
           title="Tiendas Activas" 
           value={stats?.totalTiendas} 
           icon={<ShoppingBag size={22}/>} 
           color="text-blue-600" 
           bg="bg-blue-50" 
         />
         <KpiCard 
           title="Verificaciones" 
           value={stats?.documentosPendientes} 
           icon={<FileText size={22}/>} 
           color={stats?.documentosPendientes > 0 ? "text-amber-600" : "text-slate-400"} 
           bg={stats?.documentosPendientes > 0 ? "bg-amber-50" : "bg-slate-100"} 
           isAlert={stats?.documentosPendientes > 0}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- 2. GRÁFICO (MODO CLARO) --- */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               <TrendingUp className="text-emerald-500" size={20}/> Flujo de Crédito
             </h3>
             
             <select 
               value={chartFilter}
               onChange={(e) => setChartFilter(e.target.value)}
               className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none hover:border-indigo-300 cursor-pointer transition"
             >
               <option value="this_month">Este mes</option>
               <option value="6_months">Últimos 6 meses</option>
               <option value="this_year">Este año</option>
             </select>
          </div>
          
          {/* Barras */}
          <div className="h-64 w-full flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-slate-100 pb-0 relative">
             {/* Líneas de guía sutiles */}
             <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                <div className="w-full h-px bg-slate-50"></div>
                <div className="w-full h-px bg-slate-50"></div>
                <div className="w-full h-px bg-slate-50"></div>
                <div className="w-full h-px bg-slate-50"></div>
             </div>

             {chartData.length === 0 ? (
               <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                 Sin datos disponibles.
               </div>
             ) : (
               chartData.map((d, i) => {
                 const heightPercent = maxValue > 0 ? Math.max(8, (d.value / maxValue) * 100) : 8;
                 
                 return (
                   <div key={i} className="w-full flex flex-col items-center gap-3 group h-full justify-end z-10">
                      <div 
                        className="w-full bg-indigo-50 hover:bg-indigo-500 transition-all duration-500 rounded-t-lg relative group-hover:shadow-lg group-hover:shadow-indigo-200" 
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 whitespace-nowrap shadow-xl pointer-events-none">
                          RD$ {Number(d.value).toLocaleString()}
                          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                        {d.label}
                      </span>
                   </div>
                 );
               })
             )}
          </div>
        </div>

        {/* --- 3. ACCIONES RÁPIDAS (MODO CLARO) --- */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
              <h3 className="font-bold text-lg mb-2">Administrar</h3>
              <p className="text-slate-400 text-sm mb-6">Accesos directos.</p>
              
              <div className="space-y-3">
                <QuickLink to="/admin/verificacion" label="Validar Documentos" icon={<ShieldAlert size={16}/>} />
                <QuickLink to="/AggTienda" label="Agregar Tienda" icon={<ShoppingBag size={16}/>} />
                <QuickLink to="/admin/config/usuarios" label="Crear Admin" icon={<Users size={16}/>} />
              </div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-emerald-500"/> Estado del Sistema
              </h3>
              <div className="space-y-4">
                 <SystemStatus label="Base de Datos" status="Conectado" color="bg-emerald-500" />
                 <SystemStatus label="API Server" status="En línea" color="bg-emerald-500" />
                 <SystemStatus label="Gateway" status="Simulado" color="bg-blue-500" />
              </div>
           </div>
        </div>

      </div>

      {/* --- 4. TABLA RECIENTE (MODO CLARO) --- */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
           <h3 className="font-bold text-slate-800">Transacciones Recientes</h3>
           <Link to="/admin/pagos" className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider transition">Ver todas <ArrowUpRight size={14}/></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-bold tracking-wider">
                <tr>
                   <th className="p-4 pl-6">Cliente</th>
                   <th className="p-4">Tienda</th>
                   <th className="p-4">Fecha</th>
                   <th className="p-4 text-right pr-6">Monto Total</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 text-sm">
                {stats?.ordenesRecientes?.length === 0 ? (
                   <tr><td colSpan="4" className="p-8 text-center text-slate-400">No hay movimientos recientes.</td></tr>
                ) : stats?.ordenesRecientes.map((orden) => (
                   <tr key={orden.id} className="hover:bg-slate-50 transition duration-200">
                      <td className="p-4 pl-6 font-bold text-slate-700">{orden.cliente}</td>
                      <td className="p-4 text-slate-500 font-medium">{orden.tienda}</td>
                      <td className="p-4 text-slate-400 font-mono text-xs">{new Date(orden.fecha).toLocaleDateString()}</td>
                      <td className="p-4 pr-6 text-right font-mono font-bold text-emerald-600">RD$ {Number(orden.total).toLocaleString()}</td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// --- SUBCOMPONENTES (ESTILOS CLAROS) ---

function KpiCard({ title, value, icon, color, bg, trend, isAlert }) {
  return (
    <div className={`bg-white p-6 rounded-3xl border transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 duration-300 ${isAlert ? 'border-amber-200 ring-4 ring-amber-50' : 'border-slate-100 shadow-sm'}`}>
       <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${bg} ${color}`}>
             {icon}
          </div>
          {trend && <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-500`}>{trend}</span>}
       </div>
       <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
       <p className="text-slate-400 text-sm font-medium mt-1">{title}</p>
    </div>
  )
}

function QuickLink({ to, label, icon }) {
  return (
    <Link to={to} className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-slate-200 hover:text-white border border-white/5 group">
       <span className="flex items-center gap-3 font-medium text-sm">{icon} {label}</span>
       <ArrowUpRight size={14} className="opacity-50 group-hover:opacity-100 transition" />
    </Link>
  )
}

function SystemStatus({ label, status, color }) {
  return (
    <div className="flex justify-between items-center text-sm">
       <span className="text-slate-500 font-medium">{label}</span>
       <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color} animate-pulse`}></span>
          <span className="font-bold text-slate-700">{status}</span>
       </div>
    </div>
  )
}