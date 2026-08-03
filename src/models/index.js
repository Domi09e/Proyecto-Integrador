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
import MetaAhorroModel from "./metaAhorro.js";
import AporteMetaModel from "./AporteMeta.js";
import ReclamacionModel from "./reclamacion.model.js";
import ConfiguracionRiesgoModel from "./ConfiguracionRiesgo.js";
import EvaluacionCrediticiaModel from "./evaluacion_crediticia.model.js";
import SolicitudAumentoCreditoModel from "./solicitud_aumento_credito.model.js";
import PerfilRiesgoClienteModel from "./perfil_riesgo_cliente.model.js";
import EvaluacionDinamicaModel from "./evaluacion_dinamica.model.js";
import SenalEvaluacionModel from "./senal_evaluacion.model.js";
import AlertaRiesgoModel from "./alerta_riesgo.model.js";
import HistorialPerfilRiesgoModel from "./historial_perfil_riesgo.model.js";

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
db.AuditLog = AuditLogModel(sequelize, DataTypes);
db.MetaAhorro = MetaAhorroModel(sequelize, Sequelize);
db.AporteMeta = AporteMetaModel(sequelize, Sequelize);
db.Reclamacion = ReclamacionModel(sequelize, Sequelize);
db.ConfiguracionRiesgo = ConfiguracionRiesgoModel(sequelize, Sequelize);
db.EvaluacionCrediticia = EvaluacionCrediticiaModel(sequelize, DataTypes);
db.SolicitudAumentoCredito = SolicitudAumentoCreditoModel(sequelize, DataTypes);
db.PerfilRiesgoCliente = PerfilRiesgoClienteModel(sequelize, DataTypes);
db.EvaluacionDinamica = EvaluacionDinamicaModel(sequelize, DataTypes);
db.SenalEvaluacion = SenalEvaluacionModel(sequelize, DataTypes);
db.AlertaRiesgo = AlertaRiesgoModel(sequelize, DataTypes);
db.HistorialPerfilRiesgo = HistorialPerfilRiesgoModel(sequelize, DataTypes);

// =========================
// 2. Asociaciones
// =========================

db.Cliente.hasMany(db.Reclamacion, {
  foreignKey: "cliente_id",
  as: "reclamaciones",
});
// Una Reclamación pertenece a un Cliente
db.Reclamacion.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

// Opcional: Si quieres relacionarlo con Órdenes
if (db.Orden) {
  db.Orden.hasMany(db.Reclamacion, {
    foreignKey: "orden_id",
    as: "reclamaciones",
  });
  db.Reclamacion.belongsTo(db.Orden, { foreignKey: "orden_id", as: "orden" });
}

// --- Clientes y Documentos ---
db.Cliente.hasMany(db.DocumentoCliente, {
  foreignKey: "cliente_id",
  as: "documentos",
});
db.DocumentoCliente.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

db.TipoDocumento.hasMany(db.DocumentoCliente, {
  foreignKey: "tipo_documento_id",
  as: "documentos",
});
db.DocumentoCliente.belongsTo(db.TipoDocumento, {
  foreignKey: "tipo_documento_id",
  as: "tipo",
});

// --- Métodos de Pago ---
db.MetodoPago.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});
db.Cliente.hasMany(db.MetodoPago, {
  foreignKey: "cliente_id",
  as: "metodos_pago",
});

// --- Tiendas y Categorías ---
db.Tienda.belongsToMany(db.Categoria, {
  through: db.TiendasCategorias,
  foreignKey: "tienda_id",
  otherKey: "categoria_id",
  as: "categorias",
});
db.Categoria.belongsToMany(db.Tienda, {
  through: db.TiendasCategorias,
  foreignKey: "categoria_id",
  otherKey: "tienda_id",
  as: "tiendas",
});

// --- Tienda y Creador (Usuario Admin) ---
db.Tienda.belongsTo(db.Usuario, { foreignKey: "creada_por", as: "creador" });
db.Usuario.hasMany(db.Tienda, {
  foreignKey: "creada_por",
  as: "tiendas_creadas",
});

// --- Auditoría de Tiendas (Legacy) ---
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

