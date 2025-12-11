import { Router } from "express";
import { createClaim, getMyClaims } from "../controllers/claims.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configuración para guardar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'src/public/uploads';
        // Crear carpeta si no existe
        if (!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Nombre único: evidencia-FECHA-RANDOM.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'evidencia-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
const router = Router();

router.use(requireAuth);

// 👇 RUTA IMPORTANTE: Recibe texto + 1 archivo llamado 'evidencia'
router.post("/claims", upload.single("evidencia"), createClaim);
router.get("/claims", getMyClaims);

export default router;