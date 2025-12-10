// client/src/pages/BNPL.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; 
import { 
  Search, 
  ArrowRight, 
  ShoppingBag, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  TrendingUp,
  Smartphone,
  Shirt,
  Home,
  Gift
} from "lucide-react";
import { fetchPublicStores } from "../api/stores"; // 👈 Conexión real con BD

// Categorías rápidas (Iconos)
const CATEGORIES = [
  { name: "Tecnología", icon: <Smartphone />, color: "bg-blue-100 text-blue-600" },
  { name: "Moda", icon: <Shirt />, color: "bg-rose-100 text-rose-600" },
  { name: "Hogar", icon: <Home />, color: "bg-amber-100 text-amber-600" },
  { name: "Variedades", icon: <Gift />, color: "bg-purple-100 text-purple-600" },
];

export default function Descubrir() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar Tiendas Reales al inicio
  useEffect(() => {
    const loadStores = async () => {
      try {
        const data = await fetchPublicStores();
        setStores(data);
      } catch (error) {
        console.error("Error cargando tiendas:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, []);

  // Filtro dinámico
  const filteredStores = stores.filter((store) =>
    store.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Animaciones
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* --- HERO SECTION --- */}
      <header className="relative overflow-hidden bg-white pb-20 pt-24 lg:pt-32">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
            <div className="absolute top-20 right-0 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-20 left-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-4">
              La nueva forma de comprar
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
              Compra lo que amas. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">
                Paga a tu ritmo.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Divide cualquier compra en 4 cuotas sin intereses o financia a largo plazo en tus tiendas favoritas. Sin sorpresas.
            </p>
            
            {/* BARRA DE BÚSQUEDA PRINCIPAL */}
            <div className="max-w-xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative bg-white rounded-full shadow-xl flex items-center p-2">
                <Search className="text-slate-400 ml-4 w-6 h-6" />
                <input 
                  type="text"
                  placeholder="Busca tiendas (ej. Nike, Apple)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-3 text-slate-700 outline-none bg-transparent placeholder:text-slate-400"
                />
                <button className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-slate-800 transition">
                  Buscar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* --- CATEGORÍAS RÁPIDAS --- */}
      <section className="py-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-[72px] z-10">
        <div className="max-w-7xl mx-auto px-6 flex justify-center gap-4 md:gap-8 overflow-x-auto no-scrollbar">
           {CATEGORIES.map((cat) => (
             <button 
               key={cat.name}
               onClick={() => {
                 setSearch(cat.name === "Variedades" ? "" : cat.name);
                 // Aquí podrías activar un filtro real
               }}
               className="flex flex-col items-center gap-2 group min-w-[80px]"
             >
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-transform group-hover:-translate-y-1 group-hover:shadow-md ${cat.color}`}>
                 {cat.icon}
               </div>
               <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">{cat.name}</span>
             </button>
           ))}
        </div>
      </section>

      {/* --- LISTADO DE TIENDAS (GRID) --- */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tiendas Destacadas</h2>
            <p className="text-slate-500">Explora las marcas donde puedes usar tu crédito.</p>
          </div>
          <Link to="/tienda" className="text-indigo-600 font-semibold hover:underline hidden md:inline-block">
            Ver directorio completo &rarr;
          </Link>
        </div>

        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[1,2,3,4].map(i => (
               <div key={i} className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
             ))}
           </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredStores.map((store) => (
              <Link 
                to={`/tiendas/${store.id}`} 
                key={store.id}
                className="group relative bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col"
              >
                {/* Banner imagen */}
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                  <img 
                    src={`https://placehold.co/600x300/f1f5f9/94a3b8?text=${store.name}`} 
                    alt="banner" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Logo Flotante */}
                  <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-xl bg-white p-1 shadow-md">
                     <img 
                        src={store.logo || store.logo_url || "https://placehold.co/100"} 
                        alt={store.name} 
                        className="w-full h-full object-contain rounded-lg border border-slate-50"
                     />
                  </div>
                </div>

                <div className="pt-8 px-6 pb-6 flex-1 flex flex-col">
                   <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                     {store.name}
                   </h3>
                   <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                     {store.description || "Compra ahora y paga después en cuotas flexibles."}
                   </p>
                   
                   <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        <Zap size={12} fill="currentColor" /> 0% Interés
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowRight size={16} />
                      </div>
                   </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">No encontramos tiendas con ese nombre.</p>
            <button 
              onClick={() => setSearch("")}
              className="mt-4 text-indigo-600 font-semibold hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </section>

      {/* --- BENEFICIOS (CÓMO FUNCIONA) --- */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Por qué usar BNPL?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Te damos el poder financiero para obtener lo que necesitas hoy, sin comprometer tu presupuesto de mañana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard 
              icon={<CreditCard className="text-pink-400" size={32} />}
              title="Sin sorpresas"
              desc="Lo que ves es lo que pagas. Sin comisiones ocultas ni letras pequeñas."
            />
            <FeatureCard 
              icon={<TrendingUp className="text-indigo-400" size={32} />}
              title="Construye Crédito"
              desc="Paga a tiempo y aumenta tu límite de crédito automáticamente con nuestra gamificación."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-emerald-400" size={32} />}
              title="Seguridad Total"
              desc="Tus compras están protegidas. Si algo sale mal, pausamos tus pagos hasta resolverlo."
            />
          </div>
        </div>
      </section>

      {/* --- CALL TO ACTION --- */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            ¿Tienes un negocio?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Únete a las cientos de tiendas que están aumentando sus ventas ofreciendo BNPL a sus clientes.
          </p>
          <Link 
            to="/quiero-ser-tienda-bnpl"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-600 transition shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            Convertirme en Partner <ArrowRight />
          </Link>
        </div>
      </section>

      {/* --- FOOTER SIMPLE --- */}
      <footer className="bg-white py-10 border-t border-slate-100 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} BNPL Platform. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

// Subcomponente para Features
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition duration-300">
      <div className="mb-6 bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}