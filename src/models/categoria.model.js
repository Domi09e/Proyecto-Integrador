export default (sequelize, DataTypes) => {
  const Categoria = sequelize.define("Categoria", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  }, {
    tableName: "Categorias",
    timestamps: false,
  });
  return Categoria;
};
