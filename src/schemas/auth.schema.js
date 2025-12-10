  

import { z } from "zod";

const emailSchema = z
  .string({ required_error: "El email es obligatorio" })
  .trim()
  .toLowerCase()
  .email({ message: "Email no válido" });

const passwordSchema = z
  .string({ required_error: "La contraseña es obligatoria" })
  .min(6, { message: "La contraseña debe tener al menos 6 caracteres" });

export const registerSchema = z.object({
  nombre: z.string({ required_error: "El nombre es obligatorio" }).trim().min(1),
  apellido: z.string().trim().optional(),
  email: emailSchema,
  password: passwordSchema,
  telefono: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, { message: "Teléfono no válido" })
    .optional(),
  address: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

