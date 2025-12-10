import db from "../models/index.js";

const { Cliente, Tienda, Orden, PagoBNPL, Cuota, Notificacion } = db;

// Mapa de IDs reales según tu base de datos
const PLAN_IDS = {
  "4_quincenas": 2,
  "12_meses": 3,
  "24_meses": 4,
  "pago_completo": 5,
  "pagar_despues": 6
};

/* ==========================================
   CHECKOUT BNPL (CREAR DEUDA CON CÁLCULO EXACTO)
========================================== */
export const bnplCheckout = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { tiendaId, monto } = req.body;
    const userId = req.user.id;

    if (!tiendaId || !monto) {
      await t.rollback();
      return res.status(400).json({ message: "Datos incompletos." });
    }

    // 1) Buscar cliente
    const cliente = await Cliente.findByPk(userId, { transaction: t });
    if (!cliente) {
      await t.rollback();
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    // 2) Validar Crédito
    const montoNumber = Number(monto);
    const creditoDisponible = Number(cliente.poder_credito);

    if (montoNumber > creditoDisponible) {
      await t.rollback();
      return res.status(400).json({ 
        message: `Crédito insuficiente. Tienes RD$ ${creditoDisponible.toFixed(2)} disponibles.` 
      });
    }

    // 3) Validar Tienda
    const tienda = await Tienda.findByPk(tiendaId, { transaction: t });
    if (!tienda || tienda.estado !== "activa") {
      await t.rollback();
      return res.status(400).json({ message: "La tienda no está disponible." });
    }

    // 4) Configurar Plan
    const mapaCuotas = {
      "pago_completo": 1,
      "pagar_despues": 1,
      "4_quincenas": 4,
      "12_meses": 12,
      "24_meses": 24
    };
    
    const preferencia = cliente.preferencia_bnpl || "4_quincenas";
    const numeroCuotas = mapaCuotas[preferencia] || 4;
    const planIdReal = PLAN_IDS[preferencia] || 2; 

    // 5) Crear Orden
    const orden = await Orden.create({
      cliente_id: cliente.id,
      tienda_id: tienda.id,
      total: montoNumber,
      estado: "pendiente",
      fecha: new Date(),
    }, { transaction: t });

    // 6) Crear BNPL
    const pagoBnpl = await PagoBNPL.create({
      orden_id: orden.id,
      plan_pago_id: planIdReal,
      monto_total: montoNumber,
      monto_pendiente: montoNumber,
      fecha_inicio: new Date(),
      estado: "activo"
    }, { transaction: t });

    // 7) Generar Cuotas (CON LÓGICA DE CENTAVO PERDIDO)
    // Calculamos la cuota base
    let montoCuotaBase = Math.floor((montoNumber / numeroCuotas) * 100) / 100; // Truncamos a 2 decimales
    let acumulado = 0;
    const hoy = new Date();
    
    for (let i = 1; i <= numeroCuotas; i++) {
      let montoEstaCuota = montoCuotaBase;

      // Si es la última cuota, le sumamos lo que falta para llegar al total exacto
      if (i === numeroCuotas) {
        montoEstaCuota = Number((montoNumber - acumulado).toFixed(2));
      }
      
      acumulado += montoEstaCuota; // Vamos sumando lo que llevamos asignado

      // Fechas
      const venc = new Date(hoy);
      if (preferencia === "4_quincenas") {
        venc.setDate(venc.getDate() + (15 * i));
      } else if (preferencia === "pagar_despues") {
        venc.setDate(venc.getDate() + 30);
      } else if (preferencia === "pago_completo") {
        venc.setDate(venc.getDate() + 1); 
      } else {
        venc.setMonth(venc.getMonth() + i);
      }

      await Cuota.create({
        pago_bnpl_id: pagoBnpl.id,
        numero_cuota: i,
        monto: montoEstaCuota, // Usamos el monto calculado exacto
        fecha_vencimiento: venc,
        estado: "pendiente"
      }, { transaction: t });
    }

    // 8) Restar Crédito
    cliente.poder_credito = Number(cliente.poder_credito) - montoNumber;
    await cliente.save({ transaction: t });

    // 9) Notificaciones
    await Notificacion.create({
      rol_destino: "admin",
      usuario_id: null,
      tipo: "compra",
      titulo: "Nueva Venta BNPL",
      mensaje: `Cliente ${cliente.nombre} compró RD$ ${montoNumber} en ${tienda.nombre}.`,
      url: `/admin/clientes`,
      is_new: true,
      meta: JSON.stringify({ orden_id: orden.id })
    }, { transaction: t });

    await Notificacion.create({
      rol_destino: "cliente",
      usuario_id: cliente.id,
      tipo: "compra",
      titulo: "Compra Aprobada",
      mensaje: `Compra en ${tienda.nombre} por RD$ ${montoNumber}. Nuevo saldo: RD$ ${cliente.poder_credito.toFixed(2)}.`,
      url: "/cartera",
      is_new: true,
      meta: JSON.stringify({ orden_id: orden.id })
    }, { transaction: t });

    await t.commit();

    res.json({ success: true, orden_id: orden.id });

  } catch (err) {
    console.error("Error BNPL Checkout:", err);
    await t.rollback();
    res.status(500).json({ message: "Error interno al procesar la compra." });
  }
};


