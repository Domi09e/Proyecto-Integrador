import db from "../models/index.js";
const { Cliente, GrupoPago, Orden, PagoBNPL, Cuota, Notificacion } = db;

// 1. MAPA DE IDs (Debe coincidir con tu DB)
const PLAN_IDS = {
  "4_quincenas": 2,
  "12_meses": 3,
  "24_meses": 4,
  "pago_completo": 5,
  "pagar_despues": 6
};

// 2. HELPER: Detalles de cada plan para calcular fechas
// Esto nos dice cuántas cuotas son y cómo sumar las fechas
const PLAN_DETAILS = {
  2: { cuotas: 4,  tipo: 'dias',   valor: 15 }, // 4 Quincenas
  3: { cuotas: 12, tipo: 'meses',  valor: 1 },  // 12 Meses
  4: { cuotas: 24, tipo: 'meses',  valor: 1 },  // 24 Meses
  5: { cuotas: 1,  tipo: 'dias',   valor: 1 },  // Pago Completo (mañana)
  6: { cuotas: 1,  tipo: 'dias',   valor: 30 }  // Pagar después (30 días)
};

// Función auxiliar para calcular vencimiento
const calcularVencimiento = (fechaBase, numeroCuota, config) => {
  const venc = new Date(fechaBase);
  if (config.tipo === 'dias') {
    venc.setDate(venc.getDate() + (config.valor * numeroCuota));
  } else {
    venc.setMonth(venc.getMonth() + (config.valor * numeroCuota));
  }
  return venc;
};

