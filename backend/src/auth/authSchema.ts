import { z } from "zod";

/**
 * Schema for user registration. Includes a `confirmPassword` field and a
 * refinement that ensures the password and its confirmation match.
 */
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
    .max(50, "A senha pode ter no máximo 50 caracteres.")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial"),

  confirmPassword: z.string().min(1, "Confirmar senha é obrigatório"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

/**
 * Schema for user login – only email and password are required.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(50, "A senha pode ter no máximo 50 caracteres.")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial"),
});

/**
 * Schema for resetting a password – token plus new password.
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(50, "A senha pode ter no máximo 50 caracteres.")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial"),
});

/**
 * Schema for requesting a password reset (forgot password). Only the email
 * address is required. The email is trimmed, validated, and lower‑cased to
 * ensure a consistent format throughout the system.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .transform((value) => value.toLowerCase()),
});

/* ... schemas existentes (register, login, forgotPassword, resetPassword) ... */

/**
 * Schema for updating a user.
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

/**
 * Schema for deleting a user.
 */
export const deleteUserSchema = z.object({});