import db from "../models/index.js";

import {
  evaluarCompraDinamicamente,
  DECISIONES,
} from "../services/dynamic-risk-engine.service.js";

import { recalcularPerfilRiesgoCliente } from "../services/risk-profile.service.js";

import { sincronizarLineaCreditoCliente } from "../services/credit-line.service.js";

import {
  analizarContextoCompra,
  registrarContextoCompra,
  marcarContextoComoFormalizado,
} from "../services/purchase-context.service.js";

const {
  Cliente,
  Tienda,
  Orden,
  PagoBNPL,
  Cuota,
  Notificacion,
  EvaluacionCrediticia,
  EvaluacionDinamica,
  AlertaRiesgo,
  MetodoPago,
  PagoEnganche,
} = db;

/* =====================================================
   PLANES
===================================================== */

const PLAN_IDS = {
  "4_quincenas": 2,
  "12_meses": 3,
  "24_meses": 4,
  pago_completo: 5,
  pagar_despues: 6,
};

const MAPA_CUOTAS = {
  pago_completo: 1,
  pagar_despues: 1,
  "4_quincenas": 4,
  "12_meses": 12,
  "24_meses": 24,
};

/* =====================================================
   HELPERS
===================================================== */

const obtenerIpCliente = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }

  return req.socket?.remoteAddress || req.ip || null;
};

const generarFechaVencimiento = ({ preferencia, numeroCuota, fechaBase }) => {
  const vencimiento = new Date(fechaBase);

  if (preferencia === "4_quincenas") {
    vencimiento.setDate(vencimiento.getDate() + 15 * numeroCuota);
  } else if (preferencia === "pagar_despues") {
    vencimiento.setDate(vencimiento.getDate() + 30);
  } else if (preferencia === "pago_completo") {
    vencimiento.setDate(vencimiento.getDate() + 1);
  } else {
    vencimiento.setMonth(vencimiento.getMonth() + numeroCuota);
  }

  return vencimiento;
};

const crearCuotasFinanciamiento = async ({
  pagoBnplId,
  montoTotal,
  numeroCuotas,
  preferencia,
  transaction,
}) => {
  const monto = Number(montoTotal);

  const cantidadCuotas = Number(numeroCuotas);

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto del financiamiento no es válido.");
  }

  if (!Number.isInteger(cantidadCuotas) || cantidadCuotas <= 0) {
    throw new Error("El número de cuotas autorizado no es válido.");
  }

  const cuotaBase = Math.floor((monto / cantidadCuotas) * 100) / 100;

  const fechaBase = new Date();

  let acumulado = 0;

  const cuotas = [];

  for (let numeroCuota = 1; numeroCuota <= cantidadCuotas; numeroCuota += 1) {
    let montoCuota = cuotaBase;

    if (numeroCuota === cantidadCuotas) {
      montoCuota = Number((monto - acumulado).toFixed(2));
    }

    acumulado = Number((acumulado + montoCuota).toFixed(2));

    cuotas.push({
      pago_bnpl_id: pagoBnplId,

      numero_cuota: numeroCuota,

      monto: montoCuota,

      fecha_vencimiento: generarFechaVencimiento({
        preferencia,
        numeroCuota,
        fechaBase,
      }),

      estado: "pendiente",
    });
  }

  await Cuota.bulkCreate(cuotas, {
    transaction,
  });
};

const obtenerPlanPorCuotas = (numeroCuotas, cliente) => {
  if (numeroCuotas === 4) {
    return "4_quincenas";
  }

  if (numeroCuotas === 12) {
    return "12_meses";
  }

  if (numeroCuotas === 24) {
    return "24_meses";
  }

  if (numeroCuotas === 1) {
    return cliente.preferencia_bnpl === "pago_completo"
      ? "pago_completo"
      : "pagar_despues";
  }

  return null;
};

/* =====================================================
   CHECKOUT BNPL
===================================================== */

