export default (
  sequelize,
  DataTypes,
) => {
  const SenalEvaluacion =
    sequelize.define(
      "SenalEvaluacion",
      {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true,
        },

        evaluacion_id: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },

        categoria: {
          type: DataTypes.ENUM(
            "identidad",
            "ingresos",
            "credito",
            "pagos",
            "compras",
            "dispositivo",
            "ubicacion",
            "sesion",
            "velocidad",
            "producto",
            "fraude",
            "comportamiento",
          ),
          allowNull: false,
        },

        codigo_senal: {
          type: DataTypes.STRING(
            100,
          ),
          allowNull: false,
        },

        nombre_senal: {
          type: DataTypes.STRING(
            150,
          ),
          allowNull: false,
        },

        valor_numerico: {
          type: DataTypes.DECIMAL(
            15,
            4,
          ),
          allowNull: true,
        },

        valor_texto: {
          type: DataTypes.STRING(
            500,
          ),
          allowNull: true,
        },

        valor_booleano: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },

        peso: {
          type: DataTypes.DECIMAL(
            8,
            4,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        impacto_puntaje: {
          type: DataTypes.DECIMAL(
            8,
            4,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        severidad: {
          type: DataTypes.ENUM(
            "informativa",
            "baja",
            "media",
            "alta",
            "critica",
          ),
          allowNull: false,
          defaultValue:
            "informativa",
        },

        regla_activada: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        descripcion: {
          type: DataTypes.STRING(
            500,
          ),
          allowNull: true,
        },
      },
      {
        tableName:
          "senales_evaluacion",

        timestamps: true,

        createdAt: "created_at",

        /*
         * La tabla SQL no tiene updated_at.
         */
        updatedAt: false,
      },
    );

  return SenalEvaluacion;
};