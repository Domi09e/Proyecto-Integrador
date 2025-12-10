import { useState, useEffect } from "react";
import { MessageSquare, PackageX, HelpCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/authContext";

export default function Soporte() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'history'
  const [orders, setOrders] = useState([]);
  
  // Formulario
  const [form, setForm] = useState({ orden_id: "", asunto: "", descripcion: "", tipo: "general" });
  const [loading, setLoading] = useState(false);

  // Historial
  const [tickets, setTickets] = useState([]);

  // Cargar órdenes para el select y tickets previos
  useEffect(() => {
    const loadData = async () => {
      try {
        const [resOrders, resTickets] = await Promise.all([
          api.get("/client/active-orders"), // Reusamos el endpoint de órdenes activas
          api.get("/client/support")
        ]);
        setOrders(resOrders.data);
        setTickets(resTickets.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/client/support", form);
      alert("Solicitud enviada. Un agente revisará tu caso.");
      setForm({ orden_id: "", asunto: "", descripcion: "", tipo: "general" });
      // Recargar tickets
      const { data } = await api.get("/client/support");
      setTickets(data);
      setActiveTab("history");
    } catch (err) {
      alert("Error al enviar solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-4xl font-black mb-2 text-center">Atención al Cliente</h1>
        <p className="text-slate-500 text-center mb-10">¿En qué podemos ayudarte hoy?</p>

        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => setActiveTab("create")}
            className={`px-6 py-2 rounded-full font-bold text-sm transition ${activeTab === 'create' ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-gray-100'}`}
          >
            Nueva Solicitud
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`px-6 py-2 rounded-full font-bold text-sm transition ${activeTab === 'history' ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-gray-100'}`}
          >
            Mis Tickets / Devoluciones
          </button>
        </div>

        {activeTab === "create" ? (
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
               <OptionCard 
                 icon={<PackageX />} 
                 title="Devolución" 
                 active={form.tipo === 'devolucion'}
                 onClick={() => setForm({...form, tipo: 'devolucion', asunto: 'Solicitud de Devolución'})}
               />
               <OptionCard 
                 icon={<HelpCircle />} 
                 title="Problema con Pago" 
                 active={form.tipo === 'pago'}
                 onClick={() => setForm({...form, tipo: 'pago', asunto: 'Problema con mi cuota'})}
               />
               <OptionCard 
                 icon={<MessageSquare />} 
                 title="Otra consulta" 
                 active={form.tipo === 'general'}
                 onClick={() => setForm({...form, tipo: 'general', asunto: ''})}
               />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              {form.tipo !== 'general' && (
                <div>
                  <label className="block text-sm font-bold mb-2">Selecciona la compra afectada</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black"
                    value={form.orden_id}
                    onChange={e => setForm({...form, orden_id: e.target.value})}
                    required={form.tipo === 'devolucion'}
                  >
                    <option value="">Seleccionar orden...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                         {o.tienda} - RD$ {Number(o.total).toLocaleString()} ({new Date(o.fecha).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">Asunto</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black"
                  placeholder="Resumen breve del problema"
                  value={form.asunto}
                  onChange={e => setForm({...form, asunto: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Descripción detallada</label>
                <textarea 
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black resize-none"
                  placeholder="Cuéntanos más detalles para ayudarte mejor..."
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-black text-white font-bold py-4 rounded-full text-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                {loading ? "Enviando..." : "Enviar Solicitud"} <Send size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-slate-400 font-medium">No tienes solicitudes previas.</p>
                </div>
            ) : tickets.map(ticket => (
              <div key={ticket.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        ticket.estado === 'abierto' ? 'bg-blue-100 text-blue-700' :
                        ticket.estado === 'resuelto' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                        {ticket.estado}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(ticket.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-lg">{ticket.asunto}</h3>
                  <p className="text-slate-500 text-sm mt-1 line-clamp-1">{ticket.descripcion_inicial}</p>
                  {ticket.orden && (
                      <p className="text-xs text-slate-400 mt-2">Ref: Orden de {ticket.orden.tienda?.nombre}</p>
                  )}
                </div>
                <button className="text-indigo-600 font-bold text-sm hover:underline">Ver detalles</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({ icon, title, active, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer border-2 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all ${
                active ? 'border-black bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-300'
            }`}
        >
            <div className={`p-3 rounded-full ${active ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'}`}>
                {icon}
            </div>
            <span className={`font-bold ${active ? 'text-black' : 'text-slate-500'}`}>{title}</span>
        </div>
    )
}