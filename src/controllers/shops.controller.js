import db from "../models/index.js";

// 👇 AQUÍ ESTABA EL ERROR: Faltaba sacar 'Categoria' de db
const { Tienda, Categoria } = db; 

export const getStores = async (_req, res) => {
  try {
    const stores = await Tienda.findAll({
      where: { estado: "activa" },
      include: [
        {
          model: Categoria, // Ahora sí funcionará porque Categoria está definida arriba
          as: "categorias", // Asegúrate que este alias coincida con models/index.js
          through: { attributes: [] }, // No traer datos de la tabla intermedia
          attributes: ["id", "nombre"],
        },
      ],
      order: [["nombre", "ASC"]],
    });

    const formattedStores = stores.map((store) => {
      // Convertir a JSON plano para manipularlo mejor
      const s = store.toJSON();
      
      // Obtener categorías (si no tiene, array vacío)
      const cats = s.categorias || [];
      
      // Definir categoría principal y lista completa
      const mainCategory = cats.length > 0 ? cats[0].nombre : "General";
      const allCategories = cats.length > 0 ? cats.map(c => c.nombre) : ["General"];

      return {
        id: s.id,
        name: s.nombre,
        logo: s.logo_url || null,
        description: s.descripcion,
        // Usamos esto para los filtros del frontend
        category: mainCategory, 
        categories: allCategories, 
        // Datos extra
        direccion: s.direccion,
        telefono: s.telefono,
        email: s.email_corporativo,
        sitio_web: s.sitio_web,
        rnc: s.rnc
      };
    });

    res.json(formattedStores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ message: "Error interno al obtener las tiendas." });
  }
};

// Mantén aquí tus otras funciones si las tenías (getStoreById, etc.)
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Tienda.findByPk(id);
    if (!store) {
      return res.status(404).json({ message: "Tienda no encontrada" });
    }
    // Mismo formato que arriba para consistencia
    const dto = {
      id: store.id,
      name: store.nombre,
      logo: store.logo_url || null,
      description: store.descripcion || "",
      website: store.sitio_web || "",
      telefono: store.telefono || "",
      email: store.email_corporativo || "",
      direccion: store.direccion || "",
      rnc: store.rnc || "",
      category: "General" // Podrías hacer un include aquí también si quieres mostrar la categoría en el detalle
    };
    res.json(dto);
  } catch (error) {
    console.error("Error fetching store by id:", error);
    res.status(500).json({ message: "Error interno del servidor al obtener la tienda." });
  }
};