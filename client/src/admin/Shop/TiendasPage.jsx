// src/admin/pages/AdminStores.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminStores } from "../../api/stores.js";
import { useAdminAuth } from "../context/adminAuth.context.jsx";

export default function AdminStores() {
  const nav = useNavigate();
  const { user } = useAdminAuth(); // user.rol (admin_general | admin_tiendas | soporte | finanzas | super_admin)
  const [stores, setStores] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // store para modal
  const [error, setError] = useState("");
  const [passNeeded, setPassNeeded] = useState(false);
  const [pwd, setPwd] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAdminStores();
      setStores(list);
    } catch (e) {
      setError(e?.response?.data?.message || "Error cargando tiendas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return stores;
    return stores.filter(
      (s) =>
        (s.nombre|| "").toLowerCase().includes(t) ||
        (s.direccion || "").toLowerCase().includes(t) ||
        (s.telefono || "").toLowerCase().includes(t) ||
        (s.rnc || "").toLowerCase().includes(t)
    );
  }, [q, stores]);

  const total = stores.length;
  const activeCount = stores.filter((s) => String(s.estado) == "activa").length;
  const oldestName = useMemo(() => stores[0]?.nombre ?? "N/A", [stores]); // si tu API ya trae ordenado por antigüedad

  const canEdit = (role) =>
    role === "admin" ||
    role === "admin_general" ||
    role === "admin_tiendas" ||
    role === "super_admin";
  const canDelete = (role) => role === "admin_general" || role === "super_admin";

  const onDeleteClick = (store) => {
    setDeletingId(store.id);
    setPassNeeded(true); // si tu backend exige password
  };

  const confirmDelete = async () => {
    try {
      await deactivateStore(deletingId, { password: pwd }); // o sin password si es DELETE
      setPassNeeded(false);
      setPwd("");
      setDeletingId(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo desactivar la tienda");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header / Volver */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <StoreIcon className="h-7 w-7 text-indigo-600" />
          Gestión de Tiendas
        </h1>
        <button
          onClick={() => nav("/admin")}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          color="indigo"
          icon={<StoreIcon className="h-6 w-6" />}
          label="Tiendas Registradas"
          value={total}
        />
        <StatCard
          color="green"
          icon={<CheckIcon className="h-6 w-6" />}
          label="Tiendas Activas"
          value={activeCount}
        />
        <StatCard
          color="amber"
          icon={<StarIcon className="h-6 w-6" />}
          label="Tienda más antigua"
          value={oldestName}
        />
      </div>

      {/* Card listado */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ListIcon className="h-5 w-5" />
              Listado de Tiendas
            </h2>
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full md:w-80 rounded-full border border-transparent bg-white/90 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Buscar tienda…"
              />
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Logo</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Dirección</th>
                <th className="px-4 py-3 text-left">Teléfono</th>
                <th className="px-4 py-3 text-left">RNC</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-gray-500">
                    Cargando…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.nombre} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-gray-400 text-xs">
                            Sin imagen
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{s.nombre}</div>
                    </td>
                    <td className="px-4 py-3">{s.direccion || "-"}</td>
                    <td className="px-4 py-3">{s.telefono || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-500/20">
                        {s.rnc || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
                          onClick={() => setDetail(s)}
                          title="Ver"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        {canEdit(user?.rol) && (
                          <button
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
                            onClick={() => nav(`/admin/tiendas/${s.id}/edit`)}
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}

                        {canDelete(user?.rol) && (
                          <button
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
                            onClick={() => onDeleteClick(s)}
                            title="Desactivar"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-gray-500">
                    No se encontraron tiendas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón flotante (crear) */}
      {(user?.rol === "admin" ||
        user?.rol === "admin_general" ||
        user?.rol === "admin_tiendas" ||
        user?.rol === "super_admin") && (
        <button
          onClick={() => nav("/AggTienda")}
          className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700"
          title="Agregar tienda"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

      {/* Modal Detalles */}
      {detail && (
        <DetailsModal store={detail} onClose={() => setDetail(null)} />
      )}

      {/* Modal Confirmación con password (solo si tu backend lo pide) */}
      {passNeeded && (
        <PasswordModal
          onCancel={() => {
            setPassNeeded(false);
            setPwd("");
            setDeletingId(null);
          }}
          onConfirm={confirmDelete}
          pwd={pwd}
          setPwd={setPwd}
        />
      )}

      {/* Error general */}
      {!!error && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {String(error)}
        </div>
      )}
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function StatCard({ color = "indigo", icon, label, value }) {
  const colorMap =
    {
      indigo: "text-indigo-600 bg-indigo-50",
      green: "text-green-600 bg-green-50",
      amber: "text-amber-600 bg-amber-50",
    }[color] || "text-indigo-600 bg-indigo-50";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`grid h-11 w-11 place-items-center rounded-lg ${colorMap}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-extrabold leading-tight">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ store, onClose }) {
  const logoSrc = store.logo_url
    ? store.logo_url.startsWith("http")
      ? store.logo_url
      : `../../../../uploads/${store.logo_url}`
    : "/assets/default_store.png";
  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <StoreIcon className="h-5 w-5 text-indigo-600" />
              Detalles de Tienda
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-gray-100"
            >
              <XIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="mb-4 grid place-items-center">
              <img
                src={logoSrc}
                alt={store.name}
                className="h-24 w-24 rounded-xl border border-gray-200 object-cover"
              />
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-500">Nombre</div>
              <div className="text-lg font-semibold">{store.nombre}</div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Ubicación" value={store.direccion || "—"} />
              <InfoRow label="Teléfono" value={store.telefono || "—"} />
            </div>

            <div className="mt-3">
              <div className="text-xs text-gray-500">RNC</div>
              <span className="mt-1 inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-500/20">
                {store.rnc || "—"}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ onCancel, onConfirm, pwd, setPwd }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
          <div className="border-b px-5 py-3">
            <div className="text-rose-700 font-semibold flex items-center gap-2">
              <AlertIcon className="h-5 w-5" /> ¡ADVERTENCIA CRÍTICA!
            </div>
          </div>

          <div className="px-5 py-4 text-sm text-gray-700">
            <p>
              Estás a punto de <b>desactivar permanentemente</b> esta tienda.
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>Productos asociados</li>
              <li>Registros de ventas e inventario</li>
              <li>Reportes históricos</li>
            </ul>
            <p className="mt-3">
              Ingresa tu contraseña de <b>super_admin</b> para confirmar:
            </p>

            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Contraseña"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <button
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Confirmar desactivación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

/* ---------- Iconitos simples (SVG inline) ---------- */
function StoreIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4 4h16v2H4V4zm16 4H4l1.5 10.5A2 2 0 007.48 20h9.04a2 2 0 001.98-1.5L20 8zM9 12h2v6H9v-6zm4 0h2v6h-2v-6z" />
    </svg>
  );
}
function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z" />
    </svg>
  );
}
function StarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function ListIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zM3 9h2V7H3v2zm4 0h14V7H7v2zm0 4h14v-2H7v2zm0 4h14v-2H7v2z" />
    </svg>
  );
}
function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19 15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}
function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 6a9.77 9.77 0 019 6 9.77 9.77 0 01-18 0 9.77 9.77 0 019-6zm0 10a4 4 0 100-8 4 4 0 000 8z" />
    </svg>
  );
}
function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0L14.13 4.9l3.75 3.75 2.83-2.83z" />
    </svg>
  );
}
function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" />
    </svg>
  );
}
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
    </svg>
  );
}
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.6l6.3-6.3z" />
    </svg>
  );
}
function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v4h2v-4z" />
    </svg>
  );
}
