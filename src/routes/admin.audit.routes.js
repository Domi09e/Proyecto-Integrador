import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();
router.get("/auditoria", requireAdmin, getAuditLogs);
export default router;