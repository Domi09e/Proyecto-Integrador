// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";
import db from "../models/index.js";

const { Cliente, PerfilRiesgoCliente } = db;

export const requireAuth = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({
      message: "No token, authorization denied",
    });
  }

  jwt.verify(token, TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid token",
      });
    }

    try {
      const cliente = await Cliente.findByPk(decoded.id);

      if (!cliente) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!cliente.activo) {
        res.cookie("token", "", {
          expires: new Date(0),
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        return res.status(403).json({
          message: "Tu cuenta está inactiva.",
          codigo: "CUENTA_INACTIVA",
        });
      }

      /*
       * NIVEL 2:
       * Revisar el bloqueo en cada ruta protegida.
       */
      const perfilRiesgo = await PerfilRiesgoCliente.findOne({
        where: {
          cliente_id: cliente.id,
        },

        attributes: [
          "bloqueado_preventivamente",
          "motivo_bloqueo",
          "puntaje_fraude",
          "nivel_riesgo",
        ],
      });

      if (perfilRiesgo?.bloqueado_preventivamente) {
        /*
         * Invalidamos la cookie para cerrar
         * la sesión existente.
         */
        res.cookie("token", "", {
          expires: new Date(0),
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        return res.status(423).json({
          message:
            "Tu cuenta está bloqueada temporalmente por motivos de seguridad.",

          motivo:
            perfilRiesgo.motivo_bloqueo ||
            "Se detectó actividad que requiere verificación.",

          codigo: "CUENTA_BLOQUEADA_PREVENTIVAMENTE",
        });
      }

      /*
       * Tu proyecto utiliza req.user
       * en los controladores.
       */
      req.user = cliente;

      return next();
    } catch (error) {
      console.error("Error requireAuth:", error);

      return res.status(500).json({
        message: "No se pudo verificar la sesión del cliente.",
      });
    }
  });
};
