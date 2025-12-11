import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchPublicStores } from "../api/stores";
import api from "../api/axios";
import { 
  ArrowLeft, ExternalLink, Star, MapPin, Truck, ShieldCheck, 
  ShoppingCart, Trash2, Plus, PiggyBank, X, Calendar, Check 
} from "lucide-react";
import { useAuth } from "../context/authContext";
import { motion, AnimatePresence } from "framer-motion";
import CheckoutModal from "../components/checkoutModal";

// Generador de productos falsos (Vitrina)
const getMockProducts = (storeName) => {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    name: `Producto ${storeName} ${i + 1}`,
    price: parseFloat((Math.random() * 15000 + 3500).toFixed(2)), // Precios un poco más realistas para metas
    image: `https://placehold.co/300x300/e2e8f0/1e293b?text=Item+${i+1}`
  }));
};

export default function StoreDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [store, setStore] = useState(null);
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // --- ESTADO DEL CARRITO (BNPL) ---
  const [cart, setCart] = useState([]); 
  const [showCheckout, setShowCheckout] = useState(false);

  // --- NUEVO: ESTADO PARA SNBL (AHORRO) ---
  const [snblTarget, setSnblTarget] = useState(null); // Producto seleccionado para ahorrar

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const storeData = await fetchPublicStores();
        const found = Array.isArray(storeData) ? storeData.find(s => s.id == id) : storeData;
        
        if (!found) throw new Error("Tienda no encontrada");
        setStore(found);

        if (isAuthenticated) {
          const { data: profile } = await api.get("/client/profile");
          setCredit(Number(profile.poder_credito));
        }
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la tienda.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isAuthenticated]);

  // --- FUNCIONES DEL CARRITO ---
  const addToCart = (product) => {
    setCart(prev => [...prev, product]);
  };

  const removeFromCart = (indexToRemove) => {
    setCart(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price, 0);

  const handleCheckoutClick = () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (cart.length === 0) { alert("Tu carrito está vacío."); return; }
    setShowCheckout(true);
  };

  // --- NUEVO: FUNCIONES SNBL ---
  
  // 1. Ahorrar para un solo producto (desde la vitrina)
  const handleSnblSingle = (product) => {
    if (!isAuthenticated) { 
        if(window.confirm("Debes iniciar sesión para guardar una meta. ¿Ir al login?")) navigate("/login");
        return; 
    }
    setSnblTarget(product); 
  };

  // 2. Ahorrar para TODO el carrito (desde el sidebar)
  const handleSnblCart = () => {
    if (!isAuthenticated) { 
        if(window.confirm("Debes iniciar sesión para guardar una meta. ¿Ir al login?")) navigate("/login");
        return; 
    }
    if (cart.length === 0) return;

    // Creamos un objeto resumen que representa todo el carrito
    const cartSummaryProduct = {
        name: `Pack de ${cart.length} productos (${cart[0].name}...)`,
        price: cartTotal,
        image: cart[0].image // Usamos la imagen del primer producto como referencia
    };
    
    setSnblTarget(cartSummaryProduct);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div></div>;
  if (error || !store) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-500">{error}</div>;

  const mockProducts = getMockProducts(store.nombre || store.name);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* 1. HERO BANNER */}
      <div className="relative h-64 md:h-80 bg-slate-900 overflow-hidden">
        <img 
          src={`https://placehold.co/1200x400/0f172a/1e293b?text=${store.nombre || "Tienda"}`} 
          alt="Cover" 
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 max-w-7xl mx-auto flex items-end gap-6">
          <img 
            src={store.logo_url || store.logo || "https://placehold.co/100"} 
            alt="Logo" 
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-slate-50 shadow-xl bg-white object-contain"
          />
          <div className="text-white mb-2">
            <h1 className="text-3xl md:text-5xl font-bold">{store.nombre || store.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm md:text-base text-slate-300">
              <span className="flex items-center gap-1"><Star size={16} className="text-yellow-400 fill-yellow-400"/> 4.8</span>
              <span>•</span>
              <span>{store.category || "General"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. VITRINA DE PRODUCTOS */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Badge icon={<Truck size={14}/>} text="Envío Gratis" />
            <Badge icon={<ShieldCheck size={14}/>} text="Garantía Oficial" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Catálogo Disponible</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mockProducts.map((prod) => (
                <div key={prod.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                    
                    {/* Botones Flotantes */}
                    <div className="absolute bottom-3 right-3 flex flex-col gap-2 translate-y-20 group-hover:translate-y-0 transition-transform duration-300">
                        {/* Botón SNBL (Ahorro Individual) */}
                        <button 
                          onClick={() => handleSnblSingle(prod)}
                          className="bg-white p-2.5 rounded-full shadow-lg hover:bg-indigo-600 hover:text-white text-indigo-600 transition flex items-center justify-center tooltip-trigger"
                          title="Planear Compra (Ahorro)"
                        >
                          <PiggyBank size={20} />
                        </button>

                        {/* Botón Carrito (BNPL) */}
                        <button 
                          onClick={() => addToCart(prod)}
                          className="bg-white p-2.5 rounded-full shadow-lg hover:bg-emerald-500 hover:text-white text-emerald-600 transition flex items-center justify-center"
                          title="Agregar al carrito (BNPL)"
                        >
                          <Plus size={20} />
                        </button>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{prod.name}</h3>
                    <p className="text-emerald-600 font-bold mt-1">RD$ {prod.price.toLocaleString()}</p>
                    <div className="mt-auto pt-2 flex flex-col gap-1">
                        <p className="text-[10px] text-slate-400">
                          BNPL: 4 cuotas de RD$ {(prod.price/4).toFixed(2)}
                        </p>
                        {/* Etiqueta Visual SNBL */}
                        <p className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                           <PiggyBank size={10}/> SNBL Disponible
                        </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. CARRITO LATERAL (STICKY) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            
            {/* Resumen del Carrito */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <ShoppingCart size={18} /> Tu Carrito (BNPL)
                </h3>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{cart.length} ítems</span>
              </div>

              <div className="p-4 max-h-60 overflow-y-auto space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-4">El carrito está vacío.</p>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="text-slate-700 font-medium truncate w-40">{item.name}</p>
                        <p className="text-xs text-slate-400">RD$ {item.price.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => removeFromCart(idx)} 
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600 font-medium">Total:</span>
                  <span className="text-xl font-bold text-slate-900">RD$ {cartTotal.toLocaleString()}</span>
                </div>

                {isAuthenticated && credit !== null && (
                  <div className="mb-4 text-xs text-center">
                    <span className={cartTotal > credit ? "text-red-500 font-bold" : "text-emerald-600"}>
                      Crédito disponible: RD$ {credit.toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleCheckoutClick}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition shadow-lg shadow-emerald-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pagar con BNPL
                </button>

                {/* BOTÓN SNBL (CARRITO COMPLETO) */}
                <button
                  onClick={handleSnblCart}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PiggyBank size={18}/> Planear Compra (Ahorro)
                </button>
              </div>
            </div>

            {/* Info Tienda */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <h4 className="font-bold text-slate-800 mb-4">Información</h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <MapPin size={18} className="text-slate-400 shrink-0"/> 
                  {store.direccion || "Ubicación no disponible"}
                </li>
                {store.sitio_web && (
                  <li className="flex gap-3">
                    <ExternalLink size={18} className="text-slate-400 shrink-0"/>
                    <a href={store.sitio_web} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline truncate">
                      Visitar sitio web
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <Link to="/tienda" className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition py-2">
              <ArrowLeft size={16} /> Volver al directorio
            </Link>

          </div>
        </div>
      </div>

      {/* --- MODAL BNPL (CHECKOUT) --- */}
      {showCheckout && (
        <CheckoutModal 
          tienda={store} 
          initialAmount={cartTotal} 
          onClose={() => setShowCheckout(false)} 
        />
      )}

      {/* --- MODAL SNBL (PLAN DE AHORRO) --- */}
      <AnimatePresence>
        {snblTarget && (
           <SnblModal 
             product={snblTarget} 
             storeId={store.id} 
             onClose={() => setSnblTarget(null)} 
           />
        )}
      </AnimatePresence>

    </div>
  );
}

// --- SUBCOMPONENTES ---

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm whitespace-nowrap">
      {icon} {text}
    </div>
  );
}

function SnblModal({ product, storeId, onClose }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Configuración Inicial
    const [config, setConfig] = useState({
        frecuencia: 'semanal', 
        duracion: 4 
    });

    const montoTotal = product.price;
    const cuota = montoTotal / config.duracion;

    // Calcular fecha
    const daysMap = { semanal: 7, quincenal: 15, mensual: 30 };
    const daysTotal = config.duracion * daysMap[config.frecuencia];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysTotal);

    const handleCreateGoal = async () => {
        setLoading(true);
        try {
            await api.post("/client/snbl/goals", {
                tienda_id: storeId,
                producto_nombre: product.name,
                monto_meta: montoTotal,
                frecuencia: config.frecuencia,
                fecha_objetivo: targetDate.toISOString().split('T')[0]
            });
            alert("¡Plan creado! Ahora puedes ir abonando poco a poco.");
            navigate("/ahorros");
        } catch (e) {
            console.error(e);
            alert("Error al crear la meta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden z-10">
                
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2"><PiggyBank size={24} className="text-indigo-200"/> Plan de Ahorro</h3>
                        <p className="text-indigo-100 text-sm mt-1">Sin crédito, sin intereses.</p>
                    </div>
                    <button onClick={onClose}><X size={24}/></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Resumen Producto */}
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <img src={product.image} className="w-16 h-16 rounded-lg object-cover bg-white"/>
                        <div>
                            <p className="font-bold text-slate-800 text-sm line-clamp-1">{product.name}</p>
                            <p className="text-emerald-600 font-bold">RD$ {montoTotal.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Configuración */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Frecuencia de Aporte</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['semanal', 'quincenal', 'mensual'].map(f => (
                                <button 
                                    key={f}
                                    onClick={() => setConfig({...config, frecuencia: f})}
                                    className={`py-2 rounded-lg text-xs font-bold capitalize transition ${
                                        config.frecuencia === f 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Duración</label>
                            <span className="text-xs font-bold text-indigo-600">{config.duracion} {config.frecuencia}s</span>
                        </div>
                        <input 
                            type="range" min="2" max="24" step="1"
                            value={config.duracion}
                            onChange={(e) => setConfig({...config, duracion: Number(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    {/* Resultado */}
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-indigo-800 font-medium">Tu aporte {config.frecuencia}:</span>
                            <span className="text-xl font-black text-indigo-900">RD$ {cuota.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-indigo-500 mt-2 border-t border-indigo-100 pt-2">
                            <span className="flex items-center gap-1"><Calendar size={12}/> Meta:</span>
                            <span className="font-bold">{targetDate.toLocaleDateString()}</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateGoal}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? "Creando..." : "Confirmar Plan"} <Check size={18}/>
                    </button>
                </div>
            </motion.div>
        </div>
    )
}