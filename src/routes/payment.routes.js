// src/routes/payment.routes.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getMyPaymentMethods,
  createPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from "../controllers/paymentMethods.controller.js";
import {
  getPaymentPreferences,
  updatePaymentPreferences,
} from "../controllers/paymentPreferences.controller.js";

const router = Router();

router.use(requireAuth);

// Métodos de pago del cliente
router.get("/client/payment-methods", getMyPaymentMethods);
router.post("/client/payment-methods", createPaymentMethod);
router.put("/client/payment-methods/:id/default", setDefaultPaymentMethod);
router.delete("/client/payment-methods/:id", deletePaymentMethod);

// Preferencias BNPL
router.get("/client/payment-preferences", getPaymentPreferences);
router.put("/client/payment-preferences", updatePaymentPreferences);

export default router;
