// src/controllers/paymentMethods.controller.js
import db from "../models/index.js";

const { MetodoPago, Cliente } = db;

// helper para sacar id del cliente actual a partir del user (ajusta según tu JWT)
function getClienteIdFromReq(req) {
  // si en el token guardas el id del cliente directo:
  return req.user?.cliente_id; // AJUSTA esto a lo que realmente tengas
}

export const getMyPaymentMethods = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res.status(400).json({ message: "Cliente no encontrado" });
    }

    const metodos = await MetodoPago.findAll({
      where: { cliente_id: clienteId },
      order: [["es_predeterminado", "DESC"], ["id", "DESC"]],
    });

    res.json(metodos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error obteniendo métodos de pago" });
  }
};

export const createPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res.status(400).json({ message: "Cliente no encontrado" });
    }

    const {
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      es_predeterminado,
    } = req.body;

    // Simulamos un token de gateway
    const token_gateway = "tok_" + Date.now();

    const nuevo = await MetodoPago.create({
      cliente_id: clienteId,
      tipo,
      marca,
      ultimos_cuatro_digitos,
      fecha_expiracion,
      token_gateway,
      es_predeterminado: es_predeterminado ? 1 : 0,
    });

    // si es predeterminado, quitamos predeterminado a los demás
    if (es_predeterminado) {
      await MetodoPago.update(
        { es_predeterminado: 0 },
        { where: { cliente_id: clienteId, id: { [db.Sequelize.Op.ne]: nuevo.id } } }
      );
    }

    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creando método de pago" });
  }
};

export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { id } = req.params;

    const metodo = await MetodoPago.findOne({
      where: { id, cliente_id: clienteId },
    });
    if (!metodo) {
      return res.status(404).json({ message: "Método no encontrado" });
    }

    // poner este como predeterminado y los demás en 0
    await MetodoPago.update(
      { es_predeterminado: 0 },
      { where: { cliente_id: clienteId } }
    );
    await metodo.update({ es_predeterminado: 1 });

    res.json(metodo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error actualizando método de pago" });
  }
};

export const deletePaymentMethod = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    const { id } = req.params;

    const deleted = await MetodoPago.destroy({
      where: { id, cliente_id: clienteId },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Método no encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error eliminando método de pago" });
  }
};
