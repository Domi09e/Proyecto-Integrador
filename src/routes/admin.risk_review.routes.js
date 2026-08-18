import { Router } from "express";

import {
  getRiskReviewSummary,
  getRiskAlerts,
  getRiskAlertDetail,
  startRiskAlertReview,
  confirmRiskAlert,
  discardRiskAlert,
  resolveRiskAlert,
  blockRiskClient,
  unblockRiskClient,
  getManualRiskReviews,
  getManualRiskReviewDetail,
  startManualRiskReview,
  approveManualRiskReview,
  conditionallyApproveManualRiskReview,
  rejectManualRiskReview,
  getClientCreditLine,
  applyRecommendedCreditLimit,
  manuallyAdjustCreditLimit,
} from "../controllers/admin_risk_review.controller.js";

import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";

const router = Router();

/* =============================================
   TODAS ESTAS RUTAS REQUIEREN ADMIN
============================================= */

router.use(requireAdmin);

/* =============================================
   RESUMEN
============================================= */

router.get("/risk-review/summary", getRiskReviewSummary);

/* =============================================
   ALERTAS
============================================= */

router.get("/risk-review/alerts", getRiskAlerts);

router.get("/risk-review/alerts/:id", getRiskAlertDetail);

router.patch("/risk-review/alerts/:id/start-review", startRiskAlertReview);

router.patch("/risk-review/alerts/:id/confirm", confirmRiskAlert);

router.patch("/risk-review/alerts/:id/discard", discardRiskAlert);

router.patch("/risk-review/alerts/:id/resolve", resolveRiskAlert);

/* =============================================
   BLOQUEAR / DESBLOQUEAR CLIENTE
============================================= */

router.patch("/risk-review/clients/:clienteId/block", blockRiskClient);

router.patch("/risk-review/clients/:clienteId/unblock", unblockRiskClient);

/* =============================================
   REVISIONES MANUALES
============================================= */

router.get("/risk-review/manual-reviews", getManualRiskReviews);

router.get("/risk-review/manual-reviews/:id", getManualRiskReviewDetail);

router.patch("/risk-review/manual-reviews/:id/start", startManualRiskReview);

router.patch(
  "/risk-review/manual-reviews/:id/approve",
  approveManualRiskReview,
);

router.patch(
  "/risk-review/manual-reviews/:id/conditional-approve",
  conditionallyApproveManualRiskReview,
);

router.patch("/risk-review/manual-reviews/:id/reject", rejectManualRiskReview);

/* =====================================================
   LÍNEA DE CRÉDITO
===================================================== */

router.get(
  "/risk-review/clients/:clienteId/credit-line",
  getClientCreditLine,
);

router.patch(
  "/risk-review/clients/:clienteId/credit-line/apply-recommended",
  applyRecommendedCreditLimit,
);

router.patch(
  "/risk-review/clients/:clienteId/credit-line/manual",
  manuallyAdjustCreditLimit,
);

export default router;
