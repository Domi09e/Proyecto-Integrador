import db from "../models/index.js";

const { Cuota, PagoBNPL, Orden, Cliente, Tienda } = db;

export const getAllPayments = async (req, res) => {
  try {
    // Buscamos todas las cuotas
    const cuotas = await Cuota.findAll({
      include: [
        {
          model: PagoBNPL,
          as: "pago_bnpl",
          include: [
            {
              model: Orden,
              as: "orden",
              include: [
                { model: Cliente, as: "cliente", attributes: ["id", "nombre", "apellido", "email"] },
                { model: Tienda, as: "tienda", attributes: ["nombre"] }
              ]
            }
          ]
        }
      ],
      order: [["fecha_vencimiento", "ASC"]] // Ordenar por fecha (las más viejas/urgentes primero)
    });

    // Formateamos para la tabla
    const data = cuotas.map(c => ({
      id: c.id,
      monto: c.monto,
      numero: c.numero_cuota,
      estado: c.estado, // pendiente, pagado, atrasado
      fecha_vencimiento: c.fecha_vencimiento,
      fecha_pago: c.fecha_pago,
      cliente: `${c.pago_bnpl.orden.cliente.nombre} ${c.pago_bnpl.orden.cliente.apellido}`,
      email: c.pago_bnpl.orden.cliente.email,
      tienda: c.pago_bnpl.orden.tienda.nombre,
      orden_id: c.pago_bnpl.orden.id
    }));

    res.json(data);
  } catch (error) {
    console.error("Error obteniendo pagos admin:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};