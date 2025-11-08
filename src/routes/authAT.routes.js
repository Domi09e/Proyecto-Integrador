// src/routes/admin.store.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import db from "../models/index.js";

const r = Router();
const { Tienda, TiendasCategorias } = db;

// --- Multer: guarda en /uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `store_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Formato de imagen no permitido"), ok);
  },
});

// GET /api/admin/tiendas
r.get("/tiendas", requireAdmin, async (_req, res) => {
  const rows = await Tienda.findAll({ order: [["id", "DESC"]] });
  res.json(rows);
});

// POST /api/admin/tiendas  (JSON o multipart)
// si viene file "logo": guarda filename en logo_url
r.post("/tiendas", requireAdmin, upload.single("logo"), async (req, res) => {
  const {
    nombre, descripcion, direccion, telefono,
    email_corporativo, sitio_web, rnc, estado = "borrador",
    categorias = [],
    logo_url, // opcional si mandas URL directa en JSON
  } = req.body || {};

  try {
    const data = {
      nombre,
      descripcion: descripcion || null,
      direccion: direccion || null,
      telefono: telefono || null,
      email_corporativo: email_corporativo || null,
      sitio_web: sitio_web || null,
      rnc: rnc || null,
      estado,
      logo_url: req.file ? `/uploads/${req.file.filename}` : (logo_url || null),
      creada_por: req.user.id,
      // fecha_alta la pone la BD por default
    };

    const tienda = await Tienda.create(data);

    if (Array.isArray(categorias) && categorias.length) {
      for (const categoria_id of categorias) {
        await TiendasCategorias.create({ tienda_id: tienda.id, categoria_id });
      }
    }

    return res.status(201).json(tienda);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
});

// PUT /api/admin/tiendas/:id
r.put("/tiendas/:id", requireAdmin, upload.single("logo"), async (req, res) => {
  const tienda = await Tienda.findByPk(req.params.id);
  if (!tienda) return res.status(404).json({ message: "Tienda no encontrada" });

  const {
    nombre, descripcion, direccion, telefono,
    email_corporativo, sitio_web, rnc, estado,
    logo_url,
    categorias,
  } = req.body || {};

  try {
    const patch = {
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(direccion !== undefined && { direccion }),
      ...(telefono !== undefined && { telefono }),
      ...(email_corporativo !== undefined && { email_corporativo }),
      ...(sitio_web !== undefined && { sitio_web }),
      ...(rnc !== undefined && { rnc }),
      ...(estado !== undefined && { estado }),
      ...(req.file && { logo_url: `/uploads/${req.file.filename}` }),
      ...(logo_url && !req.file && { logo_url }),
    };

    await tienda.update(patch);

    if (Array.isArray(categorias)) {
      await TiendasCategorias.destroy({ where: { tienda_id: tienda.id } });
      for (const categoria_id of categorias) {
        await TiendasCategorias.create({ tienda_id: tienda.id, categoria_id });
      }
    }

    return res.json(tienda);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
});

r.delete("/tiendas/:id", requireAdmin, async (req, res) => {
  const tienda = await Tienda.findByPk(req.params.id);
  if (!tienda) return res.status(404).json({ message: "Tienda no encontrada" });
  await tienda.destroy();
  return res.sendStatus(204);
});

export default r;
