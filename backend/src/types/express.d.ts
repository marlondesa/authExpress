import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** ID do usuário autenticado — injetado pelo middleware requireAuth */
      userId?: string;
      /** Role do usuário autenticado — injetado pelo middleware requireAuth */
      role?: Role;
    }
  }
}

export {};
