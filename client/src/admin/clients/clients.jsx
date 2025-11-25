// client/src/admin/clients/clients.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientesBNPL } from "../api";
import { useAdminAuth } from "../context/adminAuth.context.jsx";

export default function ClientsPage() {
  const { user } = useAdminAuth();
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await getClientesBNPL();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((c) => {
      const fullName = `${c.nombre || ""} ${c.apellido || ""}`.toLowerCase();
      return (
        fullName.includes(t) ||
        (c.email || "").toLowerCase().includes(t) ||
        (c.telefono || "").toLowerCase().includes(t)
      );
    });
  }, [list, q]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 -mt-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <ClientsIcon className="h-7 w-7" />
            Gestión de Clientes BNPL
          </h1>
          <button
            onClick={() => nav("/admin")}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            Volver al dashboard
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Estadísticas rápidas */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Clientes activos"
            value={list.length}
            tone="teal"
          />
          <StatCard
            label="Con próxima cuota"
            value={list.filter((c) => c.proxima_cuota_fecha).length}
            tone="amber"
          />
          <StatCard
            label="Crédito total ofrecido"
            value={
              list.reduce(
                (sum, c) => sum + Number(c.poder_credito || 0),
                0
              ).toLocaleString("es-DO", {
                style: "currency",
                currency: "DOP",
              })
            }
            tone="emerald"
            isMoney
          />
        </div>

        {/* Barra de búsqueda */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/70 px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold text-slate-100">
            Lista de clientes con información BNPL
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              placeholder="Buscar por nombre, email o teléfono…"
              style={{ minWidth: 260 }}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/90 text-slate-300 uppercase text-xs border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Poder crediticio</th>
                  <th className="px-4 py-3 text-left">Próxima cuota</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-slate-400 text-center"
                    >
                      Cargando clientes…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-700/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-teal-600/80 grid place-items-center text-sm font-semibold">
                            {(c.nombre || "C")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {c.nombre} {c.apellido}
                            </div>
                            <div className="text-xs text-slate-400">
                              ID #{c.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <div className="text-slate-200">
                            {c.email || "—"}
                          </div>
                          <div className="text-slate-400">
                            {c.telefono || ""}
                          </div>
                          <div className="text-slate-500 truncate max-w-xs">
                            {c.address || ""}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-emerald-300">
                          {Number(c.poder_credito || 0).toLocaleString(
                            "es-DO",
                            {
                              style: "currency",
                              currency: "DOP",
                            }
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {c.proxima_cuota_fecha ? (
                          <div className="text-xs">
                            <div className="text-slate-100">
                              {Number(
                                c.proxima_cuota_monto || 0
                              ).toLocaleString("es-DO", {
                                style: "currency",
                                currency: "DOP",
                              })}
                            </div>
                            <div className="text-slate-400">
                              Vence:{" "}
                              {new Date(
                                c.proxima_cuota_fecha
                              ).toLocaleDateString("es-DO")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin cuotas pendientes
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg bg-teal-600/90 px-3 py-1.5 text-white hover:bg-teal-500 text-xs"
                            onClick={() =>
                              alert(
                                `Aquí luego abrimos detalles del cliente #${c.id}`
                              )
                            }
                          >
                            Ver
                          </button>
                          {/* Aquí en el futuro puedes agregar editar, BNPL detalle, etc. */}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-slate-400 text-center"
                    >
                      No hay clientes que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!!err && (
          <div className="rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-2 text-sm text-rose-200">
            {String(err)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------- Subcomponentes ------- */

function StatCard({ label, value, tone = "teal", isMoney = false }) {
  const map = {
    teal: "from-teal-500 to-emerald-500",
    amber: "from-amber-500 to-yellow-400",
    emerald: "from-emerald-500 to-teal-500",
  };
  const grad = map[tone] || map.teal;
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-sm">
      <div
        className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${grad} px-3 py-1 text-xs font-semibold text-white mb-3`}
      >
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-50">
        {isMoney ? value : value ?? 0}
      </div>
    </div>
  );
}

function ClientsIcon(p) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11zm-8 0c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}
