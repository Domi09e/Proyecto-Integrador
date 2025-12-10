// src/models/index.js
import pkg from "sequelize";
const { Sequelize, DataTypes } = pkg?.default ?? pkg;

if (!DataTypes) {
  throw new Error("No se pudo obtener DataTypes desde sequelize");
}

import sequelize from "../db.js";

// Modelos base
import ClienteModel from "./cliente.model.js";
import UsuarioModel from "./user.model.js"; // Este es tu Admin/Usuario

// Nuevos modelos
import TiendaModel from "./tienda.model.js";
import CategoriaModel from "./categoria.model.js";
import TiendasCategoriasModel from "./tiendas_categorias.model.js";
import AuditoriaTiendasModel from "./auditoria_tienda.model.js";
import NotificacionModel from "./notification.model.js";
import SolicitudTiendaModel from "./SolicitudTienda.model.js";
import MetodoPagoModel from "./metodo_pago.model.js";
import TipoDocumentoModel from "./tipo_documento.model.js";
import DocumentoClienteModel from "./documento_cliente.model.js";
import GrupoPagoModel from "./grupo_pago.model.js";
import MiembroGrupoModel from "./miembro_grupo.model.js";
import OrdenModel from "./orden.model.js";
import PagoBNPLModel from "./pago_bnpl.model.js";
import CuotaModel from "./Cuota.model.js";
import TicketModel from "./ticket.model.js";
import AuditLogModel from "./auditLog.js"; // Importado correctamente

const db = {};

// =========================
// 1. Instancias de modelos
// =========================
db.Cliente = ClienteModel(sequelize, DataTypes);
db.Usuario = UsuarioModel(sequelize, DataTypes);
db.Notificacion = NotificacionModel(sequelize, DataTypes);
db.Tienda = TiendaModel(sequelize, DataTypes);
db.Categoria = CategoriaModel(sequelize, DataTypes);
db.TiendasCategorias = TiendasCategoriasModel(sequelize, DataTypes);
db.AuditoriaTiendas = AuditoriaTiendasModel(sequelize, DataTypes);
db.SolicitudTienda = SolicitudTiendaModel(sequelize, DataTypes);
db.MetodoPago = MetodoPagoModel(sequelize, DataTypes);
db.TipoDocumento = TipoDocumentoModel(sequelize, DataTypes);
db.DocumentoCliente = DocumentoClienteModel(sequelize, DataTypes);
db.GrupoPago = GrupoPagoModel(sequelize, DataTypes);
db.MiembroGrupo = MiembroGrupoModel(sequelize, DataTypes);
db.Orden = OrdenModel(sequelize, DataTypes);
db.PagoBNPL = PagoBNPLModel(sequelize, DataTypes);
db.Cuota = CuotaModel(sequelize, DataTypes);
db.TicketSoporte = TicketModel(sequelize, DataTypes);

// 🔥 CORRECCIÓN 1: Inicializar AuditLog
db.AuditLog = AuditLogModel(sequelize, DataTypes); 

// =========================
// 2. Asociaciones
// =========================

// --- Clientes y Documentos ---
db.Cliente.hasMany(db.DocumentoCliente, { foreignKey: "cliente_id", as: "documentos" });
db.DocumentoCliente.belongsTo(db.Cliente, { foreignKey: "cliente_id", as: "cliente" });

db.TipoDocumento.hasMany(db.DocumentoCliente, { foreignKey: "tipo_documento_id", as: "documentos" });
db.DocumentoCliente.belongsTo(db.TipoDocumento, { foreignKey: "tipo_documento_id", as: "tipo" });

// --- Métodos de Pago ---
db.MetodoPago.belongsTo(db.Cliente, { foreignKey: "cliente_id", as: "cliente" });
db.Cliente.hasMany(db.MetodoPago, { foreignKey: "cliente_id", as: "metodos_pago" });

