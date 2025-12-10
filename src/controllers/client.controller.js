// src/controllers/client.controller.js
import db from "../models/index.js";

const { Cliente, MetodoPago } = db;

function getClienteIdFromReq(req) {
  if (req.cliente?.id) return req.cliente.id;
  if(req.user?.id) return req.user.id; // fallback por compatibilidad
  if(req.userId) return req.userId; // otro fallback
  return null;
}
/* ============================
   PERFIL DEL CLIENTE
============================ */
export const getClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: [
        "id",
        "nombre",
        "apellido",
        "email",
        "telefono",
        "address",
        "poder_credito",
        "preferencia_bnpl",
      ],
    });

    if (!cli) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    res.json(cli);
  } catch (error) {
    console.error("Error getClientProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." }); 
    }
    const { nombre, apellido, telefono, address } = req.body;
    const cli = await Cliente.findByPk(clienteId);
    if (!cli) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }
    cli.nombre = nombre || cli.nombre;
    cli.apellido = apellido || cli.apellido;
    cli.telefono = telefono || cli.telefono;
    cli.address = address || cli.address;
    await cli.save();

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updateClientProfile:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ============================
   MÉTODOS DE PAGO
============================ */
export const getClientPaymentMethods = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const methods = await MetodoPago.findAll({
      where: { cliente_id: clienteId },
      order: [["es_predeterminado", "DESC"], ["id", "DESC"]],
      attributes: [
        "id",
        "tipo",
        "marca",
        "ultimos_cuatro_digitos",
        "fecha_expiracion",
        "es_predeterminado",
      ],
    });

    res.json(methods);
  } catch (error) {
    console.error("Error getClientPaymentMethods:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const {
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado,
    } = req.body;

    if (!tipo || !ultimos_cuatro_digitos) {
      return res
        .status(400)
        .json({ message: "Tipo y últimos 4 dígitos son obligatorios." });
    }

    // si marcó como predeterminado, ponemos los otros en 0
    if (es_predeterminado) {
      await MetodoPago.update(
        { es_predeterminado: 0 },
        { where: { cliente_id: clienteId } }
      );
    }

    const nuevo = await MetodoPago.create({
      cliente_id: clienteId,
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado: es_predeterminado ? 1 : 0,
      token_gateway: "TOKEN_SIMULADO_" + Date.now(),
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error createClientPaymentMethod:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { id } = req.params;

    const method = await MetodoPago.findOne({
      where: { id, cliente_id: clienteId },
    });

    if (!method) {
      return res.status(404).json({ message: "Método de pago no encontrado." });
    }

    await method.destroy();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleteClientPaymentMethod:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   PREFERENCIAS DE PAGO BNPL
============================ */

export const getClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: ["id", "preferencia_bnpl"],
    });

    if (!cli) return res.status(404).json({ message: "Cliente no encontrado." });

    // devolvemos el valor EXACTO del enum
    res.json({
      preferencia_bnpl: cli.preferencia_bnpl,
    });
  } catch (error) {
    console.error("Error getClientPaymentPreferences:", error);
    res.status(500).json({ message: error.message });
  }
};


