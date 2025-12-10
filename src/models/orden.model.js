export default (sequelize, DataTypes) => {
  const Orden = sequelize.define("Orden", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    tienda_id: { type: DataTypes.INTEGER, allowNull: false },
    grupo_pago_id: { type: DataTypes.INTEGER, allowNull: true },
    fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    estado: { 
      type: DataTypes.ENUM('pendiente','completada','cancelada'), 
      defaultValue: 'pendiente' 
    },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  }, {
    tableName: "ordenes", // Nombre exacto en tu BD
    timestamps: false,
  });
  return Orden;
};