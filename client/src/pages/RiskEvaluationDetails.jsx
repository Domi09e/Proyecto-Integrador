import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RiskEvaluationDetails() {
  const navigate = useNavigate();

  const [evaluacion, setEvaluacion] = useState(null);

  useEffect(() => {
    try {
      const datosGuardados = sessionStorage.getItem("ultima_evaluacion_riesgo");

      if (!datosGuardados) {
        return;
      }

      setEvaluacion(JSON.parse(datosGuardados));
    } catch (error) {
      console.error("Error leyendo evaluación:", error);
    }
  }, []);

  if (!evaluacion) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <AlertCircle size={28} />
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              No hay una evaluación disponible
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Realiza una evaluación BNPL para consultar sus detalles.
            </p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const causas = Array.isArray(evaluacion.causas) ? evaluacion.causas : [];

  const acciones = Array.isArray(evaluacion.acciones_recomendadas)
    ? evaluacion.acciones_recomendadas
    : [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ENCABEZADO */}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Volver
          </button>

          {evaluacion.evaluacion_id && (
            <span className="text-xs font-medium text-slate-400">
              Evaluación #{evaluacion.evaluacion_id}
            </span>
          )}
        </div>

        {/* RESULTADO PRINCIPAL */}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="bg-slate-950 p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-300">
                <ShieldCheck size={25} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                  Resultado de la evaluación
                </p>

                <h1 className="mt-1 text-2xl font-bold">
                  Financiamiento no aprobado
                </h1>

                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {evaluacion.message ||
                    "La solicitud no pudo aprobarse con las condiciones actuales."}
                </p>
              </div>
            </div>
          </div>

          {evaluacion.fecha && (
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-xs text-slate-500">Fecha de evaluación</p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {new Date(evaluacion.fecha).toLocaleString("es-DO")}
              </p>
            </div>
          )}
        </section>

        {/* CAUSA PRINCIPAL */}

        {causas.length > 0 && (
          <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <AlertCircle size={20} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                  Causa principal
                </p>

                <h2 className="text-lg font-bold text-slate-900">
                  {causas[0].nombre || "Factor de riesgo detectado"}
                </h2>
              </div>
            </div>

            {causas[0].descripcion && (
              <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-800">
                {causas[0].descripcion}
              </p>
            )}
          </section>
        )}

        {/* OTROS FACTORES */}

        {causas.length > 1 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Otros factores detectados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Estos factores también influyeron en la decisión.
            </p>

            <div className="mt-5 space-y-3">
              {causas.slice(1).map((causa, index) => (
                <div
                  key={causa.codigo || `${causa.nombre}-${index}`}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <p className="font-semibold text-slate-900">
                        {causa.nombre || "Factor detectado"}
                      </p>

                      {causa.descripcion && (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {causa.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACCIONES PARA MEJORAR */}

        {acciones.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <TrendingUp size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cómo mejorar tu perfil
                </h2>

                <p className="text-sm text-slate-500">
                  Acciones relacionadas con las causas detectadas.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {acciones.map((accion, index) => (
                <div
                  key={`${accion.codigo_causa || "accion"}-${index}`}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="font-semibold text-emerald-950">
                        {accion.titulo}
                      </p>

                      {accion.descripcion && (
                        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                          {accion.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SIN CAUSAS */}

        {causas.length === 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-semibold text-amber-900">
              No se recibieron causas específicas.
            </p>

            <p className="mt-1 text-sm text-amber-700">
              El servidor rechazó la solicitud, pero no proporcionó los factores
              utilizados en la decisión.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
