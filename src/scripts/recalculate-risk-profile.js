import db from "../models/index.js";

import {
  recalcularPerfilRiesgoCliente,
  recalcularTodosLosPerfiles,
} from "../services/risk-profile.service.js";

const ejecutar = async () => {
  try {
    await db.sequelize.authenticate();

    console.log(
      "Conexión a la base de datos establecida.",
    );

    const argumento =
      process.argv[2];

    if (
      argumento &&
      argumento !== "todos"
    ) {
      const clienteId =
        Number(argumento);

      if (
        !Number.isInteger(clienteId) ||
        clienteId <= 0
      ) {
        throw new Error(
          "El ID del cliente no es válido.",
        );
      }

      const resultado =
        await recalcularPerfilRiesgoCliente(
          clienteId,
        );

      console.log(
        JSON.stringify(
          resultado,
          null,
          2,
        ),
      );

      return;
    }

    const resultado =
      await recalcularTodosLosPerfiles();

    console.log(
      JSON.stringify(
        resultado,
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      "Error recalculando perfiles:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
};

ejecutar();