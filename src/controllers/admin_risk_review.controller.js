import { Op } from "sequelize";
import db from "../models/index.js";
import { logAction } from "../services/audit.services.js";

import {
  ajustarLimiteCreditoCliente,
  sincronizarLineaCreditoCliente,
} from "../services/credit-line.service.js";

const {
  Cliente,
  Usuario,
  EvaluacionDinamica,
  SenalEvaluacion,
  AlertaRiesgo,
  PerfilRiesgoCliente,
  Notificacion,
  HistorialLimiteCredito,
  sequelize,
} = db;

/* =====================================================
   HELPERS
===================================================== */

const obtenerAdminId = (req) => {
  return Number(req.user?.id);
};

const numeroSeguro = (valor, fallback = 0) => {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : fallback;
};

const normalizarLimite = (valor, defaultValue = 10) => {
  const numero = Number.parseInt(valor, 10) || defaultValue;

  return Math.min(Math.max(numero, 1), 100);
};

const normalizarPagina = (valor) => {
  return Math.max(Number.parseInt(valor, 10) || 1, 1);
};

const validarId = (valor) => {
  const id = Number(valor);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const construirClienteSimple = (cliente) => {
  if (!cliente) {
    return null;
  }

  return {
    id: cliente.id,

    nombre: cliente.nombre,

    apellido: cliente.apellido,

    nombre_completo: `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim(),

    email: cliente.email,

    telefono: cliente.telefono,

    poder_credito: numeroSeguro(cliente.poder_credito),

    limite_credito_aprobado: numeroSeguro(cliente.limite_credito_aprobado),

    saldo_credito_utilizado: numeroSeguro(cliente.saldo_credito_utilizado),

    activo: Boolean(cliente.activo),
  };
};

const construirUsuarioRevision = (usuario) => {
  if (!usuario) {
    return null;
  }

  return {
    id: usuario.id,

    nombre: usuario.nombre,

    apellido: usuario.apellido,

    nombre_completo: `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim(),

    email: usuario.email,

    rol: usuario.rol,
  };
};

const construirSenal = (senal) => ({
  id: senal.id,

  categoria: senal.categoria,

  codigo: senal.codigo_senal,

  nombre: senal.nombre_senal,

  valor_numerico:
    senal.valor_numerico !== null && senal.valor_numerico !== undefined
      ? numeroSeguro(senal.valor_numerico)
      : null,

  valor_texto: senal.valor_texto,

  valor_booleano:
    senal.valor_booleano === null || senal.valor_booleano === undefined
      ? null
      : Boolean(senal.valor_booleano),

  peso: numeroSeguro(senal.peso),

  impacto: numeroSeguro(senal.impacto_puntaje),

  severidad: senal.severidad,

  activada: Boolean(senal.regla_activada),

  descripcion: senal.descripcion,
});

/* =====================================================
   RESUMEN DEL CENTRO DE RIESGO
===================================================== */

export const getRiskReviewSummary = async (req, res) => {
  try {
    const [
      alertasAbiertas,
      alertasRevision,
      alertasCriticas,
      revisionesPendientes,
      revisionesEnCurso,
      bloqueados,
    ] = await Promise.all([
      AlertaRiesgo.count({
        where: {
          estado: "abierta",
        },
      }),

      AlertaRiesgo.count({
        where: {
          estado: "en_revision",
        },
      }),

      AlertaRiesgo.count({
        where: {
          severidad: "critica",

          estado: {
            [Op.in]: ["abierta", "en_revision", "confirmada"],
          },
        },
      }),

      EvaluacionDinamica.count({
        where: {
          requiere_revision_manual: true,

          estado_revision: "pendiente",
        },
      }),

      EvaluacionDinamica.count({
        where: {
          requiere_revision_manual: true,

          estado_revision: "en_revision",
        },
      }),

      PerfilRiesgoCliente.count({
        where: {
          bloqueado_preventivamente: true,
        },
      }),
    ]);

    return res.json({
      success: true,

      resumen: {
        alertas_abiertas: alertasAbiertas,

        alertas_en_revision: alertasRevision,

        alertas_criticas: alertasCriticas,

        revisiones_pendientes: revisionesPendientes,

        revisiones_en_curso: revisionesEnCurso,

        clientes_bloqueados: bloqueados,
      },
    });
  } catch (error) {
    console.error("Error getRiskReviewSummary:", error);

    return res.status(500).json({
      success: false,

      message: "No se pudo cargar el resumen de riesgo.",
    });
  }
};

/* =====================================================
   LISTAR ALERTAS
===================================================== */

export const getRiskAlerts = async (req, res) => {
  try {
    const {
      estado,
      severidad,
      tipo,
      busqueda = "",
      pagina = 1,
      limite = 10,
    } = req.query;

    const paginaActual = normalizarPagina(pagina);

    const limiteActual = normalizarLimite(limite);

    const offset = (paginaActual - 1) * limiteActual;

    const whereAlerta = {};

    const estadosPermitidos = [
      "abierta",
      "en_revision",
      "confirmada",
      "descartada",
      "resuelta",
    ];

    const severidadesPermitidas = ["baja", "media", "alta", "critica"];

    if (estado) {
      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
          success: false,

          message: "Estado de alerta inválido.",
        });
      }

      whereAlerta.estado = estado;
    }

    if (severidad) {
      if (!severidadesPermitidas.includes(severidad)) {
        return res.status(400).json({
          success: false,

          message: "Severidad inválida.",
        });
      }

      whereAlerta.severidad = severidad;
    }

    if (tipo) {
      whereAlerta.tipo_alerta = tipo;
    }

    const textoBusqueda = String(busqueda).trim();

    const whereCliente = {};

    if (textoBusqueda) {
      whereCliente[Op.or] = [
        {
          nombre: {
            [Op.like]: `%${textoBusqueda}%`,
          },
        },

        {
          apellido: {
            [Op.like]: `%${textoBusqueda}%`,
          },
        },

        {
          email: {
            [Op.like]: `%${textoBusqueda}%`,
          },
        },
      ];
    }

    const resultado = await AlertaRiesgo.findAndCountAll({
      where: whereAlerta,

      include: [
        {
          model: Cliente,

          as: "cliente",

          attributes: [
            "id",
            "nombre",
            "apellido",
            "email",
            "telefono",
            "poder_credito",
            "limite_credito_aprobado",
            "saldo_credito_utilizado",
            "activo",
          ],

          where: textoBusqueda ? whereCliente : undefined,

          required: Boolean(textoBusqueda),
        },

        {
          model: EvaluacionDinamica,

          as: "evaluacion",

          attributes: [
            "id",
            "tipo_evaluacion",
            "monto_solicitado",
            "monto_original",
            "monto_financiable",
            "puntaje_crediticio_resultante",
            "puntaje_fraude",
            "nivel_riesgo",
            "decision",
            "motivo_principal",
            "fecha_evaluacion",
            "ip_hash",
            "dispositivo_hash",
          ],

          required: false,
        },

        {
          model: Usuario,

          as: "usuario_revision",

          attributes: ["id", "nombre", "apellido", "email", "rol"],

          required: false,
        },
      ],

      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],

      limit: limiteActual,

      offset,

      distinct: true,
    });

    const alertas = resultado.rows.map((alerta) => ({
      id: alerta.id,

      tipo_alerta: alerta.tipo_alerta,

      codigo_alerta: alerta.codigo_alerta,

      titulo: alerta.titulo,

      descripcion: alerta.descripcion,

      severidad: alerta.severidad,

      estado: alerta.estado,

      accion_automatica: alerta.accion_automatica,

      comentario_revision: alerta.comentario_revision,

      fecha_revision: alerta.fecha_revision,

      fecha_resolucion: alerta.fecha_resolucion,

      created_at: alerta.created_at,

      cliente: construirClienteSimple(alerta.cliente),

      evaluacion: alerta.evaluacion
        ? {
            id: alerta.evaluacion.id,

            tipo_evaluacion: alerta.evaluacion.tipo_evaluacion,

            monto: numeroSeguro(
              alerta.evaluacion.monto_original ??
                alerta.evaluacion.monto_solicitado,
            ),

            puntaje_crediticio: numeroSeguro(
              alerta.evaluacion.puntaje_crediticio_resultante,
            ),

            puntaje_fraude: numeroSeguro(alerta.evaluacion.puntaje_fraude),

            nivel_riesgo: alerta.evaluacion.nivel_riesgo,

            decision: alerta.evaluacion.decision,

            motivo: alerta.evaluacion.motivo_principal,

            fecha: alerta.evaluacion.fecha_evaluacion,

            ip_hash: alerta.evaluacion.ip_hash,

            dispositivo_hash: alerta.evaluacion.dispositivo_hash,
          }
        : null,

      usuario_revision: construirUsuarioRevision(alerta.usuario_revision),
    }));

    return res.json({
      success: true,

      pagina: paginaActual,

      limite: limiteActual,

      total: resultado.count,

      total_paginas: Math.ceil(resultado.count / limiteActual),

      alertas,
    });
  } catch (error) {
    console.error("Error getRiskAlerts:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudieron cargar las alertas.",
    });
  }
};

