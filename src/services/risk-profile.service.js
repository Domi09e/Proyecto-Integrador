import { Op } from "sequelize";
import db from "../models/index.js";

const {
  Cliente,
  Orden,
  PagoBNPL,
  Cuota,
  PerfilRiesgoCliente,
  AlertaRiesgo,
  sequelize,
} = db;

/* =============================================
   UTILIDADES
============================================= */

const limitar = (valor, minimo, maximo) => {
  return Math.min(Math.max(Number(valor) || 0, minimo), maximo);
};

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;

  return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
};

const obtenerFechaHace30Dias = () => {
  const fecha = new Date();

  fecha.setDate(fecha.getDate() - 30);

  return fecha;
};

const clasificarNivelRiesgo = (puntajeCrediticio, puntajeFraude) => {
  /*
   * El riesgo de fraude tiene prioridad.
   */
  if (puntajeFraude >= 80) {
    return "critico";
  }

  if (puntajeFraude >= 60) {
    return "alto";
  }

  if (puntajeCrediticio >= 85) {
    return "muy_bajo";
  }

  if (puntajeCrediticio >= 70) {
    return "bajo";
  }

  if (puntajeCrediticio >= 50) {
    return "medio";
  }

  if (puntajeCrediticio >= 30) {
    return "alto";
  }

  return "critico";
};

const obtenerCondicionesRecomendadas = ({
  nivelRiesgo,
  ingresos,
  deudaActiva,
  poderCreditoActual,
}) => {
  const ingresoMensual = Number(ingresos) || 0;
  const deuda = Number(deudaActiva) || 0;
  const creditoActual = Number(poderCreditoActual) || 0;

  /*
   * Cuando no existen ingresos declarados,
   * utilizamos el crédito actual como referencia.
   */
  const baseLimite =
    ingresoMensual > 0 ? ingresoMensual : Math.max(creditoActual, 5000);

  const configuracion = {
    muy_bajo: {
      multiplicadorLimite: 1.2,
      enganche: 0,
      cuotas: 24,
    },

    bajo: {
      multiplicadorLimite: 0.8,
      enganche: 10,
      cuotas: 12,
    },

    medio: {
      multiplicadorLimite: 0.5,
      enganche: 20,
      cuotas: 6,
    },

    alto: {
      multiplicadorLimite: 0.25,
      enganche: 35,
      cuotas: 4,
    },

    critico: {
      multiplicadorLimite: 0,
      enganche: 50,
      cuotas: 0,
    },
  };

  const regla = configuracion[nivelRiesgo] || configuracion.medio;

  const limiteBruto = baseLimite * regla.multiplicadorLimite;

  /*
   * El límite recomendado representa capacidad futura.
   * Se resta la deuda actualmente comprometida.
   */
  const limiteDisponibleRecomendado = Math.max(limiteBruto - deuda, 0);

  return {
    limite_recomendado: redondear(limiteDisponibleRecomendado),

    porcentaje_enganche_recomendado: regla.enganche,

    maximo_cuotas_recomendadas: regla.cuotas,
  };
};

/* =============================================
   CALCULAR PUNTAJE CREDITICIO
============================================= */

const calcularPuntajeCrediticio = ({
  totalCuotas,
  cuotasPuntuales,
  cuotasTardias,
  financiamientosCompletados,
  financiamientosActivos,
  relacionDeudaIngreso,
  intentosPagoFallidos,
  alertasActivas,
}) => {
  /*
   * Puntaje inicial neutral.
   */
  let puntaje = 50;

  const puntualidad =
    totalCuotas > 0 ? (cuotasPuntuales / totalCuotas) * 100 : 0;

  /*
   * Historial de puntualidad: máximo +30.
   */
  if (totalCuotas > 0) {
    if (puntualidad >= 100) {
      puntaje += 30;
    } else if (puntualidad >= 95) {
      puntaje += 25;
    } else if (puntualidad >= 85) {
      puntaje += 15;
    } else if (puntualidad >= 70) {
      puntaje += 5;
    } else if (puntualidad >= 50) {
      puntaje -= 10;
    } else {
      puntaje -= 25;
    }
  }

  /*
   * Experiencia positiva usando BNPL.
   */
  puntaje += Math.min(financiamientosCompletados * 3, 15);

  /*
   * Muchos financiamientos activos elevan el riesgo.
   */
  if (financiamientosActivos >= 5) {
    puntaje -= 15;
  } else if (financiamientosActivos >= 3) {
    puntaje -= 8;
  }

  /*
   * Relación deuda/ingreso.
   */
  if (relacionDeudaIngreso !== null && relacionDeudaIngreso !== undefined) {
    if (relacionDeudaIngreso <= 0.2) {
      puntaje += 10;
    } else if (relacionDeudaIngreso <= 0.4) {
      puntaje += 5;
    } else if (relacionDeudaIngreso <= 0.6) {
      puntaje -= 5;
    } else if (relacionDeudaIngreso <= 0.8) {
      puntaje -= 15;
    } else {
      puntaje -= 25;
    }
  }

  puntaje -= Math.min(Number(cuotasTardias) * 4, 20);

  puntaje -= Math.min(Number(intentosPagoFallidos) * 3, 15);

  puntaje -= Math.min(Number(alertasActivas) * 5, 20);

  return redondear(limitar(puntaje, 0, 100));
};

