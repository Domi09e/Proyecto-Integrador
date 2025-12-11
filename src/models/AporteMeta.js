import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AporteMeta = sequelize.define("AporteMeta", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meta_id: { type: DataTypes.INTEGER, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    metodo_pago_id: { type: DataTypes.INTEGER, allowNull: true }, 
    fecha_aporte: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { 
    tableName: "aportes_meta",
    timestamps: true 
  });
  return AporteMeta;
};