export const bnplCheckout = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      tiendaId,
      monto,

      dispositivo_id,
      session_id,

      latitud = null,
      longitud = null,
      precision_ubicacion = null,

      ciudad = null,
      region = null,
      pais = null,

      intentos_recientes = 0,
      compras_ultimos_10_minutos = 0,
      cambios_dispositivo_24h = 0,
      segundos_interaccion = 0,
    } = req.body;

    const clienteId = Number(req.user?.id);

    const tiendaIdNumerico = Number(tiendaId);

    const montoSolicitado = Number(monto);

    /* ==============================
         VALIDACIONES
      ============================== */

    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      await transaction.rollback();

      return res.status(401).json({
        success: false,

        message: "Cliente no autenticado.",
      });
    }

    if (!Number.isInteger(tiendaIdNumerico) || tiendaIdNumerico <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La tienda indicada no es válida.",
      });
    }

    if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El monto de la compra debe ser mayor que cero.",
      });
    }

    /* ==============================
         EVITAR DOBLE CLIC
      ============================== */

    if (session_id) {
      const haceDosMinutos = new Date(Date.now() - 2 * 60 * 1000);

      const evaluacionReciente = await EvaluacionDinamica.findOne({
        where: {
          cliente_id: clienteId,

          session_id: String(session_id),

          tipo_evaluacion: "solicitud_bnpl",

          fecha_evaluacion: {
            [db.Sequelize.Op.gte]: haceDosMinutos,
          },
        },

        order: [
          ["fecha_evaluacion", "DESC"],
          ["id", "DESC"],
        ],

        transaction,
      });

      if (evaluacionReciente) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,

          codigo: "SOLICITUD_DUPLICADA",

          message:
            "Esta compra ya está siendo procesada. No pulses el botón nuevamente.",

          evaluacion_id: evaluacionReciente.id,

          decision: evaluacionReciente.decision,
        });
      }
    }

    /* ==============================
         CLIENTE
      ============================== */

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

    if (!cliente.activo) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,

        message: "La cuenta del cliente está inactiva.",
      });
    }

    /* =================================================
         REGLA ABSOLUTA:
         LA COMPRA NO PUEDE SUPERAR EL CRÉDITO DISPONIBLE
      ================================================= */

    const creditoDisponible = Number(cliente.poder_credito || 0);

    if (montoSolicitado > creditoDisponible + 0.009) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "MONTO_SUPERA_CREDITO_ASIGNADO",

        message:
          `Esta compra supera tu crédito disponible. ` +
          `Tienes RD$ ${creditoDisponible.toFixed(
            2,
          )} disponibles y la compra es de ` +
          `RD$ ${montoSolicitado.toFixed(2)}.`,

        credito_disponible: creditoDisponible,

        monto_compra: montoSolicitado,

        diferencia: Number((montoSolicitado - creditoDisponible).toFixed(2)),
      });
    }

    /* ==============================
         TIENDA
      ============================== */

    const tienda = await Tienda.findByPk(tiendaIdNumerico, {
      transaction,
    });

    if (!tienda || tienda.estado !== "activa") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La tienda no está disponible.",
      });
    }

    const preferencia = cliente.preferencia_bnpl || "4_quincenas";

    const numeroCuotasSolicitadas = MAPA_CUOTAS[preferencia] || 4;

    /* =====================================================
   ANALIZAR CONTEXTO HISTÓRICO DE LA COMPRA
===================================================== */

    const analisisContexto = await analizarContextoCompra({
      clienteId: cliente.id,

      monto: montoSolicitado,

      dispositivoId: dispositivo_id || null,

      ip: obtenerIpCliente(req),

      userAgent: req.headers["user-agent"] || null,

      latitud,

      longitud,

      precisionUbicacion: precision_ubicacion,

      ciudad,

      region,

      pais,

      sessionId: session_id || null,

      transaction,
    });

    console.log("ANÁLISIS CONTEXTO COMPRA:", {
      cliente: cliente.id,

      monto: montoSolicitado,

      dispositivo_nuevo: analisisContexto.dispositivo_nuevo,

      ip_nueva: analisisContexto.ip_nueva,

      ubicacion_nueva: analisisContexto.ubicacion_nueva,

      ubicacion_inconsistente: analisisContexto.ubicacion_inconsistente,

      monto_fuera_patron: analisisContexto.monto_fuera_patron,

      promedio: analisisContexto.promedio_monto_historico,

      minimo: analisisContexto.monto_minimo_historico,

      maximo: analisisContexto.monto_maximo_historico,

      variacion: analisisContexto.porcentaje_variacion_monto,
    });

    /* ==============================
         MOTOR DINÁMICO
      ============================== */

    const resultadoMotor = await evaluarCompraDinamicamente({
      clienteId: cliente.id,

      ordenId: null,

      montoSolicitado,

      numeroCuotasSolicitadas,

      contexto: {
        /* ==============================
       IDENTIDAD DE LA OPERACIÓN
    ============================== */

        ip: analisisContexto.ip,

        ip_hash: analisisContexto.ip_hash,

        user_agent: analisisContexto.user_agent,

        dispositivo_id: analisisContexto.dispositivo_id,

        dispositivo_hash: analisisContexto.dispositivo_hash,

        session_id: analisisContexto.session_id,

        /* ==============================
       DETECCIÓN AUTOMÁTICA
    ============================== */

        dispositivo_nuevo: analisisContexto.dispositivo_nuevo,

        ip_nueva: analisisContexto.ip_nueva,

        ubicacion_nueva: analisisContexto.ubicacion_nueva,

        ubicacion_inconsistente: analisisContexto.ubicacion_inconsistente,

        /* ==============================
       UBICACIÓN
    ============================== */

        latitud: analisisContexto.latitud,

        longitud: analisisContexto.longitud,

        precision_ubicacion: analisisContexto.precision_ubicacion,

        ciudad: analisisContexto.ciudad,

        region: analisisContexto.region,

        pais: analisisContexto.pais,

        distancia_ubicacion_anterior_km:
          analisisContexto.distancia_ubicacion_anterior_km,

        /* ==============================
       COMPORTAMIENTO DE MONTO
    ============================== */

        monto_fuera_patron: analisisContexto.monto_fuera_patron,

        promedio_monto_historico: analisisContexto.promedio_monto_historico,

        monto_minimo_historico: analisisContexto.monto_minimo_historico,

        monto_maximo_historico: analisisContexto.monto_maximo_historico,

        cantidad_compras_historial: analisisContexto.cantidad_compras_historial,

        porcentaje_variacion_monto: analisisContexto.porcentaje_variacion_monto,

        factor_promedio: analisisContexto.factor_promedio,

        factor_maximo: analisisContexto.factor_maximo,

        /* ==============================
       VELOCIDAD
    ============================== */

        intentos_recientes: Number(intentos_recientes) || 0,

        compras_ultimos_10_minutos: Number(compras_ultimos_10_minutos) || 0,

        cambios_dispositivo_24h: Number(cambios_dispositivo_24h) || 0,

        segundos_interaccion: Number(segundos_interaccion) || 0,

        fecha_transaccion: new Date(),
      },

      transaction,
    });

    const resultado = resultadoMotor.resultado;

    /* =====================================================
   REGISTRAR CONTEXTO DE ESTA EVALUACIÓN
===================================================== */

    let estadoContexto = "evaluada";

    if (resultado.decision === DECISIONES.BLOQUEO_FRAUDE) {
      estadoContexto = "bloqueada";
    } else if (resultado.decision === DECISIONES.REVISION_MANUAL) {
      estadoContexto = "revision_manual";
    } else if (resultado.decision === DECISIONES.RECHAZO_CREDITICIO) {
      estadoContexto = "rechazada";
    }

    await registrarContextoCompra({
      analisis: analisisContexto,

      evaluacionId: resultadoMotor.evaluacion_id,

      ordenId: null,

      decision: resultado.decision,

      estadoOperacion: estadoContexto,

      /*
       * Todavía no la usamos para aprender.
       * Primero debe convertirse realmente
       * en una compra formalizada.
       */
      esReferenciaComportamiento: false,

      transaction,
    });

    /* ==============================
         FRAUDE
      ============================== */

    if (resultado.decision === DECISIONES.BLOQUEO_FRAUDE) {
      await transaction.commit();

      return res.status(403).json({
        success: false,

        codigo: "OPERACION_BLOQUEADA_POR_RIESGO",

        message:
          "La compra fue bloqueada preventivamente por señales de seguridad.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        resultado,
      });
    }

    /* ==============================
         RECHAZO
      ============================== */

    if (resultado.decision === DECISIONES.RECHAZO_CREDITICIO) {
      const causasRechazo = (resultadoMotor.senales || [])
        .filter((senal) => senal.activada && Number(senal.impacto) < 0)
        .sort((a, b) => Number(a.impacto) - Number(b.impacto))
        .slice(0, 4)
        .map((senal) => ({
          codigo: senal.codigo,

          nombre: senal.nombre,

          categoria: senal.categoria,

          severidad: senal.severidad,

          impacto: Number(senal.impacto),

          descripcion: senal.descripcion,
        }));

      await transaction.commit();

      return res.status(403).json({
        success: false,

        codigo: "FINANCIAMIENTO_RECHAZADO",

        message: resultado.motivo,

        evaluacion_id: resultadoMotor.evaluacion_id,

        causa_principal: causasRechazo[0] || null,

        causas: causasRechazo,

        resultado,
      });
    }

    /* ==============================
         VERIFICACIÓN
      ============================== */

    if (resultado.decision === DECISIONES.VERIFICACION_ADICIONAL) {
      await transaction.commit();

      return res.status(428).json({
        success: false,

        codigo: "VERIFICACION_ADICIONAL_REQUERIDA",

        message: resultado.motivo,

        evaluacion_id: resultadoMotor.evaluacion_id,

        resultado,
      });
    }

    /* ==============================
         REVISIÓN MANUAL
      ============================== */

    if (resultado.decision === DECISIONES.REVISION_MANUAL) {
      await transaction.commit();

      return res.status(202).json({
        success: false,

        codigo: "REVISION_MANUAL_REQUERIDA",

        message: "La compra fue enviada a revisión manual.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        resultado,
      });
    }

    /* =================================================
         CORREGIR APROBACIÓN CON ENGANCHE 0 %
      ================================================= */

    const porcentajeEnganche = Number(resultado.porcentaje_enganche || 0);

    const montoMotor = Number(resultado.monto_financiable || montoSolicitado);

    const cuotasPermitidas = Number(
      resultado.numero_cuotas_permitidas || numeroCuotasSolicitadas,
    );

    const mismoMonto = Math.abs(montoMotor - montoSolicitado) <= 0.01;

    const mismasCuotas = cuotasPermitidas === numeroCuotasSolicitadas;

    if (
      resultado.decision === DECISIONES.APROBACION_ENGANCHE_MAYOR &&
      porcentajeEnganche <= 0 &&
      mismoMonto &&
      mismasCuotas
    ) {
      resultado.decision = DECISIONES.APROBACION_NORMAL;

      resultado.motivo = "La compra fue aprobada sin enganche.";

      resultado.explicacion =
        "El nivel de riesgo actual permite financiar el monto completo utilizando el crédito disponible.";
    }

    /* =================================================
         REDUCCIÓN DE MONTO:
         NO CONVERTIR LA DIFERENCIA EN ENGANCHE
      ================================================= */

    if (
      resultado.decision === DECISIONES.MONTO_REDUCIDO &&
      montoMotor < montoSolicitado - 0.009
    ) {
      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "REDUCIR_MONTO_COMPRA",

        message:
          `El motor recomienda reducir el monto de la compra a ` +
          `RD$ ${montoMotor.toFixed(2)} o menos.`,

        evaluacion_id: resultadoMotor.evaluacion_id,

        monto_original: montoSolicitado,

        monto_maximo_permitido: montoMotor,

        requiere_modificar_compra: true,

        resultado,
      });
    }

    /* =================================================
         PROPUESTAS AJUSTADAS
      ================================================= */

    const decisionesAjustadas = [
      DECISIONES.APROBACION_ENGANCHE_MAYOR,

      DECISIONES.CUOTAS_REDUCIDAS,
    ];

    if (decisionesAjustadas.includes(resultado.decision)) {
      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "CONDICIONES_AJUSTADAS_REQUIEREN_ACEPTACION",

        message:
          "El motor aprobó condiciones diferentes. Debes aceptar la nueva propuesta para continuar.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        propuesta: {
          decision: resultado.decision,

          monto_original: montoSolicitado,

          monto_financiable: montoMotor,

          porcentaje_enganche: porcentajeEnganche,

          numero_cuotas_solicitadas: numeroCuotasSolicitadas,

          numero_cuotas_permitidas: cuotasPermitidas,

          motivo: resultado.motivo,

          explicacion: resultado.explicacion,
        },
      });
    }

    /* =================================================
         APROBACIÓN NORMAL CON ENGANCHE REAL
      ================================================= */

    if (
      resultado.decision === DECISIONES.APROBACION_NORMAL &&
      porcentajeEnganche > 0
    ) {
      const montoEnganche = Number(
        (montoSolicitado * (porcentajeEnganche / 100)).toFixed(2),
      );

      const montoFinanciable = Number(
        (montoSolicitado - montoEnganche).toFixed(2),
      );

      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "ENGANCHE_REQUIERE_ACEPTACION",

        message: "La compra requiere un enganche antes de continuar.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        propuesta: {
          decision: resultado.decision,

          monto_original: montoSolicitado,

          monto_financiable: montoFinanciable,

          monto_enganche: montoEnganche,

          porcentaje_enganche: porcentajeEnganche,

          numero_cuotas_solicitadas: numeroCuotasSolicitadas,

          numero_cuotas_permitidas: cuotasPermitidas,

          motivo: resultado.motivo,

          explicacion: resultado.explicacion,
        },
      });
    }

    /* ==============================
         SOLO APROBACIÓN NORMAL
      ============================== */

    if (resultado.decision !== DECISIONES.APROBACION_NORMAL) {
      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "DECISION_NO_PROCESABLE_AUTOMATICAMENTE",

        message: "La decisión del motor requiere un proceso adicional.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        resultado,
      });
    }

    const montoFinanciable = Number(
      resultado.monto_financiable || montoSolicitado,
    );

    if (montoFinanciable > creditoDisponible + 0.009) {
      await transaction.commit();

      return res.status(400).json({
        success: false,

        codigo: "CREDITO_DISPONIBLE_INSUFICIENTE",

        message: `Crédito insuficiente. Tienes RD$ ${creditoDisponible.toFixed(
          2,
        )} disponibles.`,
      });
    }

    if (cuotasPermitidas !== numeroCuotasSolicitadas) {
      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "CUOTAS_AJUSTADAS_REQUIEREN_ACEPTACION",

        message:
          "El número de cuotas fue modificado por el motor y requiere aceptación.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        propuesta: {
          decision: DECISIONES.CUOTAS_REDUCIDAS,

          monto_original: montoSolicitado,

          monto_financiable: montoFinanciable,

          porcentaje_enganche: 0,

          numero_cuotas_solicitadas: numeroCuotasSolicitadas,

          numero_cuotas_permitidas: cuotasPermitidas,

          motivo: resultado.motivo,

          explicacion: resultado.explicacion,
        },
      });
    }

    const planIdReal = PLAN_IDS[preferencia];

    if (!planIdReal) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La preferencia BNPL seleccionada no tiene un plan válido.",
      });
    }

    /* ==============================
         CREAR ORDEN
      ============================== */

    const orden = await Orden.create(
      {
        cliente_id: cliente.id,

        tienda_id: tienda.id,

        total: montoSolicitado,

        estado: "pendiente",

        fecha: new Date(),
      },
      {
        transaction,
      },
    );

    await EvaluacionDinamica.update(
      {
        orden_id: orden.id,
      },
      {
        where: {
          id: resultadoMotor.evaluacion_id,
        },

        transaction,
      },
    );

    await AlertaRiesgo.update(
      {
        orden_id: orden.id,
      },
      {
        where: {
          evaluacion_id: resultadoMotor.evaluacion_id,

          orden_id: null,
        },

        transaction,
      },
    );

    const pagoBnpl = await PagoBNPL.create(
      {
        orden_id: orden.id,

        plan_pago_id: planIdReal,

        monto_total: montoFinanciable,

        monto_pendiente: montoFinanciable,

        fecha_inicio: new Date(),

        estado: "activo",
      },
      {
        transaction,
      },
    );

    await crearCuotasFinanciamiento({
      pagoBnplId: pagoBnpl.id,

      montoTotal: montoFinanciable,

      numeroCuotas: cuotasPermitidas,

      preferencia,

      transaction,
    });

    const lineaActualizada = await sincronizarLineaCreditoCliente(cliente.id, {
      transaction,
    });

    await recalcularPerfilRiesgoCliente(cliente.id, {
      transaction,
    });

    await Notificacion.create(
      {
        rol_destino: "admin",

        usuario_id: null,

        tipo: "compra",

        titulo: "Nueva venta BNPL",

        mensaje:
          `Cliente ${cliente.nombre} compró ` +
          `RD$ ${montoSolicitado.toFixed(2)} en ${tienda.nombre}.`,

        url: "/admin/clientes",

        is_new: true,

        meta: JSON.stringify({
          orden_id: orden.id,

          evaluacion_id: resultadoMotor.evaluacion_id,

          decision: resultado.decision,
        }),
      },
      {
        transaction,
      },
    );

    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: cliente.id,

        tipo: "compra",

        titulo: "Compra aprobada",

        mensaje:
          `Compra en ${tienda.nombre} por RD$ ` +
          `${montoSolicitado.toFixed(2)}. Nuevo saldo disponible: RD$ ` +
          `${Number(lineaActualizada.credito_disponible).toFixed(2)}.`,

        url: "/cartera",

        is_new: true,

        meta: JSON.stringify({
          orden_id: orden.id,

          evaluacion_id: resultadoMotor.evaluacion_id,

          decision: resultado.decision,
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,

      message: "Compra aprobada y financiamiento creado correctamente.",

      orden_id: orden.id,

      pago_bnpl_id: pagoBnpl.id,

      evaluacion_id: resultadoMotor.evaluacion_id,

      decision: resultado.decision,

      condiciones: {
        monto_compra: montoSolicitado,

        monto_financiado: montoFinanciable,

        porcentaje_enganche: 0,

        numero_cuotas: cuotasPermitidas,

        preferencia,
      },

      nuevo_credito_disponible: lineaActualizada.credito_disponible,

      linea_credito: {
        limite_aprobado: lineaActualizada.limite_credito_aprobado,

        saldo_utilizado: lineaActualizada.saldo_credito_utilizado,

        disponible: lineaActualizada.credito_disponible,
      },
    });
  } catch (error) {
    console.error("Error BNPL Checkout:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(error.status || 500).json({
      success: false,

      codigo: error.codigo || "ERROR_CHECKOUT",

      message: error.message || "Error interno al procesar la compra.",
    });
  }
};

