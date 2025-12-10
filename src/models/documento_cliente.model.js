// src/models/documento_cliente.model.js
export default (sequelize, DataTypes) => {
  const DocumentoCliente = sequelize.define(
    "DocumentoCliente",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      tipo_documento_id: { type: DataTypes.INTEGER, allowNull: false },
      numero_documento: { type: DataTypes.STRING(50), allowNull: false },
      ruta_imagen: { type: DataTypes.STRING(255), allowNull: false },
      estado: {
        type: DataTypes.ENUM("pendiente", "verificado", "rechazado"),
        allowNull: false,
        defaultValue: "pendiente",
      },
      origen_verificacion: {
        type: DataTypes.ENUM("manual", "jce_api"),
        defaultValue: "manual",
      },
      fecha_subida: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      fecha_verificacion: { type: DataTypes.DATE, allowNull: true },
      nota_rechazo: { type: DataTypes.STRING(255) },
    },
    {
      tableName: "documentos_cliente",
      timestamps: false,
    }
  );

  return DocumentoCliente;
};
