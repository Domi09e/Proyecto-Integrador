import crypto from "crypto";
import { Op } from "sequelize";
import db from "../models/index.js";

const { HistorialContextoCompra, sequelize } = db;

/* =====================================================
   CONFIGURACIÓN
===================================================== */

const CONFIG = {
  /*
    Para considerar que ya existe un patrón
    de montos necesitamos al menos 3 compras
    anteriores confiables.
   */
  MIN_COMPRAS_PARA_PATRON: 3,

  /*
    Cantidad máxima de compras anteriores
    utilizadas para calcular comportamiento.
   */
  MAX_HISTORIAL_ANALIZADO: 20,

  /*
    Distancia a partir de la cual consideramos
    que la ubicación es diferente.
   */
  DISTANCIA_UBICACION_NUEVA_KM: 50,

  /*
    Distancia especialmente relevante.
    */
  DISTANCIA_UBICACION_INCONSISTENTE_KM: 250,

  /*
    Una compra muy diferente al patrón se
    considera sospechosa cuando supera:
   
    - 2.5 veces el promedio histórico
    Y
    - 1.75 veces el máximo histórico.
   */
  FACTOR_PROMEDIO_ALERTA: 2.5,
  FACTOR_MAXIMO_ALERTA: 1.75,
};

/* =====================================================
   HELPERS
===================================================== */

const numeroSeguro = (valor, fallback = 0) => {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : fallback;
};

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;

  return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
};

const crearHash = (valor) => {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  return crypto.createHash("sha256").update(String(valor).trim()).digest("hex");
};

const normalizarTexto = (valor) => {
  if (valor === null || valor === undefined) {
    return null;
  }

  const texto = String(valor).trim();

  return texto || null;
};

/* =====================================================
   NORMALIZAR IP
===================================================== */

const normalizarIp = (ip) => {
  if (!ip) {
    return null;
  }

  let resultado = String(ip).split(",")[0].trim();

  /*
   * Ejemplo:
   * ::ffff:192.168.1.10
   */
  if (resultado.startsWith("::ffff:")) {
    resultado = resultado.substring(7);
  }

  /*
   * Desarrollo local.
   */
  if (resultado === "::1") {
    resultado = "127.0.0.1";
  }

  return resultado || null;
};

/* =====================================================
   DISTANCIA HAVERSINE
===================================================== */

const convertirRadianes = (grados) => {
  return (Number(grados) * Math.PI) / 180;
};

