import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchPublicStores } from "../api/stores";
import api from "../api/axios";
import { ArrowLeft, ExternalLink, Star, MapPin, Truck, ShieldCheck, ShoppingCart, Trash2, Plus } from "lucide-react";
import { useAuth } from "../context/authContext";
import CheckoutModal from "../components/checkoutModal";

// Generador de productos falsos (Vitrina)
const getMockProducts = (storeName) => {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    name: `Producto ${storeName} ${i + 1}`,
    price: parseFloat((Math.random() * 5000 + 1500).toFixed(2)), // Precio numérico
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
  
  // --- NUEVO: ESTADO DEL CARRITO ---
  const [cart, setCart] = useState([]); 
  const [showCheckout, setShowCheckout] = useState(false);

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
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }
    setShowCheckout(true);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando...</div>;
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
                    
                    {/* Botón Flotante Agregar */}
                    <button 
                      onClick={() => addToCart(prod)}
                      className="absolute bottom-3 right-3 bg-white p-2.5 rounded-full shadow-lg hover:bg-emerald-500 hover:text-white text-emerald-600 transition translate-y-10 group-hover:translate-y-0"
                      title="Agregar al carrito"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{prod.name}</h3>
                    <p className="text-emerald-600 font-bold mt-1">RD$ {prod.price.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-auto pt-2">
                      4 cuotas de RD$ {(prod.price/4).toFixed(2)}
                    </p>
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
                  <ShoppingCart size={18} /> Tu Carrito simulado
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

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
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

      {showCheckout && (
        <CheckoutModal 
          tienda={store} 
          initialAmount={cartTotal} // <--- PASAMOS EL TOTAL DEL CARRITO
          onClose={() => setShowCheckout(false)} 
        />
      )}
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm whitespace-nowrap">
      {icon} {text}
    </div>
  );
}