// src/controllers/client.controller.js
import db from "../models/index.js";
import { Op } from "sequelize";

const { Cliente, MetodoPago, EvaluacionCrediticia, SolicitudAumentoCredito } =
  db;

/*
 * Cambia este valor a 3 si prefieres un periodo
 * de espera de tres meses.
 */
const MESES_ESPERA_AUMENTO_CREDITO = 6;

const ESTADOS_SOLICITUD_FINALIZADA = ["aprobada", "rechazada", "cancelada"];

/* =====================================================
   FUNCIONES AUXILIARES PARA EL PERIODO DE ESPERA
===================================================== */

const sumarMeses = (fecha, cantidadMeses) => {
  const resultado = new Date(fecha);

  const diaOriginal = resultado.getDate();

  /*
   * Se coloca temporalmente el día en 1 para evitar errores
   * al sumar meses desde fechas como el 29, 30 o 31.
   */
  resultado.setDate(1);

  resultado.setMonth(resultado.getMonth() + cantidadMeses);

  const ultimoDiaDelMes = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0,
  ).getDate();

  resultado.setDate(Math.min(diaOriginal, ultimoDiaDelMes));

  return resultado;
};

const obtenerBloqueoSolicitudCredito = async (clienteId) => {
  const ultimaSolicitudFinalizada = await SolicitudAumentoCredito.findOne({
    where: {
      cliente_id: clienteId,

      estado: {
        [Op.in]: ESTADOS_SOLICITUD_FINALIZADA,
      },

      fecha_revision: {
        [Op.ne]: null,
      },
    },

    order: [
      ["fecha_revision", "DESC"],
      ["id", "DESC"],
    ],
  });

  if (!ultimaSolicitudFinalizada) {
    return {
      bloqueado: false,
      fecha_proxima_solicitud: null,
      ultima_solicitud: null,
    };
  }

  const fechaBase = new Date(ultimaSolicitudFinalizada.fecha_revision);

  const fechaProximaSolicitud = sumarMeses(
    fechaBase,
    MESES_ESPERA_AUMENTO_CREDITO,
  );

  const ahora = new Date();

  return {
    bloqueado: ahora < fechaProximaSolicitud,

    fecha_proxima_solicitud: fechaProximaSolicitud,

    ultima_solicitud: ultimaSolicitudFinalizada,
  };
};

function getClienteIdFromReq(req) {
  if (req.cliente?.id) {
    return req.cliente.id;
  }

  if (req.user?.id) {
    return req.user.id;
  }

  if (req.userId) {
    return req.userId;
  }

  return null;
}

/* ============================
   PERFIL DEL CLIENTE
============================ */

