// src/models/auditoria_tienda.model.js
export default (sequelize, DataTypes) => {
  const AuditoriaTiendas = sequelize.define("AuditoriaTiendas", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tienda_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    accion: {
      type: DataTypes.ENUM("CREAR","ACTUALIZAR","DESACTIVAR","REACTIVAR","ELIMINAR"),
      allowNull: false
    },
    descripcion: { type: DataTypes.STRING(255) },
    datos_antes: { type: DataTypes.JSON },
    datos_despues: { type: DataTypes.JSON },
    ip_origen: { type: DataTypes.STRING(50) },
    user_agent: { type: DataTypes.TEXT },
    correlacion_id: { type: DataTypes.STRING(64) },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: "auditoria_tiendas",
    timestamps: false,           // usamos 'fecha' como marca temporal
  });
  return AuditoriaTiendas;
};
