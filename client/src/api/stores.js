import axios from "./axios";

export const normalizeStore = (raw = {}) => ({
  id: raw.id,
  nombre: raw.nombre ?? raw.name ?? "",
  rnc: raw.rnc ?? "",
  telefono: raw.telefono ?? raw.phone ?? "",
  email_corporativo: raw.email_corporativo ?? raw.email ?? "",
  direccion: raw.direccion ?? raw.location ?? "",
  descripcion: raw.descripcion ?? "",
  sitio_web: raw.sitio_web ?? raw.website ?? "",
  logo_url: raw.logo_url ?? raw.logo ?? raw.imagen_url ?? "",
  estado: raw.estado ?? (raw.activo === 0 ? "inactiva" : "activa"),
});

export const toDTO = (form = {}) => ({
  nombre: String(form.nombre || "").trim(),
  rnc: (form.rnc || "").trim(),
  telefono: (form.telefono || "").trim(),
  email_corporativo: (form.email_corporativo || "").trim(),
  direccion: (form.direccion || "").trim(),
  descripcion: (form.descripcion || "").trim(),
  sitio_web: (form.sitio_web || "").trim(),
  logo_url: (form.logo_url || "").trim(),
  estado: form.estado || "activa",
});

// === ADMIN ===
export async function fetchAdminStores() {
  const { data } = await axios.get("/admin/tiendas");
  return Array.isArray(data) ? data.map(normalizeStore) : [];
}

export async function createStore(form) {
  // si NO subes archivo:
  const { data } = await axios.post("/admin/tiendas", toDTO(form));
  return normalizeStore(data);
}

export async function createStoreWithFile(form, file) {
  const fd = new FormData();
  Object.entries(toDTO(form)).forEach(([k, v]) => fd.append(k, v ?? ""));
  if (file) fd.append("logo", file); // el nombre del campo debe coincidir con multer

  const { data } = await axios.post("/admin/tiendas", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateStore(id, form) {
  const { data } = await axios.put(`/admin/tiendas/${id}`, toDTO(form));
  return normalizeStore(data);
}

export async function deleteStore(id) {
  await axios.delete(`/admin/tiendas/${id}`);
  return true;
}

export async function updateStoreState(id, estado) {
  const { data } = await axios.put(`/admin/tiendas/${id}/estado`, { estado });
  return normalizeStore(data);
}

export async function fetchStoreAudit(id) {
  const { data } = await axios.get(`/admin/tiendas/${id}/auditoria`);
  return Array.isArray(data) ? data : [];
}

// === PÚBLICO ===
export async function fetchPublicStores() {
  const { data } = await axios.get("/public/tiendas");
  return Array.isArray(data) ? data.map(normalizeStore) : [];
}
