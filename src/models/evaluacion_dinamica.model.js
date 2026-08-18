export default (sequelize, DataTypes) => {
  const EvaluacionDinamica = sequelize.define(
    "EvaluacionDinamica",
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

      orden_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tipo_evaluacion: {
        type: DataTypes.ENUM(
          "registro",
          "inicio_sesion",
          "compra",
          "solicitud_bnpl",
          "pago",
          "pago_fallido",
          "atraso",
          "actualizacion_perfil",
          "revision_manual",
        ),
        allowNull: false,
      },

      monto_solicitado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      ingresos_considerados: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      deuda_considerada: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      puntaje_crediticio_anterior: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },

      puntaje_crediticio_resultante: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },

      puntaje_fraude: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      nivel_riesgo: {
        type: DataTypes.ENUM("muy_bajo", "bajo", "medio", "alto", "critico"),
        allowNull: false,
      },

      decision: {
        type: DataTypes.ENUM(
          "aprobacion_normal",
          "aprobacion_enganche_mayor",
          "monto_reducido",
          "cuotas_reducidas",
          "verificacion_adicional",
          "revision_manual",
          "rechazo_crediticio",
          "bloqueo_fraude",
        ),
        allowNull: false,
      },

      monto_original: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      monto_financiable: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      porcentaje_enganche: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      numero_cuotas_permitidas: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      requiere_revision_manual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      /* ==========================================
           NUEVOS CAMPOS DE REVISIÓN ADMINISTRATIVA
        ========================================== */

      estado_revision: {
        type: DataTypes.ENUM(
          "pendiente",
          "en_revision",
          "aprobada",
          "aprobada_condicionada",
          "rechazada",
        ),
        allowNull: true,
        defaultValue: null,
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

      bloqueo_preventivo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      motivo_principal: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      explicacion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      version_motor: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "1.0.0",
      },

      duracion_evaluacion_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ip_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },

      dispositivo_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },

      session_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },

      fecha_evaluacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "evaluaciones_dinamicas",

      timestamps: true,

      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return EvaluacionDinamica;
};
