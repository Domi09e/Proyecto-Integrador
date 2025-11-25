// src/controllers/paymentPreferences.controller.js
import db from "../models/index.js";

const { Cliente } = db;

function getClienteIdFromReq(req) {
  return req.user?.cliente_id; // igual que arriba, AJUSTA
}

export const getPaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) return res.status(400).json({ message: "Cliente no encontrado" });

    const cliente = await Cliente.findByPk(clienteId, {
      attributes: ["id", "poder_credito", "preferencia_bnpl"],
    });

    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    res.json(cliente);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error obteniendo preferencias" });
  }
};

export const updatePaymentPreferences = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { preferencia_bnpl } = req.body;

    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    await cliente.update({ preferencia_bnpl });
    res.json(cliente);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error actualizando preferencias" });
  }
};
