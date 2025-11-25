// src/controllers/category.controller.js
import db from "../models/index.js";
const { Categoria } = db;

export const getCategories = async (_req, res) => {
  try {
    const categories = await Categoria.findAll({
      order: [["nombre", "ASC"]],
    });

    res.json(categories.map(c => ({
      id: c.id,
      name: c.nombre,
    })));
  } catch (err) {
    console.error("Error obteniendo categorías:", err);
    res.status(500).json({
      message: "Error interno del servidor al obtener categorías",
    });
  }
};
