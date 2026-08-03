import crypto from "crypto";
import db from "../models/index.js";

import { recalcularPerfilRiesgoCliente } from "./risk-profile.service.js";

const {
  Cliente,
  PerfilRiesgoCliente,
  EvaluacionDinamica,
  SenalEvaluacion,
  AlertaRiesgo,
  HistorialPerfilRiesgo,
  sequelize,
} = db;

/* =====================================================
   CONFIGURACIÓN GENERAL DEL MOTOR
===================================================== */

const VERSION_MOTOR = "1.0.0";

const DECISIONES = {
  APROBACION_NORMAL: "aprobacion_normal",

  APROBACION_ENGANCHE_MAYOR: "aprobacion_enganche_mayor",

  MONTO_REDUCIDO: "monto_reducido",

  CUOTAS_REDUCIDAS: "cuotas_reducidas",

  VERIFICACION_ADICIONAL: "verificacion_adicional",

  REVISION_MANUAL: "revision_manual",

  RECHAZO_CREDITICIO: "rechazo_crediticio",

  BLOQUEO_FRAUDE: "bloqueo_fraude",
};

/* =====================================================
   FUNCIONES AUXILIARES
===================================================== */

const limitar = (valor, minimo, maximo) => {
  const numero = Number(valor) || 0;

  return Math.min(Math.max(numero, minimo), maximo);
};

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;

  return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
};

const crearHash = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  return crypto.createHash("sha256").update(String(valor)).digest("hex");
};

const normalizarBooleano = (valor) => {
  return valor === true || valor === 1 || valor === "1" || valor === "true";
};

const obtenerHoraActual = (fecha) => {
  const fechaEvaluacion = fecha ? new Date(fecha) : new Date();

  return fechaEvaluacion.getHours();
};