/* =====================================================
   DETALLE DE ALERTA
===================================================== */

export const getRiskAlertDetail = async (req, res) => {
  try {
    const alertaId = validarId(req.params.id);

    if (!alertaId) {
      return res.status(400).json({
        success: false,

        message: "ID de alerta inválido.",
      });
    }

    const alerta = await AlertaRiesgo.findByPk(alertaId, {
      include: [
        {
          model: Cliente,

          as: "cliente",

          attributes: [
            "id",
            "nombre",
            "apellido",
            "email",
            "telefono",
            "poder_credito",
            "limite_credito_aprobado",
            "saldo_credito_utilizado",
            "activo",
          ],

          include: [
            {
              model: PerfilRiesgoCliente,

              as: "perfil_riesgo",

              required: false,
            },
          ],
        },

        {
          model: EvaluacionDinamica,

          as: "evaluacion",

          include: [
            {
              model: SenalEvaluacion,

              as: "senales",

              required: false,
            },
          ],

          required: false,
        },

        {
          model: Usuario,

          as: "usuario_revision",

          attributes: ["id", "nombre", "apellido", "email", "rol"],

          required: false,
        },
      ],
    });

    if (!alerta) {
      return res.status(404).json({
        success: false,

        message: "Alerta no encontrada.",
      });
    }

    const perfil = alerta.cliente?.perfil_riesgo;

    return res.json({
      success: true,

      alerta: {
        id: alerta.id,

        tipo_alerta: alerta.tipo_alerta,

        codigo_alerta: alerta.codigo_alerta,

        titulo: alerta.titulo,

        descripcion: alerta.descripcion,

        severidad: alerta.severidad,

        estado: alerta.estado,

        accion_automatica: alerta.accion_automatica,

        comentario_revision: alerta.comentario_revision,

        fecha_revision: alerta.fecha_revision,

        fecha_resolucion: alerta.fecha_resolucion,

        created_at: alerta.created_at,

        cliente: construirClienteSimple(alerta.cliente),

        perfil_riesgo: perfil
          ? {
              puntaje_crediticio: numeroSeguro(perfil.puntaje_crediticio),

              puntaje_fraude: numeroSeguro(perfil.puntaje_fraude),

              nivel_riesgo: perfil.nivel_riesgo,

              limite_recomendado: numeroSeguro(perfil.limite_recomendado),

              porcentaje_enganche_recomendado: numeroSeguro(
                perfil.porcentaje_enganche_recomendado,
              ),

              alertas_activas: numeroSeguro(perfil.alertas_activas),

              bloqueado_preventivamente: Boolean(
                perfil.bloqueado_preventivamente,
              ),

              motivo_bloqueo: perfil.motivo_bloqueo,
            }
          : null,

        evaluacion: alerta.evaluacion
          ? {
              id: alerta.evaluacion.id,

              monto: numeroSeguro(
                alerta.evaluacion.monto_original ??
                  alerta.evaluacion.monto_solicitado,
              ),

              puntaje_crediticio: numeroSeguro(
                alerta.evaluacion.puntaje_crediticio_resultante,
              ),

              puntaje_fraude: numeroSeguro(alerta.evaluacion.puntaje_fraude),

              nivel_riesgo: alerta.evaluacion.nivel_riesgo,

              decision: alerta.evaluacion.decision,

              motivo: alerta.evaluacion.motivo_principal,

              explicacion: alerta.evaluacion.explicacion,

              fecha: alerta.evaluacion.fecha_evaluacion,

              ip_hash: alerta.evaluacion.ip_hash,

              dispositivo_hash: alerta.evaluacion.dispositivo_hash,

              senales: (alerta.evaluacion.senales || []).map(construirSenal),
            }
          : null,

        usuario_revision: construirUsuarioRevision(alerta.usuario_revision),
      },
    });
  } catch (error) {
    console.error("Error getRiskAlertDetail:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo cargar la alerta.",
    });
  }
};