/* ==========================================
   PAGAR UNA CUOTA (CON VALIDACIÓN DE MÉTODO Y PREMIO)
========================================== */
export const payInstallment = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    // Recibimos cuota_id Y metodo_pago_id
    const { cuota_id, metodo_pago_id } = req.body;
    const userId = req.user.id;

    // --- 1. VALIDACIÓN DE MÉTODO DE PAGO (NUEVO) ---
    if (!metodo_pago_id) {
      await t.rollback();
      return res.status(400).json({ message: "Debes seleccionar un método de pago." });
    }

    // Verificar que el método exista y pertenezca al cliente
    const metodo = await db.MetodoPago.findOne({
      where: { id: metodo_pago_id, cliente_id: userId },
      transaction: t
    });

    if (!metodo) {
      await t.rollback();
      return res.status(400).json({ message: "El método de pago no es válido o no te pertenece." });
    }
    // ------------------------------------------------

    // 2. Buscar la cuota y validar propiedad
    const cuota = await Cuota.findByPk(cuota_id, {
      include: [
        {
          model: PagoBNPL,
          as: "pago_bnpl",
          include: [
            {
              model: Orden,
              as: "orden",
              include: [{ model: Cliente, as: "cliente" }, { model: Tienda, as: "tienda" }]
            }
          ]
        }
      ],
      transaction: t
    });

    if (!cuota) {
      await t.rollback();
      return res.status(404).json({ message: "Cuota no encontrada" });
    }

    if (cuota.pago_bnpl.orden.cliente.id !== userId) {
      await t.rollback();
      return res.status(403).json({ message: "No tienes permiso para pagar esta cuota." });
    }

    if (cuota.estado === 'pagado') {
      await t.rollback();
      return res.status(400).json({ message: "Esta cuota ya está pagada." });
    }

    // 3. Procesar Pago
    cuota.estado = 'pagado';
    cuota.fecha_pago = new Date();
    await cuota.save({ transaction: t });

    const pagoPadre = cuota.pago_bnpl;
    const montoPagado = Number(cuota.monto);
    
    // Restamos la deuda
    pagoPadre.monto_pendiente = Number(pagoPadre.monto_pendiente) - montoPagado;
    
    const cliente = cuota.pago_bnpl.orden.cliente;
    const nombreTienda = cuota.pago_bnpl.orden.tienda.nombre;
    let mensajeExtra = "";

    // 4. VERIFICAR CIERRE DE ORDEN (Umbral pequeño por seguridad decimal)
    if (pagoPadre.monto_pendiente <= 0.05) { 
      pagoPadre.monto_pendiente = 0.00;
      pagoPadre.estado = 'pagado';
      
      const orden = pagoPadre.orden;
      orden.estado = 'completada';
      await orden.save({ transaction: t });

      // --- LÓGICA DE PREMIO (Gamificación) ---
      const historialCuotas = await Cuota.findAll({
        where: { pago_bnpl_id: pagoPadre.id },
        transaction: t
      });

      // Verificar puntualidad
      const tuvoAtrasos = historialCuotas.some(c => {
        if (!c.fecha_pago) return true;
        const pagado = new Date(c.fecha_pago);
        const vencimiento = new Date(c.fecha_vencimiento);
        // Normalizar horas
        pagado.setHours(0,0,0,0);
        vencimiento.setHours(0,0,0,0);
        return pagado > vencimiento;
      });

      if (!tuvoAtrasos) {
        // Premio: 15% del valor de la compra
        const bonoCredito = Number(pagoPadre.monto_total) * 0.15;
        cliente.poder_credito = Number(cliente.poder_credito) + bonoCredito;
        mensajeExtra = `¡Bono por puntualidad! Tu límite aumentó en RD$ ${bonoCredito.toFixed(2)}.`;
      }
    }
    
    await pagoPadre.save({ transaction: t });

    // 5. DEVOLUCIÓN DE CRÉDITO (Lo que pagó se libera)
    cliente.poder_credito = Number(cliente.poder_credito) + montoPagado;
    await cliente.save({ transaction: t });

    // 6. Notificación (Incluyendo info del método usado)
    await Notificacion.create({
      rol_destino: "cliente",
      usuario_id: cliente.id,
      tipo: "pago",
      titulo: mensajeExtra ? "¡Pago Completado y Premio!" : "Pago Exitoso",
      mensaje: `Pagaste RD$ ${montoPagado.toFixed(2)} a ${nombreTienda} usando ${metodo.marca} •••• ${metodo.ultimos_cuatro_digitos}. Crédito recuperado.${mensajeExtra}`,
      url: "/cartera",
      is_new: true,
      meta: JSON.stringify({ orden_id: pagoPadre.orden_id })
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: "Pago realizado correctamente",
      nuevo_credito: cliente.poder_credito
    });

  } catch (err) {
    console.error("Error payInstallment:", err);
    await t.rollback();
    res.status(500).json({ message: "Error procesando el pago." });
  }
};