export default (
  sequelize,
  DataTypes,
) => {
  const HistorialPerfilRiesgo =
    sequelize.define(
      "HistorialPerfilRiesgo",
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

        evaluacion_id: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },

        evento_origen: {
          type: DataTypes.ENUM(
            "registro",
            "compra",
            "pago_puntual",
            "pago_atrasado",
            "pago_fallido",
            "mora",
            "fraude",
            "revision_manual",
            "recalculo_programado",
          ),
          allowNull: false,
        },

        puntaje_anterior: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: true,
        },

        puntaje_nuevo: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: false,
        },

        riesgo_anterior: {
          type: DataTypes.ENUM(
            "muy_bajo",
            "bajo",
            "medio",
            "alto",
            "critico",
          ),
          allowNull: true,
        },

        riesgo_nuevo: {
          type: DataTypes.ENUM(
            "muy_bajo",
            "bajo",
            "medio",
            "alto",
            "critico",
          ),
          allowNull: false,
        },

        limite_anterior: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: true,
        },

        limite_nuevo: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: true,
        },

        enganche_anterior: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: true,
        },

        enganche_nuevo: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: true,
        },

        variacion_puntaje: {
          type: DataTypes.DECIMAL(
            8,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        motivo: {
          type: DataTypes.STRING(
            500,
          ),
          allowNull: true,
        },
      },
      {
        tableName:
          "historial_perfil_riesgo",

        timestamps: true,

        createdAt: "created_at",

        /*
         * La tabla solo tiene created_at.
         */
        updatedAt: false,
      },
    );

  return HistorialPerfilRiesgo;
};