/* =====================================================
   CAMBIAR ESTADO DE ALERTA
===================================================== */

const actualizarEstadoAlerta = async ({
  req,
  res,
  estado,
  resolver = false,
  bloquear = false,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const alertaId = validarId(req.params.id);

    const adminId = obtenerAdminId(req);

    const comentario = String(req.body?.comentario || "").trim();

    if (!alertaId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "ID de alerta inválido.",
      });
    }

    const alerta = await AlertaRiesgo.findByPk(alertaId, {
      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!alerta) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Alerta no encontrada.",
      });
    }

    alerta.estado = estado;

    alerta.usuario_revision_id = adminId;

    alerta.comentario_revision =
      comentario || alerta.comentario_revision || null;

    alerta.fecha_revision = new Date();

    if (resolver) {
      alerta.fecha_resolucion = new Date();
    }

    await alerta.save({
      transaction,
    });

    if (bloquear) {
      const [perfil, creado] = await PerfilRiesgoCliente.findOrCreate({
        where: {
          cliente_id: alerta.cliente_id,
        },

        defaults: {
          cliente_id: alerta.cliente_id,

          bloqueado_preventivamente: true,

          motivo_bloqueo:
            comentario || `Alerta de riesgo confirmada: ${alerta.titulo}`,
        },

        transaction,
      });

      if (!creado) {
        perfil.bloqueado_preventivamente = true;

        perfil.motivo_bloqueo =
          comentario || `Alerta de riesgo confirmada: ${alerta.titulo}`;

        await perfil.save({
          transaction,
        });
      }
    }

    await transaction.commit();

    try {
      await logAction(
        adminId,
        `RIESGO_ALERTA_${estado.toUpperCase()}`,
        "AlertaRiesgo",
        JSON.stringify({
          alerta_id: alerta.id,

          cliente_id: alerta.cliente_id,

          estado,

          comentario: comentario || null,

          bloqueo_preventivo: bloquear,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message:
        estado === "en_revision"
          ? "La alerta fue puesta en revisión."
          : estado === "confirmada"
            ? bloquear
              ? "La alerta fue confirmada y el cliente fue bloqueado preventivamente."
              : "La alerta fue confirmada."
            : estado === "descartada"
              ? "La alerta fue descartada."
              : "La alerta fue resuelta.",

      alerta: {
        id: alerta.id,

        estado: alerta.estado,

        comentario_revision: alerta.comentario_revision,

        fecha_revision: alerta.fecha_revision,

        fecha_resolucion: alerta.fecha_resolucion,
      },
    });
  } catch (error) {
    console.error("Error actualizarEstadoAlerta:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo actualizar la alerta.",
    });
  }
};

