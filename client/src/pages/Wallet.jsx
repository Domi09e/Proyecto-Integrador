import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // Usamos framer-motion para suavidad
import {
  Wallet as WalletIcon,
  TrendingUp,
  Calendar,
  CreditCard,
  ArrowRight,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/authContext";

export default function Cartera() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [evaluacion, setEvaluacion] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [montoSolicitado, setMontoSolicitado] = useState("");
  const [motivoSolicitud, setMotivoSolicitud] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [cancelandoSolicitudId, setCancelandoSolicitudId] = useState(null);
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");
  const [errorSolicitud, setErrorSolicitud] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [walletResponse, evaluationResponse, requestsResponse] =
          await Promise.all([
            api.get("/client/wallet-summary"),
            api.get("/client/credit-evaluation"),
            api.get("/client/credit-increase-requests"),
          ]);

        setData(walletResponse.data);
        setEvaluacion(evaluationResponse.data);
        setSolicitudes(requestsResponse.data?.solicitudes || []);
      } catch (err) {
        console.error("Error cargando cartera:", err);

        setError("No pudimos cargar tu información financiera.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const response = await api.get("/client/credit-increase-requests");

      setSolicitudes(response.data?.solicitudes || []);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
    }
  };

  const solicitudPendiente = solicitudes.find(
    (solicitud) => solicitud.estado === "pendiente",
  );

  const handleSolicitarAumento = async (event) => {
    event.preventDefault();

    setMensajeSolicitud("");
    setErrorSolicitud("");

    const monto = Number(montoSolicitado);

    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorSolicitud("Ingresa un monto válido mayor que cero.");
      return;
    }

    if (monto > 500000) {
      setErrorSolicitud("El monto solicitado no puede superar RD$ 500,000.");
      return;
    }

    if (motivoSolicitud.trim().length > 500) {
      setErrorSolicitud("El motivo no puede tener más de 500 caracteres.");
      return;
    }

    try {
      setEnviandoSolicitud(true);

      const response = await api.post("/client/credit-increase-requests", {
        monto_solicitado: monto,
        motivo_cliente: motivoSolicitud.trim() || null,
      });

      setMensajeSolicitud(
        response.data?.message || "Solicitud enviada correctamente.",
      );

      setMontoSolicitado("");
      setMotivoSolicitud("");

      await cargarSolicitudes();
    } catch (error) {
      console.error("Error enviando solicitud:", error);

      setErrorSolicitud(
        error.response?.data?.message || "No se pudo enviar la solicitud.",
      );
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const handleCancelarSolicitud = async (solicitudId) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas cancelar esta solicitud?",
    );

    if (!confirmar) {
      return;
    }

    setMensajeSolicitud("");
    setErrorSolicitud("");

    try {
      setCancelandoSolicitudId(solicitudId);

      const response = await api.patch(
        `/client/credit-increase-requests/${solicitudId}/cancel`,
      );

      setMensajeSolicitud(
        response.data?.message || "Solicitud cancelada correctamente.",
      );

      await cargarSolicitudes();
    } catch (error) {
      console.error("Error cancelando solicitud:", error);

      setErrorSolicitud(
        error.response?.data?.message || "No se pudo cancelar la solicitud.",
      );
    } finally {
      setCancelandoSolicitudId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">
            Cargando tu billetera...
          </p>
        </div>
      </div>
    );
  }

  // Datos seguros
  const disponible = data?.disponible || 0;
  const deudaTotal = data?.deuda_total || 0;
  const compras = data?.compras_activas || [];
  const proximoPago = data?.proximo_pago;

  // Cálculo visual de barra
  const limiteTotal = disponible + deudaTotal;
  const porcentajeUso = limiteTotal > 0 ? (deudaTotal / limiteTotal) * 100 : 0;

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20">
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm/50 backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <WalletIcon className="text-indigo-600" /> Billetera
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-medium uppercase">
                Hola,
              </p>
              <p className="text-sm font-bold text-slate-700">{user?.nombre}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-200">
              {user?.nombre?.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      >
        {/* --- SECCIÓN SUPERIOR: TARJETA Y RESUMEN --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. TARJETA VIRTUAL PREMIUM */}
          <motion.div variants={itemVariants} className="lg:col-span-7">
            <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200 transition-transform hover:scale-[1.01] duration-500 group">
              {/* Background Gradiente Animado */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca]"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl -ml-10 -mb-10"></div>

              {/* Textura de ruido (opcional para realismo) */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

              <div className="relative z-10 p-8 flex flex-col justify-between h-full text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-indigo-200 text-xs font-semibold tracking-[0.2em] uppercase mb-1">
                      BNPL Virtual Card
                    </p>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-indigo-100 font-medium">
                        Protección activa
                      </span>
                    </div>
                  </div>
                  {/* Chip Simulado */}
                  <div className="w-12 h-9 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 shadow-inner opacity-90 flex items-center justify-center">
                    <div className="w-8 h-5 border border-yellow-600/50 rounded-sm grid grid-cols-2 gap-px">
                      <div className="border-r border-yellow-600/50"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-indigo-200 font-medium">
                    Saldo Disponible
                  </p>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white drop-shadow-md">
                    RD${" "}
                    {disponible.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </h2>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-indigo-300 font-mono tracking-widest mb-1">
                      •••• •••• •••• {user?.id.toString().padStart(4, "0")}
                    </p>
                    <p className="text-sm font-semibold tracking-wide uppercase">
                      {user?.nombre} {user?.apellido}
                    </p>
                  </div>
                  {/* Logo Marca (Simulado) */}
                  <div className="flex -space-x-3 opacity-90">
                    <div className="w-8 h-8 rounded-full bg-red-500/80"></div>
                    <div className="w-8 h-8 rounded-full bg-yellow-500/80"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. ESTADÍSTICAS Y PRÓXIMO PAGO */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {/* Tarjeta de Próximo Pago */}
            <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
              {proximoPago ? (
                <>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800">
                        Próximo Vencimiento
                      </h3>
                    </div>

                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">
                          RD$ {Number(proximoPago.monto).toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(proximoPago.fecha).toLocaleDateString(
                            "es-DO",
                            { weekday: "long", day: "numeric", month: "long" },
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-md mb-1">
                          Cuota {proximoPago.numero}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/pagos"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                    >
                      Pagar ahora <ArrowRight size={16} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">¡Todo al día!</p>
                    <p className="text-sm text-slate-500 px-4">
                      No tienes cuotas pendientes próximas a vencer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Uso de Crédito */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  Deuda Total
                </span>
                <span className="text-sm font-bold text-indigo-600">
                  RD$ {deudaTotal.toLocaleString()}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentajeUso}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${porcentajeUso > 80 ? "bg-rose-500" : "bg-indigo-500"}`}
                ></motion.div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">
                Has usado el {Math.round(porcentajeUso)}% de tu límite
              </p>
            </div>
          </motion.div>
        </div>

        {/* --- EVALUACIÓN CREDITICIA --- */}
        <motion.div variants={itemVariants} className="mb-10">
          <div
            className={`rounded-3xl border p-6 shadow-sm ${
              !evaluacion?.tiene_evaluacion
                ? "bg-white border-slate-200"
                : evaluacion?.es_elegible
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    !evaluacion?.tiene_evaluacion
                      ? "bg-slate-100 text-slate-500"
                      : evaluacion?.es_elegible
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {evaluacion?.es_elegible ? (
                    <ShieldCheck size={24} />
                  ) : evaluacion?.tiene_evaluacion ? (
                    <AlertTriangle size={24} />
                  ) : (
                    <TrendingUp size={24} />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Evaluación crediticia
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {!evaluacion?.tiene_evaluacion
                      ? "Aún no tienes una evaluación"
                      : evaluacion?.es_elegible
                        ? "Comportamiento favorable"
                        : "Continúa mejorando tu historial"}
                  </h3>

                  <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                    {evaluacion?.mensaje}
                  </p>
                </div>
              </div>

              {evaluacion?.tiene_evaluacion && (
                <div className="flex items-center gap-6 md:border-l md:border-slate-200 md:pl-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900">
                      {Number(
                        evaluacion.evaluacion?.porcentaje_puntualidad || 0,
                      ).toFixed(0)}
                      %
                    </p>

                    <p className="text-xs text-slate-500">Puntualidad</p>
                  </div>

                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900">
                      {evaluacion.evaluacion?.cuotas_pagadas_a_tiempo || 0}/
                      {evaluacion.evaluacion?.cuotas_totales || 0}
                    </p>

                    <p className="text-xs text-slate-500">Cuotas puntuales</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* --- SOLICITUD DE AUMENTO DE CRÉDITO --- */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aumento de crédito
              </p>

              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Solicitar revisión de límite
              </h3>

              <p className="text-sm text-slate-600 mt-2">
                La solicitud será evaluada por un administrador. Enviar la
                solicitud no garantiza que el aumento sea aprobado.
              </p>
            </div>

            <div className="p-6">
              {!evaluacion?.tiene_evaluacion && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Todavía no puedes solicitar un aumento.
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Primero debes completar un financiamiento y obtener una
                    evaluación crediticia.
                  </p>
                </div>
              )}

              {evaluacion?.tiene_evaluacion && !evaluacion?.es_elegible && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Tu evaluación actual no es elegible.
                  </p>

                  <p className="text-sm text-amber-700 mt-1">
                    Puntualidad registrada:{" "}
                    {Number(
                      evaluacion.evaluacion?.porcentaje_puntualidad || 0,
                    ).toFixed(2)}
                    %.
                  </p>
                </div>
              )}

              {solicitudPendiente && (
                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
                  <p className="text-sm font-bold text-blue-900">
                    Ya tienes una solicitud pendiente
                  </p>

                  <p className="text-sm text-blue-700 mt-1">
                    Monto solicitado:{" "}
                    {Number(solicitudPendiente.monto_solicitado).toLocaleString(
                      "es-DO",
                      {
                        style: "currency",
                        currency: "DOP",
                      },
                    )}
                  </p>

                  <p className="text-sm text-blue-700 mt-1">
                    Enviada el{" "}
                    {new Date(
                      solicitudPendiente.fecha_solicitud,
                    ).toLocaleDateString("es-DO")}
                  </p>
                </div>
              )}

              {evaluacion?.es_elegible && !solicitudPendiente && (
                <form onSubmit={handleSolicitarAumento} className="space-y-5">
                  <div>
                    <label
                      htmlFor="montoSolicitado"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      Monto adicional solicitado
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                        RD$
                      </span>

                      <input
                        id="montoSolicitado"
                        type="number"
                        min="1"
                        max="500000"
                        step="0.01"
                        value={montoSolicitado}
                        onChange={(event) =>
                          setMontoSolicitado(event.target.value)
                        }
                        placeholder="10000.00"
                        className="w-full rounded-2xl border border-slate-200 py-3 pl-14 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      Indica cuánto crédito adicional deseas solicitar.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="motivoSolicitud"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      Motivo de la solicitud
                    </label>

                    <textarea
                      id="motivoSolicitud"
                      rows="4"
                      maxLength="500"
                      value={motivoSolicitud}
                      onChange={(event) =>
                        setMotivoSolicitud(event.target.value)
                      }
                      placeholder="Explica brevemente por qué deseas aumentar tu límite..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-slate-400">
                        {motivoSolicitud.length}/500
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={enviandoSolicitud}
                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enviandoSolicitud
                      ? "Enviando solicitud..."
                      : "Enviar solicitud"}
                  </button>
                </form>
              )}

              {mensajeSolicitud && (
                <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    {mensajeSolicitud}
                  </p>
                </div>
              )}

              {errorSolicitud && (
                <div className="mt-5 rounded-2xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm font-semibold text-red-700">
                    {errorSolicitud}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* --- HISTORIAL DE SOLICITUDES --- */}
        {solicitudes.length > 0 && (
          <motion.div variants={itemVariants} className="mb-10">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Historial
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Solicitudes de aumento
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {solicitudes.map((solicitud) => {
                  const clasesEstado = {
                    pendiente: "bg-blue-100 text-blue-700",
                    aprobada: "bg-emerald-100 text-emerald-700",
                    rechazada: "bg-red-100 text-red-700",
                    cancelada: "bg-slate-100 text-slate-600",
                  };

                  return (
                    <div
                      key={solicitud.id}
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-lg font-bold text-slate-900">
                            {Number(solicitud.monto_solicitado).toLocaleString(
                              "es-DO",
                              {
                                style: "currency",
                                currency: "DOP",
                              },
                            )}
                          </p>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                              clasesEstado[solicitud.estado] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {solicitud.estado}
                          </span>
                        </div>

                        <p className="text-sm text-slate-500 mt-2">
                          Solicitada el{" "}
                          {new Date(solicitud.fecha_solicitud).toLocaleString(
                            "es-DO",
                          )}
                        </p>

                        {solicitud.motivo_cliente && (
                          <p className="text-sm text-slate-600 mt-2">
                            {solicitud.motivo_cliente}
                          </p>
                        )}

                        {solicitud.comentario_administrador && (
                          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Respuesta del administrador
                            </p>

                            <p className="text-sm text-slate-700 mt-1">
                              {solicitud.comentario_administrador}
                            </p>
                          </div>
                        )}
                      </div>

                      {solicitud.estado === "pendiente" && (
                        <button
                          type="button"
                          onClick={() => handleCancelarSolicitud(solicitud.id)}
                          disabled={cancelandoSolicitudId === solicitud.id}
                          className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancelandoSolicitudId === solicitud.id
                            ? "Cancelando..."
                            : "Cancelar"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        

        {/* --- SECCIÓN INFERIOR: COMPRAS ACTIVAS --- */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Actividad Reciente
            </h2>
            <Link
              to="/historial"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Ver todo <ArrowUpRight size={16} />
            </Link>
          </div>

          {compras.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Sin compras activas
              </h3>
              <p className="text-slate-500 mb-6">
                ¿Listo para estrenar? Compra ahora y paga después.
              </p>
              <Link
                to="/tienda"
                className="inline-flex bg-indigo-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
              >
                Ir al Catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {compras.map((orden) => (
                <div
                  key={orden.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-center gap-6"
                >
                  {/* Icono Tienda */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                      {orden.logo ? (
                        <img
                          src={orden.logo}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ShoppingBag className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="font-bold text-slate-800">{orden.tienda}</h4>
                    <div className="flex items-center justify-center md:justify-start gap-3 mt-1 text-xs text-slate-500">
                      <span>Orden #{orden.id}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{new Date(orden.fecha).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Barra de Progreso Individual */}
                  <div className="w-full md:w-1/3">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600">Progreso de pago</span>
                      <span className="text-indigo-600">{orden.progreso}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                        style={{ width: `${orden.progreso}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                      <span>Restan: {orden.cuotas_restantes} cuotas</span>
                      <span>
                        Deuda: RD$ {orden.deuda_restante.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div>
                    <button className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
