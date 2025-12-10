// src/services/notification.service.js
import db from "../models/index.js";

const { Notificacion } = db;

/**
 * Notifica a admins (global o a un admin específico)
 */
export async function notifyAdmin({
  titulo,
  mensaje,
  url = null,
  tipo = "sistema",
  meta = null,
  adminId = null, // si null => todos los admins
}) {
  await Notificacion.create({
    rol_destino: "admin",
    usuario_id: adminId,
    titulo,
    mensaje,
    url,
    tipo,
    meta: meta ? JSON.stringify(meta) : null,
    is_new: true,
  });
}

/**
 * Notifica a un cliente específico
 */
export async function notifyCliente({
  clienteId,
  titulo,
  mensaje,
  url = null,
  tipo = "sistema",
  meta = null,
}) {
  if (!clienteId) return;
  await Notificacion.create({
    rol_destino: "cliente",
    usuario_id: clienteId,
    titulo,
    mensaje,
    url,
    tipo,
    meta: meta ? JSON.stringify(meta) : null,
    is_new: true,
  });
}

/**
 * (Opcional) notificación global a todos los clientes
 */
export async function notifyClientesGlobal({
  titulo,
  mensaje,
  url = null,
  tipo = "sistema",
  meta = null,
}) {
  await Notificacion.create({
    rol_destino: "cliente",
    usuario_id: null,
    titulo,
    mensaje,
    url,
    tipo,
    meta: meta ? JSON.stringify(meta) : null,
    is_new: true,
  });
}