// --- Grupos de Pago ---
db.GrupoPago.hasMany(db.MiembroGrupo, {
  foreignKey: "grupo_id",
  as: "miembros",
});
db.MiembroGrupo.belongsTo(db.GrupoPago, {
  foreignKey: "grupo_id",
  as: "grupo",
});

db.GrupoPago.hasMany(db.Orden, { foreignKey: "grupo_pago_id", as: "ordenes" });
db.Orden.belongsTo(db.GrupoPago, { foreignKey: "grupo_pago_id", as: "grupo" });

db.GrupoPago.belongsTo(db.Cliente, { foreignKey: "creador_id", as: "creador" });
db.Cliente.hasMany(db.GrupoPago, {
  foreignKey: "creador_id",
  as: "grupos_creados",
});

// --- Órdenes ---
db.Orden.belongsTo(db.Cliente, { foreignKey: "cliente_id", as: "cliente" });
db.Cliente.hasMany(db.Orden, { foreignKey: "cliente_id", as: "ordenes" });

db.Orden.belongsTo(db.Tienda, { foreignKey: "tienda_id", as: "tienda" });
db.Tienda.hasMany(db.Orden, { foreignKey: "tienda_id", as: "ordenes" });

// --- BNPL y Cuotas ---
db.Orden.hasOne(db.PagoBNPL, { foreignKey: "orden_id", as: "pago_bnpl" });
db.PagoBNPL.belongsTo(db.Orden, { foreignKey: "orden_id", as: "orden" });

db.PagoBNPL.hasMany(db.Cuota, { foreignKey: "pago_bnpl_id", as: "cuotas" });
db.Cuota.belongsTo(db.PagoBNPL, {
  foreignKey: "pago_bnpl_id",
  as: "pago_bnpl",
});

// --- Evaluación crediticia ---
db.Cliente.hasMany(db.EvaluacionCrediticia, {
  foreignKey: "cliente_id",
  as: "evaluaciones_crediticias",
});

db.EvaluacionCrediticia.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

db.PagoBNPL.hasOne(db.EvaluacionCrediticia, {
  foreignKey: "pago_bnpl_id",
  as: "evaluacion_crediticia",
});

db.EvaluacionCrediticia.belongsTo(db.PagoBNPL, {
  foreignKey: "pago_bnpl_id",
  as: "pago_bnpl",
});

// --- Solicitudes de aumento de crédito ---
db.Cliente.hasMany(db.SolicitudAumentoCredito, {
  foreignKey: "cliente_id",
  as: "solicitudes_aumento_credito",
});

db.SolicitudAumentoCredito.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

db.EvaluacionCrediticia.hasMany(db.SolicitudAumentoCredito, {
  foreignKey: "evaluacion_crediticia_id",
  as: "solicitudes_aumento",
});

db.SolicitudAumentoCredito.belongsTo(db.EvaluacionCrediticia, {
  foreignKey: "evaluacion_crediticia_id",
  as: "evaluacion_crediticia",
});

db.Usuario.hasMany(db.SolicitudAumentoCredito, {
  foreignKey: "administrador_id",
  as: "solicitudes_credito_revisadas",
});

db.SolicitudAumentoCredito.belongsTo(db.Usuario, {
  foreignKey: "administrador_id",
  as: "administrador",
});

// --- Soporte (Tickets) ---
db.Cliente.hasMany(db.TicketSoporte, {
  foreignKey: "cliente_id",
  as: "tickets",
});
db.TicketSoporte.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

db.Orden.hasMany(db.TicketSoporte, { foreignKey: "orden_id", as: "tickets" });
db.TicketSoporte.belongsTo(db.Orden, { foreignKey: "orden_id", as: "orden" });

