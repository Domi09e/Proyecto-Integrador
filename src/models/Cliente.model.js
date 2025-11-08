export default (sequelize, DataTypes) => {
  const Cliente = sequelize.define(
    'Cliente',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      apellido: { type: DataTypes.STRING(100) },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      telefono: { type: DataTypes.STRING(30), unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      address: { type: DataTypes.STRING(255) },
      poder_credito: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0.00 },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'clientes',
      timestamps: true,         // usa createdAt/updatedAt
      underscored: false,       // ya usas camelCase exacto
    }
  );
  return Cliente;
};
