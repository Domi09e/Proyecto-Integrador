import { Op } from "sequelize";
import db from "../models/index.js";

const { Cliente, Orden, PagoBNPL, HistorialLimiteCredito } = db;

/* =====================================================
   HELPERS
===================================================== */

const redondearDinero = (valor) => {
  return Number(Number(valor || 0).toFixed(2));
};

/* =====================================================
   CALCULAR SALDO UTILIZADO REAL
===================================================== */

export const calcularSaldoCreditoUtilizado = async (
  clienteId,
  { transaction = null } = {},
) => {
  const total = await PagoBNPL.sum("monto_pendiente", {
    where: {
      estado: {
        [Op.in]: ["activo", "atrasado"],
      },
    },

    include: [
      {
        model: Orden,
        as: "orden",
        attributes: [],

        where: {
          cliente_id: clienteId,
        },

        required: true,
      },
    ],

    transaction,
  });

  return redondearDinero(total || 0);
};

/* =====================================================
   SINCRONIZAR LÍNEA DE CRÉDITO
===================================================== */

export const sincronizarLineaCreditoCliente = async (
  clienteId,
  { transaction = null } = {},
) => {
  const cliente = await Cliente.findByPk(clienteId, {
    transaction,

    ...(transaction
      ? {
          lock: transaction.LOCK.UPDATE,
        }
      : {}),
  });

  if (!cliente) {
    throw new Error(
      "Cliente no encontrado al sincronizar la línea de crédito.",
    );
  }

  const saldoUtilizado = await calcularSaldoCreditoUtilizado(clienteId, {
    transaction,
  });

  /*
   * Compatibilidad con clientes migrados.
   *
   * Si todavía no existe un límite aprobado,
   * reconstruimos el límite usando:
   *
   * disponible actual + utilizado.
   */
  let limiteAprobado = Number(cliente.limite_credito_aprobado);

  if (!Number.isFinite(limiteAprobado) || limiteAprobado <= 0) {
    limiteAprobado = redondearDinero(
      Number(cliente.poder_credito || 0) + saldoUtilizado,
    );
  }

  const disponible = redondearDinero(
    Math.max(limiteAprobado - saldoUtilizado, 0),
  );

  cliente.limite_credito_aprobado = limiteAprobado;

  cliente.saldo_credito_utilizado = saldoUtilizado;

  /*
   * poder_credito se mantiene para no romper
   * el resto del proyecto.
   *
   * A partir de ahora representa únicamente:
   * CRÉDITO DISPONIBLE.
   */
  cliente.poder_credito = disponible;

  await cliente.save({
    transaction,
  });

  return {
    cliente,

    limite_credito_aprobado: limiteAprobado,

    saldo_credito_utilizado: saldoUtilizado,

    credito_disponible: disponible,
  };
};

/* =====================================================
   AJUSTAR LÍMITE DE CRÉDITO
===================================================== */

export const ajustarLimiteCreditoCliente = async ({
  clienteId,
  nuevoLimite,
  adminId = null,
  limiteRecomendado = null,
  motivo,
  tipoAjuste = "ajuste_manual",
  transaction = null,
}) => {
  const cliente = await Cliente.findByPk(clienteId, {
    transaction,

    ...(transaction
      ? {
          lock: transaction.LOCK.UPDATE,
        }
      : {}),
  });

  if (!cliente) {
    const error = new Error("Cliente no encontrado.");

    error.status = 404;

    throw error;
  }

  const limiteNuevo = redondearDinero(nuevoLimite);

  if (!Number.isFinite(limiteNuevo) || limiteNuevo <= 0) {
    const error = new Error("El nuevo límite debe ser mayor que cero.");

    error.status = 400;

    throw error;
  }

  const limiteAnterior = redondearDinero(cliente.limite_credito_aprobado || 0);

  const saldoUtilizado = await calcularSaldoCreditoUtilizado(clienteId, {
    transaction,
  });

  const disponibleAnterior = redondearDinero(
    Math.max(limiteAnterior - saldoUtilizado, 0),
  );

  const disponibleNuevo = redondearDinero(
    Math.max(limiteNuevo - saldoUtilizado, 0),
  );

  cliente.limite_credito_aprobado = limiteNuevo;

  cliente.saldo_credito_utilizado = saldoUtilizado;

  cliente.poder_credito = disponibleNuevo;

  cliente.fecha_ultimo_ajuste_credito = new Date();

  cliente.motivo_ultimo_ajuste_credito =
    motivo || "Ajuste administrativo de la línea de crédito.";

  await cliente.save({
    transaction,
  });

  if (HistorialLimiteCredito) {
    await HistorialLimiteCredito.create(
      {
        cliente_id: cliente.id,

        usuario_admin_id: adminId || null,

        tipo_ajuste: tipoAjuste,

        limite_anterior: limiteAnterior,

        limite_recomendado:
          limiteRecomendado !== null && limiteRecomendado !== undefined
            ? redondearDinero(limiteRecomendado)
            : null,

        limite_nuevo: limiteNuevo,

        saldo_utilizado_momento: saldoUtilizado,

        credito_disponible_anterior: disponibleAnterior,

        credito_disponible_nuevo: disponibleNuevo,

        motivo: motivo || "Ajuste administrativo de la línea de crédito.",
      },
      {
        transaction,
      },
    );
  }

  return {
    cliente,

    limite_anterior: limiteAnterior,

    limite_nuevo: limiteNuevo,

    limite_recomendado:
      limiteRecomendado !== null && limiteRecomendado !== undefined
        ? redondearDinero(limiteRecomendado)
        : null,

    saldo_utilizado: saldoUtilizado,

    credito_disponible_anterior: disponibleAnterior,

    credito_disponible_nuevo: disponibleNuevo,
  };
};