export const getClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: [
        "id",
        "nombre",
        "apellido",
        "email",
        "telefono",
        "address",
        "poder_credito",
        "preferencia_bnpl",
      ],
    });

    if (!cli) {
      return res.status(404).json({
        message: "Cliente no encontrado.",
      });
    }

    return res.json(cli);
  } catch (error) {
    console.error("Error getClientProfile:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const updateClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const { nombre, apellido, telefono, address } = req.body;

    const cli = await Cliente.findByPk(clienteId);

    if (!cli) {
      return res.status(404).json({
        message: "Cliente no encontrado.",
      });
    }

    cli.nombre = nombre || cli.nombre;
    cli.apellido = apellido || cli.apellido;
    cli.telefono = telefono || cli.telefono;
    cli.address = address || cli.address;

    await cli.save();

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Error updateClientProfile:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================
   MÉTODOS DE PAGO
============================ */

export const getClientPaymentMethods = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const methods = await MetodoPago.findAll({
      where: {
        cliente_id: clienteId,
      },

      order: [
        ["es_predeterminado", "DESC"],
        ["id", "DESC"],
      ],

      attributes: [
        "id",
        "tipo",
        "marca",
        "ultimos_cuatro_digitos",
        "fecha_expiracion",
        "es_predeterminado",
      ],
    });

    return res.json(methods);
  } catch (error) {
    console.error("Error getClientPaymentMethods:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const createClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const {
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado,
    } = req.body;

    if (!tipo || !ultimos_cuatro_digitos) {
      return res.status(400).json({
        message: "Tipo y últimos 4 dígitos son obligatorios.",
      });
    }

    if (es_predeterminado) {
      await MetodoPago.update(
        {
          es_predeterminado: 0,
        },
        {
          where: {
            cliente_id: clienteId,
          },
        },
      );
    }

    const nuevo = await MetodoPago.create({
      cliente_id: clienteId,
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado: es_predeterminado ? 1 : 0,
      token_gateway: "TOKEN_SIMULADO_" + Date.now(),
    });

    return res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error createClientPaymentMethod:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    const { id } = req.params;

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const method = await MetodoPago.findOne({
      where: {
        id,
        cliente_id: clienteId,
      },
    });

    if (!method) {
      return res.status(404).json({
        message: "Método de pago no encontrado.",
      });
    }

    await method.destroy();

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Error deleteClientPaymentMethod:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================
   PREFERENCIAS DE PAGO BNPL
============================ */

export const getClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: ["id", "preferencia_bnpl"],
    });

    if (!cli) {
      return res.status(404).json({
        message: "Cliente no encontrado.",
      });
    }

    return res.json({
      preferencia_bnpl: cli.preferencia_bnpl,
    });
  } catch (error) {
    console.error("Error getClientPaymentPreferences:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const updateClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    const { preferencia_bnpl } = req.body;

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const validValues = [
      "pago_completo",
      "pagar_despues",
      "4_quincenas",
      "12_meses",
      "24_meses",
    ];

    if (!validValues.includes(preferencia_bnpl)) {
      return res.status(400).json({
        message: "Preferencia inválida.",
      });
    }

    const cli = await Cliente.findByPk(clienteId);

    if (!cli) {
      return res.status(404).json({
        message: "Cliente no encontrado.",
      });
    }

    cli.preferencia_bnpl = preferencia_bnpl;

    await cli.save();

    return res.json({
      ok: true,
      preferencia_bnpl,
    });
  } catch (error) {
    console.error("Error updateClientPaymentPreferences:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================
   RESUMEN FINANCIERO (CARTERA)
============================ */

export const getClientWalletData = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado",
      });
    }

    const cliente = await Cliente.findByPk(clienteId);

    if (!cliente) {
      return res.status(404).json({
        message: "Cliente no encontrado",
      });
    }

    const ordenes = await db.Orden.findAll({
      where: {
        cliente_id: clienteId,
      },

      include: [
        {
          model: db.Tienda,
          as: "tienda",
        },

        {
          model: db.PagoBNPL,
          as: "pago_bnpl",

          where: {
            estado: "activo",
          },

          required: false,

          include: [
            {
              model: db.Cuota,
              as: "cuotas",
            },
          ],
        },
      ],

      order: [["fecha", "DESC"]],
    });

    let deudaTotal = 0;
    let proximaCuota = null;
    const comprasActivas = [];

    const ordenesActivas = ordenes.filter((orden) => orden.pago_bnpl);

    for (const ord of ordenesActivas) {
      const bnpl = ord.pago_bnpl;
      const cuotas = bnpl.cuotas || [];

      const pendientes = cuotas.filter(
        (cuota) => cuota.estado === "pendiente" || cuota.estado === "atrasado",
      );

      const montoPendienteOrden = pendientes.reduce(
        (acumulado, cuota) => acumulado + Number(cuota.monto),
        0,
      );

      deudaTotal += montoPendienteOrden;

      for (const cuota of pendientes) {
        const fechaVencimiento = new Date(cuota.fecha_vencimiento);

        if (!proximaCuota || fechaVencimiento < new Date(proximaCuota.fecha)) {
          proximaCuota = {
            fecha: cuota.fecha_vencimiento,
            monto: cuota.monto,
            tienda: ord.tienda?.nombre || "Tienda",
            numero: cuota.numero_cuota,
          };
        }
      }

      const pagadas = cuotas.filter(
        (cuota) => cuota.estado === "pagado",
      ).length;

      const totalCuotas = cuotas.length;

      const progreso = totalCuotas > 0 ? (pagadas / totalCuotas) * 100 : 0;

      comprasActivas.push({
        id: ord.id,

        tienda: ord.tienda?.nombre || "Tienda Desconocida",

        logo: ord.tienda?.logo_url,

        fecha: ord.fecha,

        total_compra: ord.total,

        deuda_restante: montoPendienteOrden,

        progreso: Math.round(progreso),

        cuotas_restantes: pendientes.length,

        proximo_vencimiento: pendientes[0]?.fecha_vencimiento || null,
      });
    }

    return res.json({
      disponible: Number(cliente.poder_credito),

      deuda_total: deudaTotal,

      proximo_pago: proximaCuota,

      compras_activas: comprasActivas,
    });
  } catch (error) {
    console.error("Error getClientWalletData:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* =============================================
   OBTENER EVALUACIÓN CREDITICIA DEL CLIENTE
============================================= */

export const getClientCreditEvaluation = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const [ultimaEvaluacion, solicitudPendiente, bloqueo] = await Promise.all([
      EvaluacionCrediticia.findOne({
        where: {
          cliente_id: clienteId,
        },

        order: [
          ["fecha_evaluacion", "DESC"],
          ["id", "DESC"],
        ],
      }),

      SolicitudAumentoCredito.findOne({
        where: {
          cliente_id: clienteId,
          estado: "pendiente",
        },

        attributes: [
          "id",
          "monto_solicitado",
          "motivo_cliente",
          "estado",
          "fecha_solicitud",
        ],

        order: [
          ["fecha_solicitud", "DESC"],
          ["id", "DESC"],
        ],
      }),

      obtenerBloqueoSolicitudCredito(clienteId),
    ]);

    const evaluacionEsElegible = Boolean(ultimaEvaluacion?.es_elegible);

    const puedeSolicitarAumento =
      evaluacionEsElegible && !solicitudPendiente && !bloqueo.bloqueado;

    if (!ultimaEvaluacion) {
      return res.json({
        tiene_evaluacion: false,

        es_elegible: false,

        puede_solicitar_aumento: false,

        meses_espera: MESES_ESPERA_AUMENTO_CREDITO,

        solicitud_pendiente: solicitudPendiente
          ? {
              id: solicitudPendiente.id,

              monto_solicitado: Number(solicitudPendiente.monto_solicitado),

              motivo_cliente: solicitudPendiente.motivo_cliente,

              estado: solicitudPendiente.estado,

              fecha_solicitud: solicitudPendiente.fecha_solicitud,
            }
          : null,

        bloqueo_solicitud: {
          activo: bloqueo.bloqueado,

          fecha_proxima_solicitud: bloqueo.bloqueado
            ? bloqueo.fecha_proxima_solicitud
            : null,

          ultimo_estado: bloqueo.ultima_solicitud?.estado || null,
        },

        mensaje:
          "Completa un financiamiento para obtener tu primera evaluación crediticia.",

        evaluacion: null,
      });
    }

    let mensaje;

    if (solicitudPendiente) {
      mensaje = "Ya tienes una solicitud de aumento pendiente de revisión.";
    } else if (bloqueo.bloqueado) {
      mensaje = `Debes esperar ${MESES_ESPERA_AUMENTO_CREDITO} meses desde la finalización de tu última solicitud antes de realizar otra.`;
    } else if (evaluacionEsElegible) {
      mensaje =
        "Tu comportamiento crediticio es favorable. Puedes solicitar una revisión de tu límite.";
    } else {
      mensaje =
        "Por el momento no cumples con los requisitos para solicitar un aumento.";
    }

    return res.json({
      tiene_evaluacion: true,

      es_elegible: evaluacionEsElegible,

      puede_solicitar_aumento: puedeSolicitarAumento,

      meses_espera: MESES_ESPERA_AUMENTO_CREDITO,

      solicitud_pendiente: solicitudPendiente
        ? {
            id: solicitudPendiente.id,

            monto_solicitado: Number(solicitudPendiente.monto_solicitado),

            motivo_cliente: solicitudPendiente.motivo_cliente,

            estado: solicitudPendiente.estado,

            fecha_solicitud: solicitudPendiente.fecha_solicitud,
          }
        : null,

      bloqueo_solicitud: {
        activo: bloqueo.bloqueado,

        fecha_proxima_solicitud: bloqueo.bloqueado
          ? bloqueo.fecha_proxima_solicitud
          : null,

        ultimo_estado: bloqueo.ultima_solicitud?.estado || null,
      },

      mensaje,

      evaluacion: {
        id: ultimaEvaluacion.id,

        cuotas_totales: ultimaEvaluacion.cuotas_totales,

        cuotas_pagadas_a_tiempo: ultimaEvaluacion.cuotas_pagadas_a_tiempo,

        cuotas_pagadas_tarde: ultimaEvaluacion.cuotas_pagadas_tarde,

        porcentaje_puntualidad: Number(ultimaEvaluacion.porcentaje_puntualidad),

        es_elegible: evaluacionEsElegible,

        observaciones: ultimaEvaluacion.observaciones,

        fecha_evaluacion: ultimaEvaluacion.fecha_evaluacion,
      },
    });
  } catch (error) {
    console.error("Error getClientCreditEvaluation:", error);

    return res.status(500).json({
      message: "Error al obtener la evaluación crediticia.",
    });
  }
};

