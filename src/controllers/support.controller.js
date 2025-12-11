  import db from "../models/index.js";
  // Asegúrate de importar esto o usar Notificacion.create directo si no tienes el servicio
  // import { notifyCliente } from "../services/notificacion.service.js"; 

  // 👇 AQUÍ ESTABA EL ERROR: Faltaba agregar PagoBNPL y Notificacion a la lista
  const { Reclamacion, TicketSoporte, Orden, Tienda, Cliente, PagoBNPL, Notificacion } = db;

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
  // 1. Obtener TODAS las reclamaciones
export const getAllTicketsAdmin = async (req, res) => {
  try {
    const tickets = await Reclamacion.findAll({
      include: [
        { 
          model: Cliente, 
          as: "cliente",
          attributes: ['id', 'nombre', 'apellido', 'email', 'poder_credito']
        },
        {
          model: Orden,
          as: "orden",
          attributes: ['id', 'total', 'estado']
        }
      ],
      order: [
        // Prioridad visual: Pendientes primero
        [db.sequelize.literal("CASE WHEN Reclamacion.estado = 'pendiente' THEN 1 WHEN Reclamacion.estado = 'en_revision' THEN 2 ELSE 3 END"), 'ASC'],
        ['createdAt', 'DESC']
      ]
    });
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener reclamaciones." });
  }
};

// 2. Actualizar estado y Reembolsar si aplica
export const updateTicketStatus = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado, resolucion_admin } = req.body; // Nota: Tu modelo usa 'resolucion_admin'

    // Buscar en la tabla Reclamacion
    const ticket = await Reclamacion.findByPk(id, {
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
      return res.status(404).json({ message: "Reclamación no encontrada" });
    }

    const estadoAnterior = ticket.estado;

    // Actualizar datos
    if (estado) ticket.estado = estado;
    if (resolucion_admin) ticket.resolucion_admin = resolucion_admin;
    
    await ticket.save({ transaction: t });

    // --- LÓGICA DE REEMBOLSO ---
    // Solo si pasa a 'resuelta', venía de otro estado, y tiene orden asociada
    if (estado === 'resuelta' && estadoAnterior !== 'resuelta' && ticket.orden) {
        
        const orden = ticket.orden;
        const pagoBNPL = orden.pago_bnpl;
        const cliente = ticket.cliente;

        // Evitar doble reembolso
        if (orden.estado !== 'cancelada' && orden.estado !== 'reembolsada') {
            
            // 1. Restaurar crédito
            cliente.poder_credito = Number(cliente.poder_credito) + Number(orden.total);
            await cliente.save({ transaction: t });

            // 2. Cancelar deuda BNPL
            if (pagoBNPL) {
                pagoBNPL.estado = 'cancelado'; 
                pagoBNPL.monto_pendiente = 0; 
                await pagoBNPL.save({ transaction: t });
            }

            // 3. Actualizar orden
            orden.estado = 'reembolsada'; 
            await orden.save({ transaction: t });

            // 4. Notificación
            await Notificacion.create({
                rol_destino: "cliente",
                usuario_id: cliente.id,
                tipo: "sistema",
                titulo: "Reclamo Resuelto a tu Favor",
                mensaje: `Tu reclamación #${ticket.id} ha sido aceptada. Hemos restaurado RD$${Number(orden.total).toLocaleString()} a tu crédito.`,
                url: "/perfil",
                is_new: true
            }, { transaction: t });
        }
    } else if (estado !== estadoAnterior) {
        // Notificación de cambio de estado simple
        await Notificacion.create({
            rol_destino: "cliente",
            usuario_id: ticket.cliente_id,
            tipo: "sistema",
            titulo: "Actualización de Reclamo",
            mensaje: `El estado de tu reclamo #${ticket.id} cambió a: ${estado.toUpperCase().replace('_', ' ')}.`,
            url: "/soporte",
            is_new: true
        }, { transaction: t });
    }

    await t.commit();
    res.json({ message: "Reclamación actualizada correctamente", ticket });

  } catch (error) {
    console.error(error);
    await t.rollback();
    res.status(500).json({ message: "Error crítico al actualizar." });
  }
};