import { Router } from "express";
import { getAllPayments } from "../controllers/admin_payments.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();

// Esta ruta responderá a: /api/admin/pagos
router.get("/pagos", requireAdmin, getAllPayments);

export default router;