const obtenerNivelRiesgo = ({ puntajeCrediticio, puntajeFraude }) => {
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

/* =====================================================
   CREACIÓN DE SEÑALES
===================================================== */

const crearSenal = ({
  categoria,
  codigo,
  nombre,
  valorNumerico = null,
  valorTexto = null,
  valorBooleano = null,
  peso = 0,
  impacto = 0,
  severidad = "informativa",
  activada = false,
  descripcion = null,
}) => {
  return {
    categoria,

    codigo_senal: codigo,

    nombre_senal: nombre,

    valor_numerico: valorNumerico,

    valor_texto: valorTexto,

    valor_booleano: valorBooleano,

    peso,

    impacto_puntaje: impacto,

    severidad,

    regla_activada: activada,

    descripcion,
  };
};

/* =====================================================
   ANALIZAR SEÑALES CREDITICIAS
===================================================== */

const analizarSenalesCrediticias = ({
  perfil,
  montoSolicitado,
  numeroCuotasSolicitadas,
}) => {
  const senales = [];

  let ajusteCredito = 0;

  const puntajePerfil = Number(perfil.puntaje_crediticio) || 50;

  const ingresos = Number(perfil.ingresos_declarados) || 0;

  const deudaActiva = Number(perfil.deuda_activa) || 0;

  const limiteRecomendado = Number(perfil.limite_recomendado) || 0;

  const puntualidad = Number(perfil.porcentaje_puntualidad) || 0;

  const financiamientosActivos = Number(perfil.financiamientos_activos) || 0;

  const cuotasTardias = Number(perfil.cuotas_pagadas_tarde) || 0;

  const relacionDeudaIngreso =
    perfil.relacion_deuda_ingreso !== null
      ? Number(perfil.relacion_deuda_ingreso)
      : null;

  /*
   * Señal 1: puntaje base del perfil.
   */
  senales.push(
    crearSenal({
      categoria: "credito",

      codigo: "PUNTAJE_PERFIL",

      nombre: "Puntaje crediticio actual",

      valorNumerico: puntajePerfil,

      peso: 1,

      impacto: 0,

      severidad:
        puntajePerfil < 40
          ? "alta"
          : puntajePerfil < 60
            ? "media"
            : "informativa",

      activada: puntajePerfil < 60,

      descripcion: "Puntaje crediticio acumulado del cliente.",
    }),
  );

  /*
   * Señal 2: puntualidad.
   */
  if (puntualidad >= 95) {
    ajusteCredito += 8;

    senales.push(
      crearSenal({
        categoria: "pagos",

        codigo: "PUNTUALIDAD_ALTA",

        nombre: "Historial de pagos puntuales",

        valorNumerico: puntualidad,

        peso: 0.8,

        impacto: 8,

        severidad: "informativa",

        activada: true,

        descripcion: "El cliente mantiene un nivel alto de puntualidad.",
      }),
    );
  } else if (puntualidad > 0 && puntualidad < 70) {
    ajusteCredito -= 12;

    senales.push(
      crearSenal({
        categoria: "pagos",

        codigo: "PUNTUALIDAD_BAJA",

        nombre: "Baja puntualidad de pagos",

        valorNumerico: puntualidad,

        peso: 1.2,

        impacto: -12,

        severidad: "alta",

        activada: true,

        descripcion:
          "El porcentaje de pagos puntuales es inferior al nivel recomendado.",
      }),
    );
  }

  /*
   * Señal 3: monto solicitado respecto al ingreso.
   */
  if (ingresos > 0) {
    const relacionMontoIngreso = montoSolicitado / ingresos;

    if (relacionMontoIngreso > 1) {
      ajusteCredito -= 20;

      senales.push(
        crearSenal({
          categoria: "ingresos",

          codigo: "MONTO_SUPERA_INGRESO",

          nombre: "Monto superior al ingreso declarado",

          valorNumerico: redondear(relacionMontoIngreso, 4),

          peso: 1.5,

          impacto: -20,

          severidad: "critica",

          activada: true,

          descripcion:
            "El monto solicitado supera el ingreso mensual declarado.",
        }),
      );
    } else if (relacionMontoIngreso > 0.7) {
      ajusteCredito -= 12;

      senales.push(
        crearSenal({
          categoria: "ingresos",

          codigo: "MONTO_ALTO_RESPECTO_INGRESO",

          nombre: "Monto elevado respecto al ingreso",

          valorNumerico: redondear(relacionMontoIngreso, 4),

          peso: 1.2,

          impacto: -12,

          severidad: "alta",

          activada: true,

          descripcion:
            "El monto solicitado representa una proporción elevada del ingreso mensual.",
        }),
      );
    } else if (relacionMontoIngreso <= 0.3) {
      ajusteCredito += 5;

      senales.push(
        crearSenal({
          categoria: "ingresos",

          codigo: "MONTO_COMPATIBLE_INGRESO",

          nombre: "Monto compatible con el ingreso",

          valorNumerico: redondear(relacionMontoIngreso, 4),

          peso: 0.5,

          impacto: 5,

          severidad: "informativa",

          activada: true,

          descripcion:
            "El monto solicitado es proporcional a los ingresos declarados.",
        }),
      );
    }
  } else {
    ajusteCredito -= 5;

    senales.push(
      crearSenal({
        categoria: "ingresos",

        codigo: "INGRESOS_NO_DECLARADOS",

        nombre: "Ingresos no disponibles",

        valorBooleano: true,

        peso: 0.5,

        impacto: -5,

        severidad: "media",

        activada: true,

        descripcion: "No se encontraron ingresos declarados o verificados.",
      }),
    );
  }

  /*
   * Señal 4: relación deuda/ingreso.
   */
  if (relacionDeudaIngreso !== null) {
    if (relacionDeudaIngreso > 0.8) {
      ajusteCredito -= 20;

      senales.push(
        crearSenal({
          categoria: "credito",

          codigo: "DEUDA_INGRESO_CRITICA",

          nombre: "Relación deuda-ingreso crítica",

          valorNumerico: relacionDeudaIngreso,

          peso: 1.5,

          impacto: -20,

          severidad: "critica",

          activada: true,

          descripcion:
            "La deuda activa representa más del 80 % del ingreso declarado.",
        }),
      );
    } else if (relacionDeudaIngreso > 0.6) {
      ajusteCredito -= 12;

      senales.push(
        crearSenal({
          categoria: "credito",

          codigo: "DEUDA_INGRESO_ALTA",

          nombre: "Relación deuda-ingreso alta",

          valorNumerico: relacionDeudaIngreso,

          peso: 1.2,

          impacto: -12,

          severidad: "alta",

          activada: true,

          descripcion:
            "La deuda activa representa una proporción elevada del ingreso.",
        }),
      );
    } else if (relacionDeudaIngreso <= 0.3) {
      ajusteCredito += 5;

      senales.push(
        crearSenal({
          categoria: "credito",

          codigo: "DEUDA_INGRESO_SALUDABLE",

          nombre: "Relación deuda-ingreso saludable",

          valorNumerico: relacionDeudaIngreso,

          peso: 0.5,

          impacto: 5,

          severidad: "informativa",

          activada: true,

          descripcion:
            "La deuda activa se encuentra dentro de un rango saludable.",
        }),
      );
    }
  }

  /*
   * Señal 5: varios financiamientos activos.
   */
  if (financiamientosActivos >= 5) {
    ajusteCredito -= 18;

    senales.push(
      crearSenal({
        categoria: "credito",

        codigo: "DEMASIADOS_FINANCIAMIENTOS_ACTIVOS",

        nombre: "Acumulación de financiamientos activos",

        valorNumerico: financiamientosActivos,

        peso: 1.5,

        impacto: -18,

        severidad: "critica",

        activada: true,

        descripcion: "El cliente mantiene cinco o más financiamientos activos.",
      }),
    );
  } else if (financiamientosActivos >= 3) {
    ajusteCredito -= 10;

    senales.push(
      crearSenal({
        categoria: "credito",

        codigo: "MULTIPLES_FINANCIAMIENTOS_ACTIVOS",

        nombre: "Múltiples financiamientos activos",

        valorNumerico: financiamientosActivos,

        peso: 1,

        impacto: -10,

        severidad: "alta",

        activada: true,

        descripcion:
          "El cliente mantiene varios financiamientos activos simultáneamente.",
      }),
    );
  }

  /*
   * Señal 6: cuotas atrasadas.
   */
  if (cuotasTardias >= 3) {
    ajusteCredito -= 15;

    senales.push(
      crearSenal({
        categoria: "pagos",

        codigo: "MULTIPLES_ATRASOS",

        nombre: "Múltiples atrasos de pago",

        valorNumerico: cuotasTardias,

        peso: 1.3,

        impacto: -15,

        severidad: "alta",

        activada: true,

        descripcion:
          "El cliente registra varios pagos tardíos o cuotas atrasadas.",
      }),
    );
  }

  /*
   * Señal 7: monto superior al límite recomendado.
   */
  if (limiteRecomendado > 0 && montoSolicitado > limiteRecomendado) {
    ajusteCredito -= 15;

    senales.push(
      crearSenal({
        categoria: "credito",

        codigo: "MONTO_SUPERA_LIMITE_RECOMENDADO",

        nombre: "Monto superior al límite recomendado",

        valorNumerico: montoSolicitado,

        valorTexto: `Límite recomendado: ${limiteRecomendado}`,

        peso: 1.3,

        impacto: -15,

        severidad: "alta",

        activada: true,

        descripcion:
          "El monto solicitado supera la capacidad recomendada por el perfil de riesgo.",
      }),
    );
  }

  /*
   * Señal 8: número de cuotas solicitado.
   */
  const maximoCuotas = Number(perfil.maximo_cuotas_recomendadas) || 4;

  if (numeroCuotasSolicitadas > maximoCuotas) {
    ajusteCredito -= 8;

    senales.push(
      crearSenal({
        categoria: "credito",

        codigo: "CUOTAS_SUPERAN_RECOMENDACION",

        nombre: "Cantidad de cuotas superior a la recomendada",

        valorNumerico: numeroCuotasSolicitadas,

        valorTexto: `Máximo recomendado: ${maximoCuotas}`,

        peso: 0.8,

        impacto: -8,

        severidad: "media",

        activada: true,

        descripcion:
          "El número de cuotas solicitado supera el máximo recomendado.",
      }),
    );
  }

  return {
    senales,
    ajusteCredito,
    deudaActiva,
    limiteRecomendado,
  };
};

/* =====================================================
   ANALIZAR SEÑALES DE FRAUDE
===================================================== */

const analizarSenalesFraude = ({ perfil, contexto, montoSolicitado }) => {
  const senales = [];

  let puntajeFraude = Number(perfil.puntaje_fraude) || 0;

  const dispositivoNuevo = normalizarBooleano(contexto.dispositivo_nuevo);

  const ipNueva = normalizarBooleano(contexto.ip_nueva);

  const ubicacionNueva = normalizarBooleano(contexto.ubicacion_nueva);

  const ubicacionInconsistente = normalizarBooleano(
    contexto.ubicacion_inconsistente,
  );

  const multiplesIntentos = Number(contexto.intentos_recientes) || 0;

  const comprasUltimosMinutos =
    Number(contexto.compras_ultimos_10_minutos) || 0;

  const cambiosDispositivo24Horas =
    Number(contexto.cambios_dispositivo_24h) || 0;

  const velocidadInteraccion = Number(contexto.segundos_interaccion) || null;

  const hora = obtenerHoraActual(contexto.fecha_transaccion);

  /*
   * Dispositivo nuevo.
   */
  if (dispositivoNuevo) {
    puntajeFraude += 15;

    senales.push(
      crearSenal({
        categoria: "dispositivo",

        codigo: "DISPOSITIVO_NUEVO",

        nombre: "Dispositivo no reconocido",

        valorBooleano: true,

        peso: 1,

        impacto: 15,

        severidad: "media",

        activada: true,

        descripcion:
          "La operación se realiza desde un dispositivo no registrado previamente.",
      }),
    );
  }

  /*
   * Dirección IP nueva.
   */
  if (ipNueva) {
    puntajeFraude += 8;

    senales.push(
      crearSenal({
        categoria: "sesion",

        codigo: "IP_NUEVA",

        nombre: "Dirección IP no reconocida",

        valorBooleano: true,

        peso: 0.7,

        impacto: 8,

        severidad: "baja",

        activada: true,

        descripcion:
          "La operación utiliza una dirección IP diferente a las habituales.",
      }),
    );
  }

  /*
   * Ubicación nueva.
   */
  if (ubicacionNueva) {
    puntajeFraude += 10;

    senales.push(
      crearSenal({
        categoria: "ubicacion",

        codigo: "UBICACION_NUEVA",

        nombre: "Ubicación no reconocida",

        valorBooleano: true,

        peso: 0.8,

        impacto: 10,

        severidad: "media",

        activada: true,

        descripcion:
          "La operación se origina desde una zona no utilizada previamente.",
      }),
    );
  }

  /*
   * Ubicación incompatible o imposible.
   */
  if (ubicacionInconsistente) {
    puntajeFraude += 35;

    senales.push(
      crearSenal({
        categoria: "ubicacion",

        codigo: "UBICACION_INCONSISTENTE",

        nombre: "Cambio de ubicación inconsistente",

        valorBooleano: true,

        peso: 1.8,

        impacto: 35,

        severidad: "critica",

        activada: true,

        descripcion:
          "Se detectó una ubicación incompatible con la actividad reciente del cliente.",
      }),
    );
  }

  /*
   * Muchos cambios de dispositivo.
   */
  if (cambiosDispositivo24Horas >= 3) {
    puntajeFraude += 25;

    senales.push(
      crearSenal({
        categoria: "dispositivo",

        codigo: "CAMBIOS_FRECUENTES_DISPOSITIVO",

        nombre: "Cambios frecuentes de dispositivo",

        valorNumerico: cambiosDispositivo24Horas,

        peso: 1.5,

        impacto: 25,

        severidad: "alta",

        activada: true,

        descripcion:
          "Se detectaron tres o más dispositivos distintos durante las últimas 24 horas.",
      }),
    );
  }

  /*
   * Compras rápidas o simultáneas.
   */
  if (comprasUltimosMinutos >= 3) {
    puntajeFraude += 25;

    senales.push(
      crearSenal({
        categoria: "velocidad",

        codigo: "COMPRAS_RAPIDAS",

        nombre: "Múltiples compras en corto tiempo",

        valorNumerico: comprasUltimosMinutos,

        peso: 1.5,

        impacto: 25,

        severidad: "alta",

        activada: true,

        descripcion:
          "Se detectaron tres o más compras en un intervalo de diez minutos.",
      }),
    );
  }

  /*
   * Muchos intentos de transacción.
   */
  if (multiplesIntentos >= 5) {
    puntajeFraude += 20;

    senales.push(
      crearSenal({
        categoria: "velocidad",

        codigo: "MULTIPLES_INTENTOS_TRANSACCION",

        nombre: "Múltiples intentos recientes",

        valorNumerico: multiplesIntentos,

        peso: 1.2,

        impacto: 20,

        severidad: "alta",

        activada: true,

        descripcion: "Se detectó un número inusual de intentos de transacción.",
      }),
    );
  }

  /*
   * Interacción extremadamente rápida.
   */
  if (
    velocidadInteraccion !== null &&
    velocidadInteraccion > 0 &&
    velocidadInteraccion < 5
  ) {
    puntajeFraude += 12;

    senales.push(
      crearSenal({
        categoria: "velocidad",

        codigo: "INTERACCION_DEMASIADO_RAPIDA",

        nombre: "Interacción inusualmente rápida",

        valorNumerico: velocidadInteraccion,

        peso: 0.8,

        impacto: 12,

        severidad: "media",

        activada: true,

        descripcion:
          "El proceso de compra fue completado en un tiempo anormalmente corto.",
      }),
    );
  }

  /*
   * Compra nocturna.
   * Por sí sola no significa fraude, por eso su impacto es bajo.
   */
  if (hora >= 0 && hora <= 4) {
    puntajeFraude += 5;

    senales.push(
      crearSenal({
        categoria: "comportamiento",

        codigo: "COMPRA_HORARIO_INUSUAL",

        nombre: "Compra en horario inusual",

        valorNumerico: hora,

        peso: 0.3,

        impacto: 5,

        severidad: "baja",

        activada: true,

        descripcion:
          "La compra fue realizada entre las 12:00 a. m. y las 4:59 a. m.",
      }),
    );
  }

  /*
   * Compra muy superior al comportamiento reciente.
   */
  const montoUltimos30Dias = Number(perfil.monto_compras_ultimos_30_dias) || 0;

  const comprasUltimos30Dias = Number(perfil.compras_ultimos_30_dias) || 0;

  const promedioCompra =
    comprasUltimos30Dias > 0 ? montoUltimos30Dias / comprasUltimos30Dias : 0;

  if (promedioCompra > 0 && montoSolicitado > promedioCompra * 3) {
    puntajeFraude += 15;

    senales.push(
      crearSenal({
        categoria: "compras",

        codigo: "MONTO_MUY_SUPERIOR_PROMEDIO",

        nombre: "Monto muy superior al promedio",

        valorNumerico: montoSolicitado,

        valorTexto: `Promedio reciente: ${redondear(promedioCompra)}`,

        peso: 1,

        impacto: 15,

        severidad: "media",

        activada: true,

        descripcion:
          "El monto de la operación supera tres veces el promedio reciente del cliente.",
      }),
    );
  }

  /*
   * Combinación particularmente riesgosa.
   */
  if (dispositivoNuevo && ipNueva && ubicacionNueva) {
    puntajeFraude += 20;

    senales.push(
      crearSenal({
        categoria: "fraude",

        codigo: "COMBINACION_IDENTIDAD_DIGITAL_NUEVA",

        nombre: "Dispositivo, IP y ubicación nuevos",

        valorBooleano: true,

        peso: 1.5,

        impacto: 20,

        severidad: "alta",

        activada: true,

        descripcion:
          "La transacción presenta simultáneamente dispositivo, dirección IP y ubicación no reconocidos.",
      }),
    );
  }

  return {
    senales,

    puntajeFraude: redondear(limitar(puntajeFraude, 0, 100)),
  };
};

/* =====================================================
   GENERAR CONDICIONES Y DECISIÓN
===================================================== */

const generarDecision = ({
  perfil,
  puntajeCrediticio,
  puntajeFraude,
  montoSolicitado,
  numeroCuotasSolicitadas,
  limiteRecomendado,
}) => {
  const maximoCuotas = Number(perfil.maximo_cuotas_recomendadas) || 4;

  const engancheRecomendado =
    Number(perfil.porcentaje_enganche_recomendado) || 0;

  const montoBaseFinanciable =
    limiteRecomendado > 0 ? Math.min(montoSolicitado, limiteRecomendado) : 0;

  /*
   * 1. Bloqueo por fraude.
   */
  if (perfil.bloqueado_preventivamente || puntajeFraude >= 80) {
    return {
      decision: DECISIONES.BLOQUEO_FRAUDE,

      montoFinanciable: 0,

      porcentajeEnganche: 100,

      numeroCuotasPermitidas: 0,

      requiereRevisionManual: false,

      bloqueoPreventivo: true,

      motivoPrincipal:
        "La operación fue bloqueada preventivamente por un riesgo elevado de fraude.",

      explicacion:
        "El puntaje de fraude alcanzó un nivel crítico o el perfil ya se encontraba bloqueado preventivamente.",
    };
  }

  /*
   * 2. Revisión manual por fraude alto.
   */
  if (puntajeFraude >= 60) {
    return {
      decision: DECISIONES.REVISION_MANUAL,

      montoFinanciable: montoBaseFinanciable,

      porcentajeEnganche: Math.max(engancheRecomendado, 35),

      numeroCuotasPermitidas: Math.min(numeroCuotasSolicitadas, 4),

      requiereRevisionManual: true,

      bloqueoPreventivo: false,

      motivoPrincipal:
        "La operación requiere revisión manual por riesgo elevado de fraude.",

      explicacion:
        "Las señales detectadas no justifican un bloqueo automático, pero requieren la validación de un administrador.",
    };
  }

  /*
   * 3. Verificación adicional.
   */
  if (puntajeFraude >= 40) {
    return {
      decision: DECISIONES.VERIFICACION_ADICIONAL,

      montoFinanciable: montoBaseFinanciable,

      porcentajeEnganche: Math.max(engancheRecomendado, 25),

      numeroCuotasPermitidas: Math.min(numeroCuotasSolicitadas, 4),

      requiereRevisionManual: false,

      bloqueoPreventivo: false,

      motivoPrincipal:
        "Se requiere una verificación adicional de identidad o dispositivo.",

      explicacion:
        "El riesgo de fraude es moderado y debe validarse antes de completar el financiamiento.",
    };
  }

  /*
   * 4. Rechazo crediticio.
   */
  if (puntajeCrediticio < 30 || perfil.nivel_riesgo === "critico") {
    return {
      decision: DECISIONES.RECHAZO_CREDITICIO,

      montoFinanciable: 0,

      porcentajeEnganche: 100,

      numeroCuotasPermitidas: 0,

      requiereRevisionManual: false,

      bloqueoPreventivo: false,

      motivoPrincipal:
        "La capacidad de pago actual no permite aprobar el financiamiento.",

      explicacion:
        "El puntaje crediticio resultante se encuentra por debajo del mínimo permitido.",
    };
  }

  /*
   * 5. Riesgo alto: monto reducido y enganche alto.
   */
  if (puntajeCrediticio < 50) {
    const montoReducido = Math.min(montoSolicitado * 0.5, montoBaseFinanciable);

    return {
      decision: DECISIONES.MONTO_REDUCIDO,

      montoFinanciable: redondear(Math.max(montoReducido, 0)),

      porcentajeEnganche: Math.max(engancheRecomendado, 40),

      numeroCuotasPermitidas: Math.min(numeroCuotasSolicitadas, 4),

      requiereRevisionManual: false,

      bloqueoPreventivo: false,

      motivoPrincipal:
        "El financiamiento fue limitado por el nivel de riesgo crediticio.",

      explicacion:
        "El cliente puede continuar con un monto menor, un enganche mayor y menos cuotas.",
    };
  }

  /*
   * 6. El monto supera el límite recomendado.
   */
  if (limiteRecomendado > 0 && montoSolicitado > limiteRecomendado) {
    return {
      decision: DECISIONES.MONTO_REDUCIDO,

      montoFinanciable: redondear(limiteRecomendado),

      porcentajeEnganche: Math.max(engancheRecomendado, 20),

      numeroCuotasPermitidas: Math.min(numeroCuotasSolicitadas, maximoCuotas),

      requiereRevisionManual: false,

      bloqueoPreventivo: false,

      motivoPrincipal: "El monto solicitado supera el límite recomendado.",

      explicacion:
        "El motor ofrece un monto financiable ajustado a la capacidad calculada del cliente.",
    };
  }

  /*
   * 7. Solicita más cuotas de las recomendadas.
   */
  if (numeroCuotasSolicitadas > maximoCuotas) {
    return {
      decision: DECISIONES.CUOTAS_REDUCIDAS,

      montoFinanciable: redondear(montoSolicitado),

      porcentajeEnganche: engancheRecomendado,

      numeroCuotasPermitidas: maximoCuotas,

      requiereRevisionManual: false,

      bloqueoPreventivo: false,

      motivoPrincipal: "El número de cuotas solicitado fue reducido.",

      explicacion:
        "El monto puede aprobarse, pero dentro del máximo de cuotas recomendado para el nivel de riesgo.",
    };
  }

  /*
   * 8. Riesgo medio: aprobación con enganche.
   */
  if (puntajeCrediticio < 70) {
    return {
      decision: DECISIONES.APROBACION_ENGANCHE_MAYOR,

      montoFinanciable: redondear(montoSolicitado),

      porcentajeEnganche: Math.max(engancheRecomendado, 20),

      numeroCuotasPermitidas: Math.min(numeroCuotasSolicitadas, maximoCuotas),

      requiereRevisionManual: false,

      bloqueoPreventivo: false,

      motivoPrincipal: "La compra fue aprobada con un enganche mayor.",

      explicacion:
        "El cliente tiene una capacidad aceptable, pero el riesgo requiere una participación inicial mayor.",
    };
  }

  /*
   * 9. Aprobación normal.
   */
  return {
    decision: DECISIONES.APROBACION_NORMAL,

    montoFinanciable: redondear(montoSolicitado),

    porcentajeEnganche: engancheRecomendado,

    numeroCuotasPermitidas: Math.min(numeroCuotasSolicitadas, maximoCuotas),

    requiereRevisionManual: false,

    bloqueoPreventivo: false,

    motivoPrincipal:
      "La compra cumple con las condiciones normales de aprobación.",

    explicacion:
      "El perfil crediticio, la capacidad de pago y las señales de fraude se encuentran dentro de los niveles permitidos.",
  };
};

/* =====================================================
   CREAR ALERTAS A PARTIR DE LAS SEÑALES
===================================================== */

const obtenerAlertasDesdeSenales = ({
  clienteId,
  ordenId,
  evaluacionId,
  senales,
  decision,
}) => {
  const alertas = [];

  for (const senal of senales) {
    if (!senal.regla_activada) {
      continue;
    }

    if (!["alta", "critica"].includes(senal.severidad)) {
      continue;
    }

    const tipoAlertaPorCategoria = {
      identidad: "identidad",
      ingresos: "credito",
      credito: "credito",
      pagos: "pago",
      compras: "comportamiento",
      dispositivo: "dispositivo",
      ubicacion: "ubicacion",
      sesion: "fraude",
      velocidad: "velocidad",
      producto: "comportamiento",
      fraude: "fraude",
      comportamiento: "comportamiento",
    };

    let accionAutomatica = "ninguna";

    if (decision === DECISIONES.BLOQUEO_FRAUDE) {
      accionAutomatica = "bloqueo_temporal";
    } else if (decision === DECISIONES.REVISION_MANUAL) {
      accionAutomatica = "revision_manual";
    } else if (decision === DECISIONES.VERIFICACION_ADICIONAL) {
      accionAutomatica = "verificacion_adicional";
    } else if (decision === DECISIONES.MONTO_REDUCIDO) {
      accionAutomatica = "reducir_monto";
    } else if (decision === DECISIONES.CUOTAS_REDUCIDAS) {
      accionAutomatica = "reducir_cuotas";
    } else if (decision === DECISIONES.RECHAZO_CREDITICIO) {
      accionAutomatica = "rechazo";
    }

    alertas.push({
      cliente_id: clienteId,

      evaluacion_id: evaluacionId,

      orden_id: ordenId || null,

      tipo_alerta: tipoAlertaPorCategoria[senal.categoria] || "comportamiento",

      codigo_alerta: senal.codigo_senal,

      titulo: senal.nombre_senal,

      descripcion:
        senal.descripcion ||
        "Se detectó una señal relevante durante la evaluación.",

      severidad: senal.severidad === "critica" ? "critica" : "alta",

      estado: "abierta",

      accion_automatica: accionAutomatica,
    });
  }

  return alertas;
};

/* =====================================================
   FUNCIÓN PRINCIPAL DEL MOTOR
===================================================== */

export const evaluarCompraDinamicamente = async ({
  clienteId,
  ordenId = null,
  montoSolicitado,
  numeroCuotasSolicitadas = 4,
  contexto = {},
  transaction: transactionExterna = null,
}) => {
  const inicio = Date.now();

  const clienteIdNumerico = Number(clienteId);

  const monto = Number(montoSolicitado);

  const cuotasSolicitadas = Number(numeroCuotasSolicitadas);

  if (!Number.isInteger(clienteIdNumerico) || clienteIdNumerico <= 0) {
    const error = new Error("El cliente indicado no es válido.");

    error.status = 400;

    throw error;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    const error = new Error("El monto solicitado debe ser mayor que cero.");

    error.status = 400;

    throw error;
  }

  if (!Number.isInteger(cuotasSolicitadas) || cuotasSolicitadas <= 0) {
    const error = new Error("El número de cuotas solicitado no es válido.");

    error.status = 400;

    throw error;
  }

  const transaction = transactionExterna || (await sequelize.transaction());

  const debeGestionarTransaccion = !transactionExterna;

  try {
    const cliente = await Cliente.findByPk(clienteIdNumerico, {
      transaction,
    });

    if (!cliente) {
      const error = new Error("Cliente no encontrado.");

      error.status = 404;

      throw error;
    }

    /*
     * Antes de evaluar, actualizamos el perfil 360.
     */
    await recalcularPerfilRiesgoCliente(clienteIdNumerico, {
      transaction,
    });

    const perfil = await PerfilRiesgoCliente.findOne({
      where: {
        cliente_id: clienteIdNumerico,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!perfil) {
      throw new Error("No se pudo obtener el perfil de riesgo del cliente.");
    }

    const puntajeAnterior = Number(perfil.puntaje_crediticio) || 50;

    const analisisCredito = analizarSenalesCrediticias({
      perfil,

      montoSolicitado: monto,

      numeroCuotasSolicitadas: cuotasSolicitadas,
    });

    const analisisFraude = analizarSenalesFraude({
      perfil,

      contexto,

      montoSolicitado: monto,
    });

    const puntajeCrediticioResultante = redondear(
      limitar(puntajeAnterior + analisisCredito.ajusteCredito, 0, 100),
    );

    const puntajeFraude = analisisFraude.puntajeFraude;

    const nivelRiesgo = obtenerNivelRiesgo({
      puntajeCrediticio: puntajeCrediticioResultante,

      puntajeFraude,
    });

    const resultadoDecision = generarDecision({
      perfil,

      puntajeCrediticio: puntajeCrediticioResultante,

      puntajeFraude,

      montoSolicitado: monto,

      numeroCuotasSolicitadas: cuotasSolicitadas,

      limiteRecomendado: analisisCredito.limiteRecomendado,
    });

    const ipHash =
      contexto.ip_hash || crearHash(contexto.ip || contexto.direccion_ip);

    const dispositivoHash =
      contexto.dispositivo_hash ||
      crearHash(
        contexto.dispositivo_id || contexto.user_agent || contexto.dispositivo,
      );

    const evaluacion = await EvaluacionDinamica.create(
      {
        cliente_id: clienteIdNumerico,

        orden_id: ordenId || null,

        tipo_evaluacion: "solicitud_bnpl",

        monto_solicitado: monto.toFixed(2),

        ingresos_considerados: perfil.ingresos_declarados,

        deuda_considerada: perfil.deuda_activa,

        puntaje_crediticio_anterior: puntajeAnterior,

        puntaje_crediticio_resultante: puntajeCrediticioResultante,

        puntaje_fraude: puntajeFraude,

        nivel_riesgo: nivelRiesgo,

        decision: resultadoDecision.decision,

        monto_original: monto.toFixed(2),

        monto_financiable: Number(resultadoDecision.montoFinanciable).toFixed(
          2,
        ),

        porcentaje_enganche: resultadoDecision.porcentajeEnganche,

        numero_cuotas_permitidas: resultadoDecision.numeroCuotasPermitidas,

        requiere_revision_manual: resultadoDecision.requiereRevisionManual,

        bloqueo_preventivo: resultadoDecision.bloqueoPreventivo,

        motivo_principal: resultadoDecision.motivoPrincipal,

        explicacion: resultadoDecision.explicacion,

        version_motor: VERSION_MOTOR,

        duracion_evaluacion_ms: Date.now() - inicio,

        ip_hash: ipHash,

        dispositivo_hash: dispositivoHash,

        session_id: contexto.session_id || null,

        fecha_evaluacion: new Date(),
      },
      {
        transaction,
      },
    );

    const todasLasSenales = [
      ...analisisCredito.senales,
      ...analisisFraude.senales,
    ];

    if (todasLasSenales.length > 0) {
      await SenalEvaluacion.bulkCreate(
        todasLasSenales.map((senal) => ({
          evaluacion_id: evaluacion.id,

          ...senal,
        })),
        {
          transaction,
        },
      );
    }

    const alertas = obtenerAlertasDesdeSenales({
      clienteId: clienteIdNumerico,

      ordenId,

      evaluacionId: evaluacion.id,

      senales: todasLasSenales,

      decision: resultadoDecision.decision,
    });

    if (alertas.length > 0) {
      await AlertaRiesgo.bulkCreate(alertas, {
        transaction,
      });
    }

    /*
     * Guardamos el cambio de perfil producido
     * por esta evaluación.
     */
    await HistorialPerfilRiesgo.create(
      {
        cliente_id: clienteIdNumerico,

        evaluacion_id: evaluacion.id,

        evento_origen: "compra",

        puntaje_anterior: puntajeAnterior,

        puntaje_nuevo: puntajeCrediticioResultante,

        riesgo_anterior: perfil.nivel_riesgo,

        riesgo_nuevo: nivelRiesgo,

        limite_anterior: perfil.limite_recomendado,

        limite_nuevo: resultadoDecision.montoFinanciable,

        enganche_anterior: perfil.porcentaje_enganche_recomendado,

        enganche_nuevo: resultadoDecision.porcentajeEnganche,

        variacion_puntaje: redondear(
          puntajeCrediticioResultante - puntajeAnterior,
        ),

        motivo: resultadoDecision.motivoPrincipal,
      },
      {
        transaction,
      },
    );

    /*
     * Actualizamos los valores dinámicos del perfil.
     */
    await perfil.update(
      {
        puntaje_crediticio: puntajeCrediticioResultante,

        puntaje_fraude: puntajeFraude,

        nivel_riesgo: nivelRiesgo,

        requiere_verificacion_adicional:
          resultadoDecision.decision === DECISIONES.VERIFICACION_ADICIONAL ||
          resultadoDecision.decision === DECISIONES.REVISION_MANUAL,

        bloqueado_preventivamente: resultadoDecision.bloqueoPreventivo,

        motivo_bloqueo: resultadoDecision.bloqueoPreventivo
          ? resultadoDecision.motivoPrincipal
          : null,

        ultima_evaluacion: new Date(),

        ultima_actualizacion: new Date(),
      },
      {
        transaction,
      },
    );

    if (debeGestionarTransaccion) {
      await transaction.commit();
    }

    return {
      evaluacion_id: evaluacion.id,

      cliente_id: clienteIdNumerico,

      orden_id: ordenId || null,

      motor: {
        version: VERSION_MOTOR,

        duracion_ms: Date.now() - inicio,
      },

      resultado: {
        decision: resultadoDecision.decision,

        aprobado: [
          DECISIONES.APROBACION_NORMAL,

          DECISIONES.APROBACION_ENGANCHE_MAYOR,

          DECISIONES.MONTO_REDUCIDO,

          DECISIONES.CUOTAS_REDUCIDAS,
        ].includes(resultadoDecision.decision),

        requiere_verificacion_adicional:
          resultadoDecision.decision === DECISIONES.VERIFICACION_ADICIONAL,

        requiere_revision_manual: resultadoDecision.requiereRevisionManual,

        bloqueado: resultadoDecision.bloqueoPreventivo,

        puntaje_crediticio: puntajeCrediticioResultante,

        puntaje_fraude: puntajeFraude,

        nivel_riesgo: nivelRiesgo,

        monto_solicitado: monto,

        monto_financiable: resultadoDecision.montoFinanciable,

        porcentaje_enganche: resultadoDecision.porcentajeEnganche,

        numero_cuotas_solicitadas: cuotasSolicitadas,

        numero_cuotas_permitidas: resultadoDecision.numeroCuotasPermitidas,

        motivo: resultadoDecision.motivoPrincipal,

        explicacion: resultadoDecision.explicacion,
      },

      senales: todasLasSenales.map((senal) => ({
        codigo: senal.codigo_senal,

        nombre: senal.nombre_senal,

        categoria: senal.categoria,

        activada: senal.regla_activada,

        severidad: senal.severidad,

        impacto: Number(senal.impacto_puntaje),
      })),

      alertas_generadas: alertas.length,
    };
  } catch (error) {
    if (debeGestionarTransaccion && !transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

export { DECISIONES, VERSION_MOTOR };
