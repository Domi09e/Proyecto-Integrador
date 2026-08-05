// src/models/pago_enganche.model.js

export default (sequelize, DataTypes) => {
  const PagoEnganche = sequelize.define(
    "PagoEnganche",
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

      orden_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      evaluacion_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
      },

      metodo_pago_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      estado: {
        type: DataTypes.ENUM(
          "pendiente",
          "aprobado",
          "rechazado",
          "reembolsado",
        ),
        allowNull: false,
        defaultValue: "pendiente",
      },

      referencia_gateway: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },

      mensaje_gateway: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      fecha_pago: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "pagos_enganche",

      timestamps: true,

      createdAt: "created_at",

      updatedAt: "updated_at",
    },
  );

  return PagoEnganche;
};
