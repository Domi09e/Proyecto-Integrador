import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CreditCard, Search, CheckCircle2, Clock, AlertCircle, 
  Download, ChevronDown, ChevronUp, Mail, ArrowLeft, Filter,
  DollarSign
} from "lucide-react";
import api from "../../api/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PagosPage() {
  const navigate = useNavigate();
  const [rawPayments, setRawPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClient, setExpandedClient] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/admin/pagos");
        setRawPayments(data);
      } catch (e) {
        console.error("Error cargando pagos:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // --- AGRUPACIÓN DE DATOS (Sin filtrado global de estado) ---
  const clientsData = useMemo(() => {
    const groups = {};

    rawPayments.forEach((pago) => {
      const key = pago.email;
      if (!groups[key]) {
        groups[key] = {
          cliente_nombre: pago.cliente,
          email: pago.email,
          total_deuda_pendiente: 0,
          total_pagado: 0,
          cuotas_pendientes: 0,
          cuotas_atrasadas: 0,
          estado_global: "al_dia",
          detalles: [] // Guardamos TODAS las cuotas aquí
        };
      }
      
      groups[key].detalles.push(pago);

      if (pago.estado === 'pagado') {
        groups[key].total_pagado += Number(pago.monto);
      } else {
        groups[key].total_deuda_pendiente += Number(pago.monto);
        groups[key].cuotas_pendientes += 1;
        if (pago.estado === 'atrasado') {
          groups[key].cuotas_atrasadas += 1;
          groups[key].estado_global = "mora";
        }
      }
    });

    return Object.values(groups).filter(c => 
      c.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawPayments, searchTerm]);

  // Estadísticas Globales
  const stats = useMemo(() => {
    return rawPayments.reduce((acc, p) => {
      if (p.estado === 'pagado') acc.recaudado += Number(p.monto);
      if (p.estado === 'pendiente') acc.pendiente += Number(p.monto);
      if (p.estado === 'atrasado') acc.mora += Number(p.monto);
      return acc;
    }, { recaudado: 0, pendiente: 0, mora: 0 });
  }, [rawPayments]);

  const toggleRow = (email) => setExpandedClient(expandedClient === email ? null : email);

  // Exportar PDF General
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte General de Cobranza", 14, 20);
    // ... lógica de exportación general ...
    doc.save("reporte_general.pdf");
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
            onClick={() => navigate(-1)} 
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition text-slate-400"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><CreditCard size={24} /></div>
              Gestión de Cobranza
            </h1>
            <p className="text-slate-400 text-sm mt-1">Supervisión financiera por cliente.</p>
          </div>
        </div>

        <button 
           onClick={handleExportPDF}
           className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-900/20"
        >
           <Download size={20}/> Reporte Global
        </button>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard title="Recaudado Total" value={stats.recaudado} color="text-emerald-400" bg="bg-emerald-500/10" icon={<CheckCircle2 size={24}/>} />
           <StatCard title="Pendiente Total" value={stats.pendiente} color="text-indigo-400" bg="bg-indigo-500/10" icon={<Clock size={24}/>} />
           <StatCard title="Mora Total" value={stats.mora} color="text-rose-400" bg="bg-rose-500/10" icon={<AlertCircle size={24}/>} />
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          
          {/* BUSCADOR */}
          <div className="p-6 border-b border-slate-800 bg-slate-800/50">
             <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente por nombre o email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border-none text-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600 transition"
                />
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700">
                  <th className="p-6">Cliente</th>
                  <th className="p-6">Estado Global</th>
                  <th className="p-6 text-right">Por Cobrar (Deuda)</th>
                  <th className="p-6 text-right">Total Pagado</th>
                  <th className="p-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {clientsData.length === 0 ? (
                  <tr><td colSpan="5" className="p-16 text-center text-slate-500">No se encontraron clientes.</td></tr>
                ) : clientsData.map((cliente) => (
                  <>
                    <tr 
                      key={cliente.email} 
                      className={`transition-colors cursor-pointer group ${expandedClient === cliente.email ? "bg-slate-700/40" : "hover:bg-slate-700/20"}`}
                      onClick={() => toggleRow(cliente.email)}
                    >
                      {/* COLUMNA 1: INFO CLIENTE */}
                      <td className="p-6">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold border border-slate-600 shrink-0 text-lg">
                               {cliente.cliente_nombre.charAt(0)}
                            </div>
                            <div>
                               <div className="font-bold text-white text-base">{cliente.cliente_nombre}</div>
                               <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-mono">
                                  <Mail size={12}/> {cliente.email}
                               </div>
                            </div>
                         </div>
                      </td>
                      
                      {/* COLUMNA 2: ESTADO */}
                      <td className="p-6">
                         {cliente.estado_global === 'mora' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertCircle size={12}/> Mora</span>
                         ) : cliente.total_deuda_pendiente > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><Clock size={12}/> Activo</span>
                         ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={12}/> Paz y Salvo</span>
                         )}
                      </td>

                      {/* COLUMNA 3: DEUDA */}
                      <td className="p-6 text-right">
                         <p className={`font-mono font-bold text-xl ${cliente.total_deuda_pendiente > 0 ? 'text-white' : 'text-slate-600'}`}>
                           RD$ {cliente.total_deuda_pendiente.toLocaleString()}
                         </p>
                      </td>

                      {/* COLUMNA 4: PAGADO */}
                      <td className="p-6 text-right">
                         <p className="font-mono font-bold text-emerald-500/80 text-lg">
                           RD$ {cliente.total_pagado.toLocaleString()}
                         </p>
                      </td>

                      {/* COLUMNA 5: TOGGLE */}
                      <td className="p-6 text-center">
                        <button className={`p-2 rounded-full transition-all ${expandedClient === cliente.email ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                          {expandedClient === cliente.email ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </button>
                      </td>
                    </tr>

                    {/* --- AQUÍ ESTÁ EL CAMBIO: EL FILTRO INTERNO --- */}
                    {expandedClient === cliente.email && (
                      <tr className="bg-slate-900/40 shadow-inner">
                         <td colSpan="5" className="p-0">
                            {/* Renderizamos el componente interno de detalles */}
                            <ClientDetailPanel cuotas={cliente.detalles} clienteName={cliente.cliente_nombre} />
                         </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- NUEVO COMPONENTE: PANEL DE DETALLES CON FILTRO INTERNO ---
function ClientDetailPanel({ cuotas, clienteName }) {
    const [innerTab, setInnerTab] = useState("pendientes"); // Filtro interno: pendientes, pagados, todos

    // Filtrar cuotas localmente
    const filteredCuotas = cuotas.filter(c => {
        if (innerTab === 'pendientes') return c.estado === 'pendiente' || c.estado === 'atrasado';
        if (innerTab === 'pagados') return c.estado === 'pagado';
        return true; // todos
    });

    return (
        <div className="p-6 border-l-4 border-indigo-500 bg-slate-800/50 m-4 rounded-r-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                   Detalles de {clienteName}
                </h4>
                
                {/* 🔥 PESTAÑAS DE FILTRO INTERNO 🔥 */}
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button onClick={() => setInnerTab("pendientes")} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${innerTab === "pendientes" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
                        Pendientes
                    </button>
                    <button onClick={() => setInnerTab("pagados")} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${innerTab === "pagados" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>
                        Pagados
                    </button>
                    <button onClick={() => setInnerTab("todos")} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${innerTab === "todos" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>
                        Historial Completo
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                        <th className="px-5 py-3">Tienda</th>
                        <th className="px-5 py-3">Cuota #</th>
                        <th className="px-5 py-3">Vencimiento / Pago</th>
                        <th className="px-5 py-3 text-right">Monto</th>
                        <th className="px-5 py-3 text-center">Estado</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                    {filteredCuotas.length === 0 ? (
                        <tr><td colSpan="5" className="p-6 text-center text-xs text-slate-500">No hay registros en esta categoría.</td></tr>
                    ) : filteredCuotas.map(cuota => (
                        <tr key={cuota.id} className="hover:bg-slate-700/50 transition">
                            <td className="px-5 py-3 font-medium text-white">{cuota.tienda}</td>
                            <td className="px-5 py-3 text-slate-400">#{cuota.numero}</td>
                            <td className="px-5 py-3 text-slate-400 font-mono">
                                {cuota.estado === 'pagado' && cuota.fecha_pago 
                                   ? <span className="text-emerald-500">{new Date(cuota.fecha_pago).toLocaleDateString()}</span>
                                   : new Date(cuota.fecha_vencimiento).toLocaleDateString()
                                }
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-slate-200 font-bold">RD$ {Number(cuota.monto).toLocaleString()}</td>
                            <td className="px-5 py-3 text-center">
                                <StatusBadge status={cuota.estado} />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Subcomponentes
function StatCard({ title, value, color, bg, icon }) {
   return (
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center justify-between hover:-translate-y-1 transition-transform">
         <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p><h3 className="text-2xl font-black text-white">RD$ {value.toLocaleString()}</h3></div>
         <div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
      </div>
   )
}

function StatusBadge({ status }) {
   const config = {
      pagado:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'Pagado' },
      pendiente:{ color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'Pendiente' },
      atrasado: { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'Mora' },
   }[status] || { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: status };
   return (<span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${config.bg} ${config.color} ${config.border}`}>{config.text}</span>);
}