/* =====================================================
   COBRO SIMULADO DEL ENGANCHE
===================================================== */

const procesarCobroEnganche = async ({ metodoPago, monto, evaluacionId }) => {
  const montoNumerico = Number(monto);

  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    throw new Error("El monto del enganche no es válido.");
  }

  if (!metodoPago?.token_gateway) {
    const error = new Error(
      "El método de pago no está habilitado para realizar cobros.",
    );

    error.status = 400;

    error.codigo = "METODO_PAGO_SIN_TOKEN";

    throw error;
  }

  return {
    aprobado: true,

    referencia: `ENG-${evaluacionId}-${Date.now()}`,

    mensaje: "Cobro simulado aprobado correctamente.",
  };
};

/* =====================================================
   ACEPTAR PROPUESTA
===================================================== */

export const acceptRiskProposal = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { evaluacion_id, tienda_id, metodo_pago_id } = req.body;

    const clienteId = Number(req.user?.id);

    const evaluacionId = Number(evaluacion_id);

    const tiendaId = Number(tienda_id);

    const metodoPagoId = Number(metodo_pago_id);

    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      await transaction.rollback();

      return res.status(401).json({
        success: false,

        message: "Cliente no autenticado.",
      });
    }

    if (!Number.isInteger(evaluacionId) || evaluacionId <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La evaluación indicada no es válida.",
      });
    }

    if (!Number.isInteger(tiendaId) || tiendaId <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La tienda indicada no es válida.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        cliente_id: clienteId,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!evaluacion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message: "No se encontró la propuesta.",
      });
    }

    if (evaluacion.orden_id) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        codigo: "PROPUESTA_YA_UTILIZADA",

        message: "Esta propuesta ya fue aceptada anteriormente.",
      });
    }

    const decisionesAceptables = [
      DECISIONES.APROBACION_NORMAL,

      DECISIONES.APROBACION_ENGANCHE_MAYOR,

      DECISIONES.CUOTAS_REDUCIDAS,
    ];

    if (!decisionesAceptables.includes(evaluacion.decision)) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        codigo: "PROPUESTA_NO_ACEPTABLE",

        message: "La evaluación no contiene una propuesta que pueda aceptarse.",
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

    if (!cliente.activo) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,

        message: "La cuenta está inactiva.",
      });
    }

    const tienda = await Tienda.findByPk(tiendaId, {
      transaction,
    });

    if (!tienda || tienda.estado !== "activa") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La tienda no está disponible.",
      });
    }

    const montoOriginal = Number(
      evaluacion.monto_original || evaluacion.monto_solicitado,
    );

    const montoMaximoMotor = Number(evaluacion.monto_financiable);

    const porcentajeEnganche = Number(evaluacion.porcentaje_enganche || 0);

    const numeroCuotas = Number(evaluacion.numero_cuotas_permitidas);

    if (!Number.isFinite(montoOriginal) || montoOriginal <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El monto original no es válido.",
      });
    }

    const creditoDisponible = Number(cliente.poder_credito || 0);

    /* =================================================
         SEGUNDA PROTECCIÓN:
         TAMPOCO UNA PROPUESTA VIEJA PUEDE SUPERAR CRÉDITO
      ================================================= */

    if (montoOriginal > creditoDisponible + 0.009) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "MONTO_SUPERA_CREDITO_ASIGNADO",

        message:
          `No puedes aceptar esta propuesta porque la compra de ` +
          `RD$ ${montoOriginal.toFixed(2)} supera tu crédito disponible de ` +
          `RD$ ${creditoDisponible.toFixed(2)}.`,
      });
    }

    if (!Number.isFinite(montoMaximoMotor) || montoMaximoMotor <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El monto financiable no es válido.",
      });
    }

    if (
      !Number.isFinite(porcentajeEnganche) ||
      porcentajeEnganche < 0 ||
      porcentajeEnganche > 100
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El porcentaje de enganche no es válido.",
      });
    }

    if (!Number.isInteger(numeroCuotas) || numeroCuotas <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El número de cuotas no es válido.",
      });
    }

    const financiablePorEnganche = Number(
      (montoOriginal * (1 - porcentajeEnganche / 100)).toFixed(2),
    );

    /* =================================================
         IMPORTANTE:
         SI EL MOTOR REDUJO EL MONTO MÁS DE LO EXPLICADO
         POR EL ENGANCHE, NO CONVERTIMOS ESA DIFERENCIA
         EN UN ENGANCHE OCULTO.
      ================================================= */

    if (montoMaximoMotor < financiablePorEnganche - 0.009) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        codigo: "REDUCIR_MONTO_COMPRA",

        message:
          `Debes reducir realmente el total de la compra a ` +
          `RD$ ${montoMaximoMotor.toFixed(2)} o menos antes de continuar.`,

        monto_original: montoOriginal,

        monto_maximo_permitido: montoMaximoMotor,

        requiere_modificar_compra: true,
      });
    }

    const montoFinanciable = financiablePorEnganche;

    const montoEnganche = Number((montoOriginal - montoFinanciable).toFixed(2));

    const requiereEnganche = montoEnganche > 0.009;

    if (montoFinanciable > creditoDisponible + 0.009) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "CREDITO_DISPONIBLE_INSUFICIENTE",

        message:
          `Crédito insuficiente. Tienes RD$ ` +
          `${creditoDisponible.toFixed(2)} disponibles.`,
      });
    }

    let metodoPago = null;

    let resultadoCobro = null;

    let pagoEnganche = null;

    /* ==============================
         MÉTODO SOLO SI HAY ENGANCHE
      ============================== */

    if (requiereEnganche) {
      if (!Number.isInteger(metodoPagoId) || metodoPagoId <= 0) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,

          codigo: "METODO_PAGO_REQUERIDO",

          message:
            "Debes seleccionar un método de pago para pagar el enganche.",
        });
      }

      const pagoExistente = await PagoEnganche.findOne({
        where: {
          evaluacion_id: evaluacion.id,
        },

        transaction,

        lock: transaction.LOCK.UPDATE,
      });

      if (pagoExistente) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,

          codigo: "ENGANCHE_YA_PROCESADO",

          message: "Ya existe un pago de enganche para esta evaluación.",
        });
      }

      metodoPago = await MetodoPago.findOne({
        where: {
          id: metodoPagoId,

          cliente_id: clienteId,
        },

        transaction,

        lock: transaction.LOCK.UPDATE,
      });

      if (!metodoPago) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,

          codigo: "METODO_PAGO_INVALIDO",

          message:
            "El método de pago seleccionado no existe o no pertenece a tu cuenta.",
        });
      }

      if (!metodoPago.token_gateway) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,

          codigo: "METODO_PAGO_SIN_TOKEN",

          message:
            "El método seleccionado no está habilitado para realizar cobros.",
        });
      }
    }

    const preferenciaAutorizada = obtenerPlanPorCuotas(numeroCuotas, cliente);

    if (!preferenciaAutorizada) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "CUOTAS_NO_COMPATIBLES",

        message:
          "El número de cuotas aprobado no corresponde a un plan disponible.",
      });
    }

    const planIdReal = PLAN_IDS[preferenciaAutorizada];

    const orden = await Orden.create(
      {
        cliente_id: cliente.id,

        tienda_id: tienda.id,

        total: montoOriginal,

        estado: "pendiente",

        fecha: new Date(),
      },
      {
        transaction,
      },
    );

    if (requiereEnganche) {
      resultadoCobro = await procesarCobroEnganche({
        metodoPago,

        monto: montoEnganche,

        evaluacionId: evaluacion.id,
      });

      if (!resultadoCobro.aprobado) {
        await transaction.rollback();

        return res.status(402).json({
          success: false,

          codigo: "PAGO_ENGANCHE_RECHAZADO",

          message: resultadoCobro.mensaje || "El enganche fue rechazado.",
        });
      }

      pagoEnganche = await PagoEnganche.create(
        {
          cliente_id: cliente.id,

          orden_id: orden.id,

          evaluacion_id: evaluacion.id,

          metodo_pago_id: metodoPago.id,

          monto: montoEnganche,

          estado: "aprobado",

          referencia_gateway: resultadoCobro.referencia,

          mensaje_gateway: resultadoCobro.mensaje,

          fecha_pago: new Date(),
        },
        {
          transaction,
        },
      );
    }

    evaluacion.orden_id = orden.id;

    await evaluacion.save({
      transaction,
    });

    await AlertaRiesgo.update(
      {
        orden_id: orden.id,
      },
      {
        where: {
          evaluacion_id: evaluacion.id,

          orden_id: null,
        },

        transaction,
      },
    );

    const pagoBnpl = await PagoBNPL.create(
      {
        orden_id: orden.id,

        plan_pago_id: planIdReal,

        monto_total: montoFinanciable,

        monto_pendiente: montoFinanciable,

        fecha_inicio: new Date(),

        estado: "activo",
      },
      {
        transaction,
      },
    );

    await crearCuotasFinanciamiento({
      pagoBnplId: pagoBnpl.id,

      montoTotal: montoFinanciable,

      numeroCuotas,

      preferencia: preferenciaAutorizada,

      transaction,
    });

    const lineaActualizada = await sincronizarLineaCreditoCliente(cliente.id, {
      transaction,
    });

    await recalcularPerfilRiesgoCliente(cliente.id, {
      transaction,
    });

    const marcaMetodo = requiereEnganche
      ? metodoPago?.marca || metodoPago?.tipo || "Método de pago"
      : null;

    const ultimosDigitos =
      requiereEnganche && metodoPago?.ultimos_cuatro_digitos
        ? ` •••• ${metodoPago.ultimos_cuatro_digitos}`
        : "";

    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: cliente.id,

        tipo: "compra",

        titulo: "Propuesta BNPL aceptada",

        mensaje: requiereEnganche
          ? `Pagaste un enganche de RD$ ${montoEnganche.toFixed(
              2,
            )} con ${marcaMetodo}${ultimosDigitos}. ` +
            `El monto financiado es RD$ ${montoFinanciable.toFixed(2)}.`
          : `Aceptaste la propuesta sin enganche. ` +
            `Se financiaron RD$ ${montoFinanciable.toFixed(2)}.`,

        url: "/cartera",

        is_new: true,

        meta: JSON.stringify({
          orden_id: orden.id,

          pago_bnpl_id: pagoBnpl.id,

          pago_enganche_id: pagoEnganche?.id || null,

          evaluacion_id: evaluacion.id,

          monto_original: montoOriginal,

          monto_financiable: montoFinanciable,

          porcentaje_enganche: porcentajeEnganche,

          monto_enganche: montoEnganche,
        }),
      },
      {
        transaction,
      },
    );

    await Notificacion.create(
      {
        rol_destino: "admin",

        usuario_id: null,

        tipo: "compra",

        titulo: "Propuesta BNPL aceptada",

        mensaje: requiereEnganche
          ? `${cliente.nombre} pagó RD$ ${montoEnganche.toFixed(
              2,
            )} de enganche y financió RD$ ${montoFinanciable.toFixed(2)}.`
          : `${cliente.nombre} financió RD$ ${montoFinanciable.toFixed(
              2,
            )} sin enganche.`,

        url: "/admin/clientes",

        is_new: true,

        meta: JSON.stringify({
          cliente_id: cliente.id,

          orden_id: orden.id,

          evaluacion_id: evaluacion.id,
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,

      message: requiereEnganche
        ? "El enganche fue pagado y el financiamiento fue creado correctamente."
        : "La propuesta fue aceptada y el financiamiento fue creado sin enganche.",

      orden_id: orden.id,

      pago_bnpl_id: pagoBnpl.id,

      evaluacion_id: evaluacion.id,

      pago_enganche: pagoEnganche
        ? {
            id: pagoEnganche.id,

            monto: montoEnganche,

            estado: pagoEnganche.estado,

            referencia: resultadoCobro?.referencia,
          }
        : null,

      condiciones: {
        monto_original: montoOriginal,

        monto_financiado: montoFinanciable,

        porcentaje_enganche: porcentajeEnganche,

        monto_enganche: montoEnganche,

        numero_cuotas: numeroCuotas,

        preferencia: preferenciaAutorizada,
      },

      nuevo_credito_disponible: lineaActualizada.credito_disponible,

      linea_credito: {
        limite_aprobado: lineaActualizada.limite_credito_aprobado,

        saldo_utilizado: lineaActualizada.saldo_credito_utilizado,

        disponible: lineaActualizada.credito_disponible,
      },
    });
  } catch (error) {
    console.error("Error acceptRiskProposal:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(error.status || 500).json({
      success: false,

      codigo: error.codigo || "ERROR_ACEPTAR_PROPUESTA",

      message: error.message || "No se pudo aceptar la propuesta.",
    });
  }
};

