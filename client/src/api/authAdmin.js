// client/src/api/authAdmin.js

import { axiosLib } from "./axios";
// Axios instance (ajusta VITE_API_URL si usas envs)

// ---- API Auth Admin ---- //
export const adminRegisterApi = (data) => axiosLib.post("/admin/auth/register", data);
export const adminLoginApi    = (data) => axiosLib.post("/admin/auth/login", data);
export const adminVerifyApi   = ()     => axiosLib.get ("/admin/auth/verify");
export const adminLogoutApi   = ()     => axiosLib.post("/admin/auth/logout");