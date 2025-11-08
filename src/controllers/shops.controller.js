import db from "../models/index.js";
const { Tienda, Categoria } = db; // Importamos ambos modelos

export const getStores = async (req, res) => {
  try {
    const stores = await Tienda.findAll({
      // Incluimos las categorías asociadas gracias a la definición en models/index.js
      include: [
        {
          model: Categoria,
          attributes: ["id", "nombre"], // Solo traemos id y nombre de la categoría
          through: { attributes: [] }, // No traer datos de la tabla intermedia (TiendasCategorias)
        },
      ],
      order: [["nombre", "ASC"]], // Ordenar tiendas alfabéticamente
    });

    // Reformateamos la respuesta para que coincida con lo que espera el frontend
    const formattedStores = stores.map((store) => {
      const mainCategory =
        store.Categorias && store.Categorias.length > 0
          ? store.Categorias[0]
          : { id: null, nombre: "General" };
      return {
        id: store.id,
        name: store.nombre,
        logo: store.imagen_url || null, // Asume que tienes un campo imagen_url en Tiendas
        categoryId: mainCategory.id,
        category: mainCategory.nombre, // Añadimos el nombre de la categoría
      };
    });

    res.json(formattedStores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al obtener tiendas." });
  }
};
