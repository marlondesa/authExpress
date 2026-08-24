import * as authService from "./auth.service";
import { AppError } from "../errors/AppError";
import type { Request, Response, NextFunction } from "express";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // `confirmPassword` is validated by Zod schema before this handler runs.
    const { name, email, password, confirmPassword } = req.body;

    // The service only needs the original fields; confirmPassword is ignored.
    const user = await authService.register({ name, email, password });

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token ausente." });
    }

    const result = await authService.refreshToken(refreshToken);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    return res.status(200).json({ accessToken: result.accessToken });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await authService.getProfile(req.userId as string);

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email } = req.body;

    await authService.forgotPassword(email);

    return res.status(200).json({ message: "Se o e-mail existir, enviaremos instruções de redefinição." });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token, password } = req.body;

    await authService.resetPassword({ token, password });

    return res.status(200).json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    next(error);
  }
}


// src/auth/auth.controller.ts (exemplo)
export async function updateUser(
  req: Request, res: Response, next: NextFunction
) {
  try {
    const id = req.params.id as string | undefined;
    const userIdFromToken = req.userId;               // vem do requireAuth
    if (!id || userIdFromToken !== id) {
      throw new AppError(403, "Você só pode alterar seu próprio usuário.");
    }
    const updated = await authService.updateUser(id, req.body);
    return res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(
  req: Request, res: Response, next: NextFunction
) {
  try {
    const id = req.params.id as string | undefined;
    if (!id || req.userId !== id) {
      throw new AppError(403, "Você só pode excluir sua própria conta.");
    }
    await authService.deleteUser(id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}