/* =====================================================
   SOLICITAR OPCIÓN SIN ENGANCHE
===================================================== */

export const requestNoDownPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { evaluacion_id, tienda_id } = req.body;

    const clienteId = Number(req.user?.id);

    const evaluacionId = Number(evaluacion_id);

    const tiendaId = Number(tienda_id);

    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      await transaction.rollback();

      return res.status(401).json({
        success: false,

        message: "Cliente no autenticado.",
      });
    }

    const evaluacion = await EvaluacionDinamica.findOne({
      where: {
        id: evaluacionId,

        cliente_id: clienteId,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!evaluacion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        codigo: "EVALUACION_NO_ENCONTRADA",

        message: "No se encontró la evaluación.",
      });
    }

    if (evaluacion.orden_id) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        codigo: "PROPUESTA_YA_UTILIZADA",

        message: "Esta propuesta ya fue utilizada.",
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

    const tienda = await Tienda.findByPk(tiendaId, {
      transaction,
    });

    if (!tienda || tienda.estado !== "activa") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La tienda no está disponible.",
      });
    }

    const montoOriginal = Number(
      evaluacion.monto_original || evaluacion.monto_solicitado || 0,
    );

    const creditoDisponible = Number(cliente.poder_credito || 0);

    /* =================================================
         OPCIÓN SIN ENGANCHE TAMPOCO PUEDE SUPERAR CRÉDITO
      ================================================= */

    if (montoOriginal > creditoDisponible + 0.009) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        codigo: "MONTO_SUPERA_CREDITO_ASIGNADO",

        message:
          `No puedes financiar esta compra porque supera tu crédito disponible de ` +
          `RD$ ${creditoDisponible.toFixed(2)}.`,

        monto_original: montoOriginal,

        credito_disponible: creditoDisponible,
      });
    }

    const puntajeCrediticio = Number(
      evaluacion.puntaje_crediticio_resultante ??
        evaluacion.puntaje_crediticio ??
        0,
    );

    const puntajeFraude = Number(evaluacion.puntaje_fraude || 0);

    const porcentajeActual = Number(evaluacion.porcentaje_enganche || 0);

    const cuotasActuales = Number(evaluacion.numero_cuotas_permitidas || 4);

    /* ==============================
         FRAUDE
      ============================== */

    if (puntajeFraude >= 60) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,

        codigo: "SIN_ENGANCHE_NO_DISPONIBLE",

        message:
          "Por seguridad, esta operación no puede realizarse sin enganche.",
      });
    }

    /* ==============================
         RIESGO CRÍTICO
      ============================== */

    if (puntajeCrediticio < 30) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,

        codigo: "SIN_ENGANCHE_NO_DISPONIBLE",

        message: "Tu nivel de riesgo actual no permite eliminar el enganche.",
      });
    }

    /* =================================================
         FINANCIAR 100 % SIN ENGANCHE
      ================================================= */

    if (puntajeCrediticio >= 55) {
      let nuevasCuotas = cuotasActuales;

      /*
       * Riesgo medio:
       * si pide 12 o 24 cuotas,
       * intentamos limitarlo a 4.
       */
      if (puntajeCrediticio < 65) {
        nuevasCuotas = Math.min(nuevasCuotas, 4);
      }

      await evaluacion.update(
        {
          decision:
            nuevasCuotas < cuotasActuales
              ? DECISIONES.CUOTAS_REDUCIDAS
              : DECISIONES.APROBACION_NORMAL,

          monto_financiable: montoOriginal,

          porcentaje_enganche: 0,

          numero_cuotas_permitidas: nuevasCuotas,

          motivo_principal: "Alternativa sin enganche aprobada.",

          explicacion:
            nuevasCuotas < cuotasActuales
              ? "El monto completo puede financiarse sin enganche, pero con menos cuotas."
              : "El monto completo puede financiarse sin enganche utilizando el crédito disponible.",
        },
        {
          transaction,
        },
      );

      await transaction.commit();

      return res.status(200).json({
        success: true,

        codigo: "ALTERNATIVA_SIN_ENGANCHE_APROBADA",

        message:
          nuevasCuotas < cuotasActuales
            ? "Puedes financiar el 100 % sin enganche, pero con menos cuotas."
            : "Puedes financiar el 100 % de la compra sin enganche.",

        evaluacion_id: evaluacion.id,

        propuesta: {
          decision:
            nuevasCuotas < cuotasActuales
              ? DECISIONES.CUOTAS_REDUCIDAS
              : DECISIONES.APROBACION_NORMAL,

          monto_original: montoOriginal,

          monto_financiable: montoOriginal,

          porcentaje_enganche: 0,

          numero_cuotas_solicitadas: cuotasActuales,

          numero_cuotas_permitidas: nuevasCuotas,

          motivo: "Alternativa sin enganche aprobada.",

          explicacion:
            nuevasCuotas < cuotasActuales
              ? "El financiamiento completo fue autorizado sin enganche reduciendo las cuotas."
              : "El financiamiento completo fue autorizado sin pago inicial.",
        },
      });
    }

    /* =================================================
         RIESGO 30-54:
         NO ELIMINAMOS AUTOMÁTICAMENTE EL ENGANCHE
      ================================================= */

    await transaction.rollback();

    return res.status(403).json({
      success: false,

      codigo: "ALTERNATIVA_SIN_ENGANCHE_NO_DISPONIBLE",

      message:
        porcentajeActual > 0
          ? "Según tu perfil actual, el enganche es necesario para aprobar esta operación."
          : "No existe una alternativa sin enganche para esta compra.",
    });
  } catch (error) {
    console.error("Error requestNoDownPayment:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(error.status || 500).json({
      success: false,

      codigo: error.codigo || "ERROR_ALTERNATIVA_SIN_ENGANCHE",

      message:
        error.message || "No se pudo evaluar la alternativa sin enganche.",
    });
  }
};

