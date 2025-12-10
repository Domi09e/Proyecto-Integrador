import db from "../models/index.js";
const { AuditLog } = db;

export const logAction = async (adminId, accion, entidad, detalles, req = null) => {
  try {
    // Intentar obtener IP si se pasa el objeto req
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;

    await AuditLog.create({
      admin_id: adminId,
      accion,
      entidad,
      detalles,
      ip
    });
  } catch (error) {
    console.error("Error guardando log de auditoría:", error);
    // No lanzamos error para no interrumpir el flujo principal si falla el log
  }
};