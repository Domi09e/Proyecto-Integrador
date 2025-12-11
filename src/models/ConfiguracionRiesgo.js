export default (sequelize, DataTypes) => {
  const ConfiguracionRiesgo = sequelize.define("ConfiguracionRiesgo", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dias_mora_maximo: { 
        type: DataTypes.INTEGER, 
        defaultValue: 30, 
        allowNull: false 
    },
    bloqueo_automatico_activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
  }, {
    tableName: "configuracion_riesgo",
    timestamps: false
  });
  return ConfiguracionRiesgo;
};