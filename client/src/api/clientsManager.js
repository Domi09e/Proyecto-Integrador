import axios from "./axios";

// Obtener lista (Ya la tenías, pero la ponemos aquí por orden)
export const getClients = () => axios.get("/admin/clients-with-bnpl");

// Actualizar datos (Crédito, nombre)
export const updateClient = (id, data) => axios.put(`/admin/clientes/${id}`, data);

// Bloquear / Desbloquear
export const toggleBlockClient = (id, bloquear) => axios.post(`/admin/clientes/${id}/toggle-block`, { bloquear });

// Eliminar
export const deleteClient = (id) => axios.delete(`/admin/clientes/${id}`);