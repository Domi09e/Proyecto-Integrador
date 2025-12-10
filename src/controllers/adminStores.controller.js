// src/controllers/adminStores.controller.js
import db from "../models/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { logAction } from "../services/audit.service.js"; // 👈 IMPORTANTE

const { Tienda } = db; 

// --- Configuración de Subida de Archivos (Logo) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/logos";
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/webp", "image/jpg"].includes(file.mimetype);
    cb(ok ? null : new Error("Formato de imagen inválido"));
  }
});

// --- Normalizador de Datos ---
const pickStore = (t) => ({
  id: t.id,
  nombre: t.nombre,
  rnc: t.rnc,
  telefono: t.telefono,
  email_corporativo: t.email_corporativo,
  direccion: t.direccion,
  descripcion: t.descripcion,
  sitio_web: t.sitio_web,
  logo_url: t.logo_url,
  estado: t.estado,
  creada_por: t.creada_por,
  createdAt: t.createdAt,
});

// ============ HANDLERS ============

// 1. Listar Tiendas
export async function listStores(_req, res) {
  try {
    const rows = await Tienda.findAll({ order: [["id", "DESC"]] });
    return res.json(rows.map(pickStore));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al listar tiendas" });
  }
}

// 2. Crear Tienda
export const createStore = [
  upload.single("logo"), 
  async (req, res) => {
    try {
        const body = req.body || {};
        const logo_url = req.file ? `/${req.file.path.replace(/\\/g, "/")}` : (body.logo_url || null);

        const payload = {
          nombre: String(body.nombre || "").trim(),
          rnc: body.rnc || null,
          telefono: body.telefono || null,
          email_corporativo: body.email_corporativo || null,
          direccion: body.direccion || null,
          descripcion: body.descripcion || null,
          sitio_web: body.sitio_web || null,
          logo_url,
          estado: body.estado || "borrador",
          creada_por: req.user?.id || null,
        };

        const t = await Tienda.create(payload);

        // 🔥 AUDITORÍA CENTRALIZADA
        await logAction(
            req.user.id, 
            "CREATE", 
            "Tienda", 
            `Creó la tienda: ${t.nombre} (RNC: ${t.rnc || 'N/A'})`, 
            req
        );

        return res.status(201).json(pickStore(t));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear tienda" });
    }
  }
];

// 3. Actualizar Tienda
export async function updateStore(req, res) {
  try {
      const { id } = req.params;
      const t = await Tienda.findByPk(id);
      if (!t) return res.status(404).json({ message: "Tienda no encontrada" });

      const body = req.body || {};

      await t.update({
        nombre: body.nombre ?? t.nombre,
        rnc: body.rnc ?? t.rnc,
        telefono: body.telefono ?? t.telefono,
        email_corporativo: body.email_corporativo ?? t.email_corporativo,
        direccion: body.direccion ?? t.direccion,
        descripcion: body.descripcion ?? t.descripcion,
        sitio_web: body.sitio_web ?? t.sitio_web,
        logo_url: body.logo_url ?? t.logo_url,
        estado: body.estado ?? t.estado,
      });

      // 🔥 AUDITORÍA CENTRALIZADA
      await logAction(
        req.user.id, 
        "UPDATE", 
        "Tienda", 
        `Actualizó datos de la tienda: ${t.nombre}`, 
        req
      );

      return res.json(pickStore(t));
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al actualizar tienda" });
  }
}

// 4. Eliminar Tienda
export async function deleteStore(req, res) {
  try {
      const { id } = req.params;
      const t = await Tienda.findByPk(id);
      if (!t) return res.status(404).json({ message: "Tienda no encontrada" });

      const nombreTienda = t.nombre; // Guardar nombre antes de borrar
      await t.destroy();

      // 🔥 AUDITORÍA CENTRALIZADA
      await logAction(
        req.user.id, 
        "DELETE", 
        "Tienda", 
        `Eliminó la tienda: ${nombreTienda} (ID: ${id})`, 
        req
      );

      return res.sendStatus(204);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al eliminar tienda" });
  }
}

// 5. Cambiar Estado (Activar/Desactivar)
export async function updateState(req, res) {
  try {
      const { id } = req.params;
      const { estado } = req.body || {};
      const t = await Tienda.findByPk(id);
      if (!t) return res.status(404).json({ message: "Tienda no encontrada" });

      await t.update({ estado });

      const accion = estado === "activa" ? "REACTIVAR" : "DESACTIVAR";
      await logAction(
        req.user.id, 
        accion, 
        "Tienda", 
        `Cambió estado de la tienda ${t.nombre} a: ${estado.toUpperCase()}`, 
        req
      );

      return res.json(pickStore(t));
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cambiar estado" });
  }
}