import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminAuth } from "../context/adminAuth.context.jsx";
import { getAdminUserById, updateAdminUser } from "../../api/user.js";
import { 
  User, Mail, Shield, Lock, CheckCircle, 
  ArrowLeft, Save, Loader2 
} from "lucide-react";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin_general", label: "Admin General" },
  { value: "admin", label: "Admin" },
  { value: "admin_tiendas", label: "Admin Tiendas" },
  { value: "soporte", label: "Soporte" },
];

export default function UserEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me } = useAdminAuth();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    rol: "",
    activo: 1,
    password: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEdit =
    me?.rol === "super_admin" ||
    me?.rol === "admin_general" ||
    me?.rol === "admin";

  useEffect(() => {
    if (!canEdit) {
      nav("/admin?error=permiso", { replace: true });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const u = await getAdminUserById(id);
        setForm({
          nombre: u.nombre || "",
          apellido: u.apellido || "",
          email: u.email || "",
          rol: u.rol || "",
          activo: Number(u.activo ?? 0),
          password: "",
        });
      } catch (e) {
        setError(e?.response?.data?.message || "No se pudo cargar el usuario.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, canEdit, nav]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim() || !form.email.trim() || !form.rol) {
      setError("Nombre, correo y rol son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        rol: form.rol,
        activo: Number(form.activo) ? 1 : 0,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      await updateAdminUser(id, payload);
      alert("Usuario actualizado correctamente.");
      nav("/admin/config/usuarios");
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10 flex flex-col items-center">
      
      {/* HEADER CENTRADO */}
      <div className="max-w-2xl w-full mb-8 flex items-center justify-between border-b border-slate-800 pb-6">
         <div className="flex items-center gap-4">
            <button 
               onClick={() => nav("/admin/config/usuarios")}
               className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition text-slate-400"
            >
               <ArrowLeft size={24}/>
            </button>
            <div>
               <h1 className="text-3xl font-bold text-white tracking-tight">Editar Usuario</h1>
               <p className="text-slate-400 text-sm mt-1">Actualiza los permisos y datos de acceso.</p>
            </div>
         </div>
      </div>

      {/* FORM CARD */}
      <div className="max-w-2xl w-full bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden p-8">
         
         {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
               {error}
            </div>
         )}

         <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div>
               <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User size={14}/> Información Personal
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-300">Nombre</label>
                     <input 
                        name="nombre" 
                        value={form.nombre} 
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
                        placeholder="Ej: Juan"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-300">Apellido</label>
                     <input 
                        name="apellido" 
                        value={form.apellido} 
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
                        placeholder="Ej: Pérez"
                     />
                  </div>
               </div>
            </div>

            {/* SECCIÓN 2: CUENTA Y ROL */}
            <div>
               <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield size={14}/> Acceso y Permisos
               </h3>
               <div className="space-y-5">
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-300">Correo Electrónico</label>
                     <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                        <input 
                           name="email" 
                           type="email"
                           value={form.email} 
                           onChange={handleChange}
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-emerald-500 transition"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Rol del Sistema</label>
                        <select 
                           name="rol" 
                           value={form.rol} 
                           onChange={handleChange}
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition cursor-pointer appearance-none"
                        >
                           <option value="">Seleccionar Rol</option>
                           {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                     </div>
                     
                     <div className="flex items-center h-full pt-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${Number(form.activo) === 1 ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${Number(form.activo) === 1 ? 'translate-x-5' : ''}`}></div>
                           </div>
                           <input 
                              type="checkbox" 
                              name="activo" 
                              checked={Number(form.activo) === 1} 
                              onChange={handleChange} 
                              className="hidden"
                           />
                           <span className="text-sm font-bold text-slate-300 group-hover:text-white transition">Usuario Activo</span>
                        </label>
                     </div>
                  </div>
               </div>
            </div>

            {/* SECCIÓN 3: SEGURIDAD */}
            <div className="pt-4 border-t border-slate-700/50">
               <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lock size={14}/> Seguridad
               </h3>
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Nueva Contraseña (Opcional)</label>
                  <input 
                     name="password" 
                     type="password"
                     value={form.password} 
                     onChange={handleChange}
                     className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition placeholder:text-slate-600"
                     placeholder="Déjalo en blanco para mantener la actual"
                  />
                  <p className="text-xs text-slate-500">Mínimo 8 caracteres, debe incluir mayúsculas y números.</p>
               </div>
            </div>

            {/* BOTONES ACCIÓN */}
            <div className="pt-6 flex justify-end gap-4 border-t border-slate-700">
               <button 
                  type="button" 
                  onClick={() => nav("/admin/config/usuarios")}
                  className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-700 transition"
               >
                  Cancelar
               </button>
               <button 
                  type="submit" 
                  disabled={saving}
                  className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/20 flex items-center gap-2 disabled:opacity-50"
               >
                  {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                  {saving ? "Guardando..." : "Guardar Cambios"}
               </button>
            </div>

         </form>
      </div>

    </div>
  );
}