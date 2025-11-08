import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, ShoppingBag, CreditCard, ShieldCheck, Tag } from "lucide-react";

// --- Componente de Tarjeta de Tienda Dinámica (Estilo Klarna) ---
const DynamicStoreCard = ({ name, logo, cashback, bgColor = "bg-gray-100" }) => (
  <Link to={`/tienda/${name.toLowerCase()}`} className={`group relative aspect-square rounded-2xl flex items-center justify-center p-4 overflow-hidden transition-transform duration-300 hover:scale-105 ${bgColor}`}>
    {cashback && (
      <div className="absolute top-3 left-3 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
        <Tag size={12} />
        <span>{cashback}</span>
      </div>
    )}
    <img
      src={logo}
      alt={`${name} logo`}
      className="h-16 w-24 object-contain transition-transform duration-300 group-hover:scale-110"
    />
  </Link>
);

// --- Componente de Tarjeta de Beneficio ---
const BenefitCard = ({ icon, title, description }) => (
    <div className="flex items-start gap-4 text-left">
        <div className="flex-shrink-0 bg-pink-100 text-pink-500 rounded-lg p-3 mt-1">
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-semibold mb-1 text-gray-900">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    </div>
);


// --- Componente Principal de la Página ---
export default function Descubrir() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [stores, setStores] = useState([]);
  const [benefits, setBenefits] = useState([]);

  useEffect(() => {
    const mockStores = [
      { id: 1, name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg", cashback: "Hasta 5%" },
      { id: 2, name: "Nike", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" },
      { id: 3, name: "Apple", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
      { id: 4, name: "Adidas", logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg", cashback: "10% OFF" },
      { id: 5, name: "Sephora", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Sephora_Logo.svg" },
      { id: 6, name: "Zara", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Zara_Logo.svg" },
      { id: 7, name: "H&M", logo: "https://upload.wikimedia.org/wikipedia/commons/5/5f/H%26M-Logo.svg" },
      { id: 8, name: "IKEA", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c7/IKEA_logo.svg", cashback: "Envío gratis" },
      { id: 9, name: "Target", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Target_logo.svg"},
      { id: 10, name: "Walmart", logo: "https://upload.wikimedia.org/wikipedia/commons/1/14/Walmart_Spark.svg"},
    ];
    
    const mockBenefits = [
        { icon: <ShoppingBag size={24} />, title: "Compra flexible", description: "Divide cualquier compra en 4 pagos sin interés, directamente al pagar." },
        { icon: <CreditCard size={24} />, title: "Sin comisiones ocultas", description: "Nunca pagarás más de lo que ves. Sin intereses ni comisiones sorpresas." },
        { icon: <ShieldCheck size={24} />, title: "Seguro y protegido", description: "Tu información está segura con nuestra protección al comprador de principio a fin." }
    ];

    setStores(mockStores);
    setBenefits(mockBenefits);
  }, []);

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStoreSearchSubmit = (e) => {
    e.preventDefault();
    const searchTerm = storeSearch.trim().toLowerCase();
    if (!searchTerm) return;

    const storeExists = stores.find(
      (store) => store.name.toLowerCase() === searchTerm
    );

    if (storeExists) {
      navigate(`/tienda/${searchTerm}`);
    } else {
      alert("Tienda no encontrada. Intenta con otra.");
    }
  };

  return (
    <div className="bg-white text-gray-800">
      {/* Hero Section */}
      <header className="bg-pink-50">
        <div className="w-full px-6 lg:px-8 py-20 lg:py-32 flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
              Compra ahora.
              <br />
              <span className="text-pink-500">Paga después.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto mb-8">
              La forma inteligente de comprar. Divide tus pagos en cuotas sin interés en tus tiendas favoritas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="./Shops.jsx" className="bg-black text-white font-semibold py-4 px-8 rounded-full hover:bg-gray-800 transition-colors duration-300 flex items-center justify-center gap-2">
                Explorar tiendas
                <ArrowRight size={20} />
              </Link>
              <Link to="/como-funciona" className="bg-gray-200 text-black font-semibold py-4 px-8 rounded-full hover:bg-gray-300 transition-colors duration-300 flex items-center justify-center">
                Cómo funciona
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 mt-12 lg:mt-0 flex justify-center">
            <img 
              src="https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=1887&auto=format&fit=crop" 
              alt="Mujer feliz comprando online" 
              className="rounded-3xl w-full max-w-md shadow-2xl"
            />
          </div>
        </div>
      </header>

      {/* Why use BNPL Section */}
       <section className="py-24">
        <div className="w-full px-6 lg:px-8 grid md:grid-cols-2 gap-16 items-center">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-bold mb-6">¿Por qué elegir BNPL?</h2>
            <p className="text-lg text-gray-500 mb-10">
              Te damos el poder de comprar lo que amas hoy y pagar a tu ritmo, de forma transparente y segura.
            </p>
            <div className="space-y-8 max-w-md mx-auto md:mx-0">
                {benefits.map(benefit => (
                    <BenefitCard key={benefit.title} {...benefit} />
                ))}
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <img 
                src="https://images.unsplash.com/photo-1579389083395-4507e9d162c4?q=80&w=1887&auto=format&fit=crop"
                alt="Persona usando su teléfono para pagar"
                className="rounded-2xl shadow-xl w-full max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* Favorite Brands Section */}
      <main id="tiendas" className="bg-gray-50 py-20">
        <div className="w-full px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-4">Paga con BNPL en tus marcas favoritas</h2>
            <p className="text-lg text-gray-500 text-center mb-12">Desde moda hasta tecnología, encuentra todo lo que buscas.</p>

            {filteredStores.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredStores.map((store) => (
                <DynamicStoreCard key={store.id} {...store} />
                ))}
            </div>
            ) : (
            <p className="text-center text-gray-500 text-lg">No se encontraron tiendas.</p>
            )}
        </div>
      </main>

      {/* Search Section */}
      <section className="py-20">
        <div className="w-full px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Encuentra tu tienda favorita</h2>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Escribe el nombre de la tienda que buscas y te llevaremos directamente.
          </p>
          <form 
            onSubmit={handleStoreSearchSubmit} 
            className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4"
          >
            <input
                type="text"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Ej: Amazon, Nike, Apple..."
                className="w-full bg-gray-100 border-2 border-transparent rounded-full py-4 px-6 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
            />
            <button 
                type="submit" 
                className="bg-black text-white font-semibold py-4 px-8 rounded-full hover:bg-gray-800 transition-colors duration-300 flex items-center justify-center gap-2"
            >
                <Search size={20} />
                <span>Buscar</span>
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="w-full px-6 lg:px-8 py-12 text-center text-gray-400">
          <p>© {new Date().getFullYear()} BNPL Inc. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link to="/privacy" className="hover:text-pink-400">Política de Privacidad</Link>
            <Link to="/terms" className="hover:text-pink-400">Términos de Uso</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

