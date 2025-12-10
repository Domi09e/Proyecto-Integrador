// src/models/tienda.model.js
export default (sequelize, DataTypes) => {
  const Tienda = sequelize.define('Tienda', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    direccion: { type: DataTypes.STRING(255) },
    creada_por: { type: DataTypes.INTEGER }, 
    rnc: { type: DataTypes.STRING(15), unique: true },
    telefono: { type: DataTypes.STRING(30) },
    email_corporativo: { type: DataTypes.STRING(150) },
    sitio_web: { type: DataTypes.STRING(200) },
    logo_url: { type: DataTypes.STRING(255) },
    estado: { type: DataTypes.ENUM('borrador','activa','suspendida','inactiva'), defaultValue: 'borrador' },
    fecha_alta: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    fecha_baja: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'Tiendas', timestamps: false });

  return Tienda;
};