import { Router } from "express";
import { createGoal, getMyGoals, addContribution, cancelAndRefund, claimGoal } from "../controllers/snbl.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);

router.post("/snbl/goals", createGoal);
router.get("/snbl/goals", getMyGoals);
router.post("/snbl/goals/:metaId/contribute", addContribution);
router.post("/snbl/goals/:metaId/cancel", cancelAndRefund); 
router.post("/snbl/goals/:metaId/claim", claimGoal); 

export default router;