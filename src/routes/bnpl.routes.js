// src/routes/bnpl.routes.js
import { Router } from "express";
import db from "../models/index.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
const { Cliente, Tienda, Orden, ArticulosOrden, PagosBNPL, Cuota, PlanesDePago, Notificacion } = db;

router.post("/bnpl/checkout", requireAuth, async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const user = req.user; // viene de requireAuth
    // OJO: adapta esto a cómo enlazas User -> Cliente
    const cliente = await Cliente.findOne({ where: { email: user.email } });

    if (!cliente) {
      await t.rollback();
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const { tiendaId, items, total } = req.body;

    if (!tiendaId || !Array.isArray(items) || !items.length || !total) {
      await t.rollback();
      return res.status(400).json({ message: "Datos incompletos para el checkout" });
    }

    // Validar crédito disponible
    const monto = Number(total);
    if (monto <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Monto inválido" });
    }

    if (cliente.poder_credito < monto) {
      await t.rollback();
      return res.status(400).json({
        message: "No tienes poder de compra suficiente para esta compra BNPL",
      });
    }

    // Buscar tienda (por si quieres validar que existe)
    const tienda = await Tienda.findByPk(tiendaId);
    if (!tienda) {
      await t.rollback();
      return res.status(404).json({ message: "Tienda no encontrada" });
    }

    // 1) Crear orden
    const orden = await Orden.create(
      {
        cliente_id: cliente.id,
        tienda_id: tienda.id,
        fecha_orden: new Date(),
        estado: "pendiente",
        total: monto,
      },
      { transaction: t }
    );

    // 2) Crear artículos de la orden
    for (const it of items) {
      await ArticulosOrden.create(
        {
          orden_id: orden.id,
          producto_id: it.productId,
          nombre_producto: it.nombre,
          cantidad: it.cantidad,
          precio_unitario: it.precio,
        },
        { transaction: t }
      );
    }

    // 3) Determinar plan de pago según preferencia del cliente
    // tu tabla planesdepago en MySQL tiene plan_basico, 4 pagos, 12, 24, etc.
    let planCode = cliente.preferencia_bnpl; // ej. '4_quincenas'
    let plan = await PlanesDePago.findOne({
      where: { codigo_interno: planCode },
      transaction: t,
    });

    // Fallback por si no encuentra
    if (!plan) {
      plan = await PlanesDePago.findOne({
        where: { codigo_interno: "4_quincenas" },
        transaction: t,
      });
    }

    // 4) Crear registro de PagosBNPL
    const pago = await PagosBNPL.create(
      {
        orden_id: orden.id,
        plan_pago_id: plan.id,
        monto_total: monto,
        monto_pendiente: monto,
        estado: "activo",
      },
      { transaction: t }
    );

    // 5) Generar cuotas
    const numCuotas = plan.numero_cuotas; // según tu tabla
    const montoPorCuota = Number((monto / numCuotas).toFixed(2));
    const hoy = new Date();

    for (let i = 1; i <= numCuotas; i++) {
      const fechaVenc = new Date(hoy);
      // ejemplo: si es quincenal, sumas 15*i días; si es mensual, 30*i
      // Podrías guardar tipo_periodo en la tabla PlanesDePago y usarlo aquí.
      fechaVenc.setDate(hoy.getDate() + 30 * i);

      await Cuota.create(
        {
          pago_bnpl_id: pago.id,
          numero_cuota: i,
          fecha_vencimiento: fechaVenc,
          monto: montoPorCuota,
          estado: "pendiente",
        },
        { transaction: t }
      );
    }

    // 6) Actualizar poder_credito (restar monto utilizado)
    cliente.poder_credito = Number(cliente.poder_credito) - monto;
    await cliente.save({ transaction: t });

    // 7) Crear notificación al cliente
    await Notificacion.create(
      {
        cliente_id: cliente.id,
        mensaje: `Se ha generado una compra BNPL en la tienda ${tienda.nombre} por un total de ${monto.toFixed(
          2
        )}. Se crearon ${numCuotas} cuotas.`,
        leida: 0,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      ok: true,
      orden_id: orden.id,
      pago_bnpl_id: pago.id,
    });
  } catch (error) {
    console.error("Error en /api/bnpl/checkout:", error);
    await t.rollback();
    res.status(500).json({ message: "Error procesando checkout BNPL." });
  }
});

export default router;

