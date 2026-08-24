import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET não configurada.");
  }

  return secret;
}

/**
 * Exige um access token válido no cabeçalho `Authorization: Bearer <token>`.
 *
 * Em caso de sucesso, injeta `req.userId` para uso pelos controllers.
 * Falhas respondem 401 sem detalhar o motivo (ASVS: não vazar se o token
 * é inválido, expirado ou ausente).
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Autenticação necessária." });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, getAccessSecret()) as JwtPayload;

    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.type !== "access" ||
      typeof payload.userId !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    req.userId = payload.userId;
    req.role = payload.role as Role;
    next();
  } catch {
    return res.status(401).json({ error: "Autenticação necessária." });
  }
}
