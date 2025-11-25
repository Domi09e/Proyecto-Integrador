// src/models/index.js
import pkg from "sequelize";
const { Sequelize, DataTypes } = pkg?.default ?? pkg;

if (!DataTypes) {
  throw new Error("No se pudo obtener DataTypes desde sequelize");
}

import sequelize from "../db.js";

// Modelos base que ya tenías
import ClienteModel from "./cliente.model.js";
import UsuarioModel from "./user.model.js";

// Nuevos modelos
import TiendaModel from "./tienda.model.js";
import CategoriaModel from "./categoria.model.js";
import TiendasCategoriasModel from "./tiendas_categorias.model.js";
import AuditoriaTiendasModel from "./auditoria_tienda.model.js";
import NotificacionModel from "./notification.model.js";
import SolicitudTiendaModel from "./SolicitudTienda.model.js";
import MetodoPagoModel from "./metodo_pago.model.js";

const db = {};

// Instancias de modelos
db.Cliente = ClienteModel(sequelize, DataTypes);
db.Usuario = UsuarioModel(sequelize, DataTypes);
db.Notificacion = NotificacionModel(sequelize, Sequelize.DataTypes);
db.Tienda = TiendaModel(sequelize, DataTypes);
db.Categoria = CategoriaModel(sequelize, DataTypes);
db.TiendasCategorias = TiendasCategoriasModel(sequelize, DataTypes);
db.AuditoriaTiendas = AuditoriaTiendasModel(sequelize, DataTypes);
db.SolicitudTienda = SolicitudTiendaModel(sequelize, DataTypes);
db.MetodoPago = MetodoPagoModel(sequelize, DataTypes);

// =========================
// Asociaciones
// =========================

db.MetodoPago.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});
db.Cliente.hasMany(db.MetodoPago, {
  foreignKey: "cliente_id",
  as: "metodos_pago",
});

// Tienda <-> Categoria (N:M) a través de Tiendas_Categorias
db.Tienda.belongsToMany(db.Categoria, {
  through: db.TiendasCategorias,
  foreignKey: "tienda_id",
  otherKey: "categoria_id",
});
db.Categoria.belongsToMany(db.Tienda, {
  through: db.TiendasCategorias,
  foreignKey: "categoria_id",
  otherKey: "tienda_id",
});

// Tienda -> Usuario (creada_por)
db.Tienda.belongsTo(db.Usuario, {
  foreignKey: "creada_por",
  as: "creador",
});
db.Usuario.hasMany(db.Tienda, {
  foreignKey: "creada_por",
  as: "tiendas_creadas",
});

// Auditoría -> Tienda / Usuario
db.AuditoriaTiendas.belongsTo(db.Tienda, {
  foreignKey: "tienda_id",
  as: "tienda",
});
db.AuditoriaTiendas.belongsTo(db.Usuario, {
  foreignKey: "usuario_id",
  as: "usuario",
});
db.Tienda.hasMany(db.AuditoriaTiendas, {
  foreignKey: "tienda_id",
  as: "auditorias",
});
db.Usuario.hasMany(db.AuditoriaTiendas, {
  foreignKey: "usuario_id",
  as: "auditorias_generadas",
});

// =========================
// Metadatos
// =========================
db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
