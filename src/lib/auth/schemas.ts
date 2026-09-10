import { z } from "zod";

import {
  invalidUsernameMessage,
  isValidUsername,
  normalizeUsername,
} from "./username";
import { profilePhoneSchema } from "../attendance/validation";

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Ingresa tu usuario.")
  .transform(normalizeUsername)
  .refine(isValidUsername, invalidUsernameMessage);

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio."),
  lastName: z.string().trim().min(1, "El apellido es obligatorio."),
  username: usernameSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  role: z.enum(["admin", "consultant"]),
});

export const createConsultantSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre completo es obligatorio.")
    .refine((value) => value.split(/\s+/).length >= 2, "Ingresa nombre y apellido."),
  dni: z.string().trim().regex(/^\d{8}$/, "El DNI debe contener 8 números."),
  phoneNumber: profilePhoneSchema,
  username: usernameSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  clientName: z.string().trim().min(2, "El cliente asignado es obligatorio.").max(120),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});
