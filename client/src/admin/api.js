// client/src/admin/api.js
import axios from "../api/axios";

// AUTH ADMIN
export const adminRegisterApi = (data) => axios.post("/admin/auth/register", data);
export const adminLoginApi    = (data) => axios.post("/admin/auth/login", data);
export const adminVerifyApi   = ()     => axios.get ("/admin/auth/verify");
export const adminLogoutApi   = ()     => axios.post("/admin/auth/logout");

// ADMIN - recursos
export const getTiendas   = ()           => axios.get("/admin/tiendas");
export const createTienda = (payload)    => axios.post("/admin/tiendas", payload);
export const updateTienda = (id, payload)=> axios.put(`/admin/tiendas/${id}`, payload);
export const deleteTienda = (id)         => axios.delete(`/admin/tiendas/${id}`);

export const getUsuarios  = ()           => axios.get("/admin/usuarios");
export const updateUsuario= (id, payload)=> axios.put(`/admin/usuarios/${id}`, payload);

export const getClientesBNPL = ()           => axios.get("/admin/clients-with-bnpl");

export const getPagos     = ()           => axios.get("/admin/pagos");

export const getSettings  = ()           => axios.get("/admin/settings");
export const setSetting   = (key, valor) => axios.put(`/admin/settings/${encodeURIComponent(key)}`, { valor });

// PUBLIC (reflejo para cliente)
export const getPublicTiendas  = () => axios.get("/public/tiendas");
export const getPublicSettings = () => axios.get("/public/settings");