/* =====================================================
   PAGAR CUOTA
===================================================== */

export const payInstallment = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const { cuota_id, metodo_pago_id } = req.body;

    const userId = req.user.id;

    if (!metodo_pago_id) {
      await t.rollback();

      return res.status(400).json({
        message: "Debes seleccionar un método de pago.",
      });
    }

    const metodo = await MetodoPago.findOne({
      where: {
        id: metodo_pago_id,

        cliente_id: userId,
      },

      transaction: t,
    });

    if (!metodo) {
      await t.rollback();

      return res.status(400).json({
        message: "El método de pago no es válido o no te pertenece.",
      });
    }

    const cuota = await Cuota.findByPk(cuota_id, {
      include: [
        {
          model: PagoBNPL,

          as: "pago_bnpl",

          include: [
            {
              model: Orden,

              as: "orden",

              include: [
                {
                  model: Cliente,

                  as: "cliente",
                },
                {
                  model: Tienda,

                  as: "tienda",
                },
              ],
            },
          ],
        },
      ],

      transaction: t,
    });

    if (!cuota) {
      await t.rollback();

      return res.status(404).json({
        message: "Cuota no encontrada.",
      });
    }

    if (cuota.pago_bnpl.orden.cliente.id !== userId) {
      await t.rollback();

      return res.status(403).json({
        message: "No tienes permiso para pagar esta cuota.",
      });
    }

    if (cuota.estado === "pagado") {
      await t.rollback();

      return res.status(400).json({
        message: "Esta cuota ya está pagada.",
      });
    }

    cuota.estado = "pagado";

    cuota.fecha_pago = new Date();

    await cuota.save({
      transaction: t,
    });

    const pagoPadre = cuota.pago_bnpl;

    const montoPagado = Number(cuota.monto);

    pagoPadre.monto_pendiente = Math.max(
      Number((Number(pagoPadre.monto_pendiente) - montoPagado).toFixed(2)),
      0,
    );

    const cliente = cuota.pago_bnpl.orden.cliente;

    const nombreTienda = cuota.pago_bnpl.orden.tienda.nombre;

    let mensajeExtra = "";

    if (Number(pagoPadre.monto_pendiente) <= 0.05) {
      pagoPadre.monto_pendiente = 0;

      pagoPadre.estado = "pagado";

      const orden = pagoPadre.orden;

      orden.estado = "completada";

      await orden.save({
        transaction: t,
      });

      const historialCuotas = await Cuota.findAll({
        where: {
          pago_bnpl_id: pagoPadre.id,
        },

        order: [["numero_cuota", "ASC"]],

        transaction: t,
      });

      const cuotasTotales = historialCuotas.length;

      let cuotasATiempo = 0;

      let cuotasTarde = 0;

      historialCuotas.forEach((item) => {
        if (!item.fecha_pago) {
          return;
        }

        const fechaPago = new Date(item.fecha_pago);

        const fechaVencimiento = new Date(item.fecha_vencimiento);

        fechaPago.setHours(0, 0, 0, 0);

        fechaVencimiento.setHours(0, 0, 0, 0);

        if (fechaPago <= fechaVencimiento) {
          cuotasATiempo += 1;
        } else {
          cuotasTarde += 1;
        }
      });

      const porcentajePuntualidad =
        cuotasTotales > 0
          ? Number(((cuotasATiempo / cuotasTotales) * 100).toFixed(2))
          : 0;

      const esElegible =
        cuotasTotales > 0 &&
        cuotasATiempo === cuotasTotales &&
        cuotasTarde === 0;

      await EvaluacionCrediticia.findOrCreate({
        where: {
          pago_bnpl_id: pagoPadre.id,
        },

        defaults: {
          cliente_id: cliente.id,

          pago_bnpl_id: pagoPadre.id,

          cuotas_totales: cuotasTotales,

          cuotas_pagadas_a_tiempo: cuotasATiempo,

          cuotas_pagadas_tarde: cuotasTarde,

          porcentaje_puntualidad: porcentajePuntualidad,

          es_elegible: esElegible,

          observaciones: esElegible
            ? "Financiamiento completado con todas las cuotas pagadas a tiempo."
            : `Financiamiento completado con ${cuotasTarde} cuota(s) pagadas tarde.`,

          fecha_evaluacion: new Date(),
        },

        transaction: t,
      });

      mensajeExtra = esElegible
        ? " Completaste este financiamiento sin atrasos."
        : ` Completaste el financiamiento con ${porcentajePuntualidad}% de puntualidad.`;
    }

    await pagoPadre.save({
      transaction: t,
    });

    const lineaActualizada = await sincronizarLineaCreditoCliente(cliente.id, {
      transaction: t,
    });

    await recalcularPerfilRiesgoCliente(cliente.id, {
      transaction: t,
    });

    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: cliente.id,

        tipo: "pago",

        titulo:
          pagoPadre.estado === "pagado"
            ? "Financiamiento completado"
            : "Pago exitoso",

        mensaje:
          `Pagaste RD$ ${montoPagado.toFixed(2)} a ${nombreTienda} usando ` +
          `${metodo.marca || metodo.tipo} •••• ` +
          `${metodo.ultimos_cuatro_digitos || ""}. ` +
          `Crédito disponible actualizado: RD$ ${Number(
            lineaActualizada.credito_disponible,
          ).toFixed(2)}.${mensajeExtra}`,

        url: "/cartera",

        is_new: true,

        meta: JSON.stringify({
          orden_id: pagoPadre.orden_id,
        }),
      },
      {
        transaction: t,
      },
    );

    await t.commit();

    return res.json({
      success: true,

      message: "Pago realizado correctamente.",

      nuevo_credito: lineaActualizada.credito_disponible,

      linea_credito: {
        limite_aprobado: lineaActualizada.limite_credito_aprobado,

        saldo_utilizado: lineaActualizada.saldo_credito_utilizado,

        disponible: lineaActualizada.credito_disponible,
      },
    });
  } catch (error) {
    console.error("Error payInstallment:", error);

    if (!t.finished) {
      await t.rollback();
    }

    return res.status(500).json({
      success: false,

      message: error.message || "Error procesando el pago.",
    });
  }
};
