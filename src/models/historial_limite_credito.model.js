export default (sequelize, DataTypes) => {
  const HistorialLimiteCredito = sequelize.define(
    "HistorialLimiteCredito",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      usuario_admin_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tipo_ajuste: {
        type: DataTypes.ENUM(
          "aumento",
          "reduccion",
          "ajuste_recomendado",
          "ajuste_manual",
          "correccion",
        ),

        allowNull: false,
      },

      limite_anterior: {
        type: DataTypes.DECIMAL(12, 2),

        allowNull: false,
      },

      limite_recomendado: {
        type: DataTypes.DECIMAL(12, 2),

        allowNull: true,
      },

      limite_nuevo: {
        type: DataTypes.DECIMAL(12, 2),

        allowNull: false,
      },

      saldo_utilizado_momento: {
        type: DataTypes.DECIMAL(12, 2),

        allowNull: false,
        defaultValue: 0,
      },

      credito_disponible_anterior: {
        type: DataTypes.DECIMAL(12, 2),

        allowNull: false,
        defaultValue: 0,
      },

      credito_disponible_nuevo: {
        type: DataTypes.DECIMAL(12, 2),

        allowNull: false,
        defaultValue: 0,
      },

      motivo: {
        type: DataTypes.STRING(500),

        allowNull: false,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "historial_limites_credito",

      timestamps: false,
    },
  );

  return HistorialLimiteCredito;
};
