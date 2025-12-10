// src/controllers/documentosCliente.controller.js
import db from "../models/index.js";
import { notifyAdmin, notifyCliente } from "../services/notificacion.service.js";

const { DocumentoCliente, TipoDocumento, Cliente } = db;

function getClienteIdFromReq(req) {
  if (req.cliente?.id) return req.cliente.id;
  if (req.user?.id) return req.user.id;
  if (req.userId) return req.userId;
  return null;
}

/* LISTAR DOCUMENTOS DEL CLIENTE */
export const getDocumentosCliente = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const docs = await DocumentoCliente.findAll({
      where: { cliente_id: clienteId },
      include: [
        {
          model: TipoDocumento,
          as: "tipo",
          attributes: ["codigo", "nombre"],
        },
      ],
      order: [["fecha_subida", "DESC"]],
    });

    return res.json(docs);
  } catch (error) {
    console.error("Error getClientDocuments:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* SUBIR / CREAR DOCUMENTO */
export const crearDocumentoCliente = async (req, res) => {
  try {
    const clienteId = getClienteIdFromReq(req);
    if (!clienteId) {
      return res
        .status(400)
        .json({ message: "Cliente no identificado en el token." });
    }

    const { tipo_codigo, numero_documento } = req.body;

    if (!tipo_codigo || !numero_documento) {
      return res.status(400).json({
        message: "tipo_codigo y numero_documento son obligatorios.",
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se recibió archivo (campo 'archivo')." });
    }

    const [tipo] = await TipoDocumento.findOrCreate({
      where: { codigo: tipo_codigo },
      defaults: {
        nombre:
          tipo_codigo === "CEDULA"
            ? "Cédula de Identidad"
            : tipo_codigo === "PASAPORTE"
            ? "Pasaporte"
            : tipo_codigo,
      },
    });

    const ruta_imagen = `/uploads/documentos/${req.file.filename}`;

    const nuevo = await DocumentoCliente.create({
      cliente_id: clienteId,
      tipo_documento_id: tipo.id,
      numero_documento,
      ruta_imagen,
      estado: "pendiente",
      origen_verificacion: "JCE_SIMULADA",
      fecha_subida: new Date(),
      fecha_verificacion: null,
      nota_rechazo: null,
    });

    const docConTipo = await DocumentoCliente.findByPk(nuevo.id, {
      include: [
        {
          model: TipoDocumento,
          as: "tipo",
          attributes: ["codigo", "nombre"],
        },
      ],
    });

    // obtenemos datos del cliente para el texto
    const cliente = await Cliente.findByPk(clienteId);

    await notifyAdmin({
      titulo: "Nuevo documento enviado",
      mensaje: `El cliente ${cliente?.nombre || ""} ${
        cliente?.apellido || ""
      } subió un documento (${tipo.codigo}).`,
      url: `/admin/verificacion`,
      tipo: "documento",
      meta: {
        cliente_id: clienteId,
        documento_id: nuevo.id,
        tipo_documento: tipo.codigo,
      },
    });

    return res.status(201).json(docConTipo);
  } catch (error) {
    console.error("Error crearDocumentoCliente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ACTUALIZAR ESTADO (Admin aprueba/rechaza) */
export const actualizarEstadoDocumento = async (req, res) => {
  const t = await db.sequelize.transaction(); // Usamos transacción para seguridad
  try {
    const { id } = req.params;
    const { estado, nota_rechazo } = req.body;

    const estadosPermitidos = ["pendiente", "verificado", "rechazado"];
    if (!estadosPermitidos.includes(estado)) {
      await t.rollback();
      return res.status(400).json({ message: "Estado inválido" });
    }

    const doc = await DocumentoCliente.findByPk(id, {
      include: [{ model: Cliente, as: "cliente" }],
      transaction: t
    });

    if (!doc) {
      await t.rollback();
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    // Actualizar documento
    doc.estado = estado;
    doc.fecha_verificacion = new Date();
    doc.nota_rechazo = estado === "rechazado" ? nota_rechazo || "" : null;
    await doc.save({ transaction: t });

    // === LÓGICA DE CRÉDITO AUTOMÁTICO ===
    if (estado === "verificado") {
      const cliente = doc.cliente;
      
      // Asignamos crédito inicial si estaba en 0 (o lo aumentamos)
      // Aquí le damos RD$ 30,000 fijos al verificar
      const CREDITO_INICIAL = 30000.00;
      
      cliente.poder_credito = CREDITO_INICIAL;
      await cliente.save({ transaction: t });
    }
    // =====================================

    // Notificación
    const mensaje = estado === "verificado"
        ? `¡Felicidades! Tu documento ha sido verificado. Se ha activado un crédito de RD$ 30,000 para tus compras.`
        : `Tu documento fue rechazado. Motivo: ${nota_rechazo || "Imagen ilegible"}.`;

    await notifyCliente({
      clienteId: doc.cliente_id,
      titulo: estado === "verificado" ? "Crédito Activado" : "Documento Rechazado",
      mensaje,
      url: "/cartera",
      tipo: "sistema",
      meta: { documento_id: doc.id, estado }
    });

    await t.commit();

    return res.json({
      message: "Documento actualizado y crédito asignado.",
      documento: doc,
    });
  } catch (error) {
    console.error("Error actualizarEstadoDocumento:", error);
    await t.rollback();
    return res.status(500).json({ message: error.message });
  }
};