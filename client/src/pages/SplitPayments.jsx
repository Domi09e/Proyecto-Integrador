import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Trash2, Calculator, ShoppingBag, ArrowRight, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/authContext";

export default function SplitPayment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // --- ESTADO 1: CREAR GRUPO NUEVO (Desde cero) ---
  const [createMembers, setCreateMembers] = useState([
    { id: 1, email: user.email, isMe: true },
    { id: 2, email: "", isMe: false },
  ]);
  
  // --- ESTADO 2: EDITAR GRUPO EXISTENTE (Agregar 1 persona) ---
  const [newParticipantEmail, setNewParticipantEmail] = useState("");

  // Cargar órdenes al inicio
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get("/client/active-orders");
        // data trae: { id, tienda, pendiente, grupo_pago_id, ... }
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // --- HANDLERS PARA CREAR GRUPO ---
  const handleAddCreateMember = () => setCreateMembers([...createMembers, { id: Date.now(), email: "", isMe: false }]);
  const handleRemoveCreateMember = (id) => setCreateMembers(createMembers.filter(m => m.id !== id));
  const handleChangeCreateMember = (id, val) => setCreateMembers(prev => prev.map(m => m.id === id ? { ...m, email: val } : m));

  const splitAmountCreate = selectedOrder ? (Number(selectedOrder.pendiente) / createMembers.length).toFixed(2) : 0;

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (createMembers.some(m => !m.email.trim())) return alert("Faltan correos");
    
    setProcessing(true);
    try {
      const integrantes = createMembers.filter(m => !m.isMe).map(m => ({ email: m.email }));
      await api.post("/bnpl/split-order", {
        ordenId: selectedOrder.id,
        integrantes
      });
      alert("¡Grupo creado! Deuda dividida.");
      navigate("/cartera");
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    } finally { setProcessing(false); }
  };

  // --- HANDLERS PARA AGREGAR PARTICIPANTE (EDITAR) ---
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!newParticipantEmail.trim()) return;

    setProcessing(true);
    try {
      // Usamos el endpoint específico para agregar gente a un grupo ya hecho
      const { data } = await api.post("/bnpl/split-order/add", {
        grupoId: selectedOrder.grupo_pago_id, // ID del grupo existente
        nuevoEmail: newParticipantEmail
      });
      
      alert(`¡Listo! ${data.message}\nTu cuota bajó a: RD$ ${data.nuevoMonto}`);
      navigate("/cartera");
    } catch (err) {
      alert(err.response?.data?.message || "Error al agregar participante.");
    } finally { setProcessing(false); }
  };

  // Resetear formularios al cambiar de orden
  useEffect(() => {
    if (selectedOrder) {
      // Limpiar campos
      setNewParticipantEmail("");
      setCreateMembers([{ id: 1, email: user.email, isMe: true }, { id: 2, email: "", isMe: false }]);
    }
  }, [selectedOrder, user.email]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900 pb-20 pt-8">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 text-center md:text-left border-b border-gray-200 pb-6">
          <h1 className="text-4xl font-black tracking-tight mb-2">Split Payments</h1>
          <p className="text-gray-500 font-medium">Divide tus compras o gestiona tus grupos activos.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* --- COLUMNA IZQUIERDA: LISTA DE COMPRAS --- */}
          <div className="lg:col-span-5 space-y-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Tus Compras Activas</h3>
             
             {loading ? <p className="px-2 text-slate-400">Cargando...</p> : orders.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-dashed border-gray-300 text-center text-gray-400">
                   <ShoppingBag className="mx-auto mb-2 opacity-50" />
                   No tienes compras activas para dividir.
                </div>
             ) : (
               <div className="space-y-3 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                 {orders.map(order => {
                   // ¿Es esta orden parte de un grupo ya?
                   const isGroup = !!order.grupo_pago_id;
                   const isSelected = selectedOrder?.id === order.id;

                   return (
                     <div 
                       key={order.id}
                       onClick={() => setSelectedOrder(order)}
                       className={`cursor-pointer p-5 rounded-3xl border-2 transition-all duration-200 relative overflow-hidden group ${
                          isSelected 
                            ? "border-black bg-slate-900 text-white shadow-xl scale-[1.02] z-10" 
                            : "border-transparent bg-white hover:border-gray-200 shadow-sm text-slate-900"
                       }`}
                     >
                       <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg leading-tight">{order.tienda}</h4>
                          {/* BADGE DE ESTADO */}
                          {isGroup && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                              <Users size={10} /> GRUPO ACTIVO
                            </span>
                          )}
                       </div>

                       <div className="flex justify-between items-end">
                          <p className={`text-xs ${isSelected ? 'text-slate-400' : 'text-gray-500'}`}>
                            {new Date(order.fecha).toLocaleDateString()}
                          </p>
                          <div className="text-right">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-400' : 'text-gray-400'}`}>Pendiente</p>
                            <p className="font-black text-xl">RD$ {Number(order.pendiente).toLocaleString()}</p>
                          </div>
                       </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>

          {/* --- COLUMNA DERECHA: PANEL DE ACCIÓN DINÁMICO --- */}
          <div className="lg:col-span-7">
             <AnimatePresence mode="wait">
               {!selectedOrder ? (
                 /* ESTADO VACÍO */
                 <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50 border-2 border-dashed border-gray-200 rounded-[40px] min-h-[400px]"
                 >
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                       <ArrowRight size={32} className="text-gray-400"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">Selecciona una orden</h3>
                    <p className="text-gray-400 text-sm mt-2 max-w-xs">Haz clic en una compra de la izquierda para ver las opciones de división.</p>
                 </motion.div>
               ) : (
                 /* FORMULARIO DINÁMICO */
                 <motion.div 
                   key={selectedOrder.id}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="bg-white rounded-[40px] shadow-2xl shadow-slate-200 border border-white p-8 sticky top-24"
                 >
                    {/* ENCABEZADO DEL PANEL */}
                    <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-100">
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${selectedOrder.grupo_pago_id ? 'bg-indigo-600' : 'bg-black'}`}>
                          {selectedOrder.grupo_pago_id ? <UserPlus size={32}/> : <Calculator size={32}/>}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Acción Requerida</p>
                          <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                            {selectedOrder.grupo_pago_id ? "Editar Grupo Existente" : "Crear Nuevo Grupo"}
                          </h2>
                       </div>
                    </div>

                    {/* --- CASO A: YA ES UN GRUPO (AGREGAR PERSONA) --- */}
                    {selectedOrder.grupo_pago_id ? (
                      <form onSubmit={handleSubmitAdd} className="space-y-6">
                         <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex gap-3">
                            <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={20}/>
                            <div className="text-sm text-indigo-800">
                               <p className="font-bold mb-1">Esta compra ya está dividida.</p>
                               <p>Puedes agregar más personas. El sistema recalculará la deuda y le bajará la cuota a todos los miembros actuales.</p>
                            </div>
                         </div>
                         
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Correo del nuevo integrante</label>
                            <input 
                              type="email" 
                              required
                              placeholder="amigo@email.com"
                              value={newParticipantEmail}
                              onChange={e => setNewParticipantEmail(e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all text-lg"
                            />
                         </div>

                         <div className="pt-4">
                            <button 
                              type="submit" 
                              disabled={processing}
                              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {processing ? "Procesando..." : "Agregar y Recalcular Cuotas"} <ArrowRight size={20}/>
                            </button>
                         </div>
                      </form>
                    ) : (
                    
                    /* --- CASO B: ORDEN NORMAL (CREAR GRUPO) --- */
                      <form onSubmit={handleSubmitCreate} className="space-y-6">
                         <div className="flex justify-between items-center mb-2">
                            <p className="font-bold text-slate-700">Integrantes ({createMembers.length})</p>
                            <button type="button" onClick={handleAddCreateMember} className="text-xs font-bold text-black bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition flex items-center gap-1">
                               <Plus size={14}/> Agregar
                            </button>
                         </div>

                         <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {createMembers.map((m, idx) => (
                               <div key={m.id} className="flex gap-3 items-center group">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                    {idx + 1}
                                  </div>
                                  <input 
                                    type="text" 
                                    placeholder={m.isMe ? "Yo (Organizador)" : "Email del amigo"}
                                    readOnly={m.isMe}
                                    value={m.email}
                                    onChange={e => handleChangeCreateMember(m.id, e.target.value)}
                                    className={`flex-1 border-2 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition font-medium ${m.isMe ? 'bg-gray-50 text-gray-400 border-transparent' : 'bg-white border-gray-100'}`}
                                  />
                                  {!m.isMe && (
                                    <button type="button" onClick={() => handleRemoveCreateMember(m.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={18}/></button>
                                  )}
                               </div>
                            ))}
                         </div>

                         <div className="bg-black text-white p-6 rounded-[24px] flex justify-between items-center shadow-xl mt-6">
                            <div>
                               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nueva cuota p/p</p>
                               <p className="text-3xl font-black">RD$ {Number(splitAmountCreate).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                               <button 
                                 type="submit" 
                                 disabled={processing}
                                 className="bg-white text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition disabled:opacity-50 transform active:scale-95"
                               >
                                 {processing ? "..." : "Confirmar"}
                               </button>
                            </div>
                         </div>
                         <p className="text-center text-xs text-gray-400">Se verificará el crédito de todos los participantes.</p>
                      </form>
                    )}

                 </motion.div>
               )}
             </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}