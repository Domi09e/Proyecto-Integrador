// client/src/admin/settings/UserEditPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminAuth } from "../context/adminAuth.context.jsx";
import { getAdminUserById, updateAdminUser } from "../../api/user.js";

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

  // Cargar datos del usuario
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
        setError(
          e?.response?.data?.message || "No se pudo cargar el usuario."
        );
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

      // Solo enviamos password si el usuario digitó algo
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      await updateAdminUser(id, payload);

      alert("Usuario actualizado correctamente.");
      nav("/admin/config/usuarios");
    } catch (e) {
      setError(
        e?.response?.data?.message || "No se pudo guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-slate-200">
        Cargando información del usuario…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 -mt-6">
      {/* Header */}
      <header className="mx-auto max-w-4xl mt-6 rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-600 shadow-[0_12px_30px_-12px_rgba(16,185,129,0.45)] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold flex items-center gap-3">
            <UserEditIcon className="h-7 w-7" />
            Editar usuario administrador
          </h1>
          <p className="text-sm text-white/90 mt-1">
            Actualiza los datos, el rol y el estado del usuario.
          </p>
        </div>
        <button
          onClick={() => nav("/admin/config/usuarios")}
          className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/15"
        >
          Volver
        </button>
      </header>

      {/* Card formulario */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/90 shadow-xl p-5 md:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-700/40 bg-rose-900/40 px-4 py-2 text-sm text-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Datos básicos */}
            <section>
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 text-xs">
                  1
                </span>
                Datos personales
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nombre *
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    placeholder="Ej. Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Apellido
                  </label>
                  <input
                    name="apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    placeholder="Ej. Pérez"
                  />
                </div>
              </div>
            </section>

            {/* Contacto y rol */}
            <section>
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 text-xs">
                  2
                </span>
                Contacto y rol
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Correo electrónico *
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    placeholder="admin@bnpl.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Rol *
                  </label>
                  <select
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  >
                    <option value="">Selecciona un rol</option>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  id="activo"
                  type="checkbox"
                  name="activo"
                  checked={Number(form.activo) === 1}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/60"
                />
                <label
                  htmlFor="activo"
                  className="text-xs text-slate-200 select-none"
                >
                  Usuario activo en el sistema
                </label>
              </div>
            </section>

            {/* Seguridad */}
            <section>
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 text-xs">
                  3
                </span>
                Seguridad
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Actualizar contraseña (opcional)
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    placeholder="Déjalo en blanco si no deseas cambiarla"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Mínimo 8 caracteres. El backend puede validar que incluya
                    mayúsculas, números y carácter especial.
                  </p>
                </div>
              </div>
            </section>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => nav("/admin/config/usuarios")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando cambios…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* Iconito para el header */
function UserEditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9v-1a5 5 0 015-5h4a5 5 0 015 5v1H5zm13.71-13.71l-1-1a1 1 0 00-1.42 0L13 9.59V12h2.41l3.29-3.29a1 1 0 000-1.42z" />
    </svg>
  );
}
