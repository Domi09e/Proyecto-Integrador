// models/notificacion.model.js
export default (sequelize, DataTypes) => {
  const Notificacion = sequelize.define(
    "Notificacion",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tipo: { type: DataTypes.STRING(50), allowNull: false },
      titulo: { type: DataTypes.STRING(150), allowNull: false },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: true },
      tienda_id: { type: DataTypes.INTEGER, allowNull: true },
      leida: { type: DataTypes.TINYINT, defaultValue: 0 },
      creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "notificaciones",
      timestamps: false,
    }
  );

  return Notificacion;
};


