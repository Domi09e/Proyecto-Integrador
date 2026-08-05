import { useEffect, useState } from "react";
import {
  X,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  Wallet,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

/* =============================================
   ETIQUETAS DE LOS PLANES
============================================= */

const PREFS_LABELS = {
  pago_completo: "1 Pago (Contado)",
  pagar_despues: "Pagar en 30 días (1 Cuota)",
  "4_quincenas": "4 Cuotas Quincenales (0% interés)",
  "12_meses": "12 Cuotas Mensuales",
  "24_meses": "24 Cuotas Mensuales",
};

/* =============================================
   CANTIDAD DE CUOTAS POR PLAN
============================================= */

const PREFS_DIVISOR = {
  pago_completo: 1,
  pagar_despues: 1,
  "4_quincenas": 4,
  "12_meses": 12,
  "24_meses": 24,
};

/* =============================================
   GENERAR ID ÚNICO PARA EL CHECKOUT
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

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [propuestaRiesgo, setPropuestaRiesgo] = useState(null);

  const [evaluacionId, setEvaluacionId] = useState(null);

  const [causasRechazo, setCausasRechazo] = useState([]);

  const [mostrarDetallesRechazo, setMostrarDetallesRechazo] = useState(false);

  const [accionesRecomendadas, setAccionesRecomendadas] = useState([]);

  const [metodosPago, setMetodosPago] = useState([]);

  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");

  /*
   * Se genera una sola vez cuando se abre
   * el modal.
   */
  const [checkoutSessionId] = useState(generarSessionId);

  /* =============================================
     CARGAR PERFIL Y MÉTODOS DE PAGO
  ============================================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [profileResponse, paymentMethodsResponse] = await Promise.all([
          api.get("/client/profile"),

          /*
           * Esta debe ser la ruta que devuelve
           * los métodos de pago del cliente.
           */
          api.get("/client/payment-methods"),
        ]);

        setUserProfile(profileResponse.data);

        const datosMetodos = paymentMethodsResponse.data;

        /*
         * Admite diferentes formas de respuesta:
         *
         * [ ... ]
         * { methods: [ ... ] }
         * { metodos: [ ... ] }
         * { data: [ ... ] }
         */
        const methods = Array.isArray(datosMetodos)
          ? datosMetodos
          : Array.isArray(datosMetodos?.methods)
            ? datosMetodos.methods
            : Array.isArray(datosMetodos?.metodos)
              ? datosMetodos.metodos
              : Array.isArray(datosMetodos?.data)
                ? datosMetodos.data
                : [];

        setMetodosPago(methods);

        const metodoPredeterminado =
          methods.find((metodo) => Boolean(metodo.es_predeterminado)) ||
          methods[0];

        setMetodoPagoSeleccionado(
          metodoPredeterminado ? String(metodoPredeterminado.id) : "",
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

    fetchData();
  }, []);

  /* =============================================
     CÁLCULOS DEL PLAN ACTUAL
  ============================================= */

  const montoNum = Number.parseFloat(monto) || 0;

  const creditoDisponible = Number(userProfile?.poder_credito || 0);

  const excedeCredito = montoNum > creditoDisponible;

  const montoInvalido = !Number.isFinite(montoNum) || montoNum <= 0;

  const pref = userProfile?.preferencia_bnpl || "4_quincenas";

  const numCuotas = PREFS_DIVISOR[pref] || 4;

  const montoCuota =
    montoNum > 0 ? Number((montoNum / numCuotas).toFixed(2)) : 0;

  /* =============================================
     CÁLCULOS DE LA PROPUESTA
  ============================================= */

  const montoOriginalPropuesta = Number(
    propuestaRiesgo?.monto_original ?? montoNum,
  );

  const montoMaximoMotor = Number(propuestaRiesgo?.monto_financiable ?? 0);

  const porcentajeEnganche = Number(propuestaRiesgo?.porcentaje_enganche ?? 0);

  /*
   * Monto permitido después de aplicar
   * el porcentaje de enganche.
   */
  const financiablePorEnganche =
    montoOriginalPropuesta * (1 - porcentajeEnganche / 100);

  /*
   * Se utiliza el menor monto entre:
   *
   * 1. El monto permitido por el motor.
   * 2. El monto resultante del enganche.
   */
  const montoFinanciadoFinal = propuestaRiesgo
    ? Number(Math.min(montoMaximoMotor, financiablePorEnganche).toFixed(2))
    : 0;

  /*
   * Todo lo que no se financia
   * debe pagarse inmediatamente.
   */
  const montoEnganche = propuestaRiesgo
    ? Number((montoOriginalPropuesta - montoFinanciadoFinal).toFixed(2))
    : 0;

  const numeroCuotasPropuesta = Number(
    propuestaRiesgo?.numero_cuotas_permitidas ??
      propuestaRiesgo?.numero_cuotas ??
      numCuotas,
  );

  const montoCuotaPropuesta =
    montoFinanciadoFinal > 0 && numeroCuotasPropuesta > 0
      ? Number((montoFinanciadoFinal / numeroCuotasPropuesta).toFixed(2))
      : 0;

  const requiereEnganche = Boolean(propuestaRiesgo) && montoEnganche > 0;

  const faltaMetodoPago = requiereEnganche && !metodoPagoSeleccionado;

  /* =============================================
     CAMBIAR MONTO
  ============================================= */

  const handleMontoChange = (event) => {
    setMonto(event.target.value);

    /*
     * Si cambia el monto, la evaluación
     * anterior deja de ser válida.
     */
    setPropuestaRiesgo(null);
    setEvaluacionId(null);
    setError("");
    setMensaje("");
    setCausasRechazo([]);
    setAccionesRecomendadas([]);
    setMostrarDetallesRechazo(false);
  };

  /* =============================================
     PROCESAR CHECKOUT INICIAL
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

    if (excedeCredito) {
      setError(
        "No tienes suficiente crédito disponible para realizar esta compra.",
      );

      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMensaje("");
      setCausasRechazo([]);
      setAccionesRecomendadas([]);
      setPropuestaRiesgo(null);
      setEvaluacionId(null);
      setMostrarDetallesRechazo(false);

      const payload = {
        tiendaId: tienda.id,

        monto: montoNum,

        metodo_pago: "bnpl_balance",

        session_id: checkoutSessionId,

        /*
         * Señales neutrales hasta implementar
         * su captura real.
         */
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

      alert(
        response.data?.message ||
          `¡Compra exitosa en ${tienda.nombre || tienda.name}!`,
      );

      navigate("/cartera");
      onClose();
    } catch (err) {
      console.error("Error procesando checkout:", err);

      const respuesta = err.response?.data || {};

      const codigo = respuesta.codigo;

      /*
       * Propuesta con condiciones ajustadas.
       */
      if (codigo === "CONDICIONES_AJUSTADAS_REQUIEREN_ACEPTACION") {
        setPropuestaRiesgo(respuesta.propuesta || null);

        setEvaluacionId(respuesta.evaluacion_id || null);

        setError("");
        setMensaje("");

        return;
      }

      /*
       * Aprobación normal con enganche.
       */
      if (codigo === "ENGANCHE_REQUIERE_ACEPTACION") {
        setPropuestaRiesgo(respuesta.propuesta || null);

        setEvaluacionId(respuesta.evaluacion_id || null);

        setError("");
        setMensaje("");

        return;
      }

      /*
       * Número de cuotas ajustado.
       */
      if (codigo === "CUOTAS_AJUSTADAS_REQUIEREN_ACEPTACION") {
        setPropuestaRiesgo({
          decision: "cuotas_reducidas",

          monto_original: montoNum,

          monto_financiable: respuesta.propuesta?.monto_financiable ?? montoNum,

          porcentaje_enganche: respuesta.propuesta?.porcentaje_enganche ?? 0,

          numero_cuotas_solicitadas:
            respuesta.propuesta?.numero_cuotas_solicitadas ?? numCuotas,

          numero_cuotas_permitidas:
            respuesta.propuesta?.numero_cuotas_permitidas,

          motivo: respuesta.message,

          explicacion:
            "El motor ajustó el número de cuotas según el nivel de riesgo actual.",
        });

        setEvaluacionId(respuesta.evaluacion_id || null);

        setError("");

        return;
      }

      if (codigo === "SOLICITUD_DUPLICADA") {
        setError(
          "Esta compra ya fue evaluada recientemente. No pulses el botón nuevamente.",
        );

        return;
      }

      if (codigo === "OPERACION_BLOQUEADA_POR_RIESGO") {
        setError(
          respuesta.message ||
            "La compra fue bloqueada por señales de seguridad.",
        );

        return;
      }

      if (codigo === "VERIFICACION_ADICIONAL_REQUERIDA") {
        setError(
          respuesta.message ||
            "Debes completar una verificación adicional para continuar.",
        );

        return;
      }

      if (codigo === "REVISION_MANUAL_REQUERIDA") {
        setMensaje(
          respuesta.message || "La compra fue enviada a revisión manual.",
        );

        return;
      }

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

        setPropuestaRiesgo(null);

        setEvaluacionId(respuesta.evaluacion_id || null);

        setMostrarDetallesRechazo(false);

        return;
      }

      if (codigo === "CREDITO_DISPONIBLE_INSUFICIENTE") {
        setError(
          respuesta.message || "No tienes suficiente crédito disponible.",
        );

        return;
      }

      setError(respuesta.message || "Ocurrió un error al procesar el pago.");
    } finally {
      setProcessing(false);
    }
  };

  /* =============================================
     PAGAR ENGANCHE Y ACEPTAR PROPUESTA
  ============================================= */

  const handleAceptarPropuesta = async () => {
    if (processing) {
      return;
    }

    if (!evaluacionId || !propuestaRiesgo) {
      setError("No se encontró una propuesta válida para aceptar.");

      return;
    }

    if (requiereEnganche && !metodoPagoSeleccionado) {
      setError("Debes seleccionar un método de pago para pagar el enganche.");

      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMensaje("");

      const response = await api.post("/bnpl/accept-risk-proposal", {
        evaluacion_id: evaluacionId,

        tienda_id: tienda.id,

        session_id: checkoutSessionId,

        metodo_pago_id: Number(metodoPagoSeleccionado),
      });

      alert(
        response.data?.message ||
          "El enganche fue pagado y la compra fue creada correctamente.",
      );

      navigate("/cartera");
      onClose();
    } catch (err) {
      console.error("Error aceptando propuesta:", err);

      const respuesta = err.response?.data || {};

      const codigo = respuesta.codigo;

      if (codigo === "METODO_PAGO_REQUERIDO") {
        setError("Debes seleccionar un método de pago para pagar el enganche.");

        return;
      }

      if (codigo === "METODO_PAGO_INVALIDO") {
        setError(
          "El método de pago seleccionado no existe o no pertenece a tu cuenta.",
        );

        return;
      }

      if (codigo === "METODO_PAGO_SIN_TOKEN") {
        setError(
          "El método seleccionado no está habilitado para realizar cobros.",
        );

        return;
      }

      if (codigo === "PAGO_ENGANCHE_RECHAZADO") {
        setError(respuesta.message || "El pago del enganche fue rechazado.");

        return;
      }

      if (codigo === "ENGANCHE_YA_PROCESADO") {
        setError(
          respuesta.message ||
            "El enganche de esta propuesta ya fue procesado.",
        );

        return;
      }

      if (codigo === "PROPUESTA_YA_UTILIZADA") {
        setError("Esta propuesta ya fue aceptada anteriormente.");

        return;
      }

      if (codigo === "CREDITO_DISPONIBLE_INSUFICIENTE") {
        setError(
          respuesta.message ||
            "No tienes crédito suficiente para el monto financiado.",
        );

        return;
      }

      setError(
        respuesta.message ||
          "No se pudo pagar el enganche y aceptar la propuesta.",
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =============================================
     CERRAR MODAL
  ============================================= */

  const handleCerrar = () => {
    if (processing) {
      return;
    }

    onClose();
  };

  /* =============================================
     ABRIR PÁGINA DE DETALLES
  ============================================= */

  const handleVerDetallesEvaluacion = () => {
    const datosEvaluacion = {
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
    };

    sessionStorage.setItem(
      "ultima_evaluacion_riesgo",

      JSON.stringify(datosEvaluacion),
    );

    navigate("/perfil-riesgo/detalles");

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* =====================================
            HEADER
        ===================================== */}

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
            disabled={processing}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />

              <p className="text-sm text-slate-500">Verificando crédito...</p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-6">
              {/* =================================
                  CRÉDITO DISPONIBLE
              ================================= */}

              <div
                className={`border rounded-xl p-4 flex items-center justify-between transition-colors ${
                  excedeCredito
                    ? "bg-red-50 border-red-200"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      excedeCredito
                        ? "bg-red-100 text-red-600"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <Wallet size={20} />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-medium uppercase ${
                        excedeCredito ? "text-red-800" : "text-emerald-800"
                      }`}
                    >
                      Tu Crédito Disponible
                    </p>

                    <p
                      className={`text-lg font-bold ${
                        excedeCredito ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      RD${" "}
                      {creditoDisponible.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================
                  MONTO
              ================================= */}

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
                    placeholder="0.00"
                    readOnly={Boolean(initialAmount)}
                    className={`w-full pl-8 pr-4 py-3 text-lg font-semibold border-2 rounded-xl outline-none transition ${
                      excedeCredito
                        ? "border-red-300 text-red-600 focus:border-red-500 bg-red-50"
                        : initialAmount
                          ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                          : "border-slate-200 focus:border-slate-900"
                    }`}
                    autoFocus={!initialAmount}
                  />
                </div>

                {excedeCredito && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600 font-medium">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />

                    <span>
                      No tienes suficiente crédito para realizar esta compra.
                    </span>
                  </div>
                )}
              </div>

              {/* =================================
                  PLAN ACTUAL
              ================================= */}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="text-slate-900 mt-0.5" size={18} />

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Plan activo en tu perfil
                    </p>

                    <p className="text-sm font-semibold text-slate-900">
                      {PREFS_LABELS[pref] || pref}
                    </p>
                  </div>
                </div>

                {montoNum > 0 && (
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-slate-800">
                    <span className="text-sm">
                      Pagarás {numCuotas} cuotas de:
                    </span>

                    <span className="text-xl font-bold text-indigo-700">
                      RD${" "}
                      {montoCuota.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,

                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* =================================
                  PROPUESTA AJUSTADA
              ================================= */}

              {propuestaRiesgo && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-amber-950">
                        Nueva propuesta del motor
                      </p>

                      <p className="text-sm text-amber-800 mt-1">
                        El financiamiento puede continuar con condiciones
                        ajustadas.
                      </p>
                    </div>
                  </div>

                  {propuestaRiesgo.motivo && (
                    <p className="text-sm text-amber-800 mt-4">
                      {propuestaRiesgo.motivo}
                    </p>
                  )}

                  <div className="mt-4 rounded-xl border border-amber-200 bg-white/70 divide-y divide-amber-100">
                    <div className="flex justify-between gap-4 p-3 text-sm">
                      <span className="text-slate-600">Monto original</span>

                      <strong className="text-slate-900">
                        {montoOriginalPropuesta.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-4 p-3 text-sm">
                      <span className="text-slate-600">Monto financiado</span>

                      <strong className="text-indigo-700">
                        {montoFinanciadoFinal.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-4 p-3 text-sm">
                      <span className="text-slate-600">Enganche requerido</span>

                      <div className="text-right">
                        <strong className="block text-slate-900">
                          {montoEnganche.toLocaleString("es-DO", {
                            style: "currency",

                            currency: "DOP",
                          })}
                        </strong>

                        <span className="text-xs text-slate-500">
                          {porcentajeEnganche.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between gap-4 p-3 text-sm">
                      <span className="text-slate-600">Cuotas solicitadas</span>

                      <strong className="text-slate-900">
                        {propuestaRiesgo.numero_cuotas_solicitadas ?? numCuotas}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-4 p-3 text-sm">
                      <span className="text-slate-600">Cuotas permitidas</span>

                      <strong className="text-indigo-700">
                        {numeroCuotasPropuesta}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-4 p-3 text-sm">
                      <span className="text-slate-600">Monto por cuota</span>

                      <strong className="text-indigo-700">
                        {montoCuotaPropuesta.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })}
                      </strong>
                    </div>
                  </div>

                  {/* =============================
                      MÉTODO PARA EL ENGANCHE
                  ============================= */}

                  {requiereEnganche && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <CreditCard size={18} />
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Pago requerido ahora
                          </p>

                          <p className="mt-1 text-2xl font-bold text-slate-950">
                            {montoEnganche.toLocaleString("es-DO", {
                              style: "currency",

                              currency: "DOP",
                            })}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-slate-500">
                        Este monto se cobrará ahora. El resto será financiado
                        mediante BNPL.
                      </p>

                      <label className="mt-4 block text-sm font-semibold text-slate-700">
                        Método para pagar el enganche
                      </label>

                      {metodosPago.length > 0 ? (
                        <select
                          value={metodoPagoSeleccionado}
                          onChange={(event) => {
                            setMetodoPagoSeleccionado(event.target.value);

                            setError("");
                          }}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-amber-500"
                        >
                          <option value="">Selecciona un método</option>

                          {metodosPago.map((metodo) => {
                            const marca =
                              metodo.marca || metodo.tipo || "Método de pago";

                            const ultimosDigitos =
                              metodo.ultimos_cuatro_digitos ||
                              metodo.ultimos4 ||
                              "";

                            return (
                              <option key={metodo.id} value={metodo.id}>
                                {marca}
                                {ultimosDigitos
                                  ? ` •••• ${ultimosDigitos}`
                                  : ""}
                                {metodo.es_predeterminado
                                  ? " — Predeterminado"
                                  : ""}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                          <p className="text-sm font-semibold text-red-700">
                            No tienes un método de pago registrado.
                          </p>

                          <p className="mt-1 text-xs text-red-600">
                            Debes registrar uno para pagar el enganche.
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();

                              navigate("/perfil/metodos-pago");
                            }}
                            className="mt-3 text-sm font-bold text-red-700 underline underline-offset-2"
                          >
                            Agregar método de pago
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {propuestaRiesgo.explicacion && (
                    <p className="text-xs text-amber-700 mt-4">
                      {propuestaRiesgo.explicacion}
                    </p>
                  )}
                </div>
              )}

              {/* =================================
                  MENSAJE INFORMATIVO
              ================================= */}

              {mensaje && (
                <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg text-sm border border-blue-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />

                  <span>{mensaje}</span>
                </div>
              )}

              {/* =================================
                  ERROR Y CAUSA REAL
              ================================= */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-red-600"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700">
                        {error}
                      </p>

                      {causasRechazo.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                            Causa principal
                          </p>

                          <p className="text-sm font-semibold text-red-800 mt-1">
                            {causasRechazo[0].nombre}
                          </p>

                          {causasRechazo[0].descripcion && (
                            <p className="text-xs text-red-600 mt-1">
                              {causasRechazo[0].descripcion}
                            </p>
                          )}
                        </div>
                      )}

                      {(causasRechazo.length > 1 ||
                        accionesRecomendadas.length > 0) && (
                        <button
                          type="button"
                          onClick={handleVerDetallesEvaluacion}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-red-700 underline underline-offset-2"
                        >
                          <ShieldCheck size={14} />
                          Ver detalles de la evaluación
                        </button>
                      )}

                      {mostrarDetallesRechazo && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => setMostrarDetallesRechazo(false)}
                          >
                            Ocultar detalles
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =================================
                  BOTÓN PRINCIPAL
              ================================= */}

              {propuestaRiesgo ? (
                <button
                  type="button"
                  onClick={handleAceptarPropuesta}
                  disabled={
                    processing || faltaMetodoPago || metodosPago.length === 0
                  }
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition transform active:scale-[0.98] ${
                    processing || faltaMetodoPago || metodosPago.length === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-200"
                  }`}
                >
                  {processing
                    ? "Procesando enganche..."
                    : requiereEnganche
                      ? `Pagar ${montoEnganche.toLocaleString("es-DO", {
                          style: "currency",

                          currency: "DOP",
                        })} y confirmar`
                      : "Aceptar nueva propuesta"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    processing ||
                    montoInvalido ||
                    excedeCredito ||
                    Boolean(error)
                  }
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition transform active:scale-[0.98] ${
                    processing || montoInvalido || excedeCredito || error
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                  }`}
                >
                  {processing ? "Procesando..." : "Confirmar Compra"}
                </button>
              )}

              {propuestaRiesgo && (
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={processing}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Rechazar propuesta
                </button>
              )}

              <p className="text-center text-[10px] text-slate-400 px-4">
                {propuestaRiesgo
                  ? requiereEnganche
                    ? "El enganche se cobrará al método seleccionado antes de crear el financiamiento."
                    : "La compra se creará después de aceptar las nuevas condiciones."
                  : "Al confirmar, la compra será evaluada por el motor dinámico antes de crear el financiamiento."}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
