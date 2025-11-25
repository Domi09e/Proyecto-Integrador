import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/adminAuth.context";

export default function ConfigPage() {
  const { user, loading } = useAdminAuth();
  const nav = useNavigate();
  const [disabledOpen, setDisabledOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    const role = user?.rol || user?.role;
    if (!role || !["admin_general", "super_admin"].includes(role)) {
      nav("/admin?error=permiso", { replace: true });
    }
  }, [loading, user, nav]);

  if (loading) return <div className="p-6 text-slate-200">Cargando…</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 -mt-6">
      {/* Header */}
      <header className="mx-auto max-w-6xl mt-6 rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-600 shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)]">
        <div className="px-6 py-8 text-center">
          <h1 className="text-3xl font-extrabold flex items-center justify-center gap-3">
            <CogIcon className="h-7 w-7" /> Configuración del Sistema
          </h1>
          <p className="mt-2 text-white/90">
            Administra todas las configuraciones y parámetros de tu aplicación
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            theme="teal"
            title="Gestión de Usuarios"
            text="Controla los usuarios del sistema, roles y permisos de acceso."
            to="/admin/config/usuarios"
            icon={<UsersIcon className="h-6 w-6" />}
          />
          <ModuleCard
            theme="emerald"
            title="Auditoría"
            text="Registro completo de todas las actividades del sistema."
            to="/admin/config/auditoria"
            icon={<ClipboardIcon className="h-6 w-6" />}
          />
          <ModuleCard
            theme="indigo"
            title="Configuración General"
            text="Ajusta la información básica y parámetros del sistema."
            to="/admin/config/general"
            icon={<SlidersIcon className="h-6 w-6" />}
          />
        </div>

        <div className="text-center mt-10">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 hover:bg-slate-700 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al Dashboard
          </Link>
        </div>
      </div>

      {disabledOpen && <DisabledModal onClose={() => setDisabledOpen(false)} />}
    </div>
  );
}

/* ---------- Tarjeta en modo oscuro ---------- */
function ModuleCard({ theme = "teal", title, text, to, disabled, onDisabledClick, icon }) {
  const palettes = {
    teal:    { ring: "ring-teal-500/30",    pill: "from-teal-500 to-emerald-500" },
    emerald: { ring: "ring-emerald-500/30", pill: "from-emerald-500 to-teal-500" },
    indigo:  { ring: "ring-indigo-500/30",  pill: "from-indigo-500 to-blue-500" },
    amber:   { ring: "ring-amber-500/30",   pill: "from-amber-500 to-yellow-400" },
    rose:    { ring: "ring-rose-500/30",    pill: "from-rose-500 to-red-500" },
  }[theme];

  const body = (
    <div
      className={`group relative flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-sm transition
      ${disabled ? "opacity-70 grayscale cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-lg hover:bg-slate-700/80"}`}
    >
      <div className={`mb-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${palettes.pill} px-3 py-2 text-white shadow ring-1 ${palettes.ring}`}>
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/20">{icon}</div>
        <span className="font-semibold">{title}</span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{text}</p>

      {disabled && (
        <div className="absolute right-3 top-3 rounded-md bg-slate-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          Inhabilitado
        </div>
      )}
    </div>
  );

  if (disabled) {
    return (
      <button onClick={onDisabledClick} className="text-left" aria-disabled="true">
        {body}
      </button>
    );
  }
  return (
    <Link to={to || "#"} className="block">
      {body}
    </Link>
  );
}

/* ---------- Modal oscuro ---------- */
function DisabledModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <div className="font-semibold text-slate-100">Módulo inhabilitado</div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-700">
            <XIcon className="h-5 w-5 text-slate-300" />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-300">
          Este módulo no está disponible actualmente en tu plan de suscripción.
        </div>
        <div className="border-t border-slate-700 px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Iconos ---------- */
function CogIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M19.14 12.94a8 8 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.6 7.6 0 00-1.63-.95l-.36-2.54a.5.5 0 00-.5-.42H10a.5.5 0 00-.5.42l-.36 2.54c-.58.24-1.12.55-1.63.95l-2.39-.96a.5.5 0 00-.6.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58c-.08.62-.08 1.26 0 1.88l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.51.4 1.06.72 1.63.95l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54c.58-.24 1.12-.55 1.63-.95l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"/></svg>)}
function UsersIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11zm-8 0c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>)}
function BrushIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 14c-1.66 0-3 1.57-3 3.5S5.34 21 7 21s3-1.57 3-3.5S8.66 14 7 14zm0-2l7-7 4 4-7 7H7v-4z"/></svg>)}
function ClipboardIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 0c.55 0 1 .45 1 1h-2c0-.55.45-1 1-1zm7 18H5V5h2v2h10V5h2v16z"/></svg>)}
function SlidersIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M10 4h4v2h-4V4zM4 11h10v2H4v-2zm6 7h10v2H10v-2zM20 4h-4v2h4V4zM14 11h6v2h-6v-2zM4 18h4v2H4v-2z"/></svg>)}
function DatabaseIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.86 0 6 .99 6 2s-2.14 2-6 2-6-.99-6-2 2.14-2 6-2zm0 14c-3.86 0-6-.99-6-2v-2c1.5 1.04 4.06 1.5 6 1.5s4.5-.46 6-1.5v2c0 1.01-2.14 2-6 2zm0-6c-3.86 0-6-.99-6-2v-2c1.5 1.04 4.06 1.5 6 1.5s4.5-.46 6-1.5v2c0 1.01-2.14 2-6 2z"/></svg>)}
function ArrowLeftIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M14 7l-5 5 5 5V7zM6 5h2v14H6z"/></svg>)}
function XIcon(p){return(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.6l6.3-6.3z"/></svg>)}
