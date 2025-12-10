import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  RotateCcw, 
  BarChart3, 
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Users,
  Plus,
  CreditCard,
  Check,
  Calendar,
  Wallet
} from "lucide-react";
import api from "../api/axios";

export default function Pagos() {
  const navigate = useNavigate();
  const [installments, setInstallments] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados Modales
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [resInstallments, resDashboard, resMethods] = await Promise.all([
          api.get("/bnpl/pending-installments"),
          api.get("/client/payments-dashboard"),
          api.get("/client/payment-methods")
        ]);
        setInstallments(resInstallments.data);
        setDashboardData(resDashboard.data);
        setPaymentMethods(resMethods.data);
      } catch (err) {
        console.error("Error cargando datos", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const loadPayments = async () => {
      try {
          const { data } = await api.get("/bnpl/pending-installments");
          setInstallments(data);
          const resDash = await api.get("/client/payments-dashboard");
          setDashboardData(resDash.data);
      } catch(e) { console.error(e) }
  };

  const initiatePayment = (cuotaId) => {
    if (paymentMethods.length === 0) {
        if (window.confirm("No tienes métodos de pago. ¿Ir a la Cartera para agregar uno?")) navigate("/cartera");
        return;
    }
    setSelectedInstallment(cuotaId);
  };

  const confirmPayment = async (methodId) => {
    try {
      await api.post("/bnpl/pay", { 
        cuota_id: selectedInstallment,
        metodo_pago_id: methodId 
      });
      alert("¡Pago realizado con éxito!");
      setSelectedInstallment(null);
      await loadPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Error al procesar pago.");
    }
  };

  // Bloqueo scroll
  useEffect(() => {
    document.body.style.overflow = (showHistory || selectedInstallment) ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showHistory, selectedInstallment]);

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F7] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  );

  const totalOwed = Number(dashboardData?.totalOwed || 0);
  const today = new Date(); today.setHours(0,0,0,0);
  const overdue = installments.filter(i => new Date(i.fecha_vencimiento) < today);
  const upcoming = installments.filter(i => new Date(i.fecha_vencimiento) >= today);

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-slate-900 pb-24 pt-8">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* --- HEADER --- */}
        <header className="mb-12">
            <Link to="/descubrir" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                <ArrowLeft size={18} /> Volver al inicio
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Mis Pagos</h1>
                    <p className="text-slate-500 font-medium">Gestiona tus cuotas y mantén tu crédito saludable.</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-w-[280px]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deuda Total Pendiente</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-400">RD$</span>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                            {totalOwed.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </header>

        {/* --- ACCIONES RÁPIDAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <ActionCard 
                icon={<ShoppingBag size={24}/>} 
                title="Historial de Compras" 
                subtitle="Ver todas tus órdenes" 
                onClick={() => setShowHistory(true)}
                color="bg-indigo-50 text-indigo-600"
            />
            <ActionCard 
                icon={<RotateCcw size={24}/>} 
                title="Reembolsos" 
                subtitle="Reportar un problema" 
                onClick={() => navigate("/soporte")}
                color="bg-purple-50 text-purple-600"
            />
            <ActionCard 
                icon={<Wallet size={24}/>} 
                title="Mi Cartera" 
                subtitle="Gestionar tarjetas" 
                onClick={() => navigate("/cartera")}
                color="bg-emerald-50 text-emerald-600"
            />
        </div>

        {/* --- LISTA DE PAGOS --- */}
        <div>
            {installments.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">¡Estás al día!</h3>
                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">No tienes pagos pendientes por ahora. Disfruta de tu crédito disponible.</p>
                    <Link to="/tienda" className="inline-flex bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                        Ir de compras
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {overdue.length > 0 && (
                        <div>
                            <h3 className="text-lg font-black text-rose-600 flex items-center gap-2 mb-4">
                                <AlertCircle size={20}/> Pagos Atrasados
                            </h3>
                            <div className="space-y-3">
                                {overdue.map(item => <PaymentRow key={item.id} item={item} onPay={initiatePayment} isOverdue />)}
                            </div>
                        </div>
                    )}
                    
                    {upcoming.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-4">
                                <Clock size={20} className="text-slate-400"/> Próximos Vencimientos
                            </h3>
                            <div className="space-y-3">
                                {upcoming.map(item => <PaymentRow key={item.id} item={item} onPay={initiatePayment} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

      </div>

      {/* --- MODALES --- */}
      <AnimatePresence>
        {showHistory && <HistoryModal orders={dashboardData?.recentPurchases || []} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedInstallment && (
           <SelectPaymentModal 
             methods={paymentMethods} 
             onSelect={confirmPayment} 
             onClose={() => setSelectedInstallment(null)}
           />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- COMPONENTES ---

function ActionCard({ icon, title, subtitle, onClick, color }) {
    return (
        <motion.button 
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group w-full"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${color}`}>
                {icon}
            </div>
            <h3 className="font-bold text-lg text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 font-medium">{subtitle}</p>
        </motion.button>
    )
}

function PaymentRow({ item, onPay, isOverdue }) {
  const dateStr = new Date(item.fecha_vencimiento).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
  
  return (
    <div className={`flex items-center justify-between p-5 bg-white rounded-2xl border transition-all hover:shadow-md ${isOverdue ? 'border-rose-100 shadow-rose-100' : 'border-slate-100 shadow-sm'}`}>
       <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'}`}>
             {item.logo_tienda ? <img src={item.logo_tienda} className="w-full h-full object-cover rounded-2xl"/> : item.tienda.charAt(0)}
          </div>
          <div>
             <h4 className="font-bold text-lg text-slate-900">{item.tienda}</h4>
             <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isOverdue ? 'Vencido' : 'Vence'} {dateStr}
                </span>
                <span className="text-xs text-slate-400 font-mono">Cuota #{item.numero}</span>
             </div>
          </div>
       </div>
       
       <div className="text-right">
          <p className="font-black text-lg text-slate-900 mb-1">RD$ {Number(item.monto).toLocaleString()}</p>
          <button 
            onClick={() => onPay(item.id)} 
            className={`text-sm font-bold px-4 py-2 rounded-lg transition ${isOverdue ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200 shadow-lg' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 shadow-lg'}`}
          >
            Pagar
          </button>
       </div>
    </div>
  )
}

function SelectPaymentModal({ methods, onSelect, onClose }) {
    return (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 z-10 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900">Método de Pago</h3>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-900 transition"/></button>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {methods.map(m => (
                        <button key={m.id} onClick={() => onSelect(m.id)} className="w-full flex items-center justify-between p-4 border-2 border-slate-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/30 transition group text-left relative overflow-hidden">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-600 group-hover:bg-white group-hover:text-indigo-600 transition shadow-sm"><CreditCard size={20}/></div>
                                <div>
                                    <p className="font-bold text-sm text-slate-900">{m.marca}</p>
                                    <p className="text-xs text-slate-500 font-mono">•••• {m.ultimos_cuatro_digitos}</p>
                                </div>
                            </div>
                            {m.es_predeterminado && <Check size={20} className="text-emerald-500 relative z-10"/>}
                        </button>
                    ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                    <Link to="/cartera" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1">
                        <Plus size={16}/> Agregar nueva tarjeta
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}

function HistoryModal({ orders, onClose }) {
  const [editingGroup, setEditingGroup] = useState(null);

  return (
    <>
      <div className="fixed inset-0 z-[50] flex justify-end isolate"> 
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
         
         <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col">
            <div className="flex-none px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-20">
               <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">Historial</h2>
                   <p className="text-sm text-slate-500">Tus compras recientes</p>
               </div>
               <button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition text-slate-500 hover:text-slate-900"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
               {orders.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <ShoppingBag size={48} className="mb-4 opacity-20"/>
                    <p className="font-medium">Aún no has realizado compras.</p>
                 </div>
               ) : (
                 <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 my-2 pb-10">
                   {orders.map((order, idx) => (
                     <div key={idx} className="relative pl-8">
                       <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-slate-300 rounded-full border-2 border-white shadow-sm ring-2 ring-slate-50"></div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                         <Calendar size={10}/> {new Date(order.fecha).toLocaleDateString()}
                       </p>
                       <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start mb-4">
                             <h3 className="font-bold text-base text-slate-900">{order.tienda}</h3>
                             <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                               order.estado === 'completada' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                             }`}>
                               {order.estado}
                             </span>
                          </div>
                          <div className="flex justify-between items-end border-t border-slate-50 pt-3 mt-1">
                             <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Compra</p>
                                <p className="text-xl font-black text-slate-900">RD$ {Number(order.total).toLocaleString()}</p>
                             </div>
                             
                             {/* Botón Split (Si aplica) */}
                             {order.grupo_pago_id && order.estado !== 'completada' && (
                               <button 
                                 onClick={() => setEditingGroup(order.grupo_pago_id)} 
                                 className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition flex items-center gap-1 text-xs font-bold pr-3" 
                                 title="Agregar amigo"
                               >
                                 <Users size={16} /> Dividir
                               </button>
                             )}
                          </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
         </motion.div>
      </div>

      {editingGroup && <AddMemberModal grupoId={editingGroup} onClose={() => setEditingGroup(null)} />}
    </>
  );
}

function AddMemberModal({ grupoId, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/bnpl/split-order/add", { grupoId: grupoId, nuevoEmail: email });
      alert(`¡Listo! ${data.message}\nNueva cuota: RD$ ${data.nuevoMonto}`);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error al agregar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></motion.div>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl z-10">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 transition"><X size={20} /></button>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-indigo-50"><Users size={28} /></div>
          <h3 className="text-xl font-black text-slate-900">Dividir Cuenta</h3>
          <p className="text-slate-500 text-sm mt-1">Invita a un amigo a pagar esta orden contigo.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-1 block">Email del usuario</label>
             <input type="email" required placeholder="amigo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium transition text-slate-900" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20">
            {loading ? "Procesando..." : "Agregar y Recalcular"} {!loading && <Plus size={18} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}