/* =============================================
   CALCULAR PUNTAJE DE FRAUDE DEL PERFIL
============================================= */

const calcularPuntajeFraudePerfil = ({ alertas, intentosPagoFallidos }) => {
  let puntaje = 0;

  for (const alerta of alertas) {
    switch (alerta.severidad) {
      case "critica":
        puntaje += 40;
        break;

      case "alta":
        puntaje += 25;
        break;

      case "media":
        puntaje += 12;
        break;

      case "baja":
        puntaje += 5;
        break;

      default:
        break;
    }
  }

  puntaje += Math.min(Number(intentosPagoFallidos) * 4, 20);

  return redondear(limitar(puntaje, 0, 100));
};

/* =============================================
   OBTENER DATOS DEL CLIENTE
============================================= */

export const obtenerDatosPerfil360 = async (clienteId, opciones = {}) => {
  const transaction = opciones.transaction;

  const cliente = await Cliente.findByPk(clienteId, {
    transaction,
  });

  if (!cliente) {
    const error = new Error("Cliente no encontrado.");

    error.status = 404;

    throw error;
  }

  const fechaHace30Dias = obtenerFechaHace30Dias();

  const [ordenes, financiamientos, cuotas, alertasActivas, perfilActual] =
    await Promise.all([
      Orden.findAll({
        where: {
          cliente_id: clienteId,
        },

        attributes: ["id", "total", "fecha", "estado"],

        transaction,
      }),

      PagoBNPL.findAll({
        include: [
          {
            model: Orden,
            as: "orden",

            where: {
              cliente_id: clienteId,
            },

            attributes: [],
            required: true,
          },
        ],

        transaction,
      }),

      Cuota.findAll({
        include: [
          {
            model: PagoBNPL,
            as: "pago_bnpl",

            attributes: [],

            required: true,

            include: [
              {
                model: Orden,
                as: "orden",

                where: {
                  cliente_id: clienteId,
                },

                attributes: [],
                required: true,
              },
            ],
          },
        ],

        transaction,
      }),

      AlertaRiesgo.findAll({
        where: {
          cliente_id: clienteId,

          estado: {
            [Op.in]: ["abierta", "en_revision", "confirmada"],
          },
        },

        attributes: ["id", "severidad", "tipo_alerta", "estado"],

        transaction,
      }),

      PerfilRiesgoCliente.findOne({
        where: {
          cliente_id: clienteId,
        },

        transaction,
      }),
    ]);

  const financiamientosActivos = financiamientos.filter(
    (financiamiento) =>
      financiamiento.estado === "activo" ||
      financiamiento.estado === "atrasado",
  );

  const financiamientosCompletados = financiamientos.filter(
    (financiamiento) =>
      financiamiento.estado === "pagado",
  );

  const cuotasPagadas = cuotas.filter((cuota) => cuota.estado === "pagado");

  const cuotasPagadasATiempo = cuotasPagadas.filter((cuota) => {
    if (!cuota.fecha_pago || !cuota.fecha_vencimiento) {
      return false;
    }

    return new Date(cuota.fecha_pago) <= new Date(cuota.fecha_vencimiento);
  });

  const cuotasPagadasTarde = cuotasPagadas.filter((cuota) => {
    if (!cuota.fecha_pago || !cuota.fecha_vencimiento) {
      return false;
    }

    return new Date(cuota.fecha_pago) > new Date(cuota.fecha_vencimiento);
  });

  const cuotasActualmenteAtrasadas = cuotas.filter(
    (cuota) => cuota.estado === "atrasado",
  );

  /*
   * Las cuotas pagadas tarde y las actualmente atrasadas
   * se consideran comportamiento negativo.
   */
  const totalCuotasTardias =
    cuotasPagadasTarde.length + cuotasActualmenteAtrasadas.length;

  const totalCuotasEvaluadas = cuotasPagadasATiempo.length + totalCuotasTardias;

  const porcentajePuntualidad =
    totalCuotasEvaluadas > 0
      ? redondear((cuotasPagadasATiempo.length / totalCuotasEvaluadas) * 100)
      : 0;

  const deudaActiva = financiamientosActivos.reduce((total, financiamiento) => {
    return total + Number(financiamiento.monto_pendiente || 0);
  }, 0);

  const montoFinanciadoHistorico = financiamientos.reduce(
    (total, financiamiento) => {
      return total + Number(financiamiento.monto_total || 0);
    },
    0,
  );

  const montoPagadoHistorico = cuotasPagadas.reduce((total, cuota) => {
    return total + Number(cuota.monto || 0);
  }, 0);

  const comprasUltimos30Dias = ordenes.filter((orden) => {
    if (!orden.fecha) {
      return false;
    }

    return new Date(orden.fecha) >= fechaHace30Dias;
  });

  const montoComprasUltimos30Dias = comprasUltimos30Dias.reduce(
    (total, orden) => {
      return total + Number(orden.total || 0);
    },
    0,
  );

  /*
   * Por ahora utilizamos el campo guardado en el perfil.
   * Más adelante agregaremos una pantalla para declarar
   * o verificar ingresos.
   */
  const ingresosDeclarados =
    Number(perfilActual?.ingresos_declarados || 0) || null;

  const relacionDeudaIngreso =
    ingresosDeclarados && ingresosDeclarados > 0
      ? redondear(deudaActiva / ingresosDeclarados, 4)
      : null;

  const intentosPagoFallidos = Number(
    perfilActual?.intentos_pago_fallidos || 0,
  );

  const puntajeFraude = calcularPuntajeFraudePerfil({
    alertas: alertasActivas,

    intentosPagoFallidos,
  });

  const puntajeCrediticio = calcularPuntajeCrediticio({
    totalCuotas: totalCuotasEvaluadas,

    cuotasPuntuales: cuotasPagadasATiempo.length,

    cuotasTardias: totalCuotasTardias,

    financiamientosCompletados: financiamientosCompletados.length,

    financiamientosActivos: financiamientosActivos.length,

    relacionDeudaIngreso,

    intentosPagoFallidos,

    alertasActivas: alertasActivas.length,
  });

  const nivelRiesgo = clasificarNivelRiesgo(puntajeCrediticio, puntajeFraude);

  const condicionesRecomendadas = obtenerCondicionesRecomendadas({
    nivelRiesgo,

    ingresos: ingresosDeclarados,

    deudaActiva,

    poderCreditoActual: cliente.poder_credito,
  });

  return {
    cliente,

    perfilActual,

    datosCalculados: {
      puntaje_crediticio: puntajeCrediticio,

      puntaje_fraude: puntajeFraude,

      nivel_riesgo: nivelRiesgo,

      ingresos_declarados: ingresosDeclarados,

      deuda_activa: redondear(deudaActiva),

      monto_financiado_historico: redondear(montoFinanciadoHistorico),

      monto_pagado_historico: redondear(montoPagadoHistorico),

      financiamientos_activos: financiamientosActivos.length,

      financiamientos_completados: financiamientosCompletados.length,

      cuotas_pagadas_a_tiempo: cuotasPagadasATiempo.length,

      cuotas_pagadas_tarde: totalCuotasTardias,

      intentos_pago_fallidos: intentosPagoFallidos,

      total_compras: ordenes.length,

      compras_ultimos_30_dias: comprasUltimos30Dias.length,

      monto_compras_ultimos_30_dias: redondear(montoComprasUltimos30Dias),

      dispositivos_conocidos: Number(perfilActual?.dispositivos_conocidos || 0),

      ubicaciones_conocidas: Number(perfilActual?.ubicaciones_conocidas || 0),

      alertas_activas: alertasActivas.length,

      porcentaje_puntualidad: porcentajePuntualidad,

      relacion_deuda_ingreso: relacionDeudaIngreso,

      limite_recomendado: condicionesRecomendadas.limite_recomendado,

      porcentaje_enganche_recomendado:
        condicionesRecomendadas.porcentaje_enganche_recomendado,

      maximo_cuotas_recomendadas:
        condicionesRecomendadas.maximo_cuotas_recomendadas,

      requiere_verificacion_adicional:
        puntajeFraude >= 40 ||
        nivelRiesgo === "alto" ||
        nivelRiesgo === "critico",

      bloqueado_preventivamente: puntajeFraude >= 80,

      motivo_bloqueo:
        puntajeFraude >= 80
          ? "Bloqueo preventivo por puntaje elevado de fraude."
          : null,

      ultima_evaluacion: new Date(),

      ultima_actualizacion: new Date(),
    },

    resumen: {
      totalCuotasEvaluadas,

      cuotasActualmenteAtrasadas: cuotasActualmenteAtrasadas.length,

      alertasActivas: alertasActivas.length,
    },
  };
};

