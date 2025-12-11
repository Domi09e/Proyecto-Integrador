import db from "../models/index.js";
import { Op } from "sequelize";

const {
  MetaAhorro,
  AporteMeta,
  MetodoPago,
  Tienda,
  Notificacion,
  Cliente,
  Orden,
} = db;

// 1. Crear Meta
export const createGoal = async (req, res) => {
  try {
    const {
      tienda_id,
      producto_nombre,
      monto_meta,
      frecuencia,
      fecha_objetivo,
    } = req.body;

    const nuevaMeta = await MetaAhorro.create({
      cliente_id: req.user.id,
      tienda_id,
      producto_nombre,
      monto_meta,
      frecuencia,
      fecha_objetivo,
    });

    res.json({ message: "¡Meta creada! Empieza a ahorrar.", meta: nuevaMeta });
  } catch (error) {
    console.error("Error createGoal:", error);
    res.status(500).json({ message: "Error al crear meta" });
  }
};

// 2. Ver mis Metas
export const getMyGoals = async (req, res) => {
  try {
    const metas = await MetaAhorro.findAll({
      where: { cliente_id: req.user.id },
      include: [
        { model: Tienda, as: "tienda", attributes: ["nombre", "logo_url"] },
      ],
      order: [["id", "DESC"]],
    });
    res.json(metas);
  } catch (error) {
    console.error("Error getMyGoals:", error);
    res.status(500).json({ message: "Error obteniendo metas" });
  }
};

// 3. Aportar dinero (MODIFICADO: Cambia a 'meta_alcanzada')
export const addContribution = async (req, res) => {
  const t = await db.sequelize.transaction();
  let transactionFinished = false;

  try {
    const { metaId } = req.params;
    const { monto, metodo_pago_id } = req.body;

    const meta = await MetaAhorro.findByPk(metaId, { transaction: t });

    if (!meta) {
      throw new Error("Meta no encontrada");
    }
    // Permitimos aportar si está activa.
    if (meta.estado !== "activa") {
      throw new Error("Esta meta no está activa o ya fue alcanzada.");
    }
    
    // Validar monto (No puede exceder lo que falta para la meta)
    const loQueFalta = Number(meta.monto_meta) - Number(meta.monto_ahorrado);
    const aporte = Number(monto);

    if (aporte > loQueFalta) {
        throw new Error(`No puedes depositar esa cantidad. Solo te falta RD$ ${loQueFalta.toLocaleString()} para completar la meta.`);
    }
    // --------------------------------------------------

    // Validar método de pago
    const metodo = await MetodoPago.findOne({
      where: { id: metodo_pago_id, cliente_id: req.user.id },
      transaction: t,
    });

    // Registrar aporte
    await AporteMeta.create(
      {
        meta_id: metaId,
        monto,
        metodo_pago_id,
      },
      { transaction: t }
    );

    // Actualizar saldo
    meta.monto_ahorrado = Number(meta.monto_ahorrado) + Number(monto);

    let message = "Aporte realizado exitosamente.";
    let tituloNotif = "Aporte Recibido";
    let cuerpoNotif = `Has aportado RD$ ${Number(monto).toLocaleString()} a tu meta "${meta.producto_nombre}".`;

    // Si llega al monto exacto (o lo supera por decimales mínimos), pasa a 'meta_alcanzada'
    if (meta.monto_ahorrado >= meta.monto_meta) {
      meta.estado = "meta_alcanzada";
      message = "¡FELICIDADES! Meta alcanzada. Ya puedes reclamar tu producto.";
      tituloNotif = "¡Meta Alcanzada! 🎉";
      cuerpoNotif = `Felicidades, completaste el ahorro para "${meta.producto_nombre}". Ve a 'Mis Metas' para reclamar tu producto.`;
    }

    await meta.save({ transaction: t });

    // Notificación
    await Notificacion.create(
      {
        usuario_id: req.user.id,
        rol_destino: "cliente",
        tipo: "sistema",
        titulo: tituloNotif,
        mensaje: cuerpoNotif,
        url: "/ahorros",
        is_new: true,
      },
      { transaction: t }
    );

    await t.commit();
    transactionFinished = true;

    return res.json({
      message,
      nuevo_saldo: meta.monto_ahorrado,
      estado: meta.estado,
    });
  } catch (error) {
    console.error("Error addContribution:", error);
    if (!transactionFinished) await t.rollback();
    if (!res.headersSent)
      res.status(400).json({ message: error.message || "Error al procesar el aporte" });
  }
};

// 4. Cancelar y Reembolsar
export const cancelAndRefund = async (req, res) => {
  const t = await db.sequelize.transaction();
  let transactionFinished = false;

  try {
    const { metaId } = req.params;
    const meta = await MetaAhorro.findByPk(metaId, { transaction: t });

    if (!meta) {
      throw new Error("Meta no encontrada");
    }
    if (meta.estado === "cancelada" || meta.estado === "completada") {
      throw new Error("La meta ya está cerrada.");
    }

    const montoReembolso = Number(meta.monto_ahorrado);

    meta.estado = "cancelada";
    await meta.save({ transaction: t });

    // Notificación Reembolso
    await Notificacion.create(
      {
        usuario_id: req.user.id,
        rol_destino: "cliente",
        tipo: "sistema",
        titulo: "Reembolso Procesado 💸",
        mensaje: `Tu meta "${meta.producto_nombre}" fue cancelada. Hemos enviado RD$ ${montoReembolso.toLocaleString()} de vuelta a tu tarjeta.`,
        url: "/ahorros",
        is_new: true,
      },
      { transaction: t }
    );

    await t.commit();
    transactionFinished = true;

    return res.json({
      message: `Meta cancelada. Se ha procesado la devolución de RD$ ${montoReembolso.toLocaleString()}.`,
    });
  } catch (error) {
    console.error("Error cancelAndRefund:", error);
    if (!transactionFinished) await t.rollback();
    if (!res.headersSent)
      res.status(400).json({ message: error.message || "Error al cancelar la meta" });
  }
};

