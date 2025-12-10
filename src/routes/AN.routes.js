// src/routes/admin.notifications.routes.js
import { Router } from "express";
import {
  getAdminNotifications,
  markAdminNotificationsRead,
} from "../controllers/admin_notifications.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();

router.use(requireAdmin);

router.get("/notifications", getAdminNotifications);
router.post("/notifications/read-all", markAdminNotificationsRead);

export default router;
