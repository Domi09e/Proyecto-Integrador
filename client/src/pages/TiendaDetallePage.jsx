import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Globe, Phone, Star, 
  ShoppingBag, PiggyBank, Calendar, DollarSign, X, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

export default function TiendaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal SNBL
  const [showSnblModal, setShowSnblModal] = useState(false);

  useEffect(() => {
    const loadStore = async () => {
      try {
        // Asumiendo que tienes este endpoint, si no, usa el de listado y filtra
        const { data } = await api.get(`/admin/tiendas/${id}`); // O el endpoint público que tengas
        setStore(data);
      } catch (error) {
        console.error("Error cargando tienda", error);
        // Fallback si no hay endpoint individual público aún, buscamos en la lista
        // const { data } = await api.get("/public/tiendas");
        // setStore(data.find(t => t.id == id));
      } finally {
        setLoading(false);
      }
    };
    loadStore();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  if (!store) return <div className="text-center py-20">Tienda no encontrada.</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* --- HERO BANNER --- */}
      <div className="relative h-64 bg-slate-900 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-indigo-900 opacity-90"></div>
         {/* Patrón de fondo opcional */}
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         
         <div className="relative max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
            <Link to="/tienda" className="inline-flex items-center text-white/70 hover:text-white mb-6 transition-colors w-fit">
               <ArrowLeft size={20} className="mr-2"/> Volver al catálogo
            </Link>
            
            <div className="flex items-center gap-6">
               <div className="h-24 w-24 bg-white rounded-2xl p-1 shadow-2xl rotate-3 transform border-4 border-white/10">
                  {store.logo_url ? (
                     <img src={store.logo_url} alt={store.nombre} className="w-full h-full object-contain rounded-xl"/>
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-700 bg-slate-50 rounded-xl">{store.nombre.charAt(0)}</div>
                  )}
               </div>
               <div>
                  <h1 className="text-4xl font-black text-white tracking-tight mb-2">{store.nombre}</h1>
                  <div className="flex items-center gap-4 text-indigo-200 text-sm font-medium">
                     <span className="flex items-center gap-1"><TagBadge>{store.category || "General"}</TagBadge></span>
                     <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400"/> 4.9 (120 reviews)</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* COLUMNA IZQUIERDA: INFO */}
         <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-4 text-lg">Información</h3>
               <ul className="space-y-4 text-sm text-slate-600">
                  {store.direccion && <li className="flex items-start gap-3"><MapPin className="text-indigo-500 shrink-0" size={18}/> {store.direccion}</li>}
                  {store.sitio_web && <li className="flex items-center gap-3"><Globe className="text-emerald-500 shrink-0" size={18}/> <a href={store.sitio_web} target="_blank" rel="noreferrer" className="hover:underline text-indigo-600 truncate">{store.sitio_web}</a></li>}
                  {store.telefono && <li className="flex items-center gap-3"><Phone className="text-blue-500 shrink-0" size={18}/> {store.telefono}</li>}
               </ul>
            </div>

            <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-2">¡Paga como quieras!</h3>
                  <p className="text-indigo-100 text-sm mb-4">Esta tienda acepta crédito BNPL y planes de ahorro programado.</p>
                  <div className="flex gap-2">
                     <div className="bg-white/20 p-2 rounded-lg"><ShoppingBag size={20}/></div>
                     <div className="bg-white/20 p-2 rounded-lg"><PiggyBank size={20}/></div>
                  </div>
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-10"><ShoppingBag size={120}/></div>
            </div>
         </div>

         {/* COLUMNA DERECHA: ACCIONES DE COMPRA (Simulando Productos) */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* SIMULADOR DE COMPRA */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
               <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">¿Qué deseas comprar hoy?</h2>
                  <p className="text-slate-500">Como esta es una demostración, puedes simular la compra de cualquier producto.</p>
               </div>

               {/* Grid de Productos Demo (Opcional, o formulario directo) */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <ProductCardDemo name="Laptop Pro X" price={45000} onSelect={() => setShowSnblModal({name: "Laptop Pro X", price: 45000})} />
                  <ProductCardDemo name="Smart TV 55'" price={28500} onSelect={() => setShowSnblModal({name: "Smart TV 55'", price: 28500})} />
               </div>

               {/* O Botón Genérico */}
               <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center">
                  <p className="font-medium text-slate-600 mb-4">¿Buscas otra cosa?</p>
                  <div className="flex justify-center gap-4">
                     <button 
                        onClick={() => alert("Iría al carrito BNPL")} 
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center gap-2"
                     >
                        <ShoppingBag size={18}/> Comprar Ahora (BNPL)
                     </button>
                     
                     <button 
                        onClick={() => setShowSnblModal({ name: "", price: "" })} 
                        className="bg-white text-indigo-600 border-2 border-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition flex items-center gap-2"
                     >
                        <PiggyBank size={18}/> Planear Compra (SNBL)
                     </button>
                  </div>
               </div>
            </div>

         </div>
      </div>

      {/* --- MODAL SNBL (PLANEAR COMPRA) --- */}
      <AnimatePresence>
         {showSnblModal && (
            <SnblCreationModal 
               storeId={id} 
               initialData={showSnblModal} 
               onClose={() => setShowSnblModal(false)} 
            />
         )}
      </AnimatePresence>

    </div>
  );
}

/* ---------------------------------------------------------
   SUBCOMPONENTES
--------------------------------------------------------- */

function TagBadge({ children }) {
   return <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-semibold border border-white/20">{children}</span>;
}

function ProductCardDemo({ name, price, onSelect }) {
   return (
      <div className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer bg-white group" onClick={onSelect}>
         <div className="h-32 bg-slate-100 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 transition-colors">
            <ShoppingBag size={32}/>
         </div>
         <h4 className="font-bold text-slate-900">{name}</h4>
         <p className="text-emerald-600 font-bold">RD$ {price.toLocaleString()}</p>
         <p className="text-xs text-indigo-500 font-medium mt-2 flex items-center gap-1">
            <PiggyBank size={12}/> Click para planear ahorro
         </p>
      </div>
   )
}

// --- MODAL LÓGICO DE SNBL ---
function SnblCreationModal({ storeId, initialData, onClose }) {
   const navigate = useNavigate();
   const [form, setForm] = useState({
      producto_nombre: initialData.name || "",
      monto_meta: initialData.price || "",
      frecuencia: "semanal",
      duracion: 4 // Semanas o Quincenas
   });
   const [loading, setLoading] = useState(false);

   // Cálculos dinámicos
   const monto = Number(form.monto_meta) || 0;
   const cuota = monto > 0 ? monto / form.duracion : 0;
   
   // Calcular fecha objetivo aproximada
   const daysToAdd = form.frecuencia === 'semanal' ? form.duracion * 7 : form.frecuencia === 'quincenal' ? form.duracion * 15 : form.duracion * 30;
   const targetDate = new Date();
   targetDate.setDate(targetDate.getDate() + daysToAdd);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
         await api.post("/client/snbl/goals", {
            tienda_id: storeId,
            producto_nombre: form.producto_nombre,
            monto_meta: form.monto_meta,
            frecuencia: form.frecuencia,
            fecha_objetivo: targetDate.toISOString().split('T')[0]
         });
         alert("¡Plan de ahorro creado exitosamente!");
         navigate("/ahorros"); // Redirigir a la página de mis ahorros
      } catch (error) {
         console.error(error);
         alert("Error al crear el plan.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
         <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
         
         <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden z-10">
            
            {/* Header Modal */}
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                     <PiggyBank className="text-indigo-200"/> Planificar Compra
                  </h3>
                  <p className="text-indigo-200 text-sm mt-1">Ahorra poco a poco, sin deudas ni estrés.</p>
               </div>
               <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
               
               {/* Inputs Producto */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto</label>
                     <input 
                        required 
                        value={form.producto_nombre} 
                        onChange={e=>setForm({...form, producto_nombre: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition"
                        placeholder="Ej. PlayStation 5"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio (Meta)</label>
                     <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                           type="number" required 
                           value={form.monto_meta} 
                           onChange={e=>setForm({...form, monto_meta: e.target.value})}
                           className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 font-bold outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition"
                           placeholder="0.00"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frecuencia</label>
                     <select 
                        value={form.frecuencia} 
                        onChange={e=>setForm({...form, frecuencia: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 bg-slate-50 cursor-pointer"
                     >
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                     </select>
                  </div>
               </div>

               {/* Slider Duración */}
               <div>
                  <div className="flex justify-between text-sm mb-2">
                     <span className="font-bold text-slate-600">Plazo de ahorro</span>
                     <span className="font-bold text-indigo-600">{form.duracion} {form.frecuencia}s</span>
                  </div>
                  <input 
                     type="range" min="1" max="24" 
                     value={form.duracion} 
                     onChange={e=>setForm({...form, duracion: Number(e.target.value)})}
                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                     <span>Rápido (1)</span>
                     <span>Lento (24)</span>
                  </div>
               </div>

               {/* Resumen Card */}
               <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex items-center justify-between">
                  <div>
                     <p className="text-xs text-indigo-400 font-bold uppercase mb-1">Tu aporte {form.frecuencia}</p>
                     <p className="text-2xl font-black text-indigo-900">RD$ {cuota.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-indigo-400 font-bold uppercase mb-1">Fecha Estimada</p>
                     <p className="text-sm font-bold text-indigo-700 flex items-center gap-1 justify-end">
                        <Calendar size={14}/> {targetDate.toLocaleDateString()}
                     </p>
                  </div>
               </div>

               <button disabled={loading} type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                  {loading ? "Creando..." : "Confirmar Plan de Ahorro"}
               </button>

            </form>
         </motion.div>
      </div>
   )
}