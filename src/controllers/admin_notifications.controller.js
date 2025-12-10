import db from "../models/index.js";
import { Op } from "sequelize"; // 👈 Importante: Necesitamos esto para el OR

const { Notificacion } = db;

export const getAdminNotifications = async (req, res) => {
  try {
    const currentUserId = req.user.id; // El ID del admin logueado

    const list = await Notificacion.findAll({
      where: {
        rol_destino: "admin", // Solo notificaciones para admins
        [Op.or]: [
          { usuario_id: null },          // 1. Notificaciones Globales (para todos)
          { usuario_id: currentUserId }  // 2. Notificaciones Privadas (solo para este admin)
        ]
      },
      order: [["createdAt", "DESC"]], // Las más nuevas primero
      limit: 50,
    });

    // Contamos cuántas hay sin leer
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
    console.error("Error getAdminNotifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAdminNotificationsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    await Notificacion.update(
      { is_new: false },
      {
        where: {
          rol_destino: "admin",
          is_new: true,
          [Op.or]: [
            { usuario_id: null },
            { usuario_id: currentUserId }
          ]
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error markAdminNotificationsRead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};