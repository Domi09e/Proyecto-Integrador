// src/pages/RegisterPage.jsx
import { useAuth } from "../context/authContext";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../schemas/auth";
import "../styles/Login.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const { signup, errors: registerErrors, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleTogglePassword = () => setShowPassword((v) => !v);
  const handleToggleConfirm = () => setShowConfirm((v) => !v);

  const onSubmit = (data) => {
    const { confirmPassword, ...payload } = data;
    signup(payload);
  };

  useEffect(() => {
    if (isAuthenticated) navigate("/");
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
          maxWidth: 960,
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
                "radial-gradient(circle at top,rgba(34,197,165,0.3),transparent 55%)",
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
                  <i className="fas fa-credit-card text-teal-300"></i>
                </div>
                <div>
                  <div className="fw-semibold text-teal-200">BNPL Platform</div>
                  <small className="text-gray-300">
                    Compra ahora, paga después
                  </small>
                </div>
              </div>

              <h2 className="h4 fw-bold mb-3 text-white">
                Crea tu cuenta y controla todos tus pagos en un solo lugar
              </h2>
              <p className="text-gray-200 small mb-4">
                Regístrate en minutos, obtén un límite de crédito y empieza a
                pagar tus compras en cuotas flexibles sin complicaciones.
              </p>

              <ul className="list-unstyled small text-gray-200 mb-4">
                <li className="mb-2">
                  <i className="fas fa-check-circle text-teal-400 me-2"></i>
                  Visualiza tus cuotas y fechas de pago en tiempo real.
                </li>
                <li className="mb-2">
                  <i className="fas fa-check-circle text-teal-400 me-2"></i>
                  Historial de compras y notificaciones inteligentes.
                </li>
                <li className="mb-2">
                  <i className="fas fa-check-circle text-teal-400 me-2"></i>
                  Seguridad y encriptación de tus datos financieros.
                </li>
              </ul>
            </div>

            <div className="d-flex align-items-center justify-content-between text-gray-300 small pt-2 border-top border-slate-700">
              <span>© 2025 BNPL. Todos los derechos reservados.</span>
              <span className="d-flex align-items-center gap-2">
                <i className="fas fa-shield-alt text-teal-400"></i> Seguridad primero
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
                <h1 className="h4 fw-bold text-white mb-1">Crear cuenta BNPL</h1>
                <p className="text-gray-200 mb-0">
                  Completa tus datos para empezar a usar tu crédito.
                </p>
              </div>

              {/* Errores backend */}
              {registerErrors.map((error, i) => (
                <div
                  key={i}
                  className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-2"
                  style={{ backgroundColor: "#450a0a", borderColor: "#b91c1c" }}
                >
                  <i className="fas fa-exclamation-circle me-2"></i>
                  <span>{error}</span>
                </div>
              ))}

              {/* Errores Zod */}
              {(errors.nombre ||
                errors.email ||
                errors.password ||
                errors.confirmPassword) && (
                <div
                  className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3"
                  style={{ backgroundColor: "#450a0a", borderColor: "#b91c1c" }}
                >
                  <i className="fas fa-exclamation-circle me-2"></i>
                  <span>
                    {errors.nombre?.message ||
                      errors.email?.message ||
                      errors.password?.message ||
                      errors.confirmPassword?.message}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Sección 1: Datos personales */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="text-uppercase text-gray-200 small mb-0">
                      <i className="fas fa-id-card me-1"></i> Datos personales
                    </h6>
                    <span className="badge bg-teal-600 bg-opacity-75 text-white border-0">
                      Paso 1 de 3
                    </span>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label
                        htmlFor="nombre"
                        className="form-label small text-gray-200"
                      >
                        Nombre *
                      </label>
                      <input
                        id="nombre"
                        type="text"
                        className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100"
                        placeholder="Ej. Juan"
                        {...register("nombre")}
                      />
                    </div>
                    <div className="col-md-6">
                      <label
                        htmlFor="apellido"
                        className="form-label small text-gray-200"
                      >
                        Apellido
                      </label>
                      <input
                        id="apellido"
                        type="text"
                        className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100"
                        placeholder="Ej. Pérez"
                        {...register("apellido")}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección 2: Contacto */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="text-uppercase text-gray-200 small mb-0">
                      <i className="fas fa-address-book me-1"></i> Contacto
                    </h6>
                    <span className="badge bg-slate-800 text-gray-200 border border-slate-700">
                      Paso 2 de 3
                    </span>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label
                        htmlFor="email"
                        className="form-label small text-gray-200"
                      >
                        Correo electrónico *
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100"
                        placeholder="tu@correo.com"
                        {...register("email")}
                      />
                    </div>
                    <div className="col-md-6">
                      <label
                        htmlFor="telefono"
                        className="form-label small text-gray-200"
                      >
                        Teléfono
                      </label>
                      <input
                        id="telefono"
                        type="text"
                        className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100"
                        placeholder="+1 809 000 0000"
                        {...register("telefono")}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label
                      htmlFor="address"
                      className="form-label small text-gray-200"
                    >
                      Dirección
                    </label>
                    <input
                      id="address"
                      type="text"
                      className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100"
                      placeholder="Calle, número, sector"
                      {...register("address")}
                    />
                  </div>
                </div>

                {/* Sección 3: Seguridad */}
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="text-uppercase text-gray-200 small mb-0">
                      <i className="fas fa-shield-alt me-1"></i> Seguridad
                    </h6>
                    <span className="badge bg-slate-800 text-gray-200 border border-slate-700">
                      Paso 3 de 3
                    </span>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6 position-relative">
                      <label
                        htmlFor="password"
                        className="form-label small text-gray-200"
                      >
                        Contraseña *
                      </label>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100 pe-5"
                        placeholder="Mínimo 6 caracteres"
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
                    <div className="col-md-6 position-relative">
                      <label
                        htmlFor="confirmPassword"
                        className="form-label small text-gray-200"
                      >
                        Confirmar contraseña *
                      </label>
                      <input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        className="form-control form-control-sm bg-slate-900 border-slate-700 text-gray-100 pe-5"
                        placeholder="Repite la contraseña"
                        {...register("confirmPassword")}
                      />
                      <i
                        className={`fas ${
                          showConfirm ? "fa-eye-slash" : "fa-eye"
                        } text-gray-300`}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 34,
                          cursor: "pointer",
                        }}
                        onClick={handleToggleConfirm}
                      />
                    </div>
                  </div>
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
                  <i className="fas fa-user-plus me-2"></i>
                  Crear cuenta segura
                </button>
              </form>

              <div className="mt-3 text-center small">
                <span className="text-gray-200">
                  ¿Ya tienes una cuenta?{" "}
                  <Link
                    to="/login"
                    className="text-teal-300 text-decoration-none fw-semibold"
                  >
                    Inicia sesión aquí
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
