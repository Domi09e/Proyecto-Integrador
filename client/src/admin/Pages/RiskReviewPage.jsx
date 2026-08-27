import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  X,
  UserX,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock3,
  ClipboardCheck,
  WalletCards,
  TrendingUp,
  TrendingDown,
  Equal,
  PencilLine,
  History,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Smartphone,
  MapPin,
  Wifi,
  Activity,
} from "lucide-react";

import api from "../../api/axios";

/* =====================================================
   HELPERS
===================================================== */

const money = (value) =>
  Number(value || 0).toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

const titleCase = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
};

const formatKm = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toFixed(2)} km`;
};

const yesNo = (value) => (value ? "Sí" : "No");

const obtenerMensajeError = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const getSeverityClasses = (severity) => {
  const map = {
    baja: "bg-slate-100 text-slate-700",
    media: "bg-amber-100 text-amber-700",
    alta: "bg-orange-100 text-orange-700",
    critica: "bg-rose-100 text-rose-700",
  };

  return map[severity] || "bg-slate-100 text-slate-700";
};

const getAlertStateClasses = (state) => {
  const map = {
    abierta: "bg-rose-100 text-rose-700",
    en_revision: "bg-amber-100 text-amber-700",
    confirmada: "bg-indigo-100 text-indigo-700",
    descartada: "bg-slate-100 text-slate-600",
    resuelta: "bg-emerald-100 text-emerald-700",
  };

  return map[state] || "bg-slate-100 text-slate-700";
};

const getReviewStateClasses = (state) => {
  const map = {
    pendiente: "bg-amber-100 text-amber-700",
    en_revision: "bg-blue-100 text-blue-700",
    aprobada: "bg-emerald-100 text-emerald-700",
    aprobada_condicionada: "bg-indigo-100 text-indigo-700",
    rechazada: "bg-rose-100 text-rose-700",
  };

  return map[state] || "bg-slate-100 text-slate-700";
};

/* =====================================================
   COMPONENTE PRINCIPAL
===================================================== */

export default function RiskReviewPage() {
  const [activeTab, setActiveTab] = useState("alerts");

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [summary, setSummary] = useState({
    alertas_abiertas: 0,
    alertas_en_revision: 0,
    alertas_criticas: 0,
    revisiones_pendientes: 0,
    revisiones_en_curso: 0,
    clientes_bloqueados: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [alertPage, setAlertPage] = useState(1);
  const [alertPages, setAlertPages] = useState(1);

  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);

  const [search, setSearch] = useState("");

  const [alertState, setAlertState] = useState("");
  const [severity, setSeverity] = useState("");

  const [reviewState, setReviewState] = useState("");

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);

  const [comment, setComment] = useState("");

  /* =====================================================
     APROBACIÓN CONDICIONADA
  ===================================================== */

  const [showConditionalForm, setShowConditionalForm] = useState(false);

  const [conditionalData, setConditionalData] = useState({
    porcentaje_enganche: 20,
    numero_cuotas: 4,
    comentario: "",
  });

  /* =====================================================
     LÍNEA DE CRÉDITO
  ===================================================== */

  const [creditLine, setCreditLine] = useState(null);
  const [loadingCreditLine, setLoadingCreditLine] = useState(false);

  const [showManualCreditForm, setShowManualCreditForm] = useState(false);

  const [manualCreditData, setManualCreditData] = useState({
    nuevo_limite: "",
    motivo: "",
  });

  /* =====================================================
     MENSAJES
  ===================================================== */

  const showSuccess = (text) => {
    setError("");
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const showError = (text) => {
    setMessage("");
    setError(text);

    window.setTimeout(() => {
      setError("");
    }, 7000);
  };

  /* =====================================================
     RESUMEN
  ===================================================== */

  const fetchSummary = async () => {
    try {
      const { data } = await api.get("/admin/risk-review/summary");

      if (data?.success) {
        setSummary(data.resumen || {});
      }
    } catch (err) {
      console.error("Error cargando resumen:", err);
    }
  };

  /* =====================================================
     ALERTAS
  ===================================================== */

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get("/admin/risk-review/alerts", {
        params: {
          pagina: alertPage,
          limite: 10,
          busqueda: search || undefined,
          estado: alertState || undefined,
          severidad: severity || undefined,
        },
      });

      setAlerts(Array.isArray(data?.alertas) ? data.alertas : []);

      setAlertPages(Math.max(Number(data?.total_paginas || 1), 1));
    } catch (err) {
      console.error("Error cargando alertas:", err);

      showError(obtenerMensajeError(err, "No se pudieron cargar las alertas."));
    }
  };

  /* =====================================================
     REVISIONES MANUALES
  ===================================================== */

  const fetchReviews = async () => {
    try {
      const { data } = await api.get("/admin/risk-review/manual-reviews", {
        params: {
          pagina: reviewPage,
          limite: 10,
          busqueda: search || undefined,
          estado: reviewState || undefined,
        },
      });

      setReviews(Array.isArray(data?.revisiones) ? data.revisiones : []);

      setReviewPages(Math.max(Number(data?.total_paginas || 1), 1));
    } catch (err) {
      console.error("Error cargando revisiones:", err);

      showError(
        obtenerMensajeError(
          err,
          "No se pudieron cargar las revisiones manuales.",
        ),
      );
    }
  };

  /* =====================================================
     REFRESCAR TODO
  ===================================================== */

  const refreshAll = async () => {
    try {
      setLoading(true);

      await Promise.all([fetchSummary(), fetchAlerts(), fetchReviews()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAlerts();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertPage, alertState, severity]);

  useEffect(() => {
    if (!loading) {
      fetchReviews();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewPage, reviewState]);

  /* =====================================================
     BÚSQUEDA
  ===================================================== */

  const handleSearch = async (event) => {
    event.preventDefault();

    setAlertPage(1);
    setReviewPage(1);

    if (activeTab === "alerts") {
      await fetchAlerts();
    } else {
      await fetchReviews();
    }
  };

  /* =====================================================
     LÍNEA DE CRÉDITO
  ===================================================== */

  const fetchCreditLine = async (clienteId) => {
    if (!clienteId) {
      setCreditLine(null);
      return;
    }

    try {
      setLoadingCreditLine(true);

      const { data } = await api.get(
        `/admin/risk-review/clients/${clienteId}/credit-line`,
      );

      if (data?.success) {
        setCreditLine({
          ...(data.linea_credito || {}),

          historial: Array.isArray(data.historial) ? data.historial : [],
        });
      } else {
        setCreditLine(null);
      }
    } catch (err) {
      console.error("Error cargando línea de crédito:", err);

      setCreditLine(null);

      showError(
        obtenerMensajeError(err, "No se pudo cargar la línea de crédito."),
      );
    } finally {
      setLoadingCreditLine(false);
    }
  };

  /* =====================================================
     ABRIR ALERTA
  ===================================================== */

  const openAlert = async (id) => {
    try {
      setLoadingDetail(true);

      setComment("");
      setCreditLine(null);
      setShowManualCreditForm(false);

      const { data } = await api.get(`/admin/risk-review/alerts/${id}`);

      const alerta = data?.alerta || null;

      setSelectedAlert(alerta);

      if (alerta?.cliente?.id) {
        await fetchCreditLine(alerta.cliente.id);
      }
    } catch (err) {
      console.error("Error detalle alerta:", err);

      showError(obtenerMensajeError(err, "No se pudo abrir la alerta."));
    } finally {
      setLoadingDetail(false);
    }
  };

  /* =====================================================
     ABRIR REVISIÓN
  ===================================================== */

  const openReview = async (id) => {
    try {
      setLoadingDetail(true);

      setComment("");
      setCreditLine(null);
      setShowManualCreditForm(false);
      setShowConditionalForm(false);

      const { data } = await api.get(`/admin/risk-review/manual-reviews/${id}`);

      const revision = data?.revision || null;

      setSelectedReview(revision);

      if (revision?.cliente?.id) {
        await fetchCreditLine(revision.cliente.id);
      }
    } catch (err) {
      console.error("Error detalle revisión:", err);

      showError(obtenerMensajeError(err, "No se pudo abrir la revisión."));
    } finally {
      setLoadingDetail(false);
    }
  };

  /* =====================================================
     APLICAR LÍMITE RECOMENDADO
  ===================================================== */

  const applyRecommendedLimit = async (clienteId) => {
    if (!clienteId || !creditLine) {
      return;
    }

    const recomendado = Number(creditLine.limite_recomendado || 0);

    if (recomendado <= 0) {
      showError("El cliente no tiene un límite recomendado válido.");

      return;
    }

    const confirmado = window.confirm(
      `¿Deseas ajustar el límite aprobado a ${money(recomendado)}?`,
    );

    if (!confirmado) {
      return;
    }

    try {
      setProcessing(true);

      const actual = Number(creditLine.limite_aprobado || 0);

      let motivo = "";

      if (recomendado > actual) {
        motivo =
          "Aumento de línea de crédito al valor recomendado por el motor de riesgo.";
      } else if (recomendado < actual) {
        motivo =
          "Reducción de línea de crédito al valor recomendado por el motor de riesgo.";
      } else {
        motivo = "Confirmación administrativa del límite recomendado.";
      }

      const { data } = await api.patch(
        `/admin/risk-review/clients/${clienteId}/credit-line/apply-recommended`,
        {
          motivo,
        },
      );

      showSuccess(data?.message || "El límite fue ajustado al recomendado.");

      await fetchCreditLine(clienteId);

      await refreshAll();
    } catch (err) {
      console.error("Error aplicando límite recomendado:", err);

      showError(
        obtenerMensajeError(err, "No se pudo ajustar el límite recomendado."),
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =====================================================
     AJUSTE MANUAL DE CRÉDITO
  ===================================================== */

  const submitManualCreditLimit = async (clienteId) => {
    const nuevoLimite = Number(manualCreditData.nuevo_limite);

    const motivo = String(manualCreditData.motivo || "").trim();

    if (!Number.isFinite(nuevoLimite) || nuevoLimite <= 0) {
      showError("Debes indicar un nuevo límite mayor que cero.");

      return;
    }

    if (!motivo) {
      showError("Debes indicar el motivo del ajuste manual.");

      return;
    }

    const confirmado = window.confirm(
      `¿Confirmas cambiar el límite aprobado a ${money(nuevoLimite)}?`,
    );

    if (!confirmado) {
      return;
    }

    try {
      setProcessing(true);

      const { data } = await api.patch(
        `/admin/risk-review/clients/${clienteId}/credit-line/manual`,
        {
          nuevo_limite: nuevoLimite,

          motivo,
        },
      );

      showSuccess(data?.message || "El límite fue modificado correctamente.");

      setManualCreditData({
        nuevo_limite: "",
        motivo: "",
      });

      setShowManualCreditForm(false);

      await fetchCreditLine(clienteId);

      await refreshAll();
    } catch (err) {
      console.error("Error ajuste manual:", err);

      showError(
        obtenerMensajeError(err, "No se pudo modificar el límite de crédito."),
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =====================================================
     ACCIONES DE ALERTA
  ===================================================== */

  const alertAction = async (action, extra = {}) => {
    if (!selectedAlert) {
      return;
    }

    try {
      setProcessing(true);

      const { data } = await api.patch(
        `/admin/risk-review/alerts/${selectedAlert.id}/${action}`,
        {
          comentario: comment,

          ...extra,
        },
      );

      showSuccess(data?.message || "Alerta actualizada.");

      const alertaId = selectedAlert.id;

      setComment("");

      await refreshAll();

      await openAlert(alertaId);
    } catch (err) {
      console.error("Error procesando alerta:", err);

      showError(obtenerMensajeError(err, "No se pudo actualizar la alerta."));
    } finally {
      setProcessing(false);
    }
  };

  /* =====================================================
     BLOQUEAR CLIENTE
  ===================================================== */

  const blockClient = async () => {
    const clientId = selectedAlert?.cliente?.id;

    if (!clientId) {
      return;
    }

    const reason =
      comment.trim() || "Bloqueo preventivo desde el Centro de Riesgo.";

    const confirmado = window.confirm(
      "¿Seguro que deseas bloquear preventivamente a este cliente?",
    );

    if (!confirmado) {
      return;
    }

    try {
      setProcessing(true);

      const { data } = await api.patch(
        `/admin/risk-review/clients/${clientId}/block`,
        {
          motivo: reason,
        },
      );

      showSuccess(data?.message || "Cliente bloqueado preventivamente.");

      await openAlert(selectedAlert.id);

      await fetchSummary();
    } catch (err) {
      showError(obtenerMensajeError(err, "No se pudo bloquear al cliente."));
    } finally {
      setProcessing(false);
    }
  };

  /* =====================================================
     DESBLOQUEAR CLIENTE
  ===================================================== */

  const unblockClient = async () => {
    const clientId = selectedAlert?.cliente?.id;

    if (!clientId) {
      return;
    }

    const confirmado = window.confirm(
      "¿Seguro que deseas desbloquear a este cliente?",
    );

    if (!confirmado) {
      return;
    }

    try {
      setProcessing(true);

      const { data } = await api.patch(
        `/admin/risk-review/clients/${clientId}/unblock`,
      );

      showSuccess(data?.message || "Cliente desbloqueado correctamente.");

      await openAlert(selectedAlert.id);

      await fetchSummary();
    } catch (err) {
      showError(obtenerMensajeError(err, "No se pudo desbloquear al cliente."));
    } finally {
      setProcessing(false);
    }
  };

  /* =====================================================
     ACCIONES DE REVISIÓN MANUAL
  ===================================================== */

  const reviewAction = async (action, payload = {}) => {
    if (!selectedReview) {
      return;
    }

    try {
      setProcessing(true);

      const { data } = await api.patch(
        `/admin/risk-review/manual-reviews/${selectedReview.id}/${action}`,
        payload,
      );

      showSuccess(data?.message || "Revisión actualizada.");

      setComment("");

      setShowConditionalForm(false);

      await refreshAll();

      if (["approve", "conditional-approve", "reject"].includes(action)) {
        setSelectedReview(null);

        setCreditLine(null);
      } else {
        await openReview(selectedReview.id);
      }
    } catch (err) {
      console.error("Error procesando revisión:", err);

      showError(obtenerMensajeError(err, "No se pudo procesar la revisión."));
    } finally {
      setProcessing(false);
    }
  };

  const approveReview = () => {
    reviewAction("approve", {
      comentario: comment.trim() || "Aprobada por revisión administrativa.",
    });
  };

  const rejectReview = () => {
    if (!comment.trim()) {
      showError("Debes indicar el motivo del rechazo.");

      return;
    }

    reviewAction("reject", {
      comentario: comment.trim(),
    });
  };

  const conditionalApprove = () => {
    const downPayment = Number(conditionalData.porcentaje_enganche);

    const installments = Number(conditionalData.numero_cuotas);

    if (!Number.isFinite(downPayment) || downPayment < 0 || downPayment > 40) {
      showError("El enganche debe estar entre 0 % y 40 %.");

      return;
    }

    if (![1, 4, 12, 24].includes(installments)) {
      showError("Selecciona una cantidad de cuotas válida.");

      return;
    }

    reviewAction("conditional-approve", {
      porcentaje_enganche: downPayment,

      numero_cuotas: installments,

      comentario:
        conditionalData.comentario.trim() ||
        comment.trim() ||
        "Aprobada con condiciones por revisión administrativa.",
    });
  };

  /* =====================================================
     TARJETAS
  ===================================================== */

  const cards = useMemo(
    () => [
      {
        label: "Alertas abiertas",

        value: summary.alertas_abiertas || 0,

        icon: AlertTriangle,

        color: "bg-rose-50 text-rose-700 border-rose-100",
      },

      {
        label: "Alertas críticas",

        value: summary.alertas_criticas || 0,

        icon: ShieldAlert,

        color: "bg-orange-50 text-orange-700 border-orange-100",
      },

      {
        label: "Revisiones pendientes",

        value: summary.revisiones_pendientes || 0,

        icon: ClipboardCheck,

        color: "bg-amber-50 text-amber-700 border-amber-100",
      },

      {
        label: "Clientes bloqueados",

        value: summary.clientes_bloqueados || 0,

        icon: UserX,

        color: "bg-slate-100 text-slate-700 border-slate-200",
      },
    ],
    [summary],
  );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* MENSAJES */}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 font-medium">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <ShieldAlert size={26} />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Centro de Riesgo
            </h1>

            <p className="text-sm text-slate-500">
              Monitoreo de riesgo, revisiones manuales, comportamiento de
              compras y administración de líneas de crédito.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* RESUMEN */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`border rounded-2xl p-5 ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide font-bold opacity-70">
                    {card.label}
                  </p>

                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                </div>

                <Icon size={28} />
              </div>
            </div>
          );
        })}
      </div>

      {/* PANEL PRINCIPAL */}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* TABS */}

        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 md:flex-none px-6 py-4 text-sm font-bold transition ${
              activeTab === "alerts"
                ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Alertas de riesgo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 md:flex-none px-6 py-4 text-sm font-bold transition ${
              activeTab === "reviews"
                ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Revisiones manuales
          </button>
        </div>

        {/* FILTROS */}

        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <form
            onSubmit={handleSearch}
            className="flex flex-col xl:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, apellido o correo..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            {activeTab === "alerts" ? (
              <>
                <select
                  value={alertState}
                  onChange={(event) => {
                    setAlertPage(1);

                    setAlertState(event.target.value);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="">Todos los estados</option>

                  <option value="abierta">Abierta</option>

                  <option value="en_revision">En revisión</option>

                  <option value="confirmada">Confirmada</option>

                  <option value="descartada">Descartada</option>

                  <option value="resuelta">Resuelta</option>
                </select>

                <select
                  value={severity}
                  onChange={(event) => {
                    setAlertPage(1);

                    setSeverity(event.target.value);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="">Todas las severidades</option>

                  <option value="baja">Baja</option>

                  <option value="media">Media</option>

                  <option value="alta">Alta</option>

                  <option value="critica">Crítica</option>
                </select>
              </>
            ) : (
              <select
                value={reviewState}
                onChange={(event) => {
                  setReviewPage(1);

                  setReviewState(event.target.value);
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl"
              >
                <option value="">Todos los estados</option>

                <option value="pendiente">Pendiente</option>

                <option value="en_revision">En revisión</option>

                <option value="aprobada">Aprobada</option>

                <option value="aprobada_condicionada">
                  Aprobada condicionada
                </option>

                <option value="rechazada">Rechazada</option>
              </select>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* TABLA */}

        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw
              size={30}
              className="mx-auto animate-spin text-indigo-600 mb-3"
            />
            Cargando Centro de Riesgo...
          </div>
        ) : activeTab === "alerts" ? (
          <AlertsTable
            alerts={alerts}
            onOpen={openAlert}
            page={alertPage}
            pages={alertPages}
            setPage={setAlertPage}
          />
        ) : (
          <ReviewsTable
            reviews={reviews}
            onOpen={openReview}
            page={reviewPage}
            pages={reviewPages}
            setPage={setReviewPage}
          />
        )}
      </div>

      {/* MODAL ALERTA */}

      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          comment={comment}
          setComment={setComment}
          processing={processing}
          creditLine={creditLine}
          loadingCreditLine={loadingCreditLine}
          showManualCreditForm={showManualCreditForm}
          setShowManualCreditForm={setShowManualCreditForm}
          manualCreditData={manualCreditData}
          setManualCreditData={setManualCreditData}
          onApplyRecommended={() =>
            applyRecommendedLimit(selectedAlert.cliente?.id)
          }
          onManualCreditSubmit={() =>
            submitManualCreditLimit(selectedAlert.cliente?.id)
          }
          onClose={() => {
            setSelectedAlert(null);

            setCreditLine(null);

            setShowManualCreditForm(false);
          }}
          onStart={() => alertAction("start-review")}
          onConfirm={() => alertAction("confirm")}
          onConfirmAndBlock={() =>
            alertAction("confirm", {
              bloquear_cliente: true,
            })
          }
          onDiscard={() => alertAction("discard")}
          onResolve={() => alertAction("resolve")}
          onBlock={blockClient}
          onUnblock={unblockClient}
        />
      )}

      {/* MODAL REVISIÓN */}

      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          comment={comment}
          setComment={setComment}
          processing={processing}
          creditLine={creditLine}
          loadingCreditLine={loadingCreditLine}
          showManualCreditForm={showManualCreditForm}
          setShowManualCreditForm={setShowManualCreditForm}
          manualCreditData={manualCreditData}
          setManualCreditData={setManualCreditData}
          onApplyRecommended={() =>
            applyRecommendedLimit(selectedReview.cliente?.id)
          }
          onManualCreditSubmit={() =>
            submitManualCreditLimit(selectedReview.cliente?.id)
          }
          onClose={() => {
            setSelectedReview(null);

            setCreditLine(null);

            setShowConditionalForm(false);

            setShowManualCreditForm(false);
          }}
          onStart={() => reviewAction("start")}
          onApprove={approveReview}
          onReject={rejectReview}
          showConditionalForm={showConditionalForm}
          setShowConditionalForm={setShowConditionalForm}
          conditionalData={conditionalData}
          setConditionalData={setConditionalData}
          onConditionalApprove={conditionalApprove}
        />
      )}

      {/* LOADING DETALLE */}

      {loadingDetail && (
        <div className="fixed inset-0 z-[200] bg-black/20 flex items-center justify-center">
          <div className="bg-white p-5 rounded-2xl shadow-xl">
            <RefreshCw className="animate-spin text-indigo-600" />
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   TABLA ALERTAS
===================================================== */

function AlertsTable({ alerts, onOpen, page, pages, setPage }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-5 py-3">Cliente</th>

              <th className="text-left px-5 py-3">Alerta</th>

              <th className="text-left px-5 py-3">Severidad</th>

              <th className="text-left px-5 py-3">Estado</th>

              <th className="text-left px-5 py-3">Fecha</th>

              <th className="text-right px-5 py-3">Acción</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {alerts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-14 text-center text-slate-400"
                >
                  No hay alertas para mostrar.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {alert.cliente?.nombre_completo || "Cliente"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {alert.cliente?.email}
                    </p>
                  </td>

                  <td className="px-5 py-4 max-w-xs">
                    <p className="font-semibold text-slate-800">
                      {alert.titulo}
                    </p>

                    <p className="text-xs text-slate-500 truncate">
                      {alert.descripcion}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getSeverityClasses(
                        alert.severidad,
                      )}`}
                    >
                      {titleCase(alert.severidad)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getAlertStateClasses(
                        alert.estado,
                      )}`}
                    >
                      {titleCase(alert.estado)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {formatDate(alert.created_at)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(alert.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100"
                    >
                      <Eye size={16} />
                      Revisar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} setPage={setPage} />
    </>
  );
}

/* =====================================================
   TABLA REVISIONES MANUALES
===================================================== */

function ReviewsTable({ reviews, onOpen, page, pages, setPage }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-5 py-3">Cliente</th>

              <th className="text-left px-5 py-3">Monto</th>

              <th className="text-left px-5 py-3">Crédito</th>

              <th className="text-left px-5 py-3">Fraude</th>

              <th className="text-left px-5 py-3">Estado</th>

              <th className="text-right px-5 py-3">Acción</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {reviews.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-14 text-center text-slate-400"
                >
                  No hay revisiones manuales.
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {review.cliente?.nombre_completo || "Cliente"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {review.cliente?.email}
                    </p>
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {money(review.monto_solicitado)}
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-bold text-indigo-700">
                      {Number(review.puntaje_crediticio || 0).toFixed(0)}
                    </span>
                    /100
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={
                        Number(review.puntaje_fraude || 0) >= 60
                          ? "font-bold text-rose-600"
                          : "font-bold text-slate-700"
                      }
                    >
                      {Number(review.puntaje_fraude || 0).toFixed(0)}
                    </span>
                    /100
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getReviewStateClasses(
                        review.estado_revision,
                      )}`}
                    >
                      {titleCase(review.estado_revision)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(review.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100"
                    >
                      <Eye size={16} />
                      Revisar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} setPage={setPage} />
    </>
  );
}

/* =====================================================
   LÍNEA DE CRÉDITO
===================================================== */

function CreditLinePanel({
  creditLine,
  loading,
  processing,
  showManualForm,
  setShowManualForm,
  manualData,
  setManualData,
  onApplyRecommended,
  onManualSubmit,
}) {
  if (loading) {
    return (
      <div className="border border-slate-200 rounded-2xl p-5 text-center text-slate-500">
        <RefreshCw className="mx-auto animate-spin mb-2" />
        Cargando información del cliente...
      </div>
    );
  }

  if (!creditLine) {
    return (
      <div className="border border-slate-200 rounded-2xl p-5 text-center text-slate-500">
        No se pudo obtener la información financiera del cliente.
      </div>
    );
  }

  /* =====================================================
     LÍNEA DE CRÉDITO
  ===================================================== */

  const aprobado = Number(creditLine.limite_aprobado || 0);

  const utilizado = Number(creditLine.saldo_utilizado || 0);

  const disponible = Number(creditLine.credito_disponible || 0);

  const recomendado = Number(creditLine.limite_recomendado || 0);

  const diferencia = recomendado - aprobado;

  const recomendadoMayor = diferencia > 0.009;

  const recomendadoMenor = diferencia < -0.009;

  const mismoLimite = Math.abs(diferencia) <= 0.009;

  /* =====================================================
     HISTORIAL DE COMPORTAMIENTO
  ===================================================== */

  const historialComportamiento = Array.isArray(
    creditLine.historial_comportamiento,
  )
    ? creditLine.historial_comportamiento
    : [];

  const resumenComportamiento = creditLine.resumen_comportamiento || {};

  const cantidadHistorica = Number(
    resumenComportamiento.cantidad_compras ??
      historialComportamiento.length ??
      0,
  );

  const promedioHistorico = Number(resumenComportamiento.promedio_monto || 0);

  const minimoHistorico = Number(resumenComportamiento.monto_minimo || 0);

  const maximoHistorico = Number(resumenComportamiento.monto_maximo || 0);

  const tienePatron = Boolean(resumenComportamiento.tiene_patron_suficiente);

  return (
    <div className="space-y-6">
      {/* =================================================
          LÍNEA DE CRÉDITO
      ================================================= */}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Landmark size={20} className="text-indigo-600" />

          <h3 className="font-bold text-slate-900">Línea de crédito</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CreditMetric
            label="Límite aprobado"
            value={money(aprobado)}
            icon={CreditCard}
            color="indigo"
          />

          <CreditMetric
            label="Saldo utilizado"
            value={money(utilizado)}
            icon={WalletCards}
            color="amber"
          />

          <CreditMetric
            label="Disponible"
            value={money(disponible)}
            icon={CircleDollarSign}
            color="emerald"
          />

          <CreditMetric
            label="Recomendado"
            value={recomendado > 0 ? money(recomendado) : "Sin calcular"}
            icon={
              recomendadoMayor
                ? TrendingUp
                : recomendadoMenor
                  ? TrendingDown
                  : Equal
            }
            color={
              recomendadoMayor ? "emerald" : recomendadoMenor ? "rose" : "slate"
            }
          />
        </div>

        {recomendado > 0 && (
          <div
            className={`rounded-xl border p-4 ${
              recomendadoMayor
                ? "border-emerald-200 bg-emerald-50"
                : recomendadoMenor
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {recomendadoMayor ? (
                <TrendingUp className="text-emerald-600 shrink-0" size={21} />
              ) : recomendadoMenor ? (
                <TrendingDown className="text-amber-600 shrink-0" size={21} />
              ) : (
                <CheckCircle2 className="text-slate-600 shrink-0" size={21} />
              )}

              <div>
                <p className="font-bold text-slate-900">
                  {recomendadoMayor
                    ? "El motor recomienda aumentar el límite"
                    : recomendadoMenor
                      ? "El motor recomienda reducir el límite"
                      : "El límite está alineado con la recomendación"}
                </p>

                {!mismoLimite && (
                  <p className="text-sm text-slate-600 mt-1">
                    Diferencia: <strong>{money(Math.abs(diferencia))}</strong>
                    {recomendadoMayor
                      ? " por encima del límite actual."
                      : " por debajo del límite actual."}
                  </p>
                )}

                {recomendadoMenor && utilizado > recomendado && (
                  <div className="mt-3 rounded-lg bg-white/70 border border-amber-200 p-3">
                    <p className="text-xs text-amber-800">
                      El saldo utilizado actualmente es superior al nuevo límite
                      recomendado. Si se aplica la reducción, el cliente
                      conservará toda su deuda actual y su crédito disponible
                      quedará en RD$ 0.00 hasta que pague lo suficiente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={processing || recomendado <= 0 || mismoLimite}
            onClick={onApplyRecommended}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShieldCheck size={17} />
            Ajustar al recomendado
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={() => setShowManualForm(!showManualForm)}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <PencilLine size={17} />
            Definir otro límite
          </button>
        </div>

        {/* =================================================
            AJUSTE MANUAL
        ================================================= */}

        {showManualForm && (
          <div className="border border-indigo-200 bg-indigo-50 rounded-2xl p-4 space-y-4">
            <div>
              <p className="font-bold text-indigo-900">
                Ajuste manual de límite
              </p>

              <p className="text-xs text-indigo-700 mt-1">
                Todo cambio quedará registrado en el historial administrativo.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase">
                Nuevo límite aprobado
              </label>

              <input
                type="number"
                min="1"
                step="0.01"
                value={manualData.nuevo_limite}
                onChange={(event) =>
                  setManualData((old) => ({
                    ...old,

                    nuevo_limite: event.target.value,
                  }))
                }
                placeholder="Ejemplo: 30000"
                className="mt-1 w-full border border-slate-200 rounded-xl p-3 bg-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase">
                Motivo obligatorio
              </label>

              <textarea
                rows={3}
                value={manualData.motivo}
                onChange={(event) =>
                  setManualData((old) => ({
                    ...old,

                    motivo: event.target.value,
                  }))
                }
                placeholder="Explica por qué se modifica el límite..."
                className="mt-1 w-full border border-slate-200 rounded-xl p-3 bg-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={processing}
                onClick={onManualSubmit}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50"
              >
                Guardar nuevo límite
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() => setShowManualForm(false)}
                className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          HISTORIAL DE COMPORTAMIENTO
      ================================================= */}

      <div className="border-t border-slate-200 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-2">
            <Activity size={20} className="text-indigo-600 mt-0.5" />

            <div>
              <h3 className="font-bold text-slate-900">
                Historial de comportamiento del cliente
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Compras formalizadas utilizadas por el motor como referencia
                para detectar cambios de monto, dispositivo y ubicación.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold ${
              tienePatron
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {tienePatron ? "Patrón establecido" : "Historial insuficiente"}
          </span>
        </div>

        {/* RESUMEN */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <InfoBox label="Compras confiables" value={cantidadHistorica} />

          <InfoBox
            label="Promedio histórico"
            value={cantidadHistorica > 0 ? money(promedioHistorico) : "—"}
          />

          <InfoBox
            label="Monto mínimo"
            value={cantidadHistorica > 0 ? money(minimoHistorico) : "—"}
          />

          <InfoBox
            label="Monto máximo"
            value={cantidadHistorica > 0 ? money(maximoHistorico) : "—"}
          />
        </div>

        {/* TABLA */}

        {!historialComportamiento.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <History size={26} className="mx-auto text-slate-400 mb-2" />

            <p className="font-semibold text-slate-700">
              Sin historial de comportamiento
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Todavía no existen compras formalizadas marcadas como referencia
              confiable.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Fecha</th>

                  <th className="text-left px-4 py-3">Monto</th>

                  <th className="text-left px-4 py-3">Dispositivo</th>

                  <th className="text-left px-4 py-3">IP</th>

                  <th className="text-left px-4 py-3">Ubicación</th>

                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {historialComportamiento.map((item) => {
                  const ubicacion =
                    [item.ciudad, item.region, item.pais]
                      .filter(Boolean)
                      .join(", ") || "Sin ubicación";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      {/* FECHA */}

                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>

                      {/* MONTO */}

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-slate-900">
                            {money(item.monto_actual)}
                          </p>

                          {item.monto_fuera_patron && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              Fuera del patrón
                            </span>
                          )}
                        </div>
                      </td>

                      {/* DISPOSITIVO */}

                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Smartphone
                            size={15}
                            className="text-slate-400 shrink-0 mt-0.5"
                          />

                          <div>
                            <p className="text-xs font-semibold text-slate-700 max-w-[180px] truncate">
                              {item.dispositivo_id || "Sin identificador"}
                            </p>

                            <p
                              className={`text-[10px] font-semibold mt-0.5 ${
                                item.dispositivo_nuevo
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.dispositivo_nuevo ? "Nuevo" : "Conocido"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* IP */}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Wifi size={14} className="text-slate-400 shrink-0" />

                          <div>
                            <p className="text-xs text-slate-600">
                              {item.ip || "—"}
                            </p>

                            <p
                              className={`text-[10px] font-semibold ${
                                item.ip_nueva
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.ip_nueva ? "Nueva" : "Conocida"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* UBICACIÓN */}

                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <MapPin
                            size={14}
                            className="text-slate-400 shrink-0 mt-0.5"
                          />

                          <div>
                            <p className="text-xs text-slate-600 max-w-[220px]">
                              {ubicacion}
                            </p>

                            {item.latitud !== null &&
                              item.latitud !== undefined &&
                              item.longitud !== null &&
                              item.longitud !== undefined && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {Number(item.latitud).toFixed(4)}

                                  {", "}

                                  {Number(item.longitud).toFixed(4)}
                                </p>
                              )}
                          </div>
                        </div>
                      </td>

                      {/* ESTADO */}

                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Referencia confiable
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          HISTORIAL DE LÍMITES
      ================================================= */}

      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <History size={18} className="text-slate-500" />

          <h4 className="font-bold text-slate-800">Historial de límites</h4>
        </div>

        {!creditLine.historial?.length ? (
          <p className="text-sm text-slate-400">
            Todavía no existen ajustes administrativos registrados.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {creditLine.historial.map((item) => {
              const anterior = Number(item.limite_anterior || 0);

              const nuevo = Number(item.limite_nuevo || 0);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-3 bg-slate-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {money(anterior)}

                        {" → "}

                        {money(nuevo)}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {titleCase(item.tipo_ajuste)}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400">
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  {item.motivo && (
                    <p className="text-xs text-slate-600 mt-2">{item.motivo}</p>
                  )}

                  {item.administrador && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Administrador:{" "}
                      {`${item.administrador.nombre || ""} ${
                        item.administrador.apellido || ""
                      }`.trim() ||
                        item.administrador.email ||
                        `ID ${item.usuario_admin_id}`}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white rounded-lg p-2 border border-slate-100">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">
                        Utilizado
                      </p>

                      <p className="text-xs font-semibold">
                        {money(item.saldo_utilizado_momento)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-2 border border-slate-100">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">
                        Disponible nuevo
                      </p>

                      <p className="text-xs font-semibold">
                        {money(item.credito_disponible_nuevo)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   MÉTRICA DE CRÉDITO
===================================================== */

function CreditMetric({ label, value, icon: Icon, color = "slate" }) {
  const colors = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",

    amber: "bg-amber-50 border-amber-100 text-amber-700",

    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",

    rose: "bg-rose-50 border-rose-100 text-rose-700",

    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.slate}`}>
      <Icon size={18} />

      <p className="text-[10px] uppercase tracking-wide font-bold opacity-70 mt-2">
        {label}
      </p>

      <p className="font-bold text-sm mt-1">{value}</p>
    </div>
  );
}

/* =====================================================
   CONTEXTO Y COMPORTAMIENTO DE COMPRA
===================================================== */

function PurchaseContextPanel({ context }) {
  if (!context) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-slate-500" />

          <div>
            <h3 className="font-bold text-slate-800">
              Contexto y comportamiento de la compra
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Esta evaluación no posee contexto histórico asociado. Las
              evaluaciones anteriores a la incorporación de este módulo pueden
              aparecer sin estos datos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const purchaseCount = Number(context.cantidad_compras_historial || 0);

  const locationText =
    [context.ciudad, context.region, context.pais].filter(Boolean).join(", ") ||
    "Sin ubicación textual";

  const coordinates =
    context.latitud !== null &&
    context.latitud !== undefined &&
    context.longitud !== null &&
    context.longitud !== undefined
      ? `${Number(context.latitud).toFixed(5)}, ${Number(
          context.longitud,
        ).toFixed(5)}`
      : "—";

  const amountOutsidePattern = Boolean(context.monto_fuera_patron);

  const deviceNew = Boolean(context.dispositivo_nuevo);

  const ipNew = Boolean(context.ip_nueva);

  const locationNew = Boolean(context.ubicacion_nueva);

  const inconsistentLocation = Boolean(context.ubicacion_inconsistente);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={20} className="text-indigo-600" />

        <div>
          <h3 className="font-bold text-slate-900">
            Contexto y comportamiento de la compra
          </h3>

          <p className="text-xs text-slate-500 mt-0.5">
            Comparación de la operación actual con registros confiables
            anteriores del cliente.
          </p>
        </div>
      </div>

      {/* MONTO */}

      <div
        className={`rounded-2xl border p-4 ${
          amountOutsidePattern
            ? "border-rose-200 bg-rose-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <CircleDollarSign
              size={19}
              className={
                amountOutsidePattern ? "text-rose-600" : "text-indigo-600"
              }
            />

            <h4 className="font-bold text-slate-900">
              Comportamiento de consumo
            </h4>
          </div>

          <span
            className={`inline-flex w-fit px-2.5 py-1 rounded-full text-xs font-bold ${
              amountOutsidePattern
                ? "bg-rose-100 text-rose-700"
                : purchaseCount >= 3
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-700"
            }`}
          >
            {amountOutsidePattern
              ? "Monto fuera del patrón"
              : purchaseCount >= 3
                ? "Monto dentro del patrón"
                : "Historial insuficiente"}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoBox label="Compra actual" value={money(context.monto_actual)} />

          <InfoBox label="Compras históricas" value={purchaseCount} />

          <InfoBox
            label="Promedio histórico"
            value={
              context.promedio_monto_historico !== null &&
              context.promedio_monto_historico !== undefined
                ? money(context.promedio_monto_historico)
                : "—"
            }
          />

          <InfoBox
            label="Mínimo histórico"
            value={
              context.monto_minimo_historico !== null &&
              context.monto_minimo_historico !== undefined
                ? money(context.monto_minimo_historico)
                : "—"
            }
          />

          <InfoBox
            label="Máximo histórico"
            value={
              context.monto_maximo_historico !== null &&
              context.monto_maximo_historico !== undefined
                ? money(context.monto_maximo_historico)
                : "—"
            }
          />

          <InfoBox
            label="Variación vs promedio"
            value={formatPercent(context.porcentaje_variacion_monto)}
          />
        </div>

        {amountOutsidePattern && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 p-3">
            <div className="flex gap-2">
              <AlertTriangle
                size={18}
                className="text-rose-600 shrink-0 mt-0.5"
              />

              <div>
                <p className="font-bold text-sm text-rose-800">
                  Monto inusual respecto al historial
                </p>

                <p className="text-sm text-rose-700 mt-1">
                  La compra actual se encuentra muy por encima del
                  comportamiento habitual registrado para el cliente.
                </p>

                <p className="text-xs text-rose-600 mt-2">
                  Esta condición participa en el cálculo de fraude de la
                  operación.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DISPOSITIVO / IP */}

      <div className="rounded-2xl border border-slate-200 p-4 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={19} className="text-indigo-600" />

          <h4 className="font-bold text-slate-900">Dispositivo y red</h4>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div
            className={`rounded-xl border p-3 ${
              deviceNew
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">
                Dispositivo
              </p>

              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  deviceNew
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {deviceNew ? "Nuevo" : "Conocido"}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-800 break-all">
              {context.dispositivo_id || "Sin identificador"}
            </p>

            {context.user_agent && (
              <div className="mt-3 border-t border-slate-200 pt-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Navegador / dispositivo
                </p>

                <p className="text-xs text-slate-500 mt-1 break-words">
                  {context.user_agent}
                </p>
              </div>
            )}

            {deviceNew && (
              <p className="text-xs text-amber-700 font-medium mt-3">
                El dispositivo actual no aparece en el historial confiable del
                cliente.
              </p>
            )}
          </div>

          <div
            className={`rounded-xl border p-3 ${
              ipNew
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Wifi size={15} className="text-slate-500" />

                <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">
                  Dirección IP
                </p>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  ipNew
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {ipNew ? "Nueva" : "Conocida"}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-800 break-all">
              {context.ip || "No disponible"}
            </p>

            {ipNew && (
              <p className="text-xs text-amber-700 font-medium mt-3">
                La dirección IP no coincide con las registradas previamente.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* UBICACIÓN */}

      <div
        className={`rounded-2xl border p-4 ${
          inconsistentLocation
            ? "border-rose-200 bg-rose-50"
            : locationNew
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPin
              size={19}
              className={
                inconsistentLocation
                  ? "text-rose-600"
                  : locationNew
                    ? "text-amber-600"
                    : "text-indigo-600"
              }
            />

            <h4 className="font-bold text-slate-900">Ubicación geográfica</h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {locationNew && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                Ubicación nueva
              </span>
            )}

            {inconsistentLocation && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                Ubicación inconsistente
              </span>
            )}

            {!locationNew && !inconsistentLocation && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                Ubicación conocida
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoBox label="Ubicación" value={locationText} />

          <InfoBox label="Coordenadas" value={coordinates} />

          <InfoBox
            label="Distancia ubicación anterior"
            value={formatKm(context.distancia_ubicacion_anterior_km)}
          />

          <InfoBox
            label="Precisión GPS"
            value={
              context.precision_ubicacion !== null &&
              context.precision_ubicacion !== undefined
                ? `${Number(context.precision_ubicacion).toFixed(0)} m`
                : "—"
            }
          />

          <InfoBox label="Ubicación nueva" value={yesNo(locationNew)} />

          <InfoBox
            label="Inconsistencia geográfica"
            value={yesNo(inconsistentLocation)}
          />
        </div>

        {inconsistentLocation && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 p-3">
            <div className="flex gap-2">
              <AlertTriangle
                size={18}
                className="text-rose-600 shrink-0 mt-0.5"
              />

              <p className="text-sm text-rose-800">
                Se detectó un cambio geográfico considerable respecto a la
                ubicación registrada anteriormente.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* TRAZABILIDAD */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 mb-3">
          <History size={17} className="text-slate-500" />

          <h4 className="text-sm font-bold text-slate-800">
            Trazabilidad del contexto
          </h4>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <InfoBox
            label="Estado operación"
            value={titleCase(context.estado_operacion)}
          />

          <InfoBox label="Decisión" value={titleCase(context.decision)} />

          <InfoBox
            label="Referencia de comportamiento"
            value={context.es_referencia_comportamiento ? "Sí" : "No"}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          Contexto registrado: {formatDate(context.created_at)}
        </p>
      </div>
    </div>
  );
}

/* =====================================================
   MODAL ALERTA
===================================================== */

function AlertDetailModal({
  alert,
  comment,
  setComment,
  processing,

  creditLine,
  loadingCreditLine,

  showManualCreditForm,
  setShowManualCreditForm,

  manualCreditData,
  setManualCreditData,

  onApplyRecommended,
  onManualCreditSubmit,

  onClose,

  onStart,
  onConfirm,
  onConfirmAndBlock,
  onDiscard,
  onResolve,

  onBlock,
  onUnblock,
}) {
  const blocked = Boolean(alert.perfil_riesgo?.bloqueado_preventivamente);

  return (
    <ModalShell title="Detalle de alerta" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <InfoBox
            label="Cliente"
            value={alert.cliente?.nombre_completo || "—"}
          />

          <InfoBox label="Correo" value={alert.cliente?.email || "—"} />

          <InfoBox label="Severidad" value={titleCase(alert.severidad)} />

          <InfoBox label="Estado" value={titleCase(alert.estado)} />
        </div>

        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
          <p className="font-bold text-rose-800">{alert.titulo}</p>

          <p className="text-sm text-rose-700 mt-1">{alert.descripcion}</p>

          {alert.codigo_alerta && (
            <p className="text-[11px] text-rose-500 mt-2 font-semibold">
              Código: {alert.codigo_alerta}
            </p>
          )}
        </div>

        {/* LÍNEA DE CRÉDITO */}

        <CreditLinePanel
          creditLine={creditLine}
          loading={loadingCreditLine}
          processing={processing}
          showManualForm={showManualCreditForm}
          setShowManualForm={setShowManualCreditForm}
          manualData={manualCreditData}
          setManualData={setManualCreditData}
          onApplyRecommended={onApplyRecommended}
          onManualSubmit={onManualCreditSubmit}
        />

        {/* PERFIL */}

        {alert.perfil_riesgo && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">Perfil de riesgo</h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <InfoBox
                label="Score crediticio"
                value={`${Number(
                  alert.perfil_riesgo.puntaje_crediticio || 0,
                ).toFixed(0)}/100`}
              />

              <InfoBox
                label="Fraude histórico"
                value={`${Number(
                  alert.perfil_riesgo.puntaje_fraude || 0,
                ).toFixed(0)}/100`}
              />

              <InfoBox
                label="Nivel"
                value={titleCase(alert.perfil_riesgo.nivel_riesgo)}
              />
            </div>
          </div>
        )}

        {/* EVALUACIÓN */}

        {alert.evaluacion && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">
              Evaluación relacionada
            </h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <InfoBox label="Monto" value={money(alert.evaluacion.monto)} />

              <InfoBox
                label="Score crédito"
                value={`${Number(
                  alert.evaluacion.puntaje_crediticio || 0,
                ).toFixed(0)}/100`}
              />

              <InfoBox
                label="Fraude operación"
                value={`${Number(alert.evaluacion.puntaje_fraude || 0).toFixed(
                  0,
                )}/100`}
              />

              <InfoBox
                label="Nivel"
                value={titleCase(alert.evaluacion.nivel_riesgo)}
              />

              <InfoBox
                label="Decisión"
                value={titleCase(alert.evaluacion.decision)}
              />

              <InfoBox
                label="Fecha"
                value={formatDate(alert.evaluacion.fecha)}
              />
            </div>

            {alert.evaluacion.motivo && (
              <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Motivo
                </p>

                <p className="text-sm text-slate-700 mt-1">
                  {alert.evaluacion.motivo}
                </p>
              </div>
            )}
          </div>
        )}

        {/* NUEVO: CONTEXTO */}

        <PurchaseContextPanel context={alert.evaluacion?.contexto_compra} />

        {/* SEÑALES */}

        {alert.evaluacion?.senales?.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">
              Señales detectadas
            </h3>

            <SignalsList signals={alert.evaluacion.senales} />
          </div>
        )}

        {/* COMENTARIO */}

        <div>
          <label className="text-sm font-bold text-slate-700">
            Comentario administrativo
          </label>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder="Escribe una observación..."
            className="mt-2 w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500"
          />
        </div>

        {/* ACCIONES */}

        <div className="grid sm:grid-cols-2 gap-2">
          {alert.estado === "abierta" && (
            <ActionButton
              label="Poner en revisión"
              icon={Clock3}
              color="amber"
              disabled={processing}
              onClick={onStart}
            />
          )}

          {!["descartada", "resuelta"].includes(alert.estado) && (
            <ActionButton
              label="Confirmar alerta"
              icon={CheckCircle2}
              color="indigo"
              disabled={processing}
              onClick={onConfirm}
            />
          )}

          {!["descartada", "resuelta"].includes(alert.estado) && (
            <ActionButton
              label="Confirmar y bloquear"
              icon={UserX}
              color="rose"
              disabled={processing}
              onClick={onConfirmAndBlock}
            />
          )}

          {!["descartada", "resuelta"].includes(alert.estado) && (
            <ActionButton
              label="Descartar"
              icon={XCircle}
              color="slate"
              disabled={processing}
              onClick={onDiscard}
            />
          )}

          {alert.estado === "confirmada" && (
            <ActionButton
              label="Marcar resuelta"
              icon={ShieldCheck}
              color="emerald"
              disabled={processing}
              onClick={onResolve}
            />
          )}

          {blocked ? (
            <ActionButton
              label="Desbloquear cliente"
              icon={UserCheck}
              color="emerald"
              disabled={processing}
              onClick={onUnblock}
            />
          ) : (
            <ActionButton
              label="Bloquear cliente"
              icon={UserX}
              color="rose"
              disabled={processing}
              onClick={onBlock}
            />
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* =====================================================
   MODAL REVISIÓN MANUAL
===================================================== */

function ReviewDetailModal({
  review,
  comment,
  setComment,
  processing,

  creditLine,
  loadingCreditLine,

  showManualCreditForm,
  setShowManualCreditForm,

  manualCreditData,
  setManualCreditData,

  onApplyRecommended,
  onManualCreditSubmit,

  onClose,

  onStart,
  onApprove,
  onReject,

  showConditionalForm,
  setShowConditionalForm,

  conditionalData,
  setConditionalData,

  onConditionalApprove,
}) {
  const finished = ["aprobada", "aprobada_condicionada", "rechazada"].includes(
    review.estado_revision,
  );

  return (
    <ModalShell title="Revisión manual" onClose={onClose}>
      <div className="space-y-6">
        {/* INFORMACIÓN GENERAL */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoBox
            label="Cliente"
            value={review.cliente?.nombre_completo || "—"}
          />

          <InfoBox
            label="Monto solicitado"
            value={money(review.monto_original)}
          />

          <InfoBox
            label="Monto financiable"
            value={money(review.monto_financiable)}
          />

          <InfoBox
            label="Score crediticio"
            value={`${Number(review.puntaje_crediticio || 0).toFixed(0)}/100`}
          />

          <InfoBox
            label="Riesgo fraude"
            value={`${Number(review.puntaje_fraude || 0).toFixed(0)}/100`}
          />

          <InfoBox
            label="Nivel de riesgo"
            value={titleCase(review.nivel_riesgo)}
          />

          <InfoBox label="Estado" value={titleCase(review.estado_revision)} />

          <InfoBox
            label="Enganche"
            value={`${Number(review.porcentaje_enganche || 0).toFixed(2)}%`}
          />

          <InfoBox
            label="Cuotas permitidas"
            value={review.numero_cuotas_permitidas ?? "—"}
          />
        </div>

        {/* MOTIVO */}

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs font-bold uppercase text-amber-700">
            Motivo del motor
          </p>

          <p className="font-semibold text-amber-900 mt-1">
            {review.motivo || "Sin motivo registrado"}
          </p>

          {review.explicacion && (
            <p className="text-sm text-amber-700 mt-2">{review.explicacion}</p>
          )}
        </div>

        {/* LÍNEA DE CRÉDITO */}

        <CreditLinePanel
          creditLine={creditLine}
          loading={loadingCreditLine}
          processing={processing}
          showManualForm={showManualCreditForm}
          setShowManualForm={setShowManualCreditForm}
          manualData={manualCreditData}
          setManualData={setManualCreditData}
          onApplyRecommended={onApplyRecommended}
          onManualSubmit={onManualCreditSubmit}
        />

        {/* PERFIL */}

        {review.perfil_riesgo && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">Perfil actual</h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <InfoBox
                label="Deuda activa"
                value={money(review.perfil_riesgo.deuda_activa)}
              />

              <InfoBox
                label="Límite recomendado"
                value={money(review.perfil_riesgo.limite_recomendado)}
              />

              <InfoBox
                label="Puntualidad"
                value={`${Number(
                  review.perfil_riesgo.porcentaje_puntualidad || 0,
                ).toFixed(1)}%`}
              />

              <InfoBox
                label="Score perfil"
                value={`${Number(
                  review.perfil_riesgo.puntaje_crediticio || 0,
                ).toFixed(0)}/100`}
              />

              <InfoBox
                label="Fraude histórico"
                value={`${Number(
                  review.perfil_riesgo.puntaje_fraude || 0,
                ).toFixed(0)}/100`}
              />

              <InfoBox
                label="Nivel"
                value={titleCase(review.perfil_riesgo.nivel_riesgo)}
              />
            </div>
          </div>
        )}

        {/* NUEVO: CONTEXTO DE COMPRA */}

        <PurchaseContextPanel context={review.contexto_compra} />

        {/* SEÑALES */}

        {review.senales?.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">
              Señales de evaluación
            </h3>

            <SignalsList signals={review.senales} />
          </div>
        )}

        {/* ALERTAS ASOCIADAS */}

        {review.alertas?.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">
              Alertas relacionadas
            </h3>

            <div className="space-y-2">
              {review.alertas.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-rose-900">
                      {alert.titulo}
                    </p>

                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${getSeverityClasses(
                        alert.severidad,
                      )}`}
                    >
                      {titleCase(alert.severidad)}
                    </span>
                  </div>

                  <p className="text-xs text-rose-700 mt-2">
                    {alert.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMENTARIO */}

        {!finished && (
          <div>
            <label className="text-sm font-bold text-slate-700">
              Comentario de revisión
            </label>

            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="mt-2 w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500"
              placeholder="Escribe el motivo de la decisión..."
            />
          </div>
        )}

        {/* ACCIONES */}

        {!finished && (
          <div className="space-y-2">
            {review.estado_revision === "pendiente" && (
              <ActionButton
                label="Iniciar revisión"
                icon={Clock3}
                color="amber"
                disabled={processing}
                onClick={onStart}
              />
            )}

            <div className="grid sm:grid-cols-3 gap-2">
              <ActionButton
                label="Aprobar"
                icon={CheckCircle2}
                color="emerald"
                disabled={processing}
                onClick={onApprove}
              />

              <ActionButton
                label="Aprobar con condiciones"
                icon={ClipboardCheck}
                color="indigo"
                disabled={processing}
                onClick={() => setShowConditionalForm(!showConditionalForm)}
              />

              <ActionButton
                label="Rechazar"
                icon={XCircle}
                color="rose"
                disabled={processing}
                onClick={onReject}
              />
            </div>
          </div>
        )}

        {/* APROBACIÓN CONDICIONADA */}

        {showConditionalForm && !finished && (
          <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-4">
            <p className="font-bold text-indigo-900">
              Condiciones administrativas
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Enganche %
                </label>

                <input
                  type="number"
                  min="0"
                  max="40"
                  value={conditionalData.porcentaje_enganche}
                  onChange={(event) =>
                    setConditionalData((old) => ({
                      ...old,

                      porcentaje_enganche: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-xl p-3 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Cuotas
                </label>

                <select
                  value={conditionalData.numero_cuotas}
                  onChange={(event) =>
                    setConditionalData((old) => ({
                      ...old,

                      numero_cuotas: Number(event.target.value),
                    }))
                  }
                  className="mt-1 w-full border rounded-xl p-3 bg-white"
                >
                  <option value={1}>1 cuota</option>

                  <option value={4}>4 cuotas</option>

                  <option value={12}>12 cuotas</option>

                  <option value={24}>24 cuotas</option>
                </select>
              </div>
            </div>

            <textarea
              value={conditionalData.comentario}
              onChange={(event) =>
                setConditionalData((old) => ({
                  ...old,

                  comentario: event.target.value,
                }))
              }
              rows={3}
              placeholder="Comentario de las condiciones..."
              className="w-full border rounded-xl p-3 bg-white"
            />

            <button
              type="button"
              disabled={processing}
              onClick={onConditionalApprove}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50"
            >
              Confirmar aprobación condicionada
            </button>
          </div>
        )}

        {/* FINALIZADA */}

        {finished && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="font-bold text-slate-800">Revisión finalizada</p>

            <p className="text-sm text-slate-600 mt-1">
              Estado: <strong>{titleCase(review.estado_revision)}</strong>
            </p>

            {review.comentario_revision && (
              <p className="text-sm text-slate-600 mt-2">
                {review.comentario_revision}
              </p>
            )}

            <p className="text-xs text-slate-400 mt-2">
              {formatDate(review.fecha_revision)}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* =====================================================
   SEÑALES
===================================================== */

function SignalsList({ signals }) {
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {signals.map((signal, index) => {
        const isAmountPattern = signal.codigo === "MONTO_FUERA_DE_PATRON";

        const isDevice = signal.codigo === "DISPOSITIVO_NUEVO";

        const isIp = signal.codigo === "IP_NUEVA";

        const isLocation = [
          "UBICACION_NUEVA",
          "UBICACION_INCONSISTENTE",
        ].includes(signal.codigo);

        return (
          <div
            key={signal.id || `${signal.codigo}-${index}`}
            className={`border rounded-xl p-3 ${
              isAmountPattern
                ? "border-rose-200 bg-rose-50"
                : isDevice || isIp || isLocation
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-slate-800">
                  {signal.nombre}
                </p>

                {signal.codigo && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {signal.codigo}
                  </p>
                )}
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold h-fit ${getSeverityClasses(
                  signal.severidad,
                )}`}
              >
                {titleCase(signal.severidad)}
              </span>
            </div>

            {signal.valor_texto && (
              <p className="text-xs font-semibold text-slate-600 mt-2">
                {signal.valor_texto}
              </p>
            )}

            {signal.descripcion && (
              <p className="text-xs text-slate-500 mt-2">
                {signal.descripcion}
              </p>
            )}

            {signal.impacto !== undefined && signal.impacto !== null && (
              <p
                className={`text-xs font-bold mt-2 ${
                  Number(signal.impacto) < 0
                    ? "text-rose-600"
                    : Number(signal.impacto) > 0
                      ? "text-orange-600"
                      : "text-slate-400"
                }`}
              >
                Impacto en evaluación: {Number(signal.impacto) > 0 ? "+" : ""}
                {Number(signal.impacto)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =====================================================
   PAGINACIÓN
===================================================== */

function Pagination({ page, pages, setPage }) {
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => setPage((current) => Math.max(current - 1, 1))}
        className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
      >
        Anterior
      </button>

      <span className="text-sm text-slate-500">
        Página {page} de {pages}
      </span>

      <button
        type="button"
        disabled={page >= pages}
        onClick={() => setPage((current) => Math.min(current + 1, pages))}
        className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}

/* =====================================================
   MODAL BASE
===================================================== */

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden bg-white rounded-3xl shadow-2xl flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-xl text-slate-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* =====================================================
   INFO BOX
===================================================== */

function InfoBox({ label, value }) {
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-semibold text-sm text-slate-800 break-words">
        {value ?? "—"}
      </p>
    </div>
  );
}

/* =====================================================
   BOTÓN DE ACCIÓN
===================================================== */

function ActionButton({ label, icon: Icon, color, disabled, onClick }) {
  const colors = {
    amber: "bg-amber-100 text-amber-800 hover:bg-amber-200",

    indigo: "bg-indigo-600 text-white hover:bg-indigo-500",

    emerald: "bg-emerald-600 text-white hover:bg-emerald-500",

    rose: "bg-rose-600 text-white hover:bg-rose-500",

    slate: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        colors[color] || colors.slate
      }`}
    >
      <Icon size={17} />

      {label}
    </button>
  );
}
