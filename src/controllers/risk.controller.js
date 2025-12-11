import db from "../models/index.js";

// 👇 Desestructuración segura. 
// Si db.ConfiguracionRiesgo es undefined, esto fallará aquí.
const ConfiguracionRiesgo = db.ConfiguracionRiesgo;

export const getRiskConfig = async (req, res) => {
    try {
        // Verificación de seguridad
        if (!ConfiguracionRiesgo) {
            console.error("ERROR: El modelo ConfiguracionRiesgo no está cargado en db.");
            return res.status(500).json({ message: "Error de configuración de base de datos" });
        }

        let config = await ConfiguracionRiesgo.findOne();
        
        if (!config) {
            config = await ConfiguracionRiesgo.create({
                dias_mora_maximo: 30,
                monto_deuda_maximo: 50000,
                bloqueo_automatico_activo: true
            });
        }
        res.json(config);
    } catch (error) {
        console.error(" Error en getRiskConfig:", error); // Esto saldrá en tu terminal
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const updateRiskConfig = async (req, res) => {
    try {
        if (!ConfiguracionRiesgo) return res.status(500).json({ message: "Modelo no cargado" });

        const { dias, monto, activo } = req.body;
        
        let config = await ConfiguracionRiesgo.findOne();
        
        if (config) {
            config.dias_mora_maximo = dias;
            config.monto_deuda_maximo = monto;
            config.bloqueo_automatico_activo = activo;
            await config.save();
        } else {
            await ConfiguracionRiesgo.create({
                dias_mora_maximo: dias,
                monto_deuda_maximo: monto,
                bloqueo_automatico_activo: activo
            });
        }
        
        res.json({ message: "Configuración actualizada", config });
    } catch (error) {
        console.error("❌ Error en updateRiskConfig:", error);
        res.status(500).json({ message: "Error al guardar configuración" });
    }
};