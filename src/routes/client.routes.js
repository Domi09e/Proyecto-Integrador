// src/routes/client.routes.js
import { Router } from "express";
import {
  getClientProfile,
  getClientPaymentMethods,
  createClientPaymentMethod,
  deleteClientPaymentMethod,
  getClientPaymentPreferences,
  updateClientPaymentPreferences,
} from "../controllers/client.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas requieren que el cliente esté logueado
router.use(requireAuth);

// Perfil básico del cliente
router.get("/profile", getClientProfile);

// Métodos de pago
router.get("/payment-methods", getClientPaymentMethods);
router.post("/payment-methods", createClientPaymentMethod);
router.delete("/payment-methods/:id", deleteClientPaymentMethod);

// Preferencias BNPL (forma favorita de pagar)
router.get("/payment-preferences", getClientPaymentPreferences);
router.put("/payment-preferences", updateClientPaymentPreferences);

export default router;
