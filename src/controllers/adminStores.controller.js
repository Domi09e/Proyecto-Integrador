import db from "../models/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const { Tienda, AuditoriaTiendas } = db; // asegúrate de exportarlos en models/index.js

// --- subida de archivos (logo) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/logos";
    fs.mkdirSync(dir, { recursive: true });
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
    const ok = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Formato de imagen inválido"));
  }
});

// --- normalizador simple ---
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
  fecha_alta: t.fecha_alta,
  fecha_baja: t.fecha_baja,
});

// ============ HANDLERS ============
export async function listStores(_req, res) {
  const rows = await Tienda.findAll({ order: [["id", "DESC"]] });
  return res.json(rows.map(pickStore));
}

export const createStore = [
  upload.single("logo"), // opcional: acepta campo "logo"
  async (req, res) => {
    const body = req.body || {};
    const logo_url = req.file ? `/${req.file.path.replace(/\\/g, "/")}` : (body.logo_url || null);

    // Solo columnas que EXISTEN en tu tabla
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
      // fecha_alta lo maneja la DB con default CURRENT_TIMESTAMP si así lo definiste
    };

    const t = await Tienda.create(payload);

    // auditoría
    await AuditoriaTiendas.create({
      tienda_id: t.id,
      usuario_id: req.user?.id || null,
      accion: "CREAR",
      descripcion: `Creación de tienda ${t.nombre}`,
      datos_despues: payload,
      ip_origen: req.ip || null,
      user_agent: req.headers["user-agent"] || null,
    });

    return res.status(201).json(pickStore(t));
  }
];

export async function updateStore(req, res) {
  const { id } = req.params;
  const t = await Tienda.findByPk(id);
  if (!t) return res.status(404).json({ message: "Tienda no encontrada" });

  const antes = pickStore(t);
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

  await AuditoriaTiendas.create({
    tienda_id: t.id,
    usuario_id: req.user?.id || null,
    accion: "ACTUALIZAR",
    descripcion: `Actualización de tienda ${t.nombre}`,
    datos_antes: antes,
    datos_despues: pickStore(t),
    ip_origen: req.ip || null,
    user_agent: req.headers["user-agent"] || null,
  });

  return res.json(pickStore(t));
}

export async function deleteStore(req, res) {
  const { id } = req.params;
  const t = await Tienda.findByPk(id);
  if (!t) return res.status(404).json({ message: "Tienda no encontrada" });

  const antes = pickStore(t);
  await t.destroy();

  await AuditoriaTiendas.create({
    tienda_id: id,
    usuario_id: req.user?.id || null,
    accion: "ELIMINAR",
    descripcion: `Eliminación de tienda ${antes.nombre}`,
    datos_antes: antes,
    ip_origen: req.ip || null,
    user_agent: req.headers["user-agent"] || null,
  });

  return res.sendStatus(204);
}

export async function updateState(req, res) {
  const { id } = req.params;
  const { estado } = req.body || {};
  const t = await Tienda.findByPk(id);
  if (!t) return res.status(404).json({ message: "Tienda no encontrada" });

  const antes = pickStore(t);
  await t.update({ estado });
  await AuditoriaTiendas.create({
    tienda_id: id,
    usuario_id: req.user?.id || null,
    accion: estado === "activa" ? "REACTIVAR" : "DESACTIVAR",
    descripcion: `Cambio de estado a ${estado}`,
    datos_antes: antes,
    datos_despues: pickStore(t),
  });

  return res.json(pickStore(t));
}

export async function getStoreAudit(req, res) {
  const { id } = req.params;
  const items = await AuditoriaTiendas.findAll({
    where: { tienda_id: id },
    order: [["fecha", "DESC"]],
  });
  return res.json(items);
}
