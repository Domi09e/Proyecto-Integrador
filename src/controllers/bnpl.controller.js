import db from "../models/index.js";
import {
  evaluarCompraDinamicamente,
  DECISIONES,
} from "../services/dynamic-risk-engine.service.js";
import { recalcularPerfilRiesgoCliente } from "../services/risk-profile.service.js";

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

// Mapa de IDs reales según tu base de datos
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

/* ==========================================
   CHECKOUT BNPL (CREAR DEUDA CON CÁLCULO EXACTO)
========================================== */
/* ==========================================
   CHECKOUT BNPL CON MOTOR DINÁMICO
========================================== */

export const bnplCheckout = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      tiendaId,
      monto,

      dispositivo_id,
      session_id,

      dispositivo_nuevo = false,
      ip_nueva = false,
      ubicacion_nueva = false,
      ubicacion_inconsistente = false,

      intentos_recientes = 0,
      compras_ultimos_10_minutos = 0,
      cambios_dispositivo_24h = 0,
      segundos_interaccion = 0,
    } = req.body;

    const clienteId = req.user?.id;

    if (!clienteId) {
      await transaction.rollback();

      return res.status(401).json({
        message: "Cliente no autenticado.",
      });
    }

    const tiendaIdNumerico = Number(tiendaId);

    const montoSolicitado = Number(monto);

    if (!Number.isInteger(tiendaIdNumerico) || tiendaIdNumerico <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: "La tienda indicada no es válida.",
      });
    }

    if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: "El monto de la compra debe ser mayor que cero.",
      });
    }

    /*
     * Evitar que la misma sesión procese varias veces
     * el checkout por clics repetidos.
     */
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

    /*
     * Bloqueamos la fila del cliente mientras
     * se procesa la evaluación y la compra.
     */
    const cliente = await Cliente.findByPk(clienteId, {
      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!cliente) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Cliente no encontrado.",
      });
    }

    if (!cliente.activo) {
      await transaction.rollback();

      return res.status(403).json({
        message: "La cuenta del cliente está inactiva.",
      });
    }

    const tienda = await Tienda.findByPk(tiendaIdNumerico, {
      transaction,
    });

    if (!tienda || tienda.estado !== "activa") {
      await transaction.rollback();

      return res.status(400).json({
        message: "La tienda no está disponible.",
      });
    }

    const preferencia = cliente.preferencia_bnpl || "4_quincenas";

    const numeroCuotasSolicitadas = MAPA_CUOTAS[preferencia] || 4;

    /*
     * Ejecutar el motor antes de crear
     * la orden y el financiamiento.
     */
    const resultadoMotor = await evaluarCompraDinamicamente({
      clienteId: cliente.id,

      ordenId: null,

      montoSolicitado,

      numeroCuotasSolicitadas,

      contexto: {
        ip: obtenerIpCliente(req),

        user_agent: req.headers["user-agent"] || null,

        dispositivo_id: dispositivo_id || null,

        session_id: session_id || null,

        dispositivo_nuevo,

        ip_nueva,

        ubicacion_nueva,

        ubicacion_inconsistente,

        intentos_recientes: Number(intentos_recientes) || 0,

        compras_ultimos_10_minutos: Number(compras_ultimos_10_minutos) || 0,

        cambios_dispositivo_24h: Number(cambios_dispositivo_24h) || 0,

        segundos_interaccion: Number(segundos_interaccion) || 0,

        fecha_transaccion: new Date(),
      },

      transaction,
    });

    const resultado = resultadoMotor.resultado;

    /*
     * BLOQUEAR SOLAMENTE LA OPERACIÓN.
     * La cuenta solo se bloqueará cuando un administrador
     * confirme la alerta y cambie bloqueado_preventivamente a true.
     */
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

    /*
     * RECHAZO CREDITICIO
     */
    if (resultado.decision === DECISIONES.RECHAZO_CREDITICIO) {
      const causasRechazo = resultadoMotor.senales
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

    /*
     * VERIFICACIÓN ADICIONAL
     */
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

    /*
     * REVISIÓN MANUAL
     */
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

    /*
     * Estas decisiones modifican el contrato.
     * Todavía no creamos la compra porque el
     * cliente debe aceptar primero.
     */
    const decisionesAjustadas = [
      DECISIONES.APROBACION_ENGANCHE_MAYOR,

      DECISIONES.MONTO_REDUCIDO,

      DECISIONES.CUOTAS_REDUCIDAS,
    ];

    if (decisionesAjustadas.includes(resultado.decision)) {
      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "CONDICIONES_AJUSTADAS_REQUIEREN_ACEPTACION",

        message:
          "El motor aprobó condiciones diferentes a las solicitadas. Debes aceptar la nueva propuesta para continuar.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        propuesta: {
          decision: resultado.decision,

          monto_original: montoSolicitado,

          monto_financiable: Number(resultado.monto_financiable),

          porcentaje_enganche: Number(resultado.porcentaje_enganche),

          numero_cuotas_solicitadas: numeroCuotasSolicitadas,

          numero_cuotas_permitidas: Number(resultado.numero_cuotas_permitidas),

          motivo: resultado.motivo,

          explicacion: resultado.explicacion,
        },
      });
    }

    const porcentajeEnganche = Number(resultado.porcentaje_enganche) || 0;

    /*
     * Aunque el motor diga aprobación normal,
     * cualquier enganche modifica las condiciones
     * y debe ser aceptado antes de crear la compra.
     */
    if (
      resultado.decision === DECISIONES.APROBACION_NORMAL &&
      porcentajeEnganche > 0
    ) {
      await transaction.commit();

      const montoEnganche = Number(
        (montoSolicitado * (porcentajeEnganche / 100)).toFixed(2),
      );

      const montoDespuesEnganche = Number(
        (montoSolicitado - montoEnganche).toFixed(2),
      );

      return res.status(409).json({
        success: false,

        codigo: "ENGANCHE_REQUIERE_ACEPTACION",

        message: "La compra requiere un enganche antes de continuar.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        propuesta: {
          decision: resultado.decision,

          monto_original: montoSolicitado,

          porcentaje_enganche: porcentajeEnganche,

          monto_enganche: montoEnganche,

          monto_financiable: montoDespuesEnganche,

          numero_cuotas: Number(resultado.numero_cuotas_permitidas),

          motivo: resultado.motivo,

          explicacion: resultado.explicacion,
        },
      });
    }

    /*
     * Solo continuamos automáticamente
     * con aprobación normal.
     */
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

    const creditoDisponible = Number(cliente.poder_credito) || 0;

    const montoFinanciable = Number(resultado.monto_financiable);

    if (montoFinanciable > creditoDisponible) {
      /*
       * La evaluación se conserva, pero no
       * se crea la compra.
       */
      await transaction.commit();

      return res.status(400).json({
        success: false,

        codigo: "CREDITO_DISPONIBLE_INSUFICIENTE",

        message: `Crédito insuficiente. Tienes RD$ ${creditoDisponible.toFixed(2)} disponibles.`,

        evaluacion_id: resultadoMotor.evaluacion_id,

        resultado,
      });
    }

    const numeroCuotasPermitidas = Number(resultado.numero_cuotas_permitidas);

    /*
     * En aprobación normal las cuotas deben
     * coincidir con el plan solicitado.
     */
    if (numeroCuotasPermitidas !== numeroCuotasSolicitadas) {
      await transaction.commit();

      return res.status(409).json({
        success: false,

        codigo: "CUOTAS_AJUSTADAS_REQUIEREN_ACEPTACION",

        message:
          "El número de cuotas fue modificado por el motor y requiere aceptación.",

        evaluacion_id: resultadoMotor.evaluacion_id,

        propuesta: {
          numero_cuotas_solicitadas: numeroCuotasSolicitadas,

          numero_cuotas_permitidas: numeroCuotasPermitidas,

          monto_financiable: montoFinanciable,
        },
      });
    }

    const planIdReal = PLAN_IDS[preferencia];

    if (!planIdReal) {
      await transaction.rollback();

      return res.status(400).json({
        message: "La preferencia BNPL seleccionada no tiene un plan válido.",
      });
    }

    /*
     * Crear la orden una vez aprobada.
     */
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

    /*
     * Vincular la evaluación y sus alertas
     * con la orden recién creada.
     */
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

      numeroCuotas: numeroCuotasPermitidas,

      preferencia,

      transaction,
    });

    /*
     * Descontar únicamente el monto que
     * realmente fue financiado.
     */
    cliente.poder_credito = Number(
      (creditoDisponible - montoFinanciable).toFixed(2),
    );

    await cliente.save({
      transaction,
    });

    /*
     * Actualizar el perfil 360 con la deuda
     * que acaba de crearse.
     */
    await recalcularPerfilRiesgoCliente(cliente.id, {
      transaction,
    });

    await Notificacion.create(
      {
        rol_destino: "admin",

        usuario_id: null,

        tipo: "compra",

        titulo: "Nueva venta BNPL",

        mensaje: `Cliente ${cliente.nombre} compró RD$ ${montoSolicitado.toFixed(2)} en ${tienda.nombre}. Decisión: ${resultado.decision}.`,

        url: "/admin/clientes",

        is_new: true,

        meta: JSON.stringify({
          orden_id: orden.id,

          evaluacion_id: resultadoMotor.evaluacion_id,

          decision: resultado.decision,

          puntaje_crediticio: resultado.puntaje_crediticio,

          puntaje_fraude: resultado.puntaje_fraude,
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

        mensaje: `Compra en ${tienda.nombre} por RD$ ${montoSolicitado.toFixed(2)}. Nuevo saldo disponible: RD$ ${Number(cliente.poder_credito).toFixed(2)}.`,

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

        porcentaje_enganche: Number(resultado.porcentaje_enganche),

        numero_cuotas: numeroCuotasPermitidas,

        preferencia: preferencia,
      },

      riesgo: {
        puntaje_crediticio: resultado.puntaje_crediticio,

        puntaje_fraude: resultado.puntaje_fraude,

        nivel_riesgo: resultado.nivel_riesgo,
      },

      nuevo_credito_disponible: Number(cliente.poder_credito),
    });
  } catch (error) {
    console.error("Error BNPL Checkout:", error);

    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "Error interno al procesar la compra.",
    });
  }
};
const procesarCobroEnganche = async ({ metodoPago, monto, evaluacionId }) => {
  const montoNumerico = Number(monto);

  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    throw new Error("El monto del enganche no es válido.");
  }

  if (!metodoPago.token_gateway) {
    const error = new Error(
      "El método de pago no está habilitado para realizar cobros.",
    );

    error.status = 400;
    error.codigo = "METODO_PAGO_SIN_TOKEN";

    throw error;
  }

  /*
   * Simulación académica del cobro.
   * Más adelante aquí se conectaría una pasarela real.
   */
  const referencia = `ENG-${evaluacionId}-${Date.now()}`;

  return {
    aprobado: true,
    referencia,
    mensaje: "Cobro simulado aprobado correctamente.",
  };
};

