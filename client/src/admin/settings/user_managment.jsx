// client/src/admin/settings/UserManagement.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/adminAuth.context.jsx";
import {
  fetchAdminUsers,
  deleteUser,
  blockUser,
  unlockUser,
} from "../../api/user.js";

const ROLES = [
  { value: "", label: "Todos los roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "admin_general", label: "Admin General" },
  { value: "admin_tiendas", label: "Admin Tiendas" },
  { value: "soporte", label: "Soporte" },
  { value: "finanzas", label: "Finanzas" },
  { value: "tecnico", label: "Técnico" },
  { value: "employee", label: "Empleado" },
];

export default function UserManagement() {
  const nav = useNavigate();
  const { user: me } = useAdminAuth();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // Espera objetos con: {id, nombre, apellido, email, rol, activo, bloqueado?, last_login, profile_pic?}
      const data = await fetchAdminUsers();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Estado textual y tono para badge
  function computeStatus(u) {
  const active = Number(u.activo ?? 0) === 1;
  if (active) return { text: "Activo", tone: "success" };
  return { text: "Inactivo", tone: "warning" };
}

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list
      .filter((u) => (role ? (u.rol || u.role) === role : true))
      .filter((u) => {
        if (!t) return true;
        const full = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
        const statusText = computeStatus(u).text.toLowerCase();
        return (
          full.includes(t) ||
          (u.email || "").toLowerCase().includes(t) ||
          ((u.rol || u.role || "") + "").toLowerCase().includes(t) ||
          statusText.includes(t)
        );
      });
  }, [list, q, role]);

  const canAdmin =
    me?.rol === "admin" || me?.rol === "super_admin" || me?.rol === "admin_general";
  const canSuper = me?.rol === "super_admin";

  async function onDelete(u) {
    if (!canSuper || (u.rol || u.role) === "super_admin") return;
    if (!confirm(`¿Eliminar definitivamente a ${u.nombre} ${u.apellido}?`)) return;
    try {
      await deleteUser(u.id);
      await load();
      alert("Usuario eliminado.");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo eliminar");
    }
  }

  async function onBlock(u) {
    if (!canSuper || (u.rol || u.role) === "super_admin") return;
    if (!confirm(`¿Bloquear al usuario ${u.nombre} ${u.apellido}?`)) return;
    try {
      await blockUser(u.id);
      await load();
      alert("Usuario bloqueado.");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo bloquear");
    }
  }

  async function onUnlock(u) {
    if (!canSuper) return;
    try {
      await unlockUser(u.id);
      await load();
      alert("Usuario desbloqueado.");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo desbloquear");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <UsersCogIcon className="h-7 w-7" />
            User Management
          </h1>
          <button
            onClick={() => nav("/admin/config")}
            className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Toolbar */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/70 px-4 py-4 mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-slate-200 font-semibold">
              Gestiona usuarios, roles y estados
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, email, rol o estado…"
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                style={{ minWidth: 260 }}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              {canAdmin && (
                <button
                  onClick={() => nav("/admin/usuarios/new")}
                  className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500"
                >
                  <PlusIcon className="inline h-4 w-4 mr-1" />
                  Nuevo usuario
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-300 uppercase text-xs border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3 text-left">Foto</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-slate-400">
                      Cargando…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((u) => {
                    const st = computeStatus(u);
                    return (
                      <tr key={u.id} className="hover:bg-slate-700/40">
                        <td className="px-4 py-3">
                          <img
                            src={u.profile_pic ? u.profile_pic : "/assets/default_profile.jpeg"}
                            className="h-11 w-11 rounded-full object-cover border-2 border-teal-600/50 shadow"
                            alt="profile"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">
                            {(u.nombre || "") + " " + (u.apellido || "")}
                          </div>
                          <div className="text-xs text-slate-400">
                            Último acceso: {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
                            {u.rol || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={st.tone}>{st.text}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="rounded-lg bg-teal-600/90 px-3 py-1.5 text-white hover:bg-teal-500"
                              title="Ver detalles"
                              onClick={() => setDetail(u)}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>

                            {canAdmin && (
                              <>
                                <button
                                  className="rounded-lg bg-amber-500/90 px-3 py-1.5 text-white hover:bg-amber-400"
                                  title="Editar"
                                  onClick={() => nav(`/admin/config/usuarios/${u.id}/edit`)}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  className="rounded-lg bg-indigo-600/90 px-3 py-1.5 text-white hover:bg-indigo-500"
                                  title="Permisos"
                                  onClick={() => nav(`/admin/usuarios/${u.id}/permissions`)}
                                >
                                  <KeyIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {canSuper && (u.rol || u.role) !== "super_admin" && (
                              <>
                                {Number(u.bloqueado ?? u.blocked ?? 0) === 1 ? (
                                  <button
                                    className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-white hover:bg-emerald-500"
                                    title="Desbloquear"
                                    onClick={() => onUnlock(u)}
                                  >
                                    <UnlockIcon className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    className="rounded-lg bg-yellow-600/90 px-3 py-1.5 text-white hover:bg-yellow-500"
                                    title="Bloquear"
                                    onClick={() => onBlock(u)}
                                  >
                                    <BanIcon className="h-4 w-4" />
                                  </button>
                                )}

                                <button
                                  className="rounded-lg bg-rose-600/90 px-3 py-1.5 text-white hover:bg-rose-500"
                                  title="Eliminar"
                                  onClick={() => onDelete(u)}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-slate-400">
                      No hay usuarios que coincidan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!!err && (
          <div className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-2 text-sm text-rose-200">
            {String(err)}
          </div>
        )}
      </div>

      {/* Modal Detalles */}
      {detail && <DetailsModal user={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ------------------ Subcomponentes ------------------ */

function Badge({ tone = "success", children }) {
  const map = {
    success: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    warning: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    danger:  "bg-rose-500/15 text-rose-300 ring-rose-500/25",
  };
  const cls = map[tone] || map.success;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

function DetailsModal({ user, onClose }) {
  const photo = user.profile_pic || "/assets/default_profile.jpeg";
  const st = {
    text: Number(user.activo ?? 0) === 1 ? "Activo" : "Inactivo",
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700">
          <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <UsersCogIcon className="h-5 w-5 text-emerald-400" />
              Detalles del Usuario
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-800">
              <XIcon className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="px-5 py-5">
            <div className="grid place-items-center mb-4">
              <img
                src={photo}
                className="h-24 w-24 rounded-full object-cover border-2 border-teal-600/60 shadow"
                alt="profile"
              />
            </div>

            <InfoRow label="Nombre" value={`${user.nombre || ""} ${user.apellido || ""}`} />
            <InfoRow label="Email" value={user.email || "—"} />
            <InfoRow label="Rol" value={user.rol || user.rol || "—"} />
            <InfoRow label="Estado" value={st.text} />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium text-slate-100">{value}</div>
    </div>
  );
}

/* ------------------ Iconos (SVG inline) ------------------ */
function UsersCogIcon(props) {return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9v-1a6 6 0 016-6h2a6 6 0 016 6v1H5zm14.7-8.3l1.3-.7-.7-1.7-1.4.3a3 3 0 00-.8-.5l-.2-1.5h-1.8l-.2 1.5a3 3 0 00-.8.5l-1.4-.3-.7 1.7 1.3.7a3 3 0 000 .9l-1.3.7.7 1.7 1.4-.3c.2.2.5.4.8.5l.2 1.5h1.8l.2-1.5c.3-.1.6-.3.8-.5l1.4.3.7-1.7-1.3-.7c.1-.3.1-.6 0-.9z"/></svg>)}
function PlusIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z"/></svg>)}
function EyeIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 6a9.77 9.77 0 019 6 9.77 9.77 0 01-18 0 9.77 9.77 0 019-6zm0 10a4 4 0 100-8 4 4 0 000 8z"/></svg>)}
function PencilIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0L14.13 4.9l3.75 3.75 2.83-2.83z"/></svg>)}
function KeyIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12.65 10A5 5 0 1020 12v-2h-2V8h-2V6h-2v2h-1.35zM9 12a3 3 0 110-6 3 3 0 010 6z"/></svg>)}
function BanIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm6 10a5.962 5.962 0 01-1.053 3.378L8.622 7.053A6 6 0 0118 12zM6 12a5.962 5.962 0 011.053-3.378l8.325 8.325A6 6 0 016 12z"/></svg>)}
function UnlockIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M17 8V7a5 5 0 00-9.9-1h2.02A3 3 0 0115 7v1h2zM5 9h14v10H5z"/></svg>)}
function TrashIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z"/></svg>)}
function XIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.6l6.3-6.3z"/></svg>)}
