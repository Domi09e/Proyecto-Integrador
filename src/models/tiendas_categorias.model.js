export default (sequelize, DataTypes) => {
  const TiendasCategorias = sequelize.define("TiendasCategorias", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tienda_id: { type: DataTypes.INTEGER, allowNull: false },
    categoria_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: "Tiendas_Categorias",
    timestamps: false,
    indexes: [{ unique: true, fields: ["tienda_id","categoria_id"] }],
  });
  return TiendasCategorias;
};
