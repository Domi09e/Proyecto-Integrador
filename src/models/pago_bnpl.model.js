export default (sequelize, DataTypes) => {
  const PagoBNPL = sequelize.define("PagoBNPL", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orden_id: { type: DataTypes.INTEGER, allowNull: false },
    plan_pago_id: { type: DataTypes.INTEGER, allowNull: false },
    monto_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    monto_pendiente: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    estado: { 
      type: DataTypes.ENUM('activo','pagado','atrasado'), 
      defaultValue: 'activo' 
    }
  }, {
    tableName: "pagosbnpl", // Nombre exacto en tu BD
    timestamps: false,
  });
  return PagoBNPL;
};