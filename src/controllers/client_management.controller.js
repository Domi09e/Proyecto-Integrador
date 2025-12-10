import db from "../models/index.js";
import { logAction } from "../services/audit.services.js"; // 👈 IMPORTANTE: Servicio de auditoría

const { Cliente } = db;

// Editar Cliente (Ej: Aumentar crédito manual o cambiar datos)
export const updateClientAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, poder_credito, activo } = req.body;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    // Guardamos valores anteriores para comparar en el log
    const creditoAnterior = Number(cliente.poder_credito);
    const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;

    // Actualizamos campos
    if (nombre) cliente.nombre = nombre;
    if (apellido) cliente.apellido = apellido;
    if (telefono) cliente.telefono = telefono;
    if (poder_credito !== undefined) cliente.poder_credito = Number(poder_credito);
    if (activo !== undefined) cliente.activo = activo;

    await cliente.save();

    // 🔥 AUDITORÍA: Cambio de Crédito
    if (poder_credito !== undefined && Number(poder_credito) !== creditoAnterior) {
        await logAction(
            req.user.id, 
            "UPDATE", 
            "Crédito Cliente", 
            `Modificó el límite de crédito de ${cliente.email}: RD$ ${creditoAnterior.toLocaleString()} -> RD$ ${cliente.poder_credito.toLocaleString()}`, 
            req
        );
    }

    // 🔥 AUDITORÍA: Actualización General
    // (Opcional: Si quieres registrar cualquier otro cambio aunque no sea crédito)
    await logAction(
        req.user.id, 
        "UPDATE", 
        "Cliente", 
        `Actualizó datos personales del cliente: ${nombreCompleto}`, 
        req
    );

    res.json({ message: "Cliente actualizado", cliente });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

// Bloquear / Desbloquear
export const toggleBlockClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { bloquear } = req.body; // true = bloquear (activo=0), false = activar

    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    cliente.activo = bloquear ? false : true;
    await cliente.save();

    // 🔥 AUDITORÍA: Cambio de Estado
    const accion = bloquear ? "BLOQUEO" : "REACTIVACION";
    await logAction(
        req.user.id, 
        "UPDATE", 
        "Estado Cliente", 
        `${accion} de la cuenta del cliente: ${cliente.email}`, 
        req
    );

    res.json({ message: bloquear ? "Cliente bloqueado" : "Cliente activado", activo: cliente.activo });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar estado" });
  }
};

// Eliminar
export const deleteClientAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });

    const emailBackup = cliente.email; // Guardar email antes de borrar para el log

    await cliente.destroy();

    // 🔥 AUDITORÍA: Eliminación
    await logAction(
        req.user.id, 
        "DELETE", 
        "Cliente", 
        `Eliminó permanentemente al cliente: ${emailBackup} (ID: ${id})`, 
        req
    );

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: "No se pudo eliminar (puede tener órdenes asociadas)" });
  }
};