/* ============================
   OBTENER ÓRDENES ACTIVAS
============================ */

export const getActiveOrders = async (req, res) => {
  try {
    const userId = getClienteIdFromReq(req);

    if (!userId) {
      return res.status(400).json({
        message: "Usuario no identificado",
      });
    }

    const ordenes = await db.Orden.findAll({
      where: {
        cliente_id: userId,
      },

      include: [
        {
          model: db.Tienda,
          as: "tienda",

          attributes: ["nombre", "logo_url"],
        },

        {
          model: db.PagoBNPL,
          as: "pago_bnpl",

          where: {
            estado: "activo",
          },

          required: true,
        },
      ],

      order: [["fecha", "DESC"]],
    });

    const data = ordenes.map((orden) => ({
      id: orden.id,

      tienda: orden.tienda?.nombre || "Tienda",

      total: orden.total,

      pendiente: orden.pago_bnpl?.monto_pendiente || 0,

      fecha: orden.fecha,

      grupo_pago_id: orden.grupo_pago_id,
    }));

    return res.json(data);
  } catch (error) {
    console.error("Error getActiveOrders:", error);

    return res.status(500).json({
      message: "Error al obtener las compras activas.",
    });
  }
};

/* =============================================
   DASHBOARD PAGOS
============================================= */

