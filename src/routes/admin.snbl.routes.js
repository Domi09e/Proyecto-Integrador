import { Router } from "express";
import { getAllGoalsAdmin, triggerBulkReminders } from "../controllers/snbl.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();

// Todas estas rutas requieren ser Admin
router.use(requireAdmin);

router.get("/snbl/goals", getAllGoalsAdmin);
router.post("/snbl/reminders", triggerBulkReminders); // Ruta para el botón

export default router;