export const startRiskAlertReview = async (req, res) =>
  actualizarEstadoAlerta({
    req,
    res,

    estado: "en_revision",
  });

export const confirmRiskAlert = async (req, res) =>
  actualizarEstadoAlerta({
    req,
    res,

    estado: "confirmada",

    bloquear: Boolean(req.body?.bloquear_cliente),
  });

export const discardRiskAlert = async (req, res) =>
  actualizarEstadoAlerta({
    req,
    res,

    estado: "descartada",

    resolver: true,
  });

export const resolveRiskAlert = async (req, res) =>
  actualizarEstadoAlerta({
    req,
    res,

    estado: "resuelta",

    resolver: true,
  });

/* =====================================================
   BLOQUEAR CLIENTE
===================================================== */

export const blockRiskClient = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const clienteId = validarId(req.params.clienteId);

    const adminId = obtenerAdminId(req);

    const motivo = String(req.body?.motivo || "").trim();

    if (!clienteId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Cliente inválido.",
      });
    }

    const cliente = await Cliente.findByPk(clienteId, {
      transaction,
    });

    if (!cliente) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Cliente no encontrado.",
      });
    }

    const [perfil, creado] = await PerfilRiesgoCliente.findOrCreate({
      where: {
        cliente_id: clienteId,
      },

      defaults: {
        cliente_id: clienteId,

        bloqueado_preventivamente: true,

        motivo_bloqueo: motivo || "Bloqueo preventivo administrativo.",
      },

      transaction,
    });

    if (!creado) {
      perfil.bloqueado_preventivamente = true;

      perfil.motivo_bloqueo = motivo || "Bloqueo preventivo administrativo.";

      await perfil.save({
        transaction,
      });
    }

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_BLOQUEAR_CLIENTE",
        "PerfilRiesgoCliente",
        JSON.stringify({
          cliente_id: clienteId,

          motivo: perfil.motivo_bloqueo,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "Cliente bloqueado preventivamente.",

      cliente_id: clienteId,

      bloqueado_preventivamente: true,

      motivo: perfil.motivo_bloqueo,
    });
  } catch (error) {
    console.error("Error blockRiskClient:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo bloquear al cliente.",
    });
  }
};

/* =====================================================
   DESBLOQUEAR CLIENTE
===================================================== */

export const unblockRiskClient = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const clienteId = validarId(req.params.clienteId);

    const adminId = obtenerAdminId(req);

    if (!clienteId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Cliente inválido.",
      });
    }

    const perfil = await PerfilRiesgoCliente.findOne({
      where: {
        cliente_id: clienteId,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!perfil) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "El cliente no tiene perfil de riesgo.",
      });
    }

    perfil.bloqueado_preventivamente = false;

    perfil.motivo_bloqueo = null;

    await perfil.save({
      transaction,
    });

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_DESBLOQUEAR_CLIENTE",
        "PerfilRiesgoCliente",
        JSON.stringify({
          cliente_id: clienteId,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "Cliente desbloqueado correctamente.",

      cliente_id: clienteId,

      bloqueado_preventivamente: false,
    });
  } catch (error) {
    console.error("Error unblockRiskClient:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo desbloquear al cliente.",
    });
  }
};

/* =====================================================
   LISTAR REVISIONES MANUALES
===================================================== */