/* ==========================================
   ACEPTAR PROPUESTA AJUSTADA DEL MOTOR
========================================== */

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

    if (!Number.isInteger(metodoPagoId) || metodoPagoId <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        codigo: "METODO_PAGO_REQUERIDO",

        message: "Debes seleccionar un método de pago para pagar el enganche.",
      });
    }

    /*
     * Bloquea la evaluación para evitar
     * aceptar la propuesta dos veces.
     */
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

        message: "No se encontró la propuesta de financiamiento.",
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

    /*
     * APROBACION_NORMAL también puede llegar aquí
     * cuando la compra requiere enganche.
     */
    const decisionesAceptables = [
      DECISIONES.APROBACION_NORMAL,

      DECISIONES.APROBACION_ENGANCHE_MAYOR,

      DECISIONES.MONTO_REDUCIDO,

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

    /*
     * Buscar y bloquear al cliente.
     */
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

    /*
     * Buscar el método seleccionado y validar
     * que pertenezca al cliente.
     */
    const metodoPago = await MetodoPago.findOne({
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
          "El método de pago seleccionado no está habilitado para realizar cobros.",
      });
    }

    /*
     * Validar la tienda.
     */
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

    /*
     * Evitar cobrar dos veces la misma propuesta.
     */
    const pagoEngancheExistente = await PagoEnganche.findOne({
      where: {
        evaluacion_id: evaluacion.id,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (pagoEngancheExistente) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,

        codigo: "ENGANCHE_YA_PROCESADO",

        message:
          pagoEngancheExistente.estado === "aprobado"
            ? "El enganche de esta propuesta ya fue pagado."
            : "Ya existe un intento de pago para esta propuesta.",

        pago_enganche_id: pagoEngancheExistente.id,

        estado: pagoEngancheExistente.estado,
      });
    }

    /*
     * Leer condiciones guardadas por el motor.
     */
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

        message: "El monto original de la propuesta no es válido.",
      });
    }

    if (!Number.isFinite(montoMaximoMotor) || montoMaximoMotor <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El monto financiable de la propuesta no es válido.",
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

        message: "El número de cuotas autorizado no es válido.",
      });
    }

    /*
     * Aplicar simultáneamente:
     *
     * 1. El límite del motor.
     * 2. El porcentaje de enganche.
     */
    const financiablePorEnganche =
      montoOriginal * (1 - porcentajeEnganche / 100);

    const montoFinanciable = Number(
      Math.min(
        montoMaximoMotor,

        financiablePorEnganche,
      ).toFixed(2),
    );

    /*
     * Todo lo que no se financia
     * será pagado inmediatamente.
     */
    const montoEnganche = Number((montoOriginal - montoFinanciable).toFixed(2));

    if (montoFinanciable <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "La propuesta no contiene un monto financiable válido.",
      });
    }

    if (montoEnganche <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "PROPUESTA_SIN_ENGANCHE",

        message: "Esta propuesta no requiere un pago de enganche.",
      });
    }

    /*
     * Validar crédito disponible.
     */
    const creditoDisponible = Number(cliente.poder_credito || 0);

    if (montoFinanciable > creditoDisponible) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "CREDITO_DISPONIBLE_INSUFICIENTE",

        message: `Crédito insuficiente. Tienes RD$ ${creditoDisponible.toFixed(
          2,
        )} disponibles.`,
      });
    }

    /*
     * Elegir el plan correcto de acuerdo
     * con las cuotas autorizadas.
     */
    let preferenciaAutorizada;

    if (numeroCuotas === 4) {
      preferenciaAutorizada = "4_quincenas";
    } else if (numeroCuotas === 12) {
      preferenciaAutorizada = "12_meses";
    } else if (numeroCuotas === 24) {
      preferenciaAutorizada = "24_meses";
    } else if (numeroCuotas === 1) {
      preferenciaAutorizada =
        cliente.preferencia_bnpl === "pago_completo"
          ? "pago_completo"
          : "pagar_despues";
    } else {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        codigo: "CUOTAS_NO_COMPATIBLES",

        message:
          "El número de cuotas aprobado no corresponde a un plan BNPL disponible.",
      });
    }

    const planIdReal = PLAN_IDS[preferenciaAutorizada];

    if (!planIdReal) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message: "El plan BNPL autorizado no es válido.",
      });
    }

    /*
     * Crear la orden.
     * Si algo falla después, toda la transacción
     * se revierte.
     */
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

    /*
     * Procesar el cobro simulado.
     */
    const resultadoCobro = await procesarCobroEnganche({
      metodoPago,

      monto: montoEnganche,

      evaluacionId: evaluacion.id,
    });

    if (!resultadoCobro.aprobado) {
      await transaction.rollback();

      return res.status(402).json({
        success: false,

        codigo: "PAGO_ENGANCHE_RECHAZADO",

        message:
          resultadoCobro.mensaje || "El método de pago rechazó el enganche.",
      });
    }

    /*
     * Registrar el enganche.
     */
    const pagoEnganche = await PagoEnganche.create(
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

    /*
     * Marcar la evaluación como utilizada.
     */
    evaluacion.orden_id = orden.id;

    await evaluacion.save({
      transaction,
    });

    /*
     * Vincular las alertas con la orden.
     */
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

    /*
     * Crear el financiamiento únicamente
     * por el monto restante.
     */
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

    /*
     * Crear las cuotas.
     */
    await crearCuotasFinanciamiento({
      pagoBnplId: pagoBnpl.id,

      montoTotal: montoFinanciable,

      numeroCuotas,

      preferencia: preferenciaAutorizada,

      transaction,
    });

    /*
     * Descontar únicamente el monto financiado
     * del crédito disponible.
     */
    cliente.poder_credito = Number(
      (creditoDisponible - montoFinanciable).toFixed(2),
    );

    await cliente.save({
      transaction,
    });

    /*
     * Recalcular el perfil de riesgo.
     */
    await recalcularPerfilRiesgoCliente(cliente.id, {
      transaction,
    });

    const marcaMetodo = metodoPago.marca || metodoPago.tipo || "Método de pago";

    const ultimosDigitos = metodoPago.ultimos_cuatro_digitos
      ? ` •••• ${metodoPago.ultimos_cuatro_digitos}`
      : "";

    /*
     * Notificación del cliente.
     */
    await Notificacion.create(
      {
        rol_destino: "cliente",

        usuario_id: cliente.id,

        tipo: "compra",

        titulo: "Propuesta BNPL aceptada",

        mensaje:
          `Pagaste un enganche de RD$ ${montoEnganche.toFixed(2)} con ` +
          `${marcaMetodo}${ultimosDigitos}. ` +
          `El monto financiado es RD$ ${montoFinanciable.toFixed(
            2,
          )} en ${numeroCuotas} cuota(s).`,

        url: "/cartera",

        is_new: true,

        meta: JSON.stringify({
          orden_id: orden.id,

          pago_bnpl_id: pagoBnpl.id,

          pago_enganche_id: pagoEnganche.id,

          evaluacion_id: evaluacion.id,

          decision: evaluacion.decision,

          monto_original: montoOriginal,

          monto_financiable: montoFinanciable,

          porcentaje_enganche: porcentajeEnganche,

          monto_enganche: montoEnganche,

          numero_cuotas: numeroCuotas,

          metodo_pago_id: metodoPago.id,

          referencia_gateway: resultadoCobro.referencia,
        }),
      },
      {
        transaction,
      },
    );

    /*
     * Notificación del administrador.
     */
    await Notificacion.create(
      {
        rol_destino: "admin",

        usuario_id: null,

        tipo: "compra",

        titulo: "Propuesta BNPL aceptada",

        mensaje:
          `El cliente ${cliente.nombre} pagó un enganche de ` +
          `RD$ ${montoEnganche.toFixed(2)} y financió ` +
          `RD$ ${montoFinanciable.toFixed(2)} en ${tienda.nombre}.`,

        url: "/admin/clientes",

        is_new: true,

        meta: JSON.stringify({
          cliente_id: cliente.id,

          orden_id: orden.id,

          pago_bnpl_id: pagoBnpl.id,

          pago_enganche_id: pagoEnganche.id,

          evaluacion_id: evaluacion.id,

          decision: evaluacion.decision,

          monto_original: montoOriginal,

          monto_financiable: montoFinanciable,

          porcentaje_enganche: porcentajeEnganche,

          monto_enganche: montoEnganche,

          numero_cuotas: numeroCuotas,

          metodo_pago_id: metodoPago.id,

          referencia_gateway: resultadoCobro.referencia,
        }),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,

      message:
        "El enganche fue pagado y el financiamiento fue creado correctamente.",

      orden_id: orden.id,

      pago_bnpl_id: pagoBnpl.id,

      evaluacion_id: evaluacion.id,

      decision: evaluacion.decision,

      pago_enganche: {
        id: pagoEnganche.id,

        monto: montoEnganche,

        estado: pagoEnganche.estado,

        metodo: `${marcaMetodo}${ultimosDigitos}`,

        referencia: resultadoCobro.referencia,
      },

      condiciones: {
        monto_original: montoOriginal,

        monto_financiado: montoFinanciable,

        porcentaje_enganche: porcentajeEnganche,

        monto_enganche: montoEnganche,

        numero_cuotas: numeroCuotas,

        preferencia: preferenciaAutorizada,
      },

      nuevo_credito_disponible: Number(cliente.poder_credito),
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

/* ==========================================
   PAGAR UNA CUOTA Y EVALUAR PUNTUALIDAD
========================================== */
export const payInstallment = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    // Recibimos cuota_id Y metodo_pago_id
    const { cuota_id, metodo_pago_id } = req.body;
    const userId = req.user.id;

    // --- 1. VALIDACIÓN DE MÉTODO DE PAGO (NUEVO) ---
    if (!metodo_pago_id) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Debes seleccionar un método de pago." });
    }

    // Verificar que el método exista y pertenezca al cliente
    const metodo = await db.MetodoPago.findOne({
      where: { id: metodo_pago_id, cliente_id: userId },
      transaction: t,
    });

    if (!metodo) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "El método de pago no es válido o no te pertenece." });
    }
    // ------------------------------------------------

    // 2. Buscar la cuota y validar propiedad
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
                { model: Cliente, as: "cliente" },
                { model: Tienda, as: "tienda" },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!cuota) {
      await t.rollback();
      return res.status(404).json({ message: "Cuota no encontrada" });
    }

    if (cuota.pago_bnpl.orden.cliente.id !== userId) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "No tienes permiso para pagar esta cuota." });
    }

    if (cuota.estado === "pagado") {
      await t.rollback();
      return res.status(400).json({ message: "Esta cuota ya está pagada." });
    }

    // 3. Procesar Pago
    cuota.estado = "pagado";
    cuota.fecha_pago = new Date();
    await cuota.save({ transaction: t });

    const pagoPadre = cuota.pago_bnpl;
    const montoPagado = Number(cuota.monto);

    // Restamos la deuda
    pagoPadre.monto_pendiente = Math.max(
      Number((Number(pagoPadre.monto_pendiente) - montoPagado).toFixed(2)),
      0,
    );

    const cliente = cuota.pago_bnpl.orden.cliente;
    const nombreTienda = cuota.pago_bnpl.orden.tienda.nombre;
    let mensajeExtra = "";

    // 4. VERIFICAR CIERRE DE ORDEN
    if (Number(pagoPadre.monto_pendiente) <= 0.05) {
      pagoPadre.monto_pendiente = 0.0;
      pagoPadre.estado = "pagado";

      const orden = pagoPadre.orden;
      orden.estado = "completada";

      await orden.save({ transaction: t });

      // Obtener todas las cuotas del financiamiento
      const historialCuotas = await Cuota.findAll({
        where: {
          pago_bnpl_id: pagoPadre.id,
        },
        order: [["numero_cuota", "ASC"]],
        transaction: t,
      });

      const cuotasTotales = historialCuotas.length;

      let cuotasPagadasATiempo = 0;
      let cuotasPagadasTarde = 0;

      historialCuotas.forEach((cuotaHistorial) => {
        if (!cuotaHistorial.fecha_pago) {
          return;
        }

        const fechaPago = new Date(cuotaHistorial.fecha_pago);
        const fechaVencimiento = new Date(cuotaHistorial.fecha_vencimiento);

        // Comparamos solamente la fecha, no la hora
        fechaPago.setHours(0, 0, 0, 0);
        fechaVencimiento.setHours(0, 0, 0, 0);

        if (fechaPago <= fechaVencimiento) {
          cuotasPagadasATiempo++;
        } else {
          cuotasPagadasTarde++;
        }
      });

      const porcentajePuntualidad =
        cuotasTotales > 0
          ? Number(((cuotasPagadasATiempo / cuotasTotales) * 100).toFixed(2))
          : 0;

      // Primera regla de elegibilidad:
      // todas las cuotas deben haberse pagado a tiempo
      const esElegible =
        cuotasTotales > 0 &&
        cuotasPagadasATiempo === cuotasTotales &&
        cuotasPagadasTarde === 0;

      const observaciones = esElegible
        ? "Financiamiento completado con todas las cuotas pagadas a tiempo."
        : `Financiamiento completado con ${cuotasPagadasTarde} cuota(s) pagada(s) fuera de fecha.`;

      // findOrCreate evita duplicar la evaluación del mismo financiamiento
      await EvaluacionCrediticia.findOrCreate({
        where: {
          pago_bnpl_id: pagoPadre.id,
        },
        defaults: {
          cliente_id: cliente.id,
          pago_bnpl_id: pagoPadre.id,
          cuotas_totales: cuotasTotales,
          cuotas_pagadas_a_tiempo: cuotasPagadasATiempo,
          cuotas_pagadas_tarde: cuotasPagadasTarde,
          porcentaje_puntualidad: porcentajePuntualidad,
          es_elegible: esElegible,
          observaciones,
          fecha_evaluacion: new Date(),
        },
        transaction: t,
      });

      if (esElegible) {
        mensajeExtra =
          " Completaste este financiamiento sin atrasos. Tu comportamiento crediticio fue evaluado favorablemente.";
      } else {
        mensajeExtra = ` Completaste el financiamiento con una puntualidad de ${porcentajePuntualidad}%.`;
      }
    }

    await pagoPadre.save({ transaction: t });

    // 5. DEVOLUCIÓN DE CRÉDITO (Lo que pagó se libera)
    cliente.poder_credito = Number(cliente.poder_credito) + montoPagado;
    await cliente.save({ transaction: t });

    await recalcularPerfilRiesgoCliente(cliente.id, {
      transaction: t,
    });

    // 6. Notificación (Incluyendo info del método usado)
    await Notificacion.create(
      {
        rol_destino: "cliente",
        usuario_id: cliente.id,
        tipo: "pago",
        titulo:
          pagoPadre.estado === "pagado"
            ? "Financiamiento completado"
            : "Pago Exitoso",
        mensaje: `Pagaste RD$ ${montoPagado.toFixed(
          2,
        )} a ${nombreTienda} usando ${metodo.marca} •••• ${
          metodo.ultimos_cuatro_digitos
        }. Crédito recuperado.${mensajeExtra}`,
        url: "/cartera",
        is_new: true,
        meta: JSON.stringify({ orden_id: pagoPadre.orden_id }),
      },
      { transaction: t },
    );

    await t.commit();

    res.json({
      success: true,
      message: "Pago realizado correctamente",
      nuevo_credito: cliente.poder_credito,
    });
  } catch (err) {
    console.error("Error payInstallment:", err);
    if (!t.finished) {
      await t.rollback();
    }
    return res.status(500).json({
      message: err.message || "Error procesando el pago",
    });
  }
};
