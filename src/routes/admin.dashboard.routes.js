import { Router } from "express";
import { getDashboardStats } from "../controllers/admin_dashboard.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();

// GET /api/admin/dashboard-stats
router.get("/dashboard-stats", requireAdmin, getDashboardStats);

export default router;