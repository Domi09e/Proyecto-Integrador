import { useState } from "react";
import axios from "../api/axios";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

export default function PartnerRequestPage() {
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    nombre_tienda: "",
    rnc: "",
    telefono: "",
    email_contacto: "",
    sitio_web: "",
    descripcion: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (!isAuthenticated) {
      alert("Debes iniciar sesión para enviar la solicitud.");
      nav("/login");
      return;
    }

    if (!form.nombre_tienda.trim() || !form.email_contacto.trim()) {
      setError("Nombre de la tienda y email de contacto son obligatorios.");
      return;
    }

    try {
      const { data } = await axios.post("/partner-requests", form);
      setOk(data.message || "Solicitud enviada correctamente.");
      setForm({
        nombre_tienda: "",
        rnc: "",
        telefono: "",
        email_contacto: "",
        sitio_web: "",
        descripcion: "",
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "No se pudo enviar la solicitud. Intenta más tarde."
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          ¿Quieres ser tienda BNPL?
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Completa este formulario para que nuestro equipo evalúe tu tienda y
          podamos ofrecer BNPL a tus clientes con una tasa de interés
          competitiva.
        </p>

        {error && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        {ok && (
          <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {ok}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre de la tienda *
            </label>
            <input
              name="nombre_tienda"
              value={form.nombre_tienda}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="Ej. ElectroDomingo SRL"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                RNC
              </label>
              <input
                name="rnc"
                value={form.rnc}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Ej. 1-01-12345-6"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="+1 809 000 0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email de contacto *
            </label>
            <input
              type="email"
              name="email_contacto"
              value={form.email_contacto}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="contacto@tu-tienda.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sitio web
            </label>
            <input
              name="sitio_web"
              value={form.sitio_web}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="https://www.tu-tienda.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cuéntanos sobre tu tienda
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Tipo de productos, localización, volumen aproximado de ventas, etc."
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
          >
            Enviar solicitud
          </button>
        </form>
      </div>
    </div>
  );
}
