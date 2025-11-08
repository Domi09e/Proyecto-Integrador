import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../adminAuth.context";

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, signup } = useAdminAuth();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    telefono: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/admin", { replace: true });
  }, [isAuthenticated]);

  const validate = () => {
    const newErrors = {};

    if (!form.nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    if (!form.email.trim()) newErrors.email = "El correo es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Correo no válido.";

    if (!form.password) newErrors.password = "La contraseña es obligatoria.";
    else if (form.password.length < 6)
      newErrors.password = "Debe tener al menos 6 caracteres.";

    if (form.telefono && !/^[0-9]{10}$/.test(form.telefono))
      newErrors.telefono = "El teléfono debe tener 10 dígitos.";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      await signup(form);
      navigate("/admin", { replace: true });
    } catch (err) {
      console.error(err);
      setServerError(
        err?.response?.data?.message?.[0] || "Error al registrar administrador."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">
          Registro de Administrador
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Nombre
            </label>
            <input
              type="text"
              placeholder="Nombre completo"
              className={`w-full px-4 py-2 border ${
                errors.nombre ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Apellido
            </label>
            <input
              type="text"
              placeholder="Apellido"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              className={`w-full px-4 py-2 border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className={`w-full px-4 py-2 border ${
                errors.password ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Teléfono (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: 8091234567"
              className={`w-full px-4 py-2 border ${
                errors.telefono ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
            {errors.telefono && (
              <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
            )}
          </div>

          {/* Error general */}
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="text-center mt-6 text-gray-600 text-sm">
          ¿Ya tienes cuenta?{" "}
          <NavLink
            to="/admin/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Inicia sesión
          </NavLink>
        </div>
      </div>
    </div>
  );
}
