export default (sequelize, DataTypes) => {
  const Cuota = sequelize.define("Cuota", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pago_bnpl_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_cuota: { type: DataTypes.INTEGER, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_pago: { type: DataTypes.DATEONLY, allowNull: true },
    estado: { 
      type: DataTypes.ENUM('pendiente','pagado','atrasado'), 
      defaultValue: 'pendiente' 
    }
  }, {
    tableName: "cuotas", // Nombre exacto en tu BD
    timestamps: false,
  });
  return Cuota;
};