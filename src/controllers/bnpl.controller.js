// src/controllers/bnpl.controller.js
import db from "../models/index.js";

const { Cliente, Tienda, Orden, PagoBNPL, Cuota, Notificacion } = db;

export const bnplCheckout = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { tiendaId, monto, plazo_meses, metodo_pago } = req.body;

    if (!tiendaId || !monto || !plazo_meses) {
      return res
        .status(400)
        .json({ message: "Datos incompletos para BNPL checkout." });
    }

    // 1) Buscar cliente a partir del usuario loggeado
    // Ajusta este where según tu esquema real:
    const cliente = await Cliente.findOne({
      where: { usuario_id: req.user.id }, // <-- cambia si usas otra columna
      transaction: t,
    });

    if (!cliente) {
      await t.rollback();
      return res.status(400).json({ message: "Cliente no encontrado." });
    }

    // 2) Verificar tienda
    const tienda = await Tienda.findByPk(tiendaId, { transaction: t });
    if (!tienda || tienda.estado !== "activa") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "La tienda no está disponible para BNPL." });
    }

    const montoNumber = Number(monto);
    const plazo = Number(plazo_meses);

    if (montoNumber <= 0 || plazo <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Monto/plazo inválidos." });
    }

    // 3) Verificar poder de crédito (modo simple)
    const poder = Number(cliente.poder_credito ?? 0);
    if (montoNumber > poder) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "El monto supera tu poder de crédito disponible." });
    }

    // 4) Crear orden
    const orden = await Orden.create(
      {
        cliente_id: cliente.id,
        tienda_id: tienda.id,
        total: montoNumber,
        estado: "pendiente", // o "aprobada" según tu lógica
        fecha: new Date(),
      },
      { transaction: t }
    );

    // 5) Crear registro de pago BNPL
    const tasa_interes = 0.18; // 18% anual, ejemplo. Ajusta esto.
    const totalConInteres = montoNumber; // si quieres, aplica interés real
    const pagoBnpl = await PagoBNPL.create(
      {
        orden_id: orden.id,
        monto_total: totalConInteres,
        plazo_meses: plazo,
        metodo_pago,
        tasa_interes,
        estado: "activo",
        fecha_inicio: new Date(),
      },
      { transaction: t }
    );

    // 6) Generar cuotas
    const montoCuota = Number((totalConInteres / plazo).toFixed(2));
    const hoy = new Date();
    const cuotas = [];

    for (let i = 1; i <= plazo; i++) {
      const venc = new Date(hoy);
      venc.setMonth(venc.getMonth() + i);

      const c = await Cuota.create(
        {
          pago_bnpl_id: pagoBnpl.id,
          numero_cuota: i,
          monto: montoCuota,
          fecha_vencimiento: venc,
          estado: "pendiente",
        },
        { transaction: t }
      );
      cuotas.push(c);
    }

    // 7) Notificaciones básicas
    // 7.1 Notificación al cliente
    await Notificacion.create(
      {
        usuario_id: req.user.id, // o cliente.usuario_id
        tipo: "BNPL_NUEVA_COMPRA",
        titulo: "Nueva compra BNPL creada",
        mensaje: `Has generado una compra BNPL en ${tienda.nombre} por RD$ ${montoNumber} en ${plazo} meses.`,
        leida: 0,
        fecha: new Date(),
      },
      { transaction: t }
    );

    // 7.2 Notificación a la tienda (si tienes usuario dueño de tienda)
    // si tienes campo creada_por como id del usuario dueño:
    if (tienda.creada_por) {
      await Notificacion.create(
        {
          usuario_id: tienda.creada_por,
          tipo: "BNPL_NUEVA_FACTURA",
          titulo: "Nueva factura BNPL generada",
          mensaje: `Un cliente ha generado una compra BNPL de RD$ ${montoNumber} en tu tienda ${tienda.nombre}.`,
          leida: 0,
          fecha: new Date(),
        },
        { transaction: t }
      );
    }

    await t.commit();

    const primera = cuotas[0];

    res.json({
      ok: true,
      orden_id: orden.id,
      pago_bnpl_id: pagoBnpl.id,
      primer_cuota_monto: primera?.monto,
      primer_cuota_fecha: primera?.fecha_vencimiento,
    });
  } catch (err) {
    console.error("Error en bnplCheckout:", err);
    if (t) await t.rollback();
    res.status(500).json({ message: "Error procesando el BNPL checkout." });
  }
};