export const getManualRiskReviews = async (req, res) => {
  try {
    const { estado, busqueda = "", pagina = 1, limite = 10 } = req.query;

    const paginaActual = normalizarPagina(pagina);

    const limiteActual = normalizarLimite(limite);

    const offset = (paginaActual - 1) * limiteActual;

    const whereEvaluacion = {
      requiere_revision_manual: true,
    };

    const estadosPermitidos = [
      "pendiente",
      "en_revision",
      "aprobada",
      "aprobada_condicionada",
      "rechazada",
    ];

    if (estado) {
      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
          success: false,

          message: "Estado de revisión inválido.",
        });
      }

      whereEvaluacion.estado_revision = estado;
    }

    const texto = String(busqueda).trim();

    const whereCliente = {};

    if (texto) {
      whereCliente[Op.or] = [
        {
          nombre: {
            [Op.like]: `%${texto}%`,
          },
        },

        {
          apellido: {
            [Op.like]: `%${texto}%`,
          },
        },

        {
          email: {
            [Op.like]: `%${texto}%`,
          },
        },
      ];
    }

    const resultado = await EvaluacionDinamica.findAndCountAll({
      where: whereEvaluacion,

      include: [
        {
          model: Cliente,

          as: "cliente",

          attributes: [
            "id",
            "nombre",
            "apellido",
            "email",
            "telefono",
            "poder_credito",
            "limite_credito_aprobado",
            "saldo_credito_utilizado",
            "activo",
          ],

          where: texto ? whereCliente : undefined,

          required: Boolean(texto),
        },

        {
          model: Usuario,

          as: "usuario_revision",

          attributes: ["id", "nombre", "apellido", "email", "rol"],

          required: false,
        },

        {
          model: SenalEvaluacion,

          as: "senales",

          required: false,
        },
      ],

      order: [
        ["fecha_evaluacion", "DESC"],

        ["id", "DESC"],
      ],

      limit: limiteActual,

      offset,

      distinct: true,
    });

    const revisiones = resultado.rows.map((evaluacion) => ({
      id: evaluacion.id,

      cliente: construirClienteSimple(evaluacion.cliente),

      monto_solicitado: numeroSeguro(
        evaluacion.monto_original ?? evaluacion.monto_solicitado,
      ),

      monto_financiable: numeroSeguro(evaluacion.monto_financiable),

      porcentaje_enganche: numeroSeguro(evaluacion.porcentaje_enganche),

      cuotas_permitidas: evaluacion.numero_cuotas_permitidas,

      puntaje_crediticio: numeroSeguro(
        evaluacion.puntaje_crediticio_resultante,
      ),

      puntaje_fraude: numeroSeguro(evaluacion.puntaje_fraude),

      nivel_riesgo: evaluacion.nivel_riesgo,

      decision: evaluacion.decision,

      motivo: evaluacion.motivo_principal,

      explicacion: evaluacion.explicacion,

      estado_revision: evaluacion.estado_revision,

      comentario_revision: evaluacion.comentario_revision,

      fecha_revision: evaluacion.fecha_revision,

      fecha_evaluacion: evaluacion.fecha_evaluacion,

      usuario_revision: construirUsuarioRevision(evaluacion.usuario_revision),

      senales_activadas: (evaluacion.senales || [])
        .filter((senal) => Boolean(senal.regla_activada))
        .map(construirSenal),
    }));

    return res.json({
      success: true,

      pagina: paginaActual,

      limite: limiteActual,

      total: resultado.count,

      total_paginas: Math.ceil(resultado.count / limiteActual),

      revisiones,
    });
  } catch (error) {
    console.error("Error getManualRiskReviews:", error);

    return res.status(500).json({
      success: false,

      message:
        error.message || "No se pudieron cargar las revisiones manuales.",
    });
  }
};

/* =====================================================
   DETALLE DE REVISIÓN MANUAL
===================================================== */

export const getManualRiskReviewDetail = async (req, res) => {
  try {
    const evaluacionId = validarId(req.params.id);

    if (!evaluacionId) {
      return res.status(400).json({
        success: false,

        message: "ID de evaluación inválido.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        requiere_revision_manual: true,
      },

      include: [
        {
          model: Cliente,

          as: "cliente",

          include: [
            {
              model: PerfilRiesgoCliente,

              as: "perfil_riesgo",

              required: false,
            },
          ],
        },

        {
          model: Usuario,

          as: "usuario_revision",

          attributes: ["id", "nombre", "apellido", "email", "rol"],

          required: false,
        },

        {
          model: SenalEvaluacion,

          as: "senales",

          required: false,
        },

        {
          model: AlertaRiesgo,

          as: "alertas",

          required: false,
        },
      ],
    });

    if (!evaluacion) {
      return res.status(404).json({
        success: false,

        message: "Revisión manual no encontrada.",
      });
    }

    const perfil = evaluacion.cliente?.perfil_riesgo;

    return res.json({
      success: true,

      revision: {
        id: evaluacion.id,

        cliente: construirClienteSimple(evaluacion.cliente),

        perfil_riesgo: perfil
          ? {
              puntaje_crediticio: numeroSeguro(perfil.puntaje_crediticio),

              puntaje_fraude: numeroSeguro(perfil.puntaje_fraude),

              nivel_riesgo: perfil.nivel_riesgo,

              deuda_activa: numeroSeguro(perfil.deuda_activa),

              porcentaje_puntualidad: numeroSeguro(
                perfil.porcentaje_puntualidad,
              ),

              limite_recomendado: numeroSeguro(perfil.limite_recomendado),

              porcentaje_enganche_recomendado: numeroSeguro(
                perfil.porcentaje_enganche_recomendado,
              ),

              maximo_cuotas_recomendadas: perfil.maximo_cuotas_recomendadas,

              alertas_activas: numeroSeguro(perfil.alertas_activas),

              bloqueado_preventivamente: Boolean(
                perfil.bloqueado_preventivamente,
              ),
            }
          : null,

        monto_original: numeroSeguro(
          evaluacion.monto_original ?? evaluacion.monto_solicitado,
        ),

        monto_financiable: numeroSeguro(evaluacion.monto_financiable),

        porcentaje_enganche: numeroSeguro(evaluacion.porcentaje_enganche),

        numero_cuotas_permitidas: evaluacion.numero_cuotas_permitidas,

        puntaje_crediticio: numeroSeguro(
          evaluacion.puntaje_crediticio_resultante,
        ),

        puntaje_fraude: numeroSeguro(evaluacion.puntaje_fraude),

        nivel_riesgo: evaluacion.nivel_riesgo,

        decision: evaluacion.decision,

        estado_revision: evaluacion.estado_revision,

        motivo: evaluacion.motivo_principal,

        explicacion: evaluacion.explicacion,

        comentario_revision: evaluacion.comentario_revision,

        fecha_revision: evaluacion.fecha_revision,

        fecha_evaluacion: evaluacion.fecha_evaluacion,

        usuario_revision: construirUsuarioRevision(evaluacion.usuario_revision),

        senales: (evaluacion.senales || []).map(construirSenal),

        alertas: (evaluacion.alertas || []).map((alerta) => ({
          id: alerta.id,

          titulo: alerta.titulo,

          tipo_alerta: alerta.tipo_alerta,

          severidad: alerta.severidad,

          estado: alerta.estado,

          descripcion: alerta.descripcion,
        })),
      },
    });
  } catch (error) {
    console.error("Error getManualRiskReviewDetail:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo cargar la revisión.",
    });
  }
};

