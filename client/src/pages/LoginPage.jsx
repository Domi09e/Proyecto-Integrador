// src/pages/LoginPage.jsx
import { useAuth } from "../context/authContext";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../schemas/auth";
import "../styles/Login.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const { signin, errors: loginErrors, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => setShowPassword((v) => !v);

  const onSubmit = (data) => signin(data);

  useEffect(() => {
    if (isAuthenticated) navigate("/descubrir");
  }, [isAuthenticated, navigate]);

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{
        background:
          "radial-gradient(circle at top left, #14b8a6 0, #0f172a 45%, #020617 100%)",
      }}
    >
      <div
        className="card shadow-lg border-0 w-100"
        style={{
          maxWidth: 880,
          borderRadius: 24,
          overflow: "hidden",
          background: "linear-gradient(135deg,#020617,#0b1120)",
          color: "#e5e7eb",
        }}
      >
        <div className="row g-0">
          {/* Lado izquierdo: branding / info */}
          <div
            className="col-lg-5 d-none d-lg-flex flex-column justify-content-between p-4"
            style={{
              background:
                "radial-gradient(circle at top,rgba(34,197,165,0.28),transparent 55%)",
              borderRight: "1px solid rgba(148,163,184,0.25)",
            }}
          >
            <div>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 42,
                    height: 42,
                    background: "rgba(20,184,166,0.18)",
                  }}
                >
                  <i className="fas fa-wallet text-teal-300"></i>
                </div>
                <div>
                  <div className="fw-semibold text-teal-200">
                    BNPL Platform
                  </div>
                  <small className="text-gray-300">
                    Gestiona tus pagos y cuotas
                  </small>
                </div>
              </div>

              <h2 className="h4 fw-bold mb-3 text-white">
                Inicia sesión para ver tus compras y pagos pendientes
              </h2>
              <p className="text-gray-200 small mb-4">
                Accede a tu panel, revisa tu historial BNPL, controla tus
                cuotas y evita atrasos con recordatorios inteligentes.
              </p>

              <ul className="list-unstyled small text-gray-200 mb-4">
                <li className="mb-2">
                  <i className="fas fa-check-circle text-teal-400 me-2"></i>
                  Resumen claro de cuotas y fechas límite.
                </li>
                <li className="mb-2">
                  <i className="fas fa-check-circle text-teal-400 me-2"></i>
                  Detalle de cada compra realizada con BNPL.
                </li>
                <li className="mb-2">
                  <i className="fas fa-check-circle text-teal-400 me-2"></i>
                  Seguridad y protección de tu información.
                </li>
              </ul>
            </div>

            <div className="d-flex align-items-center justify-content-between text-gray-300 small pt-2 border-top border-slate-700">
              <span>© 2025 BNPL. Todos los derechos reservados.</span>
              <span className="d-flex align-items-center gap-2">
                <i className="fas fa-lock text-teal-400"></i> Sesión segura
              </span>
            </div>
          </div>

          {/* Lado derecho: formulario */}
          <div className="col-lg-7 bg-slate-950">
            <div className="p-4 p-md-5">
              {/* Logo y título */}
              <div className="text-center mb-4">
                <img
                  src="../assets/BNPL.webp"
                  alt="BNPL"
                  className="logo mx-auto mb-3"
                  style={{ maxHeight: 60 }}
                />
                <h1 className="h4 fw-bold text-white mb-1">
                  Iniciar sesión en BNPL
                </h1>
                <p className="text-gray-200 mb-0">
                  Entra con tu correo y contraseña para continuar.
                </p>
              </div>

              {/* Errores de autenticación (backend) */}
              {loginErrors.map((error, i) => (
                <div
                  key={i}
                  className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-2"
                  style={{ backgroundColor: "#450a0a", borderColor: "#b91c1c" }}
                >
                  <i className="fas fa-exclamation-circle me-2"></i>
                  <span>{error}</span>
                </div>
              ))}

              {/* Errores de validación (Zod) */}
              {(errors.email || errors.password) && (
                <div
                  className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3"
                  style={{ backgroundColor: "#450a0a", borderColor: "#b91c1c" }}
                >
                  <i className="fas fa-exclamation-circle me-2"></i>
                  <span>
                    {errors.email?.message || errors.password?.message}
                  </span>
                </div>
              )}

              {/* Formulario de login */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-3">
                  <label
                    htmlFor="email"
                    className="form-label small text-gray-200"
                  >
                    <i className="fas fa-envelope me-1"></i> Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100"
                    placeholder="tu@correo.com"
                    {...register("email")}
                  />
                </div>

                <div className="mb-4 position-relative">
                  <label
                    htmlFor="password"
                    className="form-label small text-gray-200"
                  >
                    <i className="fas fa-lock me-1"></i> Contraseña
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100 pe-5"
                    placeholder="Ingresa tu contraseña"
                    {...register("password")}
                  />
                  <i
                    className={`fas ${
                      showPassword ? "fa-eye-slash" : "fa-eye"
                    } text-gray-300`}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 34,
                      cursor: "pointer",
                    }}
                    onClick={handleTogglePassword}
                  />
                </div>

                <button
                  type="submit"
                  className="btn w-100 mb-2"
                  style={{
                    background: "linear-gradient(135deg,#14b8a6,#22c55e)",
                    color: "#020617",
                    fontWeight: 600,
                    borderRadius: 999,
                  }}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Ingresar a mi cuenta
                </button>
              </form>

              {/* Link a registro */}
              <div className="mt-3 text-center small">
                <span className="text-gray-200">
                  ¿No tienes una cuenta?{" "}
                  <Link
                    to="/register"
                    className="text-teal-300 text-decoration-none fw-semibold"
                  >
                    Regístrate aquí
                  </Link>
                </span>
              </div>

              {/* Iconos decorativos (puedes quitarlos si quieres algo más clean) */}
              <div className="mt-4 d-flex justify-content-center gap-3 text-gray-300">
                <i className="fas fa-refrigerator"></i>
                <i className="fas fa-tv"></i>
                <i className="fas fa-blender"></i>
                <i className="fas fa-fan"></i>
                <i className="fas fa-washing-machine"></i>
              </div>
            </div>

            {/* Footer mobile (cuando no se ve la columna izquierda) */}
            <div className="d-lg-none px-4 pb-3 text-center text-gray-300 small border-top border-slate-800">
              <small>© 2025 BNPL. Todos los derechos reservados.</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