// 5. [ADMIN] Obtener Todas las Metas
export const getAllGoalsAdmin = async (req, res) => {
  try {
    const { frecuencia, estado } = req.query;
    const whereClause = {};
    if (frecuencia && frecuencia !== "todas") whereClause.frecuencia = frecuencia;
    if (estado && estado !== "todas") whereClause.estado = estado;

    const metas = await MetaAhorro.findAll({
      where: whereClause,
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nombre", "apellido", "email"],
        },
        { model: Tienda, as: "tienda", attributes: ["nombre"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(metas);
  } catch (error) {
    console.error("Error getAllGoalsAdmin:", error);
    res.status(500).json({ message: "Error al cargar metas" });
  }
};

// 6. [ADMIN] Enviar Recordatorios Masivos
export const triggerBulkReminders = async (req, res) => {
  try {
    const metasActivas = await MetaAhorro.findAll({
      where: { estado: "activa" },
      include: [
        {
          model: AporteMeta,
          as: "aportes",
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
    });

    let notificacionesEnviadas = 0;
    const DIAS_FRECUENCIA = { semanal: 7, quincenal: 15, mensual: 30 };

    for (const meta of metasActivas) {
      const ultimoAporte =
        meta.aportes.length > 0 ? meta.aportes[0].createdAt : meta.createdAt;
      const diasInactivo = Math.floor(
        (new Date() - new Date(ultimoAporte)) / (1000 * 60 * 60 * 24)
      );
      const diasLimite = DIAS_FRECUENCIA[meta.frecuencia] || 30;

      if (diasInactivo >= diasLimite) {
        await Notificacion.create({
          usuario_id: meta.cliente_id,
          rol_destino: "cliente",
          tipo: "recordatorio",
          titulo: "Recordatorio de Ahorro ⏰",
          mensaje: `Hola, llevas ${diasInactivo} días sin abonar a tu meta "${meta.producto_nombre}". ¡No pierdas el ritmo!`,
          url: "/ahorros",
          is_new: true,
        });
        notificacionesEnviadas++;
      }
    }

    res.json({
      message: `Proceso finalizado. Se enviaron ${notificacionesEnviadas} recordatorios a clientes atrasados.`,
      total_enviados: notificacionesEnviadas,
    });
  } catch (error) {
    console.error("Error triggerBulkReminders:", error);
    res.status(500).json({ message: "Error al enviar recordatorios" });
  }
};

// 7. Reclamar Producto (MODIFICADO: Valida 'meta_alcanzada' -> Pasa a 'completada')
export const claimGoal = async (req, res) => {
  const t = await db.sequelize.transaction();
  let transactionFinished = false;

  try {
    const { metaId } = req.params;
    const meta = await MetaAhorro.findByPk(metaId, { transaction: t });

    if (!meta) {
      throw new Error("Meta no encontrada");
    }
    
    // 👇 CAMBIO LÓGICO: Validamos contra 'meta_alcanzada'
    if (meta.estado !== "meta_alcanzada") {
      throw new Error("Solo puedes reclamar metas que hayan alcanzado el monto objetivo.");
    }

    // Actualizar estado de meta a 'completada' (Estado Final)
    meta.estado = "completada";
    await meta.save({ transaction: t });

    // Generar Orden
    const nuevaOrden = await Orden.create(
      {
        cliente_id: meta.cliente_id,
        tienda_id: meta.tienda_id,
        total: meta.monto_meta,
        estado: "pagada", // Ajusta según tu ENUM de ordenes (ej: 'pendiente', 'pagada')
        metodo_pago: "SNBL",
        notas: `Canje de Meta Ahorro: ${meta.producto_nombre}`,
      },
      { transaction: t }
    );

    // Notificar al Cliente
    await Notificacion.create(
      {
        usuario_id: req.user.id,
        rol_destino: "cliente",
        tipo: "sistema",
        titulo: "¡Pedido Generado! 📦",
        mensaje: `Hemos generado la Orden #${nuevaOrden.id} por tu meta "${meta.producto_nombre}". Pronto recibirás los detalles del envío.`,
        url: "/tienda",
        is_new: true,
      },
      { transaction: t }
    );

    await t.commit();
    transactionFinished = true;

    res.json({
      message: "¡Felicidades! Tu producto ha sido reclamado y la orden de envío generada.",
    });
  } catch (error) {
    console.error("Error claimGoal:", error);
    if (!transactionFinished) await t.rollback();
    if (!res.headersSent)
      res.status(400).json({ message: error.message || "Error al reclamar" });
  }
};