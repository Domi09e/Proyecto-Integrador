// src/services/jce.services.js
export async function verificarDocumentoEnJCE({ tipo, numero, nombre, apellido }) {
  // Simulación total:
  // - Si el número termina en 8 => válido
  // - Si no => inválido
  const terminaEn8 = numero.endsWith("8");

  if (terminaEn8) {
    return {
      valido: true,
      montoAsignado: 15000.0, // ejemplo: asignar crédito base
    };
  } else {
    return {
      valido: false,
      motivo: "Documento no encontrado en el padrón simulado de la JCE.",
    };
  }
}
