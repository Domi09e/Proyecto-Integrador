import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import db from "../models/index.js";

const router = Router();
const { Usuario, Cliente, PagoBNPL, Cuota } = db;

// GET /api/admin/usuarios -> lista de usuarios
router.get("/admin/usuarios", requireAdmin, async (_req, res) => {
  try {
    const rows = await Usuario.findAll({
      attributes: ["id", "nombre", "apellido", "email", "rol", "activo"],
      order: [["id", "DESC"]],
    });
    res.json(rows.map((u) => u.toJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error listando usuarios" });
  }
});

// 🔹 GET /api/admin/usuarios/:id -> detalle de un usuario (para editar)
router.get("/admin/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id, {
      attributes: ["id", "nombre", "apellido", "email", "rol", "activo"],
    });

    if (!u) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(u.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error obteniendo usuario" });
  }
});

router.put("/admin/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id);

    if (!u) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const {
      nombre,
      apellido,
      email,
      rol,
      activo,
      password,
    } = req.body || {};

    const updates = {};

    if (nombre !== undefined) updates.nombre = nombre.trim();
    if (apellido !== undefined) updates.apellido = apellido.trim();
    if (email !== undefined) updates.email = email.trim();

    // 👇 solo actualizamos rol si viene con un valor no vacío
    if (rol !== undefined && rol !== "") {
      updates.rol = rol;
    }

    if (activo !== undefined) {
      updates.activo = Number(activo) ? 1 : 0;
    }

    // 👇 si se envía password, la encriptamos y guardamos
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password.trim(), 10);
      updates.password_hash = hash;
    }

    await u.update(updates);

    return res.json(u.toJSON());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "No se pudo actualizar" });
  }
});

// POST /api/admin/usuarios/:id/block -> poner inactivo (activo = 0)
router.post("/admin/usuarios/:id/block", requireAdmin, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    await u.update({ activo: 0 });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "No se pudo bloquear" });
  }
});

// POST /api/admin/usuarios/:id/unlock -> activar (activo = 1)
router.post("/admin/usuarios/:id/unlock", requireAdmin, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    await u.update({ activo: 1 });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "No se pudo desbloquear" });
  }
});

// DELETE /api/admin/usuarios/:id
router.delete("/admin/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    await u.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "No se pudo eliminar" });
  }
});

// LISTA DE CLIENTES CON PODER_CREDITO Y PRÓXIMA CUOTA
router.get("/admin/clients-with-bnpl", requireAdmin, async (_req, res) => {
  try {
    const sql = `
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.email,
        c.telefono,
        c.address,
        c.poder_credito,

        MIN(CASE WHEN cu.estado = 'pendiente' THEN cu.fecha_vencimiento END) AS proxima_cuota_fecha,

        (
          SELECT cu2.monto
          FROM cuotas cu2
          JOIN pagosbnpl pb2 ON pb2.id = cu2.pago_bnpl_id
          JOIN ordenes o2 ON o2.id = pb2.orden_id
          WHERE o2.cliente_id = c.id
            AND cu2.estado = 'pendiente'
          ORDER BY cu2.fecha_vencimiento ASC
          LIMIT 1
        ) AS proxima_cuota_monto

      FROM clientes c
      LEFT JOIN ordenes   o  ON o.cliente_id = c.id
      LEFT JOIN pagosbnpl pb ON pb.orden_id   = o.id
        AND pb.estado = 'activo'
      LEFT JOIN cuotas    cu ON cu.pago_bnpl_id = pb.id
        AND cu.estado = 'pendiente'

      WHERE c.activo = 1
      GROUP BY
        c.id, c.nombre, c.apellido, c.email,
        c.telefono, c.address, c.poder_credito
      ORDER BY c.id DESC;
    `;

    const [rows] = await db.sequelize.query(sql);

    const result = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      apellido: r.apellido,
      email: r.email,
      telefono: r.telefono,
      address: r.address,
      poder_credito: Number(r.poder_credito ?? 0),
      proxima_cuota_monto:
        r.proxima_cuota_monto != null ? Number(r.proxima_cuota_monto) : null,
      proxima_cuota_fecha: r.proxima_cuota_fecha,
    }));

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error obteniendo clientes BNPL" });
  }
});

export default router;