export const getPaymentsDashboard = async (req, res) => {
  try {
    const userId = getClienteIdFromReq(req);

    if (!userId) {
      return res.status(400).json({
        message: "Usuario no identificado",
      });
    }

    const deudaRes = await db.PagoBNPL.sum("monto_pendiente", {
      include: [
        {
          model: db.Orden,
          as: "orden",

          where: {
            cliente_id: userId,
          },
        },
      ],

      where: {
        estado: ["activo", "atrasado"],
      },
    });

    const historial = await db.Orden.findAll({
      where: {
        cliente_id: userId,
      },

      include: [
        {
          model: db.Tienda,
          as: "tienda",

          attributes: ["nombre", "logo_url"],
        },
      ],

      order: [["fecha", "DESC"]],

      limit: 10,
    });

    const inicioMes = new Date();

    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const gastoMes = await db.Orden.sum("total", {
      where: {
        cliente_id: userId,

        fecha: {
          [Op.gte]: inicioMes,
        },
      },
    });

    const devoluciones = await db.TicketSoporte.count({
      where: {
        cliente_id: userId,

        asunto: {
          [Op.like]: "%Devolución%",
        },
      },
    });

    return res.json({
      totalOwed: deudaRes || 0,

      spentThisMonth: gastoMes || 0,

      refundsCount: devoluciones || 0,

      recentPurchases: historial.map((compra) => ({
        id: compra.id,

        tienda: compra.tienda?.nombre || "Tienda",

        logo: compra.tienda?.logo_url || null,

        total: compra.total,

        estado: compra.estado,

        fecha: compra.fecha,
      })),
    });
  } catch (error) {
    console.error("Error dashboard:", error);

    return res.status(500).json({
      message: "Error cargando dashboard",
    });
  }
};

