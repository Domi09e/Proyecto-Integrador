// src/controllers/client.controller.js
import db from "../models/index.js";

const { Cliente, MetodoPago } = db;

/**
 * Utilidad: obtener ID de cliente desde el token (req.user)
 */
function getClienteIdFromReq(req) {
  return req.user?.id;
}
/* ============================
   PERFIL DEL CLIENTE
============================ */
export const getClientProfile = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: [
        "id",
        "nombre",
        "apellido",
        "email",
        "telefono",
        "address",
        "poder_credito",
        "preferencia_bnpl",
      ],
    });

    if (!cli) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    res.json(cli);
  } catch (error) {
    console.error("Error getClientProfile:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   MÉTODOS DE PAGO
============================ */
export const getClientPaymentMethods = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const methods = await MetodoPago.findAll({
      where: { cliente_id: clienteId },
      order: [["es_predeterminado", "DESC"], ["id", "DESC"]],
      attributes: [
        "id",
        "tipo",
        "marca",
        "ultimos_cuatro_digitos",
        "fecha_expiracion",
        "es_predeterminado",
      ],
    });

    res.json(methods);
  } catch (error) {
    console.error("Error getClientPaymentMethods:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const {
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado,
    } = req.body;

    if (!tipo || !ultimos_cuatro_digitos) {
      return res
        .status(400)
        .json({ message: "Tipo y últimos 4 dígitos son obligatorios." });
    }

    // si marcó como predeterminado, ponemos los otros en 0
    if (es_predeterminado) {
      await MetodoPago.update(
        { es_predeterminado: 0 },
        { where: { cliente_id: clienteId } }
      );
    }

    const nuevo = await MetodoPago.create({
      cliente_id: clienteId,
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado: es_predeterminado ? 1 : 0,
      token_gateway: "TOKEN_SIMULADO_" + Date.now(),
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error createClientPaymentMethod:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteClientPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { id } = req.params;

    const method = await MetodoPago.findOne({
      where: { id, cliente_id: clienteId },
    });

    if (!method) {
      return res.status(404).json({ message: "Método de pago no encontrado." });
    }

    await method.destroy();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleteClientPaymentMethod:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   PREFERENCIAS DE PAGO BNPL
============================ */

export const getClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const cli = await Cliente.findByPk(clienteId, {
      attributes: ["id", "preferencia_bnpl"],
    });

    if (!cli) return res.status(404).json({ message: "Cliente no encontrado." });

    const dbValue = cli.preferencia_bnpl || "4_quincenas";
    const apiValue = PREF_DB_TO_API[dbValue] || "4_biweekly";

    res.json({ preferencia_bnpl: apiValue });
  } catch (error) {
    console.error("Error getClientPaymentPreferences:", error);
    res.status(500).json({ message: error.message });
  }
};


export const updateClientPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { preferencia_bnpl } = req.body; // valor API: "4_biweekly"

    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    if (!PREF_API_TO_DB[preferencia_bnpl]) {
      return res.status(400).json({ message: "Preferencia inválida." });
    }

    const cli = await Cliente.findByPk(clienteId);
    if (!cli) return res.status(404).json({ message: "Cliente no encontrado." });

    cli.preferencia_bnpl = PREF_API_TO_DB[preferencia_bnpl]; // se guarda "4_quincenas"
    await cli.save();

    res.json({ ok: true, preferencia_bnpl });
  } catch (error) {
    console.error("Error updateClientPaymentPreferences:", error);
    res.status(500).json({ message: error.message });
  }
};

