export default (sequelize, DataTypes) => {
  const Cliente = sequelize.define(
    "Cliente",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      apellido: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },

      telefono: {
        type: DataTypes.STRING(30),
        unique: true,
      },

      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      /* =================================================
         CRÉDITO DISPONIBLE

         Se mantiene por compatibilidad con el sistema
         actual.

         Fórmula:
         límite aprobado - saldo utilizado
      ================================================= */

      poder_credito: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 100.0,
      },

      /* =================================================
         LÍMITE TOTAL APROBADO
      ================================================= */

      limite_credito_aprobado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 100.0,
      },

      /* =================================================
         SALDO ACTUALMENTE UTILIZADO
      ================================================= */

      saldo_credito_utilizado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      /* =================================================
         ÚLTIMO AJUSTE ADMINISTRATIVO
      ================================================= */

      fecha_ultimo_ajuste_credito: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      motivo_ultimo_ajuste_credito: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      preferencia_bnpl: {
        type: DataTypes.ENUM(
          "pago_completo",
          "pagar_despues",
          "4_quincenas",
          "12_meses",
          "24_meses",
        ),

        allowNull: false,

        defaultValue: "4_quincenas",
      },

      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "clientes",

      timestamps: true,

      underscored: false,
    },
  );

  return Cliente;
};
