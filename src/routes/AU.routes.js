import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import db from "../models/index.js";

const r = Router();
const { Usuario } = db;

r.get("/admin/usuarios", requireAdmin, async (_req, res) => {
  const rows = await Usuario.findAll({
    attributes: ["id","nombre","apellido","email","telefono","rol","activo","createdAt","updatedAt"],
    order: [["id","DESC"]]
  });
  res.json(rows);
});

// Opcional: activar/desactivar, cambiar rol
r.put("/admin/usuarios/:id", requireAdmin, async (req, res) => {
  const u = await Usuario.findByPk(req.params.id);
  if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
  const { rol, activo } = req.body || {};
  await u.update({ rol, activo });
  res.json(u);
});

export default r;
