import { Router } from "express";
import { bnplCheckout, payInstallment } from "../controllers/bnpl.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import db from "../models/index.js"; // Importamos db para la consulta GET directa
import { splitExistingOrder, addParticipantToGroup } from "../controllers/group.controller.js";


const router = Router();

// 1. Checkout (Crear deuda)
router.post("/bnpl/checkout", requireAuth, bnplCheckout);

// 2. Pagar Cuota (Saldar deuda)
router.post("/bnpl/pay", requireAuth, payInstallment);

// 3. Nueva Ruta para dividir una orden existente entre amigos
router.post("/bnpl/split-order", requireAuth, splitExistingOrder);
router.post("/bnpl/split-order/add", requireAuth, addParticipantToGroup); 

// 3. Obtener Cuotas Pendientes (GET simple para la pantalla de Pagos)
router.get("/bnpl/pending-installments", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Buscamos cuotas pendientes del usuario
    const cuotas = await db.Cuota.findAll({
      where: { 
        estado: ["pendiente", "atrasado"] // Solo lo que debe
      },
      include: [
        {
          model: db.PagoBNPL,
          as: "pago_bnpl",
          required: true,
          include: [
            {
              model: db.Orden,
              as: "orden",
              where: { cliente_id: userId }, // Filtro de seguridad: solo sus órdenes
              required: true,
              include: [{ model: db.Tienda, as: "tienda" }]
            }
          ]
        }
      ],
      order: [["fecha_vencimiento", "ASC"]] // Las más urgentes primero
    });

    // Formatear para frontend
    const data = cuotas.map(c => ({
      id: c.id,
      monto: c.monto,
      fecha_vencimiento: c.fecha_vencimiento,
      numero: c.numero_cuota,
      estado: c.estado, // pendiente o atrasado
      tienda: c.pago_bnpl.orden.tienda.nombre,
      logo_tienda: c.pago_bnpl.orden.tienda.logo_url
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error cargando pagos pendientes" });
  }
});



export default router;