export const updateClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { preferencia_bnpl } = req.body;

    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    // OJO: aquí usamos los valores del ENUM REAL de la tabla
    const validValues = [
      "pago_completo",
      "pagar_despues",
      "4_quincenas",
      "12_meses",
      "24_meses",
    ];

    if (!validValues.includes(preferencia_bnpl)) {
      return res.status(400).json({ message: "Preferencia inválida." });
    }

    const cli = await Cliente.findByPk(clienteId);
    if (!cli) return res.status(404).json({ message: "Cliente no encontrado." });

    cli.preferencia_bnpl = preferencia_bnpl;
    await cli.save();

    res.json({ ok: true, preferencia_bnpl });
  } catch (error) {
    console.error("Error updateClientPaymentPreferences:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ============================
   RESUMEN FINANCIERO (CARTERA)
============================ */
export const getClientWalletData = async (req, res) => {
  try {
    // Obtenemos el ID del cliente del token
    const clienteId = req.cliente?.id || req.user?.id;
    if (!clienteId) return res.status(400).json({ message: "Cliente no identificado" });

    // 1. Obtener Cliente (para ver su crédito disponible)
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    // 2. Buscar todas las órdenes activas del cliente con sus pagos y cuotas
    // Usamos una consulta un poco más manual para garantizar que traiga todo
    const ordenes = await db.Orden.findAll({
      where: { cliente_id: clienteId },
      include: [
        { model: db.Tienda, as: "tienda" }, // Asegúrate de tener la asociación en models/index.js
        {
          model: db.PagoBNPL,
          as: "pago_bnpl", // Asegúrate de tener la asociación Orden -> hasOne -> PagoBNPL
          where: { estado: "activo" }, // Solo nos interesan las deudas activas
          required: false, // Si es false, trae órdenes aunque no tengan pago activo (ej: pagadas), pero el where lo filtra
          include: [
            {
              model: db.Cuota,
              as: "cuotas", // Asegúrate de tener PagoBNPL -> hasMany -> Cuotas
            }
          ]
        }
      ],
      order: [["fecha", "DESC"]]
    });

    // 3. Procesar datos para el Frontend
    let deudaTotal = 0;
    let proximaCuota = null;
    let comprasActivas = [];

    // Filtramos solo las órdenes que tienen un plan BNPL activo
    const ordenesActivas = ordenes.filter(o => o.pago_bnpl);

    for (const ord of ordenesActivas) {
      const bnpl = ord.pago_bnpl;
      const cuotas = bnpl.cuotas || [];
      
      // Calcular deuda pendiente de esta orden
      const pendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'atrasado');
      const montoPendienteOrden = pendientes.reduce((acc, c) => acc + Number(c.monto), 0);
      
      deudaTotal += montoPendienteOrden;

      // Buscar la cuota más próxima a vencer de TODO el historial
      for (const c of pendientes) {
        const fechaVenc = new Date(c.fecha_vencimiento);
        if (!proximaCuota || fechaVenc < new Date(proximaCuota.fecha)) {
          proximaCuota = {
            fecha: c.fecha_vencimiento,
            monto: c.monto,
            tienda: ord.tienda?.nombre || "Tienda",
            numero: c.numero_cuota
          };
        }
      }

      // Estructura para la lista de compras
      const pagadas = cuotas.filter(c => c.estado === 'pagado').length;
      const totalCuotas = cuotas.length;
      const progreso = totalCuotas > 0 ? (pagadas / totalCuotas) * 100 : 0;

      comprasActivas.push({
        id: ord.id,
        tienda: ord.tienda?.nombre || "Tienda Desconocida",
        logo: ord.tienda?.logo_url,
        fecha: ord.fecha,
        total_compra: ord.total,
        deuda_restante: montoPendienteOrden,
        progreso: Math.round(progreso),
        cuotas_restantes: pendientes.length,
        proximo_vencimiento: pendientes[0]?.fecha_vencimiento || null
      });
    }

    res.json({
      disponible: Number(cliente.poder_credito),
      deuda_total: deudaTotal,
      proximo_pago: proximaCuota,
      compras_activas: comprasActivas
    });

  } catch (error) {
    console.error("Error getClientWalletData:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ============================
   OBTENER ÓRDENES ACTIVAS (Para Dividir Cuenta)
============================ */
/* ============================
   OBTENER ÓRDENES ACTIVAS
============================ */
export const getActiveOrders = async (req, res) => {
  try {
    const userId = req.cliente?.id || req.user?.id;
    if (!userId) return res.status(400).json({ message: "Usuario no identificado" });

    const ordenes = await db.Orden.findAll({
      where: { cliente_id: userId },
      include: [
        { 
          model: db.Tienda, 
          as: "tienda",
          attributes: ['nombre', 'logo_url'] // Agregamos logo si quieres
        },
        { 
          model: db.PagoBNPL, 
          as: "pago_bnpl",
          where: { estado: "activo" },
          required: true
        }
      ],
      order: [['fecha', 'DESC']]
    });
    
    const data = ordenes.map(o => ({
      id: o.id,
      tienda: o.tienda?.nombre || "Tienda",
      total: o.total,
      pendiente: o.pago_bnpl?.monto_pendiente || 0,
      fecha: o.fecha,
      grupo_pago_id: o.grupo_pago_id // <--- 🔥 AGREGAMOS ESTO IMPORTANTE
    }));

    res.json(data);

  } catch (err) {
    console.error("Error getActiveOrders:", err);
    res.status(500).json({ message: "Error al obtener las compras activas." });
  }
};


/* =============================================
   DASHBOARD PAGOS (DATA TIPO KLARNA)
============================================= */
export const getPaymentsDashboard = async (req, res) => {
  try {
    const userId = req.cliente?.id || req.user?.id;
    
    // 1. Calcular Deuda Total
    const deudaRes = await db.PagoBNPL.sum('monto_pendiente', {
      include: [{
        model: db.Orden,
        as: 'orden',
        where: { cliente_id: userId }
      }],
      where: { estado: ['activo', 'atrasado'] }
    });

    // 2. Historial de Compras (All purchases)
    const historial = await db.Orden.findAll({
      where: { cliente_id: userId },
      include: [{ model: db.Tienda, as: "tienda", attributes: ['nombre', 'logo_url'] }],
      order: [['fecha', 'DESC']],
      limit: 10
    });

    // 3. Insights (Gasto este mes)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0,0,0,0);
    
    const gastoMes = await db.Orden.sum('total', {
      where: {
        cliente_id: userId,
        fecha: { [db.Sequelize.Op.gte]: inicioMes } // Mayor o igual al día 1
      }
    });

    // 4. Devoluciones (Tickets tipo 'devolucion')
    // Ojo: Filtramos por el asunto o podrías agregar un campo 'tipo' real en la tabla ticket
    const devoluciones = await db.TicketSoporte.count({
      where: {
        cliente_id: userId,
        asunto: { [db.Sequelize.Op.like]: '%Devolución%' }
      }
    });

    res.json({
      totalOwed: deudaRes || 0,
      spentThisMonth: gastoMes || 0,
      refundsCount: devoluciones || 0,
      recentPurchases: historial.map(h => ({
        id: h.id,
        tienda: h.tienda.nombre,
        logo: h.tienda.logo_url,
        total: h.total,
        estado: h.estado,
        fecha: h.fecha
      }))
    });

  } catch (err) {
    console.error("Error dashboard:", err);
    res.status(500).json({ message: "Error cargando dashboard" });
  }
};