const calcularDistanciaKm = (latitud1, longitud1, latitud2, longitud2) => {
  const lat1 = Number(latitud1);

  const lon1 = Number(longitud1);

  const lat2 = Number(latitud2);

  const lon2 = Number(longitud2);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const radioTierraKm = 6371;

  const diferenciaLatitud = convertirRadianes(lat2 - lat1);

  const diferenciaLongitud = convertirRadianes(lon2 - lon1);

  const a =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(convertirRadianes(lat1)) *
      Math.cos(convertirRadianes(lat2)) *
      Math.sin(diferenciaLongitud / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return redondear(radioTierraKm * c, 2);
};

/* =====================================================
   ESTADÍSTICAS DE MONTOS
===================================================== */

const calcularEstadisticasMontos = (registros) => {
  const montos = registros
    .map((registro) => numeroSeguro(registro.monto, NaN))
    .filter((monto) => Number.isFinite(monto));

  if (montos.length === 0) {
    return {
      cantidad: 0,

      promedio: null,

      minimo: null,

      maximo: null,
    };
  }

  const total = montos.reduce((acumulado, monto) => acumulado + monto, 0);

  return {
    cantidad: montos.length,

    promedio: redondear(total / montos.length),

    minimo: redondear(Math.min(...montos)),

    maximo: redondear(Math.max(...montos)),
  };
};

/* =====================================================
   DETECTAR MONTO FUERA DE PATRÓN
===================================================== */

const analizarMonto = ({ montoActual, estadisticas }) => {
  const monto = numeroSeguro(montoActual);

  const cantidad = Number(estadisticas.cantidad || 0);

  const promedio = numeroSeguro(estadisticas.promedio);

  const maximo = numeroSeguro(estadisticas.maximo);

  /*
   * Todavía no existe historial suficiente
   * para establecer un patrón confiable.
   */
  if (
    cantidad < CONFIG.MIN_COMPRAS_PARA_PATRON ||
    promedio <= 0 ||
    maximo <= 0
  ) {
    return {
      monto_fuera_patron: false,

      porcentaje_variacion_monto: null,

      factor_promedio: null,

      factor_maximo: null,

      motivo:
        "Todavía no existe historial suficiente para establecer un patrón de consumo.",
    };
  }

  const factorPromedio = monto / promedio;

  const factorMaximo = monto / maximo;

  const porcentajeVariacion = ((monto - promedio) / promedio) * 100;

  const superaPromedio = factorPromedio >= CONFIG.FACTOR_PROMEDIO_ALERTA;

  const superaMaximo = factorMaximo >= CONFIG.FACTOR_MAXIMO_ALERTA;

  const fueraPatron = superaPromedio && superaMaximo;

  return {
    monto_fuera_patron: fueraPatron,

    porcentaje_variacion_monto: redondear(porcentajeVariacion, 2),

    factor_promedio: redondear(factorPromedio, 2),

    factor_maximo: redondear(factorMaximo, 2),

    motivo: fueraPatron
      ? `El monto actual es ${redondear(
          factorPromedio,
          2,
        )} veces el promedio histórico y ${redondear(
          factorMaximo,
          2,
        )} veces el máximo registrado.`
      : "El monto se encuentra dentro de un comportamiento razonable respecto al historial.",
  };
};

/* =====================================================
   ANALIZAR UBICACIÓN
===================================================== */

const analizarUbicacion = ({
  historial,
  latitud,
  longitud,
  ciudad,
  region,
  pais,
}) => {
  const latActual = Number(latitud);

  const lonActual = Number(longitud);

  const tieneCoordenadas =
    Number.isFinite(latActual) && Number.isFinite(lonActual);

  /*
   * Historial que posee ubicación.
   */
  const ubicacionesPrevias = historial.filter(
    (registro) => registro.latitud !== null && registro.longitud !== null,
  );

  /*
   * Si tenemos coordenadas,
   * comparamos geográficamente.
   */
  if (tieneCoordenadas && ubicacionesPrevias.length > 0) {
    const distancias = ubicacionesPrevias
      .map((registro) => {
        const distancia = calcularDistanciaKm(
          registro.latitud,
          registro.longitud,
          latActual,
          lonActual,
        );

        return {
          registro,
          distancia,
        };
      })
      .filter((item) => item.distancia !== null);

    if (distancias.length > 0) {
      /*
       * Distancia respecto a la ubicación
       * conocida más cercana.
       */
      const masCercana = distancias.reduce((menor, actual) =>
        actual.distancia < menor.distancia ? actual : menor,
      );

      const distanciaMinima = masCercana.distancia;

      const ultimaUbicacion = ubicacionesPrevias[0];

      const distanciaUltima = calcularDistanciaKm(
        ultimaUbicacion.latitud,
        ultimaUbicacion.longitud,
        latActual,
        lonActual,
      );

      return {
        ubicacion_nueva: distanciaMinima >= CONFIG.DISTANCIA_UBICACION_NUEVA_KM,

        ubicacion_inconsistente:
          distanciaUltima !== null &&
          distanciaUltima >= CONFIG.DISTANCIA_UBICACION_INCONSISTENTE_KM,

        distancia_ubicacion_anterior_km: distanciaUltima,

        distancia_ubicacion_conocida_mas_cercana_km: distanciaMinima,
      };
    }
  }

  /*
   * Fallback:
   * si no tenemos coordenadas, comparamos
   * ciudad/región/país.
   */
  const ciudadActual = normalizarTexto(ciudad)?.toLowerCase();

  const regionActual = normalizarTexto(region)?.toLowerCase();

  const paisActual = normalizarTexto(pais)?.toLowerCase();

  const registrosUbicacionTexto = historial.filter(
    (registro) => registro.ciudad || registro.region || registro.pais,
  );

  if (registrosUbicacionTexto.length === 0) {
    /*
     * Primera ubicación conocida.
     * La registramos, pero no la tratamos como
     * sospechosa porque todavía no existe patrón.
     */
    return {
      ubicacion_nueva: false,

      ubicacion_inconsistente: false,

      distancia_ubicacion_anterior_km: null,

      distancia_ubicacion_conocida_mas_cercana_km: null,
    };
  }

  const ubicacionConocida = registrosUbicacionTexto.some((registro) => {
    const ciudadAnterior = normalizarTexto(registro.ciudad)?.toLowerCase();

    const regionAnterior = normalizarTexto(registro.region)?.toLowerCase();

    const paisAnterior = normalizarTexto(registro.pais)?.toLowerCase();

    if (ciudadActual && ciudadAnterior) {
      return ciudadActual === ciudadAnterior;
    }

    if (regionActual && regionAnterior) {
      return regionActual === regionAnterior;
    }

    if (paisActual && paisAnterior) {
      return paisActual === paisAnterior;
    }

    return false;
  });

  return {
    ubicacion_nueva: !ubicacionConocida,

    /*
     * Sin coordenadas no afirmamos
     * automáticamente que sea una ubicación
     * geográficamente inconsistente.
     */
    ubicacion_inconsistente: false,

    distancia_ubicacion_anterior_km: null,

    distancia_ubicacion_conocida_mas_cercana_km: null,
  };
};

/* =====================================================
   OBTENER HISTORIAL CONFIABLE
===================================================== */

export const obtenerHistorialContextoCliente = async (
  clienteId,
  { transaction = null, limite = CONFIG.MAX_HISTORIAL_ANALIZADO } = {},
) => {
  const id = Number(clienteId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Cliente inválido para consultar historial de contexto.");
  }

  return HistorialContextoCompra.findAll({
    where: {
      cliente_id: id,

      es_referencia_comportamiento: true,
    },

    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],

    limit: Math.max(
      1,
      Math.min(Number(limite) || CONFIG.MAX_HISTORIAL_ANALIZADO, 50),
    ),

    transaction,
  });
};

