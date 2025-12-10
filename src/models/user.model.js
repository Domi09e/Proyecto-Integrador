
// src/models/user.model.js

export default (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    apellido: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    telefono: { type: DataTypes.STRING, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    rol: {
      type: DataTypes.ENUM('admin_general', 'admin_tiendas', 'soporte', 'super_admin', 'finanzas'),
      allowNull: false,
      defaultValue: 'admin_general',
    },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    fecha_registro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'usuarios',      // evita pluralización/case raro
    freezeTableName: true,      // usa exactamente "usuarios"
    timestamps: false,          // 🔴 desactiva createdAt/updatedAt
    underscored: false,
  });

  return Usuario;
};
