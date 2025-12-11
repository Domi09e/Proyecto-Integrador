import { useState, useEffect } from "react";
import { MessageSquare, PackageX, HelpCircle, Send, Upload, Image as ImageIcon, AlertCircle } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/authContext";

// 1. DEFINICIÓN DE CAUSAS ESPECÍFICAS (TAXONOMÍA)
const CAUSAS_POR_CATEGORIA = {
    devolucion: [
        { value: "producto_defectuoso", label: "El producto llegó roto o no funciona" },
        { value: "producto_incorrecto", label: "Me enviaron un producto equivocado" },
        { value: "talla_incorrecta", label: "La talla no me sirve" },
        { value: "calidad_no_esperada", label: "El producto es diferente a la foto" },
        { value: "pedido_incompleto", label: "Faltan artículos en mi paquete" }
    ],
    pago: [
        { value: "cobro_duplicado", label: "Me cobraron dos veces la misma cuota" },
        { value: "pago_no_reflejado", label: "Ya pagué pero sigue saliendo pendiente" },
        { value: "error_monto_cuota", label: "El monto de la cuota es incorrecto" },
        { value: "cargos_desconocidos", label: "No reconozco este cargo en mi tarjeta" }
    ],
    general: [
        { value: "retraso_envio", label: "Mi pedido no llega (Retraso)" },
        { value: "paquete_no_entregado", label: "Dice entregado pero no lo tengo" },
        { value: "direccion_incorrecta", label: "Quiero corregir mi dirección de envío" },
        { value: "error_sistema", label: "Error técnico en la plataforma" },
        { value: "consulta_general", label: "Otras dudas o sugerencias" }
    ]
};

