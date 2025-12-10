export default (sequelize, DataTypes) => {
  const MetodoPago = sequelize.define("MetodoPago", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    // AUNQUE EN BD SEA VARCHAR, AQUÍ PUEDES DEJARLO COMO ENUM O CAMBIARLO A STRING
    // Para evitar problemas, lo dejaremos como STRING por ahora:
    tipo: {
      type: DataTypes.STRING(50), 
      allowNull: false,
      defaultValue: 'tarjeta'
    },
    marca: { type: DataTypes.STRING(50) },
    ultimos_cuatro_digitos: { type: DataTypes.STRING(4) },
    fecha_expiracion: { type: DataTypes.STRING(7) },
    token_gateway: { type: DataTypes.STRING(255) },
    es_predeterminado: { type: DataTypes.TINYINT, defaultValue: 0 },
  }, {
    tableName: "metodosdepago",
    timestamps: false,
  });

  return MetodoPago;
};