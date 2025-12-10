// src/models/tipo_documento.model.js
export default (sequelize, DataTypes) => {
  const TipoDocumento = sequelize.define(
    "TipoDocumento",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true }, // 'CEDULA', 'PASAPORTE'
      nombre: { type: DataTypes.STRING(50), allowNull: false },
      descripcion: { type: DataTypes.STRING(255) },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "tipos_documento",
      timestamps: false,
    }
  );
  return TipoDocumento;
};
