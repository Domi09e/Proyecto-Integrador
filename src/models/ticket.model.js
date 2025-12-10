export default (sequelize, DataTypes) => {
  const TicketSoporte = sequelize.define("TicketSoporte", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    orden_id: { type: DataTypes.INTEGER, allowNull: true }, // Opcional, por si es una duda general
    asunto: { type: DataTypes.STRING(255), allowNull: false },
    descripcion_inicial: { type: DataTypes.TEXT, allowNull: false },
    estado: { 
      type: DataTypes.ENUM('abierto', 'en_proceso', 'resuelto', 'cerrado'), 
      defaultValue: 'abierto' 
    },
    prioridad: { 
      type: DataTypes.ENUM('baja', 'media', 'alta'), 
      defaultValue: 'media' 
    },
    fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: "ticketssoporte",
    timestamps: false,
  });
  return TicketSoporte;
};