/* =============================================
   SOLICITAR AUMENTO DE CRÉDITO
============================================= */

export const requestCreditIncrease = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    const { monto_solicitado, motivo_cliente } = req.body;

    const montoSolicitado = Number(monto_solicitado);

    const motivoNormalizado = motivo_cliente?.trim() || null;

    if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
      return res.status(400).json({
        message: "Debes indicar un monto válido mayor que cero.",
      });
    }

    if (montoSolicitado > 500000) {
      return res.status(400).json({
        message: "El monto solicitado excede el máximo permitido.",
      });
    }

    if (motivoNormalizado && motivoNormalizado.length > 500) {
      return res.status(400).json({
        message: "El motivo no puede superar los 500 caracteres.",
      });
    }

    const ultimaEvaluacion = await EvaluacionCrediticia.findOne({
      where: {
        cliente_id: clienteId,
      },

      order: [
        ["fecha_evaluacion", "DESC"],
        ["id", "DESC"],
      ],
    });

    if (!ultimaEvaluacion) {
      return res.status(403).json({
        message: "Todavía no tienes una evaluación crediticia.",
      });
    }

    if (!ultimaEvaluacion.es_elegible) {
      return res.status(403).json({
        message:
          "Tu última evaluación no es elegible para solicitar un aumento.",
      });
    }

    /*
     * Primero verificamos si existe una solicitud pendiente.
     * Una solicitud pendiente no inicia todavía el periodo de espera.
     */
    const solicitudPendiente = await SolicitudAumentoCredito.findOne({
      where: {
        cliente_id: clienteId,

        estado: "pendiente",
      },

      order: [
        ["fecha_solicitud", "DESC"],
        ["id", "DESC"],
      ],
    });

    if (solicitudPendiente) {
      return res.status(409).json({
        message: "Ya tienes una solicitud pendiente de revisión.",

        motivo: "solicitud_pendiente",

        solicitud: {
          id: solicitudPendiente.id,

          monto_solicitado: Number(solicitudPendiente.monto_solicitado),

          estado: solicitudPendiente.estado,

          fecha_solicitud: solicitudPendiente.fecha_solicitud,
        },
      });
    }

    /*
     * Después validamos si existe una solicitud aprobada,
     * rechazada o cancelada dentro de los últimos seis meses.
     */
    const bloqueo = await obtenerBloqueoSolicitudCredito(clienteId);

    if (bloqueo.bloqueado) {
      return res.status(409).json({
        message: `Debes esperar ${MESES_ESPERA_AUMENTO_CREDITO} meses después de tu última solicitud antes de solicitar otro aumento.`,

        motivo: "periodo_de_espera",

        meses_espera: MESES_ESPERA_AUMENTO_CREDITO,

        fecha_proxima_solicitud: bloqueo.fecha_proxima_solicitud,

        ultima_solicitud: {
          id: bloqueo.ultima_solicitud.id,

          estado: bloqueo.ultima_solicitud.estado,

          fecha_revision: bloqueo.ultima_solicitud.fecha_revision,
        },
      });
    }

    const solicitud = await SolicitudAumentoCredito.create({
      cliente_id: clienteId,

      evaluacion_crediticia_id: ultimaEvaluacion.id,

      monto_solicitado: montoSolicitado.toFixed(2),

      motivo_cliente: motivoNormalizado,

      estado: "pendiente",

      fecha_solicitud: new Date(),
    });

    return res.status(201).json({
      message: "Solicitud de aumento enviada correctamente.",

      solicitud: {
        id: solicitud.id,

        monto_solicitado: Number(solicitud.monto_solicitado),

        motivo_cliente: solicitud.motivo_cliente,

        estado: solicitud.estado,

        fecha_solicitud: solicitud.fecha_solicitud,
      },
    });
  } catch (error) {
    console.error("Error requestCreditIncrease:", error);

    return res.status(500).json({
      message: "Error al crear la solicitud de aumento.",
    });
  }
};

