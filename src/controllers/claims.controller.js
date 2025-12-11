import db from "../models/index.js";
const { Reclamacion, Cliente } = db;

// 1. Crear Reclamo (Soporta Imagen y Causas Específicas)
export const createClaim = async (req, res) => {
    try {
        console.log("Cuerpo recibido:", req.body);
        console.log("Archivo recibido:", req.file);

        const { orden_id, causa, descripcion, asunto } = req.body;
        
        // Procesar imagen si existe
        let evidencia_url = null;
        if (req.file) {
            // Guardamos la ruta pública (ej: /uploads/foto.jpg)
            evidencia_url = `/uploads/${req.file.filename}`;
        }

        const nuevoReclamo = await Reclamacion.create({
            cliente_id: req.user.id,
            orden_id: orden_id || null, 
            causa, // Debe ser uno de los valores del ENUM
            descripcion: asunto ? `${asunto}: ${descripcion}` : descripcion, // Combinamos asunto y descripción
            evidencia_url
        });

        res.json({ 
            message: "Reclamación registrada exitosamente.", 
            ticket_id: nuevoReclamo.id 
        });

    } catch (error) {
        console.error("Error createClaim:", error);
        res.status(500).json({ message: "Error al procesar la solicitud." });
    }
};

// 2. Ver mis Reclamos
export const getMyClaims = async (req, res) => {
    try {
        const reclamos = await Reclamacion.findAll({ 
            where: { cliente_id: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(reclamos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error obteniendo historial." });
    }
};