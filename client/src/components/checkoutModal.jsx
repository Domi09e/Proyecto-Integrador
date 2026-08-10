import { useEffect, useState } from "react";

import {
  X,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  Wallet,
  ShieldCheck,
  CreditCard,
  RefreshCw,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../api/axios";

/* =============================================
   PLANES
============================================= */

const PREFS_LABELS = {
  pago_completo: "1 Pago (Contado)",

  pagar_despues: "Pagar en 30 días (1 Cuota)",

  "4_quincenas": "4 Cuotas Quincenales (0% interés)",

  "12_meses": "12 Cuotas Mensuales",

  "24_meses": "24 Cuotas Mensuales",
};

const PREFS_DIVISOR = {
  pago_completo: 1,
  pagar_despues: 1,
  "4_quincenas": 4,
  "12_meses": 12,
  "24_meses": 24,
};

/* =============================================
   SESSION ID
============================================= */

const generarSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function CheckoutModal({ tienda, onClose, initialAmount }) {
  const navigate = useNavigate();

  const [monto, setMonto] = useState(
    initialAmount ? initialAmount.toString() : "",
  );

  const [userProfile, setUserProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);

  const [procesandoSinEnganche, setProcesandoSinEnganche] = useState(false);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [propuestaRiesgo, setPropuestaRiesgo] = useState(null);

  const [evaluacionId, setEvaluacionId] = useState(null);

  const [causasRechazo, setCausasRechazo] = useState([]);

  const [accionesRecomendadas, setAccionesRecomendadas] = useState([]);

  const [metodosPago, setMetodosPago] = useState([]);

  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");

  const [checkoutSessionId] = useState(generarSessionId);

  /* =============================================
     CARGAR INFORMACIÓN
  ============================================= */

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);

        setError("");

        const [perfilResponse, metodosResponse] = await Promise.all([
          api.get("/client/profile"),

          api.get("/client/payment-methods"),
        ]);

        setUserProfile(perfilResponse.data);

        const data = metodosResponse.data;

        const methods = Array.isArray(data)
          ? data
          : Array.isArray(data?.methods)
            ? data.methods
            : Array.isArray(data?.metodos)
              ? data.metodos
              : Array.isArray(data?.data)
                ? data.data
                : [];

        setMetodosPago(methods);

        const predeterminado =
          methods.find((item) => Boolean(item.es_predeterminado)) || methods[0];

        setMetodoPagoSeleccionado(
          predeterminado ? String(predeterminado.id) : "",
        );
      } catch (err) {
        console.error("Error cargando checkout:", err);

        setError(
          err.response?.data?.message ||
            "No se pudo cargar la información del checkout.",
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  /* =============================================
     VALORES
  ============================================= */

  const montoNum = Number.parseFloat(monto) || 0;

  const creditoDisponible = Number(userProfile?.poder_credito || 0);

  const excedeCredito = montoNum > creditoDisponible + 0.009;

  const montoInvalido = !Number.isFinite(montoNum) || montoNum <= 0;

  const pref = userProfile?.preferencia_bnpl || "4_quincenas";

  const numCuotas = PREFS_DIVISOR[pref] || 4;

  const montoCuota =
    montoNum > 0 ? Number((montoNum / numCuotas).toFixed(2)) : 0;

  /* =============================================
     PROPUESTA
  ============================================= */

  const montoOriginalPropuesta = Number(
    propuestaRiesgo?.monto_original ?? montoNum,
  );

  const montoFinanciableMotor = Number(
    propuestaRiesgo?.monto_financiable ?? montoOriginalPropuesta,
  );

  const porcentajeEnganche = Number(propuestaRiesgo?.porcentaje_enganche ?? 0);

  /*
   * El enganche explícito se calcula
   * SOLAMENTE por su porcentaje.
   *
   * Una reducción del monto ya no se
   * interpreta como enganche.
   */
  const montoEnganche = Number(
    (montoOriginalPropuesta * (porcentajeEnganche / 100)).toFixed(2),
  );

  const montoFinanciadoPorEnganche = Number(
    (montoOriginalPropuesta - montoEnganche).toFixed(2),
  );

  const montoFinanciadoFinal =
    porcentajeEnganche > 0 ? montoFinanciadoPorEnganche : montoFinanciableMotor;

  const numeroCuotasPropuesta = Number(
    propuestaRiesgo?.numero_cuotas_permitidas ??
      propuestaRiesgo?.numero_cuotas ??
      numCuotas,
  );

  const montoCuotaPropuesta =
    montoFinanciadoFinal > 0 && numeroCuotasPropuesta > 0
      ? Number((montoFinanciadoFinal / numeroCuotasPropuesta).toFixed(2))
      : 0;

  const requiereEnganche =
    Boolean(propuestaRiesgo) &&
    porcentajeEnganche > 0.009 &&
    montoEnganche > 0.009;

  const faltaMetodoPago = requiereEnganche && !metodoPagoSeleccionado;

  const montoFueReducido =
    Boolean(propuestaRiesgo) &&
    montoFinanciableMotor < montoOriginalPropuesta - 0.009;

  const cuotasFueronReducidas =
    Boolean(propuestaRiesgo) &&
    numeroCuotasPropuesta !==
      Number(propuestaRiesgo?.numero_cuotas_solicitadas ?? numCuotas);

  /* =============================================
     LIMPIAR EVALUACIÓN
  ============================================= */

  const limpiarEvaluacion = () => {
    setPropuestaRiesgo(null);

    setEvaluacionId(null);

    setError("");

    setMensaje("");

    setCausasRechazo([]);

    setAccionesRecomendadas([]);
  };

  const handleMontoChange = (event) => {
    setMonto(event.target.value);

    limpiarEvaluacion();
  };

  /* =============================================
     CHECKOUT
  ============================================= */

  const handleCheckout = async (event) => {
    event.preventDefault();

    if (processing) {
      return;
    }

    if (montoInvalido) {
      setError("Debes indicar un monto válido mayor que cero.");

      return;
    }

    /*
     * REGLA FRONTEND:
     * NO mandar al motor una compra
     * superior al crédito.
     */
    if (excedeCredito) {
      setError(
        `El total de la compra supera tu crédito disponible. ` +
          `Debes reducir la compra a RD$ ${creditoDisponible.toFixed(
            2,
          )} o menos.`,
      );

      return;
    }

    try {
      setProcessing(true);

      limpiarEvaluacion();

      const payload = {
        tiendaId: tienda.id,

        monto: montoNum,

        metodo_pago: "bnpl_balance",

        session_id: checkoutSessionId,

        dispositivo_nuevo: false,

        ip_nueva: false,

        ubicacion_nueva: false,

        ubicacion_inconsistente: false,

        intentos_recientes: 0,

        compras_ultimos_10_minutos: 0,

        cambios_dispositivo_24h: 0,

        segundos_interaccion: 30,
      };

      const response = await api.post("/bnpl/checkout", payload);

      alert(response.data?.message || "Compra realizada correctamente.");

      navigate("/cartera");

      onClose();
    } catch (err) {
      console.error("Error checkout:", err);

      const respuesta = err.response?.data || {};

      const codigo = respuesta.codigo;

      /* ===============================
           MONTO > CRÉDITO
        =============================== */

      if (codigo === "MONTO_SUPERA_CREDITO_ASIGNADO") {
        setError(
          respuesta.message || "La compra supera tu crédito disponible.",
        );

        return;
      }

      /* ===============================
           REDUCIR MONTO
        =============================== */

      if (codigo === "REDUCIR_MONTO_COMPRA") {
        setError(respuesta.message || "Debes reducir el monto de la compra.");

        return;
      }

      /* ===============================
           PROPUESTA
        =============================== */

      if (
        codigo === "CONDICIONES_AJUSTADAS_REQUIEREN_ACEPTACION" ||
        codigo === "ENGANCHE_REQUIERE_ACEPTACION"
      ) {
        setPropuestaRiesgo(respuesta.propuesta || null);

        setEvaluacionId(respuesta.evaluacion_id || null);

        setError("");

        return;
      }

      if (codigo === "CUOTAS_AJUSTADAS_REQUIEREN_ACEPTACION") {
        setPropuestaRiesgo({
          decision: "cuotas_reducidas",

          monto_original: montoNum,

          monto_financiable: respuesta.propuesta?.monto_financiable ?? montoNum,

          porcentaje_enganche: 0,

          numero_cuotas_solicitadas:
            respuesta.propuesta?.numero_cuotas_solicitadas ?? numCuotas,

          numero_cuotas_permitidas:
            respuesta.propuesta?.numero_cuotas_permitidas,

          motivo: respuesta.message,

          explicacion:
            "El motor ajustó el número de cuotas según tu perfil actual.",
        });

        setEvaluacionId(respuesta.evaluacion_id || null);

        setError("");

        return;
      }

      /* ===============================
           DUPLICADA
        =============================== */

      if (codigo === "SOLICITUD_DUPLICADA") {
        setError(
          "Esta compra ya fue evaluada recientemente. No pulses el botón varias veces.",
        );

        return;
      }

      /* ===============================
           FRAUDE
        =============================== */

      if (codigo === "OPERACION_BLOQUEADA_POR_RIESGO") {
        setError(respuesta.message || "La compra fue bloqueada por seguridad.");

        return;
      }

      /* ===============================
           VERIFICACIÓN
        =============================== */

      if (codigo === "VERIFICACION_ADICIONAL_REQUERIDA") {
        setError(
          respuesta.message || "Debes completar una verificación adicional.",
        );

        return;
      }

      /* ===============================
           REVISIÓN
        =============================== */

      if (codigo === "REVISION_MANUAL_REQUERIDA") {
        setMensaje(
          respuesta.message || "La compra fue enviada a revisión manual.",
        );

        return;
      }

      /* ===============================
           RECHAZO
        =============================== */

      if (codigo === "FINANCIAMIENTO_RECHAZADO") {
        setError(respuesta.message || "El financiamiento no fue aprobado.");

        setCausasRechazo(
          Array.isArray(respuesta.causas) ? respuesta.causas : [],
        );

        setAccionesRecomendadas(
          Array.isArray(respuesta.acciones_recomendadas)
            ? respuesta.acciones_recomendadas
            : [],
        );

        setEvaluacionId(respuesta.evaluacion_id || null);

        return;
      }

      setError(respuesta.message || "Ocurrió un error al procesar la compra.");
    } finally {
      setProcessing(false);
    }
  };

  /* =============================================
     ACEPTAR PROPUESTA
  ============================================= */

  const handleAceptarPropuesta = async () => {
    if (processing) {
      return;
    }

    if (!evaluacionId || !propuestaRiesgo) {
      setError("No se encontró una propuesta válida.");

      return;
    }

    /*
     * Protección adicional.
     */
    if (montoOriginalPropuesta > creditoDisponible + 0.009) {
      setError(
        `Esta compra supera tu crédito disponible de RD$ ${creditoDisponible.toFixed(
          2,
        )}.`,
      );

      return;
    }

    if (montoFueReducido && porcentajeEnganche <= 0) {
      setError(
        `Debes reducir realmente el monto de la compra a RD$ ${montoFinanciableMotor.toFixed(
          2,
        )} o menos.`,
      );

      return;
    }

    if (requiereEnganche && !metodoPagoSeleccionado) {
      setError("Debes seleccionar un método para pagar el enganche.");

      return;
    }

    try {
      setProcessing(true);

      setError("");

      setMensaje("");

      const payload = {
        evaluacion_id: evaluacionId,

        tienda_id: tienda.id,

        session_id: checkoutSessionId,
      };

      if (requiereEnganche) {
        payload.metodo_pago_id = Number(metodoPagoSeleccionado);
      }

      const response = await api.post("/bnpl/accept-risk-proposal", payload);

      alert(response.data?.message || "Propuesta aceptada.");

      navigate("/cartera");

      onClose();
    } catch (err) {
      console.error("Error aceptando propuesta:", err);

      const respuesta = err.response?.data || {};

      const codigo = respuesta.codigo;

      if (codigo === "MONTO_SUPERA_CREDITO_ASIGNADO") {
        setError(respuesta.message);

        return;
      }

      if (codigo === "REDUCIR_MONTO_COMPRA") {
        setError(respuesta.message || "Debes reducir el monto de la compra.");

        return;
      }

      if (codigo === "METODO_PAGO_REQUERIDO") {
        setError("Debes seleccionar un método de pago.");

        return;
      }

      if (codigo === "METODO_PAGO_INVALIDO") {
        setError("El método seleccionado no es válido.");

        return;
      }

      if (codigo === "METODO_PAGO_SIN_TOKEN") {
        setError("El método seleccionado no está habilitado para cobros.");

        return;
      }

      if (codigo === "PAGO_ENGANCHE_RECHAZADO") {
        setError(respuesta.message || "El pago del enganche fue rechazado.");

        return;
      }

      if (codigo === "ENGANCHE_YA_PROCESADO") {
        setError(respuesta.message || "Este enganche ya fue procesado.");

        return;
      }

      if (codigo === "PROPUESTA_YA_UTILIZADA") {
        setError("Esta propuesta ya fue utilizada.");

        return;
      }

      setError(respuesta.message || "No se pudo aceptar la propuesta.");
    } finally {
      setProcessing(false);
    }
  };

  /* =============================================
     SOLICITAR OPCIÓN SIN ENGANCHE
  ============================================= */

  const handleSolicitarSinEnganche = async () => {
    if (processing || procesandoSinEnganche) {
      return;
    }

    if (!evaluacionId || !propuestaRiesgo) {
      setError("No se encontró una evaluación válida.");

      return;
    }

    if (montoOriginalPropuesta > creditoDisponible + 0.009) {
      setError(
        `La compra supera tu crédito disponible de RD$ ${creditoDisponible.toFixed(
          2,
        )}.`,
      );

      return;
    }

    try {
      setProcesandoSinEnganche(true);

      setError("");

      setMensaje("Buscando una alternativa sin enganche...");

      const response = await api.post("/bnpl/request-no-down-payment", {
        evaluacion_id: evaluacionId,

        tienda_id: tienda.id,

        session_id: checkoutSessionId,
      });

      const nuevaPropuesta = response.data?.propuesta;

      if (!nuevaPropuesta) {
        setMensaje("");

        setError(response.data?.message || "No se encontró una alternativa.");

        return;
      }

      setPropuestaRiesgo(nuevaPropuesta);

      setEvaluacionId(response.data?.evaluacion_id || evaluacionId);

      setMensaje(
        response.data?.message || "Se encontró una alternativa sin enganche.",
      );
    } catch (err) {
      console.error("Error alternativa sin enganche:", err);

      const respuesta = err.response?.data || {};

      setMensaje("");

      if (respuesta.codigo === "MONTO_SUPERA_CREDITO_ASIGNADO") {
        setError(respuesta.message);

        return;
      }

      if (
        respuesta.codigo === "SIN_ENGANCHE_NO_DISPONIBLE" ||
        respuesta.codigo === "ALTERNATIVA_SIN_ENGANCHE_NO_DISPONIBLE"
      ) {
        setError(respuesta.message || "No existe una opción sin enganche.");

        return;
      }

      setError(
        respuesta.message || "No se pudo generar una alternativa sin enganche.",
      );
    } finally {
      setProcesandoSinEnganche(false);
    }
  };

  /* =============================================
     DETALLES
  ============================================= */

  const handleVerDetallesEvaluacion = () => {
    sessionStorage.setItem(
      "ultima_evaluacion_riesgo",

      JSON.stringify({
        evaluacion_id: evaluacionId,

        message: error,

        causas: causasRechazo,

        acciones_recomendadas: accionesRecomendadas,

        fecha: new Date().toISOString(),

        tienda: {
          id: tienda.id,

          nombre: tienda.nombre || tienda.name,
        },

        monto: montoNum,
      }),
    );

    navigate("/perfil-riesgo/detalles");

    onClose();
  };

  const handleCerrar = () => {
    if (processing || procesandoSinEnganche) {
      return;
    }

    onClose();
  };

  /* =============================================
     UI
  ============================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}

        <div className="bg-slate-950 p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <p className="text-emerald-400 text-xs uppercase tracking-wider font-bold mb-1">
              Confirmar Compra BNPL
            </p>

            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="text-emerald-400" size={24} />

              {tienda.nombre || tienda.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCerrar}
            disabled={processing || procesandoSinEnganche}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-full disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center">
              <div className="mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />

              <p className="mt-3 text-sm text-slate-500">
                Verificando crédito...
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-6">
              {/* CRÉDITO */}

              <div
                className={`border rounded-xl p-4 ${
                  excedeCredito
                    ? "bg-red-50 border-red-200"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      excedeCredito
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <Wallet size={20} />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold uppercase ${
                        excedeCredito ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      Tu crédito disponible
                    </p>

                    <p
                      className={`text-lg font-bold ${
                        excedeCredito ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      RD${" "}
                      {creditoDisponible.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* MONTO */}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total a pagar
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    $
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={handleMontoChange}
                    readOnly={Boolean(initialAmount)}
                    className={`w-full pl-8 pr-4 py-3 text-lg font-semibold border-2 rounded-xl outline-none ${
                      excedeCredito
                        ? "border-red-300 bg-red-50 text-red-700"
                        : initialAmount
                          ? "border-slate-200 bg-slate-100 text-slate-600"
                          : "border-slate-200 focus:border-slate-900"
                    }`}
                  />
                </div>

                {excedeCredito && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600 font-semibold">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />

                    <span>
                      El total supera tu crédito disponible. Debes reducir la
                      compra a{" "}
                      {creditoDisponible.toLocaleString("es-DO", {
                        style: "currency",

                        currency: "DOP",
                      })}{" "}
                      o menos.
                    </span>
                  </div>
                )}
              </div>

              {/* PLAN */}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <CheckCircle size={18} />

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Plan activo
                    </p>

                    <p className="font-semibold">
                      {PREFS_LABELS[pref] || pref}
                    </p>
                  </div>
                </div>

                {montoNum > 0 && (
                  <div className="mt-4 pt-3 border-t flex justify-between">
                    <span>Pagarás {numCuotas} cuotas de:</span>

                    <strong className="text-indigo-700">
                      {montoCuota.toLocaleString("es-DO", {
                        style: "currency",

                        currency: "DOP",
                      })}
                    </strong>
                  </div>
                )}
              </div>

              {/* PROPUESTA */}

              {propuestaRiesgo && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex gap-3">
                    <ShieldCheck className="text-amber-700" />

                    <div>
                      <p className="font-bold text-amber-950">
                        Nueva propuesta del motor
                      </p>

                      <p className="text-sm text-amber-700">
                        Revisa las nuevas condiciones.
                      </p>
                    </div>
                  </div>

                  {propuestaRiesgo.motivo && (
                    <p className="mt-4 text-sm text-amber-800">
                      {propuestaRiesgo.motivo}
                    </p>
                  )}

                  <div className="mt-4 bg-white rounded-xl border divide-y">
                    <div className="p-3 flex justify-between">
                      <span>Monto original</span>

                      <strong>
                        {montoOriginalPropuesta.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })}
                      </strong>
                    </div>

                    <div className="p-3 flex justify-between">
                      <span>Monto financiado</span>

                      <strong className="text-indigo-700">
                        {montoFinanciadoFinal.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })}
                      </strong>
                    </div>

                    <div className="p-3 flex justify-between">
                      <span>Enganche</span>

                      {requiereEnganche ? (
                        <div className="text-right">
                          <strong>
                            {montoEnganche.toLocaleString("es-DO", {
                              style: "currency",

                              currency: "DOP",
                            })}
                          </strong>

                          <div className="text-xs text-slate-500">
                            {porcentajeEnganche.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        <strong className="text-emerald-700">
                          No requerido
                        </strong>
                      )}
                    </div>

                    <div className="p-3 flex justify-between">
                      <span>Cuotas solicitadas</span>

                      <strong>
                        {propuestaRiesgo.numero_cuotas_solicitadas ?? numCuotas}
                      </strong>
                    </div>

                    <div className="p-3 flex justify-between">
                      <span>Cuotas permitidas</span>

                      <strong className="text-indigo-700">
                        {numeroCuotasPropuesta}
                      </strong>
                    </div>

                    <div className="p-3 flex justify-between">
                      <span>Monto por cuota</span>

                      <strong className="text-indigo-700">
                        {montoCuotaPropuesta.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })}
                      </strong>
                    </div>
                  </div>

                  {/* MÉTODO */}

                  {requiereEnganche && (
                    <div className="mt-4 border rounded-xl bg-white p-4">
                      <div className="flex gap-3">
                        <CreditCard />

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Pago requerido ahora
                          </p>

                          <p className="text-xl font-bold">
                            {montoEnganche.toLocaleString("es-DO", {
                              style: "currency",

                              currency: "DOP",
                            })}
                          </p>
                        </div>
                      </div>

                      {metodosPago.length > 0 ? (
                        <select
                          value={metodoPagoSeleccionado}
                          onChange={(e) => {
                            setMetodoPagoSeleccionado(e.target.value);

                            setError("");
                          }}
                          className="mt-4 w-full border rounded-xl p-3"
                        >
                          <option value="">Selecciona un método</option>

                          {metodosPago.map((metodo) => (
                            <option key={metodo.id} value={metodo.id}>
                              {metodo.marca || metodo.tipo || "Método"}
                              {metodo.ultimos_cuatro_digitos
                                ? ` •••• ${metodo.ultimos_cuatro_digitos}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-4 text-sm text-red-600">
                          No tienes un método de pago registrado.
                        </p>
                      )}
                    </div>
                  )}

                  {propuestaRiesgo.explicacion && (
                    <p className="mt-4 text-xs text-amber-700">
                      {propuestaRiesgo.explicacion}
                    </p>
                  )}

                  {montoFueReducido && porcentajeEnganche <= 0 && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                      Debes reducir realmente el monto de la compra a{" "}
                      {montoFinanciableMotor.toLocaleString("es-DO", {
                        style: "currency",

                        currency: "DOP",
                      })}{" "}
                      o menos.
                    </div>
                  )}

                  {!requiereEnganche &&
                    cuotasFueronReducidas &&
                    !montoFueReducido && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                        No necesitas enganche. El motor solamente redujo el
                        número de cuotas.
                      </div>
                    )}
                </div>
              )}

              {/* MENSAJE */}

              {mensaje && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 flex gap-2">
                  {procesandoSinEnganche ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <AlertCircle size={17} />
                  )}

                  <span className="text-sm">{mensaje}</span>
                </div>
              )}

              {/* ERROR */}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                  <div className="flex gap-2">
                    <AlertCircle size={18} className="shrink-0" />

                    <div>
                      <p className="font-semibold text-sm">{error}</p>

                      {causasRechazo.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-bold uppercase">
                            Causa principal
                          </p>

                          <p className="font-semibold">
                            {causasRechazo[0].nombre}
                          </p>

                          <p className="text-xs">
                            {causasRechazo[0].descripcion}
                          </p>
                        </div>
                      )}

                      {(causasRechazo.length > 1 ||
                        accionesRecomendadas.length > 0) && (
                        <button
                          type="button"
                          onClick={handleVerDetallesEvaluacion}
                          className="mt-3 underline text-sm font-semibold"
                        >
                          Ver detalles de la evaluación
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BOTONES */}

              {propuestaRiesgo ? (
                <>
                  {!montoFueReducido || porcentajeEnganche > 0 ? (
                    <button
                      type="button"
                      onClick={handleAceptarPropuesta}
                      disabled={
                        processing ||
                        procesandoSinEnganche ||
                        faltaMetodoPago ||
                        montoOriginalPropuesta > creditoDisponible + 0.009
                      }
                      className={`w-full py-4 rounded-xl font-bold ${
                        processing || procesandoSinEnganche || faltaMetodoPago
                          ? "bg-slate-200 text-slate-400"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {processing
                        ? "Procesando..."
                        : requiereEnganche
                          ? `Pagar ${montoEnganche.toLocaleString("es-DO", {
                              style: "currency",

                              currency: "DOP",
                            })} y confirmar`
                          : "Aceptar nueva propuesta"}
                    </button>
                  ) : null}

                  {requiereEnganche && (
                    <button
                      type="button"
                      onClick={handleSolicitarSinEnganche}
                      disabled={
                        processing ||
                        procesandoSinEnganche ||
                        montoOriginalPropuesta > creditoDisponible + 0.009
                      }
                      className="w-full py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-bold"
                    >
                      {procesandoSinEnganche
                        ? "Evaluando alternativa..."
                        : "Solicitar opción sin enganche"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCerrar}
                    disabled={processing || procesandoSinEnganche}
                    className="w-full py-3 rounded-xl border text-slate-600 font-semibold"
                  >
                    Cancelar compra
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={processing || montoInvalido || excedeCredito}
                  className={`w-full py-4 rounded-xl font-bold ${
                    processing || montoInvalido || excedeCredito
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {processing ? "Procesando..." : "Confirmar Compra"}
                </button>
              )}

              <p className="text-center text-[10px] text-slate-400 px-4">
                {excedeCredito
                  ? "El crédito disponible es el máximo absoluto de la compra."
                  : propuestaRiesgo && requiereEnganche
                    ? "Puedes pagar el enganche o solicitar una alternativa sin enganche."
                    : "La compra será evaluada por el motor dinámico antes de crear el financiamiento."}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