// --- Tiendas y Categorías ---
db.Tienda.belongsToMany(db.Categoria, { through: db.TiendasCategorias, foreignKey: "tienda_id", otherKey: "categoria_id", as: "categorias" });
db.Categoria.belongsToMany(db.Tienda, { through: db.TiendasCategorias, foreignKey: "categoria_id", otherKey: "tienda_id", as: "tiendas" });

// --- Tienda y Creador (Usuario Admin) ---
db.Tienda.belongsTo(db.Usuario, { foreignKey: "creada_por", as: "creador" });
db.Usuario.hasMany(db.Tienda, { foreignKey: "creada_por", as: "tiendas_creadas" });

// --- Auditoría de Tiendas (Legacy) ---
db.AuditoriaTiendas.belongsTo(db.Tienda, { foreignKey: "tienda_id", as: "tienda" });
db.AuditoriaTiendas.belongsTo(db.Usuario, { foreignKey: "usuario_id", as: "usuario" });
db.Tienda.hasMany(db.AuditoriaTiendas, { foreignKey: "tienda_id", as: "auditorias" });
db.Usuario.hasMany(db.AuditoriaTiendas, { foreignKey: "usuario_id", as: "auditorias_generadas" });

// --- Grupos de Pago ---
db.GrupoPago.hasMany(db.MiembroGrupo, { foreignKey: "grupo_id", as: "miembros" });
db.MiembroGrupo.belongsTo(db.GrupoPago, { foreignKey: "grupo_id", as: "grupo" });

db.GrupoPago.hasMany(db.Orden, { foreignKey: "grupo_pago_id", as: "ordenes" });
db.Orden.belongsTo(db.GrupoPago, { foreignKey: "grupo_pago_id", as: "grupo" });

db.GrupoPago.belongsTo(db.Cliente, { foreignKey: "creador_id", as: "creador" });
db.Cliente.hasMany(db.GrupoPago, { foreignKey: "creador_id", as: "grupos_creados" });

// --- Órdenes ---
db.Orden.belongsTo(db.Cliente, { foreignKey: "cliente_id", as: "cliente" });
db.Cliente.hasMany(db.Orden, { foreignKey: "cliente_id", as: "ordenes" });

db.Orden.belongsTo(db.Tienda, { foreignKey: "tienda_id", as: "tienda" });
db.Tienda.hasMany(db.Orden, { foreignKey: "tienda_id", as: "ordenes" });

// --- BNPL y Cuotas ---
db.Orden.hasOne(db.PagoBNPL, { foreignKey: "orden_id", as: "pago_bnpl" });
db.PagoBNPL.belongsTo(db.Orden, { foreignKey: "orden_id", as: "orden" });

db.PagoBNPL.hasMany(db.Cuota, { foreignKey: "pago_bnpl_id", as: "cuotas" });
db.Cuota.belongsTo(db.PagoBNPL, { foreignKey: "pago_bnpl_id", as: "pago_bnpl" });

// --- Soporte (Tickets) ---
db.Cliente.hasMany(db.TicketSoporte, { foreignKey: "cliente_id", as: "tickets" });
db.TicketSoporte.belongsTo(db.Cliente, { foreignKey: "cliente_id", as: "cliente" });

db.Orden.hasMany(db.TicketSoporte, { foreignKey: "orden_id", as: "tickets" });
db.TicketSoporte.belongsTo(db.Orden, { foreignKey: "orden_id", as: "orden" });

// --- Auditoría General del Sistema ---
// 🔥 CORRECCIÓN 2: Usar 'db.Usuario' (que es tu admin) en lugar de 'db.AdminUser'
db.AuditLog.belongsTo(db.Usuario, { 
  foreignKey: "admin_id", 
  as: "admin" 
});

db.Usuario.hasMany(db.AuditLog, { 
  foreignKey: "admin_id", 
  as: "logs" 
});

// =========================
// Metadatos
// =========================
db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;