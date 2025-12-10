import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, ArrowRight, Star, Tag, Filter } from "lucide-react";
import { fetchPublicStores } from "../api/stores";
import api from "../api/axios"; // Usamos api para traer categorías también si quieres

/* ---------------------------------------------------------
   COMPONENTE: TARJETA DE TIENDA
--------------------------------------------------------- */
const StoreCard = ({ id, name, logo, category, description }) => {
  // Generamos un color de fondo aleatorio suave basado en el nombre para el banner
  const colors = ["bg-blue-50", "bg-indigo-50", "bg-rose-50", "bg-teal-50", "bg-amber-50"];
  const randomColor = colors[name.length % colors.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/tiendas/${id}`}
        className="group block bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 transform hover:-translate-y-1"
      >
        {/* Banner Superior Simulado */}
        <div className={`h-24 ${randomColor} relative`}>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          {/* Badge de Categoría */}
          <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold text-slate-600 px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Tag size={10} /> {category}
          </span>
        </div>

        {/* Contenido */}
        <div className="px-5 pb-6">
          <div className="relative flex justify-between items-end -mt-10 mb-3">
            {/* Logo Flotante */}
            <div className="h-20 w-20 rounded-2xl bg-white p-1 shadow-md">
              <div className="h-full w-full rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                {logo ? (
                  <img src={logo} alt={name} className="h-full w-full object-contain p-1" />
                ) : (
                  <ShoppingBag className="text-slate-300 h-8 w-8" />
                )}
              </div>
            </div>
            
            {/* Rating Simulado */}
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg">
              <Star size={12} className="text-yellow-400 fill-yellow-400" /> 4.8
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {name}
          </h3>
          
          <p className="text-sm text-slate-500 line-clamp-2 mt-1 min-h-[40px]">
            {description || "Descubre los mejores productos y paga en cuotas flexibles con BNPL."}
          </p>

          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              BNPL Disponible
            </span>
            <span className="text-indigo-600 p-2 rounded-full bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

/* ---------------------------------------------------------
   PÁGINA PRINCIPAL
--------------------------------------------------------- */
export default function TiendaPage() {
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  
  // Estado de Filtros
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [categories, setCategories] = useState(["Todas"]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar Tiendas y extraer categorías únicas
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPublicStores(); // Asegúrate que esto llama a tu backend actualizado
        setStores(data);
        setFilteredStores(data);

        // Extraer categorías dinámicamente de las tiendas cargadas
        // (O podrías llamar a un endpoint /api/categorias si prefieres)
        const uniqueCats = new Set(["Todas"]);
        data.forEach(store => {
          if (store.categories && Array.isArray(store.categories)) {
            store.categories.forEach(c => uniqueCats.add(c));
          } else if (store.category) {
            uniqueCats.add(store.category);
          }
        });
        setCategories(Array.from(uniqueCats));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 2. Lógica de Filtrado (Se ejecuta cuando cambia search o activeCategory)
  useEffect(() => {
    let result = stores;

    // Filtro por Categoría
    if (activeCategory !== "Todas") {
      result = result.filter(store => {
        // Verifica si la tienda tiene esa categoría en su lista o es su categoría principal
        if (store.categories) return store.categories.includes(activeCategory);
        return store.category === activeCategory;
      });
    }

    // Filtro por Buscador
    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(store => 
        store.name.toLowerCase().includes(lowerTerm)
      );
    }

    setFilteredStores(result);
  }, [activeCategory, searchTerm, stores]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* HEADER HERO */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4"
          >
            Explora nuestras <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">Tiendas Asociadas</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 max-w-2xl mx-auto"
          >
            Encuentra tus marcas favoritas y paga a tu ritmo. Tecnología, moda, hogar y más con 0% de interés pagando en 4 cuotas quincenales.
          </motion.p>

          {/* BARRA DE BÚSQUEDA FLOTANTE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 max-w-lg mx-auto relative"
          >
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar tienda (ej. Nike, Apple)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border-none shadow-xl shadow-indigo-100 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/50 outline-none transition placeholder:text-slate-400"
            />
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* BARRA DE FILTROS (CHIPS) */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 transform scale-105"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-0 rounded-full border-2 border-indigo-500/0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* GRID DE TIENDAS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-400">Cargando catálogo...</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                  <StoreCard key={store.id} {...store} />
                ))
              ) : (
                <div className="col-span-full text-center py-20">
                  <div className="inline-flex bg-slate-100 p-4 rounded-full mb-4">
                    <Filter className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No encontramos resultados</h3>
                  <p className="text-slate-500">Prueba ajustando los filtros o tu búsqueda.</p>
                  <button 
                    onClick={() => {setSearchTerm(""); setActiveCategory("Todas")}}
                    className="mt-4 text-indigo-600 font-semibold hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}