/* =====================================================
   ANALIZAR CONTEXTO DE COMPRA
===================================================== */

export const analizarContextoCompra = async ({
  clienteId,

  monto,

  dispositivoId = null,

  ip = null,

  userAgent = null,

  latitud = null,

  longitud = null,

  precisionUbicacion = null,

  ciudad = null,

  region = null,

  pais = null,

  sessionId = null,

  transaction = null,
}) => {
  const id = Number(clienteId);

  const montoActual = Number(monto);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("Cliente inválido.");

    error.status = 400;

    throw error;
  }

  if (!Number.isFinite(montoActual) || montoActual <= 0) {
    const error = new Error("Monto inválido para analizar comportamiento.");

    error.status = 400;

    throw error;
  }

  const ipNormalizada = normalizarIp(ip);

  const dispositivoNormalizado = normalizarTexto(dispositivoId);

  const userAgentNormalizado = normalizarTexto(userAgent);

  /*
   * Mientras implementamos el identificador
   * persistente del navegador:
   *
   * - si existe dispositivo_id, usamos ese valor;
   * - de lo contrario, usamos user-agent como
   *   identificación secundaria.
   */
  const identidadDispositivo = dispositivoNormalizado || userAgentNormalizado;

  const dispositivoHash = crearHash(identidadDispositivo);

  const ipHash = crearHash(ipNormalizada);

  const historial = await obtenerHistorialContextoCliente(id, {
    transaction,
  });

  /* ==========================================
       DISPOSITIVO
    ========================================== */

  const historialDispositivos = historial.filter(
    (registro) => registro.dispositivo_hash,
  );

  let dispositivoNuevo = false;

  if (dispositivoHash && historialDispositivos.length > 0) {
    dispositivoNuevo = !historialDispositivos.some(
      (registro) => registro.dispositivo_hash === dispositivoHash,
    );
  }

  /*
   * Primer dispositivo conocido:
   * no lo consideramos fraude.
   */
  if (historialDispositivos.length === 0) {
    dispositivoNuevo = false;
  }

  /* ==========================================
       IP
    ========================================== */

  const historialIps = historial.filter((registro) => registro.ip_hash);

  let ipNueva = false;

  if (ipHash && historialIps.length > 0) {
    ipNueva = !historialIps.some((registro) => registro.ip_hash === ipHash);
  }

  /*
   * Primera IP conocida:
   * no genera alerta por sí sola.
   */
  if (historialIps.length === 0) {
    ipNueva = false;
  }

  /* ==========================================
       UBICACIÓN
    ========================================== */

  const analisisUbicacion = analizarUbicacion({
    historial,

    latitud,

    longitud,

    ciudad,

    region,

    pais,
  });

  /* ==========================================
       MONTOS
    ========================================== */

  const estadisticas = calcularEstadisticasMontos(historial);

  const analisisMonto = analizarMonto({
    montoActual,

    estadisticas,
  });

  return {
    cliente_id: id,

    session_id: normalizarTexto(sessionId),

    monto: redondear(montoActual),

    /*
     * Datos actuales.
     */
    dispositivo_id: dispositivoNormalizado,

    dispositivo_hash: dispositivoHash,

    ip: ipNormalizada,

    ip_hash: ipHash,

    user_agent: userAgentNormalizado,

    latitud: Number.isFinite(Number(latitud)) ? Number(latitud) : null,

    longitud: Number.isFinite(Number(longitud)) ? Number(longitud) : null,

    precision_ubicacion: Number.isFinite(Number(precisionUbicacion))
      ? Number(precisionUbicacion)
      : null,

    ciudad: normalizarTexto(ciudad),

    region: normalizarTexto(region),

    pais: normalizarTexto(pais),

    /*
     * Señales calculadas automáticamente.
     */
    dispositivo_nuevo: dispositivoNuevo,

    ip_nueva: ipNueva,

    ubicacion_nueva: analisisUbicacion.ubicacion_nueva,

    ubicacion_inconsistente: analisisUbicacion.ubicacion_inconsistente,

    distancia_ubicacion_anterior_km:
      analisisUbicacion.distancia_ubicacion_anterior_km,

    /*
     * Comportamiento monetario.
     */
    monto_fuera_patron: analisisMonto.monto_fuera_patron,

    promedio_monto_historico: estadisticas.promedio,

    monto_minimo_historico: estadisticas.minimo,

    monto_maximo_historico: estadisticas.maximo,

    cantidad_compras_historial: estadisticas.cantidad,

    porcentaje_variacion_monto: analisisMonto.porcentaje_variacion_monto,

    factor_promedio: analisisMonto.factor_promedio,

    factor_maximo: analisisMonto.factor_maximo,

    motivo_monto: analisisMonto.motivo,

    /*
     * Información que podremos enseñar
     * en Centro de Riesgo.
     */
    resumen: {
      cantidad_compras: estadisticas.cantidad,

      promedio: estadisticas.promedio,

      minimo: estadisticas.minimo,

      maximo: estadisticas.maximo,

      monto_actual: redondear(montoActual),

      porcentaje_variacion: analisisMonto.porcentaje_variacion_monto,

      dispositivo_nuevo: dispositivoNuevo,

      ip_nueva: ipNueva,

      ubicacion_nueva: analisisUbicacion.ubicacion_nueva,

      ubicacion_inconsistente: analisisUbicacion.ubicacion_inconsistente,
    },
  };
};

