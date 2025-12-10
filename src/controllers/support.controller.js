import db from "../models/index.js";
// Asegúrate de importar esto o usar Notificacion.create directo si no tienes el servicio
// import { notifyCliente } from "../services/notificacion.service.js"; 

// 👇 AQUÍ ESTABA EL ERROR: Faltaba agregar PagoBNPL y Notificacion a la lista
const { TicketSoporte, Orden, Tienda, Cliente, PagoBNPL, Notificacion } = db;

/* =========================================
   FUNCIONES PARA EL CLIENTE
========================================= */

// Crear un nuevo ticket (Reclamo o Devolución)
export const createTicket = async (req, res) => {
  try {
    const { orden_id, asunto, descripcion, tipo } = req.body; 
    const clienteId = req.user.id;

    const nuevoTicket = await TicketSoporte.create({
      cliente_id: clienteId,
      orden_id: orden_id || null,
      asunto: tipo === 'devolucion' ? `Solicitud de Devolución - Orden #${orden_id}` : asunto,
      descripcion_inicial: descripcion,
      estado: 'abierto',
      prioridad: 'media'
    });

    res.json({ success: true, message: "Ticket creado correctamente", ticket: nuevoTicket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el ticket." });
  }
};

// Obtener mis tickets
export const getMyTickets = async (req, res) => {
  try {
    const clienteId = req.user.id;
    const tickets = await TicketSoporte.findAll({
      where: { cliente_id: clienteId },
      include: [
        { 
            model: Orden, 
            as: "orden",
            include: [{ model: Tienda, as: "tienda", attributes: ['nombre'] }]
        }
      ],
      order: [['fecha_creacion', 'DESC']]
    });
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo tickets." });
  }
};

/* =========================================
   FUNCIONES PARA EL ADMINISTRADOR
========================================= */

// Obtener TODOS los tickets del sistema
export const getAllTicketsAdmin = async (req, res) => {
  try {
    const tickets = await TicketSoporte.findAll({
      include: [
        { 
          model: Cliente, 
          as: "cliente",
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Orden,
          as: "orden",
          attributes: ['id', 'total']
        }
      ],
      order: [
        // Ordenar: Primero los 'abiertos', luego los 'en_proceso'
        [db.sequelize.literal("CASE WHEN TicketSoporte.estado = 'abierto' THEN 1 WHEN TicketSoporte.estado = 'en_proceso' THEN 2 ELSE 3 END"), 'ASC'],
        ['fecha_creacion', 'DESC']
      ]
    });
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener tickets para admin." });
  }
};

// Actualizar estado (CON REEMBOLSO AUTOMÁTICO)
export const updateTicketStatus = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado, prioridad } = req.body;

    const ticket = await TicketSoporte.findByPk(id, {
      include: [
        { model: Cliente, as: "cliente" },
        { 
            model: Orden, 
            as: "orden",
            include: [{ model: PagoBNPL, as: "pago_bnpl" }]
        }
      ],
      transaction: t
    });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    const estadoAnterior = ticket.estado;

    // Actualizar datos del ticket
    if (estado) ticket.estado = estado;
    if (prioridad) ticket.prioridad = prioridad;
    await ticket.save({ transaction: t });

    //  LÓGICA DE REEMBOLSO 
    if (estado === 'resuelto' && estadoAnterior !== 'resuelto' && ticket.orden) {
        
        const orden = ticket.orden;
        const pagoBNPL = orden.pago_bnpl;
        const cliente = ticket.cliente;

        // Verificar que no esté ya cancelada
        if (orden.estado !== 'cancelada' && orden.estado !== 'reembolsada') {
            
            // 1. Restaurar crédito (Reembolso total)
            cliente.poder_credito = Number(cliente.poder_credito) + Number(orden.total);
            await cliente.save({ transaction: t });

            // 2. Cancelar la deuda BNPL
            if (pagoBNPL) {
                pagoBNPL.estado = 'pagado'; // O un estado específico si tienes enum 'cancelado'
                pagoBNPL.monto_pendiente = 0; 
                await pagoBNPL.save({ transaction: t });
            }

            // 3. Marcar orden como cancelada
            orden.estado = 'cancelada'; 
            await orden.save({ transaction: t });

            // 4. Notificación
            await Notificacion.create({
                rol_destino: "cliente",
                usuario_id: cliente.id,
                tipo: "sistema",
                titulo: "Reembolso Aprobado",
                mensaje: `Tu solicitud #${ticket.id} ha sido resuelta. Hemos restaurado RD$ ${Number(orden.total).toLocaleString()} a tu crédito.`,
                url: "/cartera",
                is_new: true
            }, { transaction: t });
        }
    } else {
        // Notificación genérica de cambio de estado
        if (estado !== estadoAnterior) {
            await Notificacion.create({
                rol_destino: "cliente",
                usuario_id: ticket.cliente_id,
                tipo: "sistema",
                titulo: "Ticket Actualizado",
                mensaje: `El estado de tu ticket #${ticket.id} cambió a: ${estado.replace('_', ' ').toUpperCase()}.`,
                url: "/soporte",
                is_new: true
            }, { transaction: t });
        }
    }

    await t.commit();
    res.json({ message: "Ticket actualizado correctamente", ticket });

  } catch (error) {
    console.error(error);
    await t.rollback();
    res.status(500).json({ message: "Error al actualizar ticket." });
  }
};