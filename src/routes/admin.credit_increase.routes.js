import { Router } from "express";

import {
  getCreditIncreaseRequests,
  approveCreditIncreaseRequest,
  rejectCreditIncreaseRequest,
  getCreditIncreaseStatistics,
} from "../controllers/admin_credit_increase.controller.js";

import {
  requireAdmin
} from "../middlewares/requireAdmin.middleware.js";

const router = Router();

router.get(
  "/credit-increase-requests",
  requireAdmin,
  getCreditIncreaseRequests
);

router.get(
  "/credit-increase-requests/statistics",
  requireAdmin,
  getCreditIncreaseStatistics
);

router.patch(
  "/credit-increase-requests/:id/approve",
  requireAdmin,
  approveCreditIncreaseRequest
);

router.patch(
  "/credit-increase-requests/:id/reject",
  requireAdmin,
  rejectCreditIncreaseRequest
);

export default router;