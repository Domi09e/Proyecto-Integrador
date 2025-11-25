// src/routes/admin.auth.routes.js
import { Router } from "express";
import {
  registerAdmin,
  loginAdmin,
  verifyAdminToken as verifyAdmin,
  logoutAdmin,
} from "../controllers/authAdmin.controller.js";
import {
  requireAdmin,
  requireRol,
} from "../middlewares/requireAdmin.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  loginAdminSchema as adminLoginSchema,
  registerAdminSchema as adminRegisterSchema,
} from "../schemas/authAdmin.schema.js";

const r = Router();

// 🔓 públicas
r.post("/register", validateSchema(adminRegisterSchema), registerAdmin);
r.post("/login", validateSchema(adminLoginSchema), loginAdmin);

// 🔐 protegidas
r.get("/verify", requireAdmin, verifyAdmin);
r.post("/logout", requireAdmin, logoutAdmin);

// ejemplo: endpoint restringido a rol
r.get("/finanzas", requireAdmin, requireRol("finanzas"), (req, res) =>
  res.json({ ok: true })
);


export default r;