/* =========================================================
   DIVIDIR ORDEN EXISTENTE (CREAR GRUPO)
========================================================= */
export const splitExistingOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { ordenId, integrantes } = req.body; 
    const creadorId = req.user.id;

    // 1. Validar orden
    const ordenOriginal = await Orden.findOne({
      where: { id: ordenId, cliente_id: creadorId },
      include: [{ model: PagoBNPL, as: "pago_bnpl" }, { model: db.Tienda, as: "tienda" }],
      transaction: t
    });

    if (!ordenOriginal || !ordenOriginal.pago_bnpl) {
      await t.rollback();
      return res.status(404).json({ message: "Orden no válida para dividir." });
    }

    if (ordenOriginal.pago_bnpl.estado === 'pagado') {
      await t.rollback();
      return res.status(400).json({ message: "No puedes dividir una orden pagada." });
    }

    // 2. Calcular Montos
    const deudaActual = Number(ordenOriginal.pago_bnpl.monto_pendiente);
    const totalPersonas = integrantes.length + 1; 
    const montoPorPersona = Number((deudaActual / totalPersonas).toFixed(2));

    // 3. Validar Amigos
    const amigosValidados = [];
    for (const item of integrantes) {
      if (item.email === req.user.email) continue; 

      const amigo = await Cliente.findOne({ where: { email: item.email }, transaction: t });
      if (!amigo) {
        await t.rollback();
        return res.status(404).json({ message: `El usuario ${item.email} no existe.` });
      }
      if (Number(amigo.poder_credito) < montoPorPersona) {
        await t.rollback();
        return res.status(400).json({ message: `${amigo.nombre} no tiene crédito suficiente.` });
      }
      amigosValidados.push(amigo);
    }

    // 4. Crear Grupo
    const grupo = await GrupoPago.create({
      orden_origen_id: ordenOriginal.id,
      nombre: `Split: ${ordenOriginal.tienda.nombre}`,
      monto_total: deudaActual,
      creador_id: creadorId,
      estado: "completado"
    }, { transaction: t });

    ordenOriginal.grupo_pago_id = grupo.id;
    await ordenOriginal.save({ transaction: t });

    // =========================================================
    // 5. PROCESAR AL CREADOR (MANTENER SU PLAN ORIGINAL)
    // =========================================================
    
    await Cuota.destroy({ where: { pago_bnpl_id: ordenOriginal.pago_bnpl.id }, transaction: t });

    const pagoBnplCreador = ordenOriginal.pago_bnpl;
    pagoBnplCreador.monto_pendiente = montoPorPersona; 
    await pagoBnplCreador.save({ transaction: t });

    // 🔥 LÓGICA DINÁMICA: Usamos el ID del plan que YA tenía la orden
    const planIdCreador = pagoBnplCreador.plan_pago_id;
    const configCreador = PLAN_DETAILS[planIdCreador] || PLAN_DETAILS[2]; // Fallback a 4 quincenas

    const hoy = new Date();
    let cuotaBaseCreador = Math.floor((montoPorPersona / configCreador.cuotas) * 100) / 100;
    let acumuladoCreador = 0;

    for (let i = 1; i <= configCreador.cuotas; i++) {
      let montoC = cuotaBaseCreador;
      // Ajuste de centavos en la última cuota
      if (i === configCreador.cuotas) {
        montoC = Number((montoPorPersona - acumuladoCreador).toFixed(2));
      }
      acumuladoCreador += montoC;

      const venc = calcularVencimiento(hoy, i, configCreador);
      
      await Cuota.create({
        pago_bnpl_id: pagoBnplCreador.id,
        numero_cuota: i,
        monto: montoC,
        fecha_vencimiento: venc,
        estado: "pendiente"
      }, { transaction: t });
    }

    // Devolver crédito al creador
    const creditoLiberado = deudaActual - montoPorPersona;
    const creador = await Cliente.findByPk(creadorId, { transaction: t });
    creador.poder_credito = Number(creador.poder_credito) + creditoLiberado;
    await creador.save({ transaction: t });


    // =========================================================
    // 6. PROCESAR A LOS AMIGOS (USAR SU PREFERENCIA DE PERFIL)
    // =========================================================

    for (const amigo of amigosValidados) {
      // 🔥 LÓGICA DINÁMICA: Buscar preferencia del amigo
      const prefAmigo = amigo.preferencia_bnpl || "4_quincenas";
      const planIdAmigo = PLAN_IDS[prefAmigo] || 2; 
      const configAmigo = PLAN_DETAILS[planIdAmigo] || PLAN_DETAILS[2];

      const nuevaOrden = await Orden.create({
        cliente_id: amigo.id,
        tienda_id: ordenOriginal.tienda_id,
        grupo_pago_id: grupo.id,
        total: montoPorPersona,
        estado: "pendiente",
        fecha: new Date()
      }, { transaction: t });

      const nuevoPago = await PagoBNPL.create({
        orden_id: nuevaOrden.id,
        plan_pago_id: planIdAmigo, // Usamos SU plan preferido
        monto_total: montoPorPersona,
        monto_pendiente: montoPorPersona,
        fecha_inicio: new Date(),
        estado: "activo"
      }, { transaction: t });

      // Generar cuotas según SU plan
      let cuotaBaseAmigo = Math.floor((montoPorPersona / configAmigo.cuotas) * 100) / 100;
      let acumuladoAmigo = 0;

      for (let i = 1; i <= configAmigo.cuotas; i++) {
        let montoC = cuotaBaseAmigo;
        if (i === configAmigo.cuotas) {
            montoC = Number((montoPorPersona - acumuladoAmigo).toFixed(2));
        }
        acumuladoAmigo += montoC;

        const venc = calcularVencimiento(hoy, i, configAmigo);
        
        await Cuota.create({
          pago_bnpl_id: nuevoPago.id,
          numero_cuota: i,
          monto: montoC,
          fecha_vencimiento: venc,
          estado: "pendiente"
        }, { transaction: t });
      }

      amigo.poder_credito = Number(amigo.poder_credito) - montoPorPersona;
      await amigo.save({ transaction: t });

      await Notificacion.create({
        rol_destino: "cliente",
        usuario_id: amigo.id,
        tipo: "compra",
        titulo: "Pago Compartido",
        mensaje: `Te asignaron una compra en ${ordenOriginal.tienda.nombre} por RD$ ${montoPorPersona} (${configAmigo.cuotas} cuotas).`,
        url: "/cartera",
        is_new: true,
        meta: JSON.stringify({ orden_id: nuevaOrden.id })
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: "Orden dividida correctamente." });

  } catch (err) {
    console.error(err);
    await t.rollback();
    res.status(500).json({ message: "Error al dividir la orden." });
  }
};


