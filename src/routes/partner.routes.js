// routes/partner.routes.js
import { Router } from "express";
import db from "../models/index.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
const { SolicitudTienda, Notificacion, Cliente } = db;

// un cliente logueado envía la solicitud (o alguien externo si quitas requireAuth)
router.post("/partner-requests", requireAuth, async (req, res) => {
  try {
    const { nombre_tienda, rnc, telefono, email_contacto, sitio_web, descripcion } =
      req.body;
    const clienteId = req.user.id;

    if (!nombre_tienda || !email_contacto) {
      return res
        .status(400)
        .json({ message: "Nombre de tienda y email son obligatorios." });
    }

    const solicitud = await SolicitudTienda.create({
      nombre_tienda,
      rnc,
      telefono,
      email_contacto,
      sitio_web,
      descripcion,
      cliente_id: clienteId,
    });

    // Notificación para admins
    await Notificacion.create({
      tipo: "NUEVA_SOLICITUD_TIENDA",
      titulo: `Nueva solicitud de tienda: ${nombre_tienda}`,
      mensaje: `Se ha recibido una solicitud para registrar la tienda "${nombre_tienda}". Revisar datos y definir tasa de interés y condiciones BNPL.`,
      cliente_id: clienteId,
      tienda_id: null,
    });

    res.json({ ok: true, message: "Solicitud enviada correctamente.", solicitud });
  } catch (error) {
    console.error("Error en solicitud de tienda:", error);
    res
      .status(500)
      .json({ message: "Error al enviar la solicitud de tienda BNPL." });
  }
});

export default router;
