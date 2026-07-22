// src/routes/client.routes.js
import { Router } from "express";
import {
  getClientProfile,
  updateClientProfile,
  getClientPaymentMethods,
  createClientPaymentMethod,
  deleteClientPaymentMethod,
  getClientPaymentPreferences,
  updateClientPaymentPreferences,
  getActiveOrders,
  getClientWalletData,
  getPaymentsDashboard,
  getClientCreditEvaluation,
  requestCreditIncrease,
  getClientCreditIncreaseRequests,
  cancelCreditIncreaseRequest,
} from "../controllers/client.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

import {
  getDocumentosCliente,
  crearDocumentoCliente,
  actualizarEstadoDocumento,
} from "../controllers/documentos_cliente.controller.js";
import uploadDocumento from "../middlewares/uploadDocument.middleware.js";

import {
  getClientNotifications,
  markClientNotificationsRead,
} from "../controllers/client_notifications.controller.js"; // 👈 nombre igual al archivo

import {
  createTicket,
  getMyTickets,
} from "../controllers/support.controller.js";
import { verificarDeudaCritica } from "../middlewares/BloqueoDeudas.middleware.js";

// ... tus otras rutas ...
const router = Router();

router.use(requireAuth);

// Perfil básico del cliente
router.get("/profile", getClientProfile);
router.put("/profile", updateClientProfile);

// Métodos de pago
router.get("/payment-methods", getClientPaymentMethods);
router.post("/payment-methods", createClientPaymentMethod);
router.delete("/payment-methods/:id", deleteClientPaymentMethod);

// Preferencias BNPL
router.get("/payment-preferences", getClientPaymentPreferences);
router.put("/payment-preferences", updateClientPaymentPreferences);
router.get("/payments-dashboard", getPaymentsDashboard);

// Documentos
router.get("/documentos", getDocumentosCliente);
router.post(
  "/documentos",
  uploadDocumento.single("archivo"),
  crearDocumentoCliente,
);
router.put("/documentos/:id/estado", actualizarEstadoDocumento);

// Notificaciones cliente
router.get("/notifications", getClientNotifications);
router.post("/notifications/read-all", markClientNotificationsRead);

// Cartera / Resumen
router.get("/wallet-summary", getClientWalletData);
router.get("/active-orders", getActiveOrders);
router.get("/credit-evaluation", getClientCreditEvaluation);
router.post("/credit-increase-requests", requestCreditIncrease);
router.get("/credit-increase-requests", getClientCreditIncreaseRequests);
router.patch(
  "/credit-increase-requests/:id/cancel",
  cancelCreditIncreaseRequest,
);

router.post("/support", createTicket);
router.get("/support", getMyTickets);

router.get("/active-orders", async (req, res) => {
  try {
    const userId = req.cliente?.id || req.user?.id;
    const ordenes = await db.Orden.findAll({
      where: { cliente_id: userId },
      include: [
        { model: db.Tienda, as: "tienda" },
        {
          model: db.PagoBNPL,
          as: "pago_bnpl",
          where: { estado: "activo" }, // Solo órdenes con deuda activa
        },
      ],
    });

    // Mapeo simple
    res.json(
      ordenes.map((o) => ({
        id: o.id,
        tienda: o.tienda.nombre,
        total: o.total,
        pendiente: o.pago_bnpl.monto_pendiente,
        fecha: o.fecha,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo órdenes" });
  }
});

export default router;
