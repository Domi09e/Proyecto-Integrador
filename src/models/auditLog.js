import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AuditLog = sequelize.define("AuditLog", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    admin_id: { 
      type: DataTypes.INTEGER,
      allowNull: true // Puede ser null si se elimina el admin
    },
    accion: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    entidad: { 
      type: DataTypes.STRING,
      allowNull: true
    },
    detalles: { 
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: "audit_logs",
    timestamps: true, // Activamos timestamps para que gestione createdAt
    updatedAt: false  // 🔥 LA SOLUCIÓN: Desactivamos updatedAt porque no existe en la BD
  });

  return AuditLog;
};