import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import { useAdminAuth } from "./context/adminAuth.context";
import api from "../api/axios";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  CreditCard, 
  Settings, 
  Bell, 
  LogOut, 
  Search,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  FileText,
  LifeBuoy, // <--- ¡AQUÍ ESTABA EL ERROR! Faltaba importar este icono
  ArrowRight,
  Shield
} from "lucide-react";

export default function AdminLayout() {
  const { user, loading: authLoading, signout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Para móvil
  
  // Notificaciones
  const [notif, setNotif] = useState({ list: [], unread: 0, panelOpen: false });
  
  // Menú Usuario
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Cargar notificaciones
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/admin/notifications");
        if (r.data?.success) {
          setNotif({
            list: r.data.notifications || [],
            unread: r.data.unread_count || 0,
            panelOpen: false
          });
        }
      } catch { /* Silent fail */ }
    })();
  }, []);

  // Cerrar menú usuario al hacer clic fuera
  useEffect(() => {
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post("/api/admin/notifications/read-all");
      setNotif(s => ({ ...s, unread: 0, list: s.list.map(n => ({ ...n, is_new: false })) }));
    } catch (e) { console.error(e); }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-500">Cargando...</div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      
      {/* === 1. SIDEBAR (Barra Lateral Oscura) === */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-300 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">B</div>
             <span className="text-xl font-bold text-white tracking-tight">BNPL Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24}/></button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
           
           <div>
              <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
              <div className="space-y-1">
                 <SidebarLink to="/admin" icon={<LayoutDashboard size={20}/>} label="Dashboard" end />
              </div>
           </div>

           <div>
              <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gestión</p>
              <div className="space-y-1">
                 <SidebarLink to="/admin/tiendas" icon={<Store size={20}/>} label="Tiendas" />
                 <SidebarLink to="/admin/clientes" icon={<Users size={20}/>} label="Clientes" />
                 <SidebarLink to="/admin/grupos" icon={<Users size={20}/>} label="Grupos" />
              </div>
           </div>

           <div>
              <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Finanzas & Sistema</p>
              <div className="space-y-1">
                 <SidebarLink to="/admin/pagos" icon={<CreditCard size={20}/>} label="Pagos" />
                 
                 {/* ENLACE DE SOPORTE AÑADIDO CORRECTAMENTE */}
                 <SidebarLink to="/admin/soporte" icon={<LifeBuoy size={20}/>} label="Soporte" />
                 <SidebarLink to="/admin/auditoria" icon={<Shield size={20}/>} label="Auditoría" />
                 <SidebarLink to="/admin/verificacion" icon={<ShieldCheck size={20}/>} label="Verificación Docs" />
                 <SidebarLink to="/admin/config" icon={<Settings size={20}/>} label="Configuración" />
              </div>
           </div>

        </nav>

        {/* Perfil Mini (Abajo) */}
        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                 {user?.nombre.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-white truncate">{user?.nombre}</p>
                 <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button onClick={signout} className="text-slate-400 hover:text-rose-400 transition" title="Cerrar Sesión">
                  <LogOut size={18}/>
              </button>
           </div>
        </div>
      </aside>

      {/* === 2. CONTENIDO PRINCIPAL === */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Superior Blanco */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
           
           {/* Botón menú móvil y Buscador */}
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-600"><Menu size={24}/></button>
              
              <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 text-slate-500 w-80">
                 <Search size={18} />
                 <input type="text" placeholder="Buscar en el panel..." className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder:text-slate-400"/>
                 <span className="text-xs bg-white border rounded px-1.5 py-0.5 shadow-sm">⌘K</span>
              </div>
           </div>

           {/* Acciones Derecha */}
           <div className="flex items-center gap-4">
              
              {/* Notificaciones */}
              <button 
                onClick={() => setNotif(s => ({...s, panelOpen: true}))} 
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"
              >
                 <Bell size={20} />
                 {notif.unread > 0 && (
                   <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                 )}
              </button>

              {/* Dropdown Usuario */}
              <div className="relative" ref={userMenuRef}>
                 <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-full pr-3 transition border border-transparent hover:border-slate-200">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                       {user?.nombre.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.nombre}</span>
                    <ChevronDown size={16} className="text-slate-400"/>
                 </button>

                 {userMenuOpen && (
                   <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-fade-in-up">
                      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                         <p className="text-sm font-bold text-slate-800">{user?.nombre} {user?.apellido}</p>
                         <p className="text-xs text-slate-500">{user?.rol}</p>
                      </div>
                      <Link to="/admin/perfil" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600" onClick={() => setUserMenuOpen(false)}>Mi Perfil</Link>
                      <button onClick={signout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium">Cerrar Sesión</button>
                   </div>
                 )}
              </div>
           </div>
        </header>

        {/* ÁREA DE CONTENIDO (Aquí se inyectan tus páginas) */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] relative">
           {/* Fondo decorativo sutil */}
           <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iIzlDOTJBQyIgZmlsbC1vcGFjaXR5PSIwLjA1IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMiIGN5PSIzIiByPSIzIi8+PGNpcmNsZSBjeD0iMTMiIGN5PSIxMyIgcj0iMyIvPjwvZz48L3N2Zz4=')] opacity-40 mix-blend-multiply"></div>
           <div className="relative z-10">
              <Outlet />
           </div>
        </main>
      </div>

      {/* === 3. PANEL DE NOTIFICACIONES (Slide-over) === */}
      {notif.panelOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end isolate">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setNotif(s => ({...s, panelOpen: false}))}></div>
           <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                 <h3 className="font-bold text-lg text-slate-800">Notificaciones</h3>
                 <div className="flex gap-2">
                    {notif.unread > 0 && (
                       <button onClick={markAllRead} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition">Leídas</button>
                    )}
                    <button onClick={() => setNotif(s => ({...s, panelOpen: false}))} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-500"/></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                 {notif.list.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">No tienes notificaciones.</div>
                 ) : notif.list.map((n, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${n.is_new ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                       <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-sm text-slate-800">{n.title}</p>
                          <span className="text-[10px] text-slate-400">{new Date(n.timestamp).toLocaleDateString()}</span>
                       </div>
                       <p className="text-xs text-slate-600 mb-2">{n.message}</p>
                       {n.url && (
                          <div className="mt-2">
                            {n.url.startsWith("http") ? (
                               <a 
                                 className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline" 
                                 href={n.url} target="_blank" rel="noreferrer"
                               >
                                  Ver externo <ArrowRight size={12}/>
                               </a>
                            ) : (
                               <Link 
                                 to={n.url} 
                                 onClick={() => setNotif(s => ({...s, panelOpen: false}))}
                                 className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                               >
                                  Revisar ahora <ArrowRight size={12}/>
                               </Link>
                            )}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

// Helper Link para Sidebar
function SidebarLink({ to, icon, label, end }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <button
      onClick={() => navigate(to)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active 
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`}>{icon}</span>
      {label}
    </button>
  );
}

function initials(n = "", a = "") {
  return ((n||"").charAt(0) + (a||"").charAt(0)).toUpperCase() || "AD";
}