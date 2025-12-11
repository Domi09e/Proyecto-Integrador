import { Op } from "sequelize";
import db from "../models/index.js";

export const verificarDeudaCritica = async (req, res, next) => {
    try {
        const userId = req.user.id; 
        
        // Calcular fecha límite (Hoy - 30 días)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30); 

        // Buscar si tiene ALGUNA cuota pendiente que venció hace más de 30 días
        const deudaVieja = await db.PagoBNPL.findOne({
            where: {
                estado: 'pendiente',
                fecha_vencimiento: { [Op.lt]: fechaLimite } // lt = menor que (antes de)
            },
            include: [{
                model: db.Orden,
                where: { cliente_id: userId }, // Solo ordenes de este usuario
                attributes: [] // No necesitamos datos de la orden, solo el filtro
            }]
        });

        if (deudaVieja) {
            // 1. Lo marcamos como suspendido en la base de datos (por si acaso)
            await db.Cliente.update(
                { estado: 'Suspendido' }, 
                { where: { id: userId } }
            );

            // 2. Le prohibimos pasar
            return res.status(403).json({ 
                message: "Acceso denegado. Tienes facturas vencidas de más de 30 días. Tu cuenta ha sido suspendida." 
            });
        }

        // Si está limpio, sigue.
        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error verificando historial crediticio" });
    }
};