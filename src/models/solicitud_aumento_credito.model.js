export default (sequelize, DataTypes) => {
  const SolicitudAumentoCredito = sequelize.define(
    "SolicitudAumentoCredito",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      evaluacion_crediticia_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      monto_solicitado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      monto_aprobado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      motivo_cliente: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      estado: {
        type: DataTypes.ENUM("pendiente", "aprobada", "rechazada", "cancelada"),
        allowNull: false,
        defaultValue: "pendiente",
      },

      comentario_administrador: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      administrador_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      fecha_solicitud: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      fecha_revision: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "solicitudes_aumento_credito",
      timestamps: true,
    },
  );

  return SolicitudAumentoCredito;
};