/* =====================================================
   REGISTRAR EVALUACIÓN DE CONTEXTO
===================================================== */

export const registrarContextoCompra = async ({
  analisis,

  evaluacionId = null,

  ordenId = null,

  decision = null,

  estadoOperacion = "evaluada",

  esReferenciaComportamiento = false,

  transaction = null,
}) => {
  if (!analisis) {
    throw new Error("No se recibió el análisis de contexto.");
  }

  return HistorialContextoCompra.create(
    {
      cliente_id: analisis.cliente_id,

      evaluacion_id: evaluacionId || null,

      orden_id: ordenId || null,

      session_id: analisis.session_id || null,

      monto: analisis.monto,

      dispositivo_id: analisis.dispositivo_id || null,

      dispositivo_hash: analisis.dispositivo_hash || null,

      ip: analisis.ip || null,

      ip_hash: analisis.ip_hash || null,

      user_agent: analisis.user_agent || null,

      latitud: analisis.latitud,

      longitud: analisis.longitud,

      precision_ubicacion: analisis.precision_ubicacion,

      ciudad: analisis.ciudad,

      region: analisis.region,

      pais: analisis.pais,

      dispositivo_nuevo: Boolean(analisis.dispositivo_nuevo),

      ip_nueva: Boolean(analisis.ip_nueva),

      ubicacion_nueva: Boolean(analisis.ubicacion_nueva),

      ubicacion_inconsistente: Boolean(analisis.ubicacion_inconsistente),

      monto_fuera_patron: Boolean(analisis.monto_fuera_patron),

      promedio_monto_historico: analisis.promedio_monto_historico,

      monto_minimo_historico: analisis.monto_minimo_historico,

      monto_maximo_historico: analisis.monto_maximo_historico,

      cantidad_compras_historial: analisis.cantidad_compras_historial || 0,

      porcentaje_variacion_monto: analisis.porcentaje_variacion_monto,

      distancia_ubicacion_anterior_km: analisis.distancia_ubicacion_anterior_km,

      decision: decision || null,

      estado_operacion: estadoOperacion,

      es_referencia_comportamiento: Boolean(esReferenciaComportamiento),
    },
    {
      transaction,
    },
  );
};

