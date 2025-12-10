import db from "../models/index.js";

// 🔥 CORRECCIÓN: Usamos 'Usuario' que es como se llama en tu index.js, no 'AdminUser'
const { AuditLog, Usuario } = db; 

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [
        { 
          model: Usuario, // <--- Aquí usamos el modelo correcto
          as: "admin",    // Debe coincidir con el 'as' definido en index.js (db.AuditLog.belongsTo(..., { as: 'admin' }))
          attributes: ["nombre", "apellido", "email", "rol"] 
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: 100 
    });
    res.json(logs);
  } catch (error) {
    console.error("Error detallado auditoria:", error);
    res.status(500).json({ message: "Error al obtener auditoría" });
  }
};