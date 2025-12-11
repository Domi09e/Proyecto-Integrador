import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize";

const { MetaAhorro, AporteMeta, Notificacion } = db;

// Configuración de días según frecuencia
const DIAS_FRECUENCIA = {
  semanal: 7,
  quincenal: 15,
  mensual: 30
};

export const iniciarRecordatorios = () => {
  // Programar tarea para correr todos los días a las 9:00 AM
  // Formato Cron: "Minuto Hora * * *"
  cron.schedule("00 23 * * *", async () => {
    console.log("⏰ Ejecutando revisión automática de ahorros...");
    
    try {
      // 1. Buscar todas las metas activas
      const metasActivas = await MetaAhorro.findAll({
        where: { estado: "activa" },
        include: [
          {
            model: AporteMeta,
            as: "aportes",
            order: [["createdAt", "DESC"]],
            limit: 1 // Solo necesitamos el último aporte
          }
        ]
      });

      console.log(`🔍 Analizando ${metasActivas.length} metas activas...`);

      for (const meta of metasActivas) {
        // 2. Determinar la fecha de la última actividad (Creación o Último Aporte)
        const ultimoAporte = meta.aportes.length > 0 ? meta.aportes[0].createdAt : meta.createdAt;
        const fechaUltimaActividad = new Date(ultimoAporte);
        const fechaHoy = new Date();

        // Calcular diferencia en días
        const diferenciaTiempo = fechaHoy - fechaUltimaActividad;
        const diasInactivo = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

        // 3. Verificar si toca recordatorio según su frecuencia
        const diasLimite = DIAS_FRECUENCIA[meta.frecuencia] || 30;

        // Si los días inactivo son múltiplos del límite (ej: 7, 14, 21 días sin pagar)
        // Y es mayor a 0, enviamos recordatorio.
        if (diasInactivo > 0 && diasInactivo % diasLimite === 0) {
          
          console.log(`⚠️ Usuario ${meta.cliente_id} lleva ${diasInactivo} días sin abonar a "${meta.producto_nombre}". Enviando alerta.`);

          // 4. Crear la notificación
          await Notificacion.create({
            usuario_id: meta.cliente_id,
            rol_destino: "cliente",
            tipo: "recordatorio", // Puedes usar un icono de reloj o alerta en el frontend
            titulo: "¡No olvides tu meta! ⏰",
            mensaje: `Han pasado ${diasInactivo} días desde tu último movimiento en "${meta.producto_nombre}". Un pequeño aporte hoy te acerca más a tu objetivo.`,
            url: "/ahorros",
            is_new: true
          });
        }
      }
      
      console.log(" Revisión de ahorros completada.");

    } catch (error) {
      console.error("Error en el cron de recordatorios:", error);
    }
  });
};