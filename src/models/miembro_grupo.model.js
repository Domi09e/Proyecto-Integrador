export default (sequelize, DataTypes) => {
  const MiembroGrupo = sequelize.define("MiembroGrupo", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    grupo_id: { type: DataTypes.INTEGER, allowNull: false },
    email_invitado: { type: DataTypes.STRING(100), allowNull: false },
    cliente_id: { type: DataTypes.INTEGER, allowNull: true }, // Se llena si el usuario existe
    monto_asignado: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    estado: { 
      type: DataTypes.ENUM("pendiente", "aceptado", "rechazado"), 
      defaultValue: "pendiente" 
    }
  }, { tableName: "miembros_grupo", timestamps: false });
  return MiembroGrupo;
};