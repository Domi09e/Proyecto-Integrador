import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Asegurar que el directorio existe
const uploadDir = 'public/uploads/tickets/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Carpeta destino
    },
    filename: (req, file, cb) => {
        // Nombre único: fecha + nombre original limpiado
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'evidencia-' + uniqueSuffix + ext);
    }
});

// Filtro de archivos (Solo imágenes)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    // Verifica extensión y tipo MIME
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Solo se permiten imágenes (jpeg, jpg, png, gif).'));
    }
};

// Configuración final de Multer
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // Límite de 5MB por archivo
        files: 3 // Máximo 3 archivos por ticket
    },
    fileFilter: fileFilter
});

// Exportamos configurado para aceptar un array de archivos llamado 'imagenes'
export const uploadMiddlewareSoporte = upload.array('imagenes', 3);