// src/models/metodo_pago.model.js
export default (sequelize, DataTypes) => {
  const MetodoPago = sequelize.define("MetodoPago", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: {
      type: DataTypes.ENUM("tarjeta", "cuenta_bancaria", "wallet"),
      allowNull: false,
    },
    marca: { type: DataTypes.STRING(50) }, // Visa, MC, Banco X, Apple Pay...
    ultimos_cuatro_digitos: { type: DataTypes.STRING(4) },
    fecha_expiracion: { type: DataTypes.STRING(7) }, // MM/YYYY texto
    token_gateway: { type: DataTypes.STRING(255) }, // token simulado
    es_predeterminado: { type: DataTypes.TINYINT, defaultValue: 0 },
  }, {
    tableName: "metodosdepago",
    timestamps: false,
  });

  return MetodoPago;
};
