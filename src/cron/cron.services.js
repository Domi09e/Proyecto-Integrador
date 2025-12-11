import cron from 'node-cron';
import { Op } from 'sequelize';
import db from '../models/index.js';

const { Cliente, Cuota, PagoBNPL, Orden, Notificacion, ConfiguracionRiesgo } = db;

// 👇 1. ESTA ES LA FUNCIÓN QUE HACE EL TRABAJO (AHORA ES PÚBLICA)
export const ejecutarAuditoriaManual = async () => {
    console.log('🔄 Ejecutando auditoría MANUAL de riesgos...');
    const t = await db.sequelize.transaction();
    let bloqueados = 0;

    try {
        let config = await ConfiguracionRiesgo.findOne({ transaction: t });
        
        // Si no existe config, usamos valores por defecto para la prueba
        const DIAS_LIMITE = config ? config.dias_mora_maximo : 30;
        
        // Calcular fecha límite
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - DIAS_LIMITE);

        console.log(`📅 Buscando deudas anteriores a: ${fechaLimite.toLocaleDateString()}`);

        const cuotasVencidas = await Cuota.findAll({
            where: {
                estado: 'pendiente',
                fecha_vencimiento: { [Op.lt]: fechaLimite }
            },
            include: [{
                model: PagoBNPL,
                as: 'pago_bnpl',
                include: [{
                    model: Orden,
                    as: 'orden',
                    include: [{ 
                        model: Cliente, 
                        as: 'cliente',
                        where: { activo: true } // Solo activos (1)
                    }]
                }]
            }],
            transaction: t
        });

        const clientesAProcesar = new Set();
        cuotasVencidas.forEach(c => {
            const cli = c.pago_bnpl?.orden?.cliente;
            if (cli) clientesAProcesar.add(cli.id);
        });

        for (const clienteId of clientesAProcesar) {
            await Cliente.update(
                { activo: false }, 
                { where: { id: clienteId }, transaction: t }
            );
            
            await Notificacion.create({
                usuario_id: clienteId,
                rol_destino: 'cliente',
                tipo: 'sistema',
                titulo: 'Cuenta Suspendida',
                mensaje: `Tu cuenta ha sido desactivada por tener deudas vencidas.`,
                url: '/cartera',
                is_new: true
            }, { transaction: t });
            
            bloqueados++;
        }

        await t.commit();
        return { success: true, bloqueados };

    } catch (error) {
        await t.rollback();
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    }
};

// 👇 2. EL CRON JOB LA LLAMA AUTOMÁTICAMENTE
export const iniciarCronJobs = () => {
  console.log('⏰ Cron Job iniciado (03:00 AM).');
  cron.schedule('0 3 * * *', () => {
      ejecutarAuditoriaManual();
  });
};