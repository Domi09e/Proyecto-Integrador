// src/pages/StoreDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchPublicStores } from "../api/stores";
import { ArrowLeft, ExternalLink, CreditCard } from "lucide-react";

export default function StoreDetailPage() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchPublicStores(id); // GET /api/tiendas/:id
        setStore(data);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la tienda.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        Cargando tienda…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <p className="mb-4 text-red-400">{error}</p>
        <Link
          to="/tienda"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a tiendas
        </Link>
      </div>
    );
  }

  // 🔐 Aquí ya estamos seguros de que store existe
  const name = store.name || store.nombre || "Tienda";
  const logo = store.logo || store.logo_url || "";
  const description = store.description || store.descripcion || "";
  const website = store.website || store.sitio_web || "";
  const telefono = store.telefono || "";
  const email = store.email || store.email_corporativo || "";
  const direccion = store.direccion || "";
  const initial = name.charAt(0).toUpperCase(); // AQUÍ ya NO es undefined

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back */}
        <div className="mb-4">
          <Link
            to="/tiendas"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-teal-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a tiendas
          </Link>
        </div>

        {/* Header tienda (similar Klarna) */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 p-6 mb-6 flex flex-col md:flex-row gap-5 items-start">
          <div className="flex items-center gap-4">
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="h-16 w-16 rounded-2xl bg-slate-900 object-cover border border-slate-700"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl font-bold">
                {initial}
              </div>
            )}

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{name}</h1>
              <p className="text-sm text-slate-300 mt-1">
                Paga con BNPL y divide tu compra en cuotas flexibles.
              </p>
            </div>
          </div>

          {website && (
            <div className="md:ml-auto flex flex-col items-stretch gap-2 w-full md:w-auto">
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-slate-900 text-sm font-semibold px-4 py-2 hover:bg-slate-100"
              >
                Ir al website
                <ExternalLink className="w-4 h-4" />
              </a>
              <span className="text-xs text-slate-400 text-center">
                Simulación: checkout con opción BNPL.
              </span>
            </div>
          )}
        </div>

        {/* Layout 2 columnas: info + simulador BNPL (placeholder) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna izquierda: info tienda */}
          <div className="md:col-span-2 space-y-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-2">
                Sobre la tienda
              </h2>
              <p className="text-sm text-slate-200">
                {description ||
                  "Tienda afiliada al ecosistema BNPL donde puedes realizar compras y pagarlas en cuotas según tu límite de crédito disponible."}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-3">
                Información de contacto
              </h2>
              <ul className="text-sm space-y-1 text-slate-200">
                {direccion && <li>📍 {direccion}</li>}
                {telefono && <li>📞 {telefono}</li>}
                {email && <li>✉️ {email}</li>}
                {website && <li>🌐 {website}</li>}
              </ul>
            </section>
          </div>

          {/* Columna derecha: resumen BNPL / CTA */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-teal-600/60 bg-slate-900 p-5 shadow-lg shadow-teal-900/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-teal-300" />
                </div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Paga con BNPL
                </h2>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                En el checkout de esta tienda podrás elegir{" "}
                <span className="font-semibold text-teal-300">
                  BNPL como método de pago
                </span>{" "}
                y dividir el total en cuotas mensuales, siempre que tengas
                crédito disponible.
              </p>
              <ul className="text-xs text-slate-300 space-y-1 mb-3">
                <li>• 3, 6 o 12 cuotas (según monto y perfil).</li>
                <li>• Notificaciones antes de cada vencimiento.</li>
                <li>• Visualización de tus cuotas en el panel de cliente.</li>
              </ul>
              <button
                type="button"
                className="w-full rounded-full bg-teal-500 text-slate-900 text-sm font-semibold py-2.5 hover:bg-teal-400"
              >
                Simular compra con BNPL
              </button>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
              Más adelante aquí conectaremos:
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Generación de factura BNPL.</li>
                <li>Registro automático de cuotas.</li>
                <li>Notificaciones a administradores y cliente.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