/* =====================================================
   FORMALIZAR CONTEXTO DESPUÉS DE APROBAR COMPRA
===================================================== */

export const marcarContextoComoFormalizado = async ({
  evaluacionId,

  ordenId,

  transaction = null,
}) => {
  const evaluacion = Number(evaluacionId);

  const orden = Number(ordenId);

  if (!Number.isInteger(evaluacion) || evaluacion <= 0) {
    throw new Error("Evaluación inválida.");
  }

  const contexto = await HistorialContextoCompra.findOne({
    where: {
      evaluacion_id: evaluacion,
    },

    transaction,
  });

  if (!contexto) {
    return null;
  }

  contexto.orden_id =
    Number.isInteger(orden) && orden > 0 ? orden : contexto.orden_id;

  contexto.estado_operacion = "formalizada";

  /*
   * La compra ya fue aceptada y formalizada,
   * por tanto puede formar parte del patrón
   * futuro del cliente.
   */
  contexto.es_referencia_comportamiento = true;

  await contexto.save({
    transaction,
  });

  return contexto;
};

/* =====================================================
   CAMBIAR ESTADO DEL CONTEXTO
===================================================== */

export const actualizarEstadoContexto = async ({
  evaluacionId,

  estadoOperacion,

  decision = null,

  esReferenciaComportamiento = false,

  transaction = null,
}) => {
  const estadosPermitidos = [
    "evaluada",
    "formalizada",
    "rechazada",
    "revision_manual",
    "bloqueada",
    "cancelada",
  ];

  if (!estadosPermitidos.includes(estadoOperacion)) {
    throw new Error("Estado de contexto inválido.");
  }

  const contexto = await HistorialContextoCompra.findOne({
    where: {
      evaluacion_id: Number(evaluacionId),
    },

    transaction,
  });

  if (!contexto) {
    return null;
  }

  contexto.estado_operacion = estadoOperacion;

  contexto.decision = decision || contexto.decision;

  contexto.es_referencia_comportamiento = Boolean(esReferenciaComportamiento);

  await contexto.save({
    transaction,
  });

  return contexto;
};

export { CONFIG as PURCHASE_CONTEXT_CONFIG, calcularDistanciaKm };