export default function Soporte() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create");
  const [orders, setOrders] = useState([]);
  
  // Estado del Formulario
  // 'categoria' controla qué lista mostrar, 'causa' es lo que se envía a la BD
  const [form, setForm] = useState({ 
      categoria: "general", 
      causa: "", 
      orden_id: "", 
      asunto: "", 
      descripcion: "" 
  });
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resOrders, resTickets] = await Promise.all([
          api.get("/client/active-orders"), 
          api.get("/client/claims")
        ]);
        setOrders(resOrders.data);
        setTickets(resTickets.data);
      } catch (err) { console.error(err); }
    };
    loadData();
  }, []);

  // Resetear causa específica cuando cambio de categoría principal
  const handleCategoryChange = (newCategory) => {
      setForm({ 
          ...form, 
          categoria: newCategory, 
          causa: CAUSAS_POR_CATEGORIA[newCategory][0].value // Seleccionar la primera por defecto
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.causa) return alert("Por favor selecciona una causa específica.");
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("causa", form.causa); // Enviamos la causa específica (ENUM)
      formData.append("descripcion", form.descripcion);
      
      // Asunto automático basado en la causa si el usuario no escribió uno específico
      const labelCausa = CAUSAS_POR_CATEGORIA[form.categoria].find(c => c.value === form.causa)?.label;
      formData.append("asunto", form.asunto || labelCausa); 

      if (form.orden_id) formData.append("orden_id", form.orden_id);
      if (file) formData.append("evidencia", file);

      await api.post("/client/claims", formData, {
          headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Reclamo registrado correctamente. Referencia generada.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al enviar solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-4xl font-black mb-2 text-center">Centro de Soluciones</h1>
        <p className="text-slate-500 text-center mb-10">Selecciona el tipo de problema para dirigirte al área correcta.</p>

        <div className="flex justify-center gap-4 mb-8">
          <button onClick={() => setActiveTab("create")} className={`px-6 py-2 rounded-full font-bold text-sm transition ${activeTab === 'create' ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-gray-100'}`}>
            Nuevo Reclamo
          </button>
          <button onClick={() => setActiveTab("history")} className={`px-6 py-2 rounded-full font-bold text-sm transition ${activeTab === 'history' ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-gray-100'}`}>
            Historial de Casos
          </button>
        </div>

        {activeTab === "create" ? (
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
            
            {/* 1. SELECCIÓN DE CATEGORÍA MACRO */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
               <OptionCard 
                 icon={<PackageX />} 
                 title="Producto / Pedido" 
                 active={form.categoria === 'devolucion'}
                 onClick={() => handleCategoryChange('devolucion')}
               />
               <OptionCard 
                 icon={<HelpCircle />} 
                 title="Pagos y Facturación" 
                 active={form.categoria === 'pago'}
                 onClick={() => handleCategoryChange('pago')}
               />
               <OptionCard 
                 icon={<MessageSquare />} 
                 title="Logística y Otros" 
                 active={form.categoria === 'general'}
                 onClick={() => handleCategoryChange('general')}
               />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto animate-in slide-in-from-bottom-4">
              
              {/* 2. CAUSA ESPECÍFICA (DINÁMICA) */}
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-indigo-600"/>
                    Motivo Específico <span className="text-red-500">*</span>
                </label>
                <select 
                    className="w-full bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium rounded-xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={form.causa}
                    onChange={e => setForm({...form, causa: e.target.value})}
                    required
                >
                    <option value="" disabled>Selecciona la razón exacta...</option>
                    {CAUSAS_POR_CATEGORIA[form.categoria].map((opcion) => (
                        <option key={opcion.value} value={opcion.value}>
                            {opcion.label}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-2 ml-1">Seleccionar la causa correcta nos ayuda a resolver tu caso más rápido.</p>
              </div>

              {/* Selección de Orden (Solo si aplica) */}
              {form.categoria !== 'general' && form.categoria !== 'pago' && (
                <div>
                  <label className="block text-sm font-bold mb-2">Producto o Compra Afectada</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black"
                    value={form.orden_id}
                    onChange={e => setForm({...form, orden_id: e.target.value})}
                    required={form.categoria === 'devolucion'}
                  >
                    <option value="">Seleccionar orden...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                         Orden #{o.id} - {o.tienda} (RD$ {Number(o.total).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">Detalles Adicionales</label>
                <textarea 
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black resize-none"
                  placeholder="Explica qué sucedió exactamente. Ejemplo: El paquete llegó abierto..."
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  required
                />
              </div>

              {/* Input Imagen */}
              <div>
                <label className="block text-sm font-bold mb-2">Evidencia (Foto/Captura)</label>
                <label className="flex items-center gap-3 w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-100 transition text-slate-500">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <Upload size={20} className="text-indigo-600"/>
                    </div>
                    <span className="font-medium text-sm truncate">
                        {file ? file.name : "Adjuntar prueba (Opcional)"}
                    </span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={e => setFile(e.target.files[0])}
                    />
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-black text-white font-bold py-4 rounded-full text-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-xl"
              >
                {loading ? "Registrando Caso..." : "Abrir Reclamación"} <Send size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-400 font-medium">No tienes casos abiertos.</p>
                </div>
            ) : tickets.map(ticket => (
              <div key={ticket.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ticket.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        ticket.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {ticket.estado}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">CASO #{ticket.id}</span>
                    <span className="text-xs text-slate-400">• {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Mostrar Causa Específica formateada */}
                  <h3 className="font-bold text-lg text-slate-900 capitalize">
                      {ticket.causa?.replace(/_/g, ' ')}
                  </h3>
                  
                  <p className="text-slate-500 text-sm mt-1 line-clamp-1">{ticket.descripcion}</p>
                  
                  {ticket.evidencia_url && (
                      <a href={`http://localhost:4000${ticket.evidencia_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 mt-3 font-bold hover:underline bg-indigo-50 px-2 py-1 rounded-lg">
                          <ImageIcon size={14}/> Ver Evidencia
                      </a>
                  )}

                  {ticket.resolucion_admin && (
                      <div className="mt-3 p-3 bg-slate-50 border-l-4 border-black rounded-r-lg text-sm text-slate-700">
                          <span className="font-bold block text-black text-xs mb-1 uppercase">Resolución:</span>
                          {ticket.resolucion_admin}
                      </div>
                  )}
                </div>
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
                active ? 'border-black bg-slate-50 ring-1 ring-black shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300'
            }`}
        >
            <div className={`p-3 rounded-full ${active ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'}`}>
                {icon}
            </div>
            <span className={`font-bold text-sm ${active ? 'text-black' : 'text-slate-500'}`}>{title}</span>
        </div>
    )
}