import { useEffect, useState } from "react";
import { useAdminAuth } from "../context/adminAuth.context";
import api from "../../api/axios";

export default function CreditIncreaseRequests() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    canceladas: 0,
    monto_total_solicitado: 0,
    monto_total_aprobado: 0,
    solicitudes_procesadas: 0,
    porcentaje_aprobacion: 0,
  });
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente");
  const [busqueda, setBusqueda] = useState("");

  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");

  const [fechaHasta, setFechaHasta] = useState("");

  const [pagina, setPagina] = useState(1);

  const [limite, setLimite] = useState(10);

  const [paginacion, setPaginacion] = useState({
    pagina_actual: 1,
    limite: 10,
    total_registros: 0,
    total_paginas: 1,
    tiene_anterior: false,
    tiene_siguiente: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  const [montoAprobado, setMontoAprobado] = useState("");
  const [comentario, setComentario] = useState("");

  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const cargarEstadisticas = async () => {
    try {
      const response = await api.get(
        "/admin/credit-increase-requests/statistics",
      );

      setEstadisticas(
        response.data?.estadisticas || {
          total: 0,
          pendientes: 0,
          aprobadas: 0,
          rechazadas: 0,
          canceladas: 0,
          monto_total_solicitado: 0,
          monto_total_aprobado: 0,
          solicitudes_procesadas: 0,
          porcentaje_aprobacion: 0,
        },
      );
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  };

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      setError("");

      const parametros = new URLSearchParams();

      if (estadoFiltro !== "todas") {
        parametros.set("estado", estadoFiltro);
      }

      if (busquedaAplicada.trim()) {
        parametros.set("busqueda", busquedaAplicada.trim());
      }

      if (fechaDesde) {
        parametros.set("fecha_desde", fechaDesde);
      }

      if (fechaHasta) {
        parametros.set("fecha_hasta", fechaHasta);
      }

      parametros.set("pagina", pagina.toString());

      parametros.set("limite", limite.toString());

      const response = await api.get(
        `/admin/credit-increase-requests?${parametros.toString()}`,
      );

      setSolicitudes(response.data?.solicitudes || []);

      setPaginacion(
        response.data?.paginacion || {
          pagina_actual: 1,
          limite,
          total_registros: 0,
          total_paginas: 1,
          tiene_anterior: false,
          tiene_siguiente: false,
        },
      );
    } catch (error) {
      console.error("Error cargando solicitudes:", error);

      setError(
        error.response?.data?.message ||
          "No se pudieron cargar las solicitudes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [estadoFiltro, busquedaAplicada, fechaDesde, fechaHasta, pagina, limite]);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const abrirRevision = (solicitud) => {
    setSolicitudSeleccionada(solicitud);

    setMontoAprobado(solicitud.monto_solicitado?.toString() || "");

    setComentario("");
    setMensaje("");
    setError("");
  };

  const cerrarRevision = () => {
    setSolicitudSeleccionada(null);
    setMontoAprobado("");
    setComentario("");
    setMensaje("");
  };

  const aprobarSolicitud = async () => {
    if (!solicitudSeleccionada) return;

    const monto = Number(montoAprobado);

    if (!Number.isFinite(monto) || monto <= 0) {
      setError("El monto aprobado debe ser mayor que cero.");
      return;
    }

    if (monto > 500000) {
      setError("El monto aprobado no puede superar RD$ 500,000.");
      return;
    }

    if (monto > Number(solicitudSeleccionada.monto_solicitado)) {
      setError(
        "El monto aprobado no puede superar el monto solicitado por el cliente.",
      );
      return;
    }
    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      const response = await api.patch(
        `/admin/credit-increase-requests/${solicitudSeleccionada.id}/approve`,
        {
          monto_aprobado: monto,
          comentario_administrador:
            comentario.trim() ||
            "Solicitud aprobada según evaluación crediticia.",
        },
      );

      setMensaje(response.data?.message || "Solicitud aprobada correctamente.");

      setPagina(1);
      await cargarSolicitudes();
      await cargarEstadisticas();

      setTimeout(() => {
        cerrarRevision();
      }, 900);
    } catch (error) {
      console.error("Error aprobando solicitud:", error);

      setError(
        error.response?.data?.message || "No se pudo aprobar la solicitud.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const rechazarSolicitud = async () => {
    if (!solicitudSeleccionada) return;

    if (comentario.trim().length < 5) {
      setError("Debes escribir el motivo del rechazo.");
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      const response = await api.patch(
        `/admin/credit-increase-requests/${solicitudSeleccionada.id}/reject`,
        {
          comentario_administrador: comentario.trim(),
        },
      );

      setMensaje(
        response.data?.message || "Solicitud rechazada correctamente.",
      );

      setPagina(1);
      await cargarSolicitudes();
      await cargarEstadisticas();

      setTimeout(() => {
        cerrarRevision();
      }, 900);
    } catch (error) {
      console.error("Error rechazando solicitud:", error);

      setError(
        error.response?.data?.message || "No se pudo rechazar la solicitud.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      style: "currency",
      currency: "DOP",
    });

  const formatearFecha = (valor) => {
    if (!valor) return "Sin fecha";

    return new Date(valor).toLocaleString("es-DO");
  };

  const clasesEstado = {
    pendiente: "bg-blue-100 text-blue-700",
    aprobada: "bg-emerald-100 text-emerald-700",
    rechazada: "bg-red-100 text-red-700",
    cancelada: "bg-slate-100 text-slate-600",
  };

  const aplicarBusqueda = (event) => {
    event.preventDefault();

    setPagina(1);
    setBusquedaAplicada(busqueda.trim());
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setFechaDesde("");
    setFechaHasta("");
    setEstadoFiltro("pendiente");
    setPagina(1);
    setLimite(10);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Administración
        </p>

        <h1 className="text-3xl font-bold text-slate-900 mt-1">
          Solicitudes de aumento de crédito
        </h1>

        <p className="text-slate-600 mt-2">
          Revisa la evaluación crediticia y decide si corresponde aprobar o
          rechazar cada solicitud.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Mostradas</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {estadisticas.total}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Pendientes</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {estadisticas.pendientes}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Aprobadas</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {estadisticas.aprobadas}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Rechazadas</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {estadisticas.rechazadas}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Monto solicitado</p>

          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatearMoneda(estadisticas.monto_total_solicitado)}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Total histórico solicitado
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Monto aprobado</p>

          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatearMoneda(estadisticas.monto_total_aprobado)}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Crédito adicional concedido
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Tasa de aprobación</p>

          <p className="text-2xl font-bold text-blue-600 mt-1">
            {Number(estadisticas.porcentaje_aprobacion).toFixed(2)}%
          </p>

          <p className="text-xs text-slate-400 mt-2">
            Entre solicitudes procesadas
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* CABECERA Y FILTROS */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Solicitudes</h2>

              <p className="text-sm text-slate-500 mt-1">
                Busca y filtra las solicitudes registradas.
              </p>
            </div>

            <select
              value={limite}
              onChange={(event) => {
                setLimite(Number(event.target.value));
                setPagina(1);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>

          <form
            onSubmit={aplicarBusqueda}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4"
          >
            <div className="xl:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Buscar cliente
              </label>

              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Nombre, apellido o correo..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Estado
              </label>

              <select
                value={estadoFiltro}
                onChange={(event) => {
                  setEstadoFiltro(event.target.value);
                  setPagina(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="todas">Todas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Desde
              </label>

              <input
                type="date"
                value={fechaDesde}
                onChange={(event) => {
                  setFechaDesde(event.target.value);
                  setPagina(1);
                }}
                max={fechaHasta || undefined}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Hasta
              </label>

              <input
                type="date"
                value={fechaHasta}
                onChange={(event) => {
                  setFechaHasta(event.target.value);
                  setPagina(1);
                }}
                min={fechaDesde || undefined}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Limpiar filtros
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* CARGANDO */}
        {loading && (
          <div className="p-10 text-center text-slate-500">
            Cargando solicitudes...
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="p-6">
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          </div>
        )}

        {/* SIN RESULTADOS */}
        {!loading && !error && solicitudes.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            No hay solicitudes para los filtros seleccionados.
          </div>
        )}

        {/* TABLA */}
        {!loading && !error && solicitudes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase text-slate-500">
                    Cliente
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-bold uppercase text-slate-500">
                    Solicitud
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-bold uppercase text-slate-500">
                    Evaluación
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-bold uppercase text-slate-500">
                    Estado
                  </th>

                  <th className="text-right px-6 py-4 text-xs font-bold uppercase text-slate-500">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((solicitud) => (
                  <tr key={solicitud.id} className="hover:bg-slate-50">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">
                        {solicitud.cliente?.nombre}{" "}
                        {solicitud.cliente?.apellido}
                      </p>

                      <p className="text-sm text-slate-500">
                        {solicitud.cliente?.email || "Sin correo"}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Crédito actual:{" "}
                        {formatearMoneda(solicitud.cliente?.poder_credito)}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">
                        {formatearMoneda(solicitud.monto_solicitado)}
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {formatearFecha(solicitud.fecha_solicitud)}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">
                        {Number(
                          solicitud.evaluacion?.porcentaje_puntualidad || 0,
                        ).toFixed(2)}
                        %
                      </p>

                      <p className="text-sm text-slate-500">
                        {solicitud.evaluacion?.cuotas_pagadas_a_tiempo || 0}/
                        {solicitud.evaluacion?.cuotas_totales || 0} puntuales
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          clasesEstado[solicitud.estado] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {solicitud.estado}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={() => abrirRevision(solicitud)}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                      >
                        {solicitud.estado === "pendiente"
                          ? "Revisar"
                          : "Ver detalle"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINACIÓN */}
        {!loading && !error && paginacion.total_registros > 0 && (
          <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Página{" "}
              <strong className="text-slate-900">
                {paginacion.pagina_actual}
              </strong>{" "}
              de{" "}
              <strong className="text-slate-900">
                {paginacion.total_paginas}
              </strong>
              {" · "}
              {paginacion.total_registros} registros
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.max(actual - 1, 1))}
                disabled={!paginacion.tiene_anterior}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Anterior
              </button>

              <span className="min-w-10 h-10 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold">
                {paginacion.pagina_actual}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPagina((actual) =>
                    Math.min(actual + 1, paginacion.total_paginas),
                  )
                }
                disabled={!paginacion.tiene_siguiente}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {solicitudSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Solicitud #{solicitudSeleccionada.id}
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Revisión de aumento
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarRevision}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase font-bold text-slate-500">
                    Cliente
                  </p>

                  <p className="font-bold text-slate-900 mt-1">
                    {solicitudSeleccionada.cliente?.nombre}{" "}
                    {solicitudSeleccionada.cliente?.apellido}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Crédito actual:{" "}
                    {formatearMoneda(
                      solicitudSeleccionada.cliente?.poder_credito,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase font-bold text-slate-500">
                    Monto solicitado
                  </p>

                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatearMoneda(solicitudSeleccionada.monto_solicitado)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs uppercase font-bold text-slate-500">
                  Evaluación crediticia
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {Number(
                        solicitudSeleccionada.evaluacion
                          ?.porcentaje_puntualidad || 0,
                      ).toFixed(2)}
                      %
                    </p>
                    <p className="text-xs text-slate-500">Puntualidad</p>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {solicitudSeleccionada.evaluacion?.cuotas_totales}
                    </p>
                    <p className="text-xs text-slate-500">Cuotas</p>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {
                        solicitudSeleccionada.evaluacion
                          ?.cuotas_pagadas_a_tiempo
                      }
                    </p>
                    <p className="text-xs text-slate-500">Puntuales</p>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {solicitudSeleccionada.evaluacion?.cuotas_pagadas_tarde}
                    </p>
                    <p className="text-xs text-slate-500">Tardías</p>
                  </div>
                </div>
              </div>

              {solicitudSeleccionada.motivo_cliente && (
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">
                    Motivo del cliente
                  </p>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                    {solicitudSeleccionada.motivo_cliente}
                  </div>
                </div>
              )}

              {solicitudSeleccionada.estado === "pendiente" && (
                <>
                  <div>
                    <label
                      htmlFor="montoAprobado"
                      className="block text-sm font-bold text-slate-700 mb-2"
                    >
                      Monto que será aprobado
                    </label>

                    <input
                      id="montoAprobado"
                      type="number"
                      min="1"
                      max={solicitudSeleccionada.monto_solicitado}
                      step="0.01"
                      value={montoAprobado}
                      onChange={(event) => setMontoAprobado(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="comentario"
                      className="block text-sm font-bold text-slate-700 mb-2"
                    >
                      Comentario del administrador
                    </label>

                    <textarea
                      id="comentario"
                      rows="4"
                      maxLength="500"
                      value={comentario}
                      onChange={(event) => setComentario(event.target.value)}
                      placeholder="Explica la decisión..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {solicitudSeleccionada.estado !== "pendiente" && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase font-bold text-slate-500">
                    Resultado
                  </p>

                  <p className="text-sm text-slate-700 mt-2">
                    Estado: <strong>{solicitudSeleccionada.estado}</strong>
                  </p>

                  {solicitudSeleccionada.fecha_revision && (
                    <p className="text-sm text-slate-700 mt-1">
                      Revisada el:{" "}
                      <strong>
                        {formatearFecha(solicitudSeleccionada.fecha_revision)}
                      </strong>
                    </p>
                  )}

                  {solicitudSeleccionada.administrador && (
                    <p className="text-sm text-slate-700 mt-1">
                      Revisada por:{" "}
                      <strong>
                        {solicitudSeleccionada.administrador.nombre}{" "}
                        {solicitudSeleccionada.administrador.apellido}
                      </strong>
                    </p>
                  )}

                  {solicitudSeleccionada.monto_aprobado !== null && (
                    <p className="text-sm text-slate-700 mt-1">
                      Monto aprobado:{" "}
                      <strong>
                        {formatearMoneda(solicitudSeleccionada.monto_aprobado)}
                      </strong>
                    </p>
                  )}

                  {solicitudSeleccionada.comentario_administrador && (
                    <p className="text-sm text-slate-700 mt-2">
                      {solicitudSeleccionada.comentario_administrador}
                    </p>
                  )}
                </div>
              )}

              {mensaje && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
                  {mensaje}
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={cerrarRevision}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold"
              >
                Cerrar
              </button>

              {solicitudSeleccionada.estado === "pendiente" && (
                <>
                  <button
                    type="button"
                    onClick={rechazarSolicitud}
                    disabled={procesando}
                    className="px-5 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {procesando ? "Procesando..." : "Rechazar"}
                  </button>

                  <button
                    type="button"
                    onClick={aprobarSolicitud}
                    disabled={procesando}
                    className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {procesando ? "Procesando..." : "Aprobar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