/* =============================================
   OBTENER SOLICITUD PENDIENTE DEL CLIENTE
============================================= */

export const getClientCreditIncreaseRequests = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    /*
     * Ya no se devuelve el historial completo.
     * Solo se devuelve la solicitud pendiente para que
     * el cliente pueda verla y cancelarla desde la billetera.
     */
    const solicitudPendiente = await SolicitudAumentoCredito.findOne({
      where: {
        cliente_id: clienteId,

        estado: "pendiente",
      },

      attributes: [
        "id",
        "monto_solicitado",
        "motivo_cliente",
        "estado",
        "fecha_solicitud",
      ],

      order: [
        ["fecha_solicitud", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json({
      total: solicitudPendiente ? 1 : 0,

      solicitudes: solicitudPendiente
        ? [
            {
              id: solicitudPendiente.id,

              monto_solicitado: Number(solicitudPendiente.monto_solicitado),

              motivo_cliente: solicitudPendiente.motivo_cliente,

              estado: solicitudPendiente.estado,

              fecha_solicitud: solicitudPendiente.fecha_solicitud,
            },
          ]
        : [],
    });
  } catch (error) {
    console.error("Error getClientCreditIncreaseRequests:", error);

    return res.status(500).json({
      message: "Error al obtener la solicitud pendiente.",
    });
  }
};

/* =============================================
   CANCELAR SOLICITUD DE AUMENTO
============================================= */

export const cancelCreditIncreaseRequest = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    const solicitudId = Number(req.params.id);

    if (!clienteId) {
      return res.status(400).json({
        message: "Cliente no identificado en el token.",
      });
    }

    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      return res.status(400).json({
        message: "Identificador de solicitud inválido.",
      });
    }

    const solicitud = await SolicitudAumentoCredito.findOne({
      where: {
        id: solicitudId,
        cliente_id: clienteId,
      },
    });

    if (!solicitud) {
      return res.status(404).json({
        message: "Solicitud no encontrada.",
      });
    }

    if (solicitud.estado !== "pendiente") {
      return res.status(409).json({
        message: "Solo puedes cancelar solicitudes pendientes.",
      });
    }

    /*
     * La fecha_revision representa la fecha desde la cual
     * comienza a contar el periodo de espera.
     */
    solicitud.estado = "cancelada";

    solicitud.fecha_revision = new Date();

    await solicitud.save();

    const bloqueo = await obtenerBloqueoSolicitudCredito(clienteId);

    return res.json({
      message: `Solicitud cancelada correctamente. Podrás volver a solicitar un aumento dentro de ${MESES_ESPERA_AUMENTO_CREDITO} meses.`,

      solicitud: {
        id: solicitud.id,

        estado: solicitud.estado,

        fecha_revision: solicitud.fecha_revision,
      },

      bloqueo_solicitud: {
        activo: bloqueo.bloqueado,

        meses_espera: MESES_ESPERA_AUMENTO_CREDITO,

        fecha_proxima_solicitud: bloqueo.fecha_proxima_solicitud,

        ultimo_estado: bloqueo.ultima_solicitud?.estado || null,
      },
    });
  } catch (error) {
    console.error("Error cancelCreditIncreaseRequest:", error);

    return res.status(500).json({
      message: "Error al cancelar la solicitud.",
    });
  }
};
