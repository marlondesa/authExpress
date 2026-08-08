import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(50, "O nome pode ter no máximo 50 caracteres."),

  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(50, "A senha pode ter no máximo 50 caracteres."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(50, "A senha pode ter no máximo 50 caracteres."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(50, "A senha pode ter no máximo 50 caracteres."),
});

