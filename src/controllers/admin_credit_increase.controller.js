import db from "../models/index.js";
import { logAction } from "../services/audit.services.js";
import { Op, fn, col } from "sequelize";

const {
  SolicitudAumentoCredito,
  EvaluacionCrediticia,
  Cliente,
  Usuario,
  Notificacion,
  sequelize,
} = db;

/* =============================================
   LISTAR SOLICITUDES DE AUMENTO
============================================= */
/* =============================================
   LISTAR SOLICITUDES CON FILTROS Y PAGINACIÓN
============================================= */
export const getCreditIncreaseRequests = async (
  req,
  res
) => {
  try {
    const {
      estado,
      busqueda = "",
      fecha_desde,
      fecha_hasta,
      pagina = 1,
      limite = 10
    } = req.query;

    const estadosPermitidos = [
      "pendiente",
      "aprobada",
      "rechazada",
      "cancelada"
    ];

    const paginaActual = Math.max(
      Number.parseInt(pagina, 10) || 1,
      1
    );

    const limiteActual = Math.min(
      Math.max(
        Number.parseInt(limite, 10) || 10,
        1
      ),
      100
    );

    const offset =
      (paginaActual - 1) * limiteActual;

    const whereSolicitud = {};
    const whereCliente = {};

    // Filtrar por estado
    if (estado) {
      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
          message:
            "Estado de solicitud inválido."
        });
      }

      whereSolicitud.estado = estado;
    }

    // Filtrar por rango de fechas
    if (fecha_desde || fecha_hasta) {
      whereSolicitud.fecha_solicitud = {};

      if (fecha_desde) {
        const fechaDesde = new Date(
          `${fecha_desde}T00:00:00`
        );

        if (
          Number.isNaN(fechaDesde.getTime())
        ) {
          return res.status(400).json({
            message:
              "La fecha inicial no es válida."
          });
        }

        whereSolicitud.fecha_solicitud[
          Op.gte
        ] = fechaDesde;
      }

      if (fecha_hasta) {
        const fechaHasta = new Date(
          `${fecha_hasta}T23:59:59.999`
        );

        if (
          Number.isNaN(fechaHasta.getTime())
        ) {
          return res.status(400).json({
            message:
              "La fecha final no es válida."
          });
        }

        whereSolicitud.fecha_solicitud[
          Op.lte
        ] = fechaHasta;
      }
    }

    // Validar el orden de las fechas
    if (fecha_desde && fecha_hasta) {
      const inicio = new Date(fecha_desde);
      const fin = new Date(fecha_hasta);

      if (inicio > fin) {
        return res.status(400).json({
          message:
            "La fecha inicial no puede ser posterior a la fecha final."
        });
      }
    }

    // Buscar por información del cliente
    const textoBusqueda = busqueda.trim();

    if (textoBusqueda) {
      whereCliente[Op.or] = [
        {
          nombre: {
            [Op.like]: `%${textoBusqueda}%`
          }
        },
        {
          apellido: {
            [Op.like]: `%${textoBusqueda}%`
          }
        },
        {
          email: {
            [Op.like]: `%${textoBusqueda}%`
          }
        }
      ];
    }

    const resultado =
      await SolicitudAumentoCredito.findAndCountAll(
        {
          where: whereSolicitud,

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
                "poder_credito"
              ],

              where:
                textoBusqueda
                  ? whereCliente
                  : undefined,

              required:
                Boolean(textoBusqueda)
            },

            {
              model: EvaluacionCrediticia,
              as: "evaluacion_crediticia",

              attributes: [
                "id",
                "cuotas_totales",
                "cuotas_pagadas_a_tiempo",
                "cuotas_pagadas_tarde",
                "porcentaje_puntualidad",
                "es_elegible",
                "observaciones",
                "fecha_evaluacion"
              ]
            },

            {
              model: Usuario,
              as: "administrador",

              attributes: [
                "id",
                "nombre",
                "apellido",
                "email"
              ],

              required: false
            }
          ],

          order: [
            ["fecha_solicitud", "DESC"],
            ["id", "DESC"]
          ],

          limit: limiteActual,
          offset,
          distinct: true
        }
      );

    const solicitudes =
      resultado.rows.map(solicitud => ({
        id: solicitud.id,

        monto_solicitado: Number(
          solicitud.monto_solicitado
        ),

        monto_aprobado:
          solicitud.monto_aprobado !== null
            ? Number(
                solicitud.monto_aprobado
              )
            : null,

        motivo_cliente:
          solicitud.motivo_cliente,

        estado: solicitud.estado,

        comentario_administrador:
          solicitud.comentario_administrador,

        fecha_solicitud:
          solicitud.fecha_solicitud,

        fecha_revision:
          solicitud.fecha_revision,

        cliente: solicitud.cliente,

        evaluacion:
          solicitud.evaluacion_crediticia,

        administrador:
          solicitud.administrador
      }));

    const totalRegistros = resultado.count;

    const totalPaginas = Math.max(
      Math.ceil(
        totalRegistros / limiteActual
      ),
      1
    );

    return res.json({
      solicitudes,

      paginacion: {
        pagina_actual: paginaActual,
        limite: limiteActual,
        total_registros: totalRegistros,
        total_paginas: totalPaginas,
        tiene_anterior:
          paginaActual > 1,
        tiene_siguiente:
          paginaActual < totalPaginas
      },

      filtros: {
        estado: estado || null,
        busqueda: textoBusqueda,
        fecha_desde:
          fecha_desde || null,
        fecha_hasta:
          fecha_hasta || null
      }
    });
  } catch (error) {
    console.error(
      "Error getCreditIncreaseRequests:",
      error
    );

    return res.status(500).json({
      message:
        "Error al obtener las solicitudes de crédito."
    });
  }
};

