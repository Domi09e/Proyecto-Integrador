// client/src/admin/Pages/AdminLoginPage.jsx
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/adminAuth.context";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signin } = useAdminAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // si ya está logueado, reubicar
  useEffect(() => {
    if (isAuthenticated) navigate("/admin", { replace: true });
  }, [isAuthenticated]);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "El correo es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Correo no válido.";
    if (!form.password) e.password = "La contraseña es obligatoria.";
    else if (form.password.length < 6)
      e.password = "Debe tener al menos 6 caracteres.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    const val = validate();
    setErrors(val);
    if (Object.keys(val).length) return;

    try {
      setLoading(true);
      // normaliza email en minúscula
      await signin({ ...form, email: form.email.trim().toLowerCase() });
      const to = location.state?.from?.pathname || "/admin";
      navigate(to, { replace: true });
    } catch (err) {
      // intenta leer distintos formatos del backend: string | [string] | {message}
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        "Credenciales inválidas";
      setServerError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">
          Acceso administradores
        </h1>

        <form onSubmit={submit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="admin@tuempresa.com"
              className={`w-full px-4 py-2 border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-gray-700 font-medium mb-1">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full px-4 py-2 border ${
                errors.password ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Error del servidor */}
          {serverError && (
            <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm">
              {serverError}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="text-center mt-6 text-gray-600 text-sm">
          ¿No tienes cuenta?{" "}
          <NavLink
            to="/admin/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Crear cuenta
          </NavLink>
        </div>
      </div>
    </div>
  );
}
