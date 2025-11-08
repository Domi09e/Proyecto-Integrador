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

  const handleTogglePassword = () => setShowPassword(!showPassword);
  const handleToggleConfirm = () => setShowConfirm(!showConfirm);

  const onSubmit = async (data) => signup(data);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  return (
    <div className="login-page min-h-screen flex flex-col justify-center items-center bg-gray-100">
      <div className="login-container p-10 bg-white rounded shadow-md w-full max-w-md">
        <div className="login-wrapper">
          <div className="login-container">
            {/* Logo y título */}
            <div className="logo-container text-center mb-4">
              <img
                src="../assets/BNPL.webp"
                alt="BNPL"
                className="logo mx-auto"
              />
              <h1 className="welcome-title text-2xl font-bold mt-2">
                Crear cuenta BNPL
              </h1>
              <p className="welcome-subtitle text-gray-600">
                Regístrate para comenzar
              </p>
            </div>

            {/* Errores del backend */}
            {registerErrors.map((error, i) => (
              <div
                key={i}
                className="error-message animate__animated animate__shakeX text-red-600 mb-2"
              >
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            ))}

            {/* Errores de validación */}
            {(errors.username ||
              errors.email ||
              errors.password ||
              errors.confirmPassword) && (
              <div className="error-message animate__animated animate__shakeX text-red-600 mb-2">
                <i className="fas fa-exclamation-circle"></i>{" "}
                {errors.username?.message ||
                  errors.email?.message ||
                  errors.password?.message ||
                  errors.confirmPassword?.message}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group mb-4">
                <label htmlFor="username" className="form-label">
                  <i className="fas fa-user-circle"></i> Nombre de usuario
                </label>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  placeholder="Ingresa tu nombre de usuario"
                  {...register("username", { required: true })}
                />
              </div>

              <div className="form-group mb-4">
                <label htmlFor="email" className="form-label">
                  <i className="fas fa-envelope"></i> Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="Ingresa tu correo"
                  {...register("email", { required: true })}
                />
              </div>

              <div className="form-group mb-4 relative">
                <label htmlFor="password" className="form-label">
                  <i className="fas fa-lock"></i> Contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="form-control pr-10"
                  placeholder="Crea una contraseña"
                  {...register("password", { required: true })}
                />
                <i
                  className={`fas ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  } password-toggle absolute right-3 top-9 text-gray-500 cursor-pointer`}
                  onClick={handleTogglePassword}
                ></i>
              </div>

              <div className="form-group mb-4 relative">
                <label htmlFor="confirmPassword" className="form-label">
                  <i className="fas fa-lock"></i> Confirmar contraseña
                </label>
                <input
                  type={showConfirm ? "text" : "password"}
                  id="confirmPassword"
                  className="form-control pr-10"
                  placeholder="Confirma tu contraseña"
                  {...register("confirmPassword", { required: true })}
                />
                <i
                  className={`fas ${
                    showConfirm ? "fa-eye-slash" : "fa-eye"
                  } password-toggle absolute right-3 top-9 text-gray-500 cursor-pointer`}
                  onClick={handleToggleConfirm}
                ></i>
              </div>

              <button type="submit" className="btn-login w-full">
                <i className="fas fa-user-plus"></i> REGISTRARME
              </button>
            </form>

            {/* Enlace para ir al login */}
            <div className="mt-4 text-center">
              <p className="text-gray-600">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            {/* Iconos decorativos */}
            <div className="appliance-icons mt-6 flex justify-center gap-3 text-gray-400 text-xl">
              <i className="fas fa-refrigerator appliance-icon"></i>
              <i className="fas fa-tv appliance-icon"></i>
              <i className="fas fa-blender appliance-icon"></i>
              <i className="fas fa-fan appliance-icon"></i>
              <i className="fas fa-washing-machine appliance-icon"></i>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer mt-6 text-center text-gray-500 text-sm">
            <small>© 2025 BNPL. Todos los derechos reservados.</small>
            <div className="mt-1">
              <small>
                Prohibida su reproducción o distribución sin autorización.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
