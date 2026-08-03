export default (
  sequelize,
  DataTypes,
) => {
  const AlertaRiesgo =
    sequelize.define(
      "AlertaRiesgo",
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

        orden_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },

        tipo_alerta: {
          type: DataTypes.ENUM(
            "fraude",
            "identidad",
            "dispositivo",
            "ubicacion",
            "velocidad",
            "pago",
            "mora",
            "credito",
            "comportamiento",
          ),
          allowNull: false,
        },

        codigo_alerta: {
          type: DataTypes.STRING(
            100,
          ),
          allowNull: false,
        },

        titulo: {
          type: DataTypes.STRING(
            200,
          ),
          allowNull: false,
        },

        descripcion: {
          type: DataTypes.TEXT,
          allowNull: false,
        },

        severidad: {
          type: DataTypes.ENUM(
            "baja",
            "media",
            "alta",
            "critica",
          ),
          allowNull: false,
        },

        estado: {
          type: DataTypes.ENUM(
            "abierta",
            "en_revision",
            "confirmada",
            "descartada",
            "resuelta",
          ),
          allowNull: false,
          defaultValue: "abierta",
        },

        accion_automatica: {
          type: DataTypes.ENUM(
            "ninguna",
            "verificacion_adicional",
            "reducir_monto",
            "reducir_cuotas",
            "revision_manual",
            "bloqueo_temporal",
            "rechazo",
          ),
          allowNull: false,
          defaultValue: "ninguna",
        },

        usuario_revision_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },

        comentario_revision: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        fecha_revision: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        fecha_resolucion: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        tableName:
          "alertas_riesgo",

        timestamps: true,

        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    );

  return AlertaRiesgo;
};