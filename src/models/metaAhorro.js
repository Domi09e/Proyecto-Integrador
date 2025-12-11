import { DataTypes } from "sequelize";

export default (sequelize) => {
  const MetaAhorro = sequelize.define("MetaAhorro", {
    // ... tus campos ...
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    tienda_id: { type: DataTypes.INTEGER, allowNull: false },
    producto_nombre: { type: DataTypes.STRING, allowNull: false },
    monto_meta: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    monto_ahorrado: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    frecuencia: { type: DataTypes.ENUM('semanal', 'quincenal', 'mensual'), defaultValue: 'semanal' },
    estado: { type: DataTypes.ENUM('activa', 'completada', 'cancelada'), defaultValue: 'activa' },
    fecha_objetivo: { type: DataTypes.DATEONLY, allowNull: false }
  }, { 
    tableName: "metas_ahorro",
    timestamps: false // <--- AGREGA ESTA LÍNEA PARA ARREGLAR EL ERROR
  });
  return MetaAhorro;
};