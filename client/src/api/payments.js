// src/api/payments.js
import axios from "./axios";

// MÉTODOS DE PAGO
export async function apiGetPaymentMethods() {
  const { data } = await axios.get("/client/payment-methods");
  return data;
}

export async function apiCreatePaymentMethod(payload) {
  const { data } = await axios.post("/client/payment-methods", payload);
  return data;
}

export async function apiSetDefaultPaymentMethod(id) {
  const { data } = await axios.put(`/client/payment-methods/${id}/default`);
  return data;
}

export async function apiDeletePaymentMethod(id) {
  const { data } = await axios.delete(`/client/payment-methods/${id}`);
  return data;
}

// PREFERENCIAS
export async function apiGetPaymentPreferences() {
  const { data } = await axios.get("/client/payment-preferences");
  return data; // { id, poder_credito, preferencia_bnpl }
}

export async function apiUpdatePaymentPreferences(preferencia_bnpl) {
  const { data } = await axios.put("/client/payment-preferences", {
    preferencia_bnpl,
  });
  return data;
}
