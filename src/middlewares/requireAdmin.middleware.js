import { verifyAccessToken } from "../libs/jwt.js";
import db from "../models/index.js";

const { Usuario } = db;
const COOKIE_NAME = "admin_token";

/**
 * Middleware que valida si el usuario autenticado es administrador.
 * - Lee el token del header Authorization: Bearer ... o de la cookie HttpOnly.
 * - Verifica el JWT.
 * - Comprueba que el usuario exista y esté activo.
 * - Asigna req.user = { id, aud, rol }.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    // Obtener token de Header o Cookie
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    const cookieToken = req.cookies?.[COOKIE_NAME] || null;
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Verificar el token
    const decoded = verifyAccessToken(token); // { id, aud, rol }
    if (!decoded || decoded.aud !== "admin") {
      return res.status(403).json({ message: "Invalid audience for admin" });
    }

    // Buscar el usuario en la base de datos
    const admin = await Usuario.findByPk(decoded.id, {
      attributes: ["id", "rol", "activo"],
    });

    if (!admin) {
      return res.status(404).json({ message: "Usuario admin no encontrado" });
    }

    if (!admin.activo) {
      return res.status(403).json({ message: "Usuario administrador inactivo" });
    }

    // Guardar datos en la request
    req.user = {
      id: admin.id,
      aud: "admin",
      rol: decoded.rol || admin.rol,
    };

    return next();
  } catch (error) {
    console.error("[requireAdmin]", error.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/**
 * Middleware para verificar un rol específico.
 * Ejemplo: router.get("/admin/finanzas", requireAdmin, requireRol("finanzas"), ...)
 */
export const requireRol = (rolNecesario) => (req, res, next) => {
  if (req.user?.aud !== "admin") {
    return res.status(403).json({ message: "Solo administradores" });
  }

  if (!req.user?.rol || req.user.rol !== rolNecesario) {
    return res.status(403).json({ message: "Rol insuficiente" });
  }

  return next();
};
