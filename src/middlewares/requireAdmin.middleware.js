// middlewares/requireAdmin.middleware.js
import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";
import db from "../models/index.js";

const { Usuario } = db;
const COOKIE_NAME = "admin_token";

/**
 * Autenticación de administradores basada en cookie httpOnly "admin_token"
 * Igual al patrón de requireAuth (usuarios), pero consultando la tabla Usuario (admins).
 */
export const requireAdmin = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  jwt.verify(token, TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    try {
      // Verificar existencia real del admin en la BD
      const admin = await Usuario.findByPk(decoded.id);
      if (!admin) {
        return res.status(404).json({ message: "Usuario admin no encontrado" });
      }

      if (admin.activo === false) {
        return res.status(403).json({ message: "Usuario administrador inactivo" });
      }

      // Adjuntamos el admin al request (igual que en requireAuth)
      req.user = admin;
      next();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });
};

/**
 * Middleware de autorización por rol (para rutas específicas).
 * Uso: router.get("/finanzas", requireAdmin, requireRol("finanzas"), handler)
 */
export const requireRol = (rolNecesario) => (req, res, next) => {
  // Debe existir req.user (lo pone requireAdmin)
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  // Verifica el campo rol del admin (ajusta si tu columna se llama distinto)
  if (!req.user.rol || req.user.rol !== rolNecesario) {
    return res.status(403).json({ message: "Rol insuficiente" });
  }

  return next();
};
