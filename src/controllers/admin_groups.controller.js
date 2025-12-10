import db from "../models/index.js";

const { GrupoPago, Cliente, Orden, PagoBNPL } = db;

export const getAdminGroups = async (req, res) => {
  try {
    const grupos = await GrupoPago.findAll({
      include: [
        { 
          model: Cliente, 
          as: "creador", 
          attributes: ["id", "nombre", "apellido", "email"] 
        },
        {
          model: Orden,
          as: "ordenes",
          attributes: ["id", "total", "estado"],
          include: [
            { 
              model: Cliente, 
              as: "cliente", 
              attributes: ["id", "nombre", "apellido", "email"] 
            },
            {
              model: PagoBNPL,
              as: "pago_bnpl",
              attributes: ["monto_total", "monto_pendiente", "estado"]
            }
          ]
        }
      ],
      order: [["fecha_creacion", "DESC"]]
    });

    // Formateamos y CALCULAMOS EN TIEMPO REAL
    const data = grupos.map(g => {
      
      // 1. Calcular el Total Real del Grupo (Suma de los totales de las órdenes hijas)
      const totalRealGrupo = g.ordenes.reduce((acc, o) => acc + Number(o.total), 0);

      // 2. Calcular cuánto se ha pagado realmente (Total Orden - Pendiente Orden)
      const pagadoRealGrupo = g.ordenes.reduce((acc, o) => {
        const totalOrden = Number(o.total);
        const pendienteOrden = Number(o.pago_bnpl?.monto_pendiente || 0);
        const pagadoOrden = totalOrden - pendienteOrden;
        
        // Corrección de seguridad: Si pagado da negativo o algo raro, es 0
        return acc + (pagadoOrden > 0 ? pagadoOrden : 0);
      }, 0);

      return {
        id: g.id,
        nombre: g.nombre,
        total_grupo: totalRealGrupo, // Usamos el calculado, no g.monto_total
        creador: `${g.creador.nombre} ${g.creador.apellido}`,
        fecha: g.fecha_creacion,
        participantes: g.ordenes.length,
        progreso_pago: pagadoRealGrupo, // Monto exacto pagado
        detalles_ordenes: g.ordenes
      };
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener grupos" });
  }
};