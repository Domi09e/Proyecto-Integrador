import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import { actualizarEstadoDocumento } from "../controllers/documentos_cliente.controller.js";
import db from "../models/index.js";

const router = Router();
const { DocumentoCliente, Cliente, TipoDocumento } = db;

// 1. Ver todos los documentos pendientes (Para el panel del admin)
router.get("/documentos-pendientes", requireAdmin, async (req, res) => {
  try {
    const docs = await DocumentoCliente.findAll({
      where: { estado: "pendiente" },
      include: [
        { 
          model: Cliente, 
          as: "cliente",
          attributes: ["id", "nombre", "apellido", "email"]
        },
        { model: TipoDocumento, as: "tipo" }
      ],
      order: [["fecha_subida", "DESC"]]
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Aprobar/Rechazar (Llama a la función que modificamos con el crédito)
router.put("/documentos/:id/estado", requireAdmin, actualizarEstadoDocumento);

export default router;