// src/controllers/client_notifications.controller.js
import db from "../models/index.js";

const { Notificacion } = db;

function getClienteId(req) {
  return req.cliente?.id || req.user?.id || null;
}

// GET /api/client/notifications
export const getClientNotifications = async (req, res) => {
  try {
    const clienteId = getClienteId(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const list = await Notificacion.findAll({
      where: {
        rol_destino: "cliente",
        usuario_id: clienteId,
      },
      order: [["createdAt", "DESC"]],
    });

    const unread_count = list.filter((n) => n.is_new).length;

    res.json({
      success: true,
      notifications: list.map((n) => ({
        id: n.id,
        title: n.titulo,
        message: n.mensaje,
        url: n.url,
        is_new: n.is_new,
        tipo: n.tipo,
        timestamp: n.createdAt,
      })),
      unread_count,
    });
  } catch (error) {
    console.error("Error getClientNotifications:", error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/client/notifications/read-all
export const markClientNotificationsRead = async (req, res) => {
  try {
    const clienteId = getClienteId(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    await Notificacion.update(
      { is_new: false },
      {
        where: {
          rol_destino: "cliente",
          usuario_id: clienteId,
          is_new: true,
        },
      }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Error markClientNotificationsRead:", error);
    res.status(500).json({ message: error.message });
  }
};
