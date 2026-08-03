export default (
  sequelize,
  DataTypes,
) => {
  const PerfilRiesgoCliente =
    sequelize.define(
      "PerfilRiesgoCliente",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },

        cliente_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },

        puntaje_crediticio: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: false,
          defaultValue: 50,
        },

        puntaje_fraude: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        nivel_riesgo: {
          type: DataTypes.ENUM(
            "muy_bajo",
            "bajo",
            "medio",
            "alto",
            "critico",
          ),
          allowNull: false,
          defaultValue: "medio",
        },

        ingresos_declarados: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: true,
        },

        deuda_activa: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        monto_financiado_historico: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        monto_pagado_historico: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        financiamientos_activos: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        financiamientos_completados: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        cuotas_pagadas_a_tiempo: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        cuotas_pagadas_tarde: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        intentos_pago_fallidos: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        total_compras: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        compras_ultimos_30_dias: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        monto_compras_ultimos_30_dias: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        dispositivos_conocidos: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        ubicaciones_conocidas: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        alertas_activas: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        porcentaje_puntualidad: {
          type: DataTypes.DECIMAL(
            5,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        relacion_deuda_ingreso: {
          type: DataTypes.DECIMAL(
            8,
            4,
          ),
          allowNull: true,
        },

        limite_recomendado: {
          type: DataTypes.DECIMAL(
            12,
            2,
          ),
          allowNull: false,
          defaultValue: 0,
        },

        porcentaje_enganche_recomendado:
          {
            type: DataTypes.DECIMAL(
              5,
              2,
            ),
            allowNull: false,
            defaultValue: 0,
          },

        maximo_cuotas_recomendadas: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 4,
        },

        requiere_verificacion_adicional:
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },

        bloqueado_preventivamente: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        motivo_bloqueo: {
          type: DataTypes.STRING(
            500,
          ),
          allowNull: true,
        },

        ultima_evaluacion: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        ultima_actualizacion: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue:
            DataTypes.NOW,
        },
      },
      {
        tableName:
          "perfiles_riesgo_clientes",

        timestamps: true,

        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    );

  return PerfilRiesgoCliente;
};