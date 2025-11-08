import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- Componente Reutilizable para la Tarjeta de Tienda (Nuevo Estilo) ---
const StoreCard = ({ name, logo, category, bannerImage, cashback, paymentMethods }) => (
  <Link
    to={`/tienda/${name.toLowerCase().replace(/\s+/g, '-')}`} // Ruta de ejemplo
    className="group block bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md"
  >
    {/* Banner Image */}
    <div className="h-32 bg-gray-100 overflow-hidden">
        <img
            src={bannerImage || `https://placehold.co/400x200/f0f0f0/ccc?text=Store`}
            alt={`${name} banner`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/400x200/f0f0f0/ccc?text=Store`; }}
        />
    </div>
    {/* Store Info */}
    <div className="p-4">
      <div className="flex items-center mb-2">
        <img
          src={logo || `https://placehold.co/40x40/eee/ccc?text=${name.charAt(0)}`}
          alt={`${name} logo`}
          className="h-8 w-8 object-contain mr-3 rounded-full border border-gray-100"
          onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/40x40/eee/ccc?text=${name.charAt(0)}`; }}
        />
        <div>
            <p className="font-semibold text-gray-900 leading-tight">{name}</p>
            <p className="text-xs text-gray-500">{category}</p>
        </div>
      </div>
       {cashback && (
            <p className="text-xs text-green-600 font-medium mb-1">{cashback} cashback</p>
        )}
      {paymentMethods && (
        <p className="text-xs text-gray-400">{paymentMethods.join(' · ')}</p>
      )}
    </div>
  </Link>
);

// --- Componente Principal ---
export default function TiendaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false); // Para el dropdown de categorías

  // --- Carga de Datos desde la API ---
  useEffect(() => {
    const fetchStoresAndCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const [categoriesResponse, storesResponse] = await Promise.all([
          fetch('/api/categorias'),
          fetch('/api/tiendas')
        ]);

        if (!categoriesResponse.ok || !storesResponse.ok) {
          throw new Error('Error al obtener los datos del servidor.');
        }

        const categoriesData = await categoriesResponse.json();
        const storesData = await storesResponse.json();

        const allCategories = [{ id: 0, name: 'Todas' }, ...categoriesData];

        // --- AJUSTA ESTO SEGÚN TU API ---
        // Asume que tu API devuelve ahora 'bannerImage', 'cashback', 'paymentMethods'
        const storesWithDetails = storesData.map(store => ({
          id: store.id,
          name: store.name,
          logo: store.logo, // Asegúrate que tu API devuelve la URL del logo
          categoryId: store.categoryId,
          category: allCategories.find(cat => cat.id === store.categoryId)?.name || 'General',
          bannerImage: store.bannerImage || null, // URL para el banner
          cashback: store.cashback || null, // Ej: "1%", "Hasta 5%"
          paymentMethods: store.paymentMethods || ["BNPL Checkout"], // Ej: ["BNPL Checkout", "Apple Pay"]
        }));
        // --- Fin del ajuste ---

        setCategories(allCategories);
        setStores(storesWithDetails);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError('No se pudieron cargar las tiendas. Intenta más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchStoresAndCategories();
  }, []);

  // --- Lógica de Filtrado ---
  const filteredStores = stores.filter(store => {
    const matchesCategory = selectedCategory === 'Todas' || store.category === selectedCategory;
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumbs (Opcional) */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:underline">BNPL</Link>
          <span className="mx-2">/</span>
          <span>Tiendas</span>
        </nav>

        {/* Hero Section */}
        <section className="text-center mb-12">
            {/* Aquí podrías añadir los logos flotantes si lo deseas */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Paga con BNPL en tus marcas favoritas
          </h1>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Obtén opciones de pago flexibles. Además, desbloquea cashback cuando compras en la app BNPL.
          </p>
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar tiendas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
            />
          </div>
        </section>

        {/* Filter Bar */}
        <section className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative inline-block text-left">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              {selectedCategory}
              <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </button>

            {/* Dropdown de Categorías */}
            {showCategoryDropdown && (
              <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setShowCategoryDropdown(false);
                      }}
                      className={`${
                        selectedCategory === category.name ? 'bg-pink-50 text-pink-700' : 'text-gray-700'
                      } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
                      role="menuitem"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Aquí podrías añadir más filtros como 'Klarna at checkout', 'Apple Pay', etc. */}
          <div className="text-sm text-gray-500">
            Mostrando {filteredStores.length} tienda{filteredStores.length !== 1 ? 's' : ''}
          </div>
        </section>

        {/* Indicador de Carga o Mensaje de Error */}
        {loading && <p className="text-center text-gray-500 py-12 text-lg">Cargando tiendas...</p>}
        {error && <p className="text-center text-red-600 py-12 text-lg">{error}</p>}

        {/* Cuadrícula de Tiendas */}
        {!loading && !error && (
          <>
            {filteredStores.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStores.map((store) => (
                  <StoreCard key={store.id} {...store} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-xl">
                  No se encontraron tiendas.
                </p>
                <p className="text-gray-400 mt-2">Intenta ajustar tu búsqueda o filtros.</p>
              </div>
            )}
          </>
        )}

      </div>
       {/* Footer Podría ir aquí si es necesario */}
    </div>
  );
}

