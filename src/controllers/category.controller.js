import db from '../models/index.js';
const { Categoria } = db;

export const getCategories = async (req, res) => {
  try {
    const categories = await Categoria.findAll({
      // Opcional: Ordenar alfabéticamente
      order: [['nombre', 'ASC']],
      // Opcional: Excluir la categoría padre si no la necesitas en la lista simple
      // attributes: ['id', 'nombre'] 
    });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: 'Error interno del servidor al obtener categorías.' });
  }
};
