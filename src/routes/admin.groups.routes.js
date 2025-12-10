import { Router } from "express";
import { getAdminGroups } from "../controllers/admin_groups.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();
router.use(requireAdmin);

router.get("/grupos", getAdminGroups);

export default router;