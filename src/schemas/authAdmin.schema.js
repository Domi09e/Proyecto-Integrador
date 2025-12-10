// src/schemas/authAdmin.schema.js

import { z } from "zod";

const email = z.string().trim().toLowerCase().email({ message: "Email no válido" });
const pass  = z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" });

export const registerAdminSchema = z.object({
  nombre: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
  apellido: z.string().trim().optional(),
  email,
  password: pass,
  telefono: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/,{ message:"Teléfono no válido"}).optional(),
  rol: z.enum(["admin_general","admin_tiendas","soporte","finanzas"]).optional(),
});

export const loginAdminSchema = z.object({
  email,
  password: pass,
});
