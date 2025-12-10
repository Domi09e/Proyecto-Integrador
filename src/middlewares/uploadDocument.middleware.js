// src/middlewares/uploadDocument.middleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

const documentosDir = path.resolve("uploads", "documentos");

if (!fs.existsSync(documentosDir)) {
  fs.mkdirSync(documentosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .jpg, .png, etc.
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `doc_${unique}${ext}`);
  },
});

const uploadDocumento = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máx
});

export default uploadDocumento;