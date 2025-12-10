import { Router } from "express";
import { getAllTicketsAdmin, updateTicketStatus } from "../controllers/support.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();
router.use(requireAdmin);

router.get("/soporte/tickets", getAllTicketsAdmin);
router.put("/soporte/tickets/:id", updateTicketStatus);

export default router;