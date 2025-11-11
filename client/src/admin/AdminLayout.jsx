// client/src/admin/pages/AdminDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import { useAdminAuth } from "./context/adminAuth.context";
import api from "../api/axios";

const BRAND = {
  primary: "#0d9488",
  secondary: "#0f766e",
  accent: "#10b981",
  dark: "#0b1220",
};

export default function AdminDashboard() {
  const { user, loading: authLoading, signout } = useAdminAuth();

  // ======= Notificaciones =======
  const [notif, setNotif] = useState({
    list: [],
    unread: 0,
    panelOpen: false,
  });

  // ======= Menú de usuario (por clic) =======
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const bellRef = useRef(null);

  // Cargar notificaciones al montar
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/api/admin/notifications"); // { success, notifications, unread_count }
        if (r.data?.success) {
          setNotif(s => ({
            ...s,
            list: r.data.notifications || [],
            unread: r.data.unread_count || 0,
          }));
        }
      } catch {/* noop */}
    })();
  }, []);

  // Cerrar menús al click fuera y con Escape
  useEffect(() => {
    const onClick = (e) => {
      // fuera del menú de usuario
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      // fuera del panel de notificaciones (icono)
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        // no cierro el panel si hacen clic dentro del panel (lo maneja el propio panel)
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setNotif(s => ({ ...s, panelOpen: false }));
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggleUserMenu = () => setUserMenuOpen(o => !o);
  const toggleNotifPanel = () => setNotif(s => ({ ...s, panelOpen: !s.panelOpen }));

  const markAllRead = async () => {
    try {
      await api.post("/api/admin/notifications/read-all");
      setNotif(s => ({
        ...s,
        unread: 0,
        list: s.list.map(n => ({ ...n, is_new: false }))
      }));
    } catch {/* noop */}
  };

  if (authLoading) return <div className="p-6">Cargando sesión…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-lg bg-white/10 grid place-items-center">📊</span>
            Panel de Control
          </h1>

          <div className="flex items-center gap-3">
            {/* Campana de notificaciones */}
            <button
              ref={bellRef}
              className="relative rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/15"
              onClick={(e) => {
                e.stopPropagation();
                toggleNotifPanel();
              }}
              title="Notificaciones"
            >
              🔔
              {notif.unread > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {notif.unread}
                </span>
              )}
            </button>

            {/* Usuario (abre menú por CLIC) */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUserMenu();
                }}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1.5"
              >
                <div className="h-9 w-9 rounded-full bg-white/20 grid place-items-center font-semibold">
                  {initials(user?.nombre, user?.apellido)}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-sm font-semibold">{user?.nombre} {user?.apellido}</div>
                  <div className="text-xs text-white/90">{user?.rol || "Admin"}</div>
                </div>
                <svg className="h-4 w-4 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {/* Dropdown por clic */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xl z-50"
                >
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 grid place-items-center text-sm font-semibold">
                      {initials(user?.nombre, user?.apellido)}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm font-semibold">{user?.nombre} {user?.apellido}</div>
                      <div className="text-xs text-slate-500">{user?.rol || "Admin"}</div>
                    </div>
                  </div>
                  <nav className="p-1">
                    <Link
                      to="/admin/perfil"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/>
                      </svg>
                      Mi Perfil
                    </Link>
                    <button
                      onClick={signout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zm3-10H11a2 2 0 00-2 2v3h2V5h8v14h-8v-3H9v3a2 2 0 002 2h8a2 2 0 002-2z"/>
                      </svg>
                      Cerrar sesión
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Layout con Sidebar + Outlet */}
      <div className="mx-auto max-w-7xl px-4 py-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar ESENCIAL */}
        <aside className="rounded-xl bg-white shadow-sm border border-slate-200 p-3 h-fit">
          <nav className="grid gap-1">
            <SidebarLink to="/admin" icon="🏠" label="Dashboard" />
            {/* Vista Full de Tiendas */}
            <SidebarLink to="/admin/tiendas" icon="🏪" label="Tiendas" />
            <SidebarLink to="/admin/clientes" icon="👥" label="Clientes" />
            <SidebarLink to="/admin/pagos" icon="💳" label="Pagos" />
            <SidebarLink to="/admin/config"  icon="⚙️" label="Configuración" />
          </nav>
          <div className="mt-4 border-t pt-3 text-xs text-slate-500">
            © BNPL • v1.0
          </div>
        </aside>

        {/* Aquí se renderizan las páginas hijas */}
        <main>
          <Outlet />
        </main>
      </div>

      {/* Panel de notificaciones (slide) */}
      <NotifPanel
        open={notif.panelOpen}
        onClose={() => setNotif(s => ({ ...s, panelOpen: false }))}
        list={notif.list}
        unread={notif.unread}
        onMarkAll={markAllRead}
      />
    </div>
  );
}

/* --------- Helpers --------- */
function SidebarLink({ to, icon, label }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-full text-left
        ${active ? "bg-teal-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function NotifPanel({ open, onClose, list, unread, onMarkAll }) {
  return (
    <div
      className={`fixed top-0 right-0 h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 z-50
      ${open ? "translate-x-0" : "translate-x-full"}`}
      onClick={(e) => {
        // cerrar si se hace clic en el fondo del panel
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ boxShadow: " -5px 0 15px rgba(2,6,23,0.06)" }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="font-semibold">Notificaciones</div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={onMarkAll} className="text-sm rounded-lg border px-2.5 py-1 hover:bg-slate-50">
              Marcar todas
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">✖</button>
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-56px)]">
        {list.length === 0 ? (
          <div className="p-4 text-slate-500">No hay notificaciones.</div>
        ) : list.map((n, i) => (
          <div key={i} className={`p-4 border-b ${n.is_new ? "bg-teal-50" : ""}`}>
            <div className="flex justify-between">
              <div className="font-medium">{n.title}</div>
              <div className="text-xs text-slate-500">{relativeTime(n.timestamp)}</div>
            </div>
            <div className="text-sm text-slate-700">{n.message}</div>
            {n.url && (
              <a className="text-teal-700 text-sm hover:underline" href={n.url} target={n.target || "_self"}>
                Abrir →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(n = "", a = "") {
  const i1 = (n || "").trim().charAt(0) || "";
  const i2 = (a || "").trim().charAt(0) || "";
  return (i1 + i2).toUpperCase() || "AD";
}
function relativeTime(ts) {
  try {
    const date = new Date(ts);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "hace unos segundos";
    if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
    return date.toLocaleString();
  } catch { return ""; }
}
