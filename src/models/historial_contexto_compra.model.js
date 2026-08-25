export default (sequelize, DataTypes) => {
  const HistorialContextoCompra = sequelize.define(
    "HistorialContextoCompra",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
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

      session_id: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      monto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },

      dispositivo_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      dispositivo_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },

      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },

      ip_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      latitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

      longitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

      precision_ubicacion: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      ciudad: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },

      region: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },

      pais: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },

      dispositivo_nuevo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      ip_nueva: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      ubicacion_nueva: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      ubicacion_inconsistente: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      monto_fuera_patron: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      promedio_monto_historico: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      monto_minimo_historico: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      monto_maximo_historico: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      cantidad_compras_historial: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      porcentaje_variacion_monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      distancia_ubicacion_anterior_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      decision: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },

      estado_operacion: {
        type: DataTypes.ENUM(
          "evaluada",
          "formalizada",
          "rechazada",
          "revision_manual",
          "bloqueada",
          "cancelada",
        ),
        allowNull: false,
        defaultValue: "evaluada",
      },

      es_referencia_comportamiento: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "historial_contexto_compras",

      timestamps: true,

      createdAt: "created_at",

      updatedAt: "updated_at",

      underscored: true,
    },
  );

  return HistorialContextoCompra;
};
