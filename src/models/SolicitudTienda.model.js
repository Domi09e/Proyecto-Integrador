// models/solicitud_tienda.model.js
export default (sequelize, DataTypes) => {
  const SolicitudTienda = sequelize.define(
    "SolicitudTienda",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nombre_tienda: { type: DataTypes.STRING(150), allowNull: false },
      rnc: { type: DataTypes.STRING(15), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: true },
      email_contacto: { type: DataTypes.STRING(150), allowNull: false },
      sitio_web: { type: DataTypes.STRING(200), allowNull: true },
      descripcion: { type: DataTypes.TEXT, allowNull: true },
      estado: {
        type: DataTypes.ENUM("pendiente", "aprobada", "rechazada"),
        defaultValue: "pendiente",
      },
      cliente_id: { type: DataTypes.INTEGER, allowNull: true },
      creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "solicitudes_tiendas",
      timestamps: false,
    }
  );
  return SolicitudTienda;
};
