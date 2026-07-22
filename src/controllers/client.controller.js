// src/controllers/client.controller.js
import db from "../models/index.js";

const { Cliente, MetodoPago, EvaluacionCrediticia, SolicitudAumentoCredito } = db;

function getClienteIdFromReq(req) {
  if (req.cliente?.id) return req.cliente.id;
  if (req.user?.id) return req.user.id; // fallback por compatibilidad
  if (req.userId) return req.userId; // otro fallback
  return null;
}
/* ============================
   PERFIL DEL CLIENTE
============================ */
export const getClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
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
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    res.json(cli);
  } catch (error) {
    console.error("Error getClientProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }
    const { nombre, apellido, telefono, address } = req.body;
    const cli = await Cliente.findByPk(clienteId);
    if (!cli) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }
    cli.nombre = nombre || cli.nombre;
    cli.apellido = apellido || cli.apellido;
    cli.telefono = telefono || cli.telefono;
    cli.address = address || cli.address;
    await cli.save();

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updateClientProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   MÉTODOS DE PAGO
============================ */
export const getClientPaymentMethods = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const methods = await MetodoPago.findAll({
      where: { cliente_id: clienteId },
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

    res.json(methods);
  } catch (error) {
    console.error("Error getClientPaymentMethods:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const {
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado,
    } = req.body;

    if (!tipo || !ultimos_cuatro_digitos) {
      return res
        .status(400)
        .json({ message: "Tipo y últimos 4 dígitos son obligatorios." });
    }

    // si marcó como predeterminado, ponemos los otros en 0
    if (es_predeterminado) {
      await MetodoPago.update(
        { es_predeterminado: 0 },
        { where: { cliente_id: clienteId } },
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

    res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error createClientPaymentMethod:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { id } = req.params;

    const method = await MetodoPago.findOne({
      where: { id, cliente_id: clienteId },
    });

    if (!method) {
      return res.status(404).json({ message: "Método de pago no encontrado." });
    }

    await method.destroy();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleteClientPaymentMethod:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   PREFERENCIAS DE PAGO BNPL
============================ */

export const getClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: ["id", "preferencia_bnpl"],
    });

    if (!cli)
      return res.status(404).json({ message: "Cliente no encontrado." });

    // devolvemos el valor EXACTO del enum
    res.json({
      preferencia_bnpl: cli.preferencia_bnpl,
    });
  } catch (error) {
    console.error("Error getClientPaymentPreferences:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { preferencia_bnpl } = req.body;

    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    // OJO: aquí usamos los valores del ENUM REAL de la tabla
    const validValues = [
      "pago_completo",
      "pagar_despues",
      "4_quincenas",
      "12_meses",
      "24_meses",
    ];

    if (!validValues.includes(preferencia_bnpl)) {
      return res.status(400).json({ message: "Preferencia inválida." });
    }

    const cli = await Cliente.findByPk(clienteId);
    if (!cli)
      return res.status(404).json({ message: "Cliente no encontrado." });

    cli.preferencia_bnpl = preferencia_bnpl;
    await cli.save();

    res.json({ ok: true, preferencia_bnpl });
  } catch (error) {
    console.error("Error updateClientPaymentPreferences:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   RESUMEN FINANCIERO (CARTERA)
============================ */
export const getClientWalletData = async (req, res) => {
  try {
    // Obtenemos el ID del cliente del token
    const clienteId = req.cliente?.id || req.user?.id;
    if (!clienteId)
      return res.status(400).json({ message: "Cliente no identificado" });

    // 1. Obtener Cliente (para ver su crédito disponible)
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente)
      return res.status(404).json({ message: "Cliente no encontrado" });

    // 2. Buscar todas las órdenes activas del cliente con sus pagos y cuotas
    // Usamos una consulta un poco más manual para garantizar que traiga todo
    const ordenes = await db.Orden.findAll({
      where: { cliente_id: clienteId },
      include: [
        { model: db.Tienda, as: "tienda" }, // Asegúrate de tener la asociación en models/index.js
        {
          model: db.PagoBNPL,
          as: "pago_bnpl", // Asegúrate de tener la asociación Orden -> hasOne -> PagoBNPL
          where: { estado: "activo" }, // Solo nos interesan las deudas activas
          required: false, // Si es false, trae órdenes aunque no tengan pago activo (ej: pagadas), pero el where lo filtra
          include: [
            {
              model: db.Cuota,
              as: "cuotas", // Asegúrate de tener PagoBNPL -> hasMany -> Cuotas
            },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    });

    // 3. Procesar datos para el Frontend
    let deudaTotal = 0;
    let proximaCuota = null;
    let comprasActivas = [];

    // Filtramos solo las órdenes que tienen un plan BNPL activo
    const ordenesActivas = ordenes.filter((o) => o.pago_bnpl);

    for (const ord of ordenesActivas) {
      const bnpl = ord.pago_bnpl;
      const cuotas = bnpl.cuotas || [];

      // Calcular deuda pendiente de esta orden
      const pendientes = cuotas.filter(
        (c) => c.estado === "pendiente" || c.estado === "atrasado",
      );
      const montoPendienteOrden = pendientes.reduce(
        (acc, c) => acc + Number(c.monto),
        0,
      );

      deudaTotal += montoPendienteOrden;

      // Buscar la cuota más próxima a vencer de TODO el historial
      for (const c of pendientes) {
        const fechaVenc = new Date(c.fecha_vencimiento);
        if (!proximaCuota || fechaVenc < new Date(proximaCuota.fecha)) {
          proximaCuota = {
            fecha: c.fecha_vencimiento,
            monto: c.monto,
            tienda: ord.tienda?.nombre || "Tienda",
            numero: c.numero_cuota,
          };
        }
      }

      // Estructura para la lista de compras
      const pagadas = cuotas.filter((c) => c.estado === "pagado").length;
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

    res.json({
      disponible: Number(cliente.poder_credito),
      deuda_total: deudaTotal,
      proximo_pago: proximaCuota,
      compras_activas: comprasActivas,
    });
  } catch (error) {
    console.error("Error getClientWalletData:", error);
    res.status(500).json({ message: error.message });
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

    // Obtener la evaluación más reciente del cliente
    const ultimaEvaluacion = await EvaluacionCrediticia.findOne({
      where: {
        cliente_id: clienteId,
      },
      order: [
        ["fecha_evaluacion", "DESC"],
        ["id", "DESC"],
      ],
    });

    // Si el cliente todavía no tiene una evaluación
    if (!ultimaEvaluacion) {
      return res.json({
        tiene_evaluacion: false,
        es_elegible: false,
        mensaje:
          "Completa un financiamiento para obtener tu primera evaluación crediticia.",
        evaluacion: null,
      });
    }

    return res.json({
      tiene_evaluacion: true,
      es_elegible: Boolean(ultimaEvaluacion.es_elegible),

      mensaje: ultimaEvaluacion.es_elegible
        ? "Tu comportamiento crediticio es favorable. Puedes solicitar una revisión de tu límite."
        : "Por el momento no cumples con los requisitos para solicitar un aumento.",

      evaluacion: {
        id: ultimaEvaluacion.id,

        cuotas_totales: ultimaEvaluacion.cuotas_totales,

        cuotas_pagadas_a_tiempo: ultimaEvaluacion.cuotas_pagadas_a_tiempo,

        cuotas_pagadas_tarde: ultimaEvaluacion.cuotas_pagadas_tarde,

        porcentaje_puntualidad: Number(ultimaEvaluacion.porcentaje_puntualidad),

        es_elegible: Boolean(ultimaEvaluacion.es_elegible),

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
   OBTENER ÓRDENES ACTIVAS (Para Dividir Cuenta)
============================ */
/* ============================
   OBTENER ÓRDENES ACTIVAS
============================ */
export const getActiveOrders = async (req, res) => {
  try {
    const userId = req.cliente?.id || req.user?.id;
    if (!userId)
      return res.status(400).json({ message: "Usuario no identificado" });

    const ordenes = await db.Orden.findAll({
      where: { cliente_id: userId },
      include: [
        {
          model: db.Tienda,
          as: "tienda",
          attributes: ["nombre", "logo_url"], // Agregamos logo si quieres
        },
        {
          model: db.PagoBNPL,
          as: "pago_bnpl",
          where: { estado: "activo" },
          required: true,
        },
      ],
      order: [["fecha", "DESC"]],
    });

    const data = ordenes.map((o) => ({
      id: o.id,
      tienda: o.tienda?.nombre || "Tienda",
      total: o.total,
      pendiente: o.pago_bnpl?.monto_pendiente || 0,
      fecha: o.fecha,
      grupo_pago_id: o.grupo_pago_id, // <--- 🔥 AGREGAMOS ESTO IMPORTANTE
    }));

    res.json(data);
  } catch (err) {
    console.error("Error getActiveOrders:", err);
    res.status(500).json({ message: "Error al obtener las compras activas." });
  }
};

/* =============================================
   DASHBOARD PAGOS (DATA TIPO KLARNA)
============================================= */
export const getPaymentsDashboard = async (req, res) => {
  try {
    const userId = req.cliente?.id || req.user?.id;

    // 1. Calcular Deuda Total
    const deudaRes = await db.PagoBNPL.sum("monto_pendiente", {
      include: [
        {
          model: db.Orden,
          as: "orden",
          where: { cliente_id: userId },
        },
      ],
      where: { estado: ["activo", "atrasado"] },
    });

    // 2. Historial de Compras (All purchases)
    const historial = await db.Orden.findAll({
      where: { cliente_id: userId },
      include: [
        { model: db.Tienda, as: "tienda", attributes: ["nombre", "logo_url"] },
      ],
      order: [["fecha", "DESC"]],
      limit: 10,
    });

    // 3. Insights (Gasto este mes)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const gastoMes = await db.Orden.sum("total", {
      where: {
        cliente_id: userId,
        fecha: { [db.Sequelize.Op.gte]: inicioMes }, // Mayor o igual al día 1
      },
    });

    // 4. Devoluciones (Tickets tipo 'devolucion')
    // Ojo: Filtramos por el asunto o podrías agregar un campo 'tipo' real en la tabla ticket
    const devoluciones = await db.TicketSoporte.count({
      where: {
        cliente_id: userId,
        asunto: { [db.Sequelize.Op.like]: "%Devolución%" },
      },
    });

    res.json({
      totalOwed: deudaRes || 0,
      spentThisMonth: gastoMes || 0,
      refundsCount: devoluciones || 0,
      recentPurchases: historial.map((h) => ({
        id: h.id,
        tienda: h.tienda.nombre,
        logo: h.tienda.logo_url,
        total: h.total,
        estado: h.estado,
        fecha: h.fecha,
      })),
    });
  } catch (err) {
    console.error("Error dashboard:", err);
    res.status(500).json({ message: "Error cargando dashboard" });
  }
};

/* =============================================
   SOLICITAR AUMENTO DE CRÉDITO
============================================= */
export const requestCreditIncrease = async (
  req,
  res
) => {
  try {
    const clienteId = getClienteIdFromReq(req);

    if (!clienteId) {
      return res.status(400).json({
        message:
          "Cliente no identificado en el token."
      });
    }

    const {
      monto_solicitado,
      motivo_cliente
    } = req.body;

    const montoSolicitado = Number(
      monto_solicitado
    );

    // Validar monto
    if (
      !Number.isFinite(montoSolicitado) ||
      montoSolicitado <= 0
    ) {
      return res.status(400).json({
        message:
          "Debes indicar un monto válido mayor que cero."
      });
    }

    // Límite provisional para evitar solicitudes absurdas
    if (montoSolicitado > 500000) {
      return res.status(400).json({
        message:
          "El monto solicitado excede el máximo permitido."
      });
    }

    // Obtener la evaluación más reciente
    const ultimaEvaluacion =
      await EvaluacionCrediticia.findOne({
        where: {
          cliente_id: clienteId
        },
        order: [
          ["fecha_evaluacion", "DESC"],
          ["id", "DESC"]
        ]
      });

    if (!ultimaEvaluacion) {
      return res.status(403).json({
        message:
          "Todavía no tienes una evaluación crediticia."
      });
    }

    if (!ultimaEvaluacion.es_elegible) {
      return res.status(403).json({
        message:
          "Tu última evaluación no es elegible para solicitar un aumento."
      });
    }

    // Evitar más de una solicitud pendiente
    const solicitudPendiente =
      await SolicitudAumentoCredito.findOne({
        where: {
          cliente_id: clienteId,
          estado: "pendiente"
        }
      });

    if (solicitudPendiente) {
      return res.status(409).json({
        message:
          "Ya tienes una solicitud pendiente de revisión.",
        solicitud: solicitudPendiente
      });
    }

    const solicitud =
      await SolicitudAumentoCredito.create({
        cliente_id: clienteId,

        evaluacion_crediticia_id:
          ultimaEvaluacion.id,

        monto_solicitado:
          montoSolicitado.toFixed(2),

        motivo_cliente:
          motivo_cliente?.trim() || null,

        estado: "pendiente",

        fecha_solicitud: new Date()
      });

    return res.status(201).json({
      message:
        "Solicitud de aumento enviada correctamente.",

      solicitud: {
        id: solicitud.id,

        monto_solicitado: Number(
          solicitud.monto_solicitado
        ),

        motivo_cliente:
          solicitud.motivo_cliente,

        estado: solicitud.estado,

        fecha_solicitud:
          solicitud.fecha_solicitud
      }
    });
  } catch (error) {
    console.error(
      "Error requestCreditIncrease:",
      error
    );

    return res.status(500).json({
      message:
        "Error al crear la solicitud de aumento."
    });
  }
};

/* =============================================
   OBTENER SOLICITUDES DE AUMENTO DEL CLIENTE
============================================= */
export const getClientCreditIncreaseRequests =
  async (req, res) => {
    try {
      const clienteId =
        getClienteIdFromReq(req);

      if (!clienteId) {
        return res.status(400).json({
          message:
            "Cliente no identificado en el token."
        });
      }

      const solicitudes =
        await SolicitudAumentoCredito.findAll({
          where: {
            cliente_id: clienteId
          },

          include: [
            {
              model: EvaluacionCrediticia,
              as: "evaluacion_crediticia",

              attributes: [
                "id",
                "porcentaje_puntualidad",
                "cuotas_totales",
                "cuotas_pagadas_a_tiempo",
                "cuotas_pagadas_tarde",
                "es_elegible",
                "fecha_evaluacion"
              ]
            }
          ],

          order: [
            ["fecha_solicitud", "DESC"],
            ["id", "DESC"]
          ]
        });

      return res.json({
        total: solicitudes.length,

        solicitudes: solicitudes.map(
          solicitud => ({
            id: solicitud.id,

            monto_solicitado: Number(
              solicitud.monto_solicitado
            ),

            motivo_cliente:
              solicitud.motivo_cliente,

            estado: solicitud.estado,

            comentario_administrador:
              solicitud.comentario_administrador,

            fecha_solicitud:
              solicitud.fecha_solicitud,

            fecha_revision:
              solicitud.fecha_revision,

            evaluacion:
              solicitud.evaluacion_crediticia
          })
        )
      });
    } catch (error) {
      console.error(
        "Error getClientCreditIncreaseRequests:",
        error
      );

      return res.status(500).json({
        message:
          "Error al obtener las solicitudes."
      });
    }
  };

  /* =============================================
   CANCELAR SOLICITUD DE AUMENTO
============================================= */
export const cancelCreditIncreaseRequest =
  async (req, res) => {
    try {
      const clienteId =
        getClienteIdFromReq(req);

      const solicitudId = Number(
        req.params.id
      );

      if (!clienteId) {
        return res.status(400).json({
          message:
            "Cliente no identificado en el token."
        });
      }

      if (
        !Number.isInteger(solicitudId) ||
        solicitudId <= 0
      ) {
        return res.status(400).json({
          message:
            "Identificador de solicitud inválido."
        });
      }

      const solicitud =
        await SolicitudAumentoCredito.findOne({
          where: {
            id: solicitudId,
            cliente_id: clienteId
          }
        });

      if (!solicitud) {
        return res.status(404).json({
          message:
            "Solicitud no encontrada."
        });
      }

      if (solicitud.estado !== "pendiente") {
        return res.status(409).json({
          message:
            "Solo puedes cancelar solicitudes pendientes."
        });
      }

      solicitud.estado = "cancelada";

      await solicitud.save();

      return res.json({
        message:
          "Solicitud cancelada correctamente.",

        solicitud: {
          id: solicitud.id,
          estado: solicitud.estado
        }
      });
    } catch (error) {
      console.error(
        "Error cancelCreditIncreaseRequest:",
        error
      );

      return res.status(500).json({
        message:
          "Error al cancelar la solicitud."
      });
    }
  };