// ... asociaciones ...
// Cliente -> Metas
db.Cliente.hasMany(db.MetaAhorro, {
  foreignKey: "cliente_id",
  as: "metas_ahorro",
});
db.MetaAhorro.belongsTo(db.Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

// Tienda -> Metas
db.Tienda.hasMany(db.MetaAhorro, { foreignKey: "tienda_id", as: "metas" });
db.MetaAhorro.belongsTo(db.Tienda, { foreignKey: "tienda_id", as: "tienda" });

// Meta -> Aportes
db.MetaAhorro.hasMany(db.AporteMeta, { foreignKey: "meta_id", as: "aportes" });
db.AporteMeta.belongsTo(db.MetaAhorro, { foreignKey: "meta_id", as: "meta" });
// --- Auditoría Centralizada ---
db.AuditLog.belongsTo(db.Usuario, {
  foreignKey: "admin_id",
  as: "admin",
});

db.Usuario.hasMany(db.AuditLog, {
  foreignKey: "admin_id",
  as: "logs",
});

// =============================================
// MOTOR DINÁMICO DE RIESGO BNPL
// =============================================

// Cliente 1 — 1 Perfil de riesgo
db.Cliente.hasOne(
  db.PerfilRiesgoCliente,
  {
    foreignKey: "cliente_id",
    as: "perfil_riesgo",
  },
);

db.PerfilRiesgoCliente.belongsTo(
  db.Cliente,
  {
    foreignKey: "cliente_id",
    as: "cliente",
  },
);

// Cliente 1 — N Evaluaciones dinámicas
db.Cliente.hasMany(
  db.EvaluacionDinamica,
  {
    foreignKey: "cliente_id",
    as: "evaluaciones_dinamicas",
  },
);

db.EvaluacionDinamica.belongsTo(
  db.Cliente,
  {
    foreignKey: "cliente_id",
    as: "cliente",
  },
);

// Orden 1 — N Evaluaciones dinámicas
db.Orden.hasMany(
  db.EvaluacionDinamica,
  {
    foreignKey: "orden_id",
    as: "evaluaciones_riesgo",
  },
);

db.EvaluacionDinamica.belongsTo(
  db.Orden,
  {
    foreignKey: "orden_id",
    as: "orden",
  },
);

// Evaluación 1 — N Señales
db.EvaluacionDinamica.hasMany(
  db.SenalEvaluacion,
  {
    foreignKey: "evaluacion_id",
    as: "senales",
  },
);

db.SenalEvaluacion.belongsTo(
  db.EvaluacionDinamica,
  {
    foreignKey: "evaluacion_id",
    as: "evaluacion",
  },
);

// Cliente 1 — N Alertas
db.Cliente.hasMany(
  db.AlertaRiesgo,
  {
    foreignKey: "cliente_id",
    as: "alertas_riesgo",
  },
);

db.AlertaRiesgo.belongsTo(
  db.Cliente,
  {
    foreignKey: "cliente_id",
    as: "cliente",
  },
);

// Evaluación 1 — N Alertas
db.EvaluacionDinamica.hasMany(
  db.AlertaRiesgo,
  {
    foreignKey: "evaluacion_id",
    as: "alertas",
  },
);

db.AlertaRiesgo.belongsTo(
  db.EvaluacionDinamica,
  {
    foreignKey: "evaluacion_id",
    as: "evaluacion",
  },
);

// Orden 1 — N Alertas
db.Orden.hasMany(
  db.AlertaRiesgo,
  {
    foreignKey: "orden_id",
    as: "alertas_riesgo",
  },
);

db.AlertaRiesgo.belongsTo(
  db.Orden,
  {
    foreignKey: "orden_id",
    as: "orden",
  },
);

// Usuario administrador 1 — N Alertas revisadas
db.Usuario.hasMany(
  db.AlertaRiesgo,
  {
    foreignKey:
      "usuario_revision_id",
    as: "alertas_riesgo_revisadas",
  },
);

db.AlertaRiesgo.belongsTo(
  db.Usuario,
  {
    foreignKey:
      "usuario_revision_id",
    as: "usuario_revision",
  },
);

// Cliente 1 — N Historiales de perfil
db.Cliente.hasMany(
  db.HistorialPerfilRiesgo,
  {
    foreignKey: "cliente_id",
    as: "historial_riesgo",
  },
);

db.HistorialPerfilRiesgo.belongsTo(
  db.Cliente,
  {
    foreignKey: "cliente_id",
    as: "cliente",
  },
);

// Evaluación 1 — N cambios de perfil
db.EvaluacionDinamica.hasMany(
  db.HistorialPerfilRiesgo,
  {
    foreignKey: "evaluacion_id",
    as: "cambios_perfil",
  },
);

db.HistorialPerfilRiesgo.belongsTo(
  db.EvaluacionDinamica,
  {
    foreignKey: "evaluacion_id",
    as: "evaluacion",
  },
);

// =========================
// Metadatos
// =========================
db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
