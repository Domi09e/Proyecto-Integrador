export default (sequelize, DataTypes) => {
  const EvaluacionCrediticia = sequelize.define(
    "EvaluacionCrediticia",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      pago_bnpl_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },

      cuotas_totales: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      cuotas_pagadas_a_tiempo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      cuotas_pagadas_tarde: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      porcentaje_puntualidad: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0
      },

      es_elegible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      observaciones: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      fecha_evaluacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "evaluacion_crediticia",
      timestamps: true
    }
  );

  return EvaluacionCrediticia;
};