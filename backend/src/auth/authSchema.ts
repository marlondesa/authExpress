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
    .max(50, "A senha pode ter no máximo 50 caracteres.")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .transform((value) => value.toLowerCase()),

  password:
    z.string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(50, "A senha pode ter no máximo 50 caracteres.")
      .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
      .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter pelo menos um número")
      .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial")
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
    .max(50, "A senha pode ter no máximo 50 caracteres.")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial"),
});