/* =============================================
   APROBAR SOLICITUD DE AUMENTO
============================================= */
export const approveCreditIncreaseRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const solicitudId = Number(req.params.id);

    const administradorId = req.user.id;

    const { monto_aprobado, comentario_administrador } = req.body;

    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: "Identificador de solicitud inválido.",
      });
    }

    const montoAprobado = Number(monto_aprobado);

    if (!Number.isFinite(montoAprobado) || montoAprobado <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: "El monto aprobado debe ser mayor que cero.",
      });
    }

    if (montoAprobado > 500000) {
      await transaction.rollback();

      return res.status(400).json({
        message: "El monto aprobado supera el máximo permitido.",
      });
    }

    const solicitud = await SolicitudAumentoCredito.findByPk(solicitudId, {
      include: [
        {
          model: Cliente,
          as: "cliente",
        },

        {
          model: EvaluacionCrediticia,
          as: "evaluacion_crediticia",
        },
      ],

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!solicitud) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Solicitud no encontrada.",
      });
    }

    if (solicitud.estado !== "pendiente") {
      await transaction.rollback();

      return res.status(409).json({
        message: "Esta solicitud ya fue procesada o cancelada.",
      });
    }

    const montoSolicitado = Number(solicitud.monto_solicitado);

    if (montoAprobado > montoSolicitado) {
      await transaction.rollback();

      return res.status(400).json({
        message:
          "El monto aprobado no puede superar el monto solicitado por el cliente.",
      });
    }

    if (
      !solicitud.evaluacion_crediticia ||
      !solicitud.evaluacion_crediticia.es_elegible
    ) {
      await transaction.rollback();

      return res.status(409).json({
        message: "La evaluación relacionada ya no es elegible.",
      });
    }

    const cliente = solicitud.cliente;

    if (!cliente) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Cliente relacionado no encontrado.",
      });
    }

    const creditoAnterior = Number(cliente.poder_credito);

    const creditoNuevo = creditoAnterior + montoAprobado;

    // Solo aquí se aumenta el crédito
    cliente.poder_credito = creditoNuevo.toFixed(2);

    await cliente.save({
      transaction,
    });

    solicitud.estado = "aprobada";
    solicitud.monto_aprobado = montoAprobado.toFixed(2);
    solicitud.comentario_administrador =
      comentario_administrador?.trim() || "Solicitud aprobada.";
    solicitud.administrador_id = administradorId;
    solicitud.fecha_revision = new Date();

    await solicitud.save({
      transaction,
    });

    await Notificacion.create(
      {
        rol_destino: "cliente",
        usuario_id: cliente.id,
        tipo: "credito",
        titulo: "Aumento de crédito aprobado",

        mensaje: `Tu solicitud fue aprobada por RD$ ${montoAprobado.toLocaleString(
          "es-DO",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )}. Tu crédito disponible fue actualizado.`,

        url: "/cartera",
        is_new: true,

        meta: JSON.stringify({
          solicitud_id: solicitud.id,
          monto_aprobado: montoAprobado,
          credito_anterior: creditoAnterior,
          credito_nuevo: creditoNuevo,
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    await logAction(
      administradorId,
      "APROBACION",
      "Solicitud aumento crédito",
      [
        `Solicitud #${solicitud.id}`,
        `Cliente: ${cliente.email}`,
        `Monto solicitado: RD$ ${Number(
          solicitud.monto_solicitado,
        ).toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `Monto aprobado: RD$ ${montoAprobado.toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `Crédito anterior: RD$ ${creditoAnterior.toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `Crédito nuevo: RD$ ${creditoNuevo.toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ].join(" | "),
      req,
    );

    return res.json({
      message: "Solicitud aprobada correctamente.",

      solicitud: {
        id: solicitud.id,
        estado: solicitud.estado,
        monto_solicitado: Number(solicitud.monto_solicitado),
        monto_aprobado: Number(solicitud.monto_aprobado),
        fecha_revision: solicitud.fecha_revision,
      },

      credito: {
        anterior: creditoAnterior,
        aumento: montoAprobado,
        nuevo: creditoNuevo,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Error approveCreditIncreaseRequest:", error);

    return res.status(500).json({
      message: "Error al aprobar la solicitud.",
    });
  }
};

/* =============================================
   RECHAZAR SOLICITUD DE AUMENTO
============================================= */
export const rejectCreditIncreaseRequest = async (req, res) => {
  try {
    const solicitudId = Number(req.params.id);

    const administradorId = req.user.id;

    const { comentario_administrador } = req.body;

    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      return res.status(400).json({
        message: "Identificador de solicitud inválido.",
      });
    }

    if (
      !comentario_administrador ||
      comentario_administrador.trim().length < 5
    ) {
      return res.status(400).json({
        message: "Debes indicar el motivo del rechazo.",
      });
    }

    if (comentario_administrador.trim().length > 500) {
      return res.status(400).json({
        message: "El comentario no puede superar los 500 caracteres.",
      });
    }

    const solicitud = await SolicitudAumentoCredito.findByPk(solicitudId, {
      include: [
        {
          model: Cliente,
          as: "cliente",
        },
      ],
    });

    if (!solicitud) {
      return res.status(404).json({
        message: "Solicitud no encontrada.",
      });
    }

    if (solicitud.estado !== "pendiente") {
      return res.status(409).json({
        message: "Esta solicitud ya fue procesada o cancelada.",
      });
    }

    solicitud.estado = "rechazada";
    solicitud.monto_aprobado = null;
    solicitud.comentario_administrador = comentario_administrador.trim();
    solicitud.administrador_id = administradorId;
    solicitud.fecha_revision = new Date();

    await solicitud.save();

    if (solicitud.cliente) {
      await Notificacion.create({
        rol_destino: "cliente",
        usuario_id: solicitud.cliente.id,
        tipo: "credito",
        titulo: "Solicitud de aumento revisada",

        mensaje: `Tu solicitud de aumento fue rechazada. Motivo: ${comentario_administrador.trim()}`,

        url: "/cartera",
        is_new: true,

        meta: JSON.stringify({
          solicitud_id: solicitud.id,
          estado: "rechazada",
        }),
      });
    }

    await logAction(
      administradorId,
      "RECHAZO",
      "Solicitud aumento crédito",
      [
        `Solicitud #${solicitud.id}`,
        `Cliente: ${solicitud.cliente?.email || `ID ${solicitud.cliente_id}`}`,
        `Monto solicitado: RD$ ${Number(
          solicitud.monto_solicitado,
        ).toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `Motivo: ${solicitud.comentario_administrador}`,
      ].join(" | "),
      req,
    );

    return res.json({
      message: "Solicitud rechazada correctamente.",

      solicitud: {
        id: solicitud.id,
        estado: solicitud.estado,
        comentario_administrador: solicitud.comentario_administrador,
        fecha_revision: solicitud.fecha_revision,
      },
    });
  } catch (error) {
    console.error("Error rejectCreditIncreaseRequest:", error);

    return res.status(500).json({
      message: "Error al rechazar la solicitud.",
    });
  }
};

/* =============================================
   ESTADÍSTICAS DE SOLICITUDES DE CRÉDITO
============================================= */
export const getCreditIncreaseStatistics = async (
  req,
  res
) => {
  try {
    const [
      total,
      pendientes,
      aprobadas,
      rechazadas,
      canceladas,
      montoSolicitadoResultado,
      montoAprobadoResultado
    ] = await Promise.all([
      SolicitudAumentoCredito.count(),

      SolicitudAumentoCredito.count({
        where: {
          estado: "pendiente"
        }
      }),

      SolicitudAumentoCredito.count({
        where: {
          estado: "aprobada"
        }
      }),

      SolicitudAumentoCredito.count({
        where: {
          estado: "rechazada"
        }
      }),

      SolicitudAumentoCredito.count({
        where: {
          estado: "cancelada"
        }
      }),

      SolicitudAumentoCredito.findOne({
        attributes: [
          [
            fn(
              "SUM",
              col("monto_solicitado")
            ),
            "total_monto_solicitado"
          ]
        ],
        raw: true
      }),

      SolicitudAumentoCredito.findOne({
        attributes: [
          [
            fn(
              "SUM",
              col("monto_aprobado")
            ),
            "total_monto_aprobado"
          ]
        ],

        where: {
          estado: "aprobada",

          monto_aprobado: {
            [Op.ne]: null
          }
        },

        raw: true
      })
    ]);

    const montoTotalSolicitado = Number(
      montoSolicitadoResultado
        ?.total_monto_solicitado || 0
    );

    const montoTotalAprobado = Number(
      montoAprobadoResultado
        ?.total_monto_aprobado || 0
    );

    const solicitudesProcesadas =
      aprobadas + rechazadas;

    const porcentajeAprobacion =
      solicitudesProcesadas > 0
        ? Number(
            (
              (aprobadas /
                solicitudesProcesadas) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.json({
      estadisticas: {
        total,
        pendientes,
        aprobadas,
        rechazadas,
        canceladas,
        monto_total_solicitado:
          montoTotalSolicitado,
        monto_total_aprobado:
          montoTotalAprobado,
        solicitudes_procesadas:
          solicitudesProcesadas,
        porcentaje_aprobacion:
          porcentajeAprobacion
      }
    });
  } catch (error) {
    console.error(
      "Error getCreditIncreaseStatistics:",
      error
    );

    return res.status(500).json({
      message:
        "Error al obtener las estadísticas de solicitudes."
    });
  }
};
