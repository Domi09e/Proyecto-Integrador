import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";
import db from '../models/index.js';

const { User } = db;

export const requireAuth = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  jwt.verify(token, TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    try {
      // Verificamos que el usuario del token realmente exista en la BD
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Guardamos el usuario encontrado en el objeto request para usarlo en el controlador
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });
};

