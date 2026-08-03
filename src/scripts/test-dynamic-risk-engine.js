import db from "../models/index.js";

import { evaluarCompraDinamicamente } from "../services/dynamic-risk-engine.service.js";

const ejecutar = async () => {
  try {
    await db.sequelize.authenticate();

    console.log("Conexión establecida.");

    /*
     * Cambia este ID por un cliente real.
     */
    const clienteId = 1;

    const resultado = await evaluarCompraDinamicamente({
      clienteId,

      montoSolicitado: 15000,

      numeroCuotasSolicitadas: 12,

      contexto: {
        ip: "192.10.20.30",

        dispositivo_id: "DOSPOSITIVO-DESCONICIDO",

        user_agent: "Mozilla/5.0",

        session_id: "SESION-SOSPECHOSA",

        dispositivo_nuevo: true,

        ip_nueva: true,

        ubicacion_nueva: true,

        ubicacion_inconsistente: true,

        intentos_recientes: 8,

        compras_ultimos_10_minutos: 4,

        cambios_dispositivo_24h: 5,

        segundos_interaccion: 10,

        fecha_transaccion: new Date(),
      },
    });

    console.log(JSON.stringify(resultado, null, 2));
  } catch (error) {
    console.error("Error probando el motor:", error);

    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
};

ejecutar();