/* =====================================================
   INICIAR REVISIÓN MANUAL
===================================================== */

export const startManualRiskReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const evaluacionId = validarId(req.params.id);

    const adminId = obtenerAdminId(req);

    if (!evaluacionId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "ID de evaluación inválido.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        requiere_revision_manual: true,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!evaluacion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Revisión manual no encontrada.",
      });
    }

    if (
      ["aprobada", "aprobada_condicionada", "rechazada"].includes(
        evaluacion.estado_revision,
      )
    ) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        message: "Esta revisión ya fue finalizada.",
      });
    }

    evaluacion.estado_revision = "en_revision";

    evaluacion.usuario_revision_id = adminId;

    evaluacion.fecha_revision = new Date();

    await evaluacion.save({
      transaction,
    });

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_REVISION_INICIADA",
        "EvaluacionDinamica",
        JSON.stringify({
          evaluacion_id: evaluacion.id,

          cliente_id: evaluacion.cliente_id,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "La evaluación está ahora en revisión.",

      evaluacion_id: evaluacion.id,

      estado_revision: evaluacion.estado_revision,
    });
  } catch (error) {
    console.error("Error startManualRiskReview:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo iniciar la revisión.",
    });
  }
};

/* =====================================================
   APROBAR REVISIÓN MANUAL
===================================================== */

export const approveManualRiskReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const evaluacionId = validarId(req.params.id);

    const adminId = obtenerAdminId(req);

    const comentario = String(req.body?.comentario || "").trim();

    if (!evaluacionId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "ID de evaluación inválido.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        requiere_revision_manual: true,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!evaluacion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Revisión manual no encontrada.",
      });
    }

    if (
      ["aprobada", "aprobada_condicionada", "rechazada"].includes(
        evaluacion.estado_revision,
      )
    ) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        message: "Esta revisión ya fue finalizada.",
      });
    }

    evaluacion.estado_revision = "aprobada";

    evaluacion.usuario_revision_id = adminId;

    evaluacion.comentario_revision =
      comentario || "Aprobada por revisión administrativa.";

    evaluacion.fecha_revision = new Date();

    evaluacion.requiere_revision_manual = false;

    await evaluacion.save({
      transaction,
    });

    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: evaluacion.cliente_id,

        tipo: "sistema",

        titulo: "Evaluación de riesgo aprobada",

        mensaje:
          "Tu evaluación manual fue aprobada. Puedes intentar nuevamente realizar la compra.",

        url: "/tiendas",

        is_new: true,

        meta: JSON.stringify({
          evaluacion_id: evaluacion.id,

          estado_revision: "aprobada",
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_REVISION_APROBADA",
        "EvaluacionDinamica",
        JSON.stringify({
          evaluacion_id: evaluacion.id,

          cliente_id: evaluacion.cliente_id,

          comentario,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "La evaluación fue aprobada.",

      evaluacion_id: evaluacion.id,

      estado_revision: "aprobada",
    });
  } catch (error) {
    console.error("Error approveManualRiskReview:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo aprobar la revisión.",
    });
  }
};

/* =====================================================
   APROBAR CON CONDICIONES
===================================================== */

export const conditionallyApproveManualRiskReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const evaluacionId = validarId(req.params.id);

    const adminId = obtenerAdminId(req);

    const { porcentaje_enganche, numero_cuotas, comentario } = req.body;

    const porcentaje = Number(porcentaje_enganche);

    const cuotas = Number(numero_cuotas);

    if (!evaluacionId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "ID de evaluación inválido.",
      });
    }

    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 40) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El enganche debe estar entre 0 % y 40 %.",
      });
    }

    if (![1, 4, 12, 24].includes(cuotas)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Las cuotas permitidas son 1, 4, 12 o 24.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        requiere_revision_manual: true,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!evaluacion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Revisión manual no encontrada.",
      });
    }

    if (
      ["aprobada", "aprobada_condicionada", "rechazada"].includes(
        evaluacion.estado_revision,
      )
    ) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        message: "Esta revisión ya fue finalizada.",
      });
    }

    const montoOriginal = numeroSeguro(
      evaluacion.monto_original ?? evaluacion.monto_solicitado,
    );

    const montoFinanciable = Number(
      (montoOriginal * (1 - porcentaje / 100)).toFixed(2),
    );

    evaluacion.estado_revision = "aprobada_condicionada";

    evaluacion.usuario_revision_id = adminId;

    evaluacion.comentario_revision =
      String(comentario || "").trim() ||
      "Aprobada con condiciones por revisión administrativa.";

    evaluacion.fecha_revision = new Date();

    evaluacion.porcentaje_enganche = porcentaje;

    evaluacion.numero_cuotas_permitidas = cuotas;

    evaluacion.monto_financiable = montoFinanciable;

    evaluacion.decision =
      porcentaje > 0 ? "aprobacion_enganche_mayor" : "cuotas_reducidas";

    evaluacion.requiere_revision_manual = false;

    await evaluacion.save({
      transaction,
    });

    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: evaluacion.cliente_id,

        tipo: "sistema",

        titulo: "Nueva decisión de financiamiento",

        mensaje:
          porcentaje > 0
            ? `Tu evaluación fue aprobada con un enganche de ${porcentaje}% y ${cuotas} cuota(s).`
            : `Tu evaluación fue aprobada sin enganche con ${cuotas} cuota(s).`,

        url: "/tiendas",

        is_new: true,

        meta: JSON.stringify({
          evaluacion_id: evaluacion.id,

          estado_revision: "aprobada_condicionada",

          porcentaje_enganche: porcentaje,

          numero_cuotas: cuotas,

          monto_financiable: montoFinanciable,
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_REVISION_APROBADA_CONDICIONES",
        "EvaluacionDinamica",
        JSON.stringify({
          evaluacion_id: evaluacion.id,

          cliente_id: evaluacion.cliente_id,

          porcentaje_enganche: porcentaje,

          numero_cuotas: cuotas,

          monto_financiable: montoFinanciable,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "La evaluación fue aprobada con condiciones.",

      evaluacion_id: evaluacion.id,

      estado_revision: "aprobada_condicionada",

      condiciones: {
        porcentaje_enganche: porcentaje,

        numero_cuotas: cuotas,

        monto_financiable: montoFinanciable,
      },
    });
  } catch (error) {
    console.error("Error conditionallyApproveManualRiskReview:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo aprobar con condiciones.",
    });
  }
};

/* =====================================================
   RECHAZAR REVISIÓN
===================================================== */

export const rejectManualRiskReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const evaluacionId = validarId(req.params.id);

    const adminId = obtenerAdminId(req);

    const comentario = String(req.body?.comentario || "").trim();

    if (!evaluacionId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "ID de evaluación inválido.",
      });
    }

    if (!comentario) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Debes indicar el motivo del rechazo.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        requiere_revision_manual: true,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!evaluacion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Revisión manual no encontrada.",
      });
    }

    if (
      ["aprobada", "aprobada_condicionada", "rechazada"].includes(
        evaluacion.estado_revision,
      )
    ) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        message: "Esta revisión ya fue finalizada.",
      });
    }

    evaluacion.estado_revision = "rechazada";

    evaluacion.usuario_revision_id = adminId;

    evaluacion.comentario_revision = comentario;

    evaluacion.fecha_revision = new Date();

    evaluacion.decision = "rechazo_crediticio";

    evaluacion.requiere_revision_manual = false;

    await evaluacion.save({
      transaction,
    });

    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: evaluacion.cliente_id,

        tipo: "sistema",

        titulo: "Evaluación de financiamiento revisada",

        mensaje:
          `La solicitud revisada manualmente no fue aprobada. ` +
          `Motivo: ${comentario}`,

        url: "/perfil-riesgo/detalles",

        is_new: true,

        meta: JSON.stringify({
          evaluacion_id: evaluacion.id,

          estado_revision: "rechazada",
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_REVISION_RECHAZADA",
        "EvaluacionDinamica",
        JSON.stringify({
          evaluacion_id: evaluacion.id,

          cliente_id: evaluacion.cliente_id,

          comentario,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "La evaluación fue rechazada.",

      evaluacion_id: evaluacion.id,

      estado_revision: "rechazada",
    });
  } catch (error) {
    console.error("Error rejectManualRiskReview:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "No se pudo rechazar la revisión.",
    });
  }
};

/* =====================================================
   OBTENER LÍNEA DE CRÉDITO
===================================================== */

