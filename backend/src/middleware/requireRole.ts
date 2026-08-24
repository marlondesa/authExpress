import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";

/**
 * Exige que o usuário autenticado possua um dos roles informados.
 *
 * Deve ser usado DEPOIS do requireAuth, que injeta `req.role`
 * a partir do access token:
 *
 * ```ts
 * router.get("/admin/usuarios", requireAuth, requireRole("ADMIN"), handler);
 * ```
 *
 * Falhas respondem:
 *
 * - 401 quando não há role (falta requireAuth antes)
 * - 403 quando o role não tem permissão
 *
 * Sem detalhar o motivo (ASVS: não vazar informação sobre
 * a estrutura de autorização).
 */
export function requireRole(...roles: Role[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.role) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    next();
  };
}
