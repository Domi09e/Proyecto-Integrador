// client/src/pages/Shops.jsx
import React, { useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchPublicStores } from "../api/stores"; // 👈 IMPORTANTE

/* ---------------------------------------------------------
   COMPONENTE TARJETA DE TIENDA
--------------------------------------------------------- */
const StoreCard = ({
  id,
  name,
  logo,
  category,
  bannerImage,
  cashback,
  paymentMethods,
}) => (
  <Link
    to={`/tiendas/${id}`}
    className="group block bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md"
  >
    {/* Banner */}
    <div className="h-32 bg-gray-100 overflow-hidden">
      <img
        src={bannerImage || `https://placehold.co/600x250?text=${name}`}
        alt={`${name} banner`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </div>

    {/* Info */}
    <div className="p-4">
      <div className="flex items-center mb-2">
        <img
          src={logo || `https://placehold.co/60x60?text=${name?.charAt(0) || "S"}`}
          alt={`${name} logo`}
          className="h-10 w-10 rounded-full mr-3 border object-cover"
        />
        <div>
          <p className="font-semibold text-gray-800">{name}</p>
          <p className="text-xs text-gray-500">{category}</p>
        </div>
      </div>

      {cashback && (
        <p className="text-green-600 text-xs font-medium">{cashback} cashback</p>
      )}
      {paymentMethods && (
        <p className="text-xs text-gray-500">{paymentMethods.join(" · ")}</p>
      )}
    </div>
  </Link>
);

/* ---------------------------------------------------------
   PÁGINA PRINCIPAL: LISTADO DE TIENDAS
--------------------------------------------------------- */
export default function TiendaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState(["Todas"]); // 👈 solo nombres
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  /* ---------------------------------------------------------
     CARGAR TIENDAS DESDE LA API PÚBLICA
  --------------------------------------------------------- */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchPublicStores();

        setStores(data);

        const uniqueCategories = [
          "Todas",
          ...new Set(
            data.map((s) => (s.category && s.category !== "" ? s.category : "General"))
          ),
        ];

        setCategories(uniqueCategories);
        setError(null);
      } catch (err) {
        console.error("Error cargando tiendas:", err);
        setError("No se pudieron cargar las tiendas.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* ---------------------------------------------------------
     FILTRO
  --------------------------------------------------------- */
  const filteredStores = stores.filter((store) => {
    const matchText = store.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchCategory =
      selectedCategory === "Todas" || store.category === selectedCategory;
    return matchText && matchCategory;
  });

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* HERO */}
        <section className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">
            Paga con BNPL en tus tiendas favoritas
          </h1>
          <p className="text-gray-600 mb-6">
            Descubre tiendas afiliadas y paga con métodos flexibles.
          </p>

          {/* BUSCADOR */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tiendas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </section>

        {/* FILTRO DE CATEGORÍAS */}
        <div className="mb-8 flex justify-between items-center">
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="border px-4 py-2 rounded-md bg-white shadow-sm flex items-center gap-2 text-sm"
            >
              {selectedCategory}
              <ChevronDown size={18} />
            </button>

            {showCategoryDropdown && (
              <div className="absolute bg-white border shadow-lg mt-2 w-48 rounded-md z-10">
                {categories.map((name) => (
                  <button
                    key={name}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    onClick={() => {
                      setSelectedCategory(name);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Mostrando {filteredStores.length} tienda
            {filteredStores.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* LISTA DE TIENDAS */}
        {loading && (
          <p className="text-center text-gray-500 py-10">Cargando...</p>
        )}
        {error && (
          <p className="text-center text-red-600 py-10">{error}</p>
        )}

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
                <p className="text-gray-400 mt-2">
                  Intenta ajustar tu búsqueda o filtros.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
