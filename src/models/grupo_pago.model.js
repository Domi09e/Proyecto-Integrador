export default (sequelize, DataTypes) => {
  const GrupoPago = sequelize.define("GrupoPago", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false }, // Ej: "Viaje a Punta Cana"
    monto_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    creador_id: { type: DataTypes.INTEGER, allowNull: false },
    estado: { 
      type: DataTypes.ENUM("pendiente", "completado", "cancelado"), 
      defaultValue: "pendiente" 
    },
    fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: "grupos_pago", timestamps: false });
  return GrupoPago;
};