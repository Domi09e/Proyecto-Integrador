// controllers/shops.controller.js
import db from "../models/index.js";

const { Tienda } = db;

// Lista de tiendas
export const getStores = async (_req, res) => {
  try {
    const stores = await Tienda.findAll({
      order: [["nombre", "ASC"]],
    });

    const formattedStores = stores.map((store) => ({
      id: store.id,
      name: store.nombre,
      logo: store.logo_url || null,
      categoryId: 0,
      category: "General",
    }));

    res.json(formattedStores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al obtener tiendas." });
  }
};

// 🔹 DETALLE DE TIENDA
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Tienda.findByPk(id);
    if (!store) {
      return res.status(404).json({ message: "Tienda no encontrada" });
    }

    const dto = {
      id: store.id,
      name: store.nombre,
      logo: store.logo_url || null,
      description: store.descripcion || "",
      website: store.sitio_web || "",
      telefono: store.telefono || "",
      email: store.email_corporativo || "",
      direccion: store.direccion || "",
      // aquí luego puedes añadir más campos (cashback, etc.)
    };

    res.json(dto);
  } catch (error) {
    console.error("Error fetching store by id:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al obtener la tienda." });
  }
};
