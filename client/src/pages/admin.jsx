import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, List, Users, Settings, Store as StoreIcon } from 'lucide-react';
// Asumiendo que tienes un hook o forma de obtener el token
// import { useAuth } from '../context/authContext'; // O donde tengas el token

// --- Componente Principal ---
export default function AdminPage() {
    // const { token } = useAuth(); // Ejemplo de cómo obtener el token

    // Estados para la gestión de tiendas
    const [stores, setStores] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingStores, setLoadingStores] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [error, setError] = useState(null);

    // Estados para el formulario de nueva tienda
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreDescription, setNewStoreDescription] = useState('');
    const [newStoreLogoUrl, setNewStoreLogoUrl] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Carga de Datos Inicial ---
    useEffect(() => {
        const fetchData = async () => {
            setLoadingStores(true);
            setLoadingCategories(true);
            setError(null);
            try {
                const [categoriesRes, storesRes] = await Promise.all([
                    fetch('/api/categories'),
                    fetch('/api/stores')
                ]);

                if (!categoriesRes.ok || !storesRes.ok) {
                    throw new Error('Error al cargar datos iniciales.');
                }

                const categoriesData = await categoriesRes.json();
                const storesData = await storesRes.json();

                setCategories(categoriesData.filter(cat => cat.name !== 'Todas'));
                setStores(storesData);

            } catch (err) {
                console.error("Error fetching admin data:", err);
                setError('No se pudieron cargar los datos. Intenta recargar la página.');
            } finally {
                setLoadingStores(false);
                setLoadingCategories(false);
            }
        };
        fetchData();
    }, []);

    // --- Manejador para el envío del formulario ---
    const handleAddStore = async (e) => {
        e.preventDefault();
        if (!newStoreName || selectedCategories.length === 0) {
            alert('El nombre de la tienda y al menos una categoría son obligatorios.');
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Asegúrate de enviar el token de autenticación
                    // 'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: newStoreName,
                    descripcion: newStoreDescription,
                    imagen_url: newStoreLogoUrl,
                    categorias: selectedCategories
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear la tienda.');
            }

            const createdStore = await response.json();

             // Volver a cargar la lista de tiendas para asegurar consistencia
            const storesRes = await fetch('/api/stores');
            if (!storesRes.ok) throw new Error('Error al recargar tiendas');
            const updatedStoresData = await storesRes.json();
            setStores(updatedStoresData);

            // Limpiar formulario
            setNewStoreName('');
            setNewStoreDescription('');
            setNewStoreLogoUrl('');
            setSelectedCategories([]);

        } catch (err) {
            console.error("Error adding store:", err);
            setError(err.message || 'Ocurrió un error al añadir la tienda.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Manejador para selección de categorías ---
    const handleCategoryChange = (categoryId) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleEditStore = (storeId) => {
        alert(`Funcionalidad Editar tienda ID: ${storeId} (a implementar)`);
    };

    const handleDeleteStore = async (storeId) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar la tienda ID: ${storeId}?`)) {
            return;
        }
        setError(null);
        try {
            const response = await fetch(`/api/admin/stores/${storeId}`, {
                 method: 'DELETE',
                 headers: { /* 'Authorization': `Bearer ${token}` */ }
            });
            if (!response.ok){
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Error al eliminar');
             }
            setStores(prevStores => prevStores.filter(store => store.id !== storeId));
        } catch(err) {
             console.error("Error deleting store:", err);
             setError(err.message || 'Error al eliminar la tienda.');
        }
    };

    // --- Renderizado ---
    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar (Simplificado) */}
            <aside className="w-64 bg-white shadow-md hidden md:block">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-800">Panel Admin</h2>
                </div>
                <nav className="mt-6">
                    <a href="#stores" className="flex items-center px-6 py-3 text-gray-700 bg-gray-200 font-medium">
                        <StoreIcon size={20} className="mr-3" /> Gestionar Tiendas
                    </a>
                    {/* Añade enlaces a otras secciones del admin */}
                    <a href="#users" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100">
                        <Users size={20} className="mr-3" /> Gestionar Usuarios
                    </a>
                     <a href="#products" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100">
                        <List size={20} className="mr-3" /> Gestionar Productos
                    </a>
                    <a href="#settings" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100">
                        <Settings size={20} className="mr-3" /> Configuración
                    </a>
                </nav>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestionar Tiendas</h1>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

                {/* Sección para Añadir Nueva Tienda */}
                <section id="add-store" className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4">Añadir Nueva Tienda</h2>
                    <form onSubmit={handleAddStore}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Nombre de la tienda"
                                value={newStoreName}
                                onChange={(e) => setNewStoreName(e.target.value)}
                                className="border border-gray-300 rounded-md p-2 w-full"
                                required
                            />
                            <input
                                type="url"
                                placeholder="URL del Logo (opcional)"
                                value={newStoreLogoUrl}
                                onChange={(e) => setNewStoreLogoUrl(e.target.value)}
                                className="border border-gray-300 rounded-md p-2 w-full"
                            />
                        </div>
                        <textarea
                            placeholder="Descripción (opcional)"
                            value={newStoreDescription}
                            onChange={(e) => setNewStoreDescription(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 w-full mb-4"
                            rows="3"
                        ></textarea>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Categorías (selecciona al menos una):</label>
                            {loadingCategories ? <p>Cargando categorías...</p> : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`cat-${cat.id}`}
                                                value={cat.id}
                                                checked={selectedCategories.includes(cat.id)}
                                                onChange={() => handleCategoryChange(cat.id)}
                                                className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                            />
                                            <label htmlFor={`cat-${cat.id}`} className="ml-2 text-sm text-gray-700">{cat.nombre}</label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={`bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isSubmitting}
                        >
                            <Plus size={18} /> {isSubmitting ? 'Añadiendo...' : 'Añadir Tienda'}
                        </button>
                    </form>
                </section>

                {/* Sección para Listar Tiendas Existentes */}
                <section id="list-stores" className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Tiendas Existentes</h2>
                    {loadingStores ? (
                        <p>Cargando tiendas...</p>
                    ) : stores.length === 0 ? (
                         <p>No hay tiendas registradas aún.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría(s)</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stores.map((store) => (
                                        <tr key={store.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{store.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <img src={store.logo || `https://placehold.co/40x40/eee/ccc?text=${store.name.charAt(0)}`} alt={store.name} className="h-8 w-8 rounded-full object-contain"/>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{store.name}</td>
                                             {/* Ajusta cómo muestras las categorías si tu API devuelve un array */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{store.category || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button onClick={() => handleEditStore(store.id)} className="text-indigo-600 hover:text-indigo-900" title="Editar"><Edit size={16}/></button>
                                                <button onClick={() => handleDeleteStore(store.id)} className="text-red-600 hover:text-red-900" title="Eliminar"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