/* =========================================================
   AGREGAR PARTICIPANTE A UN GRUPO YA EXISTENTE (RECALCULAR)
========================================================= */
export const addParticipantToGroup = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { grupoId, nuevoEmail } = req.body;
    const userId = req.user.id; 

    // Validaciones iniciales
    const grupo = await GrupoPago.findByPk(grupoId, { transaction: t });
    if (!grupo) { await t.rollback(); return res.status(404).json({ message: "Grupo no encontrado." }); }
    if (grupo.creador_id !== userId) { await t.rollback(); return res.status(403).json({ message: "Solo el creador puede agregar participantes." }); }

    // Obtener órdenes y validar pagos
    const ordenesExistentes = await Orden.findAll({
      where: { grupo_pago_id: grupoId },
      include: [
        { model: PagoBNPL, as: "pago_bnpl", include: [{ model: Cuota, as: "cuotas" }] },
        { model: Cliente, as: "cliente" },
        { model: db.Tienda, as: "tienda" } 
      ],
      transaction: t
    });

    const pagosIniciados = ordenesExistentes.some(o => o.pago_bnpl?.cuotas?.some(c => c.estado === 'pagado'));
    if (pagosIniciados) {
      await t.rollback();
      return res.status(400).json({ message: "No se puede editar: Alguien ya realizó pagos." });
    }

    // Validar Nuevo Integrante
    const nuevoParticipante = await Cliente.findOne({ where: { email: nuevoEmail }, transaction: t });
    if (!nuevoParticipante) { await t.rollback(); return res.status(404).json({ message: "Usuario no encontrado." }); }

    const yaEsta = ordenesExistentes.find(o => o.cliente_id === nuevoParticipante.id);
    if (yaEsta) { await t.rollback(); return res.status(400).json({ message: "Usuario ya está en el grupo." }); }

    // Cálculos
    const montoTotalGrupo = Number(grupo.monto_total);
    const cantidadActual = ordenesExistentes.length;
    const cantidadNueva = cantidadActual + 1;
    const nuevoMontoPorPersona = Number((montoTotalGrupo / cantidadNueva).toFixed(2));

    if (Number(nuevoParticipante.poder_credito) < nuevoMontoPorPersona) {
      await t.rollback();
      return res.status(400).json({ message: "El nuevo participante no tiene crédito suficiente." });
    }

    const hoy = new Date();

    // 1. REGENERAR CUOTAS DE LOS MIEMBROS EXISTENTES
    for (const orden of ordenesExistentes) {
        const pagoBNPL = orden.pago_bnpl;
        const montoAnterior = Number(pagoBNPL.monto_total);
        const diferenciaADevolver = montoAnterior - nuevoMontoPorPersona;

        // Actualizar montos
        pagoBNPL.monto_total = nuevoMontoPorPersona;
        pagoBNPL.monto_pendiente = nuevoMontoPorPersona;
        await pagoBNPL.save({ transaction: t });

        orden.total = nuevoMontoPorPersona;
        await orden.save({ transaction: t });

        // Devolver crédito
        const cliente = orden.cliente;
        cliente.poder_credito = Number(cliente.poder_credito) + diferenciaADevolver;
        await cliente.save({ transaction: t });

        // 🔥 LÓGICA DINÁMICA: Respetar el plan que YA tenía cada miembro
        const planId = pagoBNPL.plan_pago_id; 
        const config = PLAN_DETAILS[planId] || PLAN_DETAILS[2];

        // Regenerar cuotas
        await Cuota.destroy({ where: { pago_bnpl_id: pagoBNPL.id }, transaction: t });

        let cuotaBase = Math.floor((nuevoMontoPorPersona / config.cuotas) * 100) / 100;
        let acumulado = 0;

        for (let i = 1; i <= config.cuotas; i++) {
            let montoC = cuotaBase;
            if (i === config.cuotas) montoC = Number((nuevoMontoPorPersona - acumulado).toFixed(2));
            acumulado += montoC;

            const venc = calcularVencimiento(hoy, i, config);

            await Cuota.create({
                pago_bnpl_id: pagoBNPL.id,
                numero_cuota: i,
                monto: montoC,
                fecha_vencimiento: venc,
                estado: "pendiente"
            }, { transaction: t });
        }
        
        await Notificacion.create({
            rol_destino: "cliente",
            usuario_id: cliente.id,
            tipo: "info",
            titulo: "Grupo Actualizado",
            mensaje: `Tu cuota bajó a RD$ ${nuevoMontoPorPersona}.`,
            url: "/cartera",
            is_new: true
        }, { transaction: t });
    }

    // 2. CREAR AL NUEVO
    const tiendaInfo = ordenesExistentes[0].tienda;
    
    // 🔥 LÓGICA DINÁMICA: Preferencia del nuevo
    const prefNuevo = nuevoParticipante.preferencia_bnpl || "4_quincenas";
    const planIdNuevo = PLAN_IDS[prefNuevo] || 2;
    const configNuevo = PLAN_DETAILS[planIdNuevo] || PLAN_DETAILS[2];

    const nuevaOrden = await Orden.create({
        cliente_id: nuevoParticipante.id,
        tienda_id: tiendaInfo.id,
        grupo_pago_id: grupo.id,
        total: nuevoMontoPorPersona,
        estado: "pendiente",
        fecha: new Date()
    }, { transaction: t });

    const nuevoPago = await PagoBNPL.create({
        orden_id: nuevaOrden.id,
        plan_pago_id: planIdNuevo, // Su preferencia
        monto_total: nuevoMontoPorPersona,
        monto_pendiente: nuevoMontoPorPersona,
        fecha_inicio: new Date(),
        estado: "activo"
    }, { transaction: t });

    let cuotaBaseNew = Math.floor((nuevoMontoPorPersona / configNuevo.cuotas) * 100) / 100;
    let acumuladoNew = 0;

    for (let i = 1; i <= configNuevo.cuotas; i++) {
        let montoC = cuotaBaseNew;
        if (i === configNuevo.cuotas) montoC = Number((nuevoMontoPorPersona - acumuladoNew).toFixed(2));
        acumuladoNew += montoC;

        const venc = calcularVencimiento(hoy, i, configNuevo);

        await Cuota.create({
            pago_bnpl_id: nuevoPago.id,
            numero_cuota: i,
            monto: montoC,
            fecha_vencimiento: venc,
            estado: "pendiente"
        }, { transaction: t });
    }

    nuevoParticipante.poder_credito = Number(nuevoParticipante.poder_credito) - nuevoMontoPorPersona;
    await nuevoParticipante.save({ transaction: t });

    await Notificacion.create({
        rol_destino: "cliente",
        usuario_id: nuevoParticipante.id,
        tipo: "compra",
        titulo: "Bienvenido al Grupo",
        mensaje: `Te añadieron a un pago en ${tiendaInfo.nombre}. Tu parte es RD$ ${nuevoMontoPorPersona} (${configNuevo.cuotas} cuotas).`,
        url: "/cartera",
        is_new: true,
        meta: JSON.stringify({ orden_id: nuevaOrden.id })
    }, { transaction: t });

    await t.commit();
    res.json({ 
        success: true, 
        message: "Participante agregado.",
        nuevoMonto: nuevoMontoPorPersona
    });

  } catch (err) {
    console.error("Error addParticipant:", err);
    await t.rollback();
    res.status(500).json({ message: "Error al agregar participante." });
  }
};