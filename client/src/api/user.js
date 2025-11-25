import axios from "./axios";

const PREFIX = "/admin/usuarios";

export async function fetchAdminUsers() {
  const { data } = await axios.get(PREFIX);

  return (data || []).map((u) => ({
    id: u.id,
    nombre: u.nombre ?? "",
    apellido: u.apellido ?? "",
    email: u.email ?? "",
    rol: u.rol ?? "",
    activo: Number(u.activo ?? 0), // 1 = activo, 0 = inactivo
    profile_pic: null,
    last_login: null,
  }));
}

export const deleteUser = (id) => axios.delete(`${PREFIX}/${id}`);
export const blockUser  = (id) => axios.post(`${PREFIX}/${id}/block`);
export const unlockUser = (id) => axios.post(`${PREFIX}/${id}/unlock`);


// Obtener un usuario por ID (para el formulario de edición)
export async function getAdminUserById(id) {
  const { data } = await axios.get(`/admin/usuarios/${id}`);
  return {
    id: data.id,
    nombre: data.nombre ?? "",
    apellido: data.apellido ?? "",
    email: data.email ?? "",
    rol: data.rol ?? data.role ?? "",
    activo: Number(data.activo ?? 0),
  };
}

// Actualizar usuario admin
export async function updateAdminUser(id, payload) {
  const { data } = await axios.put(`/admin/usuarios/${id}`, payload);
  return data;
}

