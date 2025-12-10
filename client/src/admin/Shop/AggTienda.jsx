// client/src/admin/Shop/AggTienda.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createStore, createStoreWithFile } from "../../api/stores";

export default function AggTienda() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    direccion: "",
    telefono: "",
    email_corporativo: "",
    sitio_web: "",
    rnc: "",
    estado: "activa",
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("El logo debe ser PNG, JPG o WebP");
      return;
    }
    if (file.size / 1024 / 1024 > 2) {
      setError("El logo no debe superar los 2 MB");
      return;
    }
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio");
      if (
        form.email_corporativo &&
        !/\S+@\S+\.\S+/.test(form.email_corporativo)
      )
        throw new Error("Correo inválido");
      if (form.telefono && !/^[0-9\-\s()+]{7,20}$/.test(form.telefono))
        throw new Error("Teléfono inválido");
      // Si hay logo -> multipart; si no -> JSON
      if (logo) {
        await createStoreWithFile(form, logo);
      } else {
        await createStore(form);
      }

      setSuccess("¡Tienda creada correctamente!");
      setTimeout(() => nav("/admin/tiendas"), 900);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Error al guardar"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-700">Agregar Tienda</h1>
          <Link
            to="/admin/tiendas"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            ← Volver
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-100 text-green-700 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6"
          encType="multipart/form-data"
        >
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo de la Tienda
            </label>
            <div className="flex items-center gap-5">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-700 
                file:mr-4 file:rounded-lg file:border-0 
                file:bg-indigo-600 file:px-4 file:py-2 
                file:text-white hover:file:bg-indigo-700 
                cursor-pointer"
              />
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Vista previa"
                  className="w-20 h-20 rounded-lg object-cover border"
                />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Formatos permitidos: JPG, PNG, WebP — Máx. 2MB
            </p>
          </div>

          {/* Nombre y RNC */}
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Nombre" required>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="input"
                placeholder="Ej. Tienda Caribe"
              />
            </Field>
            <Field label="RNC">
              <input
                type="text"
                name="rnc"
                value={form.rnc}
                onChange={handleChange}
                className="input"
                placeholder="1-01-12345-6"
              />
            </Field>
          </div>

          {/* Descripción */}
          <Field label="Descripción">
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              className="input resize-none"
              rows={3}
              placeholder="Describe brevemente tu tienda..."
            />
          </Field>

          {/* Dirección y Teléfono */}
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Dirección">
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                className="input"
                placeholder="Av. 27 de Febrero #123, Santo Domingo"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="input"
                placeholder="809-555-0000"
              />
            </Field>
          </div>

          {/* Email y sitio web */}
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Email Corporativo">
              <input
                type="email"
                name="email_corporativo"
                value={form.email_corporativo}
                onChange={handleChange}
                className="input"
                placeholder="contacto@empresa.com"
              />
            </Field>
            <Field label="Sitio Web">
              <input
                type="url"
                name="sitio_web"
                value={form.sitio_web}
                onChange={handleChange}
                className="input"
                placeholder="https://empresa.com"
              />
            </Field>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="input"
            >
              <option value="borrador">Borrador</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Link
              to="/admin/tiendas"
              className="px-4 py-2 border border-gray-300 rounded-lg 
              hover:bg-gray-100 text-sm font-medium transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg 
              hover:bg-indigo-700 font-medium text-sm transition 
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Guardar Tienda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}
