import axios from "./axios";

// Enviar la solicitud de compra al backend
export const bnplCheckoutRequest = async (data) => {
  // data espera: { tiendaId, monto, plazo_meses, metodo_pago }
  const response = await axios.post("/bnpl/checkout", data);
  return response.data;
};