/* =============================================
   RECALCULAR Y GUARDAR PERFIL 360
============================================= */

export const recalcularPerfilRiesgoCliente = async (
  clienteId,
  opciones = {},
) => {
  const transactionExterna = opciones.transaction;

  const transaction = transactionExterna || (await sequelize.transaction());

  const debeGestionarTransaccion = !transactionExterna;

  try {
    const { cliente, perfilActual, datosCalculados, resumen } =
      await obtenerDatosPerfil360(clienteId, {
        transaction,
      });

    let perfil;

    if (perfilActual) {
      await perfilActual.update(datosCalculados, {
        transaction,
      });

      perfil = perfilActual;
    } else {
      perfil = await PerfilRiesgoCliente.create(
        {
          cliente_id: clienteId,

          ...datosCalculados,
        },
        {
          transaction,
        },
      );
    }

    if (debeGestionarTransaccion) {
      await transaction.commit();
    }

    return {
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        poder_credito: Number(cliente.poder_credito || 0),
      },

      perfil: {
        id: perfil.id,

        cliente_id: perfil.cliente_id,

        puntaje_crediticio: Number(perfil.puntaje_crediticio),

        puntaje_fraude: Number(perfil.puntaje_fraude),

        nivel_riesgo: perfil.nivel_riesgo,

        ingresos_declarados:
          perfil.ingresos_declarados !== null
            ? Number(perfil.ingresos_declarados)
            : null,

        deuda_activa: Number(perfil.deuda_activa),

        porcentaje_puntualidad: Number(perfil.porcentaje_puntualidad),

        relacion_deuda_ingreso:
          perfil.relacion_deuda_ingreso !== null
            ? Number(perfil.relacion_deuda_ingreso)
            : null,

        financiamientos_activos: perfil.financiamientos_activos,

        financiamientos_completados: perfil.financiamientos_completados,

        cuotas_pagadas_a_tiempo: perfil.cuotas_pagadas_a_tiempo,

        cuotas_pagadas_tarde: perfil.cuotas_pagadas_tarde,

        alertas_activas: perfil.alertas_activas,

        limite_recomendado: Number(perfil.limite_recomendado),

        porcentaje_enganche_recomendado: Number(
          perfil.porcentaje_enganche_recomendado,
        ),

        maximo_cuotas_recomendadas: perfil.maximo_cuotas_recomendadas,

        requiere_verificacion_adicional: Boolean(
          perfil.requiere_verificacion_adicional,
        ),

        bloqueado_preventivamente: Boolean(perfil.bloqueado_preventivamente),

        motivo_bloqueo: perfil.motivo_bloqueo,

        ultima_actualizacion: perfil.ultima_actualizacion,
      },

      resumen,
    };
  } catch (error) {
    if (debeGestionarTransaccion && !transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

/* =============================================
   RECALCULAR TODOS LOS PERFILES
============================================= */

export const recalcularTodosLosPerfiles = async () => {
  const clientes = await Cliente.findAll({
    attributes: ["id"],

    order: [["id", "ASC"]],
  });

  const resultados = [];
  const errores = [];

  /*
   * Se procesan uno a uno para no saturar
   * la conexión de MySQL.
   */
  for (const cliente of clientes) {
    try {
      const resultado = await recalcularPerfilRiesgoCliente(cliente.id);

      resultados.push({
        cliente_id: cliente.id,

        puntaje_crediticio: resultado.perfil.puntaje_crediticio,

        nivel_riesgo: resultado.perfil.nivel_riesgo,
      });
    } catch (error) {
      errores.push({
        cliente_id: cliente.id,

        error: error.message,
      });
    }
  }

  return {
    total_clientes: clientes.length,

    actualizados: resultados.length,

    fallidos: errores.length,

    resultados,

    errores,
  };
};
