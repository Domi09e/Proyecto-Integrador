// src/models/tiendas_categorias.model.js

export default (sequelize, DataTypes) => {
  const TiendasCategorias = sequelize.define("TiendasCategorias", {
    // Si tu tabla en la BD no tiene columna 'id' autoincremental y usa clave compuesta,
    // definimos las claves foráneas como Primary Key para que Sequelize entienda.
    tienda_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      primaryKey: true // Parte de la clave primaria compuesta
    },
    categoria_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      primaryKey: true // Parte de la clave primaria compuesta
    },
  }, {
    tableName: "tiendascategorias", // 👈 ¡AQUÍ ESTABA EL ERROR! (Sin guion bajo)
    timestamps: false,
  });
  return TiendasCategorias;
};