export const getClientCreditLine = async (req, res) => {
  try {
    const clienteId = validarId(req.params.clienteId);

    if (!clienteId) {
      return res.status(400).json({
        success: false,

        message: "Cliente inválido.",
      });
    }

    const resultado = await sincronizarLineaCreditoCliente(clienteId);

    const perfil = await PerfilRiesgoCliente.findOne({
      where: {
        cliente_id: clienteId,
      },
    });

    let historial = [];

    if (HistorialLimiteCredito) {
      historial = await HistorialLimiteCredito.findAll({
        where: {
          cliente_id: clienteId,
        },

        include: [
          {
            model: Usuario,

            as: "administrador",

            attributes: ["id", "nombre", "apellido", "email"],

            required: false,
          },
        ],

        order: [["created_at", "DESC"]],

        limit: 20,
      });
    }

    const limiteAprobado = numeroSeguro(resultado.limite_credito_aprobado);

    const recomendado = numeroSeguro(perfil?.limite_recomendado);

    return res.json({
      success: true,

      linea_credito: {
        cliente_id: resultado.cliente.id,

        cliente: construirClienteSimple(resultado.cliente),

        limite_aprobado: limiteAprobado,

        saldo_utilizado: numeroSeguro(resultado.saldo_credito_utilizado),

        credito_disponible: numeroSeguro(resultado.credito_disponible),

        limite_recomendado: recomendado,

        diferencia_recomendada: Number(
          (recomendado - limiteAprobado).toFixed(2),
        ),

        requiere_ajuste:
          recomendado > 0 && Math.abs(recomendado - limiteAprobado) > 0.009,

        fecha_ultimo_ajuste: resultado.cliente.fecha_ultimo_ajuste_credito,

        motivo_ultimo_ajuste: resultado.cliente.motivo_ultimo_ajuste_credito,
      },

      historial,
    });
  } catch (error) {
    console.error("Error getClientCreditLine:", error);

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "No se pudo cargar la línea de crédito.",
    });
  }
};

/* =====================================================
   AJUSTAR AL LÍMITE RECOMENDADO
===================================================== */

export const applyRecommendedCreditLimit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const clienteId = validarId(req.params.clienteId);

    const adminId = obtenerAdminId(req);

    if (!clienteId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Cliente inválido.",
      });
    }

    const perfil = await PerfilRiesgoCliente.findOne({
      where: {
        cliente_id: clienteId,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!perfil) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "El cliente no posee un perfil de riesgo.",
      });
    }

    const recomendado = Number(perfil.limite_recomendado || 0);

    if (!Number.isFinite(recomendado) || recomendado <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message:
          "El motor no posee un límite recomendado válido para este cliente.",
      });
    }

    const cliente = await Cliente.findByPk(clienteId, {
      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!cliente) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "Cliente no encontrado.",
      });
    }

    const limiteActual = Number(cliente.limite_credito_aprobado || 0);

    let tipoAjuste = "ajuste_recomendado";

    if (recomendado > limiteActual) {
      tipoAjuste = "aumento";
    } else if (recomendado < limiteActual) {
      tipoAjuste = "reduccion";
    }

    const motivo =
      String(req.body?.motivo || "").trim() ||
      "Límite ajustado al valor recomendado por el motor de riesgo.";

    const resultado = await ajustarLimiteCreditoCliente({
      clienteId,

      nuevoLimite: recomendado,

      limiteRecomendado: recomendado,

      adminId,

      motivo,

      tipoAjuste,

      transaction,
    });

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_AJUSTE_LIMITE_RECOMENDADO",
        "Cliente",
        JSON.stringify({
          cliente_id: clienteId,

          limite_anterior: resultado.limite_anterior,

          limite_nuevo: resultado.limite_nuevo,

          limite_recomendado: recomendado,

          motivo,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "El límite de crédito fue ajustado al recomendado.",

      resultado,
    });
  } catch (error) {
    console.error("Error applyRecommendedCreditLimit:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "No se pudo ajustar el límite.",
    });
  }
};

/* =====================================================
   AJUSTAR LÍMITE MANUALMENTE
===================================================== */

export const manuallyAdjustCreditLimit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const clienteId = validarId(req.params.clienteId);

    const adminId = obtenerAdminId(req);

    const nuevoLimite = Number(req.body?.nuevo_limite);

    const motivo = String(req.body?.motivo || "").trim();

    if (!clienteId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Cliente inválido.",
      });
    }

    if (!Number.isFinite(nuevoLimite) || nuevoLimite <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El nuevo límite debe ser mayor que cero.",
      });
    }

    if (!motivo) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "Debes indicar el motivo del ajuste.",
      });
    }

    const perfil = await PerfilRiesgoCliente.findOne({
      where: {
        cliente_id: clienteId,
      },

      transaction,
    });

    const resultado = await ajustarLimiteCreditoCliente({
      clienteId,

      nuevoLimite,

      limiteRecomendado: perfil?.limite_recomendado ?? null,

      adminId,

      motivo,

      tipoAjuste: "ajuste_manual",

      transaction,
    });

    await transaction.commit();

    try {
      await logAction(
        adminId,
        "RIESGO_AJUSTE_LIMITE_MANUAL",
        "Cliente",
        JSON.stringify({
          cliente_id: clienteId,

          limite_anterior: resultado.limite_anterior,

          limite_nuevo: resultado.limite_nuevo,

          limite_recomendado: resultado.limite_recomendado,

          motivo,
        }),
        req,
      );
    } catch (auditError) {
      console.error("Error de auditoría:", auditError);
    }

    return res.json({
      success: true,

      message: "El límite fue actualizado correctamente.",

      resultado,
    });
  } catch (error) {
    console.error("Error manuallyAdjustCreditLimit:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "No se pudo modificar el